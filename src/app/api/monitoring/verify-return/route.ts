import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb, updateDb, VerificationRecord, CorrectiveAction, MonitoringObservation, Notification } from '@/lib/db';
import { randomUUID } from 'crypto';
import { logAuditEvent } from '@/lib/auditLogger';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user as any;

    // Verify user authorization: Monitoring Officer or Super Admin
    const isAuthorized =
      user.username === 'monitoring.officer' ||
      user.functionalCategory === 'Monitoring' ||
      user.roleId === 'role-monitoring-officer' ||
      user.organizationId === 'org-moe-monitoring' ||
      user.isSuperAdmin ||
      user.adminLevel === 0 ||
      user.adminLevel === 1 ||
      user.roleId === 'role-superadmin';

    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'Forbidden: Only Monitoring & Evaluation Officers can verify monthly progress returns.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      returnId,
      status = 'Verified', // 'Verified' | 'Action Required'
      verificationNotes = '',
      correctiveActionRequired = false,
      recommendedAction = '',
      deadline = '',
    } = body;

    if (!returnId) {
      return NextResponse.json({ error: 'returnId is required.' }, { status: 400 });
    }

    const data = await getDb();
    const existingReturn = (data.monthlyProgressReturns || []).find((r) => r.id === returnId);
    if (!existingReturn) {
      return NextResponse.json({ error: 'Monthly progress return not found.' }, { status: 404 });
    }

    const now = new Date().toISOString();
    const verifierName = user.fullName || user.name || 'Monitoring & Performance Branch';
    const vId = `vr-${randomUUID()}`;

    await updateDb((dbData) => {
      if (!dbData.monthlyProgressReturns) dbData.monthlyProgressReturns = [];
      if (!dbData.verificationRecords) dbData.verificationRecords = [];
      if (!dbData.monitoringObservations) dbData.monitoringObservations = [];
      if (!dbData.correctiveActions) dbData.correctiveActions = [];
      if (!dbData.notifications) dbData.notifications = [];
      if (!dbData.auditLogs) dbData.auditLogs = [];

      // 1. Update Monthly Progress Return record
      const returnIdx = dbData.monthlyProgressReturns.findIndex((r) => r.id === returnId);
      if (returnIdx !== -1) {
        dbData.monthlyProgressReturns[returnIdx] = {
          ...dbData.monthlyProgressReturns[returnIdx],
          status: status as any,
          verificationRecordId: vId,
          verifiedAt: now,
          verifiedBy: verifierName,
          verificationNotes: verificationNotes.trim(),
          updatedAt: now,
        };
      }

      // 2. Insert Verification Record
      const vr: VerificationRecord = {
        id: vId,
        aipActivityId: existingReturn.activityProgressItems?.[0]?.activityId || returnId,
        aipActivityCode: existingReturn.activityProgressItems?.[0]?.activityCode || 'MPR',
        aipActivityTitle: `${existingReturn.branchName} - ${existingReturn.monthName} ${existingReturn.year} Return`,
        institutionName: 'Ministry of Education',
        divisionName: existingReturn.branchName,
        reportedPhysicalPct: existingReturn.avgPhysicalProgressPct,
        verifiedPhysicalPct: existingReturn.avgPhysicalProgressPct,
        reportedFinancialCost: existingReturn.totalMonthlyExpenditure,
        verifiedFinancialCost: existingReturn.totalMonthlyExpenditure,
        status: status === 'Verified' ? 'Verified' : 'Conditional',
        verificationNotes: verificationNotes.trim() || `Verified by M&E Branch for ${existingReturn.monthName} ${existingReturn.year}.`,
        evidenceApproved: status === 'Verified',
        verifiedByUserId: user.id || 'monitoring-officer',
        verifiedByName: verifierName,
        createdAt: now,
      };
      dbData.verificationRecords.push(vr);

      // 3. If action required or corrective action requested
      if (status === 'Action Required' || correctiveActionRequired) {
        const obsId = `obs-${randomUUID()}`;
        const caId = `ca-${randomUUID()}`;

        const obs: MonitoringObservation = {
          id: obsId,
          aipActivityId: existingReturn.activityProgressItems?.[0]?.activityId,
          aipActivityCode: existingReturn.activityProgressItems?.[0]?.activityCode || 'MPR',
          aipActivityTitle: `${existingReturn.monthName} Implementation Discrepancy`,
          institutionId: 'org-moe',
          institutionName: 'Ministry of Education',
          divisionId: existingReturn.branchId,
          divisionName: existingReturn.branchName,
          monitoringOfficerId: user.id || 'monitoring-officer',
          monitoringOfficerName: verifierName,
          observationType: 'Progress Deviation',
          title: `Monthly Progress Remediation: ${existingReturn.branchName} (${existingReturn.monthName} ${existingReturn.year})`,
          details: verificationNotes || 'Implementation milestone lagging behind schedule or expenditure discrepancy identified during monthly review.',
          severity: 'Medium',
          correctiveActionRequired: true,
          correctiveActionId: caId,
          status: 'Open',
          createdAt: now,
          updatedAt: now,
        };
        dbData.monitoringObservations.push(obs);

        const ca: CorrectiveAction = {
          id: caId,
          observationId: obsId,
          aipActivityId: existingReturn.activityProgressItems?.[0]?.activityId,
          assignedDivisionId: existingReturn.branchId,
          assignedDivisionName: existingReturn.branchName,
          issueSummary: `Progress return adjustment required for ${existingReturn.monthName} ${existingReturn.year}.`,
          recommendedAction: recommendedAction || 'Fast-track pending workshop disbursements and submit updated milestone confirmation.',
          deadline: deadline || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: 'Pending',
          requestedBy: verifierName,
          requestedAt: now,
        };
        dbData.correctiveActions.push(ca);
      }

      // 4. Notify Operational Branch
      const notifTitle = status === 'Verified'
        ? `✅ Monthly Progress Return Verified: ${existingReturn.monthName} ${existingReturn.year}`
        : `⚠️ Monitoring Observation & Action Required: ${existingReturn.monthName} ${existingReturn.year}`;

      const notifMsg = status === 'Verified'
        ? `Monitoring & Performance Branch has verified your ${existingReturn.monthName} ${existingReturn.year} progress return.${verificationNotes ? ` Remarks: "${verificationNotes}"` : ''}`
        : `Monitoring & Performance Branch has flagged adjustments for your ${existingReturn.monthName} return.${verificationNotes ? ` Directives: "${verificationNotes}"` : ''}`;

      dbData.notifications.push({
        id: `notif-vr-${randomUUID()}`,
        recipientOrgId: existingReturn.branchId,
        workshopId: `mpr-${existingReturn.branchId}-${existingReturn.year}-${existingReturn.month}`,
        title: notifTitle,
        message: notifMsg,
        isRead: false,
        createdAt: now,
      });

      // 5. System Audit Log
      dbData.auditLogs.unshift({
        id: `audit-${randomUUID()}`,
        timestamp: now,
        userId: user.id || 'monitoring',
        username: user.username || 'monitoring.officer',
        userFullName: verifierName,
        organizationId: 'org-moe-monitoring',
        organizationName: 'MOE Monitoring & Performance Branch',
        category: 'Governance',
        action: 'AIP_MONTHLY_RETURN_VERIFIED',
        entityType: 'AIP_MONTHLY_RETURN',
        entityId: returnId,
        summary: `Verified monthly progress return for ${existingReturn.branchName} (${existingReturn.monthName} ${existingReturn.year}) with status "${status}".`,
        details: {
          returnId,
          branchId: existingReturn.branchId,
          month: existingReturn.month,
          year: existingReturn.year,
          status,
          verificationNotes,
        },
        severity: status === 'Verified' ? 'Info' : 'Warning',
      });
    });

    return NextResponse.json({
      success: true,
      status,
      message: `Monthly Progress Return for ${existingReturn.monthName} ${existingReturn.year} marked as "${status}" by Monitoring Branch.`,
    });
  } catch (error: any) {
    console.error('Error verifying monthly return:', error);
    return NextResponse.json({ error: 'Failed to verify monthly return', details: error.message }, { status: 500 });
  }
}
