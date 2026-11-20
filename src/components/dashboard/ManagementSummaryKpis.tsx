'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import TileActionMenu, { TileExportData } from '@/components/dashboard/TileActionMenu';
import { formatMillion } from '@/lib/financialFormat';

export interface ManagementKpiData {
  workshops?: {
    totalWorkshops: number;
    activeWorkshops: number;
    completedWorkshops: number;
    pendingWorkshops: number;
    completionRatePct?: number;
  };
  aip?: {
    totalActivities: number;
    completedActivities: number;
    ongoingActivities: number;
    pendingActivities: number;
    delayedActivities: number;
    overallProgressPct: number;
  };
  budget?: {
    totalApprovedBudgetMn: number;
    totalExpenditureMn: number;
    budgetUtilizationPct: number;
    pendingBudgetRevisions: number;
    approvedBudgetAmendments: number;
  };
  amendments?: {
    totalAmendments: number;
    pendingAmendments: number;
    approvedAmendments: number;
    rejectedAmendments: number;
  };
  additional?: {
    upcomingMilestones: number;
    overdueActivities: number;
    pendingProgressReports: number;
    activitiesAwaitingVerification: number;
    outstandingAdministrativeActions: number;
  };
}

interface ManagementSummaryKpisProps {
  kpis?: ManagementKpiData;
}

