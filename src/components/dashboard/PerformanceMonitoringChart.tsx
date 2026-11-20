'use client';

import React, { useState } from 'react';
import TileActionMenu, { TileExportData } from '@/components/dashboard/TileActionMenu';

export interface MonthlyProgressPoint {
  month: string;
  physical: number;
  financial: number;
  workshopsHeld?: number;
}

export interface PerformanceMonitoringChartProps {
  branchName?: string;
  monthlyData?: MonthlyProgressPoint[];
  metrics?: {
    physicalAchievementRate?: number;
    budgetUtilizationRate?: number;
    completedWorkshops?: number;
    totalWorkshops?: number;
    totalActualExpenditureMn?: number;
    totalEstimatedBudgetMn?: number;
  };
}

const DEFAULT_MONTHLY_PROGRESS: MonthlyProgressPoint[] = [
  { month: 'Jan', physical: 10, financial: 8 },
  { month: 'Feb', physical: 28, financial: 22 },
  { month: 'Mar', physical: 35, financial: 31 },
  { month: 'Apr', physical: 42, financial: 38 },
  { month: 'May', physical: 58, financial: 48 },
  { month: 'Jun', physical: 66, financial: 56 },
  { month: 'Jul', physical: 75, financial: 68 },
  { month: 'Aug', physical: 87, financial: 85 },
];

