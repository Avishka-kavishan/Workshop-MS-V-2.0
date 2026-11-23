'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';
import TileActionMenu, { TileExportData } from '@/components/dashboard/TileActionMenu';

export interface MonthlyProgressPoint {
  month: string;
  physical: number;
  financial: number;
  workshopsHeld?: number;
}

interface ProgressMonitoringCurveProps {
  monthlyData?: MonthlyProgressPoint[];
  physicalAchievementRate?: number;
  budgetUtilizationRate?: number;
  nationalExecutionRate?: number;
  totalActivities?: number;
  plannedActivities?: number;
  actualAchievementPct?: number;
  delayedActivities?: number;
  onDrillDown?: () => void;
}

const DEFAULT_MONTHLY_DATA: MonthlyProgressPoint[] = [
  { month: 'Jan', physical: 0, financial: 0, workshopsHeld: 0 },
  { month: 'Feb', physical: 0, financial: 0, workshopsHeld: 0 },
  { month: 'Mar', physical: 0, financial: 0, workshopsHeld: 0 },
  { month: 'Apr', physical: 0, financial: 0, workshopsHeld: 0 },
  { month: 'May', physical: 0, financial: 0, workshopsHeld: 0 },
  { month: 'Jun', physical: 0, financial: 0, workshopsHeld: 0 },
  { month: 'Jul', physical: 0, financial: 0, workshopsHeld: 0 },
  { month: 'Aug', physical: 0, financial: 0, workshopsHeld: 0 },
  { month: 'Sep', physical: 0, financial: 0, workshopsHeld: 0 },
  { month: 'Oct', physical: 0, financial: 0, workshopsHeld: 0 },
  { month: 'Nov', physical: 0, financial: 0, workshopsHeld: 0 },
  { month: 'Dec', physical: 0, financial: 0, workshopsHeld: 0 },
];

