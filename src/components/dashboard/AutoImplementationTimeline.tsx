'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import TileActionMenu, { TileExportData } from '@/components/dashboard/TileActionMenu';
import { formatMillion, formatRupees, formatDualDeclaration } from '@/lib/financialFormat';

export interface TimelineActivityItem {
  id: string;
  code: string;
  title: string;
  branchName: string;
  branchId?: string;
  year?: string;
  progressPct: number;
  status: 'Completed' | 'In Progress' | 'Delayed' | 'Upcoming';
  startQuarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  endQuarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  budgetMn: number;
  responsibleOfficer?: string;
  deliverables?: string;
}

interface AutoImplementationTimelineProps {
  activities?: TimelineActivityItem[];
  fiscalYear?: string;
  filterDivision?: string;
  filterStatus?: string;
}

export default function AutoImplementationTimeline({
  activities = [],
  fiscalYear = '2026',
  filterDivision = 'all',
  filterStatus = 'all',
}: AutoImplementationTimelineProps) {
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedActivity, setSelectedActivity] = useState<TimelineActivityItem | null>(null);

  // Filtered list
  const filteredList = useMemo(() => {
    return activities.filter((act) => {
      // Status filter
      if (selectedStatus !== 'all') {
        if (selectedStatus === 'Ongoing' && act.status !== 'In Progress') return false;
        if (selectedStatus !== 'Ongoing' && act.status !== selectedStatus) return false;
      }
      // Division filter prop
      if (filterDivision !== 'all' && act.branchId && act.branchId !== filterDivision) {
        return false;
      }
      // Search term
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const mCode = act.code.toLowerCase().includes(q);
        const mTitle = act.title.toLowerCase().includes(q);
        const mBranch = act.branchName.toLowerCase().includes(q);
        if (!mCode && !mTitle && !mBranch) return false;
      }
      return true;
    });
  }, [activities, selectedStatus, filterDivision, searchTerm]);

  // Status counts
  const counts = useMemo(() => {
    let comp = 0;
    let ongo = 0;
    let delay = 0;
    let upcom = 0;
    activities.forEach((a) => {
      if (a.status === 'Completed') comp++;
      else if (a.status === 'In Progress') ongo++;
      else if (a.status === 'Delayed') delay++;
      else upcom++;
    });
    return { all: activities.length, comp, ongo, delay, upcom };
  }, [activities]);

  // Map quarter range to left% and width%
  const getGanttPosition = (startQ: string, endQ: string) => {
    const qMap: Record<string, { start: number; end: number }> = {
      Q1: { start: 0, end: 25 },
      Q2: { start: 25, end: 50 },
      Q3: { start: 50, end: 75 },
      Q4: { start: 75, end: 100 },
    };

    const s = qMap[startQ]?.start ?? 0;
    const e = qMap[endQ]?.end ?? 75;
    const width = Math.max(15, e - s);
    return { leftPct: s, widthPct: width };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return { bg: '#D1FAE5', text: '#065F46', bar: '#10B981', border: '#A7F3D0' };
      case 'In Progress': return { bg: '#E0F2FE', text: '#0369A1', bar: '#0284C7', border: '#BAE6FD' };
      case 'Delayed': return { bg: '#FEE2E2', text: '#991B1B', bar: '#EF4444', border: '#FECACA' };
      case 'Upcoming': return { bg: '#F1F5F9', text: '#475569', bar: '#94A3B8', border: '#E2E8F0' };
      default: return { bg: '#F1F5F9', text: '#475569', bar: '#64748B', border: '#E2E8F0' };
    }
  };

  const tileExportData: TileExportData = {
    filename: `MoE_AIP_Implementation_Timeline_${fiscalYear}`,
    reportTitle: `Auto Implementation Timeline - FY ${fiscalYear}`,
    subtitle: 'Annual Implementation Plan (AIP) Milestone & Horizon Delivery',
    headers: ['Activity Code', 'Activity Title', 'Branch / Division', 'Horizon', 'Allocated Budget (LKR Mn)', 'Progress (%)', 'Status'],
    rows: activities.map((act) => [
      act.code,
      act.title,
      act.branchName,
      `${act.startQuarter} – ${act.endQuarter}`,
      act.budgetMn,
      `${act.progressPct}%`,
      act.status,
    ]),
    summaryStats: [
      { label: 'Total Activities', value: activities.length, highlight: true },
      { label: 'Ongoing', value: counts.ongo },
      { label: 'Completed', value: counts.comp },
      { label: 'Delayed', value: counts.delay },
    ],
    copySummaryText: `AIP Implementation Timeline (FY ${fiscalYear}): ${activities.length} activities (${counts.ongo} ongoing, ${counts.comp} completed, ${counts.delay} delayed).`,
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.4rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '1.05rem' }}>📊</span>
            <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#0F172A' }}>
              Auto Implementation Timeline
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
              Tile 01
            </span>
          </div>
          <div style={{ fontSize: '0.68rem', color: '#64748B', marginTop: '1px' }}>
            AIP activities, schedule horizons & quarterly milestone delivery
          </div>
        </div>

        {/* Right side up corner: Filter & Tile Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <input
            type="text"
            placeholder="Filter code or activity..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              fontSize: '0.68rem',
              padding: '0.25rem 0.55rem',
              borderRadius: '6px',
              border: '1px solid #CBD5E1',
              background: '#F8FAFC',
              color: '#1E293B',
              width: '140px',
            }}
          />
          <TileActionMenu
            tileTitle="Auto Implementation Timeline"
            exportData={tileExportData}
            position="right"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.55rem', flexWrap: 'wrap' }}>
        {[
          { id: 'all', label: `All (${counts.all})`, color: '#7B112A' },
          { id: 'Ongoing', label: `Ongoing (${counts.ongo})`, color: '#0284C7' },
          { id: 'Delayed', label: `Delayed (${counts.delay})`, color: '#EF4444' },
          { id: 'Completed', label: `Completed (${counts.comp})`, color: '#10B981' },
          { id: 'Upcoming', label: `Upcoming (${counts.upcom})`, color: '#64748B' },
        ].map((tab) => {
          const isSelected = selectedStatus === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedStatus(tab.id)}
              style={{
                border: 'none',
                background: isSelected ? (tab.color || '#7B112A') : '#F1F5F9',
                color: isSelected ? '#FFFFFF' : '#334155',
                borderRadius: '6px',
                padding: '0.2rem 0.5rem',
                fontSize: '0.65rem',
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

      {/* Quarter Column Header Axis */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.4fr 1fr',
          background: '#F8FAFC',
          borderRadius: '6px',
          padding: '0.3rem 0.5rem',
          border: '1px solid #E2E8F0',
          fontSize: '0.64rem',
          fontWeight: 700,
          color: '#64748B',
          marginBottom: '0.35rem',
        }}
      >
        <div>Activity & Responsible Branch</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', textAlign: 'center' }}>
          <div>Q1</div>
          <div>Q2</div>
          <div>Q3</div>
          <div>Q4</div>
        </div>
      </div>

      {/* Activities List (Scrollable Gantt View) */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.4rem',
          paddingRight: '2px',
          maxHeight: '320px',
        }}
      >
        {filteredList.length > 0 ? (
          filteredList.map((act) => {
            const st = getStatusColor(act.status);
            const { leftPct, widthPct } = getGanttPosition(act.startQuarter, act.endQuarter);

            return (
              <div
                key={act.id}
                onClick={() => setSelectedActivity(act)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.4fr 1fr',
                  alignItems: 'center',
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '6px',
                  padding: '0.4rem 0.5rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#0284C7';
                  e.currentTarget.style.background = '#F0F9FF';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#E2E8F0';
                  e.currentTarget.style.background = '#FFFFFF';
                }}
              >
                {/* Left: Code, Title, Branch */}
                <div style={{ minWidth: 0, paddingRight: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span
                      style={{
                        fontSize: '0.62rem',
                        fontWeight: 800,
                        padding: '1px 4px',
                        borderRadius: '4px',
                        background: st.bg,
                        color: st.text,
                        border: `1px solid ${st.border}`,
                      }}
                    >
                      {act.code}
                    </span>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: '#0F172A',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      title={act.title}
                    >
                      {act.title}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.6rem', color: '#64748B', marginTop: '1px' }}>
                    {act.branchName} • <strong title={`Exact: ${formatRupees(act.budgetMn, true)}`}>Rs. {formatMillion(act.budgetMn)} Mn</strong>
                  </div>
                </div>

                {/* Right: Gantt Quarter Bar */}
                <div style={{ position: 'relative', height: '14px', background: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
                  {/* Grid Quarter Dividers */}
                  <div style={{ position: 'absolute', left: '25%', top: 0, bottom: 0, width: '1px', background: '#E2E8F0' }} />
                  <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: '1px', background: '#E2E8F0' }} />
                  <div style={{ position: 'absolute', left: '75%', top: 0, bottom: 0, width: '1px', background: '#E2E8F0' }} />

                  {/* Scheduled Bar */}
                  <div
                    style={{
                      position: 'absolute',
                      left: `${leftPct}%`,
                      width: `${widthPct}%`,
                      top: '1px',
                      bottom: '1px',
                      background: st.bg,
                      border: `1px solid ${st.border}`,
                      borderRadius: '3px',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Progress Fill */}
                    <div
                      style={{
                        width: `${Math.min(100, act.progressPct)}%`,
                        height: '100%',
                        background: st.bar,
                      }}
                    />
                  </div>

                  {/* Progress % Label */}
                  <span
                    style={{
                      position: 'absolute',
                      right: '4px',
                      top: '1px',
                      fontSize: '0.54rem',
                      fontWeight: 800,
                      color: '#0F172A',
                      lineHeight: '12px',
                    }}
                  >
                    {act.progressPct}%
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#94A3B8', fontSize: '0.74rem' }}>
            No activities matching the selected filter criteria.
          </div>
        )}
      </div>

      {/* Activity Details Modal */}
      {selectedActivity && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={() => setSelectedActivity(null)}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '12px',
              maxWidth: '520px',
              width: '100%',
              padding: '1.25rem',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              border: '1px solid #E2E8F0',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.85rem' }}>
              <div>
                <span
                  style={{
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '6px',
                    background: getStatusColor(selectedActivity.status).bg,
                    color: getStatusColor(selectedActivity.status).text,
                  }}
                >
                  {selectedActivity.code} • {selectedActivity.status}
                </span>
                <h3 style={{ margin: '0.4rem 0 0', fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>
                  {selectedActivity.title}
                </h3>
                <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '2px' }}>
                  {selectedActivity.branchName} • FY {selectedActivity.year || fiscalYear}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedActivity(null)}
                style={{
                  border: 'none',
                  background: '#F1F5F9',
                  borderRadius: '50%',
                  width: '28px',
                  height: '28px',
                  cursor: 'pointer',
                  fontWeight: 700,
                  color: '#475569',
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.65rem', marginBottom: '1rem' }}>
              <div style={{ background: '#F8FAFC', padding: '0.65rem', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '0.65rem', color: '#64748B', fontWeight: 600 }}>Estimated Budget</div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>Rs. {formatMillion(selectedActivity.budgetMn)} Mn</div>
                <div style={{ fontSize: '0.72rem', color: '#0F766E', fontWeight: 600, marginTop: '2px' }}>
                  Exact: {formatRupees(selectedActivity.budgetMn, true)}
                </div>
              </div>
              <div style={{ background: '#F8FAFC', padding: '0.65rem', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '0.65rem', color: '#64748B', fontWeight: 600 }}>Physical Progress</div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0F766E' }}>{selectedActivity.progressPct}% Target Met</div>
              </div>
              <div style={{ background: '#F8FAFC', padding: '0.65rem', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '0.65rem', color: '#64748B', fontWeight: 600 }}>Schedule Horizon</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A' }}>{selectedActivity.startQuarter} to {selectedActivity.endQuarter}</div>
              </div>
              <div style={{ background: '#F8FAFC', padding: '0.65rem', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '0.65rem', color: '#64748B', fontWeight: 600 }}>Responsible Officer</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A' }}>{selectedActivity.responsibleOfficer || 'Divisional Lead'}</div>
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', marginBottom: '0.25rem' }}>Deliverables & Milestone Specifications:</div>
              <div style={{ fontSize: '0.76rem', color: '#1E293B', background: '#F1F5F9', padding: '0.65rem', borderRadius: '6px' }}>
                {selectedActivity.deliverables}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <Link
                href="/monitoring"
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.75rem' }}
                onClick={() => setSelectedActivity(null)}
              >
                Audit in Monitoring →
              </Link>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                style={{ fontSize: '0.75rem', background: '#7B112A', borderColor: '#7B112A' }}
                onClick={() => setSelectedActivity(null)}
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
