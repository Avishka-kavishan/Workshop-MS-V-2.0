'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

export interface AipLifecycleStage {
  stageNumber: number;
  name: string;
  shortName: string;
  actor: 'All Branches (All)' | 'Planning Branch (P)' | 'Planning & Treasury (P)' | 'Policy Planning Branch (P)' | 'All Branches & Monitoring (All)';
  actorShort: '(All)' | '(P)';
  description: string;
  deliverables: string[];
  link: string;
  linkLabel: string;
  status: 'completed' | 'active' | 'upcoming';
  metrics?: Record<string, any>;
}

interface AipTrackerTabProps {
  selectedYear: string;
  onSelectYear?: (year: string) => void;
}

export default function AipTrackerTab({ selectedYear, onSelectYear }: AipTrackerTabProps) {
  const { data: session } = useSession();
  const user = session?.user as any;
  const isAuthorizedToAdvance = Boolean(
    user?.isSuperAdmin ||
    user?.username === 'superadmin' ||
    user?.username === 'admin' ||
    user?.roleName?.includes('Administrator') ||
    user?.functionalCategory === 'Planning' ||
    user?.functionalCategory === 'Monitoring' ||
    user?.username === 'planning.officer' ||
    user?.username === 'monitoring.officer'
  );

  const [loading, setLoading] = useState(true);
  const [trackerData, setTrackerData] = useState<{
    financialYear: any;
    currentStageNumber: number;
    activeStage: AipLifecycleStage;
    stages: AipLifecycleStage[];
    availableYears: { year: string; status: string; isCurrent: boolean; currentStage: number }[];
  } | null>(null);

  const [selectedStageNum, setSelectedStageNum] = useState<number>(5);
  const [updatingStage, setUpdatingStage] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchTrackerData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/monitoring/aip-tracker?year=${selectedYear}`);
      if (res.ok) {
        const json = await res.json();
        setTrackerData(json);
        setSelectedStageNum(json.currentStageNumber || 5);
      }
    } catch (err: any) {
      console.error('Failed to load AIP tracker data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrackerData();
  }, [selectedYear]);

  const handleUpdateCurrentStage = async (newStageNum: number) => {
    try {
      setUpdatingStage(true);
      setSuccessMessage(null);
      setErrorMessage(null);

      const res = await fetch('/api/monitoring/aip-tracker', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: selectedYear,
          stageNumber: newStageNum,
        }),
      });

      const json = await res.json();
      if (res.ok) {
        setSuccessMessage(json.message || `AIP Tracker current stage updated to Stage ${newStageNum}.`);
        fetchTrackerData();
        setTimeout(() => setSuccessMessage(null), 4500);
      } else {
        setErrorMessage(json.error || 'Failed to update current stage.');
        setTimeout(() => setErrorMessage(null), 4500);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error updating stage.');
    } finally {
      setUpdatingStage(false);
    }
  };

  const currentStageNumber = trackerData?.currentStageNumber || 5;
  const stages = trackerData?.stages || [];
  const selectedStage = stages.find((s) => s.stageNumber === selectedStageNum) || stages[0];

  return (
    <div style={{ color: '#1E293B' }}>
      {/* CSS Pulse Animation for Active Circle */}
      <style>{`
        @keyframes aipCirclePulse {
          0% {
            transform: scale(0.96);
            box-shadow: 0 0 0 0 rgba(0, 83, 78, 0.75);
          }
          70% {
            transform: scale(1.06);
            box-shadow: 0 0 0 14px rgba(0, 83, 78, 0);
          }
          100% {
            transform: scale(0.96);
            box-shadow: 0 0 0 0 rgba(0, 83, 78, 0);
          }
        }
        @keyframes subtleGlow {
          0%, 100% { border-color: #00534E; }
          50% { border-color: #10B981; }
        }
      `}</style>

      {/* Top Header Card with Integrated Financial Year Selector */}
      <div
        className="card"
        style={{
          padding: '1.25rem 1.5rem',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #F8FAFC 0%, #FFFFFF 100%)',
          border: '1px solid #E2E8F0',
          marginBottom: '1.5rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <span style={{ fontSize: '1.5rem' }}>🗺️</span>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
                Track Annual Implementation Plan (AIP) Lifecycle
              </h2>
            </div>
            <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.84rem', color: '#64748B', lineHeight: 1.5 }}>
              National 7-Stage Governance Workflow tracking AIP progression from initial branch budget preparation to Parliamentary vote appropriation, PPB approval, and continuous M&E oversight.
            </p>
          </div>

          {/* Year Selector Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#F1F5F9', padding: '0.3rem 0.4rem', borderRadius: '10px' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#475569', padding: '0 0.4rem' }}>
              Financial Year:
            </span>
            {(trackerData?.availableYears || [
              { year: '2027', status: 'Planning', isCurrent: false, currentStage: 5 },
              { year: '2026', status: 'Active', isCurrent: true, currentStage: 7 },
              { year: '2025', status: 'Closed', isCurrent: false, currentStage: 7 },
              { year: '2028', status: 'Planning', isCurrent: false, currentStage: 1 },
            ]).map((fy) => {
              const active = selectedYear === fy.year;
              return (
                <button
                  key={fy.year}
                  type="button"
                  onClick={() => onSelectYear && onSelectYear(fy.year)}
                  style={{
                    padding: '0.35rem 0.85rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: active ? '#00534E' : 'transparent',
                    color: active ? '#FFFFFF' : '#475569',
                    fontSize: '0.8rem',
                    fontWeight: active ? 800 : 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: active ? '0 2px 6px rgba(0, 83, 78, 0.25)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <span>FY {fy.year}</span>
                  {fy.isCurrent && (
                    <span style={{ fontSize: '0.62rem', background: active ? '#10B981' : '#E2E8F0', color: active ? '#FFFFFF' : '#334155', padding: '0.1rem 0.35rem', borderRadius: '4px', fontWeight: 800 }}>
                      Current
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Current Active Stage Quick Banner */}
        <div
          style={{
            marginTop: '1.1rem',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            background: '#F0FDFA',
            border: '1px solid #CCFBF1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: '#00534E',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: '0.95rem',
                animation: 'aipCirclePulse 2.4s infinite',
              }}
            >
              {currentStageNumber}
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#00534E', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Currently Active Stage in FY {selectedYear}
              </div>
              <div style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0F172A' }}>
                Stage {currentStageNumber}: {stages.find((s) => s.stageNumber === currentStageNumber)?.name || 'In Progress'}
                <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#00534E', marginLeft: '0.5rem', background: 'rgba(0, 83, 78, 0.1)', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                  {stages.find((s) => s.stageNumber === currentStageNumber)?.actor}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Stage Switcher for Authorized Officers */}
          {isAuthorizedToAdvance && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#475569' }}>
                Change Active Stage:
              </span>
              <select
                disabled={updatingStage}
                value={currentStageNumber}
                onChange={(e) => handleUpdateCurrentStage(Number(e.target.value))}
                style={{
                  padding: '0.35rem 0.65rem',
                  borderRadius: '6px',
                  border: '1px solid #00534E',
                  background: '#FFFFFF',
                  color: '#00534E',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {stages.map((st) => (
                  <option key={st.stageNumber} value={st.stageNumber}>
                    Stage {st.stageNumber}: {st.name} ({st.actorShort})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Success / Error Notifications */}
        {successMessage && (
          <div style={{ marginTop: '0.75rem', padding: '0.55rem 0.85rem', borderRadius: '6px', background: '#ECFDF5', color: '#065F46', fontSize: '0.8rem', fontWeight: 700, border: '1px solid #A7F3D0' }}>
            ✓ {successMessage}
          </div>
        )}
        {errorMessage && (
          <div style={{ marginTop: '0.75rem', padding: '0.55rem 0.85rem', borderRadius: '6px', background: '#FFF1F2', color: '#BE123C', fontSize: '0.8rem', fontWeight: 700, border: '1px solid #FECDD3' }}>
            ⚠️ {errorMessage}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {/* 7-STAGE VISUAL LIFECYCLE FLOW (HAND-DRAWN ARCHITECTURE ACCURACY)          */}
      {/* ══════════════════════════════════════════════════════════════════════════ */}
      <div
        className="card"
        style={{
          padding: '1.75rem',
          borderRadius: '16px',
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          marginBottom: '1.75rem',
          boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.75rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>
              National Education AIP Progression Pipeline
            </h3>
            <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '2px' }}>
              The pulsating glowing circle marks the exact active position of FY {selectedYear} AIP right now. Click any stage box to inspect deliverables.
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.74rem', fontWeight: 700 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#059669' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10B981' }} />
              Completed
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#00534E' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#00534E', animation: 'aipCirclePulse 2s infinite' }} />
              Current Stage (You Are Here)
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#94A3B8' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#CBD5E1' }} />
              Upcoming
            </span>
          </div>
        </div>

        {/* Diagram Flow Container */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative' }}>
          
          {/* ── ROW 1: Stages ① -> ② -> ③ ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr auto 1fr', alignItems: 'center', gap: '0.75rem' }}>
            {/* Box 1 */}
            {renderStageCard(stages[0], 1)}

            {/* Arrow 1 -> 2 */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: currentStageNumber > 1 ? '#00534E' : '#CBD5E1', fontSize: '1.4rem', fontWeight: 900 }}>
              ➔
            </div>

            {/* Box 2 */}
            {renderStageCard(stages[1], 2, '📥 Budget Speech Injected')}

            {/* Arrow 2 -> 3 */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: currentStageNumber > 2 ? '#00534E' : '#CBD5E1', fontSize: '1.4rem', fontWeight: 900 }}>
              ➔
            </div>

            {/* Box 3 */}
            {renderStageCard(stages[2], 3, '🏛️ Parliamentary Vote Approval')}
          </div>

          {/* ── Vertical Connector: Row 1 (Box 3) down to Row 2 (Box 4) ── */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingRight: '12%', margin: '-0.5rem 0' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: currentStageNumber >= 4 ? '#00534E' : '#CBD5E1' }}>
              <div style={{ width: '3px', height: '24px', background: currentStageNumber >= 4 ? '#00534E' : '#CBD5E1' }} />
              <div style={{ fontSize: '1.2rem', marginTop: '-4px', fontWeight: 900 }}>↓</div>
            </div>
          </div>

          {/* ── ROW 2: Stages ⑥ <- ⑤ <- ④ (Reverse Snake Flow as Drawn) ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr auto 1fr', alignItems: 'center', gap: '0.75rem' }}>
            {/* Box 6 */}
            {renderStageCard(stages[5], 6, '📑 Gazetted Ministry AIP')}

            {/* Arrow 5 -> 6 (Pointing Left) */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: currentStageNumber > 5 ? '#00534E' : '#CBD5E1', fontSize: '1.4rem', fontWeight: 900 }}>
              ⬅
            </div>

            {/* Box 5 */}
            {renderStageCard(stages[4], 5)}

            {/* Arrow 4 -> 5 (Pointing Left) */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: currentStageNumber > 4 ? '#00534E' : '#CBD5E1', fontSize: '1.4rem', fontWeight: 900 }}>
              ⬅
            </div>

            {/* Box 4 */}
            {renderStageCard(stages[3], 4)}
          </div>

          {/* ── Vertical Connector: Row 2 (Box 6) down to Row 3 (Box 7) ── */}
          <div style={{ display: 'flex', justifyContent: 'flex-start', paddingLeft: '12%', margin: '-0.5rem 0' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: currentStageNumber >= 7 ? '#00534E' : '#CBD5E1' }}>
              <div style={{ width: '3px', height: '24px', background: currentStageNumber >= 7 ? '#00534E' : '#CBD5E1' }} />
              <div style={{ fontSize: '1.2rem', marginTop: '-4px', fontWeight: 900 }}>↓</div>
            </div>
          </div>

          {/* ── ROW 3: Stage ⑦ Integrated Implementation & Monitoring ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '0.75rem' }}>
            {renderStage7Card(stages[6])}
          </div>

        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {/* STAGE INSPECTOR & ACTION HUB (DETAILS OF CLICKED STAGE)                    */}
      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {selectedStage && (
        <div
          className="card"
          style={{
            padding: '1.5rem',
            borderRadius: '14px',
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderLeft: `5px solid ${
              selectedStage.stageNumber === currentStageNumber
                ? '#00534E'
                : selectedStage.stageNumber < currentStageNumber
                ? '#10B981'
                : '#94A3B8'
            }`,
            boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: selectedStage.stageNumber === currentStageNumber ? '#00534E' : '#F1F5F9',
                    color: selectedStage.stageNumber === currentStageNumber ? '#FFFFFF' : '#334155',
                    fontWeight: 900,
                    fontSize: '0.85rem',
                  }}
                >
                  {selectedStage.stageNumber}
                </span>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0F172A' }}>
                  {selectedStage.name}
                </h3>
                <span
                  style={{
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    padding: '0.15rem 0.55rem',
                    borderRadius: '6px',
                    background:
                      selectedStage.stageNumber === currentStageNumber
                        ? '#CCFBF1'
                        : selectedStage.stageNumber < currentStageNumber
                        ? '#DCFCE7'
                        : '#F1F5F9',
                    color:
                      selectedStage.stageNumber === currentStageNumber
                        ? '#00534E'
                        : selectedStage.stageNumber < currentStageNumber
                        ? '#15803D'
                        : '#64748B',
                  }}
                >
                  {selectedStage.stageNumber === currentStageNumber
                    ? '📍 CURRENT ACTIVE STAGE'
                    : selectedStage.stageNumber < currentStageNumber
                    ? '✓ COMPLETED'
                    : '⏳ UPCOMING STAGE'}
                </span>
              </div>
              <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.85rem', color: '#475569', lineHeight: 1.5, maxWidth: '780px' }}>
                {selectedStage.description}
              </p>
            </div>

            {/* Quick Action Link to System Module */}
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <Link
                href={selectedStage.link}
                style={{
                  background: '#00534E',
                  color: '#FFFFFF',
                  padding: '0.55rem 1.15rem',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  boxShadow: '0 2px 6px rgba(0, 83, 78, 0.25)',
                }}
              >
                <span>🚀</span>
                <span>Open {selectedStage.linkLabel} →</span>
              </Link>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginTop: '1rem', borderTop: '1px solid #F1F5F9', paddingTop: '1rem' }}>
            {/* Column 1: Responsible Stakeholder & FRS Role */}
            <div style={{ background: '#F8FAFC', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                Operational Stakeholders
              </div>
              <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#00534E' }}>
                {selectedStage.actor}
              </div>
              <div style={{ fontSize: '0.74rem', color: '#475569', marginTop: '0.2rem' }}>
                {selectedStage.actor.includes('All')
                  ? 'Applies across all Line Ministry Branches, National Institutes (NIE/EPD), and Provincial Education Departments.'
                  : 'Managed directly by the Policy Planning Branch (PPB) under the Director of Planning.'}
              </div>
            </div>

            {/* Column 2: Key Deliverables Checklist */}
            <div style={{ background: '#F8FAFC', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                Key Deliverables & Artifacts
              </div>
              <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.76rem', color: '#334155', lineHeight: 1.6 }}>
                {selectedStage.deliverables.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>

            {/* Column 3: Live System Statistics for FY */}
            <div style={{ background: '#F8FAFC', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                FY {selectedYear} System Records
              </div>
              {renderStageMetricsSummary(selectedStage)}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ── Helper: Render Box 1 to 6 Card ──────────────────────────────────────────
  function renderStageCard(stage: AipLifecycleStage | undefined, stageNumber: number, topBadgeNote?: string) {
    if (!stage) return <div />;

    const isActive = stage.stageNumber === currentStageNumber;
    const isCompleted = stage.stageNumber < currentStageNumber;
    const isSelected = stage.stageNumber === selectedStageNum;

    return (
      <div
        role="button"
        tabIndex={0}
        onClick={() => setSelectedStageNum(stage.stageNumber)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedStageNum(stage.stageNumber); }}
        style={{
          borderRadius: '12px',
          border: isActive
            ? '2.5px solid #00534E'
            : isSelected
            ? '2px solid #0284C7'
            : isCompleted
            ? '1.5px solid #A7F3D0'
            : '1.5px dashed #CBD5E1',
          background: isActive
            ? '#F0FDFA'
            : isCompleted
            ? '#F0FDF4'
            : '#FFFFFF',
          padding: '1.1rem 1rem',
          cursor: 'pointer',
          position: 'relative',
          transition: 'all 0.18s ease-in-out',
          boxShadow: isActive
            ? '0 8px 20px -3px rgba(0, 83, 78, 0.22)'
            : isSelected
            ? '0 4px 12px rgba(2, 132, 199, 0.15)'
            : '0 2px 6px rgba(0,0,0,0.02)',
          transform: isActive || isSelected ? 'translateY(-2px)' : 'none',
        }}
      >
        {/* Top Note / Speech / Approval Banner if applicable */}
        {topBadgeNote && (
          <div
            style={{
              position: 'absolute',
              top: '-10px',
              left: '12px',
              background: '#0F172A',
              color: '#F8FAFC',
              fontSize: '0.64rem',
              fontWeight: 800,
              padding: '0.15rem 0.5rem',
              borderRadius: '4px',
              letterSpacing: '0.03em',
              boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
            }}
          >
            {topBadgeNote}
          </div>
        )}

        {/* Stage Header: Number Circle & Audience Badge */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
          {/* THE CIRCLE (Focus of User Request) */}
          <div
            style={{
              width: isActive ? '36px' : '30px',
              height: isActive ? '36px' : '30px',
              borderRadius: '50%',
              background: isActive
                ? '#00534E'
                : isCompleted
                ? '#10B981'
                : '#E2E8F0',
              color: isActive || isCompleted ? '#FFFFFF' : '#475569',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              fontSize: isActive ? '1.05rem' : '0.85rem',
              animation: isActive ? 'aipCirclePulse 2.2s infinite' : 'none',
              boxShadow: isActive ? '0 0 0 4px rgba(0, 83, 78, 0.15)' : 'none',
              transition: 'all 0.2s ease',
            }}
            title={isActive ? 'AIP Currently At This Stage' : isCompleted ? 'Completed' : 'Pending'}
          >
            {isCompleted ? '✓' : stage.stageNumber}
          </div>

          {/* Actor Badge: (All) or (P) as drawn */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                padding: '0.15rem 0.45rem',
                borderRadius: '6px',
                background: stage.actorShort === '(All)' ? '#E0F2FE' : '#FEF3C7',
                color: stage.actorShort === '(All)' ? '#0369A1' : '#92400E',
                border: `1px solid ${stage.actorShort === '(All)' ? '#BAE6FD' : '#FDE68A'}`,
              }}
              title={stage.actor}
            >
              {stage.actorShort}
            </span>

            {/* Currently Here Badge */}
            {isActive && (
              <span
                style={{
                  fontSize: '0.62rem',
                  fontWeight: 900,
                  padding: '0.15rem 0.45rem',
                  borderRadius: '4px',
                  background: '#00534E',
                  color: '#FFFFFF',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                ● Currently Here
              </span>
            )}
          </div>
        </div>

        {/* Stage Name as drawn */}
        <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#0F172A', minHeight: '38px', lineHeight: 1.3 }}>
          {stage.name}
        </div>

        {/* Short Subtitle */}
        <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '0.35rem', lineHeight: 1.4 }}>
          {stage.shortName}
        </div>

        {/* Bottom State / Metric Pill */}
        <div style={{ marginTop: '0.65rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.7rem' }}>
          <span style={{ fontWeight: 700, color: isActive ? '#00534E' : isCompleted ? '#059669' : '#94A3B8' }}>
            {isActive ? '⏳ In Progress' : isCompleted ? '✓ Completed' : 'Pending'}
          </span>
          <span style={{ color: '#0369A1', fontWeight: 600 }}>
            Inspect Details →
          </span>
        </div>
      </div>
    );
  }

  // ── Helper: Render Box 7 (Implementation & Monitoring) ─────────────────────
  function renderStage7Card(stage: AipLifecycleStage | undefined) {
    if (!stage) return <div />;

    const isActive = stage.stageNumber === currentStageNumber;
    const isCompleted = stage.stageNumber < currentStageNumber;
    const isSelected = stage.stageNumber === selectedStageNum;

    return (
      <div
        role="button"
        tabIndex={0}
        onClick={() => setSelectedStageNum(7)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedStageNum(7); }}
        style={{
          borderRadius: '14px',
          border: isActive
            ? '2.5px solid #00534E'
            : isSelected
            ? '2px solid #0284C7'
            : isCompleted
            ? '1.5px solid #A7F3D0'
            : '1.5px dashed #CBD5E1',
          background: isActive
            ? 'linear-gradient(135deg, #F0FDFA 0%, #FFFFFF 100%)'
            : '#FFFFFF',
          padding: '1.25rem 1.4rem',
          cursor: 'pointer',
          position: 'relative',
          boxShadow: isActive
            ? '0 8px 24px -3px rgba(0, 83, 78, 0.22)'
            : '0 2px 6px rgba(0,0,0,0.02)',
        }}
      >
        {/* Left Side "Amendments" Pointer note from diagram */}
        <div
          style={{
            position: 'absolute',
            top: '-10px',
            left: '16px',
            background: '#8D153A',
            color: '#FFFFFF',
            fontSize: '0.66rem',
            fontWeight: 800,
            padding: '0.15rem 0.55rem',
            borderRadius: '4px',
            letterSpacing: '0.04em',
            boxShadow: '0 2px 4px rgba(141, 21, 58, 0.25)',
          }}
        >
          🔄 Continuous Execution & Mid-Year AIP Amendments
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* Stage ⑦ Circle */}
            <div
              style={{
                width: isActive ? '38px' : '32px',
                height: isActive ? '38px' : '32px',
                borderRadius: '50%',
                background: isActive
                  ? '#00534E'
                  : isCompleted
                  ? '#10B981'
                  : '#E2E8F0',
                color: isActive || isCompleted ? '#FFFFFF' : '#475569',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: '1rem',
                animation: isActive ? 'aipCirclePulse 2.2s infinite' : 'none',
              }}
            >
              {isCompleted ? '✓' : '7'}
            </div>

            <div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>
                Stage 7: Budget / AIP implementation &amp; Monitoring
              </div>
              <div style={{ fontSize: '0.74rem', color: '#64748B' }}>
                Dual Execution Lifecycle: Operational line delivery mapped directly into M&amp;E performance returns
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                padding: '0.15rem 0.5rem',
                borderRadius: '6px',
                background: '#E0F2FE',
                color: '#0369A1',
                border: '1px solid #BAE6FD',
              }}
            >
              (All) All Branches &amp; M&amp;E
            </span>

            {isActive && (
              <span
                style={{
                  fontSize: '0.64rem',
                  fontWeight: 900,
                  padding: '0.2rem 0.55rem',
                  borderRadius: '4px',
                  background: '#00534E',
                  color: '#FFFFFF',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                ● Currently Active (Operational Phase)
              </span>
            )}
          </div>
        </div>

        {/* Two Integrated Sub-Boxes as partitioned in user's diagram */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.75rem' }}>
          {/* Sub-Box A: Budget / AIP Implementation */}
          <div style={{ background: '#FFFFFF', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
            <div style={{ fontWeight: 800, fontSize: '0.84rem', color: '#00534E', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span>🚀</span>
              <span>1. Budget / AIP Implementation</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '0.25rem', lineHeight: 1.4 }}>
              Execution of approved workshops, procurement milestones, resource person dispatches, and vote expenditure.
            </div>
          </div>

          {/* Sub-Box B: Monitoring & Verification */}
          <div style={{ background: '#FFFFFF', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
            <div style={{ fontWeight: 800, fontSize: '0.84rem', color: '#8D153A', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span>📊</span>
              <span>2. Monitoring &amp; Verification (MPB)</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '0.25rem', lineHeight: 1.4 }}>
              Submission of monthly progress returns (MON-004), physical target checks, and field observation logs.
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Helper: Render stage statistics ─────────────────────────────────────────
  function renderStageMetricsSummary(stage: AipLifecycleStage) {
    const m = stage.metrics || {};
    switch (stage.stageNumber) {
      case 1:
        return (
          <div style={{ fontSize: '0.78rem', color: '#1E293B' }}>
            <div><strong>Total Proposals:</strong> {m.proposalsCount || 0} activities</div>
            <div><strong>Estimated Demand:</strong> Rs. {m.totalDemandMn || '0.00'} Mn</div>
            <div><strong>Ready / Submitted:</strong> {m.submittedCount || 0}</div>
          </div>
        );
      case 2:
        return (
          <div style={{ fontSize: '0.78rem', color: '#1E293B' }}>
            <div><strong>Proposals Reviewed:</strong> {m.reviewedCount || 0}</div>
            <div><strong>Accepted Activities:</strong> {m.acceptedCount || 0}</div>
            <div><strong>Budget Speech Earmarked:</strong> {m.budgetSpeechCount || 0}</div>
          </div>
        );
      case 3:
        return (
          <div style={{ fontSize: '0.78rem', color: '#1E293B' }}>
            <div><strong>Registered Vote Heads:</strong> {m.registeredVotesCount || 0}</div>
            <div><strong>Active Parliamentary Votes:</strong> {m.activeVotesCount || 0}</div>
          </div>
        );
      case 4:
        return (
          <div style={{ fontSize: '0.78rem', color: '#1E293B' }}>
            <div><strong>Dispatched Ceilings:</strong> {m.ceilingsDispatched || 0} branches</div>
            <div><strong>Vote Head Allocations:</strong> {m.branchAllocationsCount || 0} records</div>
          </div>
        );
      case 5:
        return (
          <div style={{ fontSize: '0.78rem', color: '#1E293B' }}>
            <div><strong>AIP Activities Drafted:</strong> {m.totalAipActivities || 0} activities</div>
            <div><strong>Allocated Budget:</strong> Rs. {m.allocatedBudgetMn || '0.00'} Mn</div>
          </div>
        );
      case 6:
        return (
          <div style={{ fontSize: '0.78rem', color: '#1E293B' }}>
            <div><strong>Approved AIP Activities:</strong> {m.approvedAipActivities || 0}</div>
            <div><strong>Gazette / Baseline Status:</strong> {m.isAipGazetted ? 'Locked & Approved' : 'Under PPB Review'}</div>
          </div>
        );
      case 7:
        return (
          <div style={{ fontSize: '0.78rem', color: '#1E293B' }}>
            <div><strong>Monthly Returns Logged:</strong> {m.monthlyReturnsCount || 0}</div>
            <div><strong>Verified Returns:</strong> {m.verifiedCount || 0}</div>
            <div><strong>Field Verifications:</strong> {m.fieldVerificationsCount || 0} inspections</div>
          </div>
        );
      default:
        return <div style={{ fontSize: '0.76rem', color: '#64748B' }}>Standard Ministry Procedure active.</div>;
    }
  }
}