export default function ManagementSummaryKpis({ kpis }: ManagementSummaryKpisProps) {
  const [activeSection, setActiveSection] = useState<'all' | 'workshops' | 'aip' | 'budget' | 'amendments' | 'additional'>('all');

  const ws = kpis?.workshops || {
    totalWorkshops: 186,
    activeWorkshops: 9,
    completedWorkshops: 56,
    pendingWorkshops: 121,
    completionRatePct: 30,
  };

  const aip = kpis?.aip || {
    totalActivities: 184,
    completedActivities: 68,
    ongoingActivities: 76,
    pendingActivities: 24,
    delayedActivities: 16,
    overallProgressPct: 73.5,
  };

  const budget = kpis?.budget || {
    totalApprovedBudgetMn: 4634.1,
    totalExpenditureMn: 1441.7,
    budgetUtilizationPct: 31.0,
    pendingBudgetRevisions: 4,
    approvedBudgetAmendments: 12,
  };

  const amendments = kpis?.amendments || {
    totalAmendments: 3,
    pendingAmendments: 1,
    approvedAmendments: 2,
    rejectedAmendments: 0,
  };

  const add = kpis?.additional || {
    upcomingMilestones: 14,
    overdueActivities: 8,
    pendingProgressReports: 11,
    activitiesAwaitingVerification: 115,
    outstandingAdministrativeActions: 5,
  };

  const tileExportData: TileExportData = {
    filename: 'MoE_Management_Summary_KPIs_2026',
    reportTitle: 'Management Summary & Key Performance Indicators (KPIs)',
    subtitle: 'High-Level Monitoring: Workshops, AIP, Budget Absorption, Amendments & Operational Actions',
    headers: ['Domain / Category', 'Key Performance Indicator', 'Target / Approved', 'Achieved / Actual', 'Variance / Pending', 'Rate / Percentage (%)', 'Institutional Status'],
    rows: [
      ['Workshops', 'Total Workshops', 186, ws.completedWorkshops, ws.pendingWorkshops, `${ws.completionRatePct || 30}%`, 'Active'],
      ['Workshops', 'Active Field Sessions', '-', ws.activeWorkshops, '-', '-', 'Ongoing'],
      ['Workshops', 'Completed Workshops', ws.totalWorkshops, ws.completedWorkshops, ws.pendingWorkshops, `${Math.round((ws.completedWorkshops / ws.totalWorkshops) * 100)}%`, 'Verified'],
      ['AIP Activities', 'Total AIP Activities', 184, aip.completedActivities, aip.pendingActivities, `${aip.overallProgressPct}%`, 'On Track'],
      ['AIP Activities', 'Ongoing Activities', '-', aip.ongoingActivities, '-', '-', 'In Progress'],
      ['AIP Activities', 'Delayed Activities', 0, aip.delayedActivities, `+${aip.delayedActivities}`, '-', 'Intervention Required'],
      ['Budget Management', 'Total Approved Budget (LKR Mn)', budget.totalApprovedBudgetMn, budget.totalExpenditureMn, budget.totalApprovedBudgetMn - budget.totalExpenditureMn, `${budget.budgetUtilizationPct}%`, 'Allocated'],
      ['Budget Management', 'Total Expenditure (LKR Mn)', '-', budget.totalExpenditureMn, '-', `${budget.budgetUtilizationPct}%`, 'Disbursed'],
      ['Budget Management', 'Pending Budget Revisions', 0, budget.pendingBudgetRevisions, `+${budget.pendingBudgetRevisions}`, '-', 'Under Review'],
      ['Budget Management', 'Approved Budget Amendments', '-', budget.approvedBudgetAmendments, '-', '-', 'Approved'],
      ['AIP Amendments', 'Total Amendments', amendments.totalAmendments, amendments.approvedAmendments, amendments.pendingAmendments, '-', 'Logged'],
      ['AIP Amendments', 'Pending Amendments', 0, amendments.pendingAmendments, `+${amendments.pendingAmendments}`, '-', 'Action Required'],
      ['Administrative', 'Upcoming Milestones', 14, 14, 0, '-', 'Upcoming'],
      ['Administrative', 'Overdue Activities', 0, add.overdueActivities, `+${add.overdueActivities}`, '-', 'High Priority'],
      ['Administrative', 'Pending Progress Reports', 0, add.pendingProgressReports, `+${add.pendingProgressReports}`, '-', 'Follow Up'],
      ['Administrative', 'Activities Awaiting Verification', 0, add.activitiesAwaitingVerification, `+${add.activitiesAwaitingVerification}`, '-', 'Pending Verification'],
      ['Administrative', 'Outstanding Administrative Actions', 0, add.outstandingAdministrativeActions, `+${add.outstandingAdministrativeActions}`, '-', 'Action Needed'],
    ],
    summaryStats: [
      { label: 'AIP Progress', value: `${aip.overallProgressPct}%`, highlight: true },
      { label: 'Budget Utilization', value: `${budget.budgetUtilizationPct}%` },
      { label: 'Workshops Completed', value: `${ws.completedWorkshops} / ${ws.totalWorkshops}` },
      { label: 'Pending Verification', value: `${add.activitiesAwaitingVerification}` },
    ],
    copySummaryText: `MoE Management KPIs: AIP Progress: ${aip.overallProgressPct}%, Budget Utilization: ${budget.budgetUtilizationPct}%, Completed Workshops: ${ws.completedWorkshops}/${ws.totalWorkshops}, Overdue Activities: ${add.overdueActivities}, Awaiting Verification: ${add.activitiesAwaitingVerification}.`,
  };

  return (
    <div
      style={{
        background: '#FFFFFF',
        borderRadius: '14px',
        border: '1px solid #E2E8F0',
        padding: '0.85rem 1rem',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: '430px',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.45rem', flexWrap: 'wrap', gap: '0.4rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '1.05rem' }}>🎯</span>
            <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#0F172A' }}>
              Management Summary & KPIs
            </h3>
            <span
              style={{
                fontSize: '0.62rem',
                fontWeight: 700,
                padding: '1px 6px',
                borderRadius: '8px',
                background: '#F1F5F9',
                color: '#475569',
              }}
            >
              Tile 03
            </span>
          </div>
          <div style={{ fontSize: '0.68rem', color: '#64748B', marginTop: '1px' }}>
            Workshops, AIP, Budget absorption, Amendments & Administrative actions
          </div>
        </div>

        {/* Right side up corner: Tile Actions */}
        <TileActionMenu
          tileTitle="Management Summary & KPIs"
          exportData={tileExportData}
          position="right"
        />
      </div>

      {/* Category Pills Switcher */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.55rem', flexWrap: 'wrap' }}>
        {[
          { id: 'all', label: 'All 5 Groups' },
          { id: 'workshops', label: 'Workshops' },
          { id: 'aip', label: 'AIP Plan' },
          { id: 'budget', label: 'Budget' },
          { id: 'amendments', label: 'Amendments' },
          { id: 'additional', label: 'Actions' },
        ].map((tab) => {
          const isSelected = activeSection === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSection(tab.id as any)}
              style={{
                border: 'none',
                background: isSelected ? '#7B112A' : '#F1F5F9',
                color: isSelected ? '#FFFFFF' : '#334155',
                borderRadius: '6px',
                padding: '0.18rem 0.45rem',
                fontSize: '0.64rem',
                fontWeight: isSelected ? 800 : 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Scrollable KPI Body Container */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.6rem',
          paddingRight: '2px',
          maxHeight: '410px',
        }}
      >
        {/* GROUP A: Workshop Management */}
        {(activeSection === 'all' || activeSection === 'workshops') && (
          <div style={{ background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0', padding: '0.55rem 0.7rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <span>👥</span> A. Workshop Management
              </div>
              <Link href="/workshops" style={{ fontSize: '0.62rem', fontWeight: 700, color: '#0284C7', textDecoration: 'none' }}>
                Directory →
              </Link>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.35rem' }}>
              <div style={{ background: '#FFFFFF', padding: '0.35rem', borderRadius: '6px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                <div style={{ fontSize: '0.6rem', color: '#64748B', fontWeight: 600 }}>Total</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F172A' }}>{ws.totalWorkshops}</div>
              </div>
              <div style={{ background: '#FFFFFF', padding: '0.35rem', borderRadius: '6px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                <div style={{ fontSize: '0.6rem', color: '#0369A1', fontWeight: 600 }}>Ongoing</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0284C7' }}>{ws.activeWorkshops}</div>
              </div>
              <div style={{ background: '#FFFFFF', padding: '0.35rem', borderRadius: '6px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                <div style={{ fontSize: '0.6rem', color: '#065F46', fontWeight: 600 }}>Completed</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#10B981' }}>{ws.completedWorkshops}</div>
              </div>
              <div style={{ background: '#FFFFFF', padding: '0.35rem', borderRadius: '6px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                <div style={{ fontSize: '0.6rem', color: '#D97706', fontWeight: 600 }}>Upcoming</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#F59E0B' }}>{ws.pendingWorkshops}</div>
              </div>
            </div>
          </div>
        )}

        {/* GROUP B: Annual Implementation Plan (AIP) */}
        {(activeSection === 'all' || activeSection === 'aip') && (
          <div style={{ background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0', padding: '0.55rem 0.7rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <span>📋</span> B. Annual Implementation Plan (AIP)
              </div>
              <Link href="/annual-plan" style={{ fontSize: '0.62rem', fontWeight: 700, color: '#0284C7', textDecoration: 'none' }}>
                AIP Matrix →
              </Link>
            </div>

            {/* Overall AIP Progress Bar */}
            <div style={{ marginBottom: '0.45rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.64rem', fontWeight: 700, marginBottom: '2px' }}>
                <span style={{ color: '#475569' }}>Overall AIP Implementation Progress</span>
                <span style={{ color: '#7B112A' }}>{aip.overallProgressPct}%</span>
              </div>
              <div style={{ width: '100%', height: '6px', background: '#E2E8F0', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${aip.overallProgressPct}%`, height: '100%', background: '#7B112A', borderRadius: '3px' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.3rem' }}>
              <div style={{ background: '#FFFFFF', padding: '0.3rem', borderRadius: '6px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                <div style={{ fontSize: '0.56rem', color: '#64748B', fontWeight: 600 }}>Total</div>
                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0F172A' }}>{aip.totalActivities}</div>
              </div>
              <div style={{ background: '#FFFFFF', padding: '0.3rem', borderRadius: '6px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                <div style={{ fontSize: '0.56rem', color: '#065F46', fontWeight: 600 }}>Done</div>
                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#10B981' }}>{aip.completedActivities}</div>
              </div>
              <div style={{ background: '#FFFFFF', padding: '0.3rem', borderRadius: '6px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                <div style={{ fontSize: '0.56rem', color: '#0284C7', fontWeight: 600 }}>Ongoing</div>
                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0284C7' }}>{aip.ongoingActivities}</div>
              </div>
              <div style={{ background: '#FFFFFF', padding: '0.3rem', borderRadius: '6px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                <div style={{ fontSize: '0.56rem', color: '#64748B', fontWeight: 600 }}>Pending</div>
                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#64748B' }}>{aip.pendingActivities}</div>
              </div>
              <div style={{ background: '#FFFFFF', padding: '0.3rem', borderRadius: '6px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                <div style={{ fontSize: '0.56rem', color: '#DC2626', fontWeight: 600 }}>Delayed</div>
                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#DC2626' }}>{aip.delayedActivities}</div>
              </div>
            </div>
          </div>
        )}

        {/* GROUP C: Budget Management */}
        {(activeSection === 'all' || activeSection === 'budget') && (
          <div style={{ background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0', padding: '0.55rem 0.7rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <span>💰</span> C. Budget Management
              </div>
              <Link href="/budget-forecasting" style={{ fontSize: '0.62rem', fontWeight: 700, color: '#0284C7', textDecoration: 'none' }}>
                Budget Workspace →
              </Link>
            </div>

            {/* Budget Utilization Bar */}
            <div style={{ marginBottom: '0.45rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.64rem', fontWeight: 700, marginBottom: '2px' }}>
                <span style={{ color: '#475569' }}>Absorption: Rs. {formatMillion(budget.totalExpenditureMn)} M / Rs. {formatMillion(budget.totalApprovedBudgetMn)} M</span>
                <span style={{ color: '#0284C7' }}>{budget.budgetUtilizationPct}%</span>
              </div>
              <div style={{ width: '100%', height: '6px', background: '#E2E8F0', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${budget.budgetUtilizationPct}%`, height: '100%', background: '#0284C7', borderRadius: '3px' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.35rem' }}>
              <div style={{ background: '#FFFFFF', padding: '0.35rem', borderRadius: '6px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                <div style={{ fontSize: '0.58rem', color: '#64748B', fontWeight: 600 }}>Approved Budget</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0F172A' }}>Rs. {formatMillion(budget.totalApprovedBudgetMn)} M</div>
              </div>
              <div style={{ background: '#FFFFFF', padding: '0.35rem', borderRadius: '6px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                <div style={{ fontSize: '0.58rem', color: '#D97706', fontWeight: 600 }}>Pending Revisions</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#D97706' }}>{budget.pendingBudgetRevisions}</div>
              </div>
              <div style={{ background: '#FFFFFF', padding: '0.35rem', borderRadius: '6px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                <div style={{ fontSize: '0.58rem', color: '#065F46', fontWeight: 600 }}>Approved Amend.</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#10B981' }}>{budget.approvedBudgetAmendments}</div>
              </div>
            </div>
          </div>
        )}

        {/* GROUP D: AIP Amendment Management */}
        {(activeSection === 'all' || activeSection === 'amendments') && (
          <div style={{ background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0', padding: '0.55rem 0.7rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <span>🔄</span> D. AIP Amendment Management
              </div>
              <Link href="/annual-plan" style={{ fontSize: '0.62rem', fontWeight: 700, color: '#0284C7', textDecoration: 'none' }}>
                Amendments →
              </Link>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.35rem' }}>
              <div style={{ background: '#FFFFFF', padding: '0.35rem', borderRadius: '6px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                <div style={{ fontSize: '0.58rem', color: '#64748B', fontWeight: 600 }}>Total</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0F172A' }}>{amendments.totalAmendments}</div>
              </div>
              <div style={{ background: '#FFFFFF', padding: '0.35rem', borderRadius: '6px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                <div style={{ fontSize: '0.58rem', color: '#D97706', fontWeight: 600 }}>Pending</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#D97706' }}>{amendments.pendingAmendments}</div>
              </div>
              <div style={{ background: '#FFFFFF', padding: '0.35rem', borderRadius: '6px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                <div style={{ fontSize: '0.58rem', color: '#065F46', fontWeight: 600 }}>Approved</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#10B981' }}>{amendments.approvedAmendments}</div>
              </div>
              <div style={{ background: '#FFFFFF', padding: '0.35rem', borderRadius: '6px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                <div style={{ fontSize: '0.58rem', color: '#DC2626', fontWeight: 600 }}>Rejected</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#DC2626' }}>{amendments.rejectedAmendments}</div>
              </div>
            </div>
          </div>
        )}

        {/* GROUP E: Additional Management Indicators */}
        {(activeSection === 'all' || activeSection === 'additional') && (
          <div style={{ background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0', padding: '0.55rem 0.7rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <span>⚡</span> E. Additional Management Indicators
              </div>
              <Link href="/monitoring" style={{ fontSize: '0.62rem', fontWeight: 700, color: '#0284C7', textDecoration: 'none' }}>
                Action Logs →
              </Link>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.3rem' }}>
              <div style={{ background: '#FFFFFF', padding: '0.3rem', borderRadius: '6px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                <div style={{ fontSize: '0.54rem', color: '#64748B', fontWeight: 600 }}>Milestones</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#8B5CF6' }}>{add.upcomingMilestones}</div>
              </div>
              <div style={{ background: '#FFFFFF', padding: '0.3rem', borderRadius: '6px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                <div style={{ fontSize: '0.54rem', color: '#DC2626', fontWeight: 600 }}>Overdue</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#DC2626' }}>{add.overdueActivities}</div>
              </div>
              <div style={{ background: '#FFFFFF', padding: '0.3rem', borderRadius: '6px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                <div style={{ fontSize: '0.54rem', color: '#D97706', fontWeight: 600 }}>Reports</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#D97706' }}>{add.pendingProgressReports}</div>
              </div>
              <div style={{ background: '#FFFFFF', padding: '0.3rem', borderRadius: '6px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                <div style={{ fontSize: '0.54rem', color: '#0284C7', fontWeight: 600 }}>Awaiting Verif.</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0284C7' }}>{add.activitiesAwaitingVerification}</div>
              </div>
              <div style={{ background: '#FFFFFF', padding: '0.3rem', borderRadius: '6px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                <div style={{ fontSize: '0.54rem', color: '#0F766E', fontWeight: 600 }}>Actions</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0F766E' }}>{add.outstandingAdministrativeActions}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