function PerformanceMonitoringChart({ branchName = 'MOE ICT Branch', monthlyData, metrics }: PerformanceMonitoringChartProps = {}) {
  const [hoveredPoint, setHoveredPoint] = useState<MonthlyProgressPoint | null>(null);
  const [activeFilter, setActiveFilter] = useState<'both' | 'physical' | 'financial'>('both');
  const [data, setData] = useState<MonthlyProgressPoint[]>(() => monthlyData || DEFAULT_MONTHLY_PROGRESS);
  const [liveMetrics, setLiveMetrics] = useState<any>(() => metrics || null);

  React.useEffect(() => {
    if (monthlyData && monthlyData.length > 0) {
      setData(monthlyData);
    }
  }, [monthlyData]);

  React.useEffect(() => {
    if (metrics) {
      setLiveMetrics(metrics);
    }
  }, [metrics]);

  React.useEffect(() => {
    if (!monthlyData || !metrics) {
      fetch('/api/system/telemetry')
        .then((res) => res.json())
        .then((resJson) => {
          if (resJson?.monthlyProgress && (!monthlyData || monthlyData.length === 0)) {
            setData(resJson.monthlyProgress);
          }
          if (resJson?.metrics && !metrics) {
            setLiveMetrics(resJson.metrics);
          }
        })
        .catch(() => {});
    }
  }, [monthlyData, metrics]);

  // SVG dimensions for the line chart
  const width = 540;
  const height = 220;
  const paddingX = 40;
  const paddingY = 18;

  // Active dataset
  const activeDataset = data.length > 0 ? data : DEFAULT_MONTHLY_PROGRESS;

  // Compute coordinates for monthly physical points
  const physPoints = activeDataset.map((d, index) => {
    const x = paddingX + (index * (width - 2 * paddingX)) / (activeDataset.length - 1);
    const y = height - paddingY - (d.physical / 100) * (height - 2 * paddingY);
    return { ...d, x, y };
  });

  // Compute coordinates for monthly financial points
  const finPoints = activeDataset.map((d, index) => {
    const x = paddingX + (index * (width - 2 * paddingX)) / (activeDataset.length - 1);
    const y = height - paddingY - (d.financial / 100) * (height - 2 * paddingY);
    return { ...d, x, y };
  });

  // Construct SVG Bezier Smooth Curve Paths
  const buildSmoothPath = (pts: { x: number; y: number }[]) => {
    let path = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      const cx1 = p0.x + (p1.x - p0.x) / 2;
      const cy1 = p0.y;
      const cx2 = p0.x + (p1.x - p0.x) / 2;
      const cy2 = p1.y;
      path += ` C ${cx1} ${cy1}, ${cx2} ${cy2}, ${p1.x} ${p1.y}`;
    }
    return path;
  };

  const physLinePath = buildSmoothPath(physPoints);
  const finLinePath = buildSmoothPath(finPoints);

  // Closed paths for area gradient fills
  const physAreaPath = `${physLinePath} L ${physPoints[physPoints.length - 1].x} ${height - paddingY} L ${physPoints[0].x} ${height - paddingY} Z`;
  const finAreaPath = `${finLinePath} L ${finPoints[finPoints.length - 1].x} ${height - paddingY} L ${finPoints[0].x} ${height - paddingY} Z`;

  const yLabels = [0, 20, 50, 100];

  const tileExportData: TileExportData = {
    filename: `MoE_Physical_Financial_Curves_${branchName.replace(/\s+/g, '_')}`,
    reportTitle: `Physical & Financial Achievement Curves - ${branchName}`,
    subtitle: 'Physical Implementation vs Financial Disbursement Trajectory (FY 2026)',
    headers: ['Month', 'Physical Implementation (%)', 'Financial Disbursement (%)', 'Variance Gap (%)', 'Execution Status'],
    rows: activeDataset.map((d) => [
      d.month,
      `${d.physical}%`,
      `${d.financial}%`,
      `${d.physical - d.financial >= 0 ? '+' : ''}${d.physical - d.financial}%`,
      d.physical >= 70 ? 'Optimal' : d.physical >= 40 ? 'Moderate' : 'Initiating',
    ]),
    summaryStats: [
      { label: 'Physical Progress', value: `${liveMetrics?.physicalAchievementRate || 73}%`, highlight: true },
      { label: 'Financial Disbursement', value: `${liveMetrics?.budgetUtilizationRate || 31}%` },
      { label: 'Variance Gap', value: `+${(liveMetrics?.physicalAchievementRate || 73) - (liveMetrics?.budgetUtilizationRate || 31)}%` },
      { label: 'Completed Workshops', value: `${liveMetrics?.completedWorkshops || 56}` },
    ],
    copySummaryText: `Physical & Financial Curves (${branchName}): Physical ${liveMetrics?.physicalAchievementRate || 73}% vs Financial ${liveMetrics?.budgetUtilizationRate || 31}%. Net Variance: +${(liveMetrics?.physicalAchievementRate || 73) - (liveMetrics?.budgetUtilizationRate || 31)}%.`,
  };

  return (
    <div
      style={{
        background: '#FFFFFF',
        borderRadius: '16px',
        border: '1px solid #E2E8F0',
        padding: '0.55rem 0.75rem',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: '100%',
        minHeight: 0,
        position: 'relative',
        transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
      }}
    >
      {/* ──── Header ──── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '1.05rem' }}>📈</span>
            <h3 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.01em' }}>
              Physical & Financial Achievement Curves
            </h3>
            <span
              style={{
                fontSize: '0.64rem',
                fontWeight: 800,
                padding: '1px 7px',
                borderRadius: '12px',
                background: '#F0FDF4',
                color: '#15803D',
                border: '1px solid #BBF7D0',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
              }}
            >
              <span>🏛️</span> {branchName}
            </span>
          </div>
          <p style={{ margin: '2px 0 0', fontSize: '0.71rem', color: '#64748B' }}>
            Physical Implementation vs Financial Disbursement Trajectory
          </p>
        </div>

        {/* Right side up corner: View Mode Segmented Control & Tile Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', background: '#F1F5F9', padding: '3px', borderRadius: '8px' }}>
            <button
              type="button"
              onClick={() => setActiveFilter('both')}
              style={{
                padding: '0.2rem 0.55rem',
                borderRadius: '6px',
                fontSize: '0.7rem',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background: activeFilter === 'both' ? '#7B112A' : 'transparent',
                color: activeFilter === 'both' ? '#FFFFFF' : '#64748B',
                boxShadow: activeFilter === 'both' ? '0 1px 3px rgba(123, 17, 42, 0.25)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('physical')}
              style={{
                padding: '0.2rem 0.55rem',
                borderRadius: '6px',
                fontSize: '0.7rem',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background: activeFilter === 'physical' ? '#FFFFFF' : 'transparent',
                color: activeFilter === 'physical' ? '#0F766E' : '#64748B',
                boxShadow: activeFilter === 'physical' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              Physical ({liveMetrics?.physicalAchievementRate ?? 87}%)
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('financial')}
              style={{
                padding: '0.2rem 0.55rem',
                borderRadius: '6px',
                fontSize: '0.7rem',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background: activeFilter === 'financial' ? '#FFFFFF' : 'transparent',
                color: activeFilter === 'financial' ? '#8D153A' : '#64748B',
                boxShadow: activeFilter === 'financial' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              Financial ({liveMetrics?.financialDisbursementRate ?? 84}%)
            </button>
          </div>
          <TileActionMenu
            tileTitle="Physical & Financial Achievement Curves"
            exportData={tileExportData}
            position="right"
          />
        </div>
      </div>

      {/* ──── SVG Dual Line / Area Chart Container ──── */}
      <div style={{ position: 'relative', width: '100%', overflow: 'hidden' }}>
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
          <defs>
            {/* Teal Gradient for Physical Progress Area */}
            <linearGradient id="chartTealGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0F766E" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#0F766E" stopOpacity="0.0" />
            </linearGradient>

            {/* Amber Gradient for Financial Progress Area */}
            <linearGradient id="chartAmberGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#D97706" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#D97706" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal Reference Lines */}
          {yLabels.map((val) => {
            const y = height - paddingY - (val / 100) * (height - 2 * paddingY);
            return (
              <g key={val}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={width - paddingX}
                  y2={y}
                  stroke="#F1F5F9"
                  strokeWidth="1"
                  strokeDasharray={val === 0 ? '' : '3 3'}
                />
                <text
                  x={paddingX - 10}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="9"
                  fontWeight="600"
                  fill="#94A3B8"
                  fontFamily="system-ui, sans-serif"
                >
                  {val}%
                </text>
              </g>
            );
          })}

          {/* Area Gradients */}
          {(activeFilter === 'both' || activeFilter === 'physical') && (
            <path d={physAreaPath} fill="url(#chartTealGrad)" />
          )}
          {(activeFilter === 'both' || activeFilter === 'financial') && (
            <path d={finAreaPath} fill="url(#chartAmberGrad)" />
          )}

          {/* Financial Progress Line (Amber) */}
          {(activeFilter === 'both' || activeFilter === 'financial') && (
            <path
              d={finLinePath}
              fill="none"
              stroke="#D97706"
              strokeWidth="2.8"
              strokeDasharray={activeFilter === 'both' ? '4 3' : 'none'}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Physical Progress Line (Teal) */}
          {(activeFilter === 'both' || activeFilter === 'physical') && (
            <path
              d={physLinePath}
              fill="none"
              stroke="#0F766E"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Interactive Month Columns & Points */}
          {activeDataset.map((item, index) => {
            const pX = paddingX + (index * (width - 2 * paddingX)) / (activeDataset.length - 1);
            const pYPhys = height - paddingY - (item.physical / 100) * (height - 2 * paddingY);
            const pYFin = height - paddingY - (item.financial / 100) * (height - 2 * paddingY);
            const isHover = hoveredPoint?.month === item.month;

            return (
              <g
                key={item.month}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoveredPoint(item)}
                onMouseLeave={() => setHoveredPoint(null)}
              >
                {/* Invisible hover capture column */}
                <rect
                  x={pX - 18}
                  y={paddingY}
                  width="36"
                  height={height - 2 * paddingY}
                  fill="transparent"
                />

                {/* Financial Point (Amber) */}
                {(activeFilter === 'both' || activeFilter === 'financial') && (
                  <circle
                    cx={pX}
                    cy={pYFin}
                    r={isHover ? 5.5 : 3.5}
                    fill="#FFFFFF"
                    stroke="#D97706"
                    strokeWidth="2.5"
                    style={{ transition: 'all 0.15s ease' }}
                  />
                )}

                {/* Physical Point (Teal) */}
                {(activeFilter === 'both' || activeFilter === 'physical') && (
                  <circle
                    cx={pX}
                    cy={pYPhys}
                    r={isHover ? 5.5 : 4}
                    fill="#FFFFFF"
                    stroke="#0F766E"
                    strokeWidth="2.5"
                    style={{ transition: 'all 0.15s ease' }}
                  />
                )}

                {/* Month label below */}
                <text
                  x={pX}
                  y={height - 4}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="700"
                  fill={isHover ? '#0F172A' : '#64748B'}
                  fontFamily="system-ui, sans-serif"
                >
                  {item.month}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover Point Interactive Tooltip */}
        {hoveredPoint && (
          <div
            style={{
              position: 'absolute',
              top: '6px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: '#0F172A',
              color: '#FFFFFF',
              borderRadius: '8px',
              padding: '0.35rem 0.85rem',
              fontSize: '0.74rem',
              fontWeight: 700,
              boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              pointerEvents: 'none',
              zIndex: 10,
            }}
          >
            <span>{hoveredPoint.month} 2026:</span>
            <span style={{ color: '#2DD4BF' }}>● Physical: <strong>{hoveredPoint.physical}%</strong></span>
            <span style={{ color: '#FBBF24' }}>● Financial: <strong>{hoveredPoint.financial}%</strong></span>
            <span style={{ color: '#94A3B8', fontSize: '0.68rem' }}>
              ({hoveredPoint.physical >= hoveredPoint.financial ? '+' : ''}{(hoveredPoint.physical - hoveredPoint.financial).toFixed(1)}% Gap)
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default React.memo(PerformanceMonitoringChart);
