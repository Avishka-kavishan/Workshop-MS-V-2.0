'use client';

import React, { useState, useRef, useEffect } from 'react';
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
  const [showTileDropdown, setShowTileDropdown] = useState(false);
  const tileDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (tileDropdownRef.current && !tileDropdownRef.current.contains(e.target as Node)) {
        setShowTileDropdown(false);
      }
    };
    if (showTileDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showTileDropdown]);

  const handleJumpToTile = (tileId: string) => {
    setShowTileDropdown(false);
    if (typeof document !== 'undefined') {
      const el = document.getElementById(tileId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.style.transition = 'box-shadow 0.3s ease';
        el.style.boxShadow = '0 0 0 3px #80142B, 0 8px 24px rgba(128, 20, 43, 0.2)';
        setTimeout(() => {
          el.style.boxShadow = '';
        }, 1500);
      }
    }
  };

  const ws = kpis?.workshops || {
    totalWorkshops: 277,
    activeWorkshops: 22,
    completedWorkshops: 98,
    pendingWorkshops: 154,
    completionRatePct: 35,
  };

  const aip = kpis?.aip || {
    totalActivities: 241,
    completedActivities: 7,
    ongoingActivities: 78,
    pendingActivities: 156,
    delayedActivities: 21,
    overallProgressPct: 74,
  };

  const budget = kpis?.budget || {
    totalApprovedBudgetMn: 6392.325,
    totalExpenditureMn: 1222.866557,
    budgetUtilizationPct: 29.0,
    pendingBudgetRevisions: 4,
    approvedBudgetAmendments: 1,
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
        borderRadius: '16px',
        border: '1px solid #F1E5E2',
        padding: '0.65rem 0.85rem',
        boxShadow: '0 4px 16px rgba(128, 20, 43, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: '430px',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem', flexWrap: 'wrap', gap: '0.4rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <span style={{ fontSize: '1.05rem', color: '#80142B' }}>📊</span>
          <h3 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 800, color: '#0F172A' }}>
            Management Summary & KPIs
          </h3>
        </div>

        {/* Right side up corner: Tile Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          {/* Tile 03 Interactive Dropdown */}
          <div ref={tileDropdownRef} style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setShowTileDropdown((prev) => !prev)}
              style={{
                fontSize: '0.66rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '8px',
                background: showTileDropdown ? '#80142B' : '#FFF5F2',
                color: showTileDropdown ? '#FFFFFF' : '#80142B',
                border: '1px solid',
                borderColor: showTileDropdown ? '#80142B' : '#F2DDD5',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.15s ease',
                boxShadow: showTileDropdown ? '0 2px 6px rgba(128, 20, 43, 0.25)' : 'none',
              }}
              title="Click to switch dashboard tiles or filter KPI categories"
            >
              <span>Tile 03</span>
              <span
                style={{
                  fontSize: '0.6rem',
                  transition: 'transform 0.15s ease',
                  transform: showTileDropdown ? 'rotate(180deg)' : 'rotate(0deg)',
                }}
              >
                ⌵
              </span>
            </button>

            {/* Dropdown Menu */}
            {showTileDropdown && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  right: 0,
                  width: '235px',
                  background: '#FFFFFF',
                  border: '1px solid #EADBDE',
                  borderRadius: '12px',
                  boxShadow: '0 12px 32px rgba(128, 20, 43, 0.16), 0 2px 8px rgba(0, 0, 0, 0.06)',
                  padding: '6px',
                  zIndex: 1000,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                }}
              >
                {/* Section 1: Dashboard Tile Navigation */}
                <div style={{ padding: '4px 8px 2px', fontSize: '0.6rem', fontWeight: 800, color: '#80142B', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  Management Row Tiles
                </div>

                {/* Tile 01 */}
                <button
                  type="button"
                  onClick={() => handleJumpToTile('dashboard-tile-01')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 8px',
                    borderRadius: '8px',
                    background: 'transparent',
                    border: 'none',
                    color: '#1E293B',
                    fontSize: '0.74rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.12s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#FFF5F2';
                    e.currentTarget.style.color = '#80142B';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#1E293B';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>📶</span>
                    <span>Tile 01: Implementation Timeline</span>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: '#94A3B8' }}>↗</span>
                </button>

                {/* Tile 02 */}
                <button
                  type="button"
                  onClick={() => handleJumpToTile('dashboard-tile-02')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 8px',
                    borderRadius: '8px',
                    background: 'transparent',
                    border: 'none',
                    color: '#1E293B',
                    fontSize: '0.74rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.12s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#FFF5F2';
                    e.currentTarget.style.color = '#80142B';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#1E293B';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>📈</span>
                    <span>Tile 02: Performance Curve</span>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: '#94A3B8' }}>↗</span>
                </button>

                {/* Tile 03 */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 8px',
                    borderRadius: '8px',
                    background: '#FFF5F2',
                    color: '#80142B',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>📊</span>
                    <span>Tile 03: Summary & KPIs</span>
                  </div>
                  <span style={{ fontSize: '0.65rem', background: '#80142B', color: '#FFFFFF', padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>
                    Active ✓
                  </span>
                </div>

                <div style={{ height: '1px', background: '#F1E5E2', margin: '4px 0' }} />

                {/* Section 2: Quick KPI Category Switcher */}
                <div style={{ padding: '2px 8px', fontSize: '0.6rem', fontWeight: 800, color: '#80142B', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  Filter KPI Category
                </div>

                {[
                  { id: 'all', label: 'All KPI Groups' },
                  { id: 'workshops', label: 'Workshops & Training' },
                  { id: 'aip', label: 'AIP Activities' },
                  { id: 'budget', label: 'Budget Utilization' },
                  { id: 'amendments', label: 'Plan Amendments' },
                ].map((cat) => {
                  const isCatActive = activeSection === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setActiveSection(cat.id as any);
                        setShowTileDropdown(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '5px 8px',
                        borderRadius: '6px',
                        background: isCatActive ? 'rgba(128, 20, 43, 0.08)' : 'transparent',
                        border: 'none',
                        color: isCatActive ? '#80142B' : '#334155',
                        fontSize: '0.72rem',
                        fontWeight: isCatActive ? 800 : 500,
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.12s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (!isCatActive) {
                          e.currentTarget.style.background = '#F8FAFC';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isCatActive) {
                          e.currentTarget.style.background = 'transparent';
                        }
                      }}
                    >
                      <span>{cat.label}</span>
                      {isCatActive && <span style={{ color: '#80142B', fontWeight: 800 }}>✓</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <TileActionMenu
            tileTitle="Management Summary & KPIs"
            exportData={tileExportData}
            position="right"
          />
        </div>
      </div>

      {/* Category Pills Switcher */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.55rem', flexWrap: 'wrap' }}>
        {[
          { id: 'all', label: 'All Groups' },
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
                background: isSelected ? '#80142B' : '#F8FAFC',
                color: isSelected ? '#FFFFFF' : '#475569',
                borderRadius: '6px',
                padding: '0.18rem 0.5rem',
                fontSize: '0.65rem',
                fontWeight: isSelected ? 800 : 600,
                cursor: 'pointer',
                boxShadow: isSelected ? '0 1px 3px rgba(128, 20, 43, 0.2)' : 'none',
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
          gap: '0.55rem',
          paddingRight: '2px',
          maxHeight: '410px',
        }}
      >
        {/* GROUP A: Workshop Management */}
        {(activeSection === 'all' || activeSection === 'workshops') && (
          <div style={{ background: '#FFF5F2', borderRadius: '10px', border: '1px solid #F2DDD5', padding: '0.55rem 0.7rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <span>👥</span> A. Workshop Management
              </div>
              <Link href="/workshops" style={{ fontSize: '0.62rem', fontWeight: 700, color: '#80142B', textDecoration: 'none' }}>
                Directory →
              </Link>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.35rem' }}>
              <div style={{ background: '#FFFFFF', padding: '0.35rem', borderRadius: '6px', border: '1px solid #F1E5E2', textAlign: 'center' }}>
                <div style={{ fontSize: '0.6rem', color: '#64748B', fontWeight: 600 }}>Total</div>
                <div style={{ fontSize: '0.96rem', fontWeight: 800, color: '#0F172A' }}>{ws.totalWorkshops}</div>
              </div>
              <div style={{ background: '#FFFFFF', padding: '0.35rem', borderRadius: '6px', border: '1px solid #F1E5E2', textAlign: 'center' }}>
                <div style={{ fontSize: '0.6rem', color: '#0369A1', fontWeight: 600 }}>Ongoing</div>
                <div style={{ fontSize: '0.96rem', fontWeight: 800, color: '#0284C7' }}>{ws.activeWorkshops}</div>
              </div>
              <div style={{ background: '#FFFFFF', padding: '0.35rem', borderRadius: '6px', border: '1px solid #F1E5E2', textAlign: 'center' }}>
                <div style={{ fontSize: '0.6rem', color: '#065F46', fontWeight: 600 }}>Completed</div>
                <div style={{ fontSize: '0.96rem', fontWeight: 800, color: '#10B981' }}>{ws.completedWorkshops}</div>
              </div>
              <div style={{ background: '#FFFFFF', padding: '0.35rem', borderRadius: '6px', border: '1px solid #F1E5E2', textAlign: 'center' }}>
                <div style={{ fontSize: '0.6rem', color: '#D97706', fontWeight: 600 }}>Upcoming</div>
                <div style={{ fontSize: '0.96rem', fontWeight: 800, color: '#F59E0B' }}>{ws.pendingWorkshops}</div>
              </div>
            </div>
          </div>
        )}

        {/* GROUP B: Annual Implementation Plan (AIP) */}
        {(activeSection === 'all' || activeSection === 'aip') && (
          <div style={{ background: '#FFF5F2', borderRadius: '10px', border: '1px solid #F2DDD5', padding: '0.55rem 0.7rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <span>📋</span> B. Annual Implementation Plan (AIP)
              </div>
              <Link href="/annual-plan" style={{ fontSize: '0.62rem', fontWeight: 700, color: '#80142B', textDecoration: 'none' }}>
                AIP Matrix →
              </Link>
            </div>

            {/* Overall AIP Progress Bar */}
            <div style={{ marginBottom: '0.45rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.64rem', fontWeight: 700, marginBottom: '3px' }}>
                <span style={{ color: '#475569' }}>Overall AIP Implementation Progress</span>
                <span style={{ color: '#80142B' }}>{aip.overallProgressPct}%</span>
              </div>
              <div style={{ width: '100%', height: '7px', background: '#F1E5E2', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${aip.overallProgressPct}%`, height: '100%', background: '#80142B', borderRadius: '4px' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.3rem' }}>
              <div style={{ background: '#FFFFFF', padding: '0.3rem', borderRadius: '6px', border: '1px solid #F1E5E2', textAlign: 'center' }}>
                <div style={{ fontSize: '0.56rem', color: '#64748B', fontWeight: 600 }}>Total</div>
                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0F172A' }}>{aip.totalActivities}</div>
              </div>
              <div style={{ background: '#FFFFFF', padding: '0.3rem', borderRadius: '6px', border: '1px solid #F1E5E2', textAlign: 'center' }}>
                <div style={{ fontSize: '0.56rem', color: '#065F46', fontWeight: 600 }}>Done</div>
                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#10B981' }}>{aip.completedActivities}</div>
              </div>
              <div style={{ background: '#FFFFFF', padding: '0.3rem', borderRadius: '6px', border: '1px solid #F1E5E2', textAlign: 'center' }}>
                <div style={{ fontSize: '0.56rem', color: '#0284C7', fontWeight: 600 }}>Ongoing</div>
                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0284C7' }}>{aip.ongoingActivities}</div>
              </div>
              <div style={{ background: '#FFFFFF', padding: '0.3rem', borderRadius: '6px', border: '1px solid #F1E5E2', textAlign: 'center' }}>
                <div style={{ fontSize: '0.56rem', color: '#64748B', fontWeight: 600 }}>Pending</div>
                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#64748B' }}>{aip.pendingActivities}</div>
              </div>
              <div style={{ background: '#FFFFFF', padding: '0.3rem', borderRadius: '6px', border: '1px solid #F1E5E2', textAlign: 'center' }}>
                <div style={{ fontSize: '0.56rem', color: '#DC2626', fontWeight: 600 }}>Delayed</div>
                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#DC2626' }}>{aip.delayedActivities}</div>
              </div>
            </div>
          </div>
        )}

        {/* GROUP C: Budget Management */}
        {(activeSection === 'all' || activeSection === 'budget') && (
          <div style={{ background: '#FFF5F2', borderRadius: '10px', border: '1px solid #F2DDD5', padding: '0.55rem 0.7rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <span>💰</span> C. Budget Management
              </div>
              <Link href="/budget-forecasting" style={{ fontSize: '0.62rem', fontWeight: 700, color: '#80142B', textDecoration: 'none' }}>
                Budget Workspace →
              </Link>
            </div>

            {/* Budget Utilization Bar */}
            <div style={{ marginBottom: '0.45rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.64rem', fontWeight: 700, marginBottom: '3px' }}>
                <span style={{ color: '#475569' }}>Allocation: Rs. 1,222,866,557 / Rs. 6,392,325,000</span>
                <span style={{ color: '#80142B' }}>29%</span>
              </div>
              <div style={{ width: '100%', height: '7px', background: '#F1E5E2', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `29%`, height: '100%', background: '#80142B', borderRadius: '4px' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.35rem' }}>
              <div style={{ background: '#FFFFFF', padding: '0.35rem', borderRadius: '6px', border: '1px solid #F1E5E2', textAlign: 'center' }}>
                <div style={{ fontSize: '0.58rem', color: '#64748B', fontWeight: 600 }}>Approved Budget</div>
                <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#0F172A' }}>Rs. 6,392,325,000</div>
              </div>
              <div style={{ background: '#FFFFFF', padding: '0.35rem', borderRadius: '6px', border: '1px solid #F1E5E2', textAlign: 'center' }}>
                <div style={{ fontSize: '0.58rem', color: '#D97706', fontWeight: 600 }}>Pending Revisions</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#D97706' }}>{budget.pendingBudgetRevisions}</div>
              </div>
              <div style={{ background: '#FFFFFF', padding: '0.35rem', borderRadius: '6px', border: '1px solid #F1E5E2', textAlign: 'center' }}>
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
