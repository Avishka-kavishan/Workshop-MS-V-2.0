import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  getDb,
  updateDb,
  BudgetAllocation,
  BudgetRevision,
  BudgetProposalActivity,
  Notification,
} from '@/lib/db';
import { getUserSecurityContext } from '@/lib/permissions';
import { randomUUID } from 'crypto';
import { roundToCentInMn, formatMillion, formatRupees } from '@/lib/financialFormat';
import { logAuditEvent } from '@/lib/auditLogger';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await getDb();
    const security = getUserSecurityContext(session.user, data.organizations);

    const { searchParams } = new URL(req.url);
    const year = searchParams.get('year') || '2027';

    // 1. Proposals for 2-Stage Budgetary Planning & Formulation
    const allProposals: BudgetProposalActivity[] = (data.budgetProposalActivities || []).filter(
      (p) => !p.financialYear || p.financialYear === year
    );

    // Ensure all accepted/adjusted proposals have sequential activity numbers starting from 1 per branch
    let needsDbBackfill = false;
    const branchDivIds = Array.from(new Set(allProposals.map((p) => p.divisionId)));
    branchDivIds.forEach((divId) => {
      const branchAccepted = allProposals.filter(
        (p) => p.divisionId === divId && (p.status === 'Accepted' || p.status === 'Adjusted')
      );
      let runningNum = 1;
      branchAccepted.forEach((p) => {
        if (!p.activityNumber) {
          while (branchAccepted.some((other) => other.activityNumber === runningNum)) {
            runningNum++;
          }
          p.activityNumber = runningNum;
          p.assignedActivityCode = `ACT-${String(runningNum).padStart(2, '0')}`;
          runningNum++;
          needsDbBackfill = true;
        }
      });
    });

    if (needsDbBackfill) {
      await updateDb((dbData) => {
        dbData.budgetProposalActivities = (dbData.budgetProposalActivities || []).map((dbP) => {
          const match = allProposals.find((p) => p.id === dbP.id);
          return match ? { ...dbP, activityNumber: match.activityNumber, assignedActivityCode: match.assignedActivityCode } : dbP;
        });
      });
    }

    // Filter for current user's branch
    const userDivisionProposals = allProposals.filter(
      (p) => p.divisionId === security.organizationId || p.submittedBy === (session.user as any)?.username
    );

    // Proposal Statistics
    const branchProposals = allProposals.filter((p) => !p.isStrategicVisionAddition);
    const visionProposals = allProposals.filter((p) => p.isStrategicVisionAddition);

    const branchProposedMn = branchProposals.reduce((sum, p) => sum + (Number(p.estimatedCostMn) || 0), 0);
    const visionProposedMn = visionProposals.reduce((sum, p) => sum + (Number(p.estimatedCostMn) || 0), 0);

    const acceptedProposals = allProposals.filter((p) => p.status === 'Accepted' || p.status === 'Adjusted');
    const acceptedCostMn = acceptedProposals.reduce(
      (sum, p) => sum + (Number(p.adjustedCostMn ?? p.estimatedCostMn) || 0),
      0
    );

    const budgetSpeechProposals = allProposals.filter((p) => p.includedInBudgetSpeech);

    const proposalSummary = {
      financialYear: year,
      totalProposals: allProposals.length,
      branchProposalsCount: branchProposals.length,
      branchProposedMn: roundToCentInMn(branchProposedMn),
      visionProposalsCount: visionProposals.length,
      visionProposedMn: roundToCentInMn(visionProposedMn),
      totalDemandMn: roundToCentInMn(branchProposedMn + visionProposedMn),
      acceptedCount: acceptedProposals.length,
      acceptedCostMn: roundToCentInMn(acceptedCostMn),
      budgetSpeechCount: budgetSpeechProposals.length,
      budgetSpeechCostMn: roundToCentInMn(budgetSpeechProposals.reduce((sum, p) => sum + (Number(p.adjustedCostMn ?? p.estimatedCostMn) || 0), 0)),
    };

    // 2. Existing Macro Ceilings and 5-Stage Financial Control Entities
    const ceilings = (data.budgetCeilings || []).filter((c) => !c.financialYear || c.financialYear === year);
    const allocations = (data.budgetAllocations || []).filter((a) => !a.financialYear || a.financialYear === year);
    const revisions = (data.budgetRevisions || []).filter((r) => !r.financialYear || r.financialYear === year);
    const objectCodes = data.expenditureObjectCodes || [];
    const fundingSources = data.fundingSources || [];
    const strategicObjectives = data.strategicObjectives || [];
    const programmes = data.programmes || [];
    const projects = data.projects || [];
    const organizations = (data.organizations || []).filter((o) => o.isActive);

    // Financial calculations
    const totalCeiling = ceilings.reduce((sum, c) => sum + (Number(c.totalCeiling) || 0), 0);
    const totalAllocated = allocations.reduce((sum, a) => sum + (Number(a.allocationAmount) || 0), 0);
    const totalCommitted = allocations.reduce((sum, a) => sum + (Number(a.commitmentAmount) || 0), 0);
    const totalExpenditure = allocations.reduce((sum, a) => sum + (Number(a.expenditureAmount) || 0), 0);
    const totalPaid = allocations.reduce((sum, a) => sum + (Number(a.paymentAmount) || 0), 0);
    const unallocatedCeiling = Math.max(0, totalCeiling - totalAllocated);

    const summary = {
      financialYear: year,
      totalCeilingMn: roundToCentInMn(totalCeiling),
      totalAllocatedMn: roundToCentInMn(totalAllocated),
      totalCommittedMn: roundToCentInMn(totalCommitted),
      totalExpenditureMn: roundToCentInMn(totalExpenditure),
      totalPaidMn: roundToCentInMn(totalPaid),
      unallocatedCeilingMn: roundToCentInMn(unallocatedCeiling),
      utilisationRate: totalAllocated > 0 ? Math.round((totalExpenditure / totalAllocated) * 100) : 0,
      commitmentRate: totalAllocated > 0 ? Math.round((totalCommitted / totalAllocated) * 100) : 0,
    };

    const isPrivileged = Boolean(security.isPlanningDivision || security.isMonitoringDivision || security.isSuperAdmin);
    const returnProposals = isPrivileged ? allProposals : userDivisionProposals;

    return NextResponse.json({
      proposals: returnProposals,
      userDivisionProposals,
      proposalSummary,
      summary,
      ceilings,
      allocations,
      revisions,
      objectCodes,
      fundingSources,
      strategicObjectives,
      programmes,
      projects,
      organizations,
      aipActivities: data.aipActivities || [],
      deadlines: (data.deadlines || []).filter((d) => !d.financialYear || d.financialYear === year),
      userContext: {
        userId: security.userId,
        username: (session.user as any)?.username,
        fullName: security.fullName,
        divisionId: security.organizationId,
        divisionName: security.organizationName,
        isPlanningDivision: security.isPlanningDivision,
        isMonitoringDivision: security.isMonitoringDivision,
        isSuperAdmin: security.isSuperAdmin,
        isLevelAdmin: security.isLevelAdmin,
        canAllocate: security.permissions.canReallocate,
        canRevise: security.permissions.canRevise,
        canApprove: security.permissions.canApprove,
      },
    });
  } catch (error: any) {
    console.error('Error fetching budget data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch budget data', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await getDb();
    const security = getUserSecurityContext(session.user, data.organizations);
    const body = await req.json();
    const { action } = body;
    const now = new Date().toISOString();

    // ── STAGE 1: BRANCH-LEVEL BUDGETARY PLANNING ─────────────────────────────
    // 1. Create Branch Activity Proposal (NO vote numbers required!)
    if (action === 'create_proposal') {
      const {
        financialYear = '2027',
        implementationYear = '2027',
        activityTitle,
        category = 'Workshop & Training',
        categoryDetail,
        expenditureNature = 'Recurrent',
        proposedExecutingAgencyType = 'Self (Branch)',
        executingAgencyName,
        isExtensionOfPreviousAip = false,
        linkedPreviousAipActivityId,
        linkedPreviousAipActivityCode,
        linkedPreviousAipActivityTitle,
        linkedOtherActivityTitle,
        description,
        purpose,
        justification,
        expectedOutputs,
        keyDeliverables,
        implementationPeriod = 'Q1',
        targetBeneficiaries,
        beneficiaryCount = 0,
        estimatedCostMn,
        noBudgetRequired = false,
        divisionId,
        divisionName,
      } = body;

      if (!activityTitle || activityTitle.trim().length < 3) {
        return NextResponse.json({ error: 'Activity Title is required (min 3 chars).' }, { status: 400 });
      }

      const isNoCost = Boolean(noBudgetRequired);
      const cost = isNoCost ? 0 : Number(estimatedCostMn);
      if (isNaN(cost) || cost < 0 || (!isNoCost && cost === 0)) {
        return NextResponse.json({ error: 'A valid positive estimated cost (in Rs. Mn) is required, or tick "No budget required" for zero-cost activities.' }, { status: 400 });
      }

      const isPlanningPrivileged = Boolean(security.isPlanningDivision || security.isSuperAdmin);
      const targetDivId = isPlanningPrivileged ? (divisionId || security.organizationId) : security.organizationId;
      const targetDivObj = data.organizations.find((o) => o.id === targetDivId);
      const targetDivName = isPlanningPrivileged
        ? (divisionName || targetDivObj?.name || security.organizationName)
        : (targetDivObj?.name || security.organizationName);

      const newProposal: BudgetProposalActivity = {
        id: `prop-${financialYear}-${randomUUID().slice(0, 8)}`,
        financialYear,
        implementationYear: implementationYear || financialYear,
        institutionId: 'org-moe',
        institutionName: 'Ministry of Education',
        divisionId: targetDivId,
        divisionName: targetDivName,
        activityTitle: activityTitle.trim(),
        category,
        categoryDetail: category === 'Other' ? (categoryDetail?.trim() || undefined) : undefined,
        expenditureNature: (expenditureNature as any) || 'Recurrent',
        proposedExecutingAgencyType: proposedExecutingAgencyType || 'Self (Branch)',
        executingAgencyName: executingAgencyName?.trim() || undefined,
        isExtensionOfPreviousAip: Boolean(isExtensionOfPreviousAip),
        linkedPreviousAipActivityId: linkedPreviousAipActivityId || undefined,
        linkedPreviousAipActivityCode: linkedPreviousAipActivityCode || undefined,
        linkedPreviousAipActivityTitle: linkedPreviousAipActivityTitle || undefined,
        linkedOtherActivityTitle: linkedOtherActivityTitle?.trim() || undefined,
        description: (description || '').trim(),
        purpose: (purpose || '').trim(),
        justification: (justification || '').trim(),
        expectedOutputs: (expectedOutputs || '').trim(),
        keyDeliverables: (keyDeliverables || '').trim(),
        implementationPeriod,
        targetBeneficiaries: (targetBeneficiaries || '').trim(),
        beneficiaryCount: Number(beneficiaryCount) || 0,
        estimatedCostMn: cost,
        noBudgetRequired: isNoCost,
        status: 'Draft',
        submittedBy: (session.user as any)?.username || security.fullName,
        isStrategicVisionAddition: false,
        governmentPriorityTheme: 'General Education Development',
        updatedAt: now,
      };

      await updateDb((dbData) => {
        if (!dbData.budgetProposalActivities) dbData.budgetProposalActivities = [];
        dbData.budgetProposalActivities.unshift(newProposal);
      });

      // Enterprise Audit Trail: Budget Proposal Created
      const bgUser = session.user as any;
      logAuditEvent({
        user: {
          id: bgUser.id,
          username: bgUser.username,
          fullName: bgUser.name || bgUser.fullName,
          organizationId: bgUser.organizationId,
          organizationName: divisionName || bgUser.organizationName || 'Operational Branch',
          roleId: bgUser.roleId,
          roleName: bgUser.roleName,
        },
        category: 'Financial',
        action: 'BUDGET_PROPOSAL_CREATED',
        entityType: 'BUDGET_PROPOSAL',
        entityId: newProposal.id,
        summary: `Created budget proposal activity "${newProposal.activityTitle}" (${formatMillion(newProposal.estimatedCostMn)} Mn) for ${divisionName || 'Branch'}.`,
        details: {
          proposalId: newProposal.id,
          title: newProposal.activityTitle,
          estimatedCostMn: newProposal.estimatedCostMn,
          category: newProposal.category,
          period: newProposal.implementationPeriod,
        },
        severity: 'Info',
      });

      return NextResponse.json({ success: true, proposal: newProposal });
    }

    // 1b. Update Existing Branch Activity Proposal
    if (action === 'update_proposal') {
      const { proposalId, updatedData } = body;
      if (!proposalId || !updatedData) {
        return NextResponse.json({ error: 'proposalId and updatedData are required.' }, { status: 400 });
      }

      let updatedRecord: BudgetProposalActivity | null = null;
      await updateDb((dbData) => {
        const prop = (dbData.budgetProposalActivities || []).find((p) => p.id === proposalId);
        if (prop) {
          if (!security.isPlanningDivision && !security.isSuperAdmin) {
            if (prop.divisionId !== security.organizationId && prop.submittedBy !== (session.user as any)?.username) {
              return;
            }
          }

          // If proposal was previously accepted by PPB, preserve previous accepted version snapshot
          const wasPreviouslyAccepted = prop.status === 'Accepted' || prop.status === 'Adjusted';
          if (wasPreviouslyAccepted && !prop.previousAcceptedVersion) {
            prop.previousAcceptedVersion = {
              activityTitle: prop.activityTitle,
              description: prop.description,
              purpose: prop.purpose,
              justification: prop.justification,
              expectedOutputs: prop.expectedOutputs,
              keyDeliverables: prop.keyDeliverables,
              category: prop.category,
              categoryDetail: prop.categoryDetail,
              expenditureNature: prop.expenditureNature,
              proposedExecutingAgencyType: prop.proposedExecutingAgencyType,
              executingAgencyName: prop.executingAgencyName,
              implementationPeriod: prop.implementationPeriod,
              targetBeneficiaries: prop.targetBeneficiaries,
              beneficiaryCount: prop.beneficiaryCount,
              estimatedCostMn: prop.estimatedCostMn,
              noBudgetRequired: prop.noBudgetRequired,
              adjustedCostMn: prop.adjustedCostMn,
              allocatedAmountMn: prop.allocatedAmountMn,
              assignedVoteNumber: prop.assignedVoteNumber,
              assignedObjectCode: prop.assignedObjectCode,
              assignedFundingSource: prop.assignedFundingSource,
              governmentPriorityTheme: prop.governmentPriorityTheme,
              planningRemarks: prop.planningRemarks,
              activityNumber: prop.activityNumber,
              assignedActivityCode: prop.assignedActivityCode,
              reviewedBy: prop.reviewedBy,
              reviewedAt: prop.reviewedAt,
              status: prop.status as 'Accepted' | 'Adjusted',
              savedAt: prop.reviewedAt || prop.updatedAt || now,
              savedBy: prop.reviewedBy || 'Policy & Planning Branch (PPB)',
            };
            prop.isEditedFromAccepted = true;
            prop.editedAfterAcceptedAt = now;
            prop.editedAfterAcceptedBy = (session.user as any)?.name || (session.user as any)?.username || security.fullName;
            prop.editedByBranchOrRole = security.isPlanningDivision ? 'Planning Branch' : (security.organizationName || 'Proposing Branch');
          }

          Object.assign(prop, updatedData, { updatedAt: now });

          // Requirement: "this was the accepted previously by planing branch, then it should be shown as the draft activity again. it should be then accepted by ppb."
          if (wasPreviouslyAccepted) {
            prop.status = 'Draft';
            prop.isEditedFromAccepted = true;
          }

          // If rejected activity is edited by branch, set back to Draft for re-submission
          if (prop.status === 'Rejected' && (!security.isPlanningDivision && !security.isSuperAdmin)) {
            prop.status = 'Draft';
          }
          updatedRecord = prop;
        }
      });

      if (!updatedRecord) {
        return NextResponse.json({ error: 'Proposal not found or unauthorized to edit.' }, { status: 403 });
      }

      return NextResponse.json({ success: true, proposal: updatedRecord });
    }

    // 1c. Reverse Edited Proposal to Previous Accepted Version
    if (action === 'reverse_proposal_version') {
      const { proposalId } = body;
      if (!proposalId) {
        return NextResponse.json({ error: 'proposalId is required.' }, { status: 400 });
      }

      let restoredRecord: BudgetProposalActivity | null = null;
      await updateDb((dbData) => {
        const prop = (dbData.budgetProposalActivities || []).find((p) => p.id === proposalId);
        if (prop) {
          if (!security.isPlanningDivision && !security.isSuperAdmin) {
            if (prop.divisionId !== security.organizationId && prop.submittedBy !== (session.user as any)?.username) {
              return;
            }
          }

          if (prop.previousAcceptedVersion) {
            const prev = prop.previousAcceptedVersion;
            prop.activityTitle = prev.activityTitle;
            prop.description = prev.description;
            if (prev.purpose !== undefined) prop.purpose = prev.purpose;
            prop.justification = prev.justification;
            prop.expectedOutputs = prev.expectedOutputs;
            if (prev.keyDeliverables !== undefined) prop.keyDeliverables = prev.keyDeliverables;
            prop.category = prev.category;
            prop.categoryDetail = prev.categoryDetail;
            prop.expenditureNature = prev.expenditureNature;
            prop.proposedExecutingAgencyType = prev.proposedExecutingAgencyType;
            prop.executingAgencyName = prev.executingAgencyName;
            prop.implementationPeriod = prev.implementationPeriod;
            prop.targetBeneficiaries = prev.targetBeneficiaries;
            prop.beneficiaryCount = prev.beneficiaryCount;
            prop.estimatedCostMn = prev.estimatedCostMn;
            prop.noBudgetRequired = prev.noBudgetRequired;
            prop.adjustedCostMn = prev.adjustedCostMn;
            prop.allocatedAmountMn = prev.allocatedAmountMn;
            prop.assignedVoteNumber = prev.assignedVoteNumber;
            prop.assignedObjectCode = prev.assignedObjectCode;
            prop.assignedFundingSource = prev.assignedFundingSource;
            prop.governmentPriorityTheme = prev.governmentPriorityTheme;
            prop.planningRemarks = prev.planningRemarks;
            prop.activityNumber = prev.activityNumber;
            prop.assignedActivityCode = prev.assignedActivityCode;
            prop.reviewedBy = prev.reviewedBy;
            prop.reviewedAt = prev.reviewedAt;
            prop.status = prev.status || 'Accepted';

            prop.isEditedFromAccepted = false;
            prop.previousAcceptedVersion = undefined;
            prop.updatedAt = now;
            restoredRecord = prop;
          }
        }
      });

      if (!restoredRecord) {
        return NextResponse.json(
          { error: 'No previous accepted version found to reverse to, or unauthorized.' },
          { status: 400 }
        );
      }

      return NextResponse.json({ success: true, proposal: restoredRecord });
    }

    // 2. Submit Branch Budgetary Plan to Planning Division
    if (action === 'submit_branch_plan') {
      const { divisionId, financialYear = '2027' } = body;
      const isPlanningPrivileged = Boolean(security.isPlanningDivision || security.isSuperAdmin);
      const targetDivId = isPlanningPrivileged ? (divisionId || security.organizationId) : security.organizationId;

      // ── Enforce Submission Deadline Announced by Policy Planning Branch (PPB) ──
      const initialDb = await getDb();
      const ppbDeadline = (initialDb.deadlines || []).find(
        (d) =>
          d.financialYear === String(financialYear) &&
          (d.id.includes('budget') || d.category === 'Budget Request') &&
          d.status !== 'Closed'
      );

      if (ppbDeadline) {
        const deadlineDate = new Date(ppbDeadline.dueDate + 'T23:59:59');
        if (new Date() > deadlineDate) {
          return NextResponse.json(
            {
              error: `Submission rejected: The deadline announced by Policy Planning Branch (PPB) expired on ${ppbDeadline.dueDate}. Submissions for FY ${financialYear} are officially closed.`,
              deadlineExpired: true,
              dueDate: ppbDeadline.dueDate,
            },
            { status: 403 }
          );
        }
      }

      let submittedCount = 0;
      let totalAmount = 0;

      await updateDb((dbData) => {
        if (!dbData.budgetProposalActivities) dbData.budgetProposalActivities = [];
        dbData.budgetProposalActivities.forEach((p) => {
          if (p.divisionId === targetDivId && (!p.financialYear || p.financialYear === financialYear) && p.status === 'Draft') {
            p.status = 'Submitted';
            p.submittedAt = now;
            p.submittedBy = (session.user as any)?.username || security.fullName;
            p.updatedAt = now;
            submittedCount++;
            totalAmount += Number(p.estimatedCostMn) || 0;
          }
        });

        // Notify Planning Division
        if (submittedCount > 0) {
          if (!dbData.notifications) dbData.notifications = [];
          dbData.notifications.push({
            id: `notif-plan-${randomUUID()}`,
            recipientOrgId: 'org-moe-planning',
            workshopId: 'budget-submission',
            title: `📥 Budgetary Plan Submitted: ${security.organizationName}`,
            message: `${security.fullName} submitted ${submittedCount} activity proposals totaling Rs. ${formatMillion(totalAmount)} Mn (${formatRupees(totalAmount, true)}) for FY ${financialYear} appraisal.`,
            isRead: false,
            createdAt: now,
          });
        }
      });

      // Enterprise Audit Trail: Budgetary Plan Submitted
      const bgUser = session.user as any;
      logAuditEvent({
        user: {
          id: bgUser.id,
          username: bgUser.username,
          fullName: bgUser.name || bgUser.fullName,
          organizationId: targetDivId,
          organizationName: security.organizationName || 'Branch',
          roleId: bgUser.roleId,
          roleName: bgUser.roleName,
        },
        category: 'Financial',
        action: 'BUDGET_PLAN_SUBMITTED',
        entityType: 'BUDGET_PROPOSAL',
        entityId: targetDivId,
        summary: `Submitted branch budgetary plan for ${security.organizationName}: ${submittedCount} activities (Rs. ${formatMillion(totalAmount)} Mn) for FY ${financialYear}.`,
        details: {
          divisionId: targetDivId,
          submittedCount,
          totalAmountMn: totalAmount,
          financialYear,
        },
        severity: 'Info',
      });

      return NextResponse.json({
        success: true,
        submittedCount,
        totalAmount: roundToCentInMn(totalAmount),
        message: `Successfully submitted ${submittedCount} activity proposals to the Planning Division.`,
      });
    }

    // ── STAGE 2: PLANNING DIVISION BUDGET FORMULATION & VISION ────────────────
    // 3. Add Top-Down Government Vision Strategic Initiative
    if (action === 'add_vision_initiative') {
      if (!security.isPlanningDivision && !security.isSuperAdmin) {
        return NextResponse.json(
          { error: 'Permission denied: Only Planning Division officers can introduce Government Vision initiatives.' },
          { status: 403 }
        );
      }

      const {
        financialYear = '2027',
        activityTitle,
        category = 'Infrastructure & ICT',
        description,
        justification,
        expectedOutputs,
        implementationPeriod = 'Annual',
        targetBeneficiaries,
        beneficiaryCount = 0,
        estimatedCostMn,
        governmentPriorityTheme = 'National Education Priorities',
        assignedVoteNumber,
        assignedObjectCode,
        assignedFundingSource = 'Treasury Consolidated Fund',
        includedInBudgetSpeech = true,
        budgetSpeechSummary,
      } = body;

      if (!activityTitle || activityTitle.trim().length < 3) {
        return NextResponse.json({ error: 'Strategic Initiative Title is required.' }, { status: 400 });
      }

      const cost = Number(estimatedCostMn);
      if (isNaN(cost) || cost <= 0) {
        return NextResponse.json({ error: 'Valid estimated financial requirement is required.' }, { status: 400 });
      }

      const newVisionProposal: BudgetProposalActivity = {
        id: `prop-vision-${financialYear}-${randomUUID().slice(0, 8)}`,
        financialYear,
        institutionId: 'org-moe',
        institutionName: 'Ministry of Education',
        divisionId: body.targetBranchId || body.divisionId || 'org-moe-planning',
        divisionName: body.targetBranchName || body.divisionName || 'Policy Planning & Performance Review Division',
        activityTitle: activityTitle.trim(),
        category,
        description: (description || '').trim(),
        justification: (justification || 'National Policy Directive & Cabinet Priority Mandate').trim(),
        expectedOutputs: (expectedOutputs || '').trim(),
        implementationPeriod,
        targetBeneficiaries: (targetBeneficiaries || '').trim(),
        beneficiaryCount: Number(beneficiaryCount) || 0,
        estimatedCostMn: cost,
        status: 'Accepted',
        submittedBy: (session.user as any)?.username || security.fullName,
        submittedAt: now,
        isStrategicVisionAddition: true,
        governmentPriorityTheme,
        assignedVoteNumber: assignedVoteNumber || undefined,
        assignedObjectCode: assignedObjectCode || undefined,
        assignedFundingSource,
        adjustedCostMn: cost,
        planningRemarks: 'Initiated directly under Government Vision and National Policy Framework.',
        includedInBudgetSpeech: Boolean(includedInBudgetSpeech),
        budgetSpeechSummary: budgetSpeechSummary || activityTitle.trim(),
        reviewedBy: security.fullName,
        reviewedAt: now,
        updatedAt: now,
      };

      await updateDb((dbData) => {
        if (!dbData.budgetProposalActivities) dbData.budgetProposalActivities = [];
        dbData.budgetProposalActivities.unshift(newVisionProposal);
      });

      return NextResponse.json({ success: true, proposal: newVisionProposal });
    }

    // 4. Review & Prioritize Branch Proposal (Planning Division)
    if (action === 'review_proposal') {
      if (!security.isPlanningDivision && !security.isSuperAdmin) {
        return NextResponse.json({ error: 'Only Planning Division officers can review budget proposals.' }, { status: 403 });
      }

      const {
        proposalId,
        status, // 'Accepted' | 'Adjusted' | 'Rejected' | 'Under Review' | 'Deferred' | 'Duplicate'
        adjustedCostMn,
        governmentPriorityTheme,
        planningRemarks,
        rejectionReasonCategory,
        rejectionRemarks,
      } = body;

      if (!proposalId) {
        return NextResponse.json({ error: 'proposalId is required.' }, { status: 400 });
      }

      let updatedRecord: BudgetProposalActivity | null = null;

      await updateDb((dbData) => {
        const prop = (dbData.budgetProposalActivities || []).find((p) => p.id === proposalId);
        if (prop) {
          if (status) prop.status = status;
          if (adjustedCostMn !== undefined && !isNaN(Number(adjustedCostMn))) {
            prop.adjustedCostMn = Number(adjustedCostMn);
            prop.allocatedAmountMn = Number(adjustedCostMn);
          }
          if (governmentPriorityTheme) prop.governmentPriorityTheme = governmentPriorityTheme;
          if (planningRemarks !== undefined) prop.planningRemarks = planningRemarks.trim();

          // PPB can modify the activity details as per Government / Ministry priorities
          if (body.activityTitle !== undefined && body.activityTitle.trim()) {
            prop.activityTitle = body.activityTitle.trim();
          }
          if (body.purpose !== undefined) prop.purpose = body.purpose.trim();
          if (body.justification !== undefined) prop.justification = body.justification.trim();
          if (body.expectedOutputs !== undefined) prop.expectedOutputs = body.expectedOutputs.trim();
          if (body.keyDeliverables !== undefined) prop.keyDeliverables = body.keyDeliverables.trim();
          if (body.ppbModificationsNote !== undefined) prop.ppbModificationsNote = body.ppbModificationsNote.trim();
          if (body.assignedVoteNumber !== undefined) prop.assignedVoteNumber = body.assignedVoteNumber.trim();
          if (body.assignedObjectCode !== undefined) prop.assignedObjectCode = body.assignedObjectCode.trim();
          if (body.assignedFundingSource !== undefined) prop.assignedFundingSource = body.assignedFundingSource.trim();

          if (status === 'Rejected') {
            prop.rejectionReasonCategory = rejectionReasonCategory || 'Conceptual / Methodological issue';
            prop.rejectionRemarks = (rejectionRemarks || planningRemarks || 'Activity proposal rejected during Stage 2 review.').trim();
            prop.rejectedBy = security.fullName;
            prop.rejectedAt = now;
          } else if (status === 'Accepted' || status === 'Adjusted') {
            prop.rejectionReasonCategory = undefined;
            prop.rejectionRemarks = undefined;
            prop.rejectedBy = undefined;
            prop.rejectedAt = undefined;
            prop.isEditedFromAccepted = false;
            prop.previousAcceptedVersion = undefined;

            // Automatically assign Activity Number (usually starting from 1 for that branch & year)
            if (body.activityNumber !== undefined && Number(body.activityNumber) > 0) {
              prop.activityNumber = Number(body.activityNumber);
            } else if (!prop.activityNumber) {
              const branchProps = (dbData.budgetProposalActivities || []).filter(
                (p) => p.divisionId === prop.divisionId && p.financialYear === prop.financialYear && p.id !== prop.id && typeof p.activityNumber === 'number'
              );
              const maxNum = branchProps.reduce((max, p) => Math.max(max, p.activityNumber || 0), 0);
              prop.activityNumber = maxNum + 1;
            }
            prop.assignedActivityCode = `ACT-${String(prop.activityNumber).padStart(2, '0')}`;
          }

          prop.reviewedBy = security.fullName;
          prop.reviewedAt = now;
          prop.updatedAt = now;
          updatedRecord = prop;
        }
      });

      if (!updatedRecord) {
        return NextResponse.json({ error: 'Proposal not found.' }, { status: 404 });
      }

      return NextResponse.json({ success: true, proposal: updatedRecord });
    }

    // 5. Assign Budget Classifications & Budget Speech Highlights (Planning Division)
    if (action === 'assign_classifications') {
      if (!security.isPlanningDivision && !security.isSuperAdmin) {
        return NextResponse.json({ error: 'Only Planning Division can assign budget classifications.' }, { status: 403 });
      }

      const {
        proposalId,
        assignedVoteNumber,
        assignedObjectCode,
        assignedFundingSource,
        includedInBudgetSpeech,
        budgetSpeechSummary,
      } = body;

      let updatedRecord: BudgetProposalActivity | null = null;

      await updateDb((dbData) => {
        const prop = (dbData.budgetProposalActivities || []).find((p) => p.id === proposalId);
        if (prop) {
          if (assignedVoteNumber !== undefined) prop.assignedVoteNumber = assignedVoteNumber.trim();
          if (assignedObjectCode !== undefined) prop.assignedObjectCode = assignedObjectCode.trim();
          if (assignedFundingSource !== undefined) prop.assignedFundingSource = assignedFundingSource.trim();
          if (includedInBudgetSpeech !== undefined) prop.includedInBudgetSpeech = Boolean(includedInBudgetSpeech);
          if (budgetSpeechSummary !== undefined) prop.budgetSpeechSummary = budgetSpeechSummary.trim();
          if (body.activityNumber !== undefined && Number(body.activityNumber) > 0) {
            prop.activityNumber = Number(body.activityNumber);
            prop.assignedActivityCode = `ACT-${String(prop.activityNumber).padStart(2, '0')}`;
          }
          if (body.allocatedAmountMn !== undefined && !isNaN(Number(body.allocatedAmountMn))) {
            prop.allocatedAmountMn = Number(body.allocatedAmountMn);
            prop.adjustedCostMn = Number(body.allocatedAmountMn);
          }
          prop.updatedAt = now;
          updatedRecord = prop;
        }
      });

      if (!updatedRecord) {
        return NextResponse.json({ error: 'Proposal not found.' }, { status: 404 });
      }

      return NextResponse.json({ success: true, proposal: updatedRecord });
    }

    // ── LEGACY ACTIONS: 5-Stage Financial Control & Revisions ─────────────────
    if (action === 'create_allocation') {
      if (!security.permissions.canReallocate && !security.isSuperAdmin && !security.isPlanningDivision) {
        return NextResponse.json(
          { error: 'Permission denied: Only Planning Division officers can allocate budgets.' },
          { status: 403 }
        );
      }

      const {
        financialYear = '2027',
        institutionId = 'org-moe',
        institutionName = 'Ministry of Education',
        divisionId,
        divisionName,
        aipActivityId,
        activityName,
        objectCode = '1101',
        fundingSource = 'Treasury',
        allocationAmount,
      } = body;

      const amount = Number(allocationAmount);
      if (isNaN(amount) || amount <= 0) {
        return NextResponse.json({ error: 'Valid positive allocation amount is required.' }, { status: 400 });
      }

      const ceiling = (data.budgetCeilings || []).find(
        (c) => c.institutionId === institutionId && c.financialYear === financialYear
      );

      const obj = (data.expenditureObjectCodes || []).find((o) => o.code === objectCode);

      const allocId = `alloc-${randomUUID()}`;
      const newAlloc: BudgetAllocation = {
        id: allocId,
        financialYear,
        institutionId,
        institutionName,
        divisionId: divisionId || security.organizationId,
        divisionName: divisionName || security.organizationName,
        aipActivityId,
        activityName: activityName || 'Strategic Activity',
        objectCode,
        objectCodeName: obj?.name || 'Recurrent Expenditure',
        fundingSource,
        approvedBudget: amount,
        allocationAmount: amount,
        commitmentAmount: 0,
        expenditureAmount: 0,
        paymentAmount: 0,
        balanceAmount: amount,
        status: 'Approved',
        version: 1,
        allocatedBy: security.fullName,
        approvedBy: security.fullName,
        updatedAt: now,
      };

      await updateDb((dbData) => {
        if (!dbData.budgetAllocations) dbData.budgetAllocations = [];
        dbData.budgetAllocations.unshift(newAlloc);

        if (ceiling && dbData.budgetCeilings) {
          const c = dbData.budgetCeilings.find((item) => item.id === ceiling.id);
          if (c) {
            c.allocatedAmount = roundToCentInMn(c.allocatedAmount + amount);
            c.remainingBalance = roundToCentInMn(c.totalCeiling - c.allocatedAmount);
          }
        }
      });

      // Enterprise Audit Trail: Budget Allocation Created
      const bgUser = session.user as any;
      logAuditEvent({
        user: {
          id: bgUser.id,
          username: bgUser.username,
          fullName: bgUser.name || bgUser.fullName,
          organizationId: newAlloc.divisionId,
          organizationName: newAlloc.divisionName || security.organizationName || 'Line Ministry Branch',
          roleId: bgUser.roleId,
          roleName: bgUser.roleName,
        },
        category: 'Financial',
        action: 'BUDGET_ALLOCATION_CREATED',
        entityType: 'BUDGET_ALLOCATION',
        entityId: newAlloc.id,
        summary: `Created budget allocation of Rs. ${formatMillion(newAlloc.allocationAmount)} Mn (${formatRupees(newAlloc.allocationAmount, true)}) for ${newAlloc.divisionName} under Object Code ${newAlloc.objectCode}.`,
        details: {
          allocationId: newAlloc.id,
          divisionId: newAlloc.divisionId,
          divisionName: newAlloc.divisionName,
          amountMn: newAlloc.allocationAmount,
          objectCode: newAlloc.objectCode,
          fundingSource: newAlloc.fundingSource,
        },
        severity: 'Info',
      });

      return NextResponse.json({ success: true, allocation: newAlloc });
    }

    if (action === 'request_revision') {
      const { allocationId, revisedAmount, reason } = body;

      const alloc = (data.budgetAllocations || []).find((a) => a.id === allocationId);
      if (!alloc) {
        return NextResponse.json({ error: 'Target allocation record not found' }, { status: 404 });
      }

      const newAmt = Number(revisedAmount);
      if (isNaN(newAmt) || newAmt < 0) {
        return NextResponse.json({ error: 'Valid revised amount is required.' }, { status: 400 });
      }

      if (!reason || reason.trim().length < 5) {
        return NextResponse.json({ error: 'Justification reason is mandatory (minimum 5 chars).' }, { status: 400 });
      }

      const diff = roundToCentInMn(newAmt - alloc.allocationAmount);
      const revNumber = ((data.budgetRevisions || []).filter((r) => r.allocationId === allocationId).length) + 1;

      const revId = `rev-${randomUUID()}`;
      const newRev: BudgetRevision = {
        id: revId,
        allocationId,
        revisionNumber: revNumber,
        financialYear: alloc.financialYear,
        institutionName: alloc.institutionName,
        divisionName: alloc.divisionName,
        activityName: alloc.activityName || 'Activity',
        objectCode: alloc.objectCode,
        previousAmount: alloc.allocationAmount,
        revisedAmount: newAmt,
        changeDifference: diff,
        reason: reason.trim(),
        requestedBy: security.fullName,
        requestedAt: now,
        status: security.isSuperAdmin ? 'Approved' : 'Pending',
        reviewedBy: security.isPlanningDivision ? security.fullName : undefined,
        approvedBy: security.isSuperAdmin ? security.fullName : undefined,
        approvedAt: security.isSuperAdmin ? now : undefined,
      };

      await updateDb((dbData) => {
        if (!dbData.budgetRevisions) dbData.budgetRevisions = [];
        dbData.budgetRevisions.unshift(newRev);

        if (security.isSuperAdmin && dbData.budgetAllocations) {
          const targetAlloc = dbData.budgetAllocations.find((a) => a.id === allocationId);
          if (targetAlloc) {
            targetAlloc.allocationAmount = newAmt;
            targetAlloc.balanceAmount = roundToCentInMn(newAmt - targetAlloc.expenditureAmount);
            targetAlloc.version += 1;
            targetAlloc.status = 'Revised';
            targetAlloc.updatedAt = now;
          }
        }
      });

      // Enterprise Audit Trail: Budget Revision Requested
      const bgUser = session.user as any;
      logAuditEvent({
        user: {
          id: bgUser.id,
          username: bgUser.username,
          fullName: bgUser.name || bgUser.fullName,
          organizationId: alloc.divisionId,
          organizationName: alloc.divisionName || security.organizationName || 'Line Ministry Branch',
          roleId: bgUser.roleId,
          roleName: bgUser.roleName,
        },
        category: 'Financial',
        action: 'BUDGET_REVISION_REQUESTED',
        entityType: 'BUDGET_ALLOCATION',
        entityId: newRev.id,
        summary: `Requested budget revision from Rs. ${formatMillion(newRev.previousAmount)} Mn to Rs. ${formatMillion(newRev.revisedAmount)} Mn for ${alloc.divisionName}. Reason: "${reason}".`,
        details: {
          revisionId: newRev.id,
          allocationId: newRev.allocationId,
          previousAmountMn: newRev.previousAmount,
          revisedAmountMn: newRev.revisedAmount,
          reason,
        },
        severity: 'Warning',
      });

      return NextResponse.json({ success: true, revision: newRev });
    }

    return NextResponse.json({ error: 'Invalid action specified' }, { status: 400 });
  } catch (error: any) {
    console.error('Error in budget POST:', error);
    return NextResponse.json(
      { error: 'Failed to process budget request', details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await getDb();
    const security = getUserSecurityContext(session.user, data.organizations);
    const body = await req.json();
    const { revisionId, decision, notes, proposalId, updatedProposal } = body;
    const now = new Date().toISOString();

    // Edit Proposal
    if (proposalId && updatedProposal) {
      let updated: BudgetProposalActivity | null = null;
      await updateDb((dbData) => {
        const p = (dbData.budgetProposalActivities || []).find((item) => item.id === proposalId);
        if (p) {
          // If not planning division, user can only edit their own draft
          if (!security.isPlanningDivision && !security.isSuperAdmin) {
            if (p.divisionId !== security.organizationId && p.submittedBy !== (session.user as any)?.username) {
              return;
            }
            if (p.status !== 'Draft') {
              return;
            }
          }
          Object.assign(p, updatedProposal, { updatedAt: now });
          updated = p;
        }
      });

      if (!updated) {
        return NextResponse.json({ error: 'Proposal not found or unauthorized to edit.' }, { status: 403 });
      }
      return NextResponse.json({ success: true, proposal: updated });
    }

    // Revision Decision (Approved / Rejected)
    if (revisionId && decision) {
      if (!security.permissions.canApprove && !security.isSuperAdmin) {
        return NextResponse.json(
          { error: 'Permission denied: Only Authorised Approving Officers or Planning Heads can approve budget revisions.' },
          { status: 403 }
        );
      }

      await updateDb((dbData) => {
        const rev = (dbData.budgetRevisions || []).find((r) => r.id === revisionId);
        if (rev) {
          rev.status = decision === 'Approved' ? 'Approved' : 'Rejected';
          rev.approvedBy = security.fullName;
          rev.approvedAt = now;
          rev.notes = notes;

          if (decision === 'Approved' && dbData.budgetAllocations) {
            const alloc = dbData.budgetAllocations.find((a) => a.id === rev.allocationId);
            if (alloc) {
              alloc.allocationAmount = rev.revisedAmount;
              alloc.balanceAmount = roundToCentInMn(rev.revisedAmount - alloc.expenditureAmount);
              alloc.version += 1;
              alloc.status = 'Revised';
              alloc.updatedAt = now;
            }
          }
        }
      });

      // Enterprise Audit Trail: Budget Revision Decision (Approved / Rejected)
      const bgUser = session.user as any;
      logAuditEvent({
        user: {
          id: bgUser.id,
          username: bgUser.username,
          fullName: bgUser.name || bgUser.fullName,
          organizationId: bgUser.organizationId,
          organizationName: bgUser.organizationName || security.organizationName || 'Planning Branch',
          roleId: bgUser.roleId,
          roleName: bgUser.roleName,
        },
        category: 'Financial',
        action: `BUDGET_REVISION_${decision.toUpperCase()}`,
        entityType: 'BUDGET_ALLOCATION',
        entityId: revisionId,
        summary: `Planning Directorate ${decision} budget revision request ${revisionId}${notes ? `: "${notes}"` : ''}.`,
        details: {
          revisionId,
          decision,
          notes,
          reviewedBy: security.fullName,
        },
        severity: decision === 'Approved' ? 'Warning' : 'Info',
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  } catch (error: any) {
    console.error('Error in budget PUT:', error);
    return NextResponse.json(
      { error: 'Failed to update budget record', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await getDb();
    const security = getUserSecurityContext(session.user, data.organizations);
    const { searchParams } = new URL(req.url);
    const proposalId = searchParams.get('proposalId');

    if (!proposalId) {
      return NextResponse.json({ error: 'proposalId is required.' }, { status: 400 });
    }

    let deleted = false;
    await updateDb((dbData) => {
      const idx = (dbData.budgetProposalActivities || []).findIndex((p) => p.id === proposalId);
      if (idx !== -1) {
        const prop = dbData.budgetProposalActivities[idx];
        if (!security.isPlanningDivision && !security.isSuperAdmin) {
          if (prop.divisionId !== security.organizationId || (prop.status !== 'Draft' && prop.status !== 'Rejected')) {
            return;
          }
        }
        dbData.budgetProposalActivities.splice(idx, 1);
        deleted = true;
      }
    });

    if (!deleted) {
      return NextResponse.json({ error: 'Proposal cannot be deleted or permission denied.' }, { status: 403 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in budget DELETE:', error);
    return NextResponse.json(
      { error: 'Failed to delete proposal', details: error.message },
      { status: 500 }
    );
  }
}
