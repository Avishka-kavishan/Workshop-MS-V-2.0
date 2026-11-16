/**
 * IPMIS Dashboard Tile Export Utilities
 * Ministry of Education - Sri Lanka
 * 
 * Provides robust client-side Excel (CSV with UTF-8 BOM) and styled PDF generation
 * for all dashboard management tiles and telemetry cards.
 */

export interface ExportColumnHeader {
  key: string;
  label: string;
}

export interface SummaryStatItem {
  label: string;
  value: string | number;
  highlight?: boolean;
}

/**
 * Downloads data as a clean, Excel-compatible CSV file with UTF-8 BOM.
 */
export function downloadAsExcelCsv(
  filenameBase: string,
  reportTitle: string,
  headers: string[],
  rows: (string | number | null | undefined)[][],
  extraMetadata?: Record<string, string>
) {
  const sanitize = (val: string | number | null | undefined): string => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const lines: string[] = [];

  // Header: keep ONLY the 3 lines requested
  lines.push(`"Integrated Planning & Monitoring Information System (IPMIS)"`);
  lines.push(`"Report Title: ${reportTitle}"`);
  lines.push(`"Generated On: ${new Date().toLocaleString('en-GB', { timeZone: 'Asia/Colombo' })} SLST"`);
  
  if (extraMetadata) {
    Object.entries(extraMetadata).forEach(([k, v]) => {
      lines.push(`"${k}: ${v}"`);
    });
  }

  lines.push(''); // Blank spacer line

  // Column Headers
  lines.push(headers.map(sanitize).join(','));

  // Data Rows
  rows.forEach((row) => {
    lines.push(row.map(sanitize).join(','));
  });

  // UTF-8 BOM ensures Excel on Windows parses unicode characters properly
  const csvContent = '\uFEFF' + lines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  const cleanName = filenameBase.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/__+/g, '_');
  const dateStr = new Date().toISOString().slice(0, 10);
  link.setAttribute('download', `${cleanName}_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Opens a beautifully formatted, printable institutional report window
 * and prompts the browser's native Save-as-PDF / Print dialog.
 */
/**
 * Opens a beautifully formatted, printable institutional report window
 * and prompts the browser's native Save-as-PDF / Print dialog.
 * Supports both portrait and landscape orientation, optimized for paper saving,
 * clear readability, and official hard copy filing.
 */
export function downloadAsPdfReport(
  reportTitle: string,
  subtitle: string,
  headers: string[],
  rows: (string | number | null | undefined)[][],
  summaryStats?: SummaryStatItem[],
  orientation: 'portrait' | 'landscape' = 'landscape',
  filingMeta?: {
    branchName?: string;
    filingReference?: string;
    fiscalYear?: string;
    mainResponsibility?: string;
    overallResponsibility?: string;
    version?: string;
  }
) {
  const isLandscape = orientation !== 'portrait';
  const popupWidth = isLandscape ? 1280 : 980;
  const popupHeight = isLandscape ? 840 : 760;
  const left = typeof window !== 'undefined' ? Math.max(0, Math.round((window.screen.width - popupWidth) / 2)) : 50;
  const top = typeof window !== 'undefined' ? Math.max(0, Math.round((window.screen.height - popupHeight) / 2)) : 50;

  // Open as a dedicated popup window centered on screen
  const printWindow = window.open(
    '',
    '_blank',
    `popup=yes,width=${popupWidth},height=${popupHeight},left=${left},top=${top},scrollbars=yes,resizable=yes`
  );
  if (!printWindow) {
    alert('Please allow popups to generate and download the Landscape A4 PDF report.');
    return;
  }

  const generatedTime = new Date().toLocaleString('en-GB', {
    timeZone: 'Asia/Colombo',
  });

  const numStats = summaryStats && summaryStats.length > 0 ? summaryStats.length : 1;
  const statCols = Math.min(numStats, 6);

  const statsHtml = summaryStats && summaryStats.length > 0
    ? `
      <div class="stats-grid">
        ${summaryStats.map(s => `
          <div class="stat-card ${s.highlight ? 'stat-highlight' : ''}">
            <div class="stat-label">${s.label}</div>
            <div class="stat-value">${s.value}</div>
          </div>
        `).join('')}
      </div>
    `
    : '';

  const tableRowsHtml = rows.map((row, idx) => `
    <tr class="${idx % 2 === 0 ? 'even' : 'odd'}">
      ${row.map(cell => {
        const valStr = cell !== null && cell !== undefined ? String(cell) : '-';
        const isNum = !isNaN(Number(valStr)) && valStr.trim() !== '' && !valStr.includes(':') && !valStr.includes('/');
        return `<td class="${isNum ? 'text-right' : ''}">${valStr}</td>`;
      }).join('')}
    </tr>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8" />
      <title>${reportTitle} - MoE IPMIS Official Report</title>
      <style>
        @page {
          size: ${isLandscape ? 'A4 landscape' : 'A4 portrait'};
          margin: ${isLandscape ? '6mm 8mm 6mm 8mm' : '12mm 15mm'};
        }
        * {
          box-sizing: border-box;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        }
        body {
          color: #0F172A;
          background: #FFFFFF;
          margin: 0;
          padding: ${isLandscape ? '0.5rem 0.75rem' : '1.5rem'};
          font-size: ${isLandscape ? '8.5px' : '11px'};
          line-height: ${isLandscape ? '1.2' : '1.4'};
        }
        .header {
          border-bottom: 2px solid #0F766E;
          padding-bottom: 0.4rem;
          margin-bottom: 0.5rem;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        .system-title {
          font-size: ${isLandscape ? '11px' : '13px'};
          font-weight: 800;
          color: #0F766E;
          letter-spacing: 0.02em;
        }
        .report-title {
          font-size: ${isLandscape ? '13.5px' : '18px'};
          font-weight: 800;
          color: #0F172A;
          margin: 2px 0 0;
        }
        .meta-time {
          text-align: right;
          font-size: 9.5px;
          color: #475569;
          font-weight: 600;
        }
        .responsibility-box {
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 6px;
          padding: 4px 8px;
          margin-bottom: 0.5rem;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.5rem;
          font-size: 8.5px;
          color: #334155;
        }
        .stats-grid {
          display: grid !important;
          grid-template-columns: repeat(${statCols}, minmax(0, 1fr)) !important;
          gap: 0.35rem !important;
          margin-bottom: 0.45rem !important;
          width: 100% !important;
        }
        .stat-card {
          background: #F8FAFC !important;
          border: 1px solid #CBD5E1 !important;
          border-radius: 6px !important;
          padding: ${isLandscape ? '3px 5px' : '0.65rem 0.85rem'} !important;
          min-width: 0 !important;
          overflow: hidden !important;
          box-sizing: border-box !important;
        }
        .stat-highlight {
          background: #F0FDFA !important;
          border-color: #99F6E4 !important;
        }
        .stat-label {
          font-size: ${isLandscape ? '7px' : '7.5px'} !important;
          font-weight: 700 !important;
          text-transform: uppercase !important;
          color: #64748B !important;
          letter-spacing: 0.02em !important;
          margin-bottom: 1px !important;
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
        }
        .stat-value {
          font-size: ${isLandscape ? '9px' : '15px'} !important;
          font-weight: 800 !important;
          color: #0F172A !important;
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          line-height: 1.2 !important;
        }
        table {
          width: 100% !important;
          max-width: 100% !important;
          border-collapse: collapse;
          margin-bottom: 0.65rem;
          font-size: ${isLandscape ? '8px' : '10.5px'};
          line-height: ${isLandscape ? '1.18' : '1.35'};
          page-break-inside: auto;
          table-layout: auto;
        }
        thead {
          display: table-header-group;
        }
        tr {
          page-break-inside: avoid;
          page-break-after: auto;
        }
        th {
          background: #F1F5F9;
          color: #0F172A;
          font-weight: 800;
          text-align: left;
          padding: ${isLandscape ? '3.5px 5px' : '7px 10px'};
          border: 1px solid #CBD5E1;
          border-bottom: 2px solid #64748B;
          font-size: ${isLandscape ? '8px' : '10px'};
          white-space: normal;
        }
        td {
          padding: ${isLandscape ? '3px 4.5px' : '6.5px 10px'};
          border: 1px solid #CBD5E1;
          color: #1E293B;
          vertical-align: middle;
          font-size: ${isLandscape ? '8px' : '10.5px'};
          word-break: break-word;
        }
        td.text-right {
          text-align: right;
          font-variant-numeric: tabular-nums;
        }
        tr.even {
          background: #FFFFFF;
        }
        tr.odd {
          background: #F8FAFC;
        }
        .signatures {
          margin-top: 0.85rem;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0.75rem;
          page-break-inside: avoid;
        }
        .sig-box {
          border-top: 1px dashed #94A3B8;
          padding-top: 3px;
          font-size: 7.5px;
          color: #475569;
        }
        .sig-title {
          font-weight: 700;
          color: #0F172A;
          margin-bottom: 1px;
        }
        .footer {
          margin-top: 0.5rem;
          border-top: 1px solid #E2E8F0;
          padding-top: 3px;
          display: flex;
          justify-content: space-between;
          font-size: 7.5px;
          color: #94A3B8;
        }
        @media print {
          @page {
            size: ${isLandscape ? 'A4 landscape' : 'A4 portrait'};
            margin: ${isLandscape ? '6mm 8mm 6mm 8mm' : '12mm 15mm'};
          }
          html, body {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #FFFFFF !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          table {
            width: 100% !important;
            max-width: 100% !important;
            page-break-inside: auto;
          }
          .no-print {
            display: none !important;
          }
        }
      </style>
    </head>
    <body>
      <div class="no-print" style="margin-bottom: 0.65rem; padding: 0.55rem 0.85rem; background: #0F766E; color: white; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 8px rgba(15, 118, 110, 0.25);">
        <div style="font-size: 11px;">
          <strong>🖨️ Landscape A4 PDF & Print Preview</strong> — Multi-column layout optimized for paper saving & filing.
        </div>
        <div style="display: flex; gap: 8px;">
          <button onclick="window.print()" style="background: #FFFFFF; color: #0F766E; border: none; font-weight: 800; padding: 6px 14px; border-radius: 4px; cursor: pointer; font-size: 11px; box-shadow: 0 1px 3px rgba(0,0,0,0.15);">
            🖨️ Print / Save as PDF (Landscape A4)
          </button>
          <button onclick="window.close()" style="background: rgba(255,255,255,0.2); color: #FFFFFF; border: 1px solid rgba(255,255,255,0.4); font-weight: 700; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 11px;">
            Close Preview
          </button>
        </div>
      </div>

      <div class="header">
        <div>
          <div style="font-size: 8.5px; font-weight: 700; color: #475569; letter-spacing: 0.04em; text-transform: uppercase; margin-bottom: 1px;">
            Democratic Socialist Republic of Sri Lanka — Ministry of Education
          </div>
          <div class="system-title">Integrated Planning & Monitoring Information System (IPMIS)</div>
          <h1 class="report-title">Report Title: ${reportTitle}</h1>
        </div>
        <div class="meta-time">
          <div>Generated On: ${generatedTime} SLST</div>
          <div style="font-size: 8px; color: #0F766E; font-weight: 700; margin-top: 1px;">
            Official Telemetry — Institutional Hard Copy Filing
          </div>
        </div>
      </div>

      ${filingMeta?.mainResponsibility || filingMeta?.overallResponsibility ? `
        <div class="responsibility-box">
          <div><strong>Main Responsibility:</strong> ${filingMeta.mainResponsibility || 'MOE Branch Subject Officer'}</div>
          <div><strong>Overall Responsibility:</strong> ${filingMeta.overallResponsibility || 'Director of Education / Head of Branch'}</div>
        </div>
      ` : ''}

      ${statsHtml}

      <table>
        <thead>
          <tr>
            ${headers.map(h => `<th>${h}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${tableRowsHtml}
        </tbody>
      </table>

      <div class="signatures">
        <div class="sig-box">
          <div class="sig-title">Prepared By</div>
          <div>Subject Officer (AIP In-Charge)</div>
          <div>Branch: ${filingMeta?.branchName || 'Ministry of Education'}</div>
        </div>
        <div class="sig-box">
          <div class="sig-title">Checked & Verified</div>
          <div>Assistant Director / Planning Officer</div>
          <div>Ministry of Education</div>
        </div>
        <div class="sig-box">
          <div class="sig-title">Approved & Certified for Filing</div>
          <div>Director of Education / Head of Branch</div>
          <div>Ministry of Education</div>
        </div>
        <div class="sig-box">
          <div class="sig-title">Filing Date & Official Seal</div>
          <div>Date: ________________________</div>
          <div>Official Stamp: [ Seal ]</div>
        </div>
      </div>

      <div class="footer">
        <div>Integrated Planning & Monitoring Information System (IPMIS) · Ministry of Education Sri Lanka</div>
        <div>Form Ref: MOE/P&M/AIP/2027 • Official Government Filing Dossier</div>
      </div>

      <script>
        window.addEventListener('load', () => {
          setTimeout(() => {
            window.print();
          }, 450);
        });
      </script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

/**
 * Copies plain text / markdown table summary to clipboard.
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      return success;
    }
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
    return false;
  }
}
