import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb, updateDb, AipPlan, AipActivity } from '@/lib/db';
import { randomUUID } from 'crypto';
import { roundToCentInMn } from '@/lib/financialFormat';
import { OFFICIAL_MOE_DIVISIONS_DATA } from '@/lib/hierarchyData';
import { getRelevantPlanningBranch, getRelevantMonitoringBranch, getScopedBranchOptions, canUserReviewPlan } from '@/lib/planningHierarchy';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;

    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year') || '2027';
    const reqBranchId = searchParams.get('branchId');
    const amendmentNumber = parseInt(searchParams.get('amendmentNumber') || '0', 10);

    const data = await getDb();
    const organizations = data.organizations || [];

    // Filter department scoped branches (e.g. MOE branches for MOE, DOE branches for DOE, all for Super Admin)
    const moeBranches = getScopedBranchOptions(user, organizations as any);

    // Identify privileged accounts: Planning Officers (MOE or DOE) or Admins can switch branches
    const isPrivileged =
      !user ||
      (user?.username !== 'planning' &&
      (user?.isSuperAdmin ||
      user?.adminLevel === 0 ||
      user?.adminLevel === 1 ||
      user?.roleId === 'role-superadmin' ||
      user?.roleId === 'role-admin' ||
      user?.username === 'planning.officer' ||
      user?.username === 'doe.planning' ||
      (user?.roleId === 'role-planning-officer' && (user?.organizationId === 'org-moe-planning' || user?.organizationId === 'org-doe-planning' || user?.organizationId === 'org-moe'))));

    let defaultBranchId = 'org-moe-ict';
    if (user?.organizationId?.startsWith('org-doe') || user?.username === 'doe.planning') {
      defaultBranchId = user?.organizationId === 'org-doe-planning' ? 'org-doe-eval' : (user?.organizationId || 'org-doe-eval');
    } else if (user?.organizationId && user.organizationId !== 'org-moe-planning') {
      defaultBranchId = user.organizationId;
    }

    let branchId = (isPrivileged && reqBranchId) ? reqBranchId : (user?.organizationId || reqBranchId || defaultBranchId);
    const isMinistryConsolidated = isPrivileged && branchId === 'all';
    const matchedDivision = isPrivileged ? OFFICIAL_MOE_DIVISIONS_DATA.find((d) => d.id === branchId) : undefined;
    const isWingConsolidated = Boolean(matchedDivision);
    const isConsolidated = isMinistryConsolidated || isWingConsolidated;

    const consolidatedBranchIds = new Set<string>(
      isMinistryConsolidated
        ? moeBranches.map((b) => b.id)
        : matchedDivision
          ? matchedDivision.branches.map((b) => b.id)
          : []
    );

    const currentBranch = isMinistryConsolidated
      ? {
          id: 'all',
          name: 'Consolidated Ministry-Level AIP',
          code: 'MINISTRY',
        }
      : matchedDivision
        ? {
            id: matchedDivision.id,
            name: `${matchedDivision.division} (Additional Secretary Overall)`,
            code: matchedDivision.code,
          }
        : organizations.find((o) => o.id === branchId) || {
            id: branchId,
            name: user?.organizationName || 'Operational Branch',
            code: branchId.replace(/^org-/, '').toUpperCase(),
          };

    // Determine relevant Planning Branch reviewing authority for this branch
    const planningSampleBranchId = isMinistryConsolidated
      ? 'org-moe-ict'
      : matchedDivision
        ? (matchedDivision.branches[0]?.id || 'org-moe-ict')
        : branchId;
    const relevantPlanningBranch = getRelevantPlanningBranch(planningSampleBranchId, organizations as any);
    const relevantMonitoringBranch = getRelevantMonitoringBranch(planningSampleBranchId);

    // Find all amendments for this year
    const allAmendments = (data.aipAmendments || []).filter((a) => a.year === year);
    allAmendments.sort((a, b) => a.amendmentNumber - b.amendmentNumber);
    const currentAmendment = allAmendments.find((a) => a.amendmentNumber === amendmentNumber) || null;

    // Find official AIP Submission deadline from DB
    const aipDeadline = (data.deadlines || []).find(
      (d: any) =>
        (d.category === 'AIP Submission' || d.id === 'dl-2027-aip') &&
        (d.financialYear === String(year) || !d.financialYear)
    );

    // Find AIP plan for this branch, year, and amendmentNumber
    const allPlans = data.aipPlans || [];
    let plan: any = null;

    if (isConsolidated) {
      // Build a consolidated plan representing either the entire Ministry or a specific Additional Secretary Wing
      const targetBranchesForPlan = isMinistryConsolidated
        ? moeBranches
        : moeBranches.filter((b) => consolidatedBranchIds.has(b.id));

      const branchPlans = targetBranchesForPlan.map((br) =>
        allPlans.find(
          (p) => p.branchId === br.id && p.year === year && Number(p.amendmentNumber || 0) === amendmentNumber
        )
      ).filter(Boolean);

      const allApproved = branchPlans.length > 0 && branchPlans.every((p) => p?.status === 'Approved');
      const anySubmitted = branchPlans.some((p) => p?.status === 'Submitted' || p?.status === 'Approved');
      const allDispatched = branchPlans.length > 0 && branchPlans.every((p) => p?.isDispatchedToBranch);

      plan = {
        id: isMinistryConsolidated
          ? `plan-consolidated-${year}-amend-${amendmentNumber}`
          : `plan-wing-${matchedDivision!.id}-${year}-amend-${amendmentNumber}`,
        branchId: isMinistryConsolidated ? 'all' : matchedDivision!.id,
        branchName: isMinistryConsolidated
          ? 'Consolidated Ministry-Level AIP'
          : `${matchedDivision!.division} (Additional Secretary Overall)`,
        year,
        amendmentNumber,
        phaseTitle: '3. Implementation Phase',
        targetTitle: isMinistryConsolidated
          ? `Consolidated Ministry Physical and Financial Targets ${year}`
          : `${matchedDivision!.division} — Overall Physical and Financial Targets ${year}`,
        mainResponsibility: isMinistryConsolidated
          ? 'Policy & Planning Branch (PPB) Directorate'
          : `${matchedDivision!.division} (${targetBranchesForPlan.length} Units)`,
        mainContactNo: '0112785617',
        overallResponsibility: isMinistryConsolidated
          ? 'Ministry of Education Planning Division'
          : `Additional Secretary — ${matchedDivision!.division}`,
        overallContactNo: '0112785618',
        status: allApproved ? 'Approved' : anySubmitted ? 'Submitted' : 'Draft',
        isDispatchedToBranch: allDispatched,
        isConsolidated: true,
        isWingConsolidated,
        wingBranchCount: targetBranchesForPlan.length,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    } else {
      plan = allPlans.find(
        (p) =>
          p.branchId === branchId &&
          p.year === year &&
          Number(p.amendmentNumber || 0) === amendmentNumber
      );
    }

    // If an amendment was called and branch hasn't opened it yet, auto-clone from previous version!
    if (!plan && amendmentNumber > 0) {
      // Find source plan (previous amendment or Original Plan 0)
      const sourcePlan = allPlans.find(
        (p) =>
          p.branchId === branchId &&
          p.year === year &&
          Number(p.amendmentNumber || 0) === amendmentNumber - 1
      ) || allPlans.find(
        (p) =>
          p.branchId === branchId &&
          p.year === year &&
          Number(p.amendmentNumber || 0) === 0
      );

      // Find source activities to clone
      const sourceActivities = (data.aipActivities || []).filter(
        (a) =>
          a.branchId === branchId &&
          a.year === year &&
          Number(a.amendmentNumber || 0) === (sourcePlan?.amendmentNumber || 0)
      );

      const newPlanId = `plan-${branchId}-${year}-amend-${amendmentNumber}`;
      plan = {
        id: newPlanId,
        branchId,
        branchName: currentBranch.name,
        year,
        amendmentNumber,
        amendmentId: currentAmendment?.id,
        phaseTitle: sourcePlan?.phaseTitle || '3. Implementation Phase',
        targetTitle: `Overall Physical and Financial Targets ${year} (Amendment ${amendmentNumber})`,
        mainResponsibility: sourcePlan?.mainResponsibility || '',
        mainContactNo: sourcePlan?.mainContactNo || '',
        overallResponsibility: sourcePlan?.overallResponsibility || '',
        overallContactNo: sourcePlan?.overallContactNo || '',
        status: 'Draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Clone activities
      const clonedActivities: AipActivity[] = sourceActivities.map((sa) => ({
        ...sa,
        id: `act-${randomUUID()}`,
        planId: newPlanId,
        amendmentNumber,
        amendmentId: currentAmendment?.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

      // Save into DB
      await updateDb((dbData) => {
        if (!dbData.aipPlans) dbData.aipPlans = [];
        if (!dbData.aipActivities) dbData.aipActivities = [];
        dbData.aipPlans.push(plan!);
        clonedActivities.forEach((ca) => dbData.aipActivities.push(ca));
      });
    }

    // Default baseline plan for Original Plan (amendmentNumber === 0)
    if (!plan && amendmentNumber === 0) {
      plan = {
        id: `plan-${branchId}-${year}`,
        branchId,
        branchName: currentBranch.name,
        year,
        amendmentNumber: 0,
        phaseTitle: '3. Implementation Phase',
        targetTitle: `Overall Physical and Financial Targets ${year}`,
        mainResponsibility: branchId === 'org-moe-ict'
          ? 'Mrs. Udara T. Dikkumbura, Add.Sec.(Information Technology and Digital Education)'
          : '',
        mainContactNo: branchId === 'org-moe-ict' ? '714929279' : '',
        overallResponsibility: branchId === 'org-moe-ict'
          ? 'Mrs. S. Dakshina Kasthuriarachchi (Director of Education)'
          : '',
        overallContactNo: branchId === 'org-moe-ict' ? '714325568' : '',
        status: 'Draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    // Filter activities for this branch, year, and amendmentNumber
    const freshData = await getDb();
    const allActivities = freshData.aipActivities || [];
    const allBranches = searchParams.get('allBranches') === 'true' || isConsolidated;
    const branchNameMap = new Map((organizations || []).map((o: any) => [o.id, o.name]));

    const activities = allActivities
      .filter((a) => {
        if (isConsolidated) {
          const matchYear = a.year === year || !a.year;
          const matchAmend = Number(a.amendmentNumber || 0) === amendmentNumber;
          const isScopedBranch = consolidatedBranchIds.has(a.branchId);
          return matchYear && matchAmend && isScopedBranch;
        }
        return (
          (allBranches || a.branchId === branchId) &&
          (a.year === year || !a.year) &&
          (allBranches ? true : Number(a.amendmentNumber || 0) === amendmentNumber)
        );
      })
      .map((a) => ({
        ...a,
        branchName: a.branchName || branchNameMap.get(a.branchId) || a.branchId,
      }));

    // Calculations for totals
    const totalEstimatedCost = activities.reduce(
      (sum, a) => sum + (Number(a.estimatedCost) || 0),
      0
    );

    const monthlyFinancialTotals = Array(12).fill(0);
    activities.forEach((act) => {
      if (Array.isArray(act.financialMonths)) {
        act.financialMonths.forEach((val, idx) => {
          if (idx < 12) {
            monthlyFinancialTotals[idx] += Number(val) || 0;
          }
        });
      }
    });

    const q1Fin = monthlyFinancialTotals[0] + monthlyFinancialTotals[1] + monthlyFinancialTotals[2];
    const q2Fin = monthlyFinancialTotals[3] + monthlyFinancialTotals[4] + monthlyFinancialTotals[5];
    const q3Fin = monthlyFinancialTotals[6] + monthlyFinancialTotals[7] + monthlyFinancialTotals[8];
    const q4Fin = monthlyFinancialTotals[9] + monthlyFinancialTotals[10] + monthlyFinancialTotals[11];
    const quarterlyFinancialCumulative = [q1Fin, q2Fin, q3Fin, q4Fin];

    const monthlyPhysicalSums = Array(12).fill(0);
    const n = activities.length || 1;
    activities.forEach((act) => {
      if (Array.isArray(act.physicalMonths)) {
        act.physicalMonths.forEach((val, idx) => {
          if (idx < 12) {
            const raw = String(val || '').replace('%', '').trim();
            const num = parseFloat(raw);
            if (!isNaN(num)) {
              monthlyPhysicalSums[idx] += num;
            }
          }
        });
      }
    });

    const monthlyPhysicalTotals = monthlyPhysicalSums.map((sum) => Math.round((sum / n) * 10) / 10);
    const q1Phys = Math.round((monthlyPhysicalTotals[0] + monthlyPhysicalTotals[1] + monthlyPhysicalTotals[2]) * 10) / 10;
    const q2Phys = Math.round((monthlyPhysicalTotals[3] + monthlyPhysicalTotals[4] + monthlyPhysicalTotals[5]) * 10) / 10;
    const q3Phys = Math.round((monthlyPhysicalTotals[6] + monthlyPhysicalTotals[7] + monthlyPhysicalTotals[8]) * 10) / 10;
    const q4Phys = Math.round((monthlyPhysicalTotals[9] + monthlyPhysicalTotals[10] + monthlyPhysicalTotals[11]) * 10) / 10;
    const quarterlyPhysicalCumulative = [q1Phys, q2Phys, q3Phys, q4Phys];

    // Compute live submission stats for all amendments + original plan 0
    const originalPlanSubmissions = moeBranches.map((br) => {
      const brPlan = allPlans.find(
        (p) => p.branchId === br.id && p.year === year && Number(p.amendmentNumber || 0) === 0
      );
      const brActs = (freshData.aipActivities || []).filter(
        (a) => a.branchId === br.id && (a.year === year || !a.year) && Number(a.amendmentNumber || 0) === 0
      );
      const totalCost = brActs.reduce((sum, a) => sum + (Number(a.estimatedCost) || 0), 0);
      return {
        branchId: br.id,
        branchName: br.name,
        status: brPlan?.status || 'Draft',
        submittedAt: brPlan?.submittedAt || null,
        approvedAt: brPlan?.approvedAt || null,
        approvedBy: brPlan?.approvedBy || null,
        activityCount: brActs.length,
        totalCost: roundToCentInMn(totalCost),
      };
    });

    // If regular branch user, filter amendments to only ones targeted to their branch (or all branches)
    let visibleAmendments = allAmendments;
    if (!isPrivileged && user?.organizationId) {
      visibleAmendments = allAmendments.filter(
        (a) => !a.targetBranchIds || a.targetBranchIds.length === 0 || a.targetBranchIds.includes(user.organizationId)
      );
    }

    const amendmentsWithSubmissions = visibleAmendments.map((amend) => {
      const relevantBranches = amend.targetBranchIds && amend.targetBranchIds.length > 0
        ? moeBranches.filter((b) => amend.targetBranchIds!.includes(b.id))
        : moeBranches;

      const branchSubmissions = relevantBranches.map((br) => {
        const brPlan = allPlans.find(
          (p) => p.branchId === br.id && p.year === year && Number(p.amendmentNumber || 0) === amend.amendmentNumber
        );
        const brActs = (freshData.aipActivities || []).filter(
          (a) => a.branchId === br.id && (a.year === year || !a.year) && Number(a.amendmentNumber || 0) === amend.amendmentNumber
        );
        const totalCost = brActs.reduce((sum, a) => sum + (Number(a.estimatedCost) || 0), 0);
        return {
          branchId: br.id,
          branchName: br.name,
          status: brPlan?.status || 'Draft',
          submittedAt: brPlan?.submittedAt || null,
          approvedAt: brPlan?.approvedAt || null,
          approvedBy: brPlan?.approvedBy || null,
          isDispatchedToBranch: Boolean(brPlan?.isDispatchedToBranch),
          dispatchedAt: brPlan?.dispatchedAt || null,
          activityCount: brActs.length,
          totalCost: roundToCentInMn(totalCost),
        };
      });
      const submittedCount = branchSubmissions.filter((b) => b.status === 'Submitted' || b.status === 'Approved').length;
      return {
        ...amend,
        totalBranches: relevantBranches.length,
        submittedBranchesCount: submittedCount,
        branchSubmissions,
      };
    });

    const approvedProposals = (freshData.budgetProposalActivities || []).filter(
      (p) =>
        p.divisionId === branchId &&
        (p.financialYear === year || !p.financialYear) &&
        (p.status === 'Accepted' || p.status === 'Adjusted')
    );

    // Monthly Progress Returns for this branch & year (or consolidated)
    const monthlyReturns = (data.monthlyProgressReturns || []).filter(
      (r) =>
        (isConsolidated ? consolidatedBranchIds.has(r.branchId) : r.branchId === branchId) &&
        (r.year === String(year) || !r.year)
    );

    // Active AIP Template for dynamic columns
    const allTemplates = data.aipTemplates || [];
    let activeTemplate = allTemplates.find((t) => t.isDefault && t.status === 'Active');
    if (!activeTemplate && year) {
      activeTemplate = allTemplates.find((t) => t.financialYear === year && t.status === 'Active');
    }
    if (!activeTemplate && allTemplates.length > 0) {
      activeTemplate = allTemplates[0];
    }

    return NextResponse.json({
      success: true,
      hasPlan: true,
      plan,
      branch: currentBranch,
      isConsolidated: Boolean(isConsolidated),
      moeBranches,
      relevantPlanningBranch,
      relevantMonitoringBranch,
      monthlyReturns,
      aipTemplate: activeTemplate || null,
      deadline: aipDeadline || null,
      year,
      amendmentNumber,
      currentAmendment,
      amendments: amendmentsWithSubmissions,
      originalPlanSubmissions,
      approvedProposalsCount: approvedProposals.length,
      activities,
      totals: {
        totalEstimatedCost: roundToCentInMn(totalEstimatedCost),
        monthlyFinancialTotals: monthlyFinancialTotals.map((f) => roundToCentInMn(f)),
        quarterlyFinancialCumulative: quarterlyFinancialCumulative.map((f) => roundToCentInMn(f)),
        monthlyPhysicalTotals,
        quarterlyPhysicalCumulative,
      },
    });
  } catch (error: any) {
    console.error('Error fetching annual plan:', error);
    return NextResponse.json(
      { error: 'Failed to fetch annual plan data', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    const body = await request.json();

    const branchId = body.branchId || user?.organizationId || 'org-moe-ict';
    const branchName = body.branchName || user?.organizationName || 'Information Technology and Digital Education Branch';
    const year = body.year ? String(body.year) : '2027';
    const amendmentNumber = parseInt(String(body.amendmentNumber || '0'), 10);

    let savedPlan: AipPlan | null = null;

    await updateDb((data) => {
      if (!data.aipPlans) data.aipPlans = [];

      const existingIdx = data.aipPlans.findIndex(
        (p) =>
          (body.id && p.id === body.id) ||
          (p.branchId === branchId && p.year === year && Number(p.amendmentNumber || 0) === amendmentNumber)
      );

      if (existingIdx !== -1) {
        data.aipPlans[existingIdx] = {
          ...data.aipPlans[existingIdx],
          branchName: body.branchName || data.aipPlans[existingIdx].branchName || branchName,
          phaseTitle: body.phaseTitle !== undefined ? body.phaseTitle : data.aipPlans[existingIdx].phaseTitle,
          targetTitle: body.targetTitle !== undefined ? body.targetTitle : data.aipPlans[existingIdx].targetTitle,
          mainResponsibility: body.mainResponsibility !== undefined ? body.mainResponsibility : data.aipPlans[existingIdx].mainResponsibility,
          mainContactNo: body.mainContactNo !== undefined ? body.mainContactNo : data.aipPlans[existingIdx].mainContactNo,
          overallResponsibility: body.overallResponsibility !== undefined ? body.overallResponsibility : data.aipPlans[existingIdx].overallResponsibility,
          overallContactNo: body.overallContactNo !== undefined ? body.overallContactNo : data.aipPlans[existingIdx].overallContactNo,
          outcome: body.outcome !== undefined ? body.outcome : data.aipPlans[existingIdx].outcome,
          thematicPriorityArea: body.thematicPriorityArea !== undefined ? body.thematicPriorityArea : data.aipPlans[existingIdx].thematicPriorityArea,
          intermediateOutcome: body.intermediateOutcome !== undefined ? body.intermediateOutcome : data.aipPlans[existingIdx].intermediateOutcome,
          mainFocusArea: body.mainFocusArea !== undefined ? body.mainFocusArea : data.aipPlans[existingIdx].mainFocusArea,
          progressStartDate: body.progressStartDate !== undefined ? body.progressStartDate : data.aipPlans[existingIdx].progressStartDate,
          progressEndDate: body.progressEndDate !== undefined ? body.progressEndDate : data.aipPlans[existingIdx].progressEndDate,
          updatedAt: new Date().toISOString(),
        };
        savedPlan = data.aipPlans[existingIdx];
      } else {
        const newPlan: AipPlan = {
          id: body.id || `plan-${branchId}-${year}${amendmentNumber > 0 ? `-amend-${amendmentNumber}` : ''}`,
          branchId,
          branchName,
          year,
          amendmentNumber,
          phaseTitle: body.phaseTitle || '3. Implementation Phase',
          targetTitle: body.targetTitle || `Overall Physical and Financial Targets ${year}`,
          mainResponsibility: body.mainResponsibility || '',
          mainContactNo: body.mainContactNo || '',
          overallResponsibility: body.overallResponsibility || '',
          overallContactNo: body.overallContactNo || '',
          outcome: body.outcome || '',
          thematicPriorityArea: body.thematicPriorityArea || '',
          intermediateOutcome: body.intermediateOutcome || '',
          mainFocusArea: body.mainFocusArea || '',
          progressStartDate: body.progressStartDate || '2026.01.01',
          progressEndDate: body.progressEndDate || '2026.10.31',
          status: 'Draft',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        data.aipPlans.push(newPlan);
        savedPlan = newPlan;
      }
    });

    return NextResponse.json({ success: true, plan: savedPlan });
  } catch (error: any) {
    console.error('Error saving annual plan header:', error);
    return NextResponse.json(
      { error: 'Failed to save annual plan header', details: error.message },
      { status: 500 }
    );
  }
}
