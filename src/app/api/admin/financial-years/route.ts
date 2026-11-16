import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb, updateDb, FinancialYear } from '@/lib/db';

function isSuperAdminUser(user: any): boolean {
  if (!user) return false;
  return (
    user.isSuperAdmin ||
    user.username === 'superadmin' ||
    user.username === 'admin' ||
    user.roleName === 'Super Administrator' ||
    user.roleName === 'System Administrator'
  );
}

export async function GET(req: NextRequest) {
  const data = await getDb();
  const sorted = [...(data.financialYears || [])].sort((a, b) => b.year.localeCompare(a.year));
  return NextResponse.json({ financialYears: sorted });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  if (!isSuperAdminUser(user)) {
    return NextResponse.json({ error: 'Unauthorized: Super Administrator privileges required' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { year, startDate, endDate, status = 'Planning', isCurrent = false, description = '' } = body;

    if (!year || !startDate || !endDate) {
      return NextResponse.json({ error: 'Year, Start Date, and End Date are required.' }, { status: 400 });
    }

    const data = await getDb();
    if (data.financialYears.some((f) => f.year === String(year).trim())) {
      return NextResponse.json({ error: `Financial Year ${year} already exists.` }, { status: 400 });
    }

    const newFy: FinancialYear = {
      id: `fy-${year.trim()}`,
      year: String(year).trim(),
      startDate,
      endDate,
      status: status as any,
      isCurrent: Boolean(isCurrent),
      description,
      createdAt: new Date().toISOString(),
      createdBy: user?.id || 'user-superadmin',
    };

    await updateDb((draft) => {
      if (newFy.isCurrent) {
        draft.financialYears.forEach((f) => { f.isCurrent = false; });
      }
      draft.financialYears.unshift(newFy);
    });

    return NextResponse.json({ success: true, financialYear: newFy });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  if (!isSuperAdminUser(user)) {
    return NextResponse.json({ error: 'Unauthorized: Super Administrator privileges required' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { id, status, isCurrent, description, startDate, endDate } = body;

    if (!id) {
      return NextResponse.json({ error: 'Financial Year ID is required.' }, { status: 400 });
    }

    let updatedRecord: FinancialYear | null = null;

    await updateDb((draft) => {
      const idx = draft.financialYears.findIndex((f) => f.id === id);
      if (idx !== -1) {
        if (isCurrent === true) {
          draft.financialYears.forEach((f) => { f.isCurrent = false; });
        }
        draft.financialYears[idx] = {
          ...draft.financialYears[idx],
          ...(status ? { status } : {}),
          ...(typeof isCurrent === 'boolean' ? { isCurrent } : {}),
          ...(description !== undefined ? { description } : {}),
          ...(startDate ? { startDate } : {}),
          ...(endDate ? { endDate } : {}),
        };
        updatedRecord = draft.financialYears[idx];
      }
    });

    if (!updatedRecord) {
      return NextResponse.json({ error: 'Financial Year not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, financialYear: updatedRecord });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  if (!isSuperAdminUser(user)) {
    return NextResponse.json({ error: 'Unauthorized: Super Administrator privileges required' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'ID parameter required.' }, { status: 400 });
  }

  await updateDb((draft) => {
    draft.financialYears = draft.financialYears.filter((f) => f.id !== id);
  });

  return NextResponse.json({ success: true, message: `Financial Year ${id} removed.` });
}
