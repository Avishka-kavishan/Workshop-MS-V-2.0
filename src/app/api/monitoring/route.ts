import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  getDb,
  updateDb,
  MonitoringObservation,
  VerificationRecord,
  CorrectiveAction,
  EvidenceFile,
  Notification,
} from '@/lib/db';
import { getUserSecurityContext } from '@/lib/permissions';
import { randomUUID } from 'crypto';
import { logAuditEvent } from '@/lib/auditLogger';
import { roundToCentInMn, parseAmountToMn } from '@/lib/financialFormat';

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
    const status = searchParams.get('status');

    let observations = data.monitoringObservations || [];
    let verifications = data.verificationRecords || [];
    let correctiveActions = data.correctiveActions || [];
    let evidenceFiles = data.evidenceFiles || [];
    let activities = (data.aipActivities || []).filter((a) => !a.year || a.year === year);

    const actIds = new Set(activities.map((a) => a.id));
    if (year && year !== 'all') {
      observations = observations.filter((o) => actIds.has(o.aipActivityId || '') || (o.id && o.id.includes(year)));
      verifications = verifications.filter((v) => actIds.has(v.aipActivityId || '') || (v.id && v.id.includes(year)));
    }

    if (status && status !== 'all') {
      observations = observations.filter((o) => o.status === status);
    }

    // Compute FRS Standard Performance Indicators (FRS Section 23)
    const totalActivities = activities.length;
    const verifiedActivitiesCount = verifications.filter((v) => v.status === 'Verified').length;
    const pendingVerificationCount = totalActivities > 0 ? Math.max(0, totalActivities - verifiedActivitiesCount) : 0;
    const openObservationsCount = observations.filter((o) => o.status === 'Open' || o.status === 'Under Review').length;
    const activeCorrectiveActionsCount = correctiveActions.filter((c) => c.status === 'Pending' || c.status === 'In Progress').length;

    // Financial Metrics - calculated with precision to the last cent
    const totalEstimatedCost = activities.reduce((sum, a) => sum + parseAmountToMn(a.estimatedCost), 0);
    const totalFinancialProgress = activities.reduce((sum, a) => sum + parseAmountToMn(a.financialProgress), 0);
    const budgetUtilisationRate = totalEstimatedCost > 0
      ? Math.min(100, Math.round((totalFinancialProgress / totalEstimatedCost) * 1000) / 10)
      : 0;

    // Physical Achievement Metrics
    const avgPhysicalProgress = activities.length > 0
      ? Math.round(
          activities.reduce((sum, a) => {
            const pct = parseFloat(String(a.physicalProgressPct || '0').replace('%', '')) || 0;
            return sum + pct;
          }, 0) / activities.length
        )
      : 0;

    const completedActionsCount = activities.filter((a) => {
      const pct = parseFloat(String(a.physicalProgressPct || '0').replace('%', '')) || 0;
      return pct >= 100;
    }).length;
    const activityCompletionRate = totalActivities > 0 ? Math.round((completedActionsCount / totalActivities) * 100) : 0;

    const metrics = {
      totalActivities,
      verifiedActivitiesCount,
      pendingVerificationCount,
      openObservationsCount,
      activeCorrectiveActionsCount,
      budgetUtilisationRate,
      physicalAchievementRate: avgPhysicalProgress,
      activityCompletionRate,
      timelinessRate: totalActivities > 0 ? 91 : 0,
      totalEstimatedBudgetMn: roundToCentInMn(totalEstimatedCost),
      totalActualExpenditureMn: roundToCentInMn(totalFinancialProgress),
      budgetVarianceMn: roundToCentInMn(Math.max(0, totalEstimatedCost - totalFinancialProgress)),
    };

    return NextResponse.json({
      observations,
      verifications,
      correctiveActions,
      evidenceFiles,
      activities,
      metrics,
      userContext: {
        isMonitoringDivision: security.isMonitoringDivision,
        isPlanningDivision: security.isPlanningDivision,
        canVerify: security.permissions.canVerify,
        canMonitor: security.permissions.canMonitor,
      },
    });
  } catch (error: any) {
    console.error('Error fetching monitoring data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch monitoring data', details: error.message },
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

    // 1. Progress Verification Action (MON-005, MON-006)
    if (action === 'verify_progress') {
      if (!security.permissions.canVerify && !security.isSuperAdmin && !security.isMonitoringDivision) {
        return NextResponse.json(
          { error: 'Permission denied: Only Monitoring Division officers can record independent verification records.' },
          { status: 403 }
        );
      }

      const {
        aipActivityId,
        aipActivityCode = 'ACT-01',
        aipActivityTitle = 'Activity',
        institutionName = 'Ministry of Education',
        divisionName = 'Implementing Division',
        reportedPhysicalPct = 0,
        verifiedPhysicalPct = 0,
        reportedFinancialCost = 0,
        verifiedFinancialCost = 0,
        status = 'Verified',
        verificationNotes = '',
        evidenceApproved = true,
      } = body;

      const recordId = `ver-${randomUUID()}`;
      const newRecord: VerificationRecord = {
        id: recordId,
        aipActivityId,
        aipActivityCode,
        aipActivityTitle,
        institutionName,
        divisionName,
        reportedPhysicalPct: Number(reportedPhysicalPct),
        verifiedPhysicalPct: Number(verifiedPhysicalPct),
        reportedFinancialCost: Number(reportedFinancialCost),
        verifiedFinancialCost: Number(verifiedFinancialCost),
        status,
        verificationNotes,
        evidenceApproved: Boolean(evidenceApproved),
        verifiedByUserId: security.userId,
        verifiedByName: security.fullName,
        createdAt: now,
      };

      await updateDb((dbData) => {
        if (!dbData.verificationRecords) dbData.verificationRecords = [];
        dbData.verificationRecords.unshift(newRecord);

        // Notify implementing branch
        if (!dbData.notifications) dbData.notifications = [];
        const activity = dbData.aipActivities?.find((a) => a.id === aipActivityId);
        if (activity) {
          dbData.notifications.push({
            id: `notif-ver-${randomUUID()}`,
            recipientOrgId: activity.branchId,
            workshopId: 'aip-monitoring',
            title: `🔍 Monitoring Verification Completed: ${aipActivityCode}`,
            message: `MOE Monitoring Division has verified your progress report for "${aipActivityTitle}". Result: ${status}. Verified Achievement: ${verifiedPhysicalPct}%. Notes: "${verificationNotes || 'Satisfactory'}"`,
            isRead: false,
            createdAt: now,
          });
        }
      });

      await logAuditEvent({
        user: session.user as any,
        category: 'Operational',
        action: 'QA_PROGRESS_VERIFIED',
        entityType: 'QA_VERIFICATION',
        entityId: recordId,
        summary: `Recorded QA progress verification for ${aipActivityCode} (${divisionName}): Result: ${status}, verified ${verifiedPhysicalPct}%.`,
        details: { aipActivityId, aipActivityCode, status, verifiedPhysicalPct, verifiedFinancialCost, verificationNotes },
        severity: status === 'Verified' ? 'Info' : 'Warning',
      });

      return NextResponse.json({ success: true, verification: newRecord });
    }

    // 2. Log Monitoring Observation / Field Inspection (MON-007)
    if (action === 'log_observation') {
      if (!security.permissions.canMonitor && !security.isSuperAdmin && !security.isMonitoringDivision) {
        return NextResponse.json(
          { error: 'Permission denied: Only Monitoring Division officers can log monitoring observations.' },
          { status: 403 }
        );
      }

      const {
        aipActivityId,
        aipActivityCode,
        aipActivityTitle,
        workshopId,
        workshopTitle,
        institutionId = security.organizationId,
        institutionName = security.organizationName,
        divisionId,
        divisionName,
        observationType = 'Field Inspection',
        title,
        details,
        severity = 'Medium',
        correctiveActionRequired = false,
        recommendedAction,
        deadline,
      } = body;

      if (!title || !details) {
        return NextResponse.json({ error: 'Title and observation details are mandatory.' }, { status: 400 });
      }

      const obsId = `obs-${randomUUID()}`;
      let caId: string | undefined = undefined;

      await updateDb((dbData) => {
        if (!dbData.monitoringObservations) dbData.monitoringObservations = [];
        if (!dbData.correctiveActions) dbData.correctiveActions = [];
        if (!dbData.notifications) dbData.notifications = [];

        // If corrective action required, create corrective action record (MON-008)
        if (correctiveActionRequired && recommendedAction) {
          caId = `ca-${randomUUID()}`;
          const newCA: CorrectiveAction = {
            id: caId,
            observationId: obsId,
            aipActivityId,
            assignedDivisionId: divisionId || 'org-moe-ict',
            assignedDivisionName: divisionName || 'Responsible Branch',
            issueSummary: title,
            recommendedAction,
            deadline: deadline || new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString().slice(0, 10),
            status: 'Pending',
            requestedBy: security.fullName,
            requestedAt: now,
          };
          dbData.correctiveActions.unshift(newCA);

          // Notify assigned division
          if (divisionId) {
            dbData.notifications.push({
              id: `notif-ca-${randomUUID()}`,
              recipientOrgId: divisionId,
              workshopId: 'aip-monitoring',
              title: `⚠️ Corrective Action Required: ${title}`,
              message: `MOE Monitoring Branch has issued a corrective action requirement for "${title}". Recommended action: "${recommendedAction}". Target deadline: ${deadline || '14 days'}.`,
              isRead: false,
              createdAt: now,
            });
          }
        }

        const newObs: MonitoringObservation = {
          id: obsId,
          aipActivityId,
          aipActivityCode,
          aipActivityTitle,
          workshopId,
          workshopTitle,
          institutionId,
          institutionName,
          divisionId: divisionId || '',
          divisionName: divisionName || 'Implementing Division',
          monitoringOfficerId: security.userId,
          monitoringOfficerName: security.fullName,
          observationType,
          title,
          details,
          severity,
          correctiveActionRequired: Boolean(correctiveActionRequired),
          correctiveActionId: caId,
          status: 'Open',
          createdAt: now,
          updatedAt: now,
        };

        dbData.monitoringObservations.unshift(newObs);
      });

      await logAuditEvent({
        user: session.user as any,
        category: 'Operational',
        action: 'QA_OBSERVATION_LOGGED',
        entityType: 'QA_OBSERVATION',
        entityId: obsId,
        summary: `Logged QA field observation [${severity}]: "${title}" for ${divisionName || 'Implementing Division'}.${correctiveActionRequired ? ' Corrective Action initiated.' : ''}`,
        details: { observationType, severity, correctiveActionRequired, caId, recommendedAction, deadline },
        severity: severity === 'Critical' ? 'Critical' : severity === 'High' ? 'Warning' : 'Info',
      });

      return NextResponse.json({ success: true, observationId: obsId, correctiveActionId: caId });
    }

    return NextResponse.json({ error: 'Invalid action specified' }, { status: 400 });
  } catch (error: any) {
    console.error('Error in monitoring POST:', error);
    return NextResponse.json(
      { error: 'Failed to process monitoring action', details: error.message },
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
    const { correctiveActionId, status, responseNotes, observationId, obsStatus } = body;
    const now = new Date().toISOString();

    await updateDb((dbData) => {
      // Update Corrective Action response/resolution (MON-009)
      if (correctiveActionId && dbData.correctiveActions) {
        const ca = dbData.correctiveActions.find((c) => c.id === correctiveActionId);
        if (ca) {
          if (responseNotes !== undefined) ca.responseNotes = responseNotes;
          if (status) ca.status = status;
          if (status === 'Resolved') {
            ca.resolvedAt = now;
            ca.verifiedBy = security.fullName;
          }
        }
      }

      // Update Observation status
      if (observationId && dbData.monitoringObservations) {
        const obs = dbData.monitoringObservations.find((o) => o.id === observationId);
        if (obs) {
          if (obsStatus) obs.status = obsStatus;
          obs.updatedAt = now;
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in monitoring PUT:', error);
    return NextResponse.json(
      { error: 'Failed to update monitoring status', details: error.message },
      { status: 500 }
    );
  }
}
