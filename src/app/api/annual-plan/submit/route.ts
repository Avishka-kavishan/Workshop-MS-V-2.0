import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb, updateDb, Notification } from '@/lib/db';
import { randomUUID } from 'crypto';
import { getRelevantPlanningBranch } from '@/lib/planningHierarchy';
import { logAuditEvent } from '@/lib/auditLogger';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user as any;
    const body = await request.json();

    const planId = body.planId;
    const branchId = body.branchId || user?.organizationId;
    const year = body.year ? String(body.year) : '2027';
    const amendmentNumber = Number(body.amendmentNumber) || 0;
    const submissionNotes = (body.notes || '').trim();

    // Verify user authorization: Only own branch members or privileged planning/super-admins can submit
    const isPrivileged =
      user?.username !== 'planning' &&
      (user?.isSuperAdmin ||
      user?.adminLevel === 0 ||
      user?.adminLevel === 1 ||
      user?.roleId === 'role-superadmin' ||
      user?.roleId === 'role-planning-officer' ||
      user?.roleId === 'role-admin' ||
      user?.roleId === 'admin' ||
      user?.username === 'planning.officer' ||
      user?.username === 'doe.planning' ||
      user?.functionalCategory === 'Planning');

    if (!isPrivileged && user?.organizationId && user.organizationId !== branchId) {
      return NextResponse.json(
        { error: 'Forbidden: You can only submit the annual implementation plan for your own branch.' },
        { status: 403 }
      );
    }

    const now = new Date().toISOString();
    let updatedPlan: any = null;

    const data = await getDb();

    // Check AIP Submission Deadline
    const aipDeadline = (data.deadlines || []).find(
      (d: any) =>
        (d.category === 'AIP Submission' || d.id === 'dl-2027-aip') &&
        (d.financialYear === String(year) || !d.financialYear)
    );

    if (aipDeadline && aipDeadline.dueDate && !isPrivileged) {
      const today = new Date().toISOString().slice(0, 10);
      if (today > aipDeadline.dueDate || aipDeadline.status === 'Closed') {
        return NextResponse.json(
          {
            error: `Submission Cutoff Enforced: The official AIP submission deadline announced by Policy Planning Branch (PPB) was ${aipDeadline.dueDate}. The submission window is closed.`,
            deadline: aipDeadline,
          },
          { status: 403 }
        );
      }
    }

    const branchOrg = (data.organizations || []).find((o) => o.id === branchId);
    const branchName = branchOrg?.name || user?.organizationName || 'MOE Branch';

    // Dynamically identify the relevant planning branch (MOE branches -> MOE Planning, DOE branches -> DOE Planning)
    const targetPlanning = getRelevantPlanningBranch(branchId, data.organizations || []);

    const enableBranchApprovalChain = data.meta?.enableBranchApprovalChain ?? true;
    const isBranchDirector = Boolean(user?.isDirector || user?.roleId === 'role-director' || user?.roleName === 'Director');
    const isBranchAddSec = Boolean(user?.isAdditionalSecretary || user?.roleId === 'role-additional-secretary' || user?.roleName?.includes('Additional Secretary'));

    const targetStatus: 'Pending Director Approval' | 'Submitted' =
      enableBranchApprovalChain && !isPrivileged && !isBranchDirector && !isBranchAddSec
        ? 'Pending Director Approval'
        : 'Submitted';

    await updateDb((dbData) => {
      if (!dbData.aipPlans) dbData.aipPlans = [];
      if (!dbData.notifications) dbData.notifications = [];

      const planIdx = dbData.aipPlans.findIndex(
        (p) =>
          (planId && p.id === planId) ||
          (p.branchId === branchId && p.year === year && Number(p.amendmentNumber || 0) === amendmentNumber)
      );

      if (planIdx !== -1) {
        dbData.aipPlans[planIdx] = {
          ...dbData.aipPlans[planIdx],
          status: targetStatus,
          submittedAt: now,
          submissionNotes,
          submittedToPlanningOrgId: targetPlanning.planningOrgId,
          submittedToPlanningOrgName: targetPlanning.planningAuthorityLabel,
          updatedAt: now,
        };
        updatedPlan = dbData.aipPlans[planIdx];
      } else {
        // Create as submitted / pending director
        const newPlan = {
          id: planId || `plan-${branchId}-${year}${amendmentNumber > 0 ? `-amend-${amendmentNumber}` : ''}`,
          branchId,
          branchName,
          year,
          amendmentNumber,
          phaseTitle: '3. Implementation Phase',
          targetTitle: `Overall Physical and Financial Targets ${year}${amendmentNumber > 0 ? ` (Amendment ${amendmentNumber})` : ''}`,
          mainResponsibility: '',
          mainContactNo: '',
          overallResponsibility: '',
          overallContactNo: '',
          status: targetStatus,
          submittedAt: now,
          submissionNotes,
          submittedToPlanningOrgId: targetPlanning.planningOrgId,
          submittedToPlanningOrgName: targetPlanning.planningAuthorityLabel,
          createdAt: now,
          updatedAt: now,
        };
        dbData.aipPlans.push(newPlan);
        updatedPlan = newPlan;
      }

      // Notify Branch Director (when approval chain is active) OR Planning Branch (direct send)
      if (targetStatus === 'Pending Director Approval') {
        dbData.notifications.push({
          id: `notif-aip-dir-${randomUUID()}`,
          recipientOrgId: branchId,
          workshopId: 'aip-plan',
          title: `📋 AIP Pending Branch Director Approval: ${branchName}`,
          message: `${branchName} submitted their ${amendmentNumber === 0 ? `Original Implementation Plan (${year})` : `Amendment 0${amendmentNumber} (${year})`} for Branch Director review & approval.${submissionNotes ? ` Note: "${submissionNotes}"` : ''}`,
          isRead: false,
          createdAt: now,
        });
      } else {
        const titlePrefix = amendmentNumber === 0
          ? `📋 Original Plan Submitted: ${branchName}`
          : `🔄 Amendment 0${amendmentNumber} Submitted: ${branchName}`;
        const msgDesc = amendmentNumber === 0
          ? `${branchName} has submitted their Original Implementation Plan (${year}) to ${targetPlanning.planningAuthorityLabel} for review & approval.`
          : `${branchName} has submitted their Amendment 0${amendmentNumber} progress update (${year}) to ${targetPlanning.planningAuthorityLabel} for review.`;

        const notifToPlanning: Notification = {
          id: `notif-aip-sub-${randomUUID()}`,
          recipientOrgId: targetPlanning.planningOrgId,
          workshopId: 'aip-plan',
          title: titlePrefix,
          message: `${msgDesc}${submissionNotes ? ` Note: "${submissionNotes}"` : ''}`,
          isRead: false,
          createdAt: now,
        };
        dbData.notifications.push(notifToPlanning);
      }
    });

    await logAuditEvent({
      user,
      category: 'Governance',
      action: 'AIP_PLAN_SUBMITTED',
      entityType: 'AIP_PLAN',
      entityId: `${branchId}-${year}-amend-${amendmentNumber}`,
      summary:
        targetStatus === 'Pending Director Approval'
          ? `Submitted Annual Implementation Plan for ${branchName} (FY ${year}) to Branch Director for approval.`
          : `Submitted Annual Implementation Plan for ${branchName} (FY ${year}) to ${targetPlanning.planningAuthorityLabel} for review & approval.`,
      details: { branchId, branchName, year, amendmentNumber, targetStatus, enableBranchApprovalChain, targetPlanningOrgId: targetPlanning.planningOrgId, targetPlanningAuthority: targetPlanning.planningAuthorityLabel, submissionNotes },
      severity: 'Info',
    });

    const successMsg =
      targetStatus === 'Pending Director Approval'
        ? `Implementation Plan submitted to Branch Director for approval!`
        : amendmentNumber === 0
        ? `Original Implementation Plan successfully submitted to ${targetPlanning.planningAuthorityLabel} for approval!`
        : `Amendment 0${amendmentNumber} successfully submitted to ${targetPlanning.planningAuthorityLabel}!`;

    return NextResponse.json({
      success: true,
      plan: updatedPlan,
      targetPlanning,
      message: successMsg,
    });
  } catch (error: any) {
    console.error('Error submitting plan:', error);
    return NextResponse.json(
      { error: 'Failed to submit plan', details: error.message },
      { status: 500 }
    );
  }
}
