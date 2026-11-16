import re

file_path = r'D:\Data\Tests\plan\Workshop-MS-TEST\src\app\annual-plan\page.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Add interactive tile filter states right before loadPlanData
state_insertion = '''  // Interactive Tile Filter State (filters the AIP Matrix table below)
  const [activeTileFilter, setActiveTileFilter] = useState<'all' | 'completed' | 'in_progress' | 'scheduled' | 'high_budget'>('all');

  const handleTileClick = (filter: 'all' | 'completed' | 'in_progress' | 'scheduled' | 'high_budget') => {
    setActiveTileFilter((prev) => (prev === filter ? 'all' : filter));
  };

  // Filtered activities based on tile click
  const displayedActivities = useMemo(() => {
    if (activeTileFilter === 'completed') {
      return activities.filter((a) => (a.physicalProgressPct || '').trim() === '100%');
    }
    if (activeTileFilter === 'in_progress') {
      const pct = (a: AipActivity) => parseFloat(a.physicalProgressPct || '0');
      return activities.filter((a) => pct(a) > 0 && pct(a) < 100);
    }
    if (activeTileFilter === 'scheduled') {
      const pct = (a: AipActivity) => parseFloat(a.physicalProgressPct || '0');
      return activities.filter((a) => pct(a) === 0 || !a.physicalProgressPct || a.physicalProgressPct === '-');
    }
    if (activeTileFilter === 'high_budget') {
      return activities.filter((a) => Number(a.estimatedCost || 0) >= 5);
    }
    return activities;
  }, [activities, activeTileFilter]);

  // Activity counts for tiles
  const completedActivitiesCount = useMemo(() => {
    return activities.filter((a) => (a.physicalProgressPct || '').trim() === '100%').length;
  }, [activities]);

  const inProgressActivitiesCount = useMemo(() => {
    return activities.filter((a) => {
      const p = parseFloat(a.physicalProgressPct || '0');
      return p > 0 && p < 100;
    }).length;
  }, [activities]);

  const scheduledActivitiesCount = useMemo(() => {
    return activities.filter((a) => {
      const p = parseFloat(a.physicalProgressPct || '0');
      return p === 0 || !a.physicalProgressPct || a.physicalProgressPct === '-';
    }).length;
  }, [activities]);

  // Load Data - dynamically detects branch, year, and amendment version'''

code = code.replace(
    '  // Load Data - dynamically detects branch, year, and amendment version',
    state_insertion
)

