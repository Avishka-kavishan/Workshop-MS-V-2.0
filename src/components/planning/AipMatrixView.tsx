'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { formatMillion, formatExactMn, formatRupees } from '@/lib/financialFormat';

export interface AipMatrixActivity {
  id: string;
  outputNo?: string;
  activityCode?: string;
  activity: string;
  voteNumber?: string;
  estimatedCost?: number;
  originalProposedCost?: number;
  remarks?: string;
  financialMonths?: number[];
  physicalMonths?: string[];
  financialQ1?: number;
  financialQ2?: number;
  financialQ3?: number;
  financialQ4?: number;
  targetQ1?: string;
  targetQ2?: string;
  targetQ3?: string;
  targetQ4?: string;
  responsibleOfficer?: string;
  isAddedByPlanning?: boolean;
  isAdjustedByPlanning?: boolean;
  proposalId?: string;
  customFields?: {
    programme?: string;
    subActivities?: string;
    sourceOfFinance?: string;
    kpi?: string;
    indicateRcp?: string;
    [key: string]: any;
  };
}

interface AipMatrixViewProps {
  activities: AipMatrixActivity[];
  plan: any;
  year: string;
  branchId: string;
  branchName: string;
  branchCode?: string;
  aipTemplate?: any;
  loading?: boolean;
  onAddActivityClick?: () => void;
  onEditActivity?: (act: AipMatrixActivity) => void;
  onDeleteActivity?: (act: AipMatrixActivity) => void;
  onPlanUpdated?: () => void;
}

const MONTH_NAMES_SHORT = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

