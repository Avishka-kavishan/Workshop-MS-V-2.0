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
  { month: 'Feb', physical: 22, financial: 18 },
  { month: 'Mar', physical: 30, financial: 26 },
  { month: 'Apr', physical: 38, financial: 34 },
  { month: 'May', physical: 45, financial: 42 },
  { month: 'Jun', physical: 52, financial: 50 },
  { month: 'Jul', physical: 60, financial: 58 },
  { month: 'Aug', physical: 67, financial: 66 },
  { month: 'Sep', physical: 71, financial: 70 },
  { month: 'Oct', physical: 73, financial: 74 },
  { month: 'Nov', physical: 74, financial: 79 },
  { month: 'Dec', physical: 78, financial: 84 },
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
        .catch(() => { });
    }
  }, [monthlyData, metrics]);

  // SVG dimensions for the line chart (expanded aspect ratio to fill and balance the card)
  const width = 480;
  const height = 460;
  const paddingX = 38;
  const paddingY = 20;

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

  const yLabels = [0, 25, 50, 75, 100];

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
      { label: 'Physical Progress', value: `${liveMetrics?.physicalAchievementRate || 0}%`, highlight: true },
      { label: 'Financial Disbursement', value: `${liveMetrics?.budgetUtilizationRate || 0}%` },
      { label: 'Variance Gap', value: `${((liveMetrics?.physicalAchievementRate || 0) - (liveMetrics?.budgetUtilizationRate || 0)) >= 0 ? '+' : ''}${(liveMetrics?.physicalAchievementRate || 0) - (liveMetrics?.budgetUtilizationRate || 0)}%` },
      { label: 'Completed Workshops', value: `${liveMetrics?.completedWorkshops || 0}` },
    ],
    copySummaryText: `Physical & Financial Curves (${branchName}): Physical ${liveMetrics?.physicalAchievementRate || 0}% vs Financial ${liveMetrics?.budgetUtilizationRate || 0}%. Net Variance: ${((liveMetrics?.physicalAchievementRate || 0) - (liveMetrics?.budgetUtilizationRate || 0)) >= 0 ? '+' : ''}${(liveMetrics?.physicalAchievementRate || 0) - (liveMetrics?.budgetUtilizationRate || 0)}%.`,
  };

  return (
    <div
      style={{
        background: '#FFFFFF',
        borderRadius: '16px',
        border: '1px solid #F1E5E2',
        padding: '0.75rem 0.95rem 0.65rem',
        boxShadow: '0 4px 16px rgba(128, 20, 43, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        position: 'relative',
        transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
      }}
    >
      {/* ──── Header ──── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.65rem', flexWrap: 'wrap', gap: '0.85rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '1.05rem' }}>🏆</span>
            <h3 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.01em' }}>
              Physical & Financial Achievement Curves
            </h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginTop: '6px' }}>
            <span
              style={{
                fontSize: '0.66rem',
                fontWeight: 700,
                padding: '2px 9px',
                borderRadius: '12px',
                background: '#FFF5F2',
                color: '#80142B',
                border: '1px solid #F2DDD5',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span>📍</span> MOE Data Management Branch
            </span>
          </div>
          <p style={{ margin: '7px 0 0', fontSize: '0.72rem', color: '#64748B', lineHeight: 1.35 }}>
            Physical Implementation vs Financial Disbursement Trajectory
          </p>
        </div>

        {/* Right side up corner: View Mode Segmented Control & Tile Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px', background: '#F8FAFC', padding: '3px', borderRadius: '8px', border: '1px solid #F1E5E2' }}>
            <button
              type="button"
              onClick={() => setActiveFilter('both')}
              style={{
                padding: '0.22rem 0.6rem',
                borderRadius: '6px',
                fontSize: '0.7rem',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background: activeFilter === 'both' ? '#80142B' : 'transparent',
                color: activeFilter === 'both' ? '#FFFFFF' : '#64748B',
                boxShadow: activeFilter === 'both' ? '0 1px 3px rgba(128, 20, 43, 0.2)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('physical')}
              style={{
                padding: '0.22rem 0.6rem',
                borderRadius: '6px',
                fontSize: '0.7rem',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background: activeFilter === 'physical' ? '#80142B' : 'transparent',
                color: activeFilter === 'physical' ? '#FFFFFF' : '#64748B',
                boxShadow: activeFilter === 'physical' ? '0 1px 3px rgba(128, 20, 43, 0.2)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              Physical ({liveMetrics?.physicalAchievementRate ?? 74}%)
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('financial')}
              style={{
                padding: '0.22rem 0.6rem',
                borderRadius: '6px',
                fontSize: '0.7rem',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background: activeFilter === 'financial' ? '#80142B' : 'transparent',
                color: activeFilter === 'financial' ? '#FFFFFF' : '#64748B',
                boxShadow: activeFilter === 'financial' ? '0 1px 3px rgba(128, 20, 43, 0.2)' : 'none',
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

      {/* Legend directly under header controls */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem', marginTop: '0.65rem', marginBottom: '0.75rem', fontSize: '0.74rem', fontWeight: 700 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#80142B', display: 'inline-block' }} />
          <span style={{ color: '#0F172A' }}>Physical</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#E07A2B', display: 'inline-block' }} />
          <span style={{ color: '#0F172A' }}>Financial</span>
        </div>
      </div>

      {/* ──── SVG Dual Line / Area Chart Container (Flex-1 to expand and balance card) ──── */}
      <div style={{ position: 'relative', width: '100%', flex: 1, minHeight: '340px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', overflow: 'hidden' }}>
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '100%', maxHeight: '100%', display: 'block' }}>
          <defs>
            {/* Maroon Gradient for Physical Progress Area */}
            <linearGradient id="chartMaroonGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#80142B" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#80142B" stopOpacity="0.0" />
            </linearGradient>

            {/* Amber Gradient for Financial Progress Area */}
            <linearGradient id="chartAmberGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#E07A2B" stopOpacity="0.16" />
              <stop offset="100%" stopColor="#E07A2B" stopOpacity="0.0" />
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
                  stroke="#F5EBE8"
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
            <path d={physAreaPath} fill="url(#chartMaroonGrad)" />
          )}
          {(activeFilter === 'both' || activeFilter === 'financial') && (
            <path d={finAreaPath} fill="url(#chartAmberGrad)" />
          )}

          {/* Financial Progress Line (Amber) */}
          {(activeFilter === 'both' || activeFilter === 'financial') && (
            <path
              d={finLinePath}
              fill="none"
              stroke="#E07A2B"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Physical Progress Line (Maroon) */}
          {(activeFilter === 'both' || activeFilter === 'physical') && (
            <path
              d={physLinePath}
              fill="none"
              stroke="#80142B"
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
                    stroke="#E07A2B"
                    strokeWidth="2.5"
                    style={{ transition: 'all 0.15s ease' }}
                  />
                )}

                {/* Physical Point (Maroon) */}
                {(activeFilter === 'both' || activeFilter === 'physical') && (
                  <circle
                    cx={pX}
                    cy={pYPhys}
                    r={isHover ? 5.5 : 4}
                    fill="#FFFFFF"
                    stroke="#80142B"
                    strokeWidth="2.5"
                    style={{ transition: 'all 0.15s ease' }}
                  />
                )}

                {/* Month label below */}
                <text
                  x={pX}
                  y={height - 6}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="700"
                  fill={isHover ? '#80142B' : '#64748B'}
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
            <span style={{ color: '#F472B6' }}>● Physical: <strong>{hoveredPoint.physical}%</strong></span>
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