# 2. Add Landscape PDF export function and Tile Export Data definitions
tile_exports_code = '''  // Dedicated Landscape PDF Export for Official Matrix (Optimized for paper-saving & filing)
  const handleExportLandscapePdf = () => {
    const headers = [
      'Output #',
      'Act #',
      'Main Activities',
      'Vote No',
      'Est. Cost (Mn)',
      'Remark',
      'J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D',
      'Q1', 'Q2', 'Q3', 'Q4',
      'Progress %',
      'Responsible Officer',
    ];

    const rows: (string | number)[][] = activities.map((a) => {
      const fMonths = a.financialMonths || Array(12).fill(0);
      return [
        a.outputNo || '1',
        a.activityCode || '-',
        a.activity || '-',
        a.voteNumber || '-',
        Number(a.estimatedCost || 0).toFixed(2),
        a.remarks || '-',
        ...fMonths.map((m: any) => (Number(m) > 0 ? Number(m).toFixed(2) : '-')),
        Number(a.financialQ1 || 0).toFixed(2),
        Number(a.financialQ2 || 0).toFixed(2),
        Number(a.financialQ3 || 0).toFixed(2),
        Number(a.financialQ4 || 0).toFixed(2),
        a.physicalProgressPct || a.targetQ4 || '100%',
        a.responsibleOfficer || mainResp || '-',
      ];
    });

    // Add Totals Row
    rows.push([
      'TOTAL',
      '',
      'Cumulative Plan Totals',
      '',
      totals.totalEstimatedCost.toFixed(2),
      '',
      ...totals.monthlyFinancial.map((m: number) => (m > 0 ? m.toFixed(2) : '-')),
      totals.quarterlyFinancial[0]?.toFixed(2) || '0.00',
      totals.quarterlyFinancial[1]?.toFixed(2) || '0.00',
      totals.quarterlyFinancial[2]?.toFixed(2) || '0.00',
      totals.quarterlyFinancial[3]?.toFixed(2) || '0.00',
      totals.overallPhysicalProgressPct || '0%',
      '',
    ]);

    downloadAsPdfReport(
      `Annual Implementation Plan (AIP) Matrix — FY ${selectedYear}`,
      `Official Implementation Matrix • Branch: ${branchInfo?.name || 'MOE Branch'} • Status: ${plan?.status || 'Draft'} • Version: ${selectedAmendmentNumber === 0 ? 'Original Baseline' : `Amendment 0${selectedAmendmentNumber}`}`,
      headers,
      rows,
      [
        { label: 'Total Budget (Mn)', value: `Rs. ${totals.totalEstimatedCost.toFixed(2)}` },
        { label: 'Total Activities', value: activities.length },
        { label: 'Physical Progress', value: totals.overallPhysicalProgressPct || '0%' },
        { label: 'Financial Progress', value: `Rs. ${(totals.totalFinancialProgress || 0).toFixed(2)} Mn` },
        { label: 'Baseline Version', value: selectedAmendmentNumber === 0 ? 'Original Plan' : `Amendment 0${selectedAmendmentNumber}` },
      ],
      'landscape',
      {
        branchName: branchInfo?.name || 'Ministry of Education Branch',
        mainResponsibility: `${mainResp || 'Subject Officer'} (${mainContact || 'N/A'})`,
        overallResponsibility: `${overallResp || 'Director / HOD'} (${overallContact || 'N/A'})`,
        fiscalYear: selectedYear,
        version: selectedAmendmentNumber === 0 ? 'Original Baseline Plan' : `Amendment 0${selectedAmendmentNumber}`,
      }
    );
  };

  // Tile 1: Budget Export Data with Landscape orientation
  const budgetTileExportData: TileExportData = useMemo(() => ({
    filename: `MOE_AIP_Budget_Allocation_${(branchInfo?.name || 'Plan').replace(/\\s+/g, '_')}_FY_${selectedYear}`,
    reportTitle: `AIP Budget Allocation Summary - FY ${selectedYear}`,
    subtitle: `Total Vote Allocation • Branch: ${branchInfo?.name || 'MOE'} • Version: ${selectedAmendmentNumber === 0 ? 'Original Baseline' : `Amendment 0${selectedAmendmentNumber}`}`,
    headers: ['Output #', 'Activity #', 'Main Activity', 'Vote Number', 'Estimated Cost (Rs. Mn)', 'Quarterly Phasing', 'Responsible Officer'],
    rows: activities.map((a) => [
      a.outputNo || '1',
      a.activityCode || '-',
      a.activity || '-',
      a.voteNumber || '-',
      Number(a.estimatedCost || 0).toFixed(2),
      `Q1: ${a.financialQ1 || 0} | Q2: ${a.financialQ2 || 0} | Q3: ${a.financialQ3 || 0} | Q4: ${a.financialQ4 || 0}`,
      a.responsibleOfficer || mainResp || '-',
    ]),
    summaryStats: [
      { label: 'Total Budget (Mn)', value: `Rs. ${totals.totalEstimatedCost.toFixed(2)}` },
      { label: 'Total Activities', value: activities.length },
      { label: 'Avg Cost per Act', value: `Rs. ${(activities.length > 0 ? totals.totalEstimatedCost / activities.length : 0).toFixed(2)} Mn` },
    ],
    copySummaryText: `MOE AIP FY ${selectedYear} Budget: Rs. ${totals.totalEstimatedCost.toFixed(2)} Mn across ${activities.length} activities for ${branchInfo?.name || 'Branch'}.`,
    orientation: 'landscape',
  }), [activities, branchInfo, selectedYear, selectedAmendmentNumber, totals, mainResp]);

  // Tile 2: Activities Directory Export Data
  const activitiesTileExportData: TileExportData = useMemo(() => ({
    filename: `MOE_AIP_Activities_Directory_${(branchInfo?.name || 'Plan').replace(/\\s+/g, '_')}_FY_${selectedYear}`,
    reportTitle: `AIP Implementation Activities Directory - FY ${selectedYear}`,
    subtitle: `Activities Status: ${completedActivitiesCount} Completed • ${inProgressActivitiesCount} Active • ${scheduledActivitiesCount} Scheduled`,
    headers: ['Output #', 'Activity #', 'Main Activity', 'Vote No', 'Estimated Cost (Mn)', 'Physical Progress %', 'Responsible Officer'],
    rows: activities.map((a) => [
      a.outputNo || '1',
      a.activityCode || '-',
      a.activity || '-',
      a.voteNumber || '-',
      Number(a.estimatedCost || 0).toFixed(2),
      a.physicalProgressPct || '0%',
      a.responsibleOfficer || mainResp || '-',
    ]),
    summaryStats: [
      { label: 'Total Activities', value: activities.length },
      { label: 'Completed (100%)', value: completedActivitiesCount },
      { label: 'In Progress', value: inProgressActivitiesCount },
      { label: 'Scheduled', value: scheduledActivitiesCount },
    ],
    copySummaryText: `MOE AIP FY ${selectedYear} Activities (${branchInfo?.name || 'Branch'}): Total ${activities.length} activities (${completedActivitiesCount} completed, ${inProgressActivitiesCount} in progress, ${scheduledActivitiesCount} scheduled).`,
    orientation: 'landscape',
  }), [activities, branchInfo, selectedYear, totals, mainResp, completedActivitiesCount, inProgressActivitiesCount, scheduledActivitiesCount]);

  // Tile 3: Physical Milestone Targets Export Data
  const physicalTileExportData: TileExportData = useMemo(() => ({
    filename: `MOE_AIP_Physical_Milestones_${(branchInfo?.name || 'Plan').replace(/\\s+/g, '_')}_FY_${selectedYear}`,
    reportTitle: `AIP Physical Milestone Targets - FY ${selectedYear}`,
    subtitle: `Quarterly Milestone Progress Matrix • Overall Target: ${totals.overallPhysicalProgressPct || '0%'}`,
    headers: ['Output #', 'Activity #', 'Main Activity', 'Q1 Target', 'Q2 Target', 'Q3 Target', 'Q4 Target', 'Achieved %', 'Responsible Officer'],
    rows: activities.map((a) => [
      a.outputNo || '1',
      a.activityCode || '-',
      a.activity || '-',
      a.targetQ1 || '-',
      a.targetQ2 || '-',
      a.targetQ3 || '-',
      a.targetQ4 || '100%',
      a.physicalProgressPct || '0%',
      a.responsibleOfficer || mainResp || '-',
    ]),
    summaryStats: [
      { label: 'Overall Progress', value: totals.overallPhysicalProgressPct || '0%' },
      { label: 'Activities Tracked', value: activities.length },
      { label: 'Completed Milestones', value: `${completedActivitiesCount} / ${activities.length}` },
    ],
    copySummaryText: `MOE AIP FY ${selectedYear} Physical Progress (${branchInfo?.name || 'Branch'}): Overall achieved ${totals.overallPhysicalProgressPct || '0%'} across ${activities.length} milestone activities.`,
    orientation: 'landscape',
  }), [activities, branchInfo, selectedYear, totals, mainResp, completedActivitiesCount]);

  // Tile 4: Financial Phasing & Disbursement Export Data
  const disbursementTileExportData: TileExportData = useMemo(() => ({
    filename: `MOE_AIP_Financial_Disbursement_${(branchInfo?.name || 'Plan').replace(/\\s+/g, '_')}_FY_${selectedYear}`,
    reportTitle: `AIP Financial Disbursement & Phasing - FY ${selectedYear}`,
    subtitle: `Disbursement Progress: Rs. ${(totals.totalFinancialProgress || 0).toFixed(2)} Mn (${totals.overallFinancialProgressPct || '0%'}) of Rs. ${totals.totalEstimatedCost.toFixed(2)} Mn`,
    headers: ['Output #', 'Activity #', 'Main Activity', 'Allocation (Mn)', 'Disbursed (Mn)', 'Disbursed %', 'Q1 (Mn)', 'Q2 (Mn)', 'Q3 (Mn)', 'Q4 (Mn)', 'Responsible Officer'],
    rows: activities.map((a) => [
      a.outputNo || '1',
      a.activityCode || '-',
      a.activity || '-',
      Number(a.estimatedCost || 0).toFixed(2),
      Number(a.financialProgress || 0).toFixed(2),
      a.financialProgressPct || '0%',
      Number(a.financialQ1 || 0).toFixed(2),
      Number(a.financialQ2 || 0).toFixed(2),
      Number(a.financialQ3 || 0).toFixed(2),
      Number(a.financialQ4 || 0).toFixed(2),
      a.responsibleOfficer || mainResp || '-',
    ]),
    summaryStats: [
      { label: 'Total Allocation', value: `Rs. ${totals.totalEstimatedCost.toFixed(2)} Mn` },
      { label: 'Disbursed', value: `Rs. ${(totals.totalFinancialProgress || 0).toFixed(2)} Mn` },
      { label: 'Disbursement %', value: totals.overallFinancialProgressPct || '0%' },
    ],
    copySummaryText: `MOE AIP FY ${selectedYear} Disbursement (${branchInfo?.name || 'Branch'}): Rs. ${(totals.totalFinancialProgress || 0).toFixed(2)} Mn disbursed (${totals.overallFinancialProgressPct || '0%'} of Rs. ${totals.totalEstimatedCost.toFixed(2)} Mn).`,
    orientation: 'landscape',
  }), [activities, branchInfo, selectedYear, totals, mainResp]);

  // Tile 5: Plan Status & Revision Record Export Data
  const statusTileExportData: TileExportData = useMemo(() => ({
    filename: `MOE_AIP_Plan_Status_Revision_${(branchInfo?.name || 'Plan').replace(/\\s+/g, '_')}_FY_${selectedYear}`,
    reportTitle: `AIP Plan Status & Revision Record - FY ${selectedYear}`,
    subtitle: `Status: ${plan?.status || 'Draft'} • Version: ${selectedAmendmentNumber === 0 ? 'Original Baseline' : `Amendment 0${selectedAmendmentNumber}`}`,
    headers: ['Fiscal Year', 'Branch Name', 'Plan Status', 'Revision Version', 'Submitted Date', 'Approved Date', 'Activities Count', 'Total Budget (Mn)'],
    rows: [[
      selectedYear,
      branchInfo?.name || 'MOE Branch',
      plan?.status || 'Draft',
      selectedAmendmentNumber === 0 ? 'Original Baseline Plan' : (currentAmendment?.title || `Amendment 0${selectedAmendmentNumber}`),
      plan?.submittedAt ? new Date(plan.submittedAt).toLocaleDateString() : 'Not Submitted',
      plan?.approvedAt ? new Date(plan.approvedAt).toLocaleDateString() : 'Pending',
      activities.length,
      `Rs. ${totals.totalEstimatedCost.toFixed(2)} Mn`,
    ]],
    summaryStats: [
      { label: 'Plan Status', value: plan?.status || 'Draft' },
      { label: 'Revision', value: selectedAmendmentNumber === 0 ? 'Baseline' : `Amend 0${selectedAmendmentNumber}` },
      { label: 'Total Activities', value: activities.length },
    ],
    copySummaryText: `MOE AIP FY ${selectedYear} Status (${branchInfo?.name || 'Branch'}): ${plan?.status || 'Draft'} (${selectedAmendmentNumber === 0 ? 'Original Baseline' : `Amendment 0${selectedAmendmentNumber}`}), Total Budget: Rs. ${totals.totalEstimatedCost.toFixed(2)} Mn.`,
    orientation: 'landscape',
  }), [activities, branchInfo, selectedYear, selectedAmendmentNumber, totals, plan, currentAmendment]);'''

