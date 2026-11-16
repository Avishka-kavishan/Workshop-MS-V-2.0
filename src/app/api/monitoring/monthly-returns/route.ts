import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb, updateDb, MonthlyProgressReturn, Notification } from '@/lib/db';
import { randomUUID } from 'crypto';
import { logAuditEvent } from '@/lib/auditLogger';
import { roundToCentInMn, formatMillion, formatRupees } from '@/lib/financialFormat';
import { getRelevantMonitoringBranch } from '@/lib/planningHierarchy';

export const dynamic = 'force-dynamic';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user as any;
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year') || '2027';
    const reqBranchId = searchParams.get('branchId');
    const month = searchParams.get('month') ? parseInt(searchParams.get('month')!, 10) : undefined;
    const status = searchParams.get('status');

    const data = await getDb();
    let returns = data.monthlyProgressReturns || [];

    // Filter by year
    if (year && year !== 'all') {
      returns = returns.filter((r) => r.year === year);
    }

    // Role-based scoping: Monitoring Officers and Admins can see all branches
    const isMonitoringOfficer =
      user.username === 'monitoring.officer' ||
      user.functionalCategory === 'Monitoring' ||
      user.roleId === 'role-monitoring-officer' ||
      user.organizationId === 'org-moe-monitoring' ||
      user.isSuperAdmin ||
      user.adminLevel === 0 ||
      user.adminLevel === 1 ||
      user.roleId === 'role-superadmin';

    if (!isMonitoringOfficer) {
      // Branch user: only sees their own branch returns
      const userBranchId = user.organizationId;
      returns = returns.filter((r) => r.branchId === userBranchId);
    } else if (reqBranchId && reqBranchId !== 'all') {
      returns = returns.filter((r) => r.branchId === reqBranchId);
    }

    if (month) {
      returns = returns.filter((r) => r.month === month);
    }

    if (status && status !== 'all') {
      returns = returns.filter((r) => r.status === status);
    }

    returns.sort((a, b) => b.month - a.month);

    return NextResponse.json({
      success: true,
      returns,
    });
  } catch (error: any) {
    console.error('Error fetching monthly returns:', error);
    return NextResponse.json({ error: 'Failed to fetch monthly returns', details: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user as any;
    const body = await request.json();

    const {
      branchId,
      year = '2027',
      month, // 1 to 12
      activityUpdates = [],
      overallRemarks = '',
    } = body;

    if (!branchId || !month || month < 1 || month > 12) {
      return NextResponse.json({ error: 'branchId and valid month (1-12) are required.' }, { status: 400 });
    }

    const data = await getDb();
    const branchOrg = (data.organizations || []).find((o) => o.id === branchId);
    const branchName = branchOrg?.name || user.organizationName || 'MOE Branch';
    const monthName = MONTH_NAMES[month - 1];

    // Determine relevant Monitoring destination
    const targetMonitoring = getRelevantMonitoringBranch(branchId);

    // Calculate total monthly expenditure
    let totalMonthlyExpenditure = 0;
    let sumPhysicalPct = 0;
    let validItemsCount = 0;

    const formattedItems = activityUpdates.map((item: any) => {
      const actualCost = roundToCentInMn(parseFloat(String(item.actualFinancialMonth || '0')) || 0);
      const actualPct = Math.min(100, Math.max(0, parseFloat(String(item.actualPhysicalPct || '0')) || 0));
      totalMonthlyExpenditure = roundToCentInMn(totalMonthlyExpenditure + actualCost);
      sumPhysicalPct += actualPct;
      validItemsCount++;

      return {
        activityId: item.activityId,
        activityCode: item.activityCode || '',
        activityTitle: item.activityTitle || '',
        voteNumber: item.voteNumber || '-',
        plannedTargetMonth: item.plannedTargetMonth || '-',
        actualPhysicalMonth: `${actualPct}%`,
        actualPhysicalPct: actualPct,
        plannedFinancialMonth: roundToCentInMn(parseFloat(String(item.plannedFinancialMonth || '0')) || 0),
        actualFinancialMonth: actualCost,
        cumulativeFinancialCost: roundToCentInMn(parseFloat(String(item.cumulativeFinancialCost || actualCost)) || 0),
        status: (item.status || 'On Track') as 'On Track' | 'Delayed' | 'Critical' | 'Completed',
        implementationNotes: item.implementationNotes || '',
      };
    });

    const avgPhysicalProgressPct = validItemsCount > 0 ? Math.round(sumPhysicalPct / validItemsCount) : 0;
    const now = new Date().toISOString();
    const returnId = `mpr-${branchId}-${year}-${String(month).padStart(2, '0')}`;

    let savedReturn: MonthlyProgressReturn | null = null;

    await updateDb((dbData) => {
      if (!dbData.monthlyProgressReturns) dbData.monthlyProgressReturns = [];
      if (!dbData.notifications) dbData.notifications = [];
      if (!dbData.auditLogs) dbData.auditLogs = [];

      // Update AipActivity records in database to reflect the monthly report
      (dbData.aipActivities || []).forEach((act) => {
        if (act.branchId === branchId && (act.year === String(year) || !act.year)) {
          const update = formattedItems.find((u: any) => u.activityId === act.id);
          if (update) {
            if (!act.financialMonths) act.financialMonths = Array(12).fill(0);
            if (!act.physicalMonths) act.physicalMonths = Array(12).fill('-');

            act.financialMonths[month - 1] = update.actualFinancialMonth;
            act.physicalMonths[month - 1] = `${update.actualPhysicalPct}%`;

            // Update cumulative totals
            const totalFin = roundToCentInMn(act.financialMonths.reduce((s, v) => s + (Number(v) || 0), 0));
            act.financialProgress = totalFin;
            act.physicalProgressPct = `${update.actualPhysicalPct}%`;
            act.physicalProgress = update.implementationNotes || act.physicalProgress;
            act.updatedAt = now;
          }
        }
      });

      const existingIdx = dbData.monthlyProgressReturns.findIndex((r) => r.id === returnId);

      const returnPayload: MonthlyProgressReturn = {
        id: returnId,
        planId: `plan-${branchId}-${year}`,
        branchId,
        branchName,
        year: String(year),
        month,
        monthName,
        submissionDate: now,
        submittedByUserId: user.id || 'officer',
        submittedByName: user.fullName || user.name || 'Branch Officer',
        targetMonitoringOrgId: targetMonitoring.monitoringOrgId,
        targetMonitoringOrgName: targetMonitoring.monitoringAuthorityLabel,
        totalMonthlyExpenditure,
        totalCumulativeExpenditure: totalMonthlyExpenditure, // will accumulate with prior months
        avgPhysicalProgressPct,
        activityProgressItems: formattedItems,
        overallRemarks: overallRemarks.trim(),
        status: 'Submitted',
        createdAt: existingIdx !== -1 ? dbData.monthlyProgressReturns[existingIdx].createdAt : now,
        updatedAt: now,
      };

      if (existingIdx !== -1) {
        dbData.monthlyProgressReturns[existingIdx] = returnPayload;
      } else {
        dbData.monthlyProgressReturns.push(returnPayload);
      }
      savedReturn = returnPayload;

      // Notify the Monitoring & Evaluation Branch
      const notifToMonitoring: Notification = {
        id: `notif-mpr-${randomUUID()}`,
        recipientOrgId: targetMonitoring.monitoringOrgId,
        workshopId: `mpr-${branchId}-${year}-${month}`,
        title: `📊 Monthly Progress Return Submitted: ${branchName} (${monthName} ${year})`,
        message: `${branchName} has officially reported their monthly implementation progress for ${monthName} ${year}. Total Expenditure Incurred: Rs. ${formatMillion(totalMonthlyExpenditure)} Mn (${formatRupees(totalMonthlyExpenditure, true)}), Avg Physical Progress: ${avgPhysicalProgressPct}%. Ready for M&E verification.`,
        isRead: false,
        createdAt: now,
      };
      dbData.notifications.push(notifToMonitoring);

      // System Audit Log
      dbData.auditLogs.unshift({
        id: `audit-${randomUUID()}`,
        timestamp: now,
        userId: user.id || 'user',
        username: user.username || 'user',
        userFullName: user.fullName || user.name || 'Branch Officer',
        organizationId: branchId,
        organizationName: branchName,
        category: 'Operational',
        action: 'AIP_MONTHLY_PROGRESS_REPORTED',
        entityType: 'AIP_MONTHLY_RETURN',
        entityId: returnId,
        summary: `Reported ${monthName} ${year} progress return for ${branchName} to ${targetMonitoring.monitoringAuthorityLabel} (Expenditure: Rs. ${formatMillion(totalMonthlyExpenditure)} Mn).`,
        details: {
          branchId,
          branchName,
          year,
          month,
          monthName,
          totalMonthlyExpenditure,
          avgPhysicalProgressPct,
          activitiesCount: formattedItems.length,
          targetMonitoringOrgId: targetMonitoring.monitoringOrgId,
        },
        severity: 'Info',
      });
    });

    return NextResponse.json({
      success: true,
      monthlyReturn: savedReturn,
      message: `Monthly Progress Return for ${monthName} ${year} submitted successfully to ${targetMonitoring.monitoringAuthorityLabel}!`,
    });
  } catch (error: any) {
    console.error('Error submitting monthly progress return:', error);
    return NextResponse.json({ error: 'Failed to submit monthly return', details: error.message }, { status: 500 });
  }
}