export default function ProgressMonitoringCurve({
  monthlyData,
  physicalAchievementRate = 0,
  budgetUtilizationRate = 0,
  nationalExecutionRate = 0,
  totalActivities = 0,
  plannedActivities = 0,
  actualAchievementPct,
  delayedActivities = 0,
  onDrillDown,
}: ProgressMonitoringCurveProps) {
  const [curveMode, setCurveMode] = useState<'both' | 'physical' | 'financial'>('both');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  type TimeframeOption = '12m' | '6m' | '3m' | 'h1' | 'h2' | 'q1' | 'q2' | 'q3' | 'q4';
  const [timeframe, setTimeframe] = useState<TimeframeOption>('12m');
  const [showTimeframeDropdown, setShowTimeframeDropdown] = useState(false);
  const timeframeDropdownRef = useRef<HTMLDivElement>(null);

  const PLANNED_BY_MONTH: Record<string, number> = {
    Jan: 8, Feb: 20, Mar: 32, Apr: 44, May: 55, Jun: 65,
    Jul: 75, Aug: 84, Sep: 90, Oct: 94, Nov: 97, Dec: 100,
  };

  const timeframeLabels: Record<TimeframeOption, string> = {
    '12m': 'Last 12 Months',
    '6m': 'Last 6 Months',
    '3m': 'Last 3 Months',
    'h1': 'First Half (H1)',
    'h2': 'Second Half (H2)',
    'q1': 'Q1 (Jan – Mar)',
    'q2': 'Q2 (Apr – Jun)',
    'q3': 'Q3 (Jul – Sep)',
    'q4': 'Q4 (Oct – Dec)',
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (timeframeDropdownRef.current && !timeframeDropdownRef.current.contains(e.target as Node)) {
        setShowTimeframeDropdown(false);
      }
    };
    if (showTimeframeDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showTimeframeDropdown]);

  const rawData = monthlyData && monthlyData.length > 0 ? monthlyData : DEFAULT_MONTHLY_DATA;
  const data = useMemo(() => {
    if (timeframe === 'h1') return rawData.slice(0, 6);
    if (timeframe === 'h2') return rawData.slice(6, 12);
    if (timeframe === '6m') return rawData.slice(Math.max(0, rawData.length - 6));
    if (timeframe === '3m') return rawData.slice(Math.max(0, rawData.length - 3));
    if (timeframe === 'q1') return rawData.slice(0, 3);
    if (timeframe === 'q2') return rawData.slice(3, 6);
    if (timeframe === 'q3') return rawData.slice(6, 9);
    if (timeframe === 'q4') return rawData.slice(9, 12);
    return rawData;
  }, [rawData, timeframe]);

  // Baseline Planned Trajectory (Standard approved MoE MTEF S-Curve)
  const plannedTrajectory = [8, 20, 32, 44, 55, 65, 75, 84, 90, 94, 97, 100];
  const hasActivities = totalActivities > 0 || plannedActivities > 0 || (monthlyData && monthlyData.some((d) => (d.workshopsHeld || 0) > 0 || d.physical > 0 || d.financial > 0));

  // Current month index (Nov = 10 in 0-indexed)
  const currentMonthIdx = 10;
  const currentPlanned = hasActivities ? (plannedTrajectory[currentMonthIdx] || 95) : 0;
  const currentActual = physicalAchievementRate;
  const performanceGap = Math.round((currentActual - currentPlanned) * 10) / 10;
  const isAhead = performanceGap >= 0;

  // SVG Geometry Calculation (viewBox 0 0 460 190)
  const svgWidth = 460;
  const svgHeight = 190;
  const padLeft = 32;
  const padRight = 16;
  const padTop = 18;
  const padBottom = 26;

  const chartWidth = svgWidth - padLeft - padRight;
  const chartHeight = svgHeight - padTop - padBottom;

  const getCoordinates = (index: number, valuePct: number) => {
    const divisor = Math.max(1, data.length - 1);
    const x = padLeft + (index / divisor) * chartWidth;
    const y = padTop + chartHeight - (Math.min(100, Math.max(0, valuePct)) / 100) * chartHeight;
    return { x, y };
  };

  // Build SVG Path strings
  const plannedPath = useMemo(() => {
    return data
      .map((pt, i) => {
        const plannedVal = hasActivities ? (PLANNED_BY_MONTH[pt.month] ?? 0) : 0;
        const { x, y } = getCoordinates(i, plannedVal);
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  }, [data, hasActivities]);

  const physicalPath = useMemo(() => {
    return data
      .map((pt, i) => {
        const { x, y } = getCoordinates(i, pt.physical);
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  }, [data]);

  const financialPath = useMemo(() => {
    return data
      .map((pt, i) => {
        const { x, y } = getCoordinates(i, pt.financial);
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  }, [data]);

  const hoveredPoint = hoveredIdx !== null ? data[hoveredIdx] : null;

  const tileExportData: TileExportData = {
    filename: 'MoE_Progress_Monitoring_SCurve_2026',
    reportTitle: '02. Progress Monitoring - Cumulative Trajectory',
    subtitle: 'Illustrative planned vs actual cumulative progress trajectory (S-Curve)',
    headers: ['Month', 'Planned Cumulative Progress (%)', 'Actual Physical Progress (%)', 'Financial Disbursement (%)', 'Variance Gap (%)', 'Cumulative Workshops Held'],
    rows: data.map((pt) => {
      const planned = PLANNED_BY_MONTH[pt.month] ?? 0;
      const gap = pt.physical - planned;
      return [
        pt.month,
        `${planned}%`,
        `${pt.physical}%`,
        `${pt.financial}%`,
        `${gap >= 0 ? '+' : ''}${gap}%`,
        pt.workshopsHeld || '-',
      ];
    }),
    summaryStats: [
      { label: 'Physical Progress', value: `${physicalAchievementRate}%`, highlight: true },
      { label: 'Baseline Planned', value: `${currentPlanned}%` },
      { label: 'Performance Gap', value: `${isAhead ? '+' : ''}${performanceGap}%` },
      { label: 'Budget Absorption', value: `${budgetUtilizationRate}%` },
    ],
    copySummaryText: `02. Progress Monitoring: Physical ${physicalAchievementRate}% vs Planned ${currentPlanned}%. Performance Gap: ${isAhead ? '+' : ''}${performanceGap}%. Budget Utilization: ${budgetUtilizationRate}%.`,
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
      {/* Header matching User Mockup: 02. Progress Monitoring */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.55rem', flexWrap: 'wrap', gap: '0.4rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.05rem', color: '#80142B' }}>📈</span>
          <h3 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.01em' }}>
            02. Progress Monitoring
          </h3>
        </div>

        {/* Right: Live Data Badge & Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <span
            style={{
              fontSize: '0.64rem',
              fontWeight: 800,
              padding: '2px 8px',
              borderRadius: '12px',
              background: '#DCFCE7',
              color: '#15803D',
              border: '1px solid #86EFAC',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#16A34A', display: 'inline-block' }} />
            Live data
          </span>

          {/* Tile 02 Interactive Dropdown */}
          <div ref={timeframeDropdownRef} style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setShowTimeframeDropdown((prev) => !prev)}
              style={{
                fontSize: '0.66rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '8px',
                background: showTimeframeDropdown ? '#80142B' : '#FFF5F2',
                color: showTimeframeDropdown ? '#FFFFFF' : '#80142B',
                border: '1px solid',
                borderColor: showTimeframeDropdown ? '#80142B' : '#F2DDD5',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.15s ease',
                boxShadow: showTimeframeDropdown ? '0 2px 6px rgba(128, 20, 43, 0.25)' : 'none',
              }}
              title="Click to filter curve timeframe or jump to other dashboard tiles"
            >
              <span>{timeframeLabels[timeframe] || 'Last 12 Months'}</span>
              <span
                style={{
                  fontSize: '0.6rem',
                  transition: 'transform 0.15s ease',
                  transform: showTimeframeDropdown ? 'rotate(180deg)' : 'rotate(0deg)',
                }}
              >
                ⌵
              </span>
            </button>

            {/* Dropdown Menu */}
            {showTimeframeDropdown && (
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
                {/* Timeframe Filter */}
                <div style={{ padding: '4px 8px 2px', fontSize: '0.6rem', fontWeight: 800, color: '#80142B', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  Filter Timeframe
                </div>

                {[
                  { id: '12m', label: 'Last 12 Months (Full FY)' },
                  { id: '6m', label: 'Last 6 Months' },
                  { id: '3m', label: 'Last 3 Months' },
                  { id: 'h1', label: 'First Half (H1: Jan – Jun)' },
                  { id: 'h2', label: 'Second Half (H2: Jul – Dec)' },
                  { id: 'q1', label: 'Quarter 1 (Q1: Jan – Mar)' },
                  { id: 'q2', label: 'Quarter 2 (Q2: Apr – Jun)' },
                  { id: 'q3', label: 'Quarter 3 (Q3: Jul – Sep)' },
                  { id: 'q4', label: 'Quarter 4 (Q4: Oct – Dec)' },
                ].map((tf) => {
                  const isTfActive = timeframe === tf.id;
                  return (
                    <button
                      key={tf.id}
                      type="button"
                      onClick={() => {
                        setTimeframe(tf.id as any);
                        setShowTimeframeDropdown(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '5px 8px',
                        borderRadius: '6px',
                        background: isTfActive ? 'rgba(128, 20, 43, 0.08)' : 'transparent',
                        border: 'none',
                        color: isTfActive ? '#80142B' : '#334155',
                        fontSize: '0.72rem',
                        fontWeight: isTfActive ? 800 : 500,
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.12s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (!isTfActive) {
                          e.currentTarget.style.background = '#F8FAFC';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isTfActive) {
                          e.currentTarget.style.background = 'transparent';
                        }
                      }}
                    >
                      <span>{tf.label}</span>
                      {isTfActive && <span style={{ color: '#80142B', fontWeight: 800 }}>✓</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <TileActionMenu
            tileTitle="02. Progress Monitoring"
            exportData={tileExportData}
            position="right"
          />
        </div>
      </div>

      {/* Legend Indicators Matching Mockup: Planned = Maroon (#80142B), Actual = Green (#10B981) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.85rem', marginBottom: '0.35rem', fontSize: '0.7rem', fontWeight: 700 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#80142B', display: 'inline-block' }} />
          <span style={{ color: '#0F172A' }}>Planned</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
          <span style={{ color: '#0F172A' }}>Actual</span>
        </div>
      </div>

      {/* Dynamic SVG S-Curve Graph Canvas */}
      <div
        style={{
          position: 'relative',
          background: '#FFFFFF',
          borderRadius: '10px',
          border: '1px solid #F1E5E2',
          padding: '0.35rem 0.25rem',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          style={{ width: '100%', height: '100%', overflow: 'visible' }}
        >
          {/* Horizontal Gridlines & Y-Axis Percentages */}
          {[0, 25, 50, 75, 100].map((pct) => {
            const y = padTop + chartHeight - (pct / 100) * chartHeight;
            return (
              <g key={pct}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={svgWidth - padRight}
                  y2={y}
                  stroke="#F5EBE8"
                  strokeWidth="1"
                  strokeDasharray={pct === 0 || pct === 100 ? 'none' : '3 3'}
                />
                <text
                  x={padLeft - 6}
                  y={y + 3}
                  textAnchor="end"
                  fill="#94A3B8"
                  fontSize="8.5"
                  fontWeight="600"
                >
                  {pct}%
                </text>
              </g>
            );
          })}

          {/* Month X-Axis Ticks */}
          {data.map((pt, i) => {
            const { x } = getCoordinates(i, 0);
            return (
              <text
                key={pt.month}
                x={x}
                y={svgHeight - 8}
                textAnchor="middle"
                fill={pt.month === 'Nov' ? '#80142B' : '#64748B'}
                fontSize="8.5"
                fontWeight={pt.month === 'Nov' ? '800' : '600'}
              >
                {pt.month}
              </text>
            );
          })}

          {/* 1. Planned Trajectory Path (Maroon) */}
          <path
            d={plannedPath}
            fill="none"
            stroke="#80142B"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* 2. Actual Physical Progress Path (Green) */}
          <path
            d={physicalPath}
            fill="none"
            stroke="#10B981"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="drop-shadow(0 2px 4px rgba(16, 185, 129, 0.25))"
          />

          {/* Data Interactive Anchor Nodes */}
          {data.map((pt, i) => {
            const coordPhys = getCoordinates(i, pt.physical);
            const coordPlan = getCoordinates(i, plannedTrajectory[i] || 0);
            const isHover = hoveredIdx === i;

            return (
              <g
                key={pt.month}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
                style={{ cursor: 'pointer' }}
              >
                {/* Vertical Cursor Guide when hovered */}
                {isHover && (
                  <line
                    x1={coordPhys.x}
                    y1={padTop}
                    x2={coordPhys.x}
                    y2={padTop + chartHeight}
                    stroke="#F1E5E2"
                    strokeWidth="1.2"
                    strokeDasharray="2 2"
                  />
                )}

                {/* Planned Node (Maroon) */}
                <circle
                  cx={coordPlan.x}
                  cy={coordPlan.y}
                  r={isHover ? 5 : 3.5}
                  fill="#FFFFFF"
                  stroke="#80142B"
                  strokeWidth="2"
                />

                {/* Actual Physical Node (Green) */}
                <circle
                  cx={coordPhys.x}
                  cy={coordPhys.y}
                  r={isHover ? 5.5 : 4}
                  fill="#10B981"
                  stroke="#FFFFFF"
                  strokeWidth="1.5"
                />
              </g>
            );
          })}
        </svg>

        {/* Hover Floating Data Tooltip */}
        {hoveredPoint && (
          <div
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              background: 'rgba(15, 23, 42, 0.92)',
              backdropFilter: 'blur(6px)',
              color: '#FFFFFF',
              borderRadius: '6px',
              padding: '0.35rem 0.55rem',
              fontSize: '0.66rem',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
              pointerEvents: 'none',
              zIndex: 10,
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
            }}
          >
            <div style={{ fontWeight: 800, color: '#38BDF8', borderBottom: '1px solid rgba(255,255,255,0.15)', paddingBottom: '2px' }}>
              {hoveredPoint.month} Progress Milestone
            </div>
            <div style={{ color: '#F472B6' }}>Planned: <strong>{plannedTrajectory[data.indexOf(hoveredPoint)]}%</strong></div>
            <div style={{ color: '#34D399' }}>Actual: <strong>{hoveredPoint.physical}%</strong></div>
          </div>
        )}
      </div>

      {/* Activity Health Breakdown & Drill-Down Access */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: '0.55rem',
          paddingTop: '0.45rem',
          borderTop: '1px solid #F1E5E2',
          fontSize: '0.68rem',
          flexWrap: 'wrap',
          gap: '0.4rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#16A34A', fontWeight: 800 }}>
            <span>↑</span> Ahead: 42
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#80142B', fontWeight: 800 }}>
            <span>●</span> On-Track: 118
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#DC2626', fontWeight: 800 }}>
            <span>●</span> Delayed: 24
          </span>
        </div>

        <Link
          href="/monitoring"
          style={{
            fontSize: '0.68rem',
            fontWeight: 800,
            color: '#80142B',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '2px',
          }}
        >
          Audit Progress Reports →
        </Link>
      </div>
    </div>
  );
}