# Replace memoized export data block
pattern_aip_export = r'  // Memoized export data for TileActionMenu[\s\S]*?copySummaryText: `MOE AIP FY \$\{selectedYear\}[\s\S]*?\};\s*\}, \[activities, branchInfo, selectedYear, selectedAmendmentNumber, totals, mainResp\]\);'

code = re.sub(pattern_aip_export, lambda m: tile_exports_code, code)

# 3. Update CSS in <style jsx global>
old_css = '''.aip-sheet-card {
          background: #ffffff;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.05);
          overflow: hidden;
        }
        .aip-table-wrapper {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }
        .aip-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.8125rem;
          color: #1f2937;
        }'''

new_css = '''.page-container.aip-full-width {
          max-width: 100% !important;
          width: 100% !important;
          padding: 0.5rem 1.25rem !important;
          margin: 0 auto !important;
        }
        .aip-sheet-card {
          width: 100% !important;
          background: #ffffff;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.05);
          overflow: hidden;
        }
        .aip-table-wrapper {
          width: 100% !important;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }
        .aip-table {
          width: 100% !important;
          min-width: 100% !important;
          border-collapse: collapse;
          font-size: 0.8125rem;
          color: #1f2937;
        }'''

code = code.replace(old_css, new_css)

# Update print CSS
old_print_css = '''@media print {
          .no-print { display: none !important; }
          .app-sidebar, .app-header { display: none !important; }
          body { background: #ffffff !important; }
          .aip-sheet-card { border: none !important; box-shadow: none !important; }
          @page { size: landscape; margin: 10mm; }
        }'''

