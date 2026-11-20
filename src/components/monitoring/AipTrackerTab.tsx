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
  const [diagramView, setDiagramView] = useState<'circle' | 'pipeline'>('circle');
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
      {/* 7-STAGE VISUAL LIFECYCLE FLOW (CIRCULAR CYCLE & PIPELINE VIEWS)            */}
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.75rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <span>⭕</span> National Education AIP Lifecycle Process Flow
            </h3>
            <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '2px' }}>
              The pulsating glowing circle marks the exact active position of FY {selectedYear} AIP right now. Click any circle to inspect deliverables.
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            {/* View Switcher: Circular Cycle (Default) vs Pipeline Grid */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: '#F1F5F9', padding: '0.25rem', borderRadius: '8px' }}>
              <button
                type="button"
                onClick={() => setDiagramView('circle')}
                style={{
                  padding: '0.35rem 0.8rem',
                  borderRadius: '6px',
                  border: 'none',
                  background: diagramView === 'circle' ? '#00534E' : 'transparent',
                  color: diagramView === 'circle' ? '#FFFFFF' : '#475569',
                  fontWeight: 700,
                  fontSize: '0.76rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  transition: 'all 0.15s ease',
                  boxShadow: diagramView === 'circle' ? '0 2px 4px rgba(0, 83, 78, 0.2)' : 'none',
                }}
              >
                <span>⭕</span> Circular Flow
              </button>
              <button
                type="button"
                onClick={() => setDiagramView('pipeline')}
                style={{
                  padding: '0.35rem 0.8rem',
                  borderRadius: '6px',
                  border: 'none',
                  background: diagramView === 'pipeline' ? '#00534E' : 'transparent',
                  color: diagramView === 'pipeline' ? '#FFFFFF' : '#475569',
                  fontWeight: 700,
                  fontSize: '0.76rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  transition: 'all 0.15s ease',
                  boxShadow: diagramView === 'pipeline' ? '0 2px 4px rgba(0, 83, 78, 0.2)' : 'none',
                }}
              >
                <span>🔲</span> Pipeline Grid
              </button>
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', fontSize: '0.74rem', fontWeight: 700 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#059669' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10B981' }} />
                Completed
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#00534E' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#00534E', animation: 'aipCirclePulse 2s infinite' }} />
                Current Place of AIP
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#94A3B8' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#CBD5E1' }} />
                Upcoming
              </span>
            </div>
          </div>
        </div>

        {/* ── CONDITIONAL RENDER: CIRCULAR VIEW VS PIPELINE VIEW ── */}
        {diagramView === 'circle' ? (
          renderCircularCycle()
        ) : (
          /* Diagram Flow Container (Pipeline Grid) */
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
        )}
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

  // ── Helper: Render 7-Stage Circular Cycle Diagram ──────────────────────────
  function renderCircularCycle() {
    const cx = 460;
    const cy = 345;
    const R = 215;

    const CIRCLE_NODES = [
      {
        stageNumber: 1,
        angleDeg: -90,
        labelStyle: { left: '460px', top: '22px', transform: 'translateX(-50%)', width: '250px', textAlign: 'center' as const },
        topBadgeNote: null,
      },
      {
        stageNumber: 2,
        angleDeg: -90 + 51.4286 * 1, // -38.57 deg
        labelStyle: { left: '685px', top: '150px', width: '220px', textAlign: 'left' as const },
        topBadgeNote: '📥 Budget Speech',
      },
      {
        stageNumber: 3,
        angleDeg: -90 + 51.4286 * 2, // 12.86 deg
        labelStyle: { left: '725px', top: '355px', width: '185px', textAlign: 'left' as const },
        topBadgeNote: '🏛️ Parliamentary Vote Approval',
      },
      {
        stageNumber: 4,
        angleDeg: -90 + 51.4286 * 3, // 64.29 deg
        labelStyle: { left: '555px', top: '595px', width: '220px', textAlign: 'left' as const },
        topBadgeNote: null,
      },
      {
        stageNumber: 5,
        angleDeg: -90 + 51.4286 * 4, // 115.71 deg
        labelStyle: { left: '145px', top: '595px', width: '220px', textAlign: 'right' as const },
        topBadgeNote: null,
      },
      {
        stageNumber: 6,
        angleDeg: -90 + 51.4286 * 5, // 167.14 deg
        labelStyle: { left: '12px', top: '355px', width: '185px', textAlign: 'right' as const },
        topBadgeNote: '📑 Gazetted PPB Approval',
      },
      {
        stageNumber: 7,
        angleDeg: -90 + 51.4286 * 6, // 218.57 deg
        labelStyle: { left: '15px', top: '150px', width: '230px', textAlign: 'right' as const },
        topBadgeNote: '⚙️ Implementation & Monitoring',
      },
    ];

    const activeStageObj = stages.find((s) => s.stageNumber === currentStageNumber);

    return (
      <div style={{ width: '100%', overflowX: 'auto', padding: '0.75rem 0' }}>
        <div style={{ position: 'relative', width: '920px', height: '690px', margin: '0 auto', userSelect: 'none' }}>
          
          {/* SVG Canvas for Circular Ring Track & Directional Connecting Arcs */}
          <svg
            width="920"
            height="690"
            style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
          >
            <defs>
              <marker
                id="circle-arrow-completed"
                viewBox="0 0 10 10"
                refX="6"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#10B981" />
              </marker>
              <marker
                id="circle-arrow-active"
                viewBox="0 0 10 10"
                refX="6"
                refY="5"
                markerWidth="7"
                markerHeight="7"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#00534E" />
              </marker>
              <marker
                id="circle-arrow-upcoming"
                viewBox="0 0 10 10"
                refX="6"
                refY="5"
                markerWidth="5"
                markerHeight="5"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#CBD5E1" />
              </marker>
            </defs>

            {/* Subtle outer guideline ring */}
            <circle
              cx={cx}
              cy={cy}
              r={R}
              fill="none"
              stroke="#F1F5F9"
              strokeWidth="10"
            />
            <circle
              cx={cx}
              cy={cy}
              r={R}
              fill="none"
              stroke="#E2E8F0"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />

            {/* Directional Arcs Connecting Stages in Clockwise Circle */}
            {CIRCLE_NODES.map((node, i) => {
              const startAngle = node.angleDeg + 12;
              const nextAngle = i === 6 ? -90 + 360 : CIRCLE_NODES[i + 1].angleDeg;
              const endAngle = nextAngle - 12;

              const rad1 = (startAngle * Math.PI) / 180;
              const rad2 = (endAngle * Math.PI) / 180;

              const x1 = cx + R * Math.cos(rad1);
              const y1 = cy + R * Math.sin(rad1);
              const x2 = cx + R * Math.cos(rad2);
              const y2 = cy + R * Math.sin(rad2);

              const arcPath = `M ${x1} ${y1} A ${R} ${R} 0 0 1 ${x2} ${y2}`;

              const targetStageNum = i === 6 ? 1 : node.stageNumber + 1;
              const isArcCompleted = node.stageNumber < currentStageNumber;
              const isArcActive = node.stageNumber === currentStageNumber;

              const strokeColor = isArcCompleted
                ? '#10B981'
                : isArcActive
                ? '#00534E'
                : '#CBD5E1';

              const markerId = isArcCompleted
                ? 'url(#circle-arrow-completed)'
                : isArcActive
                ? 'url(#circle-arrow-active)'
                : 'url(#circle-arrow-upcoming)';

              return (
                <path
                  key={`arc-${node.stageNumber}`}
                  d={arcPath}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={isArcActive ? 4 : isArcCompleted ? 3 : 2}
                  strokeDasharray={isArcActive ? '6 4' : i === 6 ? '5 4' : undefined}
                  markerEnd={markerId}
                />
              );
            })}
          </svg>

          {/* ── CENTER HUB: FINANCIAL YEAR & ACTIVE STAGE OVERSIGHT ── */}
          <div
            style={{
              position: 'absolute',
              left: `${cx}px`,
              top: `${cy}px`,
              transform: 'translate(-50%, -50%)',
              width: '210px',
              height: '210px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, #FFFFFF 65%, #F0FDFA 100%)',
              border: '3px solid #00534E',
              boxShadow: '0 12px 32px rgba(0, 83, 78, 0.14), inset 0 0 0 4px #CCFBF1',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              padding: '1rem',
              zIndex: 5,
            }}
          >
            <div style={{ fontSize: '0.66rem', fontWeight: 800, color: '#00534E', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              🏛️ MoE Governance
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0F172A', marginTop: '1px' }}>
              FY {selectedYear}
            </div>
            <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#475569' }}>
              AIP Lifecycle
            </div>

            <div
              style={{
                marginTop: '0.45rem',
                padding: '0.2rem 0.55rem',
                borderRadius: '9999px',
                background: '#00534E',
                color: '#FFFFFF',
                fontSize: '0.68rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                boxShadow: '0 2px 6px rgba(0, 83, 78, 0.25)',
              }}
            >
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34D399', animation: 'aipCirclePulse 1.8s infinite' }} />
              Stage {currentStageNumber} Active
            </div>

            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#0F172A', marginTop: '0.35rem', lineHeight: 1.2, maxWidth: '170px' }}>
              {activeStageObj?.shortName || 'Annual Implementation'}
            </div>

            <div style={{ fontSize: '0.62rem', color: '#64748B', marginTop: '0.35rem', fontStyle: 'italic' }}>
              Click any circle to inspect
            </div>
          </div>

          {/* ── 7 STAGE CIRCLES & LABELS POSITIONED ON THE CIRCULAR PERIMETER ── */}
          {CIRCLE_NODES.map((node) => {
            const stage = stages.find((s) => s.stageNumber === node.stageNumber);
            if (!stage) return null;

            const rad = (node.angleDeg * Math.PI) / 180;
            const nodeX = cx + R * Math.cos(rad);
            const nodeY = cy + R * Math.sin(rad);

            const isActive = stage.stageNumber === currentStageNumber;
            const isCompleted = stage.stageNumber < currentStageNumber;
            const isSelected = stage.stageNumber === selectedStageNum;

            return (
              <React.Fragment key={`stage-node-${stage.stageNumber}`}>
                {/* 1. THE INTERACTIVE CIRCLE (Focus of User Request) */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedStageNum(stage.stageNumber)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedStageNum(stage.stageNumber); }}
                  title={`Stage ${stage.stageNumber}: ${stage.name} (${stage.actor}) - Click to inspect`}
                  style={{
                    position: 'absolute',
                    left: `${nodeX}px`,
                    top: `${nodeY}px`,
                    transform: 'translate(-50%, -50%)',
                    width: isActive ? '68px' : '58px',
                    height: isActive ? '68px' : '58px',
                    borderRadius: '50%',
                    background: isActive
                      ? '#00534E'
                      : isCompleted
                      ? '#10B981'
                      : '#FFFFFF',
                    border: isActive
                      ? '3.5px solid #CCFBF1'
                      : isSelected
                      ? '3.5px solid #0284C7'
                      : isCompleted
                      ? '3px solid #059669'
                      : '2px dashed #94A3B8',
                    color: isActive || isCompleted ? '#FFFFFF' : '#475569',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    zIndex: isActive ? 10 : 6,
                    boxShadow: isActive
                      ? '0 0 0 8px rgba(0, 83, 78, 0.22), 0 10px 25px rgba(0, 83, 78, 0.4)'
                      : isSelected
                      ? '0 0 0 6px rgba(2, 132, 199, 0.25), 0 6px 16px rgba(0,0,0,0.1)'
                      : isCompleted
                      ? '0 4px 12px rgba(16, 185, 129, 0.3)'
                      : '0 2px 8px rgba(0,0,0,0.05)',
                    animation: isActive ? 'aipCirclePulse 2.4s infinite' : 'none',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {isCompleted ? (
                    <>
                      <span style={{ fontSize: '1.25rem', fontWeight: 900, lineHeight: 1 }}>✓</span>
                      <span style={{ fontSize: '0.62rem', fontWeight: 800, opacity: 0.9 }}>{stage.stageNumber}</span>
                    </>
                  ) : (
                    <>
                      <span style={{ fontSize: isActive ? '1.45rem' : '1.2rem', fontWeight: 900, lineHeight: 1 }}>
                        {stage.stageNumber}
                      </span>
                      {isActive && (
                        <span style={{ fontSize: '0.58rem', fontWeight: 900, letterSpacing: '0.04em', textTransform: 'uppercase', opacity: 0.95 }}>
                          HERE
                        </span>
                      )}
                    </>
                  )}

                  {/* Pulsing "CURRENTLY HERE" Beacon Pill */}
                  {isActive && (
                    <div
                      style={{
                        position: 'absolute',
                        top: node.angleDeg > 0 ? '76px' : '-32px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: '#00534E',
                        color: '#FFFFFF',
                        fontSize: '0.66rem',
                        fontWeight: 900,
                        padding: '0.2rem 0.6rem',
                        borderRadius: '9999px',
                        boxShadow: '0 4px 12px rgba(0, 83, 78, 0.35)',
                        border: '1.5px solid #CCFBF1',
                        whiteSpace: 'nowrap',
                        letterSpacing: '0.04em',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                      }}
                    >
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34D399', animation: 'aipCirclePulse 1.8s infinite' }} />
                      CURRENTLY HERE
                    </div>
                  )}
                </div>

                {/* 2. THE STAGE LABEL & ACTOR BADGE ANCHORED BESIDE THE CIRCLE */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedStageNum(stage.stageNumber)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedStageNum(stage.stageNumber); }}
                  style={{
                    position: 'absolute',
                    ...node.labelStyle,
                    cursor: 'pointer',
                    zIndex: 6,
                    padding: '0.35rem 0.55rem',
                    borderRadius: '8px',
                    background: isSelected ? '#EFF6FF' : 'transparent',
                    border: isSelected ? '1px solid #BFDBFE' : '1px solid transparent',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {/* Top Hand-Drawn Note Banner if applicable */}
                  {node.topBadgeNote && (
                    <div
                      style={{
                        display: 'inline-block',
                        background: '#0F172A',
                        color: '#F8FAFC',
                        fontSize: '0.64rem',
                        fontWeight: 800,
                        padding: '0.12rem 0.45rem',
                        borderRadius: '4px',
                        marginBottom: '0.25rem',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                      }}
                    >
                      {node.topBadgeNote}
                    </div>
                  )}

                  {/* Stage Title & Actor Pill */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', justifyContent: node.labelStyle.textAlign === 'right' ? 'flex-end' : node.labelStyle.textAlign === 'center' ? 'center' : 'flex-start', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.86rem', fontWeight: 800, color: isActive ? '#00534E' : isSelected ? '#0284C7' : '#0F172A', lineHeight: 1.25 }}>
                      {stage.name}
                    </span>

                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        padding: '0.1rem 0.4rem',
                        borderRadius: '4px',
                        background: stage.actorShort === '(All)' ? '#E0F2FE' : '#FEF3C7',
                        color: stage.actorShort === '(All)' ? '#0369A1' : '#92400E',
                        border: `1px solid ${stage.actorShort === '(All)' ? '#BAE6FD' : '#FDE68A'}`,
                      }}
                      title={stage.actor}
                    >
                      {stage.actorShort}
                    </span>
                  </div>

                  {/* Subtitle / Status */}
                  <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: '0.2rem', lineHeight: 1.3 }}>
                    {stage.shortName}
                    <span style={{ fontWeight: 700, marginLeft: '0.35rem', color: isActive ? '#00534E' : isCompleted ? '#059669' : '#94A3B8' }}>
                      • {isActive ? 'In Progress' : isCompleted ? 'Completed' : 'Upcoming'}
                    </span>
                  </div>
                </div>
              </React.Fragment>
            );
          })}

        </div>
      </div>
    );
  }

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
