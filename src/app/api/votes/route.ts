import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb, updateDb, GovernmentVote } from '@/lib/db';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

function checkPlanningAccess(user: any): boolean {
  if (!user) return false;
  return Boolean(
    user?.isSuperAdmin === true ||
    user?.adminLevel === 0 ||
    user?.roleId === 'role-superadmin' ||
    user?.username === 'superadmin' ||
    user?.username === 'planning.officer' ||
    user?.username === 'planning' ||
    user?.username === 'doe.planning' ||
    user?.functionalCategory === 'Planning' ||
    user?.organizationName?.toLowerCase().includes('plan') ||
    user?.organizationId?.toLowerCase().includes('plan')
  );
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const financialYear = searchParams.get('financialYear') || '2027';
    const search = (searchParams.get('search') || '').trim().toLowerCase();
    const category = searchParams.get('category') || searchParams.get('status') || 'All';
    const sourceYear = searchParams.get('sourceYear'); // For getting votes to populate

    const db = await getDb();
    const allVotes: GovernmentVote[] = db.votes || [];

    // Distinct financial years available in db or defaults
    const distinctYearsSet = new Set<string>();
    distinctYearsSet.add('2025');
    distinctYearsSet.add('2026');
    distinctYearsSet.add('2027');
    distinctYearsSet.add('2028');
    if (db.financialYears) {
      db.financialYears.forEach((fy) => distinctYearsSet.add(fy.year));
    }
    allVotes.forEach((v) => distinctYearsSet.add(v.financialYear));
    const availableFinancialYears = Array.from(distinctYearsSet).sort();

    // If caller wants votes from a source year (e.g., for Populate Vote dropdown)
    if (sourceYear) {
      const sourceVotes = allVotes.filter((v) => v.financialYear === sourceYear);
      return NextResponse.json({
        financialYears: availableFinancialYears,
        sourceVotes,
      });
    }

    // Filter votes for target financial year
    let targetVotes = allVotes.filter((v) => v.financialYear === financialYear);

    // Apply category / classification filter (Recurrent or Capital)
    if (category && category !== 'All') {
      targetVotes = targetVotes.filter((v) =>
        (v.category && v.category.toLowerCase() === category.toLowerCase()) ||
        (v.status && v.status.toLowerCase() === category.toLowerCase())
      );
    }

    // Apply search filter
    if (search) {
      targetVotes = targetVotes.filter((v) =>
        v.voteNumber.toLowerCase().includes(search) ||
        v.voteName.toLowerCase().includes(search) ||
        (v.description && v.description.toLowerCase().includes(search)) ||
        (v.category && v.category.toLowerCase().includes(search)) ||
        (v.availableFor && v.availableFor.toLowerCase().includes(search))
      );
    }

    // Sort by voteNumber or createdAt
    targetVotes.sort((a, b) => a.voteNumber.localeCompare(b.voteNumber, undefined, { numeric: true }));

    // Source years available for populating (prior years: 2026, 2025)
    const populateSourceYears = availableFinancialYears
      .filter((y) => Number(y) < Number(financialYear))
      .sort((a, b) => Number(b) - Number(a));

    const isEditableYear = Number(financialYear) > 2026;

    return NextResponse.json({
      financialYear,
      isEditableYear,
      financialYears: availableFinancialYears,
      populateSourceYears: populateSourceYears.length > 0 ? populateSourceYears : ['2026', '2025'],
      votes: targetVotes,
      totalCount: targetVotes.length,
      allVotesCountForYear: allVotes.filter((v) => v.financialYear === financialYear).length,
    });
  } catch (err: any) {
    console.error('Error in GET /api/votes:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user as any;
    if (!checkPlanningAccess(user)) {
      return NextResponse.json(
        { error: 'Forbidden: Vote management is strictly reserved for Planning Branch officers.' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // 1. Action: Populate Vote from Previous Year
    if (body.action === 'populate') {
      const { sourceFinancialYear, targetFinancialYear, voteId } = body;
      if (!sourceFinancialYear || !targetFinancialYear || !voteId) {
        return NextResponse.json(
          { error: 'sourceFinancialYear, targetFinancialYear, and voteId are required.' },
          { status: 400 }
        );
      }

      // Rule: Target year must be an upcoming planning year (> 2026)
      if (Number(targetFinancialYear) <= 2026) {
        return NextResponse.json(
          { error: `Votes can only be populated into upcoming planning years (e.g. 2027). Financial Year ${targetFinancialYear} is locked.` },
          { status: 400 }
        );
      }

      const db = await getDb();
      const allVotes = db.votes || [];
      const sourceVote = allVotes.find((v) => v.id === voteId);
      if (!sourceVote) {
        return NextResponse.json(
          { error: 'Selected vote not found in source financial year.' },
          { status: 404 }
        );
      }

      // Check if target year already has this vote number
      const alreadyExists = allVotes.some(
        (v) => v.financialYear === targetFinancialYear && v.voteNumber.trim().toLowerCase() === sourceVote.voteNumber.trim().toLowerCase()
      );
      if (alreadyExists) {
        return NextResponse.json(
          { error: `Vote ${sourceVote.voteNumber} already exists in Financial Year ${targetFinancialYear}. You can edit the existing vote directly.` },
          { status: 400 }
        );
      }

      let createdVote: GovernmentVote | null = null;
      await updateDb((data) => {
        if (!data.votes) data.votes = [];
        const newId = `vote-${targetFinancialYear}-${sourceVote.voteNumber}-${randomUUID().slice(0, 6)}`;
        createdVote = {
          id: newId,
          voteNumber: sourceVote.voteNumber,
          voteName: sourceVote.voteName,
          description: sourceVote.description,
          category: sourceVote.category === 'Capital' ? 'Capital' : 'Recurrent',
          availableFor: sourceVote.availableFor || 'All Branches',
          status: 'Active',
          financialYear: targetFinancialYear,
          createdAt: new Date().toISOString(),
          createdBy: user.username || user.id,
        };

        data.votes.push(createdVote);
      });

      return NextResponse.json({
        success: true,
        vote: createdVote,
        message: `Vote ${sourceVote.voteNumber} (${sourceFinancialYear}) populated into Financial Year ${targetFinancialYear} successfully. You can now edit its details for ${targetFinancialYear}.`,
      });
    }

    // 2. Action: Register New Vote
    const { voteNumber, voteName, description, category = 'Recurrent', availableFor = 'All Branches', status = 'Active', financialYear = '2027' } = body;
    if (!voteNumber || !voteNumber.trim()) {
      return NextResponse.json({ error: 'Vote Number is required.' }, { status: 400 });
    }
    if (!voteName || !voteName.trim()) {
      return NextResponse.json({ error: 'Vote Name is required.' }, { status: 400 });
    }

    // Rule: Direct vote registration is locked for current (2026) and past financial years
    if (Number(financialYear) <= 2026) {
      return NextResponse.json(
        { error: `Financial Year ${financialYear} is locked (current or past year). New votes can only be registered for upcoming planning years (2027+).` },
        { status: 400 }
      );
    }

    const db = await getDb();
    const existingSame = (db.votes || []).some(
      (v) => v.financialYear === String(financialYear).trim() && v.voteNumber.trim().toLowerCase() === voteNumber.trim().toLowerCase()
    );
    if (existingSame) {
      return NextResponse.json(
        { error: `Vote number ${voteNumber.trim()} already exists in Financial Year ${financialYear}.` },
        { status: 400 }
      );
    }

    let newVote: GovernmentVote | null = null;
    await updateDb((data) => {
      if (!data.votes) data.votes = [];
      const newId = `vote-${financialYear}-${voteNumber.trim()}-${randomUUID().slice(0, 6)}`;
      newVote = {
        id: newId,
        voteNumber: voteNumber.trim(),
        voteName: voteName.trim(),
        description: description ? description.trim() : '',
        category: category === 'Capital' ? 'Capital' : 'Recurrent',
        availableFor: availableFor ? availableFor.trim() : 'All Branches',
        status: status === 'Inactive' ? 'Inactive' : 'Active',
        financialYear: String(financialYear).trim(),
        createdAt: new Date().toISOString(),
        createdBy: user.username || user.id,
      };
      data.votes.push(newVote);
    });

    return NextResponse.json({
      success: true,
      vote: newVote,
      message: `Vote ${voteNumber.trim()} registered successfully for Financial Year ${financialYear}.`,
    });
  } catch (err: any) {
    console.error('Error in POST /api/votes:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user as any;
    if (!checkPlanningAccess(user)) {
      return NextResponse.json(
        { error: 'Forbidden: Vote management is strictly reserved for Planning Branch officers.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, voteNumber, voteName, description, category, availableFor, status } = body;

    if (!id) {
      return NextResponse.json({ error: 'Vote ID is required for update.' }, { status: 400 });
    }

    const db = await getDb();
    const existingVote = (db.votes || []).find((v) => v.id === id);
    if (!existingVote) {
      return NextResponse.json({ error: 'Vote not found.' }, { status: 404 });
    }

    // Rule: Votes for current (2026) and previous financial years are non-editable
    if (Number(existingVote.financialYear) <= 2026) {
      return NextResponse.json(
        {
          error: `Votes for Financial Year ${existingVote.financialYear} are locked (finalized/operational year) and cannot be edited. To modify this vote for next year, select Financial Year 2027 and populate it.`,
        },
        { status: 400 }
      );
    }

    let updatedVote: GovernmentVote | null = null;
    await updateDb((data) => {
      if (!data.votes) data.votes = [];
      const idx = data.votes.findIndex((v) => v.id === id);
      if (idx === -1) {
        throw new Error('Vote not found.');
      }

      data.votes[idx] = {
        ...data.votes[idx],
        ...(voteNumber ? { voteNumber: voteNumber.trim() } : {}),
        ...(voteName ? { voteName: voteName.trim() } : {}),
        ...(description !== undefined ? { description: description.trim() } : {}),
        ...(category ? { category: category === 'Capital' ? 'Capital' : 'Recurrent' } : {}),
        ...(availableFor !== undefined ? { availableFor: availableFor.trim() } : {}),
        ...(status ? { status: status === 'Inactive' ? 'Inactive' : 'Active' } : {}),
        updatedAt: new Date().toISOString(),
      };

      updatedVote = data.votes[idx];
    });

    return NextResponse.json({
      success: true,
      vote: updatedVote,
      message: 'Vote updated successfully.',
    });
  } catch (err: any) {
    console.error('Error in PUT /api/votes:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user as any;
    if (!checkPlanningAccess(user)) {
      return NextResponse.json(
        { error: 'Forbidden: Vote management is strictly reserved for Planning Branch officers.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Vote ID is required for deletion.' }, { status: 400 });
    }

    const db = await getDb();
    const existingVote = (db.votes || []).find((v) => v.id === id);
    if (!existingVote) {
      return NextResponse.json({ error: 'Vote not found.' }, { status: 404 });
    }

    // Rule: Votes for current (2026) and previous financial years cannot be deleted
    if (Number(existingVote.financialYear) <= 2026) {
      return NextResponse.json(
        {
          error: `Votes for Financial Year ${existingVote.financialYear} are locked (finalized/operational year) and cannot be deleted.`,
        },
        { status: 400 }
      );
    }

    await updateDb((data) => {
      if (!data.votes) data.votes = [];
      data.votes = data.votes.filter((v) => v.id !== id);
    });

    return NextResponse.json({
      success: true,
      message: 'Vote deleted successfully.',
    });
  } catch (err: any) {
    console.error('Error in DELETE /api/votes:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