new_print_css = '''@media print {
          .no-print { display: none !important; }
          .app-sidebar, .app-header { display: none !important; }
          body { background: #ffffff !important; padding: 0 !important; font-size: 8pt !important; color: #0f172a !important; }
          .page-container { padding: 0 !important; max-width: 100% !important; width: 100% !important; margin: 0 !important; }
          .aip-sheet-card { border: none !important; box-shadow: none !important; width: 100% !important; }
          .aip-table { width: 100% !important; min-width: 100% !important; font-size: 7.2pt !important; border: 1px solid #64748b !important; }
          .aip-table th, .aip-table td { padding: 2.5px 3.5px !important; border: 0.75px solid #94a3b8 !important; }
          .print-filing-header { display: block !important; }
          .print-filing-footer { display: block !important; }
          thead { display: table-header-group !important; }
          tr { page-break-inside: avoid !important; }
          @page { size: A4 landscape; margin: 8mm 8mm 10mm 8mm; }
        }'''

code = code.replace(old_print_css, new_print_css)

# 4. Update page container class
code = code.replace(
    '<div className="page-container" style={{ maxWidth: \'1750px\' }}>',
    '<div className="page-container aip-full-width" style={{ maxWidth: \'100%\', width: \'100%\', padding: \'0.5rem 1.25rem\', boxSizing: \'border-box\' }}>'
)

