'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import TileActionMenu, { TileExportData } from '@/components/dashboard/TileActionMenu';

export interface CalendarEventItem {
  id: string;
  title: string;
  category: 'workshop' | 'milestone' | 'deadline' | 'meeting';
  dateStr: string; // YYYY-MM-DD
  endDateStr?: string;
  branchName?: string;
  location?: string;
  status?: string;
  link?: string;
}

interface CompactCalendarCardProps {
  workshops?: any[];
  deadlines?: any[];
  activities?: any[];
  onSelectEvent?: (event: CalendarEventItem) => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export default function CompactCalendarCard({
  workshops = [],
  deadlines = [],
  activities = [],
  onSelectEvent,
}: CompactCalendarCardProps) {
  const today = useMemo(() => new Date(), []);
  const [currentYear, setCurrentYear] = useState(() => 2026);
  const [currentMonthIdx, setCurrentMonthIdx] = useState(() => 10); // Nov = 10 (0-indexed)
  const [selectedDateKey, setSelectedDateKey] = useState<string>('2026-11-20');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<'all' | 'workshop' | 'milestone' | 'deadline' | 'meeting'>('workshop');

  // Convert workshops, deadlines, and milestones into unified events
  const allEvents = useMemo<CalendarEventItem[]>(() => {
    const list: CalendarEventItem[] = [];

    // 1. Workshops
    workshops.forEach((ws) => {
      const start = (ws.startDate || '').slice(0, 10);
      if (start) {
        list.push({
          id: ws.id,
          title: ws.title || 'Scheduled Capacity Building Workshop',
          category: 'workshop',
          dateStr: start,
          endDateStr: (ws.endDate || ws.startDate || '').slice(0, 10),
          branchName: ws.branch || 'Organizing Branch',
          location: ws.placeName || ws.venue || 'Ministry of Education',
          status: ws.status || 'Scheduled',
          link: `/workshops/${ws.id}`,
        });
      }
    });

    // 2. Deadlines
    deadlines.forEach((dl) => {
      const d = (dl.dueDate || dl.date || '').slice(0, 10);
      if (d) {
        list.push({
          id: dl.id || `dl-${Math.random()}`,
          title: dl.title || dl.name || 'Statutory Submission Deadline',
          category: 'deadline',
          dateStr: d,
          branchName: dl.targetAudience || 'All Provincial Branches',
          location: 'National Planning Portal',
          status: dl.status || 'Active',
          link: '/monitoring',
        });
      }
    });

    // 3. Milestone Reviews / Meetings
    if (list.length < 15) {
      // Seed standard calendar milestones if sparse
      const y = currentYear;
      const m = String(currentMonthIdx + 1).padStart(2, '0');
      list.push(
        {
          id: 'ms-q4-review',
          title: 'Q4 National AIP Progress Audit Review',
          category: 'milestone',
          dateStr: `${y}-${m}-15`,
          branchName: 'MoE Planning & Monitoring Division',
          location: 'Auditorium A, Isurupaya',
          status: 'Confirmed',
          link: '/monitoring',
        },
        {
          id: 'mtg-budget-closure',
          title: 'Annual Budget Statutory Closure Meeting',
          category: 'meeting',
          dateStr: `${y}-${m}-22`,
          branchName: 'Finance & Accounts Branch',
          location: 'Conference Room 03',
          status: 'Scheduled',
          link: '/budget-forecasting',
        }
      );
    }

    return list;
  }, [workshops, deadlines, currentYear, currentMonthIdx]);

  // Map events by dateKey (YYYY-MM-DD)
  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEventItem[]> = {};
    allEvents.forEach((ev) => {
      if (selectedCategoryFilter !== 'all' && ev.category !== selectedCategoryFilter) return;
      if (!map[ev.dateStr]) map[ev.dateStr] = [];
      map[ev.dateStr].push(ev);
    });
    return map;
  }, [allEvents, selectedCategoryFilter]);

  // Calendar Days Grid Calculation (Monday = 0, Sunday = 6)
  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonthIdx, 1);
    const lastDay = new Date(currentYear, currentMonthIdx + 1, 0);

    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6; // Sunday becomes 6

    const totalDays = lastDay.getDate();
    const days: Array<{ dayNum: number; dateKey: string; isCurrentMonth: boolean }> = [];

    // Previous month padding
    const prevMonthLastDay = new Date(currentYear, currentMonthIdx, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = prevMonthLastDay - i;
      const m = currentMonthIdx === 0 ? 12 : currentMonthIdx;
      const y = currentMonthIdx === 0 ? currentYear - 1 : currentYear;
      days.push({
        dayNum: d,
        dateKey: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      const m = String(currentMonthIdx + 1).padStart(2, '0');
      const d = String(i).padStart(2, '0');
      days.push({
        dayNum: i,
        dateKey: `${currentYear}-${m}-${d}`,
        isCurrentMonth: true,
      });
    }

    // Next month padding to complete 35 or 42 cells
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const m = currentMonthIdx === 11 ? 1 : currentMonthIdx + 2;
      const y = currentMonthIdx === 11 ? currentYear + 1 : currentYear;
      days.push({
        dayNum: i,
        dateKey: `${y}-${String(m).padStart(2, '0')}-${String(i).padStart(2, '0')}`,
        isCurrentMonth: false,
      });
    }

    return days;
  }, [currentYear, currentMonthIdx]);

  // Navigation handlers
  const handlePrevMonth = () => {
    if (currentMonthIdx === 0) {
      setCurrentMonthIdx(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonthIdx((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonthIdx === 11) {
      setCurrentMonthIdx(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonthIdx((m) => m + 1);
    }
  };

  // Selected date events
  const selectedDateEvents = eventsByDate[selectedDateKey] || [];

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'workshop': return '#0284C7'; // Blue/Teal
      case 'milestone': return '#8B5CF6'; // Purple
      case 'deadline': return '#F59E0B'; // Amber
      case 'meeting': return '#10B981'; // Green
      default: return '#64748B';
    }
  };

  // 1-Click Google Calendar link generator
  const getGoogleCalendarUrl = (ev: CalendarEventItem) => {
    const sDate = ev.dateStr.replace(/-/g, '');
    const eDate = (ev.endDateStr || ev.dateStr).replace(/-/g, '');
    const title = encodeURIComponent(ev.title);
    const details = encodeURIComponent(`Category: ${ev.category.toUpperCase()}\nBranch: ${ev.branchName || 'MoE'}\nStatus: ${ev.status || 'Active'}\nIPMIS Sri Lanka`);
    const loc = encodeURIComponent(ev.location || 'Ministry of Education, Battaramulla');
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${sDate}/${eDate}&details=${details}&location=${loc}`;
  };

  const tileExportData: TileExportData = {
    filename: `MoE_Calendar_${currentYear}_${currentMonthIdx + 1}`,
    reportTitle: `Calendar - ${MONTH_NAMES[currentMonthIdx]} ${currentYear}`,
    subtitle: 'Scheduled Workshops, Statutory Deadlines, and Executive Milestones',
    headers: ['Date', 'Category', 'Activity / Event Title', 'Branch / Division', 'Venue / Location', 'Status'],
    rows: allEvents.map((ev) => [
      ev.dateStr,
      ev.category.toUpperCase(),
      ev.title,
      ev.branchName || 'Ministry of Education',
      ev.location || 'Isurupaya, Battaramulla',
      ev.status || 'Scheduled',
    ]),
    summaryStats: [
      { label: 'Total Events', value: allEvents.length, highlight: true },
      { label: 'Workshops', value: allEvents.filter((e) => e.category === 'workshop').length },
      { label: 'Deadlines', value: allEvents.filter((e) => e.category === 'deadline').length },
      { label: 'Milestones', value: allEvents.filter((e) => e.category === 'milestone').length },
    ],
    copySummaryText: `Calendar (${MONTH_NAMES[currentMonthIdx]} ${currentYear}): ${allEvents.length} scheduled items (${allEvents.filter((e) => e.category === 'workshop').length} workshops, ${allEvents.filter((e) => e.category === 'deadline').length} deadlines, ${allEvents.filter((e) => e.category === 'milestone').length} milestones).`,
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
        minHeight: '340px',
      }}
    >
      {/* Calendar Header with Navigation */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '0.45rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <span style={{ fontSize: '1.1rem' }}>📅</span>
          <div>
            <h3 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 800, color: '#0F172A' }}>
              Calendar
            </h3>
          </div>
        </div>

        {/* Month Stepper & Tile Actions (Right Side Up Corner) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <button
            type="button"
            onClick={handlePrevMonth}
            style={{
              border: '1px solid #F1E5E2',
              background: '#FFF5F2',
              borderRadius: '6px',
              padding: '0.2rem 0.45rem',
              cursor: 'pointer',
              fontSize: '0.72rem',
              fontWeight: 700,
              color: '#80142B',
            }}
            title="Previous Month"
          >
            ‹
          </button>
          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0F172A', minWidth: '85px', textAlign: 'center' }}>
            {MONTH_NAMES[currentMonthIdx].slice(0, 3)} {currentYear} ⌵
          </span>
          <button
            type="button"
            onClick={handleNextMonth}
            style={{
              border: '1px solid #F1E5E2',
              background: '#FFF5F2',
              borderRadius: '6px',
              padding: '0.2rem 0.45rem',
              cursor: 'pointer',
              fontSize: '0.72rem',
              fontWeight: 700,
              color: '#80142B',
            }}
            title="Next Month"
          >
            ›
          </button>
          <TileActionMenu
            tileTitle="Calendar"
            exportData={tileExportData}
            position="right"
          />
        </div>
      </div>

      {/* Category Filter Pills */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.35rem',
          marginBottom: '0.65rem',
          flexWrap: 'wrap',
        }}
      >
        {[
          { id: 'workshop', label: 'Workshops' },
          { id: 'deadline', label: 'Deadlines' },
          { id: 'milestone', label: 'Milestones' },
          { id: 'meeting', label: 'Reviews' },
        ].map((cat) => {
          const isSelected = selectedCategoryFilter === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategoryFilter(cat.id as any)}
              style={{
                border: 'none',
                background: isSelected ? '#80142B' : '#F8FAFC',
                color: isSelected ? '#FFFFFF' : '#475569',
                borderRadius: '12px',
                padding: '0.24rem 0.65rem',
                fontSize: '0.72rem',
                fontWeight: isSelected ? 800 : 600,
                cursor: 'pointer',
                boxShadow: isSelected ? '0 1px 3px rgba(128, 20, 43, 0.2)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Calendar Grid: Weekday Headers */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '4px',
          textAlign: 'center',
          fontSize: '0.72rem',
          fontWeight: 700,
          color: '#475569',
          marginBottom: '6px',
        }}
      >
        {WEEKDAYS.map((w) => (
          <div key={w} style={{ padding: '3px 0' }}>{w}</div>
        ))}
      </div>

      {/* Calendar Days */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          rowGap: '6px',
          columnGap: '4px',
          marginBottom: '0.75rem',
        }}
      >
        {calendarDays.map((cell) => {
          const eventsOnDay = eventsByDate[cell.dateKey] || [];
          const isSelected = selectedDateKey === cell.dateKey;

          return (
            <div
              key={cell.dateKey}
              onClick={() => setSelectedDateKey(cell.dateKey)}
              style={{
                background: isSelected
                  ? '#80142B'
                  : cell.isCurrentMonth
                  ? '#FFFFFF'
                  : '#FAFAFA',
                color: isSelected
                  ? '#FFFFFF'
                  : cell.isCurrentMonth
                  ? '#1E293B'
                  : '#CBD5E1',
                borderRadius: isSelected ? '50%' : '8px',
                padding: '2px',
                width: isSelected ? '34px' : 'auto',
                height: '34px',
                margin: isSelected ? '0 auto' : '0',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: isSelected ? '0 3px 8px rgba(128, 20, 43, 0.35)' : 'none',
                transition: 'all 0.12s ease',
              }}
              title={`${cell.dateKey}: ${eventsOnDay.length} event(s)`}
            >
              <span style={{ fontSize: '0.82rem', fontWeight: isSelected ? 800 : cell.isCurrentMonth ? 700 : 500 }}>
                {cell.dayNum}
              </span>
            </div>
          );
        })}
      </div>

      {/* Selected Date Event Preview Box */}
      <div
        style={{
          flex: 1,
          background: '#FFF5F2',
          borderRadius: '12px',
          border: '1px solid #F1E5E2',
          padding: '0.55rem 0.75rem',
          display: 'flex',
          flexDirection: 'column',
          minHeight: '85px',
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>📅</span> Events on {selectedDateKey}
          </span>
          <span style={{ fontSize: '0.68rem', color: '#80142B', fontWeight: 700 }}>
            {selectedDateEvents.length} scheduled
          </span>
        </div>

        {selectedDateEvents.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {selectedDateEvents.map((ev) => (
              <div
                key={ev.id}
                style={{
                  background: '#FFFFFF',
                  borderRadius: '6px',
                  border: '1px solid #F1E5E2',
                  padding: '0.35rem 0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.4rem',
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: '#80142B',
                        flexShrink: 0,
                      }}
                    />
                    <div
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: '#0F172A',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      title={ev.title}
                    >
                      {ev.title}
                    </div>
                  </div>
                  <div style={{ fontSize: '0.62rem', color: '#64748B', marginTop: '1px' }}>
                    {ev.branchName} • {ev.location}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}>
                  {ev.link && (
                    <Link
                      href={ev.link}
                      style={{
                        fontSize: '0.58rem',
                        fontWeight: 700,
                        color: '#80142B',
                        background: '#FFF5F2',
                        border: '1px solid #F2DDD5',
                        padding: '2px 5px',
                        borderRadius: '4px',
                        textDecoration: 'none',
                      }}
                    >
                      View →
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', color: '#94A3B8', fontSize: '0.7rem', margin: 'auto 0', padding: '0.4rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#FCE7E1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#80142B', fontSize: '0.85rem' }}>
              ✓
            </div>
            <div>No specific events scheduled on this date.</div>
          </div>
        )}
      </div>
    </div>
  );
}
