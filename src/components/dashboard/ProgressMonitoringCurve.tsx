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
      {/* Header matching User Mockup: 02. Progress Monitoring */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.45rem', flexWrap: 'wrap', gap: '0.4rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.01em' }}>
              02. Progress Monitoring
            </h3>
            <span
              style={{
                fontSize: '0.62rem',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: '12px',
                background: '#DCFCE7',
                color: '#15803D',
                border: '1px solid #86EFAC',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
              }}
            >
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#16A34A', display: 'inline-block' }} />
              Live data
            </span>
          </div>
          <div style={{ fontSize: '0.68rem', color: '#64748B', marginTop: '2px' }}>
            Illustrative planned vs actual cumulative progress trajectory
          </div>
        </div>

        {/* Right side up corner: Performance Gap & Tile Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              padding: '0.18rem 0.55rem',
              borderRadius: '20px',
              background: isAhead ? '#DCFCE7' : '#FEF3C7',
              border: `1px solid ${isAhead ? '#86EFAC' : '#FDE68A'}`,
              fontSize: '0.68rem',
              fontWeight: 800,
              color: isAhead ? '#15803D' : '#B45309',
            }}
            title="Variance between Verified Actual vs Planned Trajectory"
          >
            <span>{isAhead ? '▲' : '▼'}</span>
            <span>Gap: {isAhead ? `+${performanceGap}%` : `${performanceGap}%`}</span>
          </div>
          <TileActionMenu
            tileTitle="02. Progress Monitoring"
            exportData={tileExportData}
            position="right"
          />
        </div>
      </div>

      {/* Mode Switcher Buttons & Legend */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem', flexWrap: 'wrap', gap: '0.4rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          {[
            { id: 'both', label: 'All Curves' },
            { id: 'physical', label: 'Physical %' },
            { id: 'financial', label: 'Financial %' },
          ].map((mode) => {
            const isSelected = curveMode === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => setCurveMode(mode.id as any)}
                style={{
                  border: 'none',
                  background: isSelected ? '#0F766E' : '#F1F5F9',
                  color: isSelected ? '#FFFFFF' : '#334155',
                  borderRadius: '6px',
                  padding: '0.15rem 0.45rem',
                  fontSize: '0.64rem',
                  fontWeight: isSelected ? 800 : 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {mode.label}
              </button>
            );
          })}
        </div>

        {/* Legend Indicators Matching User Reference (Planned = Blue, Actual = Green) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.68rem', fontWeight: 700 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2563EB', display: 'inline-block' }} />
            <span style={{ color: '#2563EB' }}>Planned</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
            <span style={{ color: '#10B981' }}>Actual ({physicalAchievementRate}%)</span>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.45rem', flexWrap: 'wrap', gap: '0.4rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          {[
            { id: 'both', label: 'Combined S-Curve' },
            { id: 'physical', label: 'Physical %' },
            { id: 'financial', label: 'Financial %' },
          ].map((mode) => {
            const isSelected = curveMode === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => setCurveMode(mode.id as any)}
                style={{
                  border: 'none',
                  background: isSelected ? '#0F766E' : '#F1F5F9',
                  color: isSelected ? '#FFFFFF' : '#334155',
                  borderRadius: '6px',
                  padding: '0.18rem 0.5rem',
                  fontSize: '0.64rem',
                  fontWeight: isSelected ? 800 : 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {mode.label}
              </button>
            );
          })}
        </div>

        {/* Legend Indicators */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.64rem', fontWeight: 700 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <span style={{ width: '12px', height: '2px', background: '#F59E0B', borderTop: '1px dashed #F59E0B' }} />
            <span style={{ color: '#D97706' }}>Planned</span>
          </div>
          {(curveMode === 'both' || curveMode === 'physical') && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <span style={{ width: '10px', height: '3px', background: '#0F766E', borderRadius: '1px' }} />
              <span style={{ color: '#0F766E' }}>Physical ({physicalAchievementRate}%)</span>
            </div>
          )}
          {(curveMode === 'both' || curveMode === 'financial') && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <span style={{ width: '10px', height: '3px', background: '#0284C7', borderRadius: '1px' }} />
              <span style={{ color: '#0284C7' }}>Financial ({budgetUtilizationRate}%)</span>
            </div>
          )}
        </div>
      </div>

      {/* Dynamic SVG S-Curve Graph Canvas */}
      <div
        style={{
          position: 'relative',
          background: 'linear-gradient(180deg, #F8FAFC 0%, #FFFFFF 100%)',
          borderRadius: '8px',
          border: '1px solid #E2E8F0',
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
                  stroke="#E2E8F0"
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
                fill={i === currentMonthIdx ? '#0F766E' : '#64748B'}
                fontSize="8.5"
                fontWeight={i === currentMonthIdx ? '800' : '600'}
              >
                {pt.month}
              </text>
            );
          })}

          {/* 1. Planned Trajectory Path (Dashed Amber) */}
          <path
            d={plannedPath}
            fill="none"
            stroke="#2563EB"
            strokeWidth="2"
            strokeDasharray="4 3"
            opacity="0.9"
          />

          {/* 2. Actual Physical Progress Path (Solid Teal) */}
          {(curveMode === 'both' || curveMode === 'physical') && (
            <path
              d={physicalPath}
              fill="none"
              stroke="#10B981"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="drop-shadow(0 2px 4px rgba(15, 118, 110, 0.25))"
            />
          )}

          {/* 3. Actual Financial Progress Path (Solid Royal Blue) */}
          {(curveMode === 'both' || curveMode === 'financial') && (
            <path
              d={financialPath}
              fill="none"
              stroke="#0284C7"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="drop-shadow(0 2px 4px rgba(2, 132, 199, 0.2))"
            />
          )}

          {/* Data Interactive Anchor Nodes */}
          {data.map((pt, i) => {
            const coordPhys = getCoordinates(i, pt.physical);
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
                    stroke="#CBD5E1"
                    strokeWidth="1.2"
                    strokeDasharray="2 2"
                  />
                )}

                {/* Physical Dot */}
                {(curveMode === 'both' || curveMode === 'physical') && (
                  <circle
                    cx={coordPhys.x}
                    cy={coordPhys.y}
                    r={isHover ? 5 : 3.5}
                    fill="#10B981"
                    stroke="#FFFFFF"
                    strokeWidth="1.5"
                  />
                )}

                {/* Financial Dot */}
                {(curveMode === 'both' || curveMode === 'financial') && (
                  <circle
                    cx={getCoordinates(i, pt.financial).x}
                    cy={getCoordinates(i, pt.financial).y}
                    r={isHover ? 4.5 : 3}
                    fill="#0284C7"
                    stroke="#FFFFFF"
                    strokeWidth="1.5"
                  />
                )}
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
            <div>Planned Baseline: <strong>{plannedTrajectory[data.indexOf(hoveredPoint)]}%</strong></div>
            <div style={{ color: '#34D399' }}>Verified Physical: <strong>{hoveredPoint.physical}%</strong></div>
            <div style={{ color: '#93C5FD' }}>Financial Absorption: <strong>{hoveredPoint.financial}%</strong></div>
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
          borderTop: '1px solid #E2E8F0',
          fontSize: '0.68rem',
          flexWrap: 'wrap',
          gap: '0.4rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#16A34A', fontWeight: 700 }}>
            <span>●</span> Ahead: 42
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#0284C7', fontWeight: 700 }}>
            <span>●</span> On-Track: 118
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#DC2626', fontWeight: 700 }}>
            <span>●</span> Delayed: 24
          </span>
        </div>

        <Link
          href="/monitoring"
          style={{
            fontSize: '0.68rem',
            fontWeight: 700,
            color: '#0F766E',
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
