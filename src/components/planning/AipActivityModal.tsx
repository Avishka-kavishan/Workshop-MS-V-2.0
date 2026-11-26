'use client';

import React, { useEffect, useState } from 'react';

interface AipActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  branchId: string;
  branchName: string;
  year: string;
  activityCount: number;
  editingActivity?: any | null;
  aipTemplate?: any | null;
}

const MONTH_HEADERS = [
  'J (1)', 'F (2)', 'M (3)', 'A (4)', 'M (5)', 'J (6)',
  'J (7)', 'A (8)', 'S (9)', 'O (10)', 'N (11)', 'D (12)',
];

export default function AipActivityModal({
  isOpen,
  onClose,
  onSaved,
  branchId,
  branchName,
  year,
  activityCount,
  editingActivity = null,
  aipTemplate = null,
}: AipActivityModalProps) {
  const [outputNo, setOutputNo] = useState('1');
  const [programme, setProgramme] = useState('');
  const [activityCode, setActivityCode] = useState('1');
  const [activityDesc, setActivityDesc] = useState('');
  const [subActivities, setSubActivities] = useState('');
  const [voteNumber, setVoteNumber] = useState('-');
  const [sourceOfFinance, setSourceOfFinance] = useState('GOSL / Treasury');
  const [estimatedCost, setEstimatedCost] = useState('');
  const [kpi, setKpi] = useState('');
  const [indicateRcp, setIndicateRcp] = useState('');
  const [responsibleOfficer, setResponsibleOfficer] = useState('');
  const [remarks, setRemarks] = useState('');
  const [customValues, setCustomValues] = useState<Record<string, any>>({});

  const customColumns: any[] = (aipTemplate?.columns || [])
    .filter((c: any) => !c.isSystemCore && c.visible !== false)
    .sort((a: any, b: any) => (a.order || 0) - (b.order || 0));

  const getCoreCol = (key: string) => {
    if (!aipTemplate?.columns) return null;
    return aipTemplate.columns.find((c: any) => c.key === key) || null;
  };
  const isCoreVisible = (key: string) => {
    if (!aipTemplate?.columns) return true;
    const c = getCoreCol(key);
    return Boolean(c && c.visible !== false);
  };
  const getCoreLabel = (key: string, fallback: string) => getCoreCol(key)?.label || fallback;

  const [financialMonths, setFinancialMonths] = useState<number[]>(Array(12).fill(0));
  const [physicalMonths, setPhysicalMonths] = useState<string[]>(Array(12).fill('-'));

  const [financialQ1, setFinancialQ1] = useState(0);
  const [financialQ2, setFinancialQ2] = useState(0);
  const [financialQ3, setFinancialQ3] = useState(0);
  const [financialQ4, setFinancialQ4] = useState(0);

  const [targetQ1, setTargetQ1] = useState('-');
  const [targetQ2, setTargetQ2] = useState('-');
  const [targetQ3, setTargetQ3] = useState('-');
  const [targetQ4, setTargetQ4] = useState('100%');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    if (editingActivity) {
      const cf = editingActivity.customFields || {};
      setOutputNo(editingActivity.outputNo || '1');
      setProgramme(cf.programme || '');
      setActivityCode(editingActivity.activityCode || '1');
      setActivityDesc(editingActivity.activity || '');
      setSubActivities(cf.subActivities || '');
      setVoteNumber(editingActivity.voteNumber || '-');
      setSourceOfFinance(cf.sourceOfFinance || 'GOSL / Treasury');
      setEstimatedCost(
        editingActivity.estimatedCost !== undefined ? String(editingActivity.estimatedCost) : ''
      );
      setKpi(cf.kpi || '');
      setIndicateRcp(cf.indicateRcp || '');
      setResponsibleOfficer(editingActivity.responsibleOfficer || '');
      setRemarks(editingActivity.remarks || '');

      const fm = Array.isArray(editingActivity.financialMonths)
        ? editingActivity.financialMonths.map((v: any) => Number(v) || 0)
        : Array(12).fill(0);
      const pm = Array.isArray(editingActivity.physicalMonths)
        ? editingActivity.physicalMonths.map((v: any) => (v ? String(v) : '-'))
        : Array(12).fill('-');
      setFinancialMonths(fm);
      setPhysicalMonths(pm);

      const q1 = Number(editingActivity.financialQ1 ?? (fm[0] + fm[1] + fm[2])) || 0;
      const q2 = Number(editingActivity.financialQ2 ?? (q1 + fm[3] + fm[4] + fm[5])) || 0;
      const q3 = Number(editingActivity.financialQ3 ?? (q2 + fm[6] + fm[7] + fm[8])) || 0;
      const q4 = Number(editingActivity.financialQ4 ?? (q3 + fm[9] + fm[10] + fm[11])) || 0;
      setFinancialQ1(q1);
      setFinancialQ2(q2);
      setFinancialQ3(q3);
      setFinancialQ4(q4);

      setTargetQ1(editingActivity.targetQ1 || '-');
      setTargetQ2(editingActivity.targetQ2 || '-');
      setTargetQ3(editingActivity.targetQ3 || '-');
      setTargetQ4(editingActivity.targetQ4 || '100%');
      setCustomValues(editingActivity.customFields || {});
    } else {
      setOutputNo('1');
      setProgramme('');
      setActivityCode(String(activityCount + 1));
      setActivityDesc('');
      setSubActivities('');
      setVoteNumber('-');
      setSourceOfFinance('GOSL / Treasury');
      setEstimatedCost('');
      setKpi('');
      setIndicateRcp('');
      setResponsibleOfficer('');
      setRemarks('');
      setFinancialMonths(Array(12).fill(0));
      setPhysicalMonths(Array(12).fill('-'));
      setFinancialQ1(0);
      setFinancialQ2(0);
      setFinancialQ3(0);
      setFinancialQ4(0);
      setTargetQ1('-');
      setTargetQ2('-');
      setTargetQ3('-');
      setTargetQ4('100%');
      const initCustom: Record<string, any> = {};
      (aipTemplate?.columns || []).forEach((c: any) => {
        if (!c.isSystemCore && c.defaultValue !== undefined) {
          initCustom[c.key] = c.defaultValue;
        }
      });
      setCustomValues(initCustom);
    }
  }, [isOpen, editingActivity, activityCount, aipTemplate]);

  if (!isOpen) return null;

  const handleFinancialMonthChange = (idx: number, rawVal: string) => {
    const val = parseFloat(rawVal);
    const next = [...financialMonths];
    next[idx] = isNaN(val) ? 0 : val;
    setFinancialMonths(next);

    const q1 = Math.round((next[0] + next[1] + next[2]) * 1e6) / 1e6;
    const q2 = Math.round((q1 + next[3] + next[4] + next[5]) * 1e6) / 1e6;
    const q3 = Math.round((q2 + next[6] + next[7] + next[8]) * 1e6) / 1e6;
    const q4 = Math.round((q3 + next[9] + next[10] + next[11]) * 1e6) / 1e6;
    setFinancialQ1(q1);
    setFinancialQ2(q2);
    setFinancialQ3(q3);
    setFinancialQ4(q4);
  };

  const handlePhysicalMonthChange = (idx: number, val: string) => {
    const next = [...physicalMonths];
    next[idx] = val;
    setPhysicalMonths(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const primaryTitle = isCoreVisible('activity') ? activityDesc.trim() : (programme.trim() || activityDesc.trim());
    if (!primaryTitle) {
      setError(`${getCoreLabel('programme', 'Key Activities')} description is required.`);
      return;
    }

    try {
      setSaving(true);
      setError('');
      const isEdit = Boolean(editingActivity?.id);
      const res = await fetch('/api/annual-plan/activities', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(isEdit ? { id: editingActivity.id } : {}),
          branchId,
          branchName,
          year,
          outputNo: outputNo.trim() || '1',
          activityCode: activityCode.trim() || '1',
          activity: primaryTitle,
          voteNumber: voteNumber.trim() || '-',
          estimatedCost: parseFloat(estimatedCost) || financialQ4 || 0,
          financialMonths,
          physicalMonths: physicalMonths.map((p) => (p.trim() ? p.trim() : '-')),
          financialQ1,
          financialQ2,
          financialQ3,
          financialQ4,
          targetQ1: targetQ1.trim() || '-',
          targetQ2: targetQ2.trim() || '-',
          targetQ3: targetQ3.trim() || '-',
          targetQ4: targetQ4.trim() || '100%',
          responsibleOfficer: responsibleOfficer.trim(),
          remarks: remarks.trim(),
          customFields: {
            ...(editingActivity?.customFields || {}),
            ...customValues,
            programme: programme.trim(),
            subActivities: subActivities.trim(),
            sourceOfFinance: sourceOfFinance.trim(),
            kpi: kpi.trim(),
            indicateRcp: indicateRcp.trim(),
          },
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Failed to save activity.');
        return;
      }

      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Network error saving activity.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(3px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '14px',
          maxWidth: '960px',
          width: '100%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.25)',
        }}
      >
        {/* Maroon Modal Header */}
        <div
          style={{
            background: '#7A1228',
            color: '#FFFFFF',
            padding: '1rem 1.4rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <span>{editingActivity ? '✏️' : '➕'}</span>
              <span>{editingActivity ? 'Edit Activity' : 'Add Activity'}</span>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.85)', marginTop: '2px' }}>
              {year} Budget Projection Form • {branchName}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#FFFFFF',
              fontSize: '1.35rem',
              cursor: 'pointer',
              lineHeight: 1,
              padding: '0.25rem',
            }}
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
          <div style={{ padding: '1.25rem 1.4rem', overflowY: 'auto', flex: 1 }}>
            {error && (
              <div
                style={{
                  background: '#FEF2F2',
                  border: '1px solid #FCA5A5',
                  color: '#B91C1C',
                  padding: '0.6rem 0.85rem',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  marginBottom: '1rem',
                }}
              >
                ⚠️ {error}
              </div>
            )}

            {/* 1. ACTIVITY DETAILS */}
            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#7A1228', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>
              1. ACTIVITY DETAILS
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.85rem', marginBottom: '0.85rem' }}>
              {isCoreVisible('outputNo') && (
                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1E293B' }}>
                    {getCoreLabel('outputNo', 'Outcome / Output No.')}
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={outputNo}
                    onChange={(e) => setOutputNo(e.target.value)}
                    placeholder="1"
                  />
                </div>
              )}
              {isCoreVisible('programme') && (
                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1E293B' }}>
                    <span style={{ color: '#DC2626' }}>*</span> {getCoreLabel('programme', 'Programme')}
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={programme}
                    onChange={(e) => setProgramme(e.target.value)}
                    required={!isCoreVisible('activity')}
                    placeholder="e.g. General Education Quality"
                  />
                </div>
              )}
              {isCoreVisible('voteNumber') && (
                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1E293B' }}>
                    {getCoreLabel('voteNumber', 'Vote Number')}
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={voteNumber}
                    onChange={(e) => setVoteNumber(e.target.value)}
                    placeholder="e.g. 126-02-03-2502"
                  />
                </div>
              )}
              {isCoreVisible('sourceOfFinance') && (
                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1E293B' }}>
                    <span style={{ color: '#DC2626' }}>*</span> {getCoreLabel('sourceOfFinance', 'Source of Finance')}
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={sourceOfFinance}
                    onChange={(e) => setSourceOfFinance(e.target.value)}
                    placeholder="e.g. GOSL / Treasury / ADB"
                  />
                </div>
              )}
              {isCoreVisible('estimatedCost') && (
                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1E293B' }}>
                    {getCoreLabel('estimatedCost', 'Allocation / Estimated Cost (Mn)')}
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    className="form-input"
                    value={estimatedCost}
                    onChange={(e) => setEstimatedCost(e.target.value)}
                    placeholder="e.g. 80.0 or 0.2"
                  />
                </div>
              )}
            </div>

            {(isCoreVisible('activity') || isCoreVisible('subActivities')) && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.85rem', marginBottom: '0.85rem' }}>
                {isCoreVisible('activity') && (
                  <div>
                    <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1E293B' }}>
                      {getCoreLabel('activity', 'Key Activities')} <span style={{ color: '#DC2626' }}>*</span>
                    </label>
                    <textarea
                      className="form-input"
                      rows={2}
                      value={activityDesc}
                      onChange={(e) => setActivityDesc(e.target.value)}
                      required
                      placeholder="Enter key activity description..."
                      style={{ resize: 'vertical' }}
                    />
                  </div>
                )}
                {isCoreVisible('subActivities') && (
                  <div>
                    <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1E293B' }}>
                      <span style={{ color: '#DC2626' }}>*</span> {getCoreLabel('subActivities', 'Sub Activities')}
                    </label>
                    <textarea
                      className="form-input"
                      rows={2}
                      value={subActivities}
                      onChange={(e) => setSubActivities(e.target.value)}
                      placeholder="Enter sub-activities..."
                      style={{ resize: 'vertical' }}
                    />
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '0.85rem', marginBottom: '1.25rem' }}>
              {isCoreVisible('kpi') && (
                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1E293B' }}>
                    <span style={{ color: '#DC2626' }}>*</span> {getCoreLabel('kpi', 'KPI')}
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={kpi}
                    onChange={(e) => setKpi(e.target.value)}
                    placeholder="Key Performance Indicator"
                  />
                </div>
              )}
              {isCoreVisible('indicateRcp') && (
                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1E293B' }}>
                    <span style={{ color: '#DC2626' }}>*</span> {getCoreLabel('indicateRcp', 'Indicate R/C/P')}
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={indicateRcp}
                    onChange={(e) => setIndicateRcp(e.target.value)}
                    placeholder="e.g. R1, C1, P1"
                  />
                  <div style={{ fontSize: '0.68rem', color: '#64748B', marginTop: '2px' }}>
                    R – Reforms, C – Construction, P – Procurement
                  </div>
                </div>
              )}
              {isCoreVisible('responsibility') && (
                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1E293B' }}>
                    {getCoreLabel('responsibility', 'Responsibility')}
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={responsibleOfficer}
                    onChange={(e) => setResponsibleOfficer(e.target.value)}
                    placeholder="e.g. Director / AD / Subject Officer"
                  />
                </div>
              )}
            </div>

            {/* Custom Template Fields (Managed by System Admin) */}
            {customColumns.length > 0 && (
              <div style={{ marginBottom: '1.25rem', padding: '0.85rem 1rem', background: '#F0FDFA', border: '1px solid #CCFBF1', borderRadius: '10px' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0F766E', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.65rem' }}>
                  Custom Template Columns ({customColumns.length})
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                  {customColumns.map((col: any) => (
                    <div key={col.id}>
                      <label className="form-label" style={{ fontSize: '0.76rem', fontWeight: 700, color: '#1E293B' }}>
                        {col.label} {col.required && <span style={{ color: '#DC2626' }}>*</span>}
                      </label>
                      {col.dataType === 'dropdown' ? (
                        <select
                          className="form-input"
                          required={col.required}
                          value={customValues[col.key] ?? ''}
                          onChange={(e) => setCustomValues({ ...customValues, [col.key]: e.target.value })}
                        >
                          <option value="">-- Select --</option>
                          {(col.options || []).map((opt: string) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : col.dataType === 'boolean' ? (
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.82rem', paddingTop: '0.35rem' }}>
                          <input
                            type="checkbox"
                            checked={Boolean(customValues[col.key])}
                            onChange={(e) => setCustomValues({ ...customValues, [col.key]: e.target.checked })}
                          />
                          <span>Yes / Enabled</span>
                        </label>
                      ) : col.dataType === 'textarea' ? (
                        <textarea
                          className="form-input"
                          rows={2}
                          required={col.required}
                          value={customValues[col.key] ?? ''}
                          onChange={(e) => setCustomValues({ ...customValues, [col.key]: e.target.value })}
                        />
                      ) : (
                        <input
                          type={col.dataType === 'number' || col.dataType === 'currency' || col.dataType === 'percentage' ? 'number' : col.dataType === 'date' ? 'date' : 'text'}
                          step="any"
                          className="form-input"
                          required={col.required}
                          value={customValues[col.key] ?? ''}
                          onChange={(e) => setCustomValues({ ...customValues, [col.key]: e.target.value })}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 2. TIME FRAME (JANUARY - DECEMBER) */}
            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#7A1228', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.25rem' }}>
              2. TIME FRAME — OVERALL PHYSICAL AND FINANCIAL TARGETS {year}
            </div>
            <p style={{ fontSize: '0.76rem', color: '#64748B', margin: '0 0 0.6rem' }}>
              Enter monthly Financial Target (Rs. Mn) and Physical Target for J–D.
            </p>

            <div style={{ overflowX: 'auto', marginBottom: '1.25rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem', minWidth: '760px' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC' }}>
                    <th style={{ border: '1px solid #CBD5E1', padding: '6px 8px', textAlign: 'left', width: '130px', color: '#0F172A' }}>
                      Target Type
                    </th>
                    {MONTH_HEADERS.map((m) => (
                      <th key={m} style={{ border: '1px solid #CBD5E1', padding: '6px 4px', textAlign: 'center', color: '#0F172A' }}>
                        {m}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ border: '1px solid #CBD5E1', padding: '6px 8px', background: '#FDF2F4', color: '#7A1C2D', fontWeight: 700 }}>
                      Financial Target
                    </td>
                    {financialMonths.map((val, idx) => (
                      <td key={`fin-m-${idx}`} style={{ border: '1px solid #CBD5E1', padding: '4px' }}>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={val}
                          onChange={(e) => handleFinancialMonthChange(idx, e.target.value)}
                          style={{
                            width: '100%',
                            border: '1px solid #E2E8F0',
                            borderRadius: '4px',
                            padding: '3px 4px',
                            textAlign: 'center',
                            fontSize: '0.75rem',
                          }}
                        />
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td style={{ border: '1px solid #CBD5E1', padding: '6px 8px', background: '#F0FDF4', color: '#166534', fontWeight: 700 }}>
                      Physical Target
                    </td>
                    {physicalMonths.map((val, idx) => (
                      <td key={`phys-m-${idx}`} style={{ border: '1px solid #CBD5E1', padding: '4px' }}>
                        <input
                          type="text"
                          value={val}
                          onChange={(e) => handlePhysicalMonthChange(idx, e.target.value)}
                          style={{
                            width: '100%',
                            border: '1px solid #E2E8F0',
                            borderRadius: '4px',
                            padding: '3px 4px',
                            textAlign: 'center',
                            fontSize: '0.75rem',
                          }}
                        />
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 3. QUARTERLY CUMULATIVE TARGETS (Q1 - Q4) */}
            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#7A1228', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
              3. QUARTERLY CUMULATIVE TARGETS (Q1 – Q4)
            </div>

            <div
              style={{
                background: '#FEF3C7',
                border: '1px solid #FDE68A',
                borderRadius: '10px',
                padding: '0.85rem 1rem',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '1.25rem',
              }}
            >
              <div>
                <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#92400E', marginBottom: '0.45rem' }}>
                  Financial Quarters (Cumulative)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                  {[
                    { label: 'Q1', val: financialQ1, set: setFinancialQ1 },
                    { label: 'Q2', val: financialQ2, set: setFinancialQ2 },
                    { label: 'Q3', val: financialQ3, set: setFinancialQ3 },
                    { label: 'Q4', val: financialQ4, set: setFinancialQ4 },
                  ].map((q) => (
                    <div key={`fq-${q.label}`}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#78350F', marginBottom: '2px' }}>{q.label}</div>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={q.val}
                        onChange={(e) => q.set(parseFloat(e.target.value) || 0)}
                        style={{
                          width: '100%',
                          background: '#FFFFFF',
                          border: '1px solid #FCD34D',
                          borderRadius: '6px',
                          padding: '4px 6px',
                          textAlign: 'center',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#92400E', marginBottom: '0.45rem' }}>
                  Physical Quarters (Cumulative %)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                  {[
                    { label: 'Q1', val: targetQ1, set: setTargetQ1 },
                    { label: 'Q2', val: targetQ2, set: setTargetQ2 },
                    { label: 'Q3', val: targetQ3, set: setTargetQ3 },
                    { label: 'Q4', val: targetQ4, set: setTargetQ4 },
                  ].map((q) => (
                    <div key={`pq-${q.label}`}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#78350F', marginBottom: '2px' }}>{q.label}</div>
                      <input
                        type="text"
                        value={q.val}
                        onChange={(e) => q.set(e.target.value)}
                        style={{
                          width: '100%',
                          background: '#FFFFFF',
                          border: '1px solid #FCD34D',
                          borderRadius: '6px',
                          padding: '4px 6px',
                          textAlign: 'center',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div
            style={{
              padding: '0.85rem 1.4rem',
              borderTop: '1px solid #E2E8F0',
              background: '#F8FAFC',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.65rem',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              className="btn"
              style={{
                background: '#FFFFFF',
                border: '1px solid #CBD5E1',
                color: '#334155',
                fontWeight: 700,
                fontSize: '0.84rem',
                padding: '0.5rem 1.1rem',
                borderRadius: '8px',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary"
              style={{
                background: '#7A1228',
                borderColor: '#7A1228',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '0.84rem',
                padding: '0.5rem 1.25rem',
                borderRadius: '8px',
              }}
            >
              {saving ? 'Saving...' : editingActivity ? 'Update Activity' : 'Save Activity'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
