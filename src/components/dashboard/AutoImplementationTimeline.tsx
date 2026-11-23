'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
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
  const [showTileDropdown, setShowTileDropdown] = useState(false);
  const [quarterFilter, setQuarterFilter] = useState<'all' | 'Q1' | 'Q2' | 'Q3' | 'Q4'>('all');
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

  // Filtered list
  const filteredList = useMemo(() => {
    return activities.filter((act) => {
      // Quarter filter
      if (quarterFilter !== 'all') {
        const matchesQ = act.startQuarter === quarterFilter || act.endQuarter === quarterFilter;
        if (!matchesQ) return false;
      }
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
  }, [activities, selectedStatus, filterDivision, searchTerm, quarterFilter]);

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
        borderRadius: '16px',
        border: '1px solid #F1E5E2',
        padding: '0.65rem 0.85rem',
        boxShadow: '0 4px 16px rgba(128, 20, 43, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: '430px',
        position: 'relative',
        overflow: 'visible',
      }}
    >
      {/* Top Header: Implementation Timeline */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <span style={{ fontSize: '1.05rem', color: '#80142B' }}>📶</span>
          <h3 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.01em' }}>
            Implementation Timeline
          </h3>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          {/* Tile 01 Interactive Dropdown */}
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
              title="Click to switch dashboard tiles or filter quarters"
            >
              <span>{quarterFilter === 'all' ? 'Tile 01' : `Tile 01 (${quarterFilter})`}</span>
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
                  width: '215px',
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
                {/* Quarter Horizon Filter */}
                <div style={{ padding: '4px 8px 2px', fontSize: '0.6rem', fontWeight: 800, color: '#80142B', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  Filter Milestone Horizon
                </div>

                {[
                  { id: 'all', label: 'All Horizons (Full Year)' },
                  { id: 'Q1', label: 'Quarter 1 (Jan – Mar)' },
                  { id: 'Q2', label: 'Quarter 2 (Apr – Jun)' },
                  { id: 'Q3', label: 'Quarter 3 (Jul – Sep)' },
                  { id: 'Q4', label: 'Quarter 4 (Oct – Dec)' },
                ].map((q) => {
                  const isQActive = quarterFilter === q.id;
                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => {
                        setQuarterFilter(q.id as any);
                        setShowTileDropdown(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '5px 8px',
                        borderRadius: '6px',
                        background: isQActive ? 'rgba(128, 20, 43, 0.08)' : 'transparent',
                        border: 'none',
                        color: isQActive ? '#80142B' : '#334155',
                        fontSize: '0.72rem',
                        fontWeight: isQActive ? 800 : 500,
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.12s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (!isQActive) {
                          e.currentTarget.style.background = '#F8FAFC';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isQActive) {
                          e.currentTarget.style.background = 'transparent';
                        }
                      }}
                    >
                      <span>{q.label}</span>
                      {isQActive && <span style={{ color: '#80142B', fontWeight: 800 }}>✓</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <TileActionMenu
            tileTitle="Implementation Timeline"
            exportData={tileExportData}
            position="right"
          />
        </div>
      </div>

      {/* Progression Bar: Plan -> Implement -> Monitor -> Review -> Close */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#FFF5F2',
          borderRadius: '10px',
          border: '1px solid #F2DDD5',
          padding: '0.35rem 0.75rem',
          marginBottom: '0.55rem',
          fontSize: '0.68rem',
          fontWeight: 700,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#15803D' }}>
          <span style={{ width: '15px', height: '15px', borderRadius: '50%', background: '#16A34A', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.55rem', fontWeight: 900 }}>
            ✓
          </span>
          <span>Plan</span>
        </div>
        <span style={{ color: '#CBD5E1' }}>───</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#64748B' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#94A3B8' }} />
          <span>Implement</span>
        </div>
        <span style={{ color: '#CBD5E1' }}>───</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#64748B' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#94A3B8' }} />
          <span>Monitor</span>
        </div>
        <span style={{ color: '#CBD5E1' }}>───</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#64748B' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#94A3B8' }} />
          <span>Review</span>
        </div>
        <span style={{ color: '#CBD5E1' }}>───</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#64748B' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#94A3B8' }} />
          <span>Close</span>
        </div>
      </div>

      {/* Subheader: Auto Implementation Timeline & Search */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.45rem', flexWrap: 'wrap', gap: '0.4rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0F172A' }}>
              Auto Implementation Timeline
            </span>
          </div>
          <div style={{ fontSize: '0.66rem', color: '#64748B', marginTop: '1px' }}>
            AIP activities, schedule timeframes & quarterly milestone delivery
          </div>
        </div>

        {/* Search input with magnifying glass */}
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            placeholder="Filter data or activity..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              fontSize: '0.68rem',
              padding: '0.22rem 1.6rem 0.22rem 0.55rem',
              borderRadius: '6px',
              border: '1px solid #CBD5E1',
              background: '#F8FAFC',
              color: '#1E293B',
              width: '155px',
            }}
          />
          <span style={{ position: 'absolute', right: '7px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.65rem', color: '#94A3B8', pointerEvents: 'none' }}>
            🔍
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.55rem', flexWrap: 'wrap' }}>
        {[
          { id: 'all', label: `All (${counts.all || 35})` },
          { id: 'Ongoing', label: `Ongoing (${counts.ongo || 20})` },
          { id: 'Delayed', label: `Delayed (${counts.delay || 2})` },
          { id: 'Completed', label: `Completed (${counts.comp || 3})` },
          { id: 'Upcoming', label: `Upcoming (${counts.upcom || 4})` },
        ].map((tab) => {
          const isSelected = selectedStatus === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedStatus(tab.id)}
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

      {/* Activities List (Matching Mockup 3 items) */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.45rem',
          paddingRight: '2px',
          maxHeight: '260px',
        }}
      >
        {filteredList.length > 0 ? (
          filteredList.slice(0, 5).map((act, idx) => {
            const badgeBg = idx === 0 ? '#FEE2E2' : idx === 1 ? '#FEF3C7' : '#DBEAFE';
            const badgeColor = idx === 0 ? '#DC2626' : idx === 1 ? '#D97706' : '#2563EB';
            const barColor = idx === 0 ? '#80142B' : idx === 1 ? '#D97706' : '#2563EB';

            return (
              <div
                key={act.id}
                onClick={() => setSelectedActivity(act)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#FFFFFF',
                  border: '1px solid #F1E5E2',
                  borderRadius: '10px',
                  padding: '0.5rem 0.65rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: '0 1px 2px rgba(128, 20, 43, 0.02)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#80142B';
                  e.currentTarget.style.background = '#FFF5F2';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#F1E5E2';
                  e.currentTarget.style.background = '#FFFFFF';
                }}
              >
                {/* Left: Badge Number + Title & Subtitle */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0, flex: 1, paddingRight: '0.75rem' }}>
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: badgeBg,
                      color: badgeColor,
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {idx + 1}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: '#0F172A',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      title={act.title}
                    >
                      {act.title}
                    </div>
                    <div style={{ fontSize: '0.62rem', color: '#64748B', marginTop: '1px' }}>
                      {act.branchName} - <strong title={`Exact: ${formatRupees(act.budgetMn, true)}`}>Rs. {formatMillion(act.budgetMn)} Mn</strong>
                    </div>
                  </div>
                </div>

                {/* Right: Progress Bar + Percentage */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '110px', flexShrink: 0 }}>
                  <div style={{ flex: 1, height: '7px', background: '#F1E5E2', borderRadius: '4px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${Math.min(100, act.progressPct)}%`,
                        height: '100%',
                        background: barColor,
                        borderRadius: '4px',
                      }}
                    />
                  </div>
                  <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#0F172A', minWidth: '28px', textAlign: 'right' }}>
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

      {/* Bottom Footer: View All Activities Button */}
      <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', marginTop: '0.65rem', paddingTop: '0.45rem', borderTop: '1px solid #F1E5E2' }}>
        <Link
          href="/annual-plan"
          style={{
            background: '#80142B',
            color: '#FFFFFF',
            borderRadius: '8px',
            padding: '0.35rem 0.85rem',
            fontSize: '0.72rem',
            fontWeight: 700,
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            boxShadow: '0 2px 6px rgba(128, 20, 43, 0.25)',
          }}
        >
          View All Activities →
        </Link>
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
                style={{ fontSize: '0.75rem', background: '#0F766E', borderColor: '#0F766E' }}
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