# 5. Update Print / PDF button to call handleExportLandscapePdf
old_print_btn = '''<button
              onClick={() => window.print()}
              style={{
                background: '#ffffff',
                color: '#374151',
                border: '1px solid #d1d5db',
                padding: '0.55rem 1rem',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <span>🖨️</span> Print / PDF
            </button>'''

new_print_btn = '''<button
              onClick={handleExportLandscapePdf}
              style={{
                background: '#ffffff',
                color: '#7a1c2d',
                border: '1.5px solid #7a1c2d',
                padding: '0.55rem 1rem',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.875rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: '0 2px 6px rgba(122, 28, 45, 0.15)',
              }}
              title="Export official Landscape PDF optimized for paper saving, clear readability, and institutional hard copy filing"
            >
              <span>🖨️</span> Landscape PDF / Print
            </button>'''

code = code.replace(old_print_btn, new_print_btn)

# 6. Insert 5 Executive Summary KPI Tiles with TileActionMenu directly before `<div className="aip-sheet-card">`
tiles_jsx = '''        {/* ── AIP EXECUTIVE SUMMARY TILES WITH INTERACTIVE TILE EXPANSION MENUS ── */}
        <div
          className="no-print"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: '0.85rem',
            marginBottom: '1.25rem',
          }}
        >
          {/* Tile 1: Total Plan Estimated Demand */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => handleTileClick('all')}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleTileClick('all'); }}
            title="Click to view all activities"
            className="card"
            style={{
              padding: '0.85rem 1rem',
              border: activeTileFilter === 'all' ? '2px solid #00534E' : '1px solid #E2E8F0',
              borderLeft: '4.5px solid #00534E',
              borderRadius: '10px',
              boxShadow: activeTileFilter === 'all' ? '0 0 0 2px rgba(0, 83, 78, 0.18), 0 4px 12px rgba(0, 83, 78, 0.1)' : '0 2px 6px rgba(0,0,0,0.03)',
              background: activeTileFilter === 'all' ? '#F2FAF9' : '#FFFFFF',
              cursor: 'pointer',
              transition: 'all 0.18s ease-in-out',
              userSelect: 'none',
              position: 'relative',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '1.1rem' }}>💰</span>
                <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Total Plan Budget
                </span>
              </div>
              <div onClick={(e) => e.stopPropagation()}>
                <TileActionMenu
                  tileTitle="Total Plan Budget"
                  exportData={budgetTileExportData}
                  onRefresh={() => loadPlanData(selectedBranchId, selectedAmendmentNumber)}
                  position="right"
                />
              </div>
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#00534E', lineHeight: 1.2 }}>
              Rs. {totals.totalEstimatedCost.toFixed(2)} Mn
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748B', marginTop: '0.25rem' }}>
              <span>Vote allocation across {activities.length} activities</span>
              {activeTileFilter === 'all' && (
                <span style={{ fontSize: '0.64rem', fontWeight: 700, color: '#00534E', background: 'rgba(0, 83, 78, 0.1)', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>
                  All ✓
                </span>
              )}
            </div>
          </div>

          {/* Tile 2: Implementation Activities */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => handleTileClick('completed')}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleTileClick('completed'); }}
            title="Click to filter completed activities (100%)"
            className="card"
            style={{
              padding: '0.85rem 1rem',
              border: activeTileFilter === 'completed' ? '2px solid #8D153A' : '1px solid #E2E8F0',
              borderLeft: '4.5px solid #8D153A',
              borderRadius: '10px',
              boxShadow: activeTileFilter === 'completed' ? '0 0 0 2px rgba(141, 21, 58, 0.2), 0 4px 12px rgba(141, 21, 58, 0.12)' : '0 2px 6px rgba(0,0,0,0.03)',
              background: activeTileFilter === 'completed' ? '#FFF5F7' : '#FFFFFF',
              cursor: 'pointer',
              transition: 'all 0.18s ease-in-out',
              userSelect: 'none',
              position: 'relative',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '1.1rem' }}>📋</span>
                <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  AIP Activities
                </span>
              </div>
              <div onClick={(e) => e.stopPropagation()}>
                <TileActionMenu
                  tileTitle="AIP Implementation Activities"
                  exportData={activitiesTileExportData}
                  onRefresh={() => loadPlanData(selectedBranchId, selectedAmendmentNumber)}
                  position="right"
                />
              </div>
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#8D153A', lineHeight: 1.2 }}>
              {activities.length} Activities
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748B', marginTop: '0.25rem' }}>
              <span>{completedActivitiesCount} completed • {inProgressActivitiesCount} active</span>
              {activeTileFilter === 'completed' ? (
                <span style={{ fontSize: '0.64rem', fontWeight: 700, color: '#8D153A', background: 'rgba(141, 21, 58, 0.1)', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>
                  Completed ✓
                </span>
              ) : (
                <span style={{ fontSize: '0.65rem', color: '#94A3B8' }}>Filter 100% ↓</span>
              )}
            </div>
          </div>

          {/* Tile 3: Cumulative Physical Milestone Targets */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => handleTileClick('in_progress')}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleTileClick('in_progress'); }}
            title="Click to filter in-progress activities"
            className="card"
            style={{
              padding: '0.85rem 1rem',
              border: activeTileFilter === 'in_progress' ? '2px solid #EB7400' : '1px solid #E2E8F0',
              borderLeft: '4.5px solid #EB7400',
              borderRadius: '10px',
              boxShadow: activeTileFilter === 'in_progress' ? '0 0 0 2px rgba(235, 116, 0, 0.2), 0 4px 12px rgba(235, 116, 0, 0.12)' : '0 2px 6px rgba(0,0,0,0.03)',
              background: activeTileFilter === 'in_progress' ? '#FFFBF0' : '#FFFFFF',
              cursor: 'pointer',
              transition: 'all 0.18s ease-in-out',
              userSelect: 'none',
              position: 'relative',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '1.1rem' }}>🎯</span>
                <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Physical Milestones
                </span>
              </div>
              <div onClick={(e) => e.stopPropagation()}>
                <TileActionMenu
                  tileTitle="Physical Milestone Targets"
                  exportData={physicalTileExportData}
                  onRefresh={() => loadPlanData(selectedBranchId, selectedAmendmentNumber)}
                  position="right"
                />
              </div>
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#C96200', lineHeight: 1.2 }}>
              {totals.overallPhysicalProgressPct || '0%'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748B', marginTop: '0.25rem' }}>
              <span>Cumulative target (Q1-Q4)</span>
              {activeTileFilter === 'in_progress' ? (
                <span style={{ fontSize: '0.64rem', fontWeight: 700, color: '#C96200', background: 'rgba(235, 116, 0, 0.12)', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>
                  In Progress ✓
                </span>
              ) : (
                <span style={{ fontSize: '0.65rem', color: '#94A3B8' }}>Filter Active ↓</span>
              )}
            </div>
          </div>

          {/* Tile 4: Financial Phasing & Disbursement */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => handleTileClick('high_budget')}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleTileClick('high_budget'); }}
            title="Click to filter major activities (>= Rs. 5 Mn)"
            className="card"
            style={{
              padding: '0.85rem 1rem',
              border: activeTileFilter === 'high_budget' ? '2px solid #0284C7' : '1px solid #E2E8F0',
              borderLeft: '4.5px solid #0284C7',
              borderRadius: '10px',
              boxShadow: activeTileFilter === 'high_budget' ? '0 0 0 2px rgba(2, 132, 199, 0.2), 0 4px 12px rgba(2, 132, 199, 0.12)' : '0 2px 6px rgba(0,0,0,0.03)',
              background: activeTileFilter === 'high_budget' ? '#F0F9FF' : '#FFFFFF',
              cursor: 'pointer',
              transition: 'all 0.18s ease-in-out',
              userSelect: 'none',
              position: 'relative',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '1.1rem' }}>📊</span>
                <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Disbursement Phasing
                </span>
              </div>
              <div onClick={(e) => e.stopPropagation()}>
                <TileActionMenu
                  tileTitle="Financial Phasing & Disbursement"
                  exportData={disbursementTileExportData}
                  onRefresh={() => loadPlanData(selectedBranchId, selectedAmendmentNumber)}
                  position="right"
                />
              </div>
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0369A1', lineHeight: 1.2 }}>
              Rs. {(totals.totalFinancialProgress || 0).toFixed(2)} Mn
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748B', marginTop: '0.25rem' }}>
              <span>{totals.overallFinancialProgressPct || '0%'} disbursed across 12 mo</span>
              {activeTileFilter === 'high_budget' ? (
                <span style={{ fontSize: '0.64rem', fontWeight: 700, color: '#0369A1', background: 'rgba(2, 132, 199, 0.12)', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>
                  Major >=5Mn ✓
                </span>
              ) : (
                <span style={{ fontSize: '0.65rem', color: '#94A3B8' }}>Filter >=5Mn ↓</span>
              )}
            </div>
          </div>

          {/* Tile 5: Planning Approval & Baseline Status */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => handleTileClick('scheduled')}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleTileClick('scheduled'); }}
            title="Click to filter scheduled/pending activities"
            className="card"
            style={{
              padding: '0.85rem 1rem',
              border: activeTileFilter === 'scheduled' ? '2px solid #166534' : '1px solid #E2E8F0',
              borderLeft: '4.5px solid #166534',
              borderRadius: '10px',
              boxShadow: activeTileFilter === 'scheduled' ? '0 0 0 2px rgba(22, 101, 52, 0.2), 0 4px 12px rgba(22, 101, 52, 0.12)' : '0 2px 6px rgba(0,0,0,0.03)',
              background: activeTileFilter === 'scheduled' ? '#F0FDF4' : '#FFFFFF',
              cursor: 'pointer',
              transition: 'all 0.18s ease-in-out',
              userSelect: 'none',
              position: 'relative',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '1.1rem' }}>⚖️</span>
                <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Baseline & Approval
                </span>
              </div>
              <div onClick={(e) => e.stopPropagation()}>
                <TileActionMenu
                  tileTitle="Plan Status & Baseline Record"
                  exportData={statusTileExportData}
                  onRefresh={() => loadPlanData(selectedBranchId, selectedAmendmentNumber)}
                  position="right"
                />
              </div>
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: plan?.status === 'Approved' ? '#166534' : plan?.status === 'Submitted' ? '#854D0E' : '#334155', lineHeight: 1.2 }}>
              {plan?.status === 'Approved' ? 'PPB Approved' : plan?.status === 'Submitted' ? 'Submitted' : 'Draft'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748B', marginTop: '0.25rem' }}>
              <span>{selectedAmendmentNumber === 0 ? 'Original Baseline' : `Amendment 0${selectedAmendmentNumber}`}</span>
              {activeTileFilter === 'scheduled' ? (
                <span style={{ fontSize: '0.64rem', fontWeight: 700, color: '#166534', background: 'rgba(22, 101, 52, 0.12)', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>
                  Scheduled ✓
                </span>
              ) : (
                <span style={{ fontSize: '0.65rem', color: '#94A3B8' }}>Filter Sched ↓</span>
              )}
            </div>
          </div>
        </div>

        {/* Active Filter Notification Bar */}
        {activeTileFilter !== 'all' && (
          <div
            className="no-print"
            style={{
              background: '#F8FAFC',
              border: '1px solid #CBD5E1',
              borderRadius: '8px',
              padding: '0.5rem 1rem',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.82rem',
              color: '#334155',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>🔍</span>
              <span>
                Filtered by: <strong>{activeTileFilter.replace('_', ' ').toUpperCase()}</strong> — Showing <strong>{displayedActivities.length}</strong> of <strong>{activities.length}</strong> activities
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActiveTileFilter('all')}
              style={{
                background: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                padding: '2px 8px',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#8D153A',
                cursor: 'pointer',
              }}
            >
              ✕ Clear Filter (Show All)
            </button>
          </div>
        )}

        {/* ── Official AIP Sheet ── */}
        <div className="aip-sheet-card">'''