function getRcpBadgeStyle(code?: string) {
  const upper = (code || '').trim().toUpperCase();
  if (upper.startsWith('R')) {
    return { bg: '#EEF2FF', text: '#3730A3', border: '#C7D2FE' };
  }
  if (upper.startsWith('C')) {
    return { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A' };
  }
  if (upper.startsWith('P')) {
    return { bg: '#ECFDF5', text: '#065F46', border: '#A7F3D0' };
  }
  return { bg: '#F1F5F9', text: '#334155', border: '#CBD5E1' };
}

export default function AipMatrixView({
  activities,
  plan,
  year,
  branchId,
  branchName,
  branchCode = 'MOE',
  aipTemplate = null,
  loading = false,
  onAddActivityClick,
  onEditActivity,
  onDeleteActivity,
  onPlanUpdated,
}: AipMatrixViewProps) {
  const [originFilter, setOriginFilter] = useState<'all' | 'proposed' | 'planning_added' | 'adjusted'>('all');
  const [decimalMode, setDecimalMode] = useState<'dual' | 'standard' | 'full'>('dual');

  // Official Form Header Fields
  const [outcome, setOutcome] = useState(plan?.outcome || '');
  const [thematicPriorityArea, setThematicPriorityArea] = useState(plan?.thematicPriorityArea || '');
  const [intermediateOutcome, setIntermediateOutcome] = useState(plan?.intermediateOutcome || '');
  const [mainFocusArea, setMainFocusArea] = useState(plan?.mainFocusArea || '');
  const [mainResp, setMainResp] = useState(plan?.mainResponsibility || '');
  const [mainContact, setMainContact] = useState(plan?.mainContactNo || '');
  const [overallResp, setOverallResp] = useState(plan?.overallResponsibility || '');
  const [overallContact, setOverallContact] = useState(plan?.overallContactNo || '');
  const [savingHeader, setSavingHeader] = useState(false);
  const [headerSavedSuccess, setHeaderSavedSuccess] = useState(false);

  useEffect(() => {
    setOutcome(plan?.outcome || '');
    setThematicPriorityArea(plan?.thematicPriorityArea || '');
    setIntermediateOutcome(plan?.intermediateOutcome || '');
    setMainFocusArea(plan?.mainFocusArea || '');
    setMainResp(plan?.mainResponsibility || '');
    setMainContact(plan?.mainContactNo || '');
    setOverallResp(plan?.overallResponsibility || '');
    setOverallContact(plan?.overallContactNo || '');
  }, [plan]);

  const handleSaveFormHeader = async () => {
    try {
      setSavingHeader(true);
      const res = await fetch('/api/annual-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchId,
          branchName,
          year,
          phaseTitle: plan?.phaseTitle || '3. Implementation Phase',
          outcome,
          thematicPriorityArea,
          intermediateOutcome,
          mainFocusArea,
          mainResponsibility: mainResp,
          mainContactNo: mainContact,
          overallResponsibility: overallResp,
          overallContactNo: overallContact,
        }),
      });
      if (res.ok) {
        setHeaderSavedSuccess(true);
        setTimeout(() => setHeaderSavedSuccess(false), 3000);
        if (onPlanUpdated) onPlanUpdated();
      }
    } catch (err) {
      console.error('Failed to save form header info:', err);
    } finally {
      setSavingHeader(false);
    }
  };

  const branchProposedCount = useMemo(
    () => activities.filter((a) => !a.isAddedByPlanning).length,
    [activities]
  );
  const planningAddedCount = useMemo(
    () => activities.filter((a) => a.isAddedByPlanning).length,
    [activities]
  );
  const planningAdjustedCount = useMemo(
    () => activities.filter((a) => a.isAdjustedByPlanning).length,
    [activities]
  );

  const displayedActivities = useMemo(() => {
    if (originFilter === 'proposed') return activities.filter((a) => !a.isAddedByPlanning);
    if (originFilter === 'planning_added') return activities.filter((a) => a.isAddedByPlanning);
    if (originFilter === 'adjusted') return activities.filter((a) => a.isAdjustedByPlanning);
    return activities;
  }, [activities, originFilter]);

  const totals = useMemo(() => {
    const totalEstimatedCost = displayedActivities.reduce(
      (sum, a) => sum + (Number(a.estimatedCost) || 0),
      0
    );
    const monthlyFinancial = Array(12).fill(0);
    const monthlyPhysicalCounts = Array(12).fill(0);

    displayedActivities.forEach((a) => {
      const fm = a.financialMonths || Array(12).fill(0);
      const pm = a.physicalMonths || Array(12).fill('-');
      for (let i = 0; i < 12; i++) {
        monthlyFinancial[i] += Number(fm[i]) || 0;
        const pVal = parseFloat(String(pm[i] || '').replace('%', ''));
        if (!isNaN(pVal)) {
          monthlyPhysicalCounts[i] += pVal;
        }
      }
    });

    const n = displayedActivities.length;
    const monthlyPhysical = monthlyPhysicalCounts.map((sum) =>
      n > 0 ? Math.round(sum / n) : 0
    );

    return {
      totalEstimatedCost,
      monthlyFinancial,
      monthlyPhysical,
    };
  }, [displayedActivities]);

  const renderMnCell = (
    val: number,
    opts?: { align?: 'center' | 'right' | 'left'; bold?: boolean; color?: string }
  ) => {
    const num = Number(val) || 0;
    const rounded = formatMillion(num);
    const exact = formatExactMn(num);
    const rupees = formatRupees(num, true);
    const showSubtext = decimalMode === 'dual' && Math.abs(num) > 0 && exact !== rounded;
    const displayText = decimalMode === 'full' ? exact : rounded;

    return (
      <div
        className="mn-hover-cell"
        style={{
          textAlign: opts?.align || 'center',
          fontWeight: opts?.bold ? 700 : 500,
          color: opts?.color || '#334155',
          lineHeight: 1.25,
        }}
        title={`Exact: Rs. ${exact} Mn (${rupees})`}
      >
        <div>{displayText}</div>
        {showSubtext && (
          <div style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: 400 }}>{exact}</div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div
        style={{
          padding: '3rem',
          textAlign: 'center',
          color: '#64748B',
          background: '#FFFFFF',
          borderRadius: '14px',
          border: '1px solid #E2E8F0',
        }}
      >
        Loading Budget Projection Form...
      </div>
    );
  }

  const hasActions = Boolean(onEditActivity || onDeleteActivity);

  const customColumns: any[] = useMemo(() => {
    if (!aipTemplate?.columns) return [];
    return aipTemplate.columns
      .filter((c: any) => !c.isSystemCore && c.visible !== false)
      .sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
  }, [aipTemplate]);

  const isCoreVisible = (key: string) => {
    if (!aipTemplate?.columns) return true;
    const found = aipTemplate.columns.find((c: any) => c.key === key);
    return found ? found.visible !== false : true;
  };

  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: '14px',
        border: '1px solid #E2E8F0',
        boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06)',
        overflow: 'hidden',
      }}
    >
      <style jsx>{`
        .aip-table-wrapper {
          width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }
        .aip-table {
          width: 100%;
          min-width: 1340px;
          border-collapse: collapse;
          font-size: 0.79rem;
          color: #1e293b;
        }
        .aip-table th,
        .aip-table td {
          border: 1px solid #cbd5e1;
          padding: 8px 9px;
          text-align: center;
          vertical-align: middle;
        }
        .aip-table th {
          background: #f8fafc;
          font-weight: 700;
          color: #0f172a;
          font-size: 0.76rem;
          letter-spacing: 0.01em;
        }
        .aip-table tbody tr:hover td {
          background-color: #f8fafc;
        }
        .aip-table td.text-left {
          text-align: left;
        }
        .aip-table .type-financial {
          background: #fdf2f4;
          font-weight: 700;
          color: #881337;
          white-space: nowrap;
          font-size: 0.74rem;
        }
        .aip-table .type-physical {
          background: #f0fdf4;
          font-weight: 700;
          color: #166534;
          white-space: nowrap;
          font-size: 0.74rem;
        }
        .aip-table .total-row-fin td {
          background: #fef2f2 !important;
          font-weight: 700;
          color: #991b1b;
        }
        .aip-table .total-row-phys td {
          background: #f0fdf4 !important;
          font-weight: 700;
          color: #166534;
        }
        .mn-hover-cell {
          transition: background-color 0.15s ease;
          border-radius: 4px;
          padding: 2px 3px;
        }
        .mn-hover-cell:hover {
          background-color: rgba(15, 118, 110, 0.1);
        }
        .bp-field-input {
          width: 100%;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          background: #ffffff;
          font-size: 0.82rem;
          color: #0f172a;
          padding: 0.48rem 0.7rem;
          outline: none;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .bp-field-input:focus {
          border-color: #7a1c2d;
          box-shadow: 0 0 0 3px rgba(122, 28, 45, 0.12);
        }
        .bp-field-label {
          display: block;
          font-size: 0.74rem;
          font-weight: 700;
          color: #334155;
          margin-bottom: 0.3rem;
        }
      `}</style>

      {/* Top Toolbar */}
      <div
        style={{
          padding: '0.75rem 1.25rem',
          background: 'linear-gradient(90deg, #F8FAFC 0%, #F1F5F9 100%)',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>
            Activity Origin:
          </span>
          <button
            type="button"
            onClick={() => setOriginFilter('all')}
            style={{
              padding: '0.28rem 0.75rem',
              borderRadius: '999px',
              fontSize: '0.73rem',
              fontWeight: originFilter === 'all' ? 800 : 600,
              border: originFilter === 'all' ? '1.5px solid #0F766E' : '1px solid #CBD5E1',
              background: originFilter === 'all' ? '#0F766E' : '#FFFFFF',
              color: originFilter === 'all' ? '#FFFFFF' : '#334155',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            All ({activities.length})
          </button>
          <button
            type="button"
            onClick={() => setOriginFilter('proposed')}
            style={{
              padding: '0.28rem 0.75rem',
              borderRadius: '999px',
              fontSize: '0.73rem',
              fontWeight: originFilter === 'proposed' ? 800 : 600,
              border: originFilter === 'proposed' ? '1.5px solid #0284C7' : '1px solid #CBD5E1',
              background: originFilter === 'proposed' ? '#0284C7' : '#FFFFFF',
              color: originFilter === 'proposed' ? '#FFFFFF' : '#0369A1',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Branch Proposed ({branchProposedCount})
          </button>
          {planningAddedCount > 0 && (
            <button
              type="button"
              onClick={() => setOriginFilter('planning_added')}
              style={{
                padding: '0.28rem 0.75rem',
                borderRadius: '999px',
                fontSize: '0.73rem',
                fontWeight: originFilter === 'planning_added' ? 800 : 600,
                border: originFilter === 'planning_added' ? '1.5px solid #7C3AED' : '1px solid #CBD5E1',
                background: originFilter === 'planning_added' ? '#7C3AED' : '#FFFFFF',
                color: originFilter === 'planning_added' ? '#FFFFFF' : '#6D28D9',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Added by Planning ({planningAddedCount})
            </button>
          )}
          {planningAdjustedCount > 0 && (
            <button
              type="button"
              onClick={() => setOriginFilter('adjusted')}
              style={{
                padding: '0.28rem 0.75rem',
                borderRadius: '999px',
                fontSize: '0.73rem',
                fontWeight: originFilter === 'adjusted' ? 800 : 600,
                border: originFilter === 'adjusted' ? '1.5px solid #D97706' : '1px solid #CBD5E1',
                background: originFilter === 'adjusted' ? '#D97706' : '#FFFFFF',
                color: originFilter === 'adjusted' ? '#FFFFFF' : '#B45309',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Adjusted by Planning ({planningAdjustedCount})
            </button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'inline-flex', background: '#E2E8F0', padding: '3px', borderRadius: '8px' }}>
            <button
              type="button"
              onClick={() => setDecimalMode('dual')}
              style={{
                padding: '4px 9px',
                borderRadius: '6px',
                fontSize: '0.72rem',
                fontWeight: 700,
                border: 'none',
                background: decimalMode === 'dual' ? '#FFFFFF' : 'transparent',
                color: decimalMode === 'dual' ? '#0F766E' : '#64748B',
                cursor: 'pointer',
                boxShadow: decimalMode === 'dual' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              🔢 2 Dec + Subtext
            </button>
            <button
              type="button"
              onClick={() => setDecimalMode('standard')}
              style={{
                padding: '4px 9px',
                borderRadius: '6px',
                fontSize: '0.72rem',
                fontWeight: 700,
                border: 'none',
                background: decimalMode === 'standard' ? '#FFFFFF' : 'transparent',
                color: decimalMode === 'standard' ? '#0F766E' : '#64748B',
                cursor: 'pointer',
                boxShadow: decimalMode === 'standard' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              ✨ 2 Dec Only
            </button>
            <button
              type="button"
              onClick={() => setDecimalMode('full')}
              style={{
                padding: '4px 9px',
                borderRadius: '6px',
                fontSize: '0.72rem',
                fontWeight: 700,
                border: 'none',
                background: decimalMode === 'full' ? '#FFFFFF' : 'transparent',
                color: decimalMode === 'full' ? '#92400E' : '#64748B',
                cursor: 'pointer',
                boxShadow: decimalMode === 'full' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              🔬 6 Dec Full
            </button>
          </div>

          {onAddActivityClick && (
            <button
              type="button"
              onClick={onAddActivityClick}
              style={{
                background: '#7A1C2D',
                color: '#FFFFFF',
                border: 'none',
                padding: '0.45rem 1rem',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: '0 2px 6px rgba(122, 28, 45, 0.25)',
              }}
            >
              <span style={{ fontWeight: 800, fontSize: '1rem', lineHeight: 1 }}>+</span>
              <span>Add Activity</span>
            </button>
          )}
        </div>
      </div>

      {/* User-Friendly Strategic Context & Responsibility Card */}
      <div style={{ padding: '1.1rem 1.25rem', background: '#FAFBFC', borderBottom: '1px solid #E2E8F0' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '0.85rem',
            flexWrap: 'wrap',
            gap: '0.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1rem' }}>🏛️</span>
            <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: '#7A1C2D' }}>
              Strategic Context &amp; Branch Responsibility
            </h4>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            {headerSavedSuccess && (
              <span
                style={{
                  fontSize: '0.75rem',
                  color: '#166534',
                  background: '#DCFCE7',
                  padding: '2px 10px',
                  borderRadius: '999px',
                  fontWeight: 700,
                }}
              >
                ✅ Saved
              </span>
            )}
            <button
              type="button"
              onClick={handleSaveFormHeader}
              disabled={savingHeader}
              style={{
                background: '#0F766E',
                color: '#FFFFFF',
                border: 'none',
                padding: '0.38rem 0.9rem',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.76rem',
                cursor: 'pointer',
                boxShadow: '0 1px 4px rgba(15, 118, 110, 0.25)',
              }}
            >
              {savingHeader ? 'Saving...' : '💾 Save Header'}
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.85rem', marginBottom: '0.85rem' }}>
          <div>
            <label className="bp-field-label">Outcome</label>
            <input
              type="text"
              className="bp-field-input"
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              placeholder="Enter Outcome..."
            />
          </div>
          <div>
            <label className="bp-field-label">
              <span style={{ color: '#DC2626' }}>*</span> Thematic Priority Area
            </label>
            <input
              type="text"
              className="bp-field-input"
              value={thematicPriorityArea}
              onChange={(e) => setThematicPriorityArea(e.target.value)}
              placeholder="Enter Thematic Priority Area..."
            />
          </div>
          <div>
            <label className="bp-field-label">Intermediate Outcome</label>
            <input
              type="text"
              className="bp-field-input"
              value={intermediateOutcome}
              onChange={(e) => setIntermediateOutcome(e.target.value)}
              placeholder="Enter Intermediate Outcome..."
            />
          </div>
          <div>
            <label className="bp-field-label">
              <span style={{ color: '#DC2626' }}>*</span> Main Focus Area
            </label>
            <input
              type="text"
              className="bp-field-input"
              value={mainFocusArea}
              onChange={(e) => setMainFocusArea(e.target.value)}
              placeholder="Enter Main Focus Area..."
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.85rem' }}>
          <div>
            <label className="bp-field-label">Main responsibility</label>
            <input
              type="text"
              className="bp-field-input"
              value={mainResp}
              onChange={(e) => setMainResp(e.target.value)}
              placeholder="Subject Officer name..."
            />
          </div>
          <div>
            <label className="bp-field-label">Contact No (Main)</label>
            <input
              type="text"
              className="bp-field-input"
              value={mainContact}
              onChange={(e) => setMainContact(e.target.value)}
              placeholder="Phone / Ext..."
            />
          </div>
          <div>
            <label className="bp-field-label">Overall responsibility</label>
            <input
              type="text"
              className="bp-field-input"
              value={overallResp}
              onChange={(e) => setOverallResp(e.target.value)}
              placeholder="Director / Head of Branch..."
            />
          </div>
          <div>
            <label className="bp-field-label">Contact No (Overall)</label>
            <input
              type="text"
              className="bp-field-input"
              value={overallContact}
              onChange={(e) => setOverallContact(e.target.value)}
              placeholder="Office Phone..."
            />
          </div>
        </div>
      </div>

      {/* Official Matrix Table */}
      <div className="aip-table-wrapper">
        <table className="aip-table">
          <thead>
            <tr>
              <th rowSpan={3} style={{ width: '68px' }}>
                Outcome / Output No.
              </th>
              <th rowSpan={3} style={{ width: '105px' }}>
                <span style={{ color: '#dc2626' }}>*</span> Programme
              </th>
              <th rowSpan={3} style={{ minWidth: '180px' }}>
                Key Activities
              </th>
              <th rowSpan={3} style={{ minWidth: '155px' }}>
                <span style={{ color: '#dc2626' }}>*</span> Sub Activities
              </th>
              <th rowSpan={3} style={{ width: '105px' }}>
                Vote Number
              </th>
              <th rowSpan={3} style={{ width: '105px' }}>
                <span style={{ color: '#dc2626' }}>*</span> Source of Finance
              </th>
              <th rowSpan={3} style={{ width: '98px' }}>
                Allocation / Estimated Cost (Mn)
              </th>
              <th rowSpan={3} style={{ width: '108px' }}>
                Target
              </th>
              <th
                colSpan={12}
                style={{
                  background: 'linear-gradient(90deg, #7A1C2D 0%, #8D153A 100%)',
                  color: '#FFFFFF',
                  padding: '7px 10px',
                  textAlign: 'center',
                  fontWeight: 700,
                  fontSize: '0.84rem',
                  border: '1px solid #5A101E',
                }}
              >
                Overall Physical and Financial Targets {year}
              </th>
              <th rowSpan={3} style={{ minWidth: '115px' }}>
                <span style={{ color: '#dc2626' }}>*</span> KPI
              </th>
              <th rowSpan={3} style={{ width: '90px' }}>
                <span style={{ color: '#dc2626' }}>*</span> Indicate R/C/P
              </th>
              <th rowSpan={3} style={{ minWidth: '120px' }}>
                Responsibility
              </th>
              {customColumns.map((col: any) => (
                <th
                  key={col.id}
                  rowSpan={3}
                  style={{
                    width: col.width || '130px',
                    minWidth: col.width || '110px',
                    textAlign: col.textAlign || 'left',
                    background: '#F0FDFA',
                    color: '#00534E',
                    fontWeight: 700,
                    fontSize: '0.78rem',
                    border: '1px solid #CCFBF1',
                  }}
                >
                  {col.label}
                  {col.required && <span style={{ color: '#DC2626', marginLeft: '2px' }}>*</span>}
                </th>
              ))}
              {hasActions && (
                <th rowSpan={3} style={{ width: '100px' }}>
                  Actions
                </th>
              )}
            </tr>
            <tr>
              <th colSpan={12} style={{ background: '#EFF6FF', fontWeight: 700, color: '#1E3A8A' }}>
                Time Frame
              </th>
            </tr>
            <tr>
              {MONTH_NAMES_SHORT.map((m, i) => (
                <th key={`m-${i}`} style={{ width: '40px', fontSize: '0.75rem', background: '#F8FAFC' }}>
                  {m}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {displayedActivities.length === 0 ? (
              <tr>
                <td
                  colSpan={23 + customColumns.length + (hasActions ? 1 : 0)}
                  style={{ padding: '3rem 1rem', textAlign: 'center', color: '#64748B', background: '#FFFFFF' }}
                >
                  <div style={{ fontSize: '1.6rem', marginBottom: '0.35rem' }}>📋</div>
                  <div style={{ fontWeight: 700, color: '#1E293B', marginBottom: '0.25rem' }}>
                    No activities recorded yet for {branchName} ({year})
                  </div>
                  <div style={{ fontSize: '0.8rem' }}>
                    Click <strong>+ Add Activity</strong> above to add your first entry.
                  </div>
                </td>
              </tr>
            ) : (
              <>
                {displayedActivities.map((act) => {
                  const fm = act.financialMonths || Array(12).fill(0);
                  const pm = act.physicalMonths || Array(12).fill('-');
                  const cf = act.customFields || {};
                  const rcpStyle = getRcpBadgeStyle(cf.indicateRcp);

                  return (
                    <React.Fragment key={act.id}>
                      <tr>
                        <td rowSpan={2} style={{ fontWeight: 800, color: '#0F172A' }}>
                          {act.outputNo || '-'}
                        </td>
                        <td rowSpan={2} className="text-left" style={{ fontSize: '0.77rem', color: '#334155' }}>
                          {cf.programme || '-'}
                        </td>
                        <td rowSpan={2} className="text-left" style={{ lineHeight: 1.45 }}>
                          <div style={{ fontWeight: 700, color: '#0F172A' }}>{act.activity}</div>
                          {act.isAdjustedByPlanning &&
                            act.originalProposedCost !== undefined && (
                              <div style={{ fontSize: '0.7rem', color: '#78350F', marginTop: '3px' }}>
                                Voted: <strong>Rs. {formatMillion(Number(act.estimatedCost) || 0)} Mn</strong>{' '}
                                (Branch Demand: Rs. {formatMillion(Number(act.originalProposedCost) || 0)} Mn)
                              </div>
                            )}
                        </td>
                        <td rowSpan={2} className="text-left" style={{ fontSize: '0.77rem', color: '#334155' }}>
                          {cf.subActivities || '-'}
                        </td>
                        <td rowSpan={2}>
                          {act.voteNumber && act.voteNumber !== '-' ? (
                            <span
                              style={{
                                display: 'inline-block',
                                background: '#ECFEFF',
                                color: '#0E7490',
                                border: '1px solid #A5F3FC',
                                borderRadius: '6px',
                                padding: '2px 7px',
                                fontWeight: 700,
                                fontSize: '0.72rem',
                              }}
                            >
                              {act.voteNumber}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td rowSpan={2}>
                          {cf.sourceOfFinance ? (
                            <span
                              style={{
                                display: 'inline-block',
                                background: '#F1F5F9',
                                color: '#334155',
                                border: '1px solid #CBD5E1',
                                borderRadius: '999px',
                                padding: '2px 8px',
                                fontWeight: 600,
                                fontSize: '0.71rem',
                              }}
                            >
                              {cf.sourceOfFinance}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td rowSpan={2}>
                          {renderMnCell(Number(act.estimatedCost) || 0, {
                            bold: true,
                            color: '#0F172A',
                          })}
                        </td>
                        <td className="type-financial">Financial Target</td>
                        {fm.map((val, idx) => (
                          <td key={`f-${act.id}-${idx}`} style={{ padding: '4px' }}>
                            {renderMnCell(Number(val) || 0)}
                          </td>
                        ))}
                        <td rowSpan={2} className="text-left" style={{ fontSize: '0.77rem', color: '#334155' }}>
                          {cf.kpi || '-'}
                        </td>
                        <td rowSpan={2}>
                          {cf.indicateRcp ? (
                            <span
                              style={{
                                display: 'inline-block',
                                background: rcpStyle.bg,
                                color: rcpStyle.text,
                                border: `1px solid ${rcpStyle.border}`,
                                borderRadius: '6px',
                                padding: '2px 8px',
                                fontWeight: 800,
                                fontSize: '0.73rem',
                              }}
                            >
                              {cf.indicateRcp}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td rowSpan={2} style={{ fontSize: '0.76rem', color: '#334155' }}>
                          {act.responsibleOfficer || '-'}
                        </td>
                        {customColumns.map((col: any) => {
                          const rawVal = act.customFields?.[col.key];
                          const displayVal =
                            rawVal === true
                              ? 'Yes'
                              : rawVal === false
                              ? 'No'
                              : rawVal !== undefined && rawVal !== null && rawVal !== ''
                              ? String(rawVal)
                              : '-';
                          return (
                            <td
                              key={`c-${act.id}-${col.id}`}
                              rowSpan={2}
                              style={{
                                textAlign: col.textAlign || 'left',
                                fontSize: '0.77rem',
                                color: '#1E293B',
                                background: '#FAFFFE',
                              }}
                            >
                              {displayVal}
                            </td>
                          );
                        })}
                        {hasActions && (
                          <td rowSpan={2} style={{ whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                              {onEditActivity && (
                                <button
                                  type="button"
                                  onClick={() => onEditActivity(act)}
                                  title="Edit activity"
                                  style={{
                                    background: '#EFF6FF',
                                    color: '#1D4ED8',
                                    border: '1px solid #BFDBFE',
                                    borderRadius: '6px',
                                    padding: '4px 8px',
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                  }}
                                >
                                  ✏️ Edit
                                </button>
                              )}
                              {onDeleteActivity && (
                                <button
                                  type="button"
                                  onClick={() => onDeleteActivity(act)}
                                  title="Remove activity"
                                  style={{
                                    background: '#FEF2F2',
                                    color: '#DC2626',
                                    border: '1px solid #FECACA',
                                    borderRadius: '6px',
                                    padding: '4px 8px',
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                  }}
                                >
                                  🗑️
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                      <tr>
                        <td className="type-physical">Physical Target</td>
                        {pm.map((val, idx) => (
                          <td
                            key={`p-${act.id}-${idx}`}
                            style={{ color: '#166534', fontWeight: 600 }}
                          >
                            {val || '-'}
                          </td>
                        ))}
                      </tr>
                    </React.Fragment>
                  );
                })}

                {/* Totals Footer Rows */}
                <tr className="total-row-fin">
                  <td colSpan={6} rowSpan={2} style={{ fontSize: '0.92rem', fontWeight: 800, textAlign: 'left', paddingLeft: '14px' }}>
                    Total
                  </td>
                  <td rowSpan={2} style={{ padding: '5px 6px' }}>
                    {renderMnCell(totals.totalEstimatedCost, {
                      align: 'center',
                      bold: true,
                      color: '#991B1B',
                    })}
                  </td>
                  <td style={{ fontWeight: 700, fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                    Financial Target
                  </td>
                  {totals.monthlyFinancial.map((mVal, idx) => (
                    <td key={`tot-fin-${idx}`} style={{ padding: '4px' }}>
                      {renderMnCell(mVal, { align: 'center', bold: true, color: '#991B1B' })}
                    </td>
                  ))}
                  <td rowSpan={2}></td>
                  <td rowSpan={2}></td>
                  <td rowSpan={2}></td>
                  {customColumns.map((col: any) => (
                    <td key={`tot-c-${col.id}`} rowSpan={2}></td>
                  ))}
                  {hasActions && <td rowSpan={2}></td>}
                </tr>
                <tr className="total-row-phys">
                  <td style={{ fontWeight: 700, fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                    Physical Target
                  </td>
                  {totals.monthlyPhysical.map((pVal, idx) => (
                    <td key={`tot-phys-${idx}`} style={{ fontWeight: 700 }}>
                      {pVal}%
                    </td>
                  ))}
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* User-Friendly R / C / P Legend Bar */}
      <div
        style={{
          padding: '0.9rem 1.25rem',
          background: '#F8FAFC',
          borderTop: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <span
            style={{
              background: '#EEF2FF',
              color: '#3730A3',
              border: '1px solid #C7D2FE',
              padding: '3px 10px',
              borderRadius: '999px',
              fontSize: '0.74rem',
              fontWeight: 700,
            }}
          >
            R – Reforms
          </span>
          <span
            style={{
              background: '#FEF3C7',
              color: '#92400E',
              border: '1px solid #FDE68A',
              padding: '3px 10px',
              borderRadius: '999px',
              fontSize: '0.74rem',
              fontWeight: 700,
            }}
          >
            C – Construction
          </span>
          <span
            style={{
              background: '#ECFDF5',
              color: '#065F46',
              border: '1px solid #A7F3D0',
              padding: '3px 10px',
              borderRadius: '999px',
              fontSize: '0.74rem',
              fontWeight: 700,
            }}
          >
            P – Procurement
          </span>
        </div>
        <div style={{ fontSize: '0.75rem', color: '#475569', fontStyle: 'italic' }}>
          (Use different serial numbers for different activities within the same category. Ex. R1, R2, R3, etc.)
        </div>
      </div>

      {/* Institutional Hard Copy Filing & Certification Footer */}
      <div
        style={{
          background: '#FAFAFA',
          borderTop: '2px dashed #CBD5E1',
          padding: '1.25rem 1.5rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem',
            flexWrap: 'wrap',
            gap: '0.5rem',
          }}
        >
          <div
            style={{
              fontSize: '0.8rem',
              fontWeight: 700,
              color: '#475569',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            Institutional Hard Copy Filing &amp; Certification — Ministry of Education Sri Lanka
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
            Document Telemetry: IPMIS-AIP-${year}-${branchCode.toUpperCase()}
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1.5rem',
            fontSize: '0.8rem',
            color: '#334155',
          }}
        >
          <div style={{ borderTop: '1px solid #94A3B8', paddingTop: '6px' }}>
            <div style={{ fontWeight: 800, color: '#0F172A' }}>Prepared By (Subject Officer):</div>
            <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '2px' }}>
              {mainResp || 'Subject Officer'} • {mainContact || 'Ext. Contact'}
            </div>
            <div style={{ marginTop: '16px', fontSize: '0.72rem', color: '#94A3B8' }}>
              Signature: _______________________
            </div>
          </div>

          <div style={{ borderTop: '1px solid #94A3B8', paddingTop: '6px' }}>
            <div style={{ fontWeight: 800, color: '#0F172A' }}>Checked &amp; Verified:</div>
            <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '2px' }}>
              Assistant Director / Planning Officer
            </div>
            <div style={{ marginTop: '16px', fontSize: '0.72rem', color: '#94A3B8' }}>
              Signature: _______________________
            </div>
          </div>

          <div style={{ borderTop: '1px solid #94A3B8', paddingTop: '6px' }}>
            <div style={{ fontWeight: 800, color: '#0F172A' }}>Approved (Head of Branch):</div>
            <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '2px' }}>
              {overallResp || 'Director of Education'} • {overallContact || 'Office Phone'}
            </div>
            <div style={{ marginTop: '16px', fontSize: '0.72rem', color: '#94A3B8' }}>
              Signature: _______________________
            </div>
          </div>

          <div style={{ borderTop: '1px solid #94A3B8', paddingTop: '6px' }}>
            <div style={{ fontWeight: 800, color: '#0F172A' }}>Official Stamp &amp; Filing Date:</div>
            <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '2px' }}>
              Date: ____ / ____ / {year}
            </div>
            <div style={{ marginTop: '16px', fontSize: '0.72rem', color: '#94A3B8' }}>
              Branch Official Seal: [ Stamp ]
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
