import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

function formatIcsDate(dateStr: string): string {
  if (!dateStr) return '';
  return dateStr.replace(/-/g, '').slice(0, 8);
}

function formatIcsDateTime(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function getNextDayStr(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.slice(0, 10).split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, (d || 1) + 1));
  const ny = dt.getUTCFullYear();
  const nm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const nd = String(dt.getUTCDate()).padStart(2, '0');
  return `${ny}${nm}${nd}`;
}

function escapeIcsText(text: string): string {
  if (!text) return '';
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

export async function GET(
  req: NextRequest,
  { params }: { params: { branchId: string } }
) {
  try {
    const branchId = decodeURIComponent(params.branchId);
    const data = await getDb();
    const searchParams = req.nextUrl.searchParams;
    const workshopId = searchParams.get('workshopId');
    const isDownload = searchParams.get('download') !== '0';

    // 1. Resolve Organization / Branch
    const isAll = branchId === 'all' || branchId === 'national' || branchId === 'moe';
    const org = !isAll ? data.organizations.find(
      (o) => o.id === branchId || o.name.toLowerCase() === branchId.toLowerCase()
    ) : null;
    const branchName = isAll ? 'National Ministry Schedule' : (org?.name || branchId);

    // 2. Filter workshops
    let branchWorkshops = data.workshops.filter((w) => {
      if (isAll) return true;
      if (w.organizingOrgId === branchId || w.placeId === branchId || w.targetOrgId === branchId) {
        return true;
      }
      if (org && w.branch && w.branch.toLowerCase().includes(org.name.toLowerCase())) {
        return true;
      }
      return false;
    });

    // If specific workshop requested, narrow down
    if (workshopId) {
      const singleWs = data.workshops.find((w) => w.id === workshopId || w.workshopNumber === workshopId);
      if (singleWs) {
        branchWorkshops = [singleWs];
      }
    }

    // 3. Filter AIP activities for this branch (only if not single-workshop export)
    const branchAipActivities = workshopId
      ? []
      : (data.aipActivities || []).filter((a) => {
          return a.branchId === branchId || (org && a.branchName && a.branchName.toLowerCase().includes(org.name.toLowerCase()));
        });

    const nowStr = formatIcsDateTime(new Date());

    // 4. Construct RFC 5545 iCalendar stream
    const lines: string[] = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Ministry of Education Sri Lanka//Integrated Planning & Monitoring Information System (IPMIS)//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:${escapeIcsText(branchName)} - Official Schedule`,
      `X-WR-CALDESC:Official schedule of workshops and activity milestones for ${escapeIcsText(branchName)}.`,
      'X-WR-TIMEZONE:Asia/Colombo',
    ];

    // Add Workshops as VEVENT
    branchWorkshops.forEach((ws) => {
      if (!ws.startDate) return;

      const startDateClean = formatIcsDate(ws.startDate);
      // For all-day events in iCalendar, DTEND is exclusive (day after last day)
      const endDateClean = getNextDayStr(ws.endDate || ws.startDate);

      const summary = `[${ws.workshopNumber || 'WS'}] ${ws.title || 'Educational Workshop'}`;
      const descLines = [
        `Subject: ${ws.subject || 'Information & Communication Technology'}`,
        `Branch / Organizing Unit: ${ws.branch || branchName}`,
        `Venue / Place: ${ws.venue || ws.placeName || 'Assigned Educational Training Venue'}`,
        `Status: ${ws.status || 'Scheduled'}`,
        `Target Trainees: ${ws.expectedTrainees || 0}`,
        ws.lastRescheduledAt ? `Rescheduled: Yes (Total reschedules: ${ws.rescheduleCount || 1})` : '',
        ws.lastRescheduleReason ? `Reschedule Reason: ${ws.lastRescheduleReason}` : '',
        ws.aim ? `Aim: ${ws.aim}` : '',
        `Ministry of Education Sri Lanka • IPMIS Official Event`,
      ].filter(Boolean);

      const description = descLines.join('\n');
      const location = ws.venue || ws.placeName || 'Ministry of Education Sri Lanka';
      const seq = ws.rescheduleCount || 0;

      lines.push('BEGIN:VEVENT');
      lines.push(`UID:ws-${ws.id}@moe.gov.lk`);
      lines.push(`DTSTAMP:${nowStr}`);
      lines.push(`DTSTART;VALUE=DATE:${startDateClean}`);
      lines.push(`DTEND;VALUE=DATE:${endDateClean}`);
      lines.push(`SUMMARY:${escapeIcsText(summary)}`);
      lines.push(`DESCRIPTION:${escapeIcsText(description)}`);
      lines.push(`LOCATION:${escapeIcsText(location)}`);
      lines.push(`STATUS:${ws.status === 'Cancelled' ? 'CANCELLED' : 'CONFIRMED'}`);
      lines.push(`SEQUENCE:${seq}`);
      lines.push('TRANSP:OPAQUE');
      lines.push('END:VEVENT');
    });

    // Add AIP Activity Quarter Milestones as VEVENT
    branchAipActivities.forEach((act) => {
      const year = act.year || '2026';
      if (act.targetQ1 && act.targetQ1 !== '-' && act.targetQ1.trim().length > 0) {
        lines.push('BEGIN:VEVENT');
        lines.push(`UID:aip-${act.id}-q1@moe.gov.lk`);
        lines.push(`DTSTAMP:${nowStr}`);
        lines.push(`DTSTART;VALUE=DATE:${year}0331`);
        lines.push(`DTEND;VALUE=DATE:${year}0401`);
        lines.push(`SUMMARY:${escapeIcsText(`[AIP Q1 Milestone] ${act.activityCode || ''} ${act.activity}`)}`);
        lines.push(`DESCRIPTION:${escapeIcsText(`Target: ${act.targetQ1}\nResponsible: ${act.responsibleOfficer || 'Branch Officer'}\nEstimated: Rs. ${act.financialQ1 || 0} Mn`)}`);
        lines.push('LOCATION:Ministry of Education Sri Lanka');
        lines.push('STATUS:CONFIRMED');
        lines.push('SEQUENCE:0');
        lines.push('END:VEVENT');
      }
    });

    lines.push('END:VCALENDAR');

    const icsContent = lines.join('\r\n');
    const filename = workshopId && branchWorkshops[0]
      ? `${(branchWorkshops[0].workshopNumber || 'workshop').replace(/[\/\\]/g, '-')}.ics`
      : `${branchId}-schedule.ics`;

    const disposition = isDownload
      ? `attachment; filename="${filename}"`
      : `inline; filename="${filename}"`;

    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': disposition,
        'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error: any) {
    console.error('Failed to generate calendar feed:', error);
    return NextResponse.json({ error: 'Failed to generate calendar feed' }, { status: 500 });
  }
}
