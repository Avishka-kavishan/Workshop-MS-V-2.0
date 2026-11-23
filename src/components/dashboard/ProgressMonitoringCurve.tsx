'use client';

import React, { useState, useMemo } from 'react';
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
  onDrillDown?: () => void;
}

const DEFAULT_MONTHLY_DATA: MonthlyProgressPoint[] = [
  { month: 'Jan', physical: 10, financial: 8, workshopsHeld: 4 },
  { month: 'Feb', physical: 28, financial: 22, workshopsHeld: 12 },
  { month: 'Mar', physical: 35, financial: 31, workshopsHeld: 24 },
  { month: 'Apr', physical: 42, financial: 38, workshopsHeld: 35 },
  { month: 'May', physical: 58, financial: 48, workshopsHeld: 52 },
  { month: 'Jun', physical: 66, financial: 56, workshopsHeld: 70 },
  { month: 'Jul', physical: 75, financial: 68, workshopsHeld: 88 },
  { month: 'Aug', physical: 87, financial: 85, workshopsHeld: 105 },
  { month: 'Sep', physical: 90, financial: 88, workshopsHeld: 125 },
  { month: 'Oct', physical: 93, financial: 90, workshopsHeld: 145 },
  { month: 'Nov', physical: 95, financial: 92, workshopsHeld: 168 },
  { month: 'Dec', physical: 98, financial: 95, workshopsHeld: 186 },
];

export default function ProgressMonitoringCurve({
  monthlyData,
  physicalAchievementRate = 73.5,
  budgetUtilizationRate = 31.0,
  nationalExecutionRate = 54.1,
  onDrillDown,
}: ProgressMonitoringCurveProps) {
  const [curveMode, setCurveMode] = useState<'both' | 'physical' | 'financial'>('both');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const data = useMemo(() => {
    return monthlyData && monthlyData.length > 0 ? monthlyData : DEFAULT_MONTHLY_DATA;
  }, [monthlyData]);

  // Baseline Planned Trajectory (Standard approved MoE MTEF S-Curve)
  const plannedTrajectory = [8, 20, 32, 44, 55, 65, 75, 84, 90, 94, 97, 100];

  // Current month index (Nov = 10 in 0-indexed)
  const currentMonthIdx = 10;
  const currentPlanned = plannedTrajectory[currentMonthIdx] || 95;
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
    const x = padLeft + (index / (data.length - 1)) * chartWidth;
    const y = padTop + chartHeight - (Math.min(100, Math.max(0, valuePct)) / 100) * chartHeight;
    return { x, y };
  };

  // Build SVG Path strings
  const plannedPath = useMemo(() => {
    return plannedTrajectory
      .map((val, i) => {
        const { x, y } = getCoordinates(i, val);
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  }, [data]);

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
    rows: data.map((pt, i) => {
      const planned = plannedTrajectory[i] || 0;
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

          <span
            style={{
              fontSize: '0.66rem',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '8px',
              background: '#FFF5F2',
              color: '#80142B',
              border: '1px solid #F2DDD5',
              cursor: 'pointer',
            }}
          >
            Last 12 Months ⌵
          </span>

          <TileActionMenu
            tileTitle="02. Progress Monitoring"
            exportData={tileExportData}
            position="right"
          />
        </div>
      </div>

      {/* 4 Stat Boxes Matching Mockup (All Crews, Planned, Actual, Delay) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.45rem', marginBottom: '0.55rem' }}>
        {/* Stat 1: All Crews 277 (Maroon) */}
        <div style={{ background: '#FFF5F2', border: '1px solid #F2DDD5', borderRadius: '10px', padding: '0.45rem 0.55rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#FCE7E1', color: '#80142B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>
            ✓
          </div>
          <div>
            <div style={{ fontSize: '0.6rem', color: '#64748B', fontWeight: 700 }}>All Crews</div>
            <div style={{ fontSize: '0.96rem', fontWeight: 900, color: '#80142B', lineHeight: 1.1 }}>277</div>
          </div>
        </div>

        {/* Stat 2: Planned 22 (Brown / Earth) */}
        <div style={{ background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: '10px', padding: '0.45rem 0.55rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#FDE68A', color: '#78350F', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>
            📊
          </div>
          <div>
            <div style={{ fontSize: '0.6rem', color: '#78350F', fontWeight: 700 }}>Planned</div>
            <div style={{ fontSize: '0.96rem', fontWeight: 900, color: '#78350F', lineHeight: 1.1 }}>22</div>
          </div>
        </div>

        {/* Stat 3: Actual 74% (Green) */}
        <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '10px', padding: '0.45rem 0.55rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#DCFCE7', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>
            🎯
          </div>
          <div>
            <div style={{ fontSize: '0.6rem', color: '#15803D', fontWeight: 700 }}>Actual</div>
            <div style={{ fontSize: '0.96rem', fontWeight: 900, color: '#16A34A', lineHeight: 1.1 }}>74%</div>
          </div>
        </div>

        {/* Stat 4: Delay 24 (Orange) */}
        <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: '10px', padding: '0.45rem 0.55rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#FFEDD5', color: '#EA580C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>
            ⏰
          </div>
          <div>
            <div style={{ fontSize: '0.6rem', color: '#EA580C', fontWeight: 700 }}>Delay</div>
            <div style={{ fontSize: '0.96rem', fontWeight: 900, color: '#EA580C', lineHeight: 1.1 }}>24</div>
          </div>
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
                fill={i === currentMonthIdx ? '#80142B' : '#64748B'}
                fontSize="8.5"
                fontWeight={i === currentMonthIdx ? '800' : '600'}
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
