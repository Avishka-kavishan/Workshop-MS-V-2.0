
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import TileActionMenu, { TileExportData } from '@/components/dashboard/TileActionMenu';
import {
  SRI_LANKA_MONITORING_PROVINCES,
  getTrafficLight,
  ProvinceMonitoringData,
  ZoneMonitoringData,
  DivisionMonitoringData,
} from '@/lib/trafficLightUtils';
import {
  SRI_LANKA_ADM0_PATH,
  SRI_LANKA_GEO_PROVINCE_PATHS,
  SRI_LANKA_GEO_PINS,
} from '@/lib/geoBoundariesSriLanka';

export type ProvinceData = ProvinceMonitoringData;

export interface RegionalMapProps {
  workshops?: any[];
  provincesData?: ProvinceMonitoringData[];
  onSelectProvince?: (prov: ProvinceMonitoringData) => void;
}

type DrillLevel = 'province' | 'zone' | 'division';

// ══════════════════════════════════════════════════════════════════════════════
// 9 SRI LANKA PROVINCES - GEOGRAPHICALLY AUTHENTIC TESSELLATING SVG PATHS
// ViewBox: 0 0 240 360 (Normalized coordinate system)
// Seamless boundary matching: adjacent provinces share exact boundary coordinates.
// ══════════════════════════════════════════════════════════════════════════════
export const SRI_LANKA_PROVINCE_PATHS: Record<string, string> = {
  // Northern Province (NP) - Jaffna, Kilinochchi, Mannar, Mullaitivu, Vavuniya
  'org-prov-northern':
    'M 112 18 C 122 18, 130 28, 130 36 C 132 50, 142 68, 148 88 L 126 90 L 100 92 L 72 94 L 52 95 C 50 80, 60 55, 75 30 C 88 18, 102 18, 112 18 Z',

  // North Central Province (NC) - Anuradhapura, Polonnaruwa
  'org-prov-north-central':
    'M 72 94 L 100 92 L 126 90 L 148 88 C 145 105, 142 125, 145 145 L 142 160 L 118 160 L 95 158 L 76 135 L 72 94 Z',

  // North Western Province (NW) - Puttalam, Kurunegala
  'org-prov-north-western':
    'M 52 95 L 72 94 L 76 135 L 95 158 L 102 192 L 98 215 L 60 218 C 54 195, 48 160, 48 140 C 48 120, 50 105, 52 95 Z',

  // Eastern Province (EP) - Trincomalee, Batticaloa, Ampara
  'org-prov-eastern':
    'M 148 88 C 158 100, 168 115, 172 135 C 178 155, 182 185, 182 215 C 180 235, 176 255, 168 275 L 152 235 L 144 195 L 142 160 C 142 140, 145 115, 148 88 Z',

  // Central Province (CP) - Matale, Kandy, Nuwara Eliya
  'org-prov-central':
    'M 95 158 L 118 160 L 142 160 L 144 195 L 132 228 L 108 232 L 98 215 L 102 192 L 95 158 Z',

  // Western Province (WP) - Gampaha, Colombo, Kalutara
  'org-prov-western':
    'M 60 218 L 98 215 L 92 252 L 85 278 L 62 282 C 58 262, 58 240, 60 218 Z',

  // Sabaragamuwa Province (SAB) - Kegalle, Ratnapura
  'org-prov-sabaragamuwa':
    'M 98 215 L 108 232 L 126 252 L 124 288 L 102 290 L 85 278 L 92 252 L 98 215 Z',

  // Uva Province (UVA) - Badulla, Monaragala
  'org-prov-uva':
    'M 132 228 L 144 195 L 152 235 L 168 275 L 146 298 L 124 288 L 126 252 L 132 228 Z',

  // Southern Province (SP) - Galle, Matara, Hambantota
  'org-prov-southern':
    'M 62 282 L 85 278 L 102 290 L 124 288 L 146 298 L 168 275 C 158 298, 142 320, 128 332 C 112 342, 94 344, 82 334 C 70 322, 64 300, 62 282 Z',
};

// ══════════════════════════════════════════════════════════════════════════════
// OFFICIAL SRI LANKAN PROVINCIAL FLAGS
// ══════════════════════════════════════════════════════════════════════════════
export const PROVINCE_FLAG_MAP: Record<string, string> = {
  WP: '/flags/provinces/wp.png',
  CP: '/flags/provinces/cp.png',
  SP: '/flags/provinces/sp.png',
  NC: '/flags/provinces/nc.png',
  NCP: '/flags/provinces/nc.png',
  NW: '/flags/provinces/nw.svg',
  NWP: '/flags/provinces/nw.svg',
  NP: '/flags/provinces/np.svg',
  EP: '/flags/provinces/ep.png',
  SAB: '/flags/provinces/sab.png',
  SGP: '/flags/provinces/sab.png',
  UVA: '/flags/provinces/uva.svg',
  UP: '/flags/provinces/uva.svg',
};

