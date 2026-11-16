import re

path = r'D:\Data\Tests\plan\Workshop-MS-TEST\src\lib\dashboardExport.ts'

with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

# Replace downloadAsPdfReport function completely with our enhanced, landscape-supporting version
new_pdf_func = '''/**
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
  orientation: 'portrait' | 'landscape' = 'portrait',
  filingMeta?: {
    branchName?: string;
    filingReference?: string;
    fiscalYear?: string;
    mainResponsibility?: string;
    overallResponsibility?: string;
    version?: string;
  }
) {
  const isLandscape = orientation === 'landscape';
  const printWindow = window.open('', '_blank', isLandscape ? 'width=1200,height=820' : 'width=980,height=720');
  if (!printWindow) {
    alert('Please allow popups to generate and download the PDF report.');
    return;
  }

  const generatedTime = new Date().toLocaleString('en-GB', {
    timeZone: 'Asia/Colombo',
  });

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
          size: A4 ${isLandscape ? 'landscape' : 'portrait'};
          margin: ${isLandscape ? '8mm 10mm 10mm 10mm' : '12mm 15mm'};
        }
        * {
          box-sizing: border-box;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        }
        body {
          color: #0F172A;
          background: #FFFFFF;
          margin: 0;
          padding: ${isLandscape ? '0.75rem 1rem' : '1.5rem'};
          font-size: ${isLandscape ? '9px' : '11px'};
          line-height: ${isLandscape ? '1.25' : '1.4'};
        }
        .header {
          border-bottom: 2px solid #0F766E;
          padding-bottom: 0.5rem;
          margin-bottom: 0.65rem;
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
          font-size: ${isLandscape ? '14px' : '18px'};
          font-weight: 800;
          color: #0F172A;
          margin: 2px 0 0;
        }
        .meta-time {
          text-align: right;
          font-size: 10px;
          color: #475569;
          font-weight: 600;
        }
        .responsibility-box {
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 6px;
          padding: 5px 10px;
          margin-bottom: 0.65rem;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.75rem;
          font-size: 9px;
          color: #334155;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(${isLandscape ? '105px' : '130px'}, 1fr));
          gap: ${isLandscape ? '0.35rem' : '0.65rem'};
          margin-bottom: 0.65rem;
        }
        .stat-card {
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 6px;
          padding: ${isLandscape ? '3px 8px' : '0.65rem 0.85rem'};
        }
        .stat-highlight {
          background: #F0FDFA;
          border-color: #99F6E4;
        }
        .stat-label {
          font-size: 8px;
          font-weight: 700;
          text-transform: uppercase;
          color: #64748B;
          letter-spacing: 0.03em;
          margin-bottom: 1px;
        }
        .stat-value {
          font-size: ${isLandscape ? '12px' : '16px'};
          font-weight: 800;
          color: #0F172A;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 0.85rem;
          font-size: ${isLandscape ? '8px' : '10.5px'};
          page-break-inside: auto;
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
          font-weight: 700;
          text-align: left;
          padding: ${isLandscape ? '4px 5px' : '7px 10px'};
          border: 1px solid #CBD5E1;
          border-bottom: 2px solid #64748B;
        }
        td {
          padding: ${isLandscape ? '3px 5px' : '6.5px 10px'};
          border: 1px solid #CBD5E1;
          color: #1E293B;
          vertical-align: middle;
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
          margin-top: 1.25rem;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1rem;
          page-break-inside: avoid;
        }
        .sig-box {
          border-top: 1px dashed #94A3B8;
          padding-top: 4px;
          font-size: 8px;
          color: #475569;
        }
        .sig-title {
          font-weight: 700;
          color: #0F172A;
          margin-bottom: 1px;
        }
        .footer {
          margin-top: 0.75rem;
          border-top: 1px solid #E2E8F0;
          padding-top: 4px;
          display: flex;
          justify-content: space-between;
          font-size: 8px;
          color: #94A3B8;
        }
        @media print {
          body {
            padding: 0;
            background: #FFFFFF !important;
          }
          .no-print {
            display: none !important;
          }
        }
      </style>
    </head>
    <body>
      <div class="no-print" style="margin-bottom: 0.65rem; padding: 0.5rem 0.85rem; background: #0F766E; color: white; border-radius: 6px; display: flex; justify-content: space-between; align-items: center;">
        <div style="font-size: 11px;">
          <strong>Landscape PDF Preview (Optimized for Paper Saving & Clear Readability)</strong> — Ready for printing or saving.
        </div>
        <button onclick="window.print()" style="background: #FFFFFF; color: #0F766E; border: none; font-weight: 800; padding: 5px 12px; border-radius: 4px; cursor: pointer; font-size: 11px;">
          🖨️ Save as PDF / Print
        </button>
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
}'''

# Replace from 'export function downloadAsPdfReport(' to 'copyTextToClipboard'
pattern = r'export function downloadAsPdfReport\([\s\S]*?export async function copyTextToClipboard'
replacement = new_pdf_func + '\n\n/**\n * Copies plain text / markdown table summary to clipboard.\n */\nexport async function copyTextToClipboard'

new_code = re.sub(pattern, replacement, code)
if new_code != code:
    with open(path, 'w', encoding='utf-8') as f:
        f.write(new_code)
    print('Successfully updated downloadAsPdfReport in dashboardExport.ts')
else:
    print('Pattern match failed')
