
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb, updateDb, Notification } from '@/lib/db';
import { randomUUID } from 'crypto';
import { logAuditEvent } from '@/lib/auditLogger';
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
    const { branchId, year, amendmentNumber = 0, action, notes } = body;

    if (!branchId || !year) {
      return NextResponse.json({ error: 'branchId and year are required' }, { status: 400 });
    }

    const validActions = ['Approve', 'Return', 'DirectorApprove', 'DirectorReturn', 'AddSecApprove', 'AddSecReturn'];
    if (!validActions.includes(action)) {
      return NextResponse.json({ error: 'Invalid approval action' }, { status: 400 });
    }

    const data = await getDb();
    const isConsolidated = branchId === 'all';
    const isDirectorAction = action === 'DirectorApprove' || action === 'DirectorReturn';
    const isAddSecAction = action === 'AddSecApprove' || action === 'AddSecReturn';

    const isSuperAdmin = Boolean(user?.isSuperAdmin || user?.adminLevel === 0 || user?.roleId === 'role-superadmin');
    const isBranchDirector = Boolean(
      (user?.isDirector || user?.roleId === 'role-director' || user?.roleName === 'Director') &&
      (isSuperAdmin || user?.organizationId === branchId)
    );
    const isBranchAddSec = Boolean(
      (user?.isAdditionalSecretary || user?.roleId === 'role-additional-secretary' || user?.roleName?.includes('Additional Secretary')) &&
      (isSuperAdmin || user?.organizationId === branchId)
    );

    // Verify jurisdiction for the specific approval stage
    const isAuthorized = isDirectorAction
      ? (isBranchDirector || isSuperAdmin)
      : isAddSecAction
      ? (isBranchAddSec || isSuperAdmin)
      : (!user || (isConsolidated
          ? (user?.username === 'planning.officer' || user?.isSuperAdmin || (user?.adminLevel !== undefined && user.adminLevel <= 1) || user?.roleId === 'role-planning-officer' || user?.roleId === 'role-superadmin')
          : canUserReviewPlan(user, branchId, data.organizations || [])));

    const branchOrg = (data.organizations || []).find((o) => o.id === branchId);
    const branchName = isConsolidated ? 'Consolidated Ministry Implementation Plan' : (branchOrg?.name || 'MOE Branch');

    if (!isAuthorized) {
      return NextResponse.json(
        { error: `Forbidden: You do not have authority for this approval step on ${branchName}.` },
        { status: 403 }
      );
    }

    const now = new Date().toISOString();
    let updatedPlan: any = null;

    // Relevant planning authority details
    const relevantPlanning = getRelevantPlanningBranch(isConsolidated ? 'org-moe-ict' : branchId, data.organizations || []);
    const approverName = user.fullName || user.name || relevantPlanning.planningAuthorityLabel;

    await updateDb((dbData) => {
      if (!dbData.aipPlans) dbData.aipPlans = [];
      if (!dbData.notifications) dbData.notifications = [];

      const newStatus: 'Pending Additional Secretary Approval' | 'Submitted' | 'Approved' | 'Draft' =
        action === 'DirectorApprove'
          ? 'Pending Additional Secretary Approval'
          : action === 'AddSecApprove'
          ? 'Submitted'
          : action === 'Approve'
          ? 'Approved'
          : 'Draft';

      if (isConsolidated) {
        // Approve all branch plans for this year and amendment
        dbData.aipPlans.forEach((p) => {
          if (p.year === String(year) && Number(p.amendmentNumber || 0) === Number(amendmentNumber)) {
            p.status = newStatus;
            p.approvedAt = action === 'Approve' ? now : undefined;
            p.approvedBy = action === 'Approve' ? approverName : undefined;
            p.approvalNotes = notes ? String(notes).trim() : undefined;
            p.updatedAt = now;
          }
        });
        updatedPlan = {
          id: `plan-consolidated-${year}-amend-${amendmentNumber}`,
          branchId: 'all',
          branchName: 'Consolidated Ministry-Level AIP',
          year: String(year),
          status: newStatus,
          approvedAt: action === 'Approve' ? now : undefined,
          approvedBy: action === 'Approve' ? approverName : undefined,
        };
      } else {
        const planIdx = dbData.aipPlans.findIndex(
          (p) =>
            p.branchId === branchId &&
            p.year === String(year) &&
            Number(p.amendmentNumber || 0) === Number(amendmentNumber)
        );

        if (planIdx !== -1) {
          dbData.aipPlans[planIdx] = {
            ...dbData.aipPlans[planIdx],
            status: newStatus,
            directorApprovedBy: action === 'DirectorApprove' ? approverName : dbData.aipPlans[planIdx].directorApprovedBy,
            directorApprovedAt: action === 'DirectorApprove' ? now : dbData.aipPlans[planIdx].directorApprovedAt,
            addSecApprovedBy: action === 'AddSecApprove' ? approverName : dbData.aipPlans[planIdx].addSecApprovedBy,
            addSecApprovedAt: action === 'AddSecApprove' ? now : dbData.aipPlans[planIdx].addSecApprovedAt,
            approvedAt: action === 'Approve' ? now : dbData.aipPlans[planIdx].approvedAt,
            approvedBy: action === 'Approve' ? approverName : dbData.aipPlans[planIdx].approvedBy,
            approvalNotes: notes ? String(notes).trim() : undefined,
            updatedAt: now,
          };
          updatedPlan = dbData.aipPlans[planIdx];
        } else {
          const newPlan = {
            id: `plan-${branchId}-${year}${Number(amendmentNumber) > 0 ? `-amend-${amendmentNumber}` : ''}`,
            branchId,
            branchName,
            year: String(year),
            amendmentNumber: Number(amendmentNumber),
            phaseTitle: '3. Implementation Phase',
            targetTitle: `Overall Physical and Financial Targets ${year}${Number(amendmentNumber) > 0 ? ` (Amendment ${amendmentNumber})` : ''}`,
            mainResponsibility: '',
            mainContactNo: '',
            overallResponsibility: '',
            overallContactNo: '',
            status: newStatus as any,
            approvedAt: action === 'Approve' ? now : undefined,
            approvedBy: action === 'Approve' ? approverName : undefined,
            approvalNotes: notes ? String(notes).trim() : undefined,
            createdAt: now,
            updatedAt: now,
          };
          dbData.aipPlans.push(newPlan);
          updatedPlan = newPlan;
        }
      }

      // Notify the appropriate recipient (Additional Secretary, Planning Branch, or operational branch)
      const planTitle = Number(amendmentNumber) === 0
        ? `Original Implementation Plan (${year})`
        : `Amendment 0${amendmentNumber} (${year})`;

      const recipientOrgId = action === 'AddSecApprove' ? relevantPlanning.planningOrgId : branchId;
      const notifTitle =
        action === 'DirectorApprove'
          ? `✅ ${planTitle} Approved by Branch Director`
          : action === 'DirectorReturn'
          ? `↩️ ${planTitle} Returned by Branch Director`
          : action === 'AddSecApprove'
          ? `📋 ${planTitle} Approved by Additional Secretary (${branchName})`
          : action === 'AddSecReturn'
          ? `↩️ ${planTitle} Returned by Additional Secretary`
          : action === 'Approve'
          ? `✅ ${planTitle} Approved by ${relevantPlanning.planningAuthorityLabel}`
          : `⚠️ ${planTitle} Returned for Revision by ${relevantPlanning.planningAuthorityLabel}`;

      const notifMsg =
        action === 'DirectorApprove'
          ? `${approverName} approved the ${planTitle} for ${branchName}. Now awaiting Branch Additional Secretary approval.`
          : action === 'AddSecApprove'
          ? `${branchName} (approved by Branch Director & Additional Secretary) has submitted ${planTitle} to ${relevantPlanning.planningAuthorityLabel} for final approval.`
          : action === 'Approve'
          ? `${relevantPlanning.planningAuthorityLabel} has approved your ${planTitle}.${notes ? ` Remarks: "${notes}"` : ''}`
          : `${approverName} has returned your ${planTitle} for adjustments.${notes ? ` Remarks: "${notes}"` : ' Please review and resubmit.'}`;

      const notifToBranch: Notification = {
        id: `notif-aip-appr-${randomUUID()}`,
        recipientOrgId,
        workshopId: 'aip-plan',
        title: notifTitle,
        message: notifMsg,
        isRead: false,
        createdAt: now,
      };
      dbData.notifications.push(notifToBranch);
    });

    await logAuditEvent({
      user,
      category: 'Governance',
      action: action === 'Approve' ? 'AIP_PLAN_APPROVED' : 'AIP_PLAN_RETURNED',
      entityType: 'AIP_PLAN',
      entityId: `${branchId}-${year}-amend-${amendmentNumber}`,
      summary: `${action === 'Approve' ? 'Approved' : 'Returned for revision'} Annual Implementation Plan for ${branchName} (FY ${year}, Amendment ${amendmentNumber}) by ${relevantPlanning.planningAuthorityLabel}.`,
      details: { branchId, branchName, year, amendmentNumber, action, notes, planningAuthority: relevantPlanning.planningAuthorityLabel },
      severity: action === 'Approve' ? 'Info' : 'Warning',
    });

    return NextResponse.json({
      success: true,
      plan: updatedPlan,
      message: action === 'Approve'
        ? `Plan successfully approved!`
        : `Plan successfully returned to branch for revision.`,
    });
  } catch (error: any) {
    console.error('Error in approve route:', error);
    return NextResponse.json(
      { error: 'Failed to process approval action', details: error.message },
      { status: 500 }
    );
  }
}