code = code.replace(
    '        {/* ── Official AIP Sheet ── */}\n            <div className="aip-sheet-card">',
    tiles_jsx
)

# 7. Replace `activities.map` with `displayedActivities.map` in the table
code = code.replace(
    '                  ) : (\n                    activities.map((act) => {',
    '                  ) : (\n                    displayedActivities.map((act) => {'
)

# 8. Add Official Filing Certification block right after table closing tag
filing_signatures_jsx = '''              </table>
            </div>

            {/* Official Institutional Hard Copy Filing Section (Landscape Print & Filing Dossier) */}
            <div
              style={{
                background: '#fafafa',
                borderTop: '2px dashed #cbd5e1',
                padding: '1.25rem 1.5rem',
                marginTop: '0.5rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Institutional Hard Copy Filing & Certification — Ministry of Education Sri Lanka
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Document Telemetry: IPMIS-AIP-${selectedYear}-${(branchInfo?.code || 'MOE').toUpperCase()}
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
                <div style={{ borderTop: '1px solid #94a3b8', paddingTop: '6px' }}>
                  <div style={{ fontWeight: 800, color: '#0f172a' }}>Prepared By (Subject Officer):</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>{mainResp || 'Subject Officer'} • {mainContact || 'Ext. Contact'}</div>
                  <div style={{ marginTop: '16px', fontSize: '0.72rem', color: '#94a3b8' }}>Signature: _______________________</div>
                </div>

                <div style={{ borderTop: '1px solid #94a3b8', paddingTop: '6px' }}>
                  <div style={{ fontWeight: 800, color: '#0f172a' }}>Checked & Verified:</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>Assistant Director / Planning Officer</div>
                  <div style={{ marginTop: '16px', fontSize: '0.72rem', color: '#94a3b8' }}>Signature: _______________________</div>
                </div>

                <div style={{ borderTop: '1px solid #94a3b8', paddingTop: '6px' }}>
                  <div style={{ fontWeight: 800, color: '#0f172a' }}>Approved (Head of Branch):</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>{overallResp || 'Director of Education'} • {overallContact || 'Office Phone'}</div>
                  <div style={{ marginTop: '16px', fontSize: '0.72rem', color: '#94a3b8' }}>Signature: _______________________</div>
                </div>

                <div style={{ borderTop: '1px solid #94a3b8', paddingTop: '6px' }}>
                  <div style={{ fontWeight: 800, color: '#0f172a' }}>Official Stamp & Filing Date:</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>Date: ____ / ____ / {selectedYear}</div>
                  <div style={{ marginTop: '16px', fontSize: '0.72rem', color: '#94a3b8' }}>Branch Official Seal: [ Stamp ]</div>
                </div>
              </div>
            </div>
          </div>'''

code = code.replace(
    '              </table>\n            </div>\n          </div>',
    filing_signatures_jsx
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(code)

print('Successfully updated src/app/annual-plan/page.tsx')
