import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb, updateDb, AipPlan } from '@/lib/db';
import { randomUUID } from 'crypto';
import { formatMillion, formatRupees, roundToCentInMn } from '@/lib/financialFormat';
import { canUserReviewPlan, getRelevantPlanningBranch } from '@/lib/planningHierarchy';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user as any;
    const body = await request.json();
    const branchId = body.branchId;
    const year = body.year ? String(body.year) : '2027';
    const amendmentNumber = parseInt(String(body.amendmentNumber || '0'), 10);
    const dispatchNotes = body.dispatchNotes || 'Official Treasury Voted Budget Allocation & Implementation Directives issued by Planning Division.';

    if (!branchId) {
      return NextResponse.json({ error: 'Target branchId is required.' }, { status: 400 });
    }

    const data = await getDb();
    const isConsolidated = branchId === 'all';
    const isAuthorized = !user || (isConsolidated
      ? (user?.username === 'planning.officer' || user?.isSuperAdmin || (user?.adminLevel !== undefined && user.adminLevel <= 1) || user?.roleId === 'role-planning-officer' || user?.roleId === 'role-superadmin')
      : canUserReviewPlan(user, branchId, data.organizations || []));

    const branchOrg = (data.organizations || []).find((o) => o.id === branchId);
    const branchName = isConsolidated ? 'All Ministry Branches' : (branchOrg?.name || branchId);

    if (!isAuthorized) {
      return NextResponse.json(
        { error: `Forbidden: You do not have Planning Authority jurisdiction to dispatch plans to ${branchName}.` },
        { status: 403 }
      );
    }

    const relevantPlanning = getRelevantPlanningBranch(isConsolidated ? 'org-moe-ict' : branchId, data.organizations || []);

    const activities = (data.aipActivities || []).filter(
      (a) =>
        (isConsolidated ? true : a.branchId === branchId) &&
        (a.year === year || !a.year) &&
        Number(a.amendmentNumber || 0) === amendmentNumber
    );

    const totalVotedCost = roundToCentInMn(
      activities.reduce((sum, a) => sum + (Number(a.estimatedCost) || 0), 0)
    );

    const now = new Date().toISOString();
    let updatedPlan: AipPlan | null = null;

    await updateDb((dbData) => {
      if (!dbData.aipPlans) dbData.aipPlans = [];
      if (!dbData.notifications) dbData.notifications = [];
      if (!dbData.auditLogs) dbData.auditLogs = [];

      if (isConsolidated) {
        dbData.aipPlans.forEach((p) => {
          if (p.year === year && Number(p.amendmentNumber || 0) === amendmentNumber) {
            p.status = 'Approved';
            p.isDispatchedToBranch = true;
            p.dispatchedAt = now;
            p.dispatchedBy = user.name || user.username || 'Planning Division Officer';
            p.dispatchNotes = dispatchNotes;
            p.updatedAt = now;

            // Notify each branch
            dbData.notifications.push({
              id: `notif-dispatch-${randomUUID()}`,
              recipientOrgId: p.branchId,
              workshopId: `aip-${p.branchId}-${year}`,
              title: `📢 Official Voted Annual Plan (AIP) FY ${year} Dispatched by ${relevantPlanning.planningAuthorityLabel}`,
              message: `${relevantPlanning.planningAuthorityLabel} has officially approved and dispatched the Annual Implementation Plan with allocated Treasury Vote Numbers.`,
              isRead: false,
              createdAt: now,
            });
          }
        });
        updatedPlan = {
          id: `plan-consolidated-${year}-amend-${amendmentNumber}`,
          branchId: 'all',
          branchName: 'Consolidated Ministry-Level AIP',
          year,
          amendmentNumber,
          phaseTitle: '3. Implementation Phase',
          targetTitle: `Overall Physical and Financial Targets ${year}`,
          mainResponsibility: '',
          mainContactNo: '',
          overallResponsibility: '',
          overallContactNo: '',
          status: 'Approved',
          isDispatchedToBranch: true,
          dispatchedAt: now,
          dispatchedBy: user.name || user.username || 'Planning Division Officer',
          dispatchNotes,
          createdAt: now,
          updatedAt: now,
        };
      } else {
        let planIdx = dbData.aipPlans.findIndex(
          (p) => p.branchId === branchId && p.year === year && Number(p.amendmentNumber || 0) === amendmentNumber
        );

        if (planIdx === -1) {
          // Create baseline plan if not yet created
          const newPlan: AipPlan = {
            id: `plan-${branchId}-${year}${amendmentNumber > 0 ? `-amend-${amendmentNumber}` : ''}`,
            branchId,
            branchName,
            year,
            amendmentNumber,
            phaseTitle: '3. Implementation Phase',
            targetTitle: `Overall Physical and Financial Targets ${year}`,
            mainResponsibility: '',
            mainContactNo: '',
            overallResponsibility: '',
            overallContactNo: '',
            status: 'Approved',
            isDispatchedToBranch: true,
            dispatchedAt: now,
            dispatchedBy: user.name || user.username || 'Planning Division Officer',
            dispatchNotes,
            createdAt: now,
            updatedAt: now,
          };
          dbData.aipPlans.push(newPlan);
          updatedPlan = newPlan;
        } else {
          dbData.aipPlans[planIdx] = {
            ...dbData.aipPlans[planIdx],
            status: 'Approved',
            isDispatchedToBranch: true,
            dispatchedAt: now,
            dispatchedBy: user.name || user.username || 'Planning Division Officer',
            dispatchNotes,
            approvedAt: now,
            approvedBy: user.name || user.username || 'Planning Division Officer',
            updatedAt: now,
          };
          updatedPlan = dbData.aipPlans[planIdx];
        }

        // Notify Branch Officers
        dbData.notifications.push({
          id: `notif-dispatch-${randomUUID()}`,
          recipientOrgId: branchId,
          workshopId: `aip-${branchId}-${year}`,
          title: `📢 Official Voted Annual Plan (AIP) FY ${year} Dispatched by ${relevantPlanning.planningAuthorityLabel}`,
          message: `${relevantPlanning.planningAuthorityLabel} has officially approved and dispatched the Annual Implementation Plan with allocated Treasury Vote Numbers (${activities.length} activities, Total Voted Allocation: Rs. ${formatMillion(totalVotedCost)} Mn [${formatRupees(totalVotedCost, true)}]).`,
          isRead: false,
          createdAt: now,
        });
      }

      // System Audit Log
      dbData.auditLogs.unshift({
        id: `audit-${randomUUID()}`,
        timestamp: now,
        userId: user.id || 'planning-officer',
        username: user.username || 'planning.officer',
        userFullName: user.name || 'Planning Officer',
        organizationId: user.organizationId || 'org-moe-planning',
        organizationName: 'Ministry Planning Division (PPB)',
        category: 'Governance',
        action: 'DISPATCH_VOTED_AIP_PLAN',
        entityType: 'AIP_PLAN',
        entityId: updatedPlan?.id || `plan-${branchId}-${year}`,
        summary: `Dispatched official voted Annual Plan FY ${year} to ${branchName} with ${activities.length} activities totaling Rs. ${formatMillion(totalVotedCost)} Mn`,
        details: {
          branchId,
          branchName,
          year,
          amendmentNumber,
          activityCount: activities.length,
          totalVotedCost,
          dispatchNotes,
        },
        severity: 'Info',
      });
    });

    return NextResponse.json({
      success: true,
      message: `Successfully approved & dispatched official voted Annual Plan for FY ${year} to ${branchName}!`,
      plan: updatedPlan,
      activityCount: activities.length,
      totalVotedCost,
    });
  } catch (error: any) {
    console.error('Error dispatching annual plan:', error);
    return NextResponse.json(
      { error: 'Failed to dispatch annual plan to branch', details: error.message },
      { status: 500 }
    );
  }
}
