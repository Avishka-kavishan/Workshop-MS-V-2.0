import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb, updateDb, AipActivity, AipPlan, BudgetProposalActivity } from '@/lib/db';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user as any;
    const body = await request.json();

    const year = body.year ? String(body.year) : '2027';
    const reqBranchId = body.branchId;

    // Privileged accounts (Special Planning Officer / Super Admin / Level 1 Admin) can import for any branch; operational branches for themselves
    const isPrivileged =
      user?.username !== 'planning' &&
      (user?.isSuperAdmin ||
      user?.adminLevel === 0 ||
      user?.adminLevel === 1 ||
      user?.roleId === 'role-superadmin' ||
      user?.roleId === 'role-admin' ||
      user?.username === 'planning.officer' ||
      (user?.roleId === 'role-planning-officer' && (user?.organizationId === 'org-moe-planning' || user?.organizationId === 'org-moe')));
    const branchId = isPrivileged && reqBranchId ? reqBranchId : (user?.organizationId || reqBranchId || 'org-moe-ict');

    const data = await getDb();
    const branchOrg = (data.organizations || []).find((o) => o.id === branchId);
    const branchName = branchOrg?.name || user?.organizationName || 'MOE Branch';

    // 1. Find all accepted/adjusted proposals for this branch & year
    const acceptedProposals = (data.budgetProposalActivities || []).filter(
      (p) =>
        p.divisionId === branchId &&
        (p.financialYear === year || !p.financialYear) &&
        (p.status === 'Accepted' || p.status === 'Adjusted')
    );

    if (acceptedProposals.length === 0) {
      return NextResponse.json({
        success: false,
        message: `No PPB-accepted budget activities found for ${branchName} in FY ${year}. Please submit proposals in Budget Planning and have PPB approve them first.`,
        importedCount: 0,
      }, { status: 400 });
    }

    // Sort by activity number
    acceptedProposals.sort((a, b) => (a.activityNumber || 0) - (b.activityNumber || 0));

    const now = new Date().toISOString();
    let importedCount = 0;
    const newActivities: AipActivity[] = [];

    await updateDb((dbData) => {
      if (!dbData.aipPlans) dbData.aipPlans = [];
      if (!dbData.aipActivities) dbData.aipActivities = [];

      // Find or create original baseline plan (amendmentNumber === 0)
      let plan = dbData.aipPlans.find(
        (p) => p.branchId === branchId && p.year === year && Number(p.amendmentNumber || 0) === 0
      );

      if (!plan) {
        plan = {
          id: `plan-${branchId}-${year}`,
          branchId,
          branchName,
          year,
          amendmentNumber: 0,
          phaseTitle: '3. Implementation Phase',
          targetTitle: `Overall Physical and Financial Targets ${year}`,
          mainResponsibility: '',
          mainContactNo: '',
          overallResponsibility: '',
          overallContactNo: '',
          status: 'Draft',
          createdAt: now,
          updatedAt: now,
        };
        dbData.aipPlans.push(plan);
      }

      // Existing AIP activities for this branch, year, original plan
      const existingAipActs = dbData.aipActivities.filter(
        (a) => a.branchId === branchId && a.year === year && Number(a.amendmentNumber || 0) === 0
      );

      acceptedProposals.forEach((prop, idx) => {
        // Check if already imported
        const alreadyExists = existingAipActs.some(
          (a) => a.proposalId === prop.id || (a.activity.trim().toLowerCase() === prop.activityTitle.trim().toLowerCase())
        );

        if (!alreadyExists) {
          const actNum = prop.activityNumber || (existingAipActs.length + importedCount + 1);
          const actCode = prop.assignedActivityCode || `ACT-${String(actNum).padStart(2, '0')}`;
          const costMn = Number(prop.adjustedCostMn ?? prop.estimatedCostMn) || 0;

          // Distribute monthly figures based on implementationPeriod (in Millions with cent precision)
          const finMonths = Array(12).fill(0);
          const physMonths = Array(12).fill('-');

          const rCent = (val: number) => Math.round(val * 100000000) / 100000000;

          if (prop.implementationPeriod === 'Q1') {
            finMonths[0] = rCent(costMn * 0.3);
            finMonths[1] = rCent(costMn * 0.4);
            finMonths[2] = rCent(costMn - (finMonths[0] + finMonths[1]));
            physMonths[0] = '30%';
            physMonths[1] = '70%';
            physMonths[2] = '100%';
          } else if (prop.implementationPeriod === 'Q2') {
            finMonths[3] = rCent(costMn * 0.3);
            finMonths[4] = rCent(costMn * 0.4);
            finMonths[5] = rCent(costMn - (finMonths[3] + finMonths[4]));
            physMonths[3] = '30%';
            physMonths[4] = '70%';
            physMonths[5] = '100%';
          } else if (prop.implementationPeriod === 'Q3') {
            finMonths[6] = rCent(costMn * 0.3);
            finMonths[7] = rCent(costMn * 0.4);
            finMonths[8] = rCent(costMn - (finMonths[6] + finMonths[7]));
            physMonths[6] = '30%';
            physMonths[7] = '70%';
            physMonths[8] = '100%';
          } else if (prop.implementationPeriod === 'Q4') {
            finMonths[9] = rCent(costMn * 0.3);
            finMonths[10] = rCent(costMn * 0.4);
            finMonths[11] = rCent(costMn - (finMonths[9] + finMonths[10]));
            physMonths[9] = '30%';
            physMonths[10] = '70%';
            physMonths[11] = '100%';
          } else {
            // Annual or spread
            const perMonth = rCent(costMn / 12);
            let runningSum = 0;
            for (let m = 0; m < 11; m++) {
              finMonths[m] = perMonth;
              runningSum = rCent(runningSum + perMonth);
              physMonths[m] = `${Math.round(((m + 1) / 12) * 100)}%`;
            }
            finMonths[11] = rCent(costMn - runningSum);
            physMonths[11] = '100%';
          }

          const q1Fin = rCent(finMonths[0] + finMonths[1] + finMonths[2]);
          const q2Fin = rCent(q1Fin + finMonths[3] + finMonths[4] + finMonths[5]);
          const q3Fin = rCent(q2Fin + finMonths[6] + finMonths[7] + finMonths[8]);
          const q4Fin = rCent(q3Fin + finMonths[9] + finMonths[10] + finMonths[11]);

          const newAipActivity: AipActivity = {
            id: `act-aip-${prop.id.replace('prop-', '')}`,
            planId: plan.id,
            branchId,
            branchName,
            year,
            amendmentNumber: 0,
            outputNo: String(actNum),
            activityCode: String(actNum),
            activity: prop.activityTitle,
            voteNumber: prop.assignedVoteNumber || '126-02-03-2502',
            estimatedCost: costMn,
            financialMonths: finMonths,
            physicalMonths: physMonths,
            financialQ1: q1Fin,
            financialQ2: q2Fin,
            financialQ3: q3Fin,
            financialQ4: q4Fin,
            targetQ1: prop.implementationPeriod === 'Q1' ? '100%' : prop.implementationPeriod === 'Annual' ? '25%' : '-',
            targetQ2: prop.implementationPeriod === 'Q2' ? '100%' : prop.implementationPeriod === 'Annual' ? '50%' : '-',
            targetQ3: prop.implementationPeriod === 'Q3' ? '100%' : prop.implementationPeriod === 'Annual' ? '75%' : '-',
            targetQ4: '100%',
            responsibleOfficer: prop.executingAgencyName || 'Branch Officer',
            remarks: `Approved by PPB. Vote: ${prop.assignedVoteNumber || '126-02-03-2502'} • Allocation: Rs. ${costMn} Mn`,
            proposalId: prop.id,
            proposalActivityNumber: prop.activityNumber,
            isAddedByPlanning: Boolean(prop.isStrategicVisionAddition),
            isAdjustedByPlanning: prop.status === 'Adjusted' || (prop.adjustedCostMn !== undefined && prop.adjustedCostMn !== prop.estimatedCostMn),
            originalProposedCost: Number(prop.estimatedCostMn) || costMn,
            planningNotes: prop.planningRemarks || prop.ppbModificationsNote || '',
            planningOfficerName: prop.reviewedBy || 'Planning Division (PPB)',
            sourceProposalTitle: prop.activityTitle,
            createdBy: user?.id || 'system',
            creatorName: user?.name || branchName,
            createdAt: now,
            updatedAt: now,
          };

          dbData.aipActivities.push(newAipActivity);
          newActivities.push(newAipActivity);
          importedCount++;
        }
      });
    });

    return NextResponse.json({
      success: true,
      importedCount,
      message: importedCount > 0
        ? `Successfully imported ${importedCount} PPB-approved activities into ${year} Annual Implementation Plan (AIP)!`
        : `All approved activities are already present in the AIP matrix.`,
      activities: newActivities,
    });
  } catch (error: any) {
    console.error('Error importing PPB activities into AIP:', error);
    return NextResponse.json(
      { error: 'Failed to import PPB approved activities', details: error.message },
      { status: 500 }
    );
  }
}
