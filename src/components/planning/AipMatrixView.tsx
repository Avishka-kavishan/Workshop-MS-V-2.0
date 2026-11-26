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
    const quarterlyFinancial = [0, 0, 0, 0];

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
      const q1 = Number(a.financialQ1 ?? (fm[0] + fm[1] + fm[2])) || 0;
      const q2 = Number(a.financialQ2 ?? (q1 + fm[3] + fm[4] + fm[5])) || 0;
      const q3 = Number(a.financialQ3 ?? (q2 + fm[6] + fm[7] + fm[8])) || 0;
      const q4 = Number(a.financialQ4 ?? (q3 + fm[9] + fm[10] + fm[11])) || 0;
      quarterlyFinancial[0] += q1;
      quarterlyFinancial[1] += q2;
      quarterlyFinancial[2] += q3;
      quarterlyFinancial[3] += q4;
    });

    const n = displayedActivities.length;
    const monthlyPhysical = monthlyPhysicalCounts.map((sum) =>
      n > 0 ? Math.round(sum / n) : 0
    );

    const quarterTargetSum = [0, 0, 0, 0];
    displayedActivities.forEach((a) => {
      const targets = [a.targetQ1, a.targetQ2, a.targetQ3, a.targetQ4];
      targets.forEach((t, idx) => {
        const val = parseFloat(String(t || '').replace('%', ''));
        if (!isNaN(val)) quarterTargetSum[idx] += val;
      });
    });
    const quarterlyPhysical = quarterTargetSum.map((sum) =>
      n > 0 ? Math.round(sum / n) : 0
    );

    return {
      totalEstimatedCost,
      monthlyFinancial,
      monthlyPhysical,
      quarterlyFinancial,
      quarterlyPhysical,
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

  const hasActions = Boolean(onEditActivity || onDeleteActivity);

  const customColumns: any[] = useMemo(() => {
    if (!aipTemplate?.columns) return [];
    return aipTemplate.columns
      .filter((c: any) => !c.isSystemCore && c.visible !== false)
      .sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
  }, [aipTemplate]);

  const getTemplateCol = (key: string) => {
    if (!aipTemplate?.columns) return null;
    return aipTemplate.columns.find((c: any) => c.key === key) || null;
  };

  const isCoreVisible = (key: string) => {
    if (!aipTemplate?.columns) return true;
    const found = getTemplateCol(key);
    return Boolean(found && found.visible !== false);
  };

  const getCoreLabel = (key: string, fallback: string) => {
    const found = getTemplateCol(key);
    return found?.label || fallback;
  };

  const showOutputNo = isCoreVisible('outputNo');
  const showProgramme = isCoreVisible('programme');
  const showActivity = isCoreVisible('activity');
  const showSubActivities = isCoreVisible('subActivities');
  const showVoteNumber = isCoreVisible('voteNumber');
  const showSourceOfFinance = isCoreVisible('sourceOfFinance');
  const showEstimatedCost = isCoreVisible('estimatedCost');
  const showKpi = isCoreVisible('kpi');
  const showIndicateRcp = isCoreVisible('indicateRcp');
  const showResponsibility = isCoreVisible('responsibility');
  const showQuarterlyTargets = !aipTemplate?.columns || !getTemplateCol('quarterlyTargets') || getTemplateCol('quarterlyTargets')?.visible !== false;

  const leftColsCount =
    (showOutputNo ? 1 : 0) +
    (showProgramme ? 1 : 0) +
    (showActivity ? 1 : 0) +
    (showSubActivities ? 1 : 0) +
    (showVoteNumber ? 1 : 0) +
    (showSourceOfFinance ? 1 : 0);

  const rightColsCount =
    (showKpi ? 1 : 0) +
    (showIndicateRcp ? 1 : 0) +
    (showResponsibility ? 1 : 0);

  const handleExportFullCsv = () => {
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows: string[][] = [
      [`Ministry of Education Sri Lanka - Budget Projection Form (${year})`],
      [`Branch / Institution`, branchName],
      [`Outcome`, outcome || ''],
      [`* Thematic Priority Area`, thematicPriorityArea || ''],
      [`Intermediate Outcome`, intermediateOutcome || ''],
      [`* Main Focus Area`, mainFocusArea || ''],
      [`Main responsibility`, mainResp || '', `Contact No`, mainContact || ''],
      [`Overall responsibility`, overallResp || '', `Contact No`, overallContact || ''],
      [],
    ];

    const headers: string[] = [];
    if (showOutputNo) headers.push(getCoreLabel('outputNo', 'Outcome / Output No.'));
    if (showProgramme) headers.push(getCoreLabel('programme', 'Programme'));
    if (showActivity) headers.push(getCoreLabel('activity', 'Key Activities'));
    if (showSubActivities) headers.push(getCoreLabel('subActivities', 'Sub Activities'));
    if (showVoteNumber) headers.push(getCoreLabel('voteNumber', 'Vote Number'));
    if (showSourceOfFinance) headers.push(getCoreLabel('sourceOfFinance', 'Source of Finance'));
    if (showEstimatedCost) headers.push(getCoreLabel('estimatedCost', 'Allocation / Estimated Cost (Mn)'));
    headers.push('Target Type');
    MONTH_NAMES_SHORT.forEach((m) => headers.push(m));
    if (showQuarterlyTargets) ['Q1', 'Q2', 'Q3', 'Q4'].forEach((q) => headers.push(q));
    if (showKpi) headers.push(getCoreLabel('kpi', 'KPI'));
    if (showIndicateRcp) headers.push(getCoreLabel('indicateRcp', 'Indicate R/C/P'));
    if (showResponsibility) headers.push(getCoreLabel('responsibility', 'Responsibility'));
    customColumns.forEach((c: any) => headers.push(c.label));
    rows.push(headers);

    displayedActivities.forEach((act) => {
      const fm = act.financialMonths || Array(12).fill(0);
      const pm = act.physicalMonths || Array(12).fill('-');
      const cf = act.customFields || {};
      const q1Fin = Number(act.financialQ1 ?? (fm[0] + fm[1] + fm[2])) || 0;
      const q2Fin = Number(act.financialQ2 ?? (q1Fin + fm[3] + fm[4] + fm[5])) || 0;
      const q3Fin = Number(act.financialQ3 ?? (q2Fin + fm[6] + fm[7] + fm[8])) || 0;
      const q4Fin = Number(act.financialQ4 ?? (q3Fin + fm[9] + fm[10] + fm[11])) || 0;

      const finRow: string[] = [];
      if (showOutputNo) finRow.push(act.outputNo || '-');
      if (showProgramme) finRow.push(cf.programme || (!showActivity ? act.activity : '-'));
      if (showActivity) finRow.push(act.activity || '');
      if (showSubActivities) finRow.push(cf.subActivities || '-');
      if (showVoteNumber) finRow.push(act.voteNumber || '-');
      if (showSourceOfFinance) finRow.push(cf.sourceOfFinance || '-');
      if (showEstimatedCost) finRow.push(String(Number(act.estimatedCost) || 0));
      finRow.push('Financial Target');
      fm.forEach((v) => finRow.push(String(Number(v) || 0)));
      if (showQuarterlyTargets) [q1Fin, q2Fin, q3Fin, q4Fin].forEach((q) => finRow.push(String(q)));
      if (showKpi) finRow.push(cf.kpi || '-');
      if (showIndicateRcp) finRow.push(cf.indicateRcp || '-');
      if (showResponsibility) finRow.push(act.responsibleOfficer || '-');
      customColumns.forEach((c: any) => finRow.push(String(cf[c.key] ?? '-')));
      rows.push(finRow);

      const physRow: string[] = [];
      for (let i = 0; i < leftColsCount + (showEstimatedCost ? 1 : 0); i++) physRow.push('');
      physRow.push('Physical Target');
      pm.forEach((v) => physRow.push(String(v || '-')));
      if (showQuarterlyTargets) {
        physRow.push(act.targetQ1 || '-', act.targetQ2 || '-', act.targetQ3 || '-', act.targetQ4 || '100%');
      }
      for (let i = 0; i < rightColsCount + customColumns.length; i++) physRow.push('');
      rows.push(physRow);
    });

    const totFinRow: string[] = [];
    if (leftColsCount > 0) {
      totFinRow.push('Total');
      for (let i = 1; i < leftColsCount; i++) totFinRow.push('');
    }
    if (showEstimatedCost) totFinRow.push(String(totals.totalEstimatedCost));
    totFinRow.push('Financial Target');
    totals.monthlyFinancial.forEach((v) => totFinRow.push(String(v)));
    if (showQuarterlyTargets) totals.quarterlyFinancial.forEach((q) => totFinRow.push(String(q)));
    rows.push(totFinRow);

    const totPhysRow: string[] = [];
    for (let i = 0; i < leftColsCount + (showEstimatedCost ? 1 : 0); i++) totPhysRow.push('');
    totPhysRow.push('Physical Target');
    totals.monthlyPhysical.forEach((v) => totPhysRow.push(`${v}%`));
    if (showQuarterlyTargets) totals.quarterlyPhysical.forEach((q) => totPhysRow.push(`${q}%`));
    rows.push(totPhysRow);

    rows.push([]);
    rows.push(['R – Reforms', 'C – Construction', 'P – Procurement']);

    const csv = '\uFEFF' + rows.map((r) => r.map(esc).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Budget_Projection_${branchCode.toUpperCase()}_${year}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportFullPdfPrint = () => {
    const win = window.open('', '_blank', 'width=1280,height=850');
    if (!win) return;

    const thStyle = 'border:1px solid #64748b;padding:5px 6px;background:#f8fafc;font-size:11px;font-weight:700;text-align:center;';
    const tdStyle = 'border:1px solid #94a3b8;padding:4px 6px;font-size:11px;text-align:center;vertical-align:middle;';
    const escHtml = (s: any) =>
      String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    const bodyRows = displayedActivities
      .map((act) => {
        const fm = act.financialMonths || Array(12).fill(0);
        const pm = act.physicalMonths || Array(12).fill('-');
        const cf = act.customFields || {};
        const q1Fin = Number(act.financialQ1 ?? (fm[0] + fm[1] + fm[2])) || 0;
        const q2Fin = Number(act.financialQ2 ?? (q1Fin + fm[3] + fm[4] + fm[5])) || 0;
        const q3Fin = Number(act.financialQ3 ?? (q2Fin + fm[6] + fm[7] + fm[8])) || 0;
        const q4Fin = Number(act.financialQ4 ?? (q3Fin + fm[9] + fm[10] + fm[11])) || 0;

        return `
          <tr>
            ${showOutputNo ? `<td rowspan="2" style="${tdStyle}font-weight:700;">${escHtml(act.outputNo || '-')}</td>` : ''}
            ${showProgramme ? `<td rowspan="2" style="${tdStyle}text-align:left;">${escHtml(cf.programme || (!showActivity ? act.activity : '-'))}</td>` : ''}
            ${showActivity ? `<td rowspan="2" style="${tdStyle}text-align:left;font-weight:700;">${escHtml(act.activity)}</td>` : ''}
            ${showSubActivities ? `<td rowspan="2" style="${tdStyle}text-align:left;">${escHtml(cf.subActivities || '-')}</td>` : ''}
            ${showVoteNumber ? `<td rowspan="2" style="${tdStyle}">${escHtml(act.voteNumber || '-')}</td>` : ''}
            ${showSourceOfFinance ? `<td rowspan="2" style="${tdStyle}">${escHtml(cf.sourceOfFinance || '-')}</td>` : ''}
            ${showEstimatedCost ? `<td rowspan="2" style="${tdStyle}font-weight:700;">${formatMillion(Number(act.estimatedCost) || 0)}</td>` : ''}
            <td style="${tdStyle}background:#fdf2f4;color:#7a1c2d;font-weight:700;">Financial Target</td>
            ${fm.map((v) => `<td style="${tdStyle}">${formatMillion(Number(v) || 0)}</td>`).join('')}
            ${showQuarterlyTargets ? `<td style="${tdStyle}background:#fffbeb;">${formatMillion(q1Fin)}</td><td style="${tdStyle}background:#fffbeb;">${formatMillion(q2Fin)}</td><td style="${tdStyle}background:#fffbeb;">${formatMillion(q3Fin)}</td><td style="${tdStyle}background:#fffbeb;font-weight:700;">${formatMillion(q4Fin)}</td>` : ''}
            ${showKpi ? `<td rowspan="2" style="${tdStyle}text-align:left;">${escHtml(cf.kpi || '-')}</td>` : ''}
            ${showIndicateRcp ? `<td rowspan="2" style="${tdStyle}font-weight:700;color:#7a1c2d;">${escHtml(cf.indicateRcp || '-')}</td>` : ''}
            ${showResponsibility ? `<td rowspan="2" style="${tdStyle}">${escHtml(act.responsibleOfficer || '-')}</td>` : ''}
            ${customColumns.map((c: any) => `<td rowspan="2" style="${tdStyle}">${escHtml(cf[c.key] ?? '-')}</td>`).join('')}
          </tr>
          <tr>
            <td style="${tdStyle}background:#f0fdf4;color:#166534;font-weight:700;">Physical Target</td>
            ${pm.map((v) => `<td style="${tdStyle}color:#166534;">${escHtml(v || '-')}</td>`).join('')}
            ${showQuarterlyTargets ? `<td style="${tdStyle}background:#f0fdf4;">${escHtml(act.targetQ1 || '-')}</td><td style="${tdStyle}background:#f0fdf4;">${escHtml(act.targetQ2 || '-')}</td><td style="${tdStyle}background:#f0fdf4;">${escHtml(act.targetQ3 || '-')}</td><td style="${tdStyle}background:#f0fdf4;font-weight:700;">${escHtml(act.targetQ4 || '100%')}</td>` : ''}
          </tr>
        `;
      })
      .join('');

    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Budget Projection Form - ${escHtml(branchName)} (${year})</title>
  <style>
    @page { size: A4 landscape; margin: 10mm; }
    body { font-family: Arial, sans-serif; color: #0f172a; margin: 0; padding: 12px; }
    table { width: 100%; border-collapse: collapse; }
  </style>
</head>
<body>
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
    <div>
      <div style="font-size:11px;font-weight:700;color:#7a1c2d;text-transform:uppercase;">Ministry of Education Sri Lanka</div>
      <div style="font-size:16px;font-weight:800;">Budget Projection &amp; Annual Implementation Plan ${year} — ${escHtml(branchName)}</div>
    </div>
    <div style="font-size:11px;color:#475569;">IPMIS-AIP-${year}-${escHtml(branchCode.toUpperCase())}</div>
  </div>
  <table style="margin-bottom:10px;font-size:11px;">
    <tr><td style="${tdStyle}text-align:left;font-weight:700;width:190px;background:#f8fafc;">Outcome:</td><td colspan="3" style="${tdStyle}text-align:left;">${escHtml(outcome)}</td></tr>
    <tr><td style="${tdStyle}text-align:left;font-weight:700;background:#f8fafc;">* Thematic Priority Area:</td><td colspan="3" style="${tdStyle}text-align:left;">${escHtml(thematicPriorityArea)}</td></tr>
    <tr><td style="${tdStyle}text-align:left;font-weight:700;background:#f8fafc;">Intermediate Outcome:</td><td colspan="3" style="${tdStyle}text-align:left;">${escHtml(intermediateOutcome)}</td></tr>
    <tr><td style="${tdStyle}text-align:left;font-weight:700;background:#f8fafc;">* Main Focus Area:</td><td colspan="3" style="${tdStyle}text-align:left;">${escHtml(mainFocusArea)}</td></tr>
    <tr><td style="${tdStyle}text-align:left;font-weight:700;background:#f8fafc;">Main responsibility:</td><td style="${tdStyle}text-align:left;">${escHtml(mainResp)}</td><td style="${tdStyle}text-align:left;font-weight:700;width:100px;background:#f8fafc;">Contact No:</td><td style="${tdStyle}text-align:left;">${escHtml(mainContact)}</td></tr>
    <tr><td style="${tdStyle}text-align:left;font-weight:700;background:#f8fafc;">Overall responsibility:</td><td style="${tdStyle}text-align:left;">${escHtml(overallResp)}</td><td style="${tdStyle}text-align:left;font-weight:700;background:#f8fafc;">Contact No:</td><td style="${tdStyle}text-align:left;">${escHtml(overallContact)}</td></tr>
  </table>
  <table>
    <thead>
      <tr>
        ${showOutputNo ? `<th rowspan="3" style="${thStyle}">${escHtml(getCoreLabel('outputNo', 'Outcome / Output No.'))}</th>` : ''}
        ${showProgramme ? `<th rowspan="3" style="${thStyle}">* ${escHtml(getCoreLabel('programme', 'Programme'))}</th>` : ''}
        ${showActivity ? `<th rowspan="3" style="${thStyle}">${escHtml(getCoreLabel('activity', 'Key Activities'))}</th>` : ''}
        ${showSubActivities ? `<th rowspan="3" style="${thStyle}">* ${escHtml(getCoreLabel('subActivities', 'Sub Activities'))}</th>` : ''}
        ${showVoteNumber ? `<th rowspan="3" style="${thStyle}">${escHtml(getCoreLabel('voteNumber', 'Vote Number'))}</th>` : ''}
        ${showSourceOfFinance ? `<th rowspan="3" style="${thStyle}">* ${escHtml(getCoreLabel('sourceOfFinance', 'Source of Finance'))}</th>` : ''}
        ${showEstimatedCost ? `<th rowspan="3" style="${thStyle}">${escHtml(getCoreLabel('estimatedCost', 'Allocation / Estimated Cost (Mn)'))}</th>` : ''}
        <th rowspan="3" style="${thStyle}">Target</th>
        <th colspan="${12 + (showQuarterlyTargets ? 4 : 0)}" style="${thStyle}background:#7a1c2d;color:#fff;">Overall Physical and Financial Targets ${year}</th>
        ${showKpi ? `<th rowspan="3" style="${thStyle}">* ${escHtml(getCoreLabel('kpi', 'KPI'))}</th>` : ''}
        ${showIndicateRcp ? `<th rowspan="3" style="${thStyle}">* ${escHtml(getCoreLabel('indicateRcp', 'Indicate R/C/P'))}</th>` : ''}
        ${showResponsibility ? `<th rowspan="3" style="${thStyle}">${escHtml(getCoreLabel('responsibility', 'Responsibility'))}</th>` : ''}
        ${customColumns.map((c: any) => `<th rowspan="3" style="${thStyle}">${escHtml(c.label)}</th>`).join('')}
      </tr>
      <tr>
        <th colspan="12" style="${thStyle}background:#eff6ff;color:#1e3a8a;">Time Frame</th>
        ${showQuarterlyTargets ? `<th colspan="4" style="${thStyle}background:#fef3c7;color:#92400e;">Q1 to Q4 - Quarterly basis (Cumulative)</th>` : ''}
      </tr>
      <tr>
        ${MONTH_NAMES_SHORT.map((m) => `<th style="${thStyle}">${m}</th>`).join('')}
        ${showQuarterlyTargets ? ['Q1', 'Q2', 'Q3', 'Q4'].map((q) => `<th style="${thStyle}background:#fef3c7;color:#92400e;">${q}</th>`).join('') : ''}
      </tr>
    </thead>
    <tbody>${bodyRows}</tbody>
    <tfoot>
      <tr>
        ${leftColsCount > 0 ? `<td colspan="${leftColsCount}" rowspan="2" style="${tdStyle}font-weight:800;text-align:left;">Total</td>` : ''}
        ${showEstimatedCost ? `<td rowspan="2" style="${tdStyle}font-weight:800;">${formatMillion(totals.totalEstimatedCost)}</td>` : ''}
        <td style="${tdStyle}background:#fef2f2;color:#991b1b;font-weight:700;">Financial Target</td>
        ${totals.monthlyFinancial.map((v) => `<td style="${tdStyle}background:#fef2f2;color:#991b1b;font-weight:700;">${formatMillion(v)}</td>`).join('')}
        ${showQuarterlyTargets ? totals.quarterlyFinancial.map((q) => `<td style="${tdStyle}background:#fee2e2;color:#991b1b;font-weight:700;">${formatMillion(q)}</td>`).join('') : ''}
        ${showKpi ? `<td rowspan="2" style="${tdStyle}"></td>` : ''}
        ${showIndicateRcp ? `<td rowspan="2" style="${tdStyle}"></td>` : ''}
        ${showResponsibility ? `<td rowspan="2" style="${tdStyle}"></td>` : ''}
        ${customColumns.map(() => `<td rowspan="2" style="${tdStyle}"></td>`).join('')}
      </tr>
      <tr>
        <td style="${tdStyle}background:#f0fdf4;color:#166534;font-weight:700;">Physical Target</td>
        ${totals.monthlyPhysical.map((v) => `<td style="${tdStyle}background:#f0fdf4;color:#166534;font-weight:700;">${v}%</td>`).join('')}
        ${showQuarterlyTargets ? totals.quarterlyPhysical.map((q) => `<td style="${tdStyle}background:#dcfce7;color:#166534;font-weight:700;">${q}%</td>`).join('') : ''}
      </tr>
    </tfoot>
  </table>
  <div style="margin-top:8px;font-size:11px;color:#334155;">
    <strong>R</strong> – Reforms &nbsp;|&nbsp; <strong>C</strong> – Construction &nbsp;|&nbsp; <strong>P</strong> – Procurement &nbsp;
    <span style="color:#64748b;">(Use different serial numbers for different activities within the same category. Ex. R1, R2, R3, etc.)</span>
  </div>
  <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:14px;margin-top:22px;font-size:11px;">
    <div style="border-top:1px solid #64748b;padding-top:4px;"><strong>Prepared By (Subject Officer):</strong><br/>${escHtml(mainResp || 'Subject Officer')}<br/><br/>Signature: __________________</div>
    <div style="border-top:1px solid #64748b;padding-top:4px;"><strong>Checked &amp; Verified:</strong><br/>Assistant Director / Planning Officer<br/><br/>Signature: __________________</div>
    <div style="border-top:1px solid #64748b;padding-top:4px;"><strong>Approved (Head of Branch):</strong><br/>${escHtml(overallResp || 'Director of Education')}<br/><br/>Signature: __________________</div>
    <div style="border-top:1px solid #64748b;padding-top:4px;"><strong>Additional Secretary:</strong><br/>Additional Secretary (Branch Executive Head)<br/><br/>Signature: __________________</div>
    <div style="border-top:1px solid #64748b;padding-top:4px;"><strong>Official Stamp &amp; Filing Date:</strong><br/>Date: ____ / ____ / ${year}<br/><br/>Seal: [ Stamp ]</div>
  </div>
</body>
</html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 250);
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

          <button
            type="button"
            onClick={handleExportFullCsv}
            title="Export full Budget Projection Form as Excel-compatible CSV"
            style={{
              background: '#FFFFFF',
              color: '#0F766E',
              border: '1px solid #99F6E4',
              padding: '0.4rem 0.75rem',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.76rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
            }}
          >
            <span>📊</span>
            <span>Export Excel</span>
          </button>

          <button
            type="button"
            onClick={handleExportFullPdfPrint}
            title="Export or Print full Budget Projection Form as PDF"
            style={{
              background: '#FFFFFF',
              color: '#1E293B',
              border: '1px solid #CBD5E1',
              padding: '0.4rem 0.75rem',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.76rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
            }}
          >
            <span>🖨️</span>
            <span>Export PDF / Print</span>
          </button>

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
              {showOutputNo && (
                <th rowSpan={3} style={{ width: '68px' }}>
                  {getCoreLabel('outputNo', 'Outcome / Output No.')}
                </th>
              )}
              {showProgramme && (
                <th rowSpan={3} style={{ width: '125px' }}>
                  <span style={{ color: '#dc2626' }}>*</span> {getCoreLabel('programme', 'Programme')}
                </th>
              )}
              {showActivity && (
                <th rowSpan={3} style={{ minWidth: '180px' }}>
                  {getCoreLabel('activity', 'Key Activities')}
                </th>
              )}
              {showSubActivities && (
                <th rowSpan={3} style={{ minWidth: '155px' }}>
                  <span style={{ color: '#dc2626' }}>*</span> {getCoreLabel('subActivities', 'Sub Activities')}
                </th>
              )}
              {showVoteNumber && (
                <th rowSpan={3} style={{ width: '105px' }}>
                  {getCoreLabel('voteNumber', 'Vote Number')}
                </th>
              )}
              {showSourceOfFinance && (
                <th rowSpan={3} style={{ width: '105px' }}>
                  <span style={{ color: '#dc2626' }}>*</span> {getCoreLabel('sourceOfFinance', 'Source of Finance')}
                </th>
              )}
              {showEstimatedCost && (
                <th rowSpan={3} style={{ width: '98px' }}>
                  {getCoreLabel('estimatedCost', 'Allocation / Estimated Cost (Mn)')}
                </th>
              )}
              <th rowSpan={3} style={{ width: '108px' }}>
                Target
              </th>
              <th
                colSpan={12 + (showQuarterlyTargets ? 4 : 0)}
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
              {showKpi && (
                <th rowSpan={3} style={{ minWidth: '115px' }}>
                  <span style={{ color: '#dc2626' }}>*</span> {getCoreLabel('kpi', 'KPI')}
                </th>
              )}
              {showIndicateRcp && (
                <th rowSpan={3} style={{ width: '90px' }}>
                  <span style={{ color: '#dc2626' }}>*</span> {getCoreLabel('indicateRcp', 'Indicate R/C/P')}
                </th>
              )}
              {showResponsibility && (
                <th rowSpan={3} style={{ minWidth: '120px' }}>
                  {getCoreLabel('responsibility', 'Responsibility')}
                </th>
              )}
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
              {showQuarterlyTargets && (
                <th colSpan={4} style={{ background: '#FEF3C7', fontWeight: 700, color: '#92400E' }}>
                  Q1 to Q4 - Quarterly basis (Cumulative)
                </th>
              )}
            </tr>
            <tr>
              {MONTH_NAMES_SHORT.map((m, i) => (
                <th key={`m-${i}`} style={{ width: '40px', fontSize: '0.75rem', background: '#F8FAFC' }}>
                  {m}
                </th>
              ))}
              {showQuarterlyTargets && (
                <>
                  <th style={{ width: '48px', background: '#FEF3C7', color: '#92400E', fontSize: '0.75rem' }}>Q1</th>
                  <th style={{ width: '48px', background: '#FEF3C7', color: '#92400E', fontSize: '0.75rem' }}>Q2</th>
                  <th style={{ width: '48px', background: '#FEF3C7', color: '#92400E', fontSize: '0.75rem' }}>Q3</th>
                  <th style={{ width: '48px', background: '#FEF3C7', color: '#92400E', fontSize: '0.75rem' }}>Q4</th>
                </>
              )}
            </tr>
          </thead>

          <tbody>
            {displayedActivities.length === 0 ? (
              <tr>
                <td
                  colSpan={leftColsCount + (showEstimatedCost ? 1 : 0) + 13 + (showQuarterlyTargets ? 4 : 0) + rightColsCount + customColumns.length + (hasActions ? 1 : 0)}
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
                  const q1Fin = Number(act.financialQ1 ?? (fm[0] + fm[1] + fm[2])) || 0;
                  const q2Fin = Number(act.financialQ2 ?? (q1Fin + fm[3] + fm[4] + fm[5])) || 0;
                  const q3Fin = Number(act.financialQ3 ?? (q2Fin + fm[6] + fm[7] + fm[8])) || 0;
                  const q4Fin = Number(act.financialQ4 ?? (q3Fin + fm[9] + fm[10] + fm[11])) || 0;

                  return (
                    <React.Fragment key={act.id}>
                      <tr>
                        {showOutputNo && (
                          <td rowSpan={2} style={{ fontWeight: 800, color: '#0F172A' }}>
                            {act.outputNo || '-'}
                          </td>
                        )}
                        {showProgramme && (
                          <td rowSpan={2} className="text-left" style={{ fontSize: '0.77rem', color: '#334155' }}>
                            <div style={{ fontWeight: !showActivity ? 700 : 500, color: '#0F172A' }}>
                              {cf.programme || (!showActivity ? act.activity : '-')}
                            </div>
                            {!showActivity && cf.programme && act.activity && act.activity !== cf.programme && (
                              <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: '2px' }}>{act.activity}</div>
                            )}
                          </td>
                        )}
                        {showActivity && (
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
                        )}
                        {showSubActivities && (
                          <td rowSpan={2} className="text-left" style={{ fontSize: '0.77rem', color: '#334155' }}>
                            {cf.subActivities || '-'}
                          </td>
                        )}
                        {showVoteNumber && (
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
                        )}
                        {showSourceOfFinance && (
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
                        )}
                        {showEstimatedCost && (
                          <td rowSpan={2}>
                            {renderMnCell(Number(act.estimatedCost) || 0, {
                              bold: true,
                              color: '#0F172A',
                            })}
                          </td>
                        )}
                        <td className="type-financial">Financial Target</td>
                        {fm.map((val, idx) => (
                          <td key={`f-${act.id}-${idx}`} style={{ padding: '4px' }}>
                            {renderMnCell(Number(val) || 0)}
                          </td>
                        ))}
                        {showQuarterlyTargets && (
                          <>
                            <td style={{ background: '#FFFBEB', padding: '4px' }}>{renderMnCell(q1Fin, { bold: true })}</td>
                            <td style={{ background: '#FFFBEB', padding: '4px' }}>{renderMnCell(q2Fin, { bold: true })}</td>
                            <td style={{ background: '#FFFBEB', padding: '4px' }}>{renderMnCell(q3Fin, { bold: true })}</td>
                            <td style={{ background: '#FFFBEB', padding: '4px' }}>{renderMnCell(q4Fin, { bold: true, color: '#7A1C2D' })}</td>
                          </>
                        )}
                        {showKpi && (
                          <td rowSpan={2} className="text-left" style={{ fontSize: '0.77rem', color: '#334155' }}>
                            {cf.kpi || '-'}
                          </td>
                        )}
                        {showIndicateRcp && (
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
                        )}
                        {showResponsibility && (
                          <td rowSpan={2} style={{ fontSize: '0.76rem', color: '#334155' }}>
                            {act.responsibleOfficer || '-'}
                          </td>
                        )}
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
                        {showQuarterlyTargets && (
                          <>
                            <td style={{ background: '#F0FDF4', color: '#166534', fontWeight: 700 }}>{act.targetQ1 || '-'}</td>
                            <td style={{ background: '#F0FDF4', color: '#166534', fontWeight: 700 }}>{act.targetQ2 || '-'}</td>
                            <td style={{ background: '#F0FDF4', color: '#166534', fontWeight: 700 }}>{act.targetQ3 || '-'}</td>
                            <td style={{ background: '#F0FDF4', color: '#166534', fontWeight: 800 }}>{act.targetQ4 || '100%'}</td>
                          </>
                        )}
                      </tr>
                    </React.Fragment>
                  );
                })}

                {/* Totals Footer Rows */}
                <tr className="total-row-fin">
                  {leftColsCount > 0 && (
                    <td colSpan={leftColsCount} rowSpan={2} style={{ fontSize: '0.92rem', fontWeight: 800, textAlign: 'left', paddingLeft: '14px' }}>
                      Total
                    </td>
                  )}
                  {showEstimatedCost && (
                    <td rowSpan={2} style={{ padding: '5px 6px' }}>
                      {renderMnCell(totals.totalEstimatedCost, {
                        align: 'center',
                        bold: true,
                        color: '#991B1B',
                      })}
                    </td>
                  )}
                  <td style={{ fontWeight: 700, fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                    Financial Target
                  </td>
                  {totals.monthlyFinancial.map((mVal, idx) => (
                    <td key={`tot-fin-${idx}`} style={{ padding: '4px' }}>
                      {renderMnCell(mVal, { align: 'center', bold: true, color: '#991B1B' })}
                    </td>
                  ))}
                  {showQuarterlyTargets && totals.quarterlyFinancial.map((qVal, idx) => (
                    <td key={`tot-qfin-${idx}`} style={{ background: '#FEE2E2', padding: '4px' }}>
                      {renderMnCell(qVal, { align: 'center', bold: true, color: '#991B1B' })}
                    </td>
                  ))}
                  {showKpi && <td rowSpan={2}></td>}
                  {showIndicateRcp && <td rowSpan={2}></td>}
                  {showResponsibility && <td rowSpan={2}></td>}
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
                  {showQuarterlyTargets && totals.quarterlyPhysical.map((qVal, idx) => (
                    <td key={`tot-qphys-${idx}`} style={{ fontWeight: 800, background: '#DCFCE7' }}>
                      {qVal}%
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
            Document Telemetry: IPMIS-AIP-{year}-{branchCode.toUpperCase()}
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(185px, 1fr))',
            gap: '1.25rem',
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
            <div style={{ fontWeight: 800, color: '#0F172A' }}>Additional Secretary:</div>
            <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '2px' }}>
              Additional Secretary (Branch Executive Head)
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