export const getProvinceFlag = (code?: string, name?: string): string => {
  if (code && PROVINCE_FLAG_MAP[code.toUpperCase()]) {
    return PROVINCE_FLAG_MAP[code.toUpperCase()];
  }
  const cleanName = (name || '').toLowerCase();
  if (cleanName.includes('west') && !cleanName.includes('north')) return '/flags/provinces/wp.png';
  if (cleanName.includes('central') && !cleanName.includes('north')) return '/flags/provinces/cp.png';
  if (cleanName.includes('south') && !cleanName.includes('sabar')) return '/flags/provinces/sp.png';
  if (cleanName.includes('north central')) return '/flags/provinces/nc.png';
  if (cleanName.includes('north west') || cleanName.includes('wayamba')) return '/flags/provinces/nw.svg';
  if (cleanName.includes('north')) return '/flags/provinces/np.svg';
  if (cleanName.includes('east')) return '/flags/provinces/ep.png';
  if (cleanName.includes('sabaragamuwa')) return '/flags/provinces/sab.png';
  if (cleanName.includes('uva')) return '/flags/provinces/uva.svg';
  return '/logo-emblem.png';
};

function RegionalMap({ workshops = [], provincesData, onSelectProvince }: RegionalMapProps) {
  const { data: session } = useSession();
  const isLoggedIn = Boolean(session?.user);
  const [provinces, setProvinces] = useState<ProvinceMonitoringData[]>(() => provincesData || SRI_LANKA_MONITORING_PROVINCES);
  const [hoveredProvince, setHoveredProvince] = useState<ProvinceMonitoringData | null>(null);
  const [activeDrillProvince, setActiveDrillProvince] = useState<ProvinceMonitoringData | null>(null);
  const [activeDrillZone, setActiveDrillZone] = useState<ZoneMonitoringData | null>(null);
  const [activeDrillDivision, setActiveDrillDivision] = useState<DivisionMonitoringData | null>(null);
  const [drillLevel, setDrillLevel] = useState<DrillLevel>('province');

  // Traffic light band filter: 'All' | '100%' | '90-99%' | '80-89%' | '70-79%' | '50-69%' | '<50%'
  const [bandFilter, setBandFilter] = useState<'All' | '100%' | '90-99%' | '80-89%' | '70-79%' | '50-69%' | '<50%'>('All');

  // View mode: 'map' or 'table'
  const [viewMode, setViewMode] = useState<'map' | 'table'>('map');

  React.useEffect(() => {
    if (provincesData && provincesData.length > 0) {
      setProvinces(provincesData);
      return;
    }
    fetch('/api/system/telemetry')
      .then((res) => res.json())
      .then((data) => {
        if (data?.provinces && Array.isArray(data.provinces) && data.provinces.length > 0) {
          setProvinces(data.provinces);
        }
      })
      .catch(() => { });
  }, [provincesData]);

  const filteredProvinces = provinces.filter((p) => {
    if (bandFilter === 'All') return true;
    const tl = getTrafficLight(p.progressPct);
    return tl.band === bandFilter;
  });

  const openDrillDown = (prov: ProvinceMonitoringData) => {
    setActiveDrillProvince(prov);
    setActiveDrillZone(prov.zones[0] || null);
    setActiveDrillDivision(prov.zones[0]?.divisions[0] || null);
    setDrillLevel('province');
    if (onSelectProvince) onSelectProvince(prov);
  };

  const closeDrillDown = () => {
    setActiveDrillProvince(null);
    setActiveDrillZone(null);
    setActiveDrillDivision(null);
    setDrillLevel('province');
  };

  const activeProv = hoveredProvince;

  const tileExportData: TileExportData = {
    filename: 'MoE_Province_Wise_Progress_2026',
    reportTitle: 'Province-Wise Administrative Coverage & Progress',
    subtitle: 'National Education Administration - 9 Provincial Education Departments',
    headers: ['Province Code', 'Province Name', 'Capital / HQ', 'Physical Progress (%)', 'Budget Utilization (%)', 'Workshops Count', 'Activities Count', 'Provincial Director', 'RAG Status'],
    rows: provinces.map((p) => [
      p.code,
      p.name,
      p.capital || 'Provincial Capital',
      `${p.progressPct}%`,
      p.budgetAllocatedMn > 0 ? `${Math.round((p.budgetSpentMn / p.budgetAllocatedMn) * 100)}%` : '0%',
      p.workshopsCount || 0,
      p.activitiesCount || 0,
      p.directorName || 'Provincial Director of Education',
      p.progressPct >= 70 ? 'Green (On Track)' : p.progressPct >= 50 ? 'Amber (Needs Attention)' : 'Red (Delayed / Critical)',
    ]),
    summaryStats: [
      { label: 'Provinces Active', value: '9 / 9', highlight: true },
      { label: 'Highest Performing', value: 'Western (88%)' },
      { label: 'Priority Attention', value: 'Northern (44%)' },
      { label: 'Average Coverage', value: '64.8%' },
    ],
    copySummaryText: `MoE Province-Wise Progress:\n` + provinces.map((p) => `${p.code} (${p.name}): ${p.progressPct}%`).join(' | '),
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
        minHeight: 0,
        position: 'relative',
        transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
      }}
    >
      {/* ──── Header ──── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.45rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.01em' }}>
              Province-Wise Progress
            </h3>
          </div>
        </div>

        {/* Right side up corner: View Mode Toggle & Tile Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', background: '#F8FAFC', padding: '3px', borderRadius: '8px', border: '1px solid #F1E5E2' }}>
            <button
              type="button"
              onClick={() => setViewMode('map')}
              style={{
                padding: '0.22rem 0.6rem',
                borderRadius: '6px',
                fontSize: '0.72rem',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background: viewMode === 'map' ? '#80142B' : 'transparent',
                color: viewMode === 'map' ? '#FFFFFF' : '#64748B',
                boxShadow: viewMode === 'map' ? '0 1px 3px rgba(128, 20, 43, 0.2)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              Map
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              style={{
                padding: '0.22rem 0.6rem',
                borderRadius: '6px',
                fontSize: '0.72rem',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background: viewMode === 'table' ? '#80142B' : 'transparent',
                color: viewMode === 'table' ? '#FFFFFF' : '#64748B',
                boxShadow: viewMode === 'table' ? '0 1px 3px rgba(128, 20, 43, 0.2)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              Table
            </button>
          </div>
          <TileActionMenu
            tileTitle="Province-Wise Progress"
            exportData={tileExportData}
            position="right"
          />
        </div>
      </div>

      {/* ──── Map View ──── */}
      {viewMode === 'map' && (
        <div
          style={{
            flex: 1,
            minHeight: 0,
            position: 'relative',
            background: '#FFF5F2',
            borderRadius: '12px',
            border: '1px solid #F2DDD5',
            padding: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {/* ──── Top Left: Cartographic North Arrow Indicator ──── */}
          <div
            style={{
              position: 'absolute',
              top: '10px',
              left: '10px',
              zIndex: 5,
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(8px)',
              border: '1px solid #F2DDD5',
              borderRadius: '8px',
              padding: '4px 7px',
              boxShadow: '0 2px 8px rgba(128, 20, 43, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              userSelect: 'none',
              pointerEvents: 'none',
            }}
            title="Map Orientation: North"
          >
            <span style={{ fontSize: '0.66rem', fontWeight: 900, color: '#0F172A', lineHeight: 1, letterSpacing: '0.04em' }}>
              N
            </span>
            <svg width="12" height="18" viewBox="0 0 12 18" fill="none" style={{ marginTop: '2px' }}>
              <polygon points="6,0 0,8 6,6" fill="#0369A1" />
              <polygon points="6,0 12,8 6,6" fill="#0284C7" />
              <polygon points="6,6 0,8 6,18" fill="#CBD5E1" />
              <polygon points="6,6 12,8 6,18" fill="#94A3B8" />
            </svg>
          </div>

          {/* ──── Top Right: Dedicated Performance Legend Panel ──── */}
          <div
            style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              zIndex: 5,
              width: '102px',
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(8px)',
              border: '1px solid #F2DDD5',
              borderRadius: '10px',
              padding: '0.55rem 0.65rem',
              boxShadow: '0 2px 8px rgba(128, 20, 43, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #F1E5E2', paddingBottom: '3px', marginBottom: '3px' }}>
              <span style={{ fontSize: '0.66rem', fontWeight: 800, color: '#0F172A', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Legend
              </span>
              {bandFilter !== 'All' && (
                <button
                  type="button"
                  onClick={() => setBandFilter('All')}
                  style={{
                    border: 'none',
                    background: '#80142B',
                    color: '#fff',
                    borderRadius: '4px',
                    fontSize: '0.56rem',
                    fontWeight: 700,
                    padding: '1px 4px',
                    cursor: 'pointer',
                  }}
                  title="Reset filter"
                >
                  Reset
                </button>
              )}
            </div>

            {/* 6 Performance Tiers - Percentage Values Only */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {[
                { band: '100%', label: '100%', color: '#16A34A', desc: '100% Target Met' },
                { band: '90-99%', label: '90–99%', color: '#65A30D', desc: '90–99% High Progress' },
                { band: '80-89%', label: '80–89%', color: '#EAB308', desc: '80–89% Satisfactory' },
                { band: '70-79%', label: '70–79%', color: '#F59E0B', desc: '70–79% Attention Needed' },
                { band: '50-69%', label: '50–69%', color: '#F87171', desc: '50–69% Underperforming' },
                { band: '<50%', label: '< 50%', color: '#80142B', desc: '< 50% Critical Deficit' },
              ].map((tier) => {
                const isSelected = bandFilter === tier.band;
                return (
                  <div
                    key={tier.band}
                    onClick={() => setBandFilter(bandFilter === tier.band ? 'All' : tier.band as any)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '7px',
                      padding: '3px 5px',
                      borderRadius: '5px',
                      background: isSelected ? 'rgba(128, 20, 43, 0.12)' : 'transparent',
                      border: isSelected ? '1px solid #80142B' : '1px solid transparent',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    title={`Filter by: ${tier.desc}`}
                  >
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: tier.color,
                        flexShrink: 0,
                        boxShadow: `0 0 3px ${tier.color}66`,
                      }}
                    />
                    <span style={{ fontSize: '0.72rem', fontWeight: isSelected ? 800 : 700, color: isSelected ? '#80142B' : '#334155', whiteSpace: 'nowrap' }}>
                      {tier.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ──── Full Canvas Detailed Sri Lanka Map ──── */}
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: 0,
              minWidth: 0,
              overflow: 'hidden',
              padding: '0.2rem 0.4rem',
            }}
          >
            <svg
              viewBox="0 -8 238 384"
              preserveAspectRatio="xMidYMid meet"
              style={{
                height: '100%',
                maxHeight: '100%',
                width: '100%',
                maxWidth: '100%',
                filter: 'drop-shadow(0 4px 14px rgba(128, 20, 43, 0.12))',
              }}
            >
              {/* Official geoBoundaries ADM0 Coastline Backdrop */}
              <path
                d={SRI_LANKA_ADM0_PATH}
                fill="#FFE8E2"
                stroke="#E8B4A8"
                strokeWidth="2.4"
                strokeLinejoin="round"
                filter="drop-shadow(0 2px 8px rgba(128, 20, 43, 0.1))"
              />

              {/* ── 9 Interactive Province geoBoundaries SVG Polygons ── */}
              {provinces.map((prov) => {
                const pathD = SRI_LANKA_GEO_PROVINCE_PATHS[prov.id] || SRI_LANKA_PROVINCE_PATHS[prov.id];
                if (!pathD) return null;

                const isMatch = bandFilter === 'All' || getTrafficLight(prov.progressPct).band === bandFilter;
                const isHover = hoveredProvince?.id === prov.id;
                const tl = getTrafficLight(prov.progressPct);
                // Monochromatic maroon/burgundy palette matching mockup
                const provinceFill = isMatch ? (bandFilter === 'All' ? '#8D153A' : tl.bg) : '#CBD5E1';

                return (
                  <path
                    key={`poly-${prov.id}`}
                    d={pathD}
                    fill={provinceFill}
                    fillOpacity={
                      !isMatch
                        ? 0.22
                        : isHover
                          ? 0.98
                          : hoveredProvince
                            ? 0.65
                            : 0.92
                    }
                    stroke={isHover ? '#FFFFFF' : '#FFFFFF'}
                    strokeWidth={isHover ? 2.6 : 1.6}
                    strokeLinejoin="round"
                    style={{
                      cursor: 'pointer',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      filter: isHover
                        ? 'drop-shadow(0 3px 8px rgba(0,0,0,0.4)) brightness(1.15)'
                        : 'none',
                    }}
                    onMouseEnter={() => setHoveredProvince(prov)}
                    onMouseLeave={() => setHoveredProvince(null)}
                    onClick={() => openDrillDown(prov)}
                  >
                    <title>{`${prov.name} (${prov.code}) - ${prov.progressPct}% Target Completion`}</title>
                  </path>
                );
              })}

              {/* ── Full Province Name Labels for 9 Provinces ── */}
              {provinces.map((prov) => {
                const [px, py] = SRI_LANKA_GEO_PINS[prov.id] || prov.pin;
                const isMatch = bandFilter === 'All' || getTrafficLight(prov.progressPct).band === bandFilter;
                const isHover = hoveredProvince?.id === prov.id;

                // Split province name (e.g. "Western Province" -> "Western" + "Province") for clean two-line fit
                const baseName = prov.name.replace(/\s+Province$/i, '');

                return (
                  <g
                    key={`label-${prov.id}`}
                    style={{
                      cursor: 'pointer',
                      transition: 'transform 0.18s ease, opacity 0.2s ease',
                      opacity: isMatch ? 1 : 0.25,
                    }}
                    transform={isHover ? `translate(${px}, ${py}) scale(1.16) translate(-${px}, -${py})` : ''}
                    onMouseEnter={() => setHoveredProvince(prov)}
                    onMouseLeave={() => setHoveredProvince(null)}
                    onClick={() => openDrillDown(prov)}
                  >
                    {/* Full Province Name in smaller font */}
                    <text
                      x={px}
                      y={py - 1.5}
                      textAnchor="middle"
                      fill="#FFFFFF"
                      fontSize="4.6"
                      fontWeight="800"
                      fontFamily="system-ui, -apple-system, sans-serif"
                      stroke="#4A0E17"
                      strokeWidth="1.2"
                      paintOrder="stroke"
                      strokeLinejoin="round"
                      style={{ letterSpacing: '0.01em', userSelect: 'none' }}
                    >
                      <tspan x={px} dy="0">{baseName}</tspan>
                      <tspan
                        x={px}
                        dy="4.8"
                        fontSize="3.6"
                        fontWeight="700"
                        fill="#FDE8E8"
                        stroke="#4A0E17"
                        strokeWidth="0.9"
                        paintOrder="stroke"
                        strokeLinejoin="round"
                      >
                        Province
                      </tspan>
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Floating Live Hover Tooltip Card (Matching System Brand Aesthetic) */}
          {activeProv && (() => {
            const tl = getTrafficLight(activeProv.progressPct);
            return (
              <div
                style={{
                  position: 'absolute',
                  bottom: '10px',
                  left: '10px',
                  right: '180px',
                  background: 'rgba(255, 255, 255, 0.97)',
                  backdropFilter: 'blur(10px)',
                  color: '#0F172A',
                  borderRadius: '12px',
                  border: '1px solid #EADBDE',
                  borderLeft: '4px solid #80142B',
                  padding: '0.55rem 0.85rem',
                  fontSize: '0.74rem',
                  boxShadow: '0 8px 24px rgba(128, 20, 43, 0.12), 0 2px 8px rgba(0, 0, 0, 0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  animation: 'fadeIn 0.15s ease',
                  zIndex: 10,
                  pointerEvents: 'none',
                  gap: '0.5rem',
                }}
              >
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.84rem', display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                    <img
                      src={getProvinceFlag(activeProv.code, activeProv.name)}
                      alt=""
                      style={{
                        width: '20px',
                        height: '14px',
                        borderRadius: '3px',
                        objectFit: 'cover',
                        border: '1px solid #E2E8F0',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        flexShrink: 0,
                      }}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    <span style={{ color: '#0F172A' }}>{activeProv.name} ({activeProv.code})</span>
                    <span
                      style={{
                        fontSize: '0.66rem',
                        padding: '0.12rem 0.5rem',
                        borderRadius: '12px',
                        background: tl.lightBg,
                        color: tl.border,
                        border: `1px solid ${tl.border}`,
                        fontWeight: 800,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: tl.bg, display: 'inline-block' }} />
                      {activeProv.progressPct}% • {tl.label}
                    </span>
                  </div>
                  <div style={{ color: '#64748B', fontSize: '0.68rem', marginTop: '2px', lineHeight: 1.3 }}>
                    Capital: <strong style={{ color: '#0F172A' }}>{activeProv.capital}</strong> • Focus: {activeProv.keyInitiative.slice(0, 38)}...
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <span
                    style={{
                      background: '#FFF5F2',
                      border: '1px solid #F2DDD5',
                      color: '#80142B',
                      fontWeight: 800,
                      fontSize: '0.7rem',
                      padding: '0.22rem 0.55rem',
                      borderRadius: '6px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    Click to Inspect ➔
                  </span>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ──── Table / Matrix View ──── */}
      {viewMode === 'table' && (
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', border: '1px solid #E2E8F0', borderRadius: '10px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem' }}>
            <thead style={{ background: '#F8FAFC', position: 'sticky', top: 0, zIndex: 2 }}>
              <tr style={{ borderBottom: '1px solid #E2E8F0', color: '#475569', textAlign: 'left' }}>
                <th style={{ padding: '0.5rem 0.65rem', fontWeight: 700 }}>Province</th>
                <th style={{ padding: '0.5rem 0.65rem', fontWeight: 700 }}>Status</th>
                <th style={{ padding: '0.5rem 0.65rem', fontWeight: 700 }}>Progress</th>
                <th style={{ padding: '0.5rem 0.65rem', fontWeight: 700, textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredProvinces.map((prov) => {
                const tl = getTrafficLight(prov.progressPct);
                return (
                  <tr
                    key={prov.id}
                    style={{ borderBottom: '1px solid #F1F5F9' }}
                  >
                    <td style={{ padding: '0.5rem 0.65rem', fontWeight: 700, color: '#0F172A' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <img
                          src={getProvinceFlag(prov.code, prov.name)}
                          alt=""
                          style={{
                            width: '20px',
                            height: '14px',
                            borderRadius: '3px',
                            objectFit: 'cover',
                            border: '1px solid #E2E8F0',
                            flexShrink: 0,
                          }}
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = 'none';
                          }}
                        />
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: tl.bg }} />
                        <span>{prov.name}</span>
                        <span style={{ fontSize: '0.66rem', color: '#64748B' }}>({prov.code})</span>
                      </div>
                    </td>
                    <td style={{ padding: '0.5rem 0.65rem' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '0.1rem 0.35rem',
                          borderRadius: '4px',
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          background: tl.lightBg,
                          color: tl.badgeColor,
                        }}
                      >
                        {tl.label}
                      </span>
                    </td>
                    <td style={{ padding: '0.5rem 0.65rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <div style={{ width: '45px', height: '6px', background: '#E2E8F0', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min(prov.progressPct, 100)}%`, height: '100%', background: tl.bg, borderRadius: '3px' }} />
                        </div>
                        <span style={{ fontWeight: 800, color: '#0F172A', minWidth: '32px' }}>{prov.progressPct}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '0.5rem 0.65rem', textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => openDrillDown(prov)}
                        style={{
                          background: '#80142B',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '0.2rem 0.5rem',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Inspect ➔
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}



      {/* ════════════════════════════════════════════════════════════════
          MULTI-LEVEL INTERACTIVE DRILL-DOWN MODAL / DRAWER
         ════════════════════════════════════════════════════════════════ */}
      {activeDrillProvince && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1.25rem',
          }}
          onClick={closeDrillDown}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '20px',
              maxWidth: '890px',
              width: '100%',
              maxHeight: '88vh',
              overflowY: 'auto',
              boxShadow: '0 25px 60px -15px rgba(128, 20, 43, 0.25), 0 10px 30px rgba(0, 0, 0, 0.12)',
              border: '1px solid #EADBDE',
              display: 'flex',
              flexDirection: 'column',
              animation: 'fadeIn 0.2s ease',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header (Matching MoE Sri Lanka Brand Identity) */}
            <div
              style={{
                padding: '1.25rem 1.6rem',
                borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
                background: 'linear-gradient(135deg, #7A1228 0%, #8D153A 55%, #5B0E1E 100%)',
                color: '#FFFFFF',
                borderTopLeftRadius: '20px',
                borderTopRightRadius: '20px',
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div
                    style={{
                      width: '46px',
                      height: '32px',
                      borderRadius: '6px',
                      overflow: 'hidden',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.28)',
                      border: '1.5px solid rgba(255, 255, 255, 0.55)',
                      background: 'rgba(255, 255, 255, 0.18)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                    title={`${activeDrillProvince.name} Official Provincial Flag`}
                  >
                    <img
                      src={getProvinceFlag(activeDrillProvince.code, activeDrillProvince.name)}
                      alt={`${activeDrillProvince.name} Flag`}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                      }}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = '/logo-emblem.png';
                      }}
                    />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '0.6rem', letterSpacing: '-0.01em' }}>
                      <span>{activeDrillProvince.name}</span>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          padding: '0.15rem 0.55rem',
                          borderRadius: '16px',
                          background: 'rgba(255, 255, 255, 0.2)',
                          backdropFilter: 'blur(4px)',
                          border: '1px solid rgba(255, 255, 255, 0.35)',
                          color: '#FFFFFF',
                          fontWeight: 800,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                        }}
                      >
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: getTrafficLight(activeDrillProvince.progressPct).bg, display: 'inline-block' }} />
                        {activeDrillProvince.progressPct}% • {getTrafficLight(activeDrillProvince.progressPct).label}
                      </span>
                    </h2>
                    <div style={{ fontSize: '0.74rem', color: '#FCE7E1', marginTop: '3px' }}>
                      Provincial Director: <strong>{activeDrillProvince.directorName}</strong> • Capital: {activeDrillProvince.capital}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closeDrillDown}
                  style={{
                    background: 'rgba(255, 255, 255, 0.16)',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    color: '#FFFFFF',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s ease',
                  }}
                  title="Close modal"
                >
                  ✕
                </button>
              </div>

              {/* Breadcrumb Navigation Bar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  fontSize: '0.76rem',
                  background: 'rgba(0, 0, 0, 0.18)',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '8px',
                  marginTop: '0.5rem',
                }}
              >
                <button
                  type="button"
                  onClick={() => setDrillLevel('province')}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: drillLevel === 'province' ? '#FCD34D' : '#FCE7E1',
                    cursor: 'pointer',
                    fontWeight: drillLevel === 'province' ? 800 : 600,
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span>🏛️</span>
                  <span>{activeDrillProvince.name} (Overview)</span>
                </button>
                <span style={{ color: 'rgba(255, 255, 255, 0.45)' }}>›</span>
                {activeDrillZone && (
                  <button
                    type="button"
                    onClick={() => setDrillLevel('zone')}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: drillLevel === 'zone' ? '#FCD34D' : '#FCE7E1',
                      cursor: 'pointer',
                      fontWeight: drillLevel === 'zone' ? 800 : 600,
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <span>📍</span>
                    <span>{activeDrillZone.name}</span>
                  </button>
                )}
                {drillLevel === 'division' && activeDrillDivision && (
                  <>
                    <span style={{ color: 'rgba(255, 255, 255, 0.45)' }}>›</span>
                    <span style={{ color: '#FCD34D', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>🔍</span>
                      <span>{activeDrillDivision.name} (Issues)</span>
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Modal Body: Level 1 (Province) */}
            {drillLevel === 'province' && (
              <div style={{ padding: '1.35rem 1.6rem', background: '#FFFFFF' }}>
                {/* Summary Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.85rem', marginBottom: '1.15rem' }}>
                  <div style={{ background: '#FFF5F2', padding: '0.85rem 1rem', borderRadius: '12px', border: '1px solid #F2DDD5' }}>
                    <div style={{ fontSize: '0.68rem', color: '#80142B', fontWeight: 800, letterSpacing: '0.04em' }}>OVERALL EXECUTION RATE</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: getTrafficLight(activeDrillProvince.progressPct).bg, marginTop: '2px' }}>
                      {activeDrillProvince.progressPct}%
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#80142B', fontWeight: 700, marginTop: '2px' }}>
                      {getTrafficLight(activeDrillProvince.progressPct).label}
                    </div>
                  </div>

                  <div style={{ background: '#FDF9F7', padding: '0.85rem 1rem', borderRadius: '12px', border: '1px solid #F1E5E2' }}>
                    <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 800, letterSpacing: '0.04em' }}>BUDGET EXPENDITURE</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0F172A', marginTop: '2px' }}>
                      Rs. {activeDrillProvince.budgetSpentMn}M
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#64748B', marginTop: '2px' }}>
                      Allocated: Rs. {activeDrillProvince.budgetAllocatedMn}M
                    </div>
                  </div>

                  <div style={{ background: '#FDF9F7', padding: '0.85rem 1rem', borderRadius: '12px', border: '1px solid #F1E5E2' }}>
                    <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 800, letterSpacing: '0.04em' }}>PLANS & WORKSHOPS</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#80142B', marginTop: '2px' }}>
                      {activeDrillProvince.activitiesCount} Plans
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#64748B', marginTop: '2px' }}>
                      {activeDrillProvince.workshopsCount} Scheduled Workshops
                    </div>
                  </div>
                </div>

                {/* Priority Initiative */}
                <div
                  style={{
                    background: 'linear-gradient(90deg, #FFF5F2 0%, #FFFFFF 100%)',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    fontSize: '0.78rem',
                    color: '#1E293B',
                    marginBottom: '1.25rem',
                    border: '1px solid #F2DDD5',
                    borderLeft: '4px solid #80142B',
                  }}
                >
                  <strong style={{ color: '#80142B' }}>🎯 Provincial Priority Flagship:</strong> {activeDrillProvince.keyInitiative}
                </div>

                {/* Zone Breakdown */}
                <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.92rem', fontWeight: 800, color: '#0F172A' }}>
                  Constituent Educational Zones ({activeDrillProvince.zones.length})
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.85rem' }}>
                  {activeDrillProvince.zones.map((zone) => {
                    const ztl = getTrafficLight(zone.progressPct);
                    const totalIssues = zone.divisions.reduce((acc, div) => acc + div.issues.length, 0);

                    return (
                      <div
                        key={zone.id}
                        style={{
                          background: '#FFFFFF',
                          border: '1px solid #F1E5E2',
                          borderLeft: `4px solid ${ztl.bg}`,
                          borderRadius: '12px',
                          padding: '0.95rem',
                          boxShadow: '0 2px 8px rgba(128, 20, 43, 0.04)',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
                            <span style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0F172A' }}>
                              {zone.name}
                            </span>
                            <span
                              style={{
                                fontSize: '0.7rem',
                                padding: '0.12rem 0.5rem',
                                borderRadius: '12px',
                                background: ztl.lightBg,
                                color: ztl.border,
                                border: `1px solid ${ztl.border}`,
                                fontWeight: 800,
                              }}
                            >
                              {zone.progressPct}%
                            </span>
                          </div>

                          <div style={{ height: '6px', background: '#F1E5E2', borderRadius: '3px', overflow: 'hidden', marginBottom: '0.55rem' }}>
                            <div style={{ width: `${Math.min(zone.progressPct, 100)}%`, height: '100%', background: ztl.bg, borderRadius: '3px' }} />
                          </div>

                          <div style={{ fontSize: '0.72rem', color: '#64748B', display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <span>Budget: Rs. {zone.budgetSpentMn}M / {zone.budgetAllocatedMn}M</span>
                            <span style={{ fontWeight: 600 }}>{zone.divisionsCount} Divisions</span>
                          </div>

                          {totalIssues > 0 ? (
                            <div style={{ fontSize: '0.7rem', color: '#DC2626', fontWeight: 700 }}>
                              ⚠️ {totalIssues} Grass-roots Bottleneck{totalIssues > 1 ? 's' : ''} Flagged
                            </div>
                          ) : (
                            <div style={{ fontSize: '0.7rem', color: '#16A34A', fontWeight: 700 }}>
                              ✓ On Schedule
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setActiveDrillZone(zone);
                            setActiveDrillDivision(zone.divisions[0] || null);
                            setDrillLevel('zone');
                          }}
                          style={{
                            background: '#FFF5F2',
                            border: '1px solid #F2DDD5',
                            borderRadius: '8px',
                            padding: '0.4rem 0.6rem',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            color: '#80142B',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.4rem',
                            marginTop: '0.85rem',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#80142B';
                            e.currentTarget.style.color = '#FFFFFF';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#FFF5F2';
                            e.currentTarget.style.color = '#80142B';
                          }}
                        >
                          <span>Inspect Divisions</span>
                          <span>➔</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Modal Body: Level 2 (Zone ➔ Divisions) */}
            {drillLevel === 'zone' && activeDrillZone && (
              <div style={{ padding: '1.35rem 1.6rem', background: '#FFFFFF' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.15rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                      <span>{activeDrillZone.name}</span>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          padding: '0.12rem 0.5rem',
                          borderRadius: '12px',
                          background: getTrafficLight(activeDrillZone.progressPct).lightBg,
                          color: getTrafficLight(activeDrillZone.progressPct).border,
                          border: `1px solid ${getTrafficLight(activeDrillZone.progressPct).border}`,
                          fontWeight: 800,
                        }}
                      >
                        {activeDrillZone.progressPct}%
                      </span>
                    </h3>
                    <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '3px' }}>
                      Zone Code: <strong>{activeDrillZone.code}</strong> • Budget: Rs. {activeDrillZone.budgetSpentMn}M / {activeDrillZone.budgetAllocatedMn}M
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setDrillLevel('province')}
                    style={{
                      background: '#FFF5F2',
                      border: '1px solid #F2DDD5',
                      borderRadius: '8px',
                      padding: '0.35rem 0.75rem',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      color: '#80142B',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    ← Back to All Zones
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {activeDrillZone.divisions.map((div) => {
                    const dtl = getTrafficLight(div.progressPct);

                    return (
                      <div
                        key={div.id}
                        style={{
                          background: '#FFFFFF',
                          border: '1px solid #F1E5E2',
                          borderLeft: `4px solid ${dtl.bg}`,
                          borderRadius: '12px',
                          padding: '0.95rem 1.1rem',
                          boxShadow: '0 2px 6px rgba(128, 20, 43, 0.03)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                              <span style={{ fontWeight: 800, fontSize: '0.94rem', color: '#0F172A' }}>{div.name}</span>
                              <span style={{ fontSize: '0.68rem', color: '#80142B', background: '#FFF5F2', border: '1px solid #F2DDD5', padding: '0.08rem 0.4rem', borderRadius: '4px', fontWeight: 700 }}>
                                {div.code}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '3px' }}>
                              Schools: <strong>{div.activeSchoolsCount}</strong> • Budget: Rs. {div.budgetSpentMn}M / {div.budgetAllocatedMn}M
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '1.05rem', fontWeight: 900, color: dtl.bg }}>
                                {div.progressPct}%
                              </div>
                              <div style={{ fontSize: '0.66rem', color: dtl.badgeColor, fontWeight: 700 }}>
                                {dtl.label}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setActiveDrillDivision(div);
                                setDrillLevel('division');
                              }}
                              style={{
                                background: div.issues.length > 0 ? '#DC2626' : '#80142B',
                                color: '#FFFFFF',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '0.4rem 0.85rem',
                                fontSize: '0.74rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                boxShadow: '0 2px 6px rgba(128, 20, 43, 0.2)',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              {div.issues.length > 0 ? `Inspect Issues (${div.issues.length})` : 'Inspect'} ➔
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Modal Body: Level 3 (Division ➔ Stalled Issues) */}
            {drillLevel === 'division' && activeDrillDivision && (
              <div style={{ padding: '1.35rem 1.6rem', background: '#FFFFFF' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.15rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                      <span>🔍 {activeDrillDivision.name}</span>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          padding: '0.12rem 0.5rem',
                          borderRadius: '12px',
                          background: getTrafficLight(activeDrillDivision.progressPct).lightBg,
                          color: getTrafficLight(activeDrillDivision.progressPct).border,
                          border: `1px solid ${getTrafficLight(activeDrillDivision.progressPct).border}`,
                          fontWeight: 800,
                        }}
                      >
                        {activeDrillDivision.progressPct}%
                      </span>
                    </h3>
                    <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '3px' }}>
                      Code: <strong>{activeDrillDivision.code}</strong> • Schools: <strong>{activeDrillDivision.activeSchoolsCount}</strong>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setDrillLevel('zone')}
                    style={{
                      background: '#FFF5F2',
                      border: '1px solid #F2DDD5',
                      borderRadius: '8px',
                      padding: '0.35rem 0.75rem',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      color: '#80142B',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    ← Back to Divisions List
                  </button>
                </div>

                {activeDrillDivision.issues.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '12px', color: '#166534' }}>
                    <div style={{ fontSize: '1.8rem', marginBottom: '0.4rem' }}>✅</div>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>No Stalled Activities Found</div>
                    <div style={{ fontSize: '0.76rem', color: '#15803D', marginTop: '3px' }}>
                      All educational projects and teacher workshops are proceeding according to the Ministry AIP.
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    {activeDrillDivision.issues.map((issue) => (
                      <div
                        key={issue.id}
                        style={{
                          background: '#FFFFFF',
                          border: '1px solid #F1E5E2',
                          borderLeft: `4px solid ${issue.severity === 'Critical' ? '#DC2626' : issue.severity === 'High' ? '#EA580C' : '#EAB308'}`,
                          borderRadius: '12px',
                          padding: '1rem',
                          boxShadow: '0 2px 8px rgba(128, 20, 43, 0.04)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.55rem' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                              <span style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0F172A' }}>
                                {issue.title}
                              </span>
                              <span
                                style={{
                                  fontSize: '0.64rem',
                                  padding: '0.1rem 0.45rem',
                                  borderRadius: '6px',
                                  fontWeight: 800,
                                  background: issue.severity === 'Critical' ? '#DC2626' : issue.severity === 'High' ? '#EA580C' : '#EAB308',
                                  color: '#FFFFFF',
                                }}
                              >
                                {issue.severity.toUpperCase()}
                              </span>
                            </div>
                            {issue.voteNumber && (
                              <div style={{ fontSize: '0.68rem', color: '#64748B', marginTop: '2px' }}>
                                Vote: <code>{issue.voteNumber}</code>
                              </div>
                            )}
                          </div>

                          <span style={{ background: '#FFF5F2', color: '#80142B', border: '1px solid #F2DDD5', borderRadius: '6px', padding: '0.15rem 0.5rem', fontSize: '0.68rem', fontWeight: 800 }}>
                            ⏳ {issue.daysDelayed}d delayed
                          </span>
                        </div>

                        <div style={{ background: '#FFF7ED', border: '1px solid #FFEDD5', borderRadius: '8px', padding: '0.65rem', marginBottom: '0.5rem', fontSize: '0.74rem' }}>
                          <strong style={{ color: '#9A3412' }}>Root Cause: </strong>
                          <span style={{ color: '#7C2D12' }}>{issue.rootCause}</span>
                        </div>

                        <div style={{ background: '#F0FDF4', border: '1px solid #DCFCE7', borderRadius: '8px', padding: '0.65rem', marginBottom: '0.5rem', fontSize: '0.74rem' }}>
                          <strong style={{ color: '#166534' }}>Corrective Action: </strong>
                          <span style={{ color: '#14532D' }}>{issue.correctiveAction}</span>
                        </div>

                        <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                          Officer: <strong style={{ color: '#0F172A' }}>{issue.responsibleOfficer}</strong>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Modal Footer */}
            <div
              style={{
                padding: '0.9rem 1.6rem',
                borderTop: '1px solid #F1E5E2',
                background: '#FDF9F7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottomLeftRadius: '20px',
                borderBottomRightRadius: '20px',
              }}
            >
              <div style={{ fontSize: '0.74rem', color: '#64748B' }}>
                Standards: <strong style={{ color: '#80142B' }}>MoE Traffic Light System</strong>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                <button
                  type="button"
                  onClick={closeDrillDown}
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #EADBDE',
                    borderRadius: '8px',
                    padding: '0.4rem 1rem',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    color: '#475569',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#F8FAFC';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#FFFFFF';
                  }}
                >
                  Close
                </button>

                {isLoggedIn && (
                  <Link
                    href={`/workshops?province=${encodeURIComponent(activeDrillProvince.name)}`}
                    style={{
                      background: 'linear-gradient(135deg, #7A1228 0%, #8D153A 100%)',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0.4rem 1.1rem',
                      fontSize: '0.76rem',
                      fontWeight: 800,
                      textDecoration: 'none',
                      boxShadow: '0 2px 8px rgba(128, 20, 43, 0.25)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    View Workshops →
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default React.memo(RegionalMap);
