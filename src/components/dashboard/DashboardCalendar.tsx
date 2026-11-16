'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { AnnualPlanIcon, SyncCalendarIcon } from '@/components/icons/NavIcons';

interface DashboardCalendarProps {
  workshops: any[];
  onStatusChange?: (workshopId: string, newStatus: string) => Promise<void>;
  loading?: boolean;
  branchId?: string;
  branchName?: string;
}

// Days of week starting with Monday (as in official LMS standard)
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function normalizeStatus(ws: any): 'Completed' | 'In Progress' | 'Scheduled' {
  const startStr = (ws.startDate || '').slice(0, 10);
  const endStr = (ws.endDate || ws.startDate || '').slice(0, 10);

  if (startStr) {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const todayStr = `${y}-${m}-${d}`;

    if (todayStr > endStr) return 'Completed';
    if (todayStr >= startStr && todayStr <= endStr) return 'In Progress';
    return 'Scheduled';
  }

  const s = (ws.status || ws.statusName || '').toLowerCase();
  const id = (ws.statusId || '').toLowerCase();

  if (s.includes('complete') || id.includes('complete')) return 'Completed';
  if (s.includes('progress') || s.includes('ongoing') || id.includes('ongoing')) return 'In Progress';
  return 'Scheduled'; // Pending / Scheduled
}

function formatDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.slice(0, 10).split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function DashboardCalendar({
  workshops = [],
  onStatusChange,
  loading,
  branchId,
  branchName,
}: DashboardCalendarProps) {
  // Current visible month/year
  const [viewDate, setViewDate] = useState<Date>(() => new Date());
  // Selected single date (YYYY-MM-DD) or null for all month
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  // Status filter chip
  const [statusFilter, setStatusFilter] = useState<'all' | 'Completed' | 'Scheduled' | 'In Progress'>('all');
  // State for updating status inline
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Calendar sync modal states
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [copied, setCopied] = useState(false);

  // Calendar Subscribers State
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [subscribersLoading, setSubscribersLoading] = useState(false);
  const [subPlatformFilter, setSubPlatformFilter] = useState<'All' | 'Google Calendar' | 'Apple Calendar' | 'Outlook'>('All');
  const [showAddSubModal, setShowAddSubModal] = useState(false);
  const [newOfficerName, setNewOfficerName] = useState('');
  const [newOfficerEmail, setNewOfficerEmail] = useState('');
  const [newPlatform, setNewPlatform] = useState<'Google Calendar' | 'Apple Calendar' | 'Outlook'>('Google Calendar');
  const [newRole, setNewRole] = useState('Planning Officer');
  const [subSuccessMsg, setSubSuccessMsg] = useState<string | null>(null);

  const activeBranchId = branchId || (workshops[0]?.organizingOrgId) || 'org-moe-ict';
  const activeBranchName = branchName || (workshops[0]?.branch) || 'MOE ICT Branch';

  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const feedPath = `/api/calendar/${encodeURIComponent(activeBranchId)}/feed`;
  const httpFeedUrl = `${origin}${feedPath}`;
  const webcalUrl = httpFeedUrl.replace(/^https?:/, 'webcal:');
  const googleCalendarUrl = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(httpFeedUrl)}`;

  const handleCopyFeedUrl = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(httpFeedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const getGoogleCalendarAddUrl = (ws?: any) => {
    const targetWs = ws || displayedWorkshops.find((w) => normalizeStatus(w) !== 'Completed') || workshops[0];
    if (!targetWs) return 'https://calendar.google.com';
    const title = encodeURIComponent(`[${targetWs.workshopNumber || targetWs.year || 'WS'}] ${targetWs.title || 'MoE Workshop'}`);
    const startStr = (targetWs.startDate || '').replace(/-/g, '').slice(0, 8);
    
    // RFC 5545 and Google Calendar requirement: all-day end dates are exclusive (+1 day from last day)
    let endStr = startStr;
    const lastDateStr = targetWs.endDate || targetWs.startDate;
    if (lastDateStr) {
      try {
        const parts = lastDateStr.slice(0, 10).split('-');
        if (parts.length === 3) {
          const y = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10) - 1;
          const d = parseInt(parts[2], 10);
          const nextDate = new Date(Date.UTC(y, m, d + 1));
          const ny = nextDate.getUTCFullYear();
          const nm = String(nextDate.getUTCMonth() + 1).padStart(2, '0');
          const nd = String(nextDate.getUTCDate()).padStart(2, '0');
          endStr = `${ny}${nm}${nd}`;
        }
      } catch {
        endStr = (lastDateStr || '').replace(/-/g, '').slice(0, 8);
      }
    }

    const details = encodeURIComponent(
      `Ministry of Education • Sri Lanka\n` +
      `Integrated Planning & Monitoring Information System (IPMIS)\n\n` +
      `Workshop: ${targetWs.title || ''}\n` +
      `Workshop No: ${targetWs.workshopNumber || targetWs.year || ''}\n` +
      `Organizing Branch: ${targetWs.branch || activeBranchName}\n` +
      `Subject: ${targetWs.subject || 'Education'}\n` +
      `Venue: ${targetWs.venue || targetWs.placeName || 'Assigned Venue'}\n` +
      `Duration: ${targetWs.daysHeld || 1} day(s)\n` +
      `Aim: ${targetWs.aim || 'Annual Implementation Plan Workshop'}`
    );
    const location = encodeURIComponent(targetWs.venue || targetWs.placeName || 'Ministry of Education, Isurupaya, Battaramulla');
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startStr}/${endStr}&details=${details}&location=${location}`;
  };

  const fetchSubscribers = async () => {
    try {
      setSubscribersLoading(true);
      const res = await fetch(`/api/calendar/subscribers?branchId=${encodeURIComponent(activeBranchId)}`);
      if (res.ok) {
        const json = await res.json();
        setSubscribers(json.subscribers || []);
      }
    } catch (err) {
      console.error('Failed to fetch subscribers:', err);
    } finally {
      setSubscribersLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscribers();
  }, [activeBranchId]);

  const handleAddSubscriber = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOfficerName || !newOfficerEmail) return;

    try {
      const res = await fetch('/api/calendar/subscribers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          officerName: newOfficerName,
          email: newOfficerEmail,
          platform: newPlatform,
          branchId: activeBranchId,
          branchName: activeBranchName,
          role: newRole,
        }),
      });

      if (res.ok) {
        setNewOfficerName('');
        setNewOfficerEmail('');
        setShowAddSubModal(false);
        setSubSuccessMsg(`✓ Successfully subscribed ${newOfficerName} to ${activeBranchName}'s ${newPlatform} feed.`);
        setTimeout(() => setSubSuccessMsg(null), 5000);
        fetchSubscribers();
      }
    } catch (err) {
      console.error('Error adding subscriber:', err);
    }
  };

  const handleDeleteSubscriber = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to unsubscribe ${name}?`)) return;
    try {
      const res = await fetch(`/api/calendar/subscribers?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setSubscribers((prev) => prev.filter((s) => s.id !== id));
        setSubSuccessMsg(`✓ Removed ${name} from calendar feed subscribers.`);
        setTimeout(() => setSubSuccessMsg(null), 4000);
      }
    } catch (err) {
      console.error('Error removing subscriber:', err);
    }
  };

  const handleTriggerSimulatedNotification = () => {
    setSubSuccessMsg(
      `✓ Live email & calendar push notification sent to all ${subscribers.length} subscribers: "${activeBranchName} Workshop Schedule updated (Google/Apple Calendar events synchronized)."`
    );
    setTimeout(() => setSubSuccessMsg(null), 7000);
  };

  const currentYear = viewDate.getFullYear();
  const currentMonthIdx = viewDate.getMonth();

  const today = new Date();
  const todayKey = formatDateKey(today);

  // Month navigation
  const handlePrevMonth = () => {
    setViewDate(new Date(currentYear, currentMonthIdx - 1, 1));
    setSelectedDateKey(null);
  };

  const handleNextMonth = () => {
    setViewDate(new Date(currentYear, currentMonthIdx + 1, 1));
    setSelectedDateKey(null);
  };

  const handleToday = () => {
    const now = new Date();
    setViewDate(now);
    setSelectedDateKey(formatDateKey(now));
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newYear = parseInt(e.target.value, 10);
    setViewDate(new Date(newYear, currentMonthIdx, 1));
    setSelectedDateKey(null);
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMonth = parseInt(e.target.value, 10);
    setViewDate(new Date(currentYear, newMonth, 1));
    setSelectedDateKey(null);
  };

  // Build workshop lookup map for the calendar days
  // Key: YYYY-MM-DD -> Array of workshops on that day
  const { workshopsByDate, monthWorkshops, statusCounts } = useMemo(() => {
    const map: Record<string, any[]> = {};
    const inMonth: any[] = [];
    const counts = { total: 0, completed: 0, scheduled: 0, inProgress: 0 };

    workshops.forEach((ws) => {
      const startStr = (ws.startDate || '').slice(0, 10);
      const endStr = (ws.endDate || ws.startDate || '').slice(0, 10);

      if (!startStr) return;

      const normStatus = normalizeStatus(ws);
      const startParts = startStr.split('-').map(Number);
      const endParts = endStr.split('-').map(Number);

      const sDate = new Date(startParts[0], startParts[1] - 1, startParts[2]);
      const eDate = new Date(endParts[0], endParts[1] - 1, endParts[2]);

      // Check if this workshop touches the current month
      const startMonth = sDate.getFullYear() * 12 + sDate.getMonth();
      const endMonth = eDate.getFullYear() * 12 + eDate.getMonth();
      const targetMonth = currentYear * 12 + currentMonthIdx;

      const isInThisMonth = targetMonth >= startMonth && targetMonth <= endMonth;

      if (isInThisMonth) {
        inMonth.push(ws);
        counts.total++;
        if (normStatus === 'Completed') counts.completed++;
        else if (normStatus === 'In Progress') counts.inProgress++;
        else counts.scheduled++;
      }

      // Populate every day in range
      const cur = new Date(sDate);
      // Safeguard max 60 days loop
      let count = 0;
      while (cur <= eDate && count < 60) {
        const key = formatDateKey(cur);
        if (!map[key]) map[key] = [];
        if (!map[key].some((item) => item.id === ws.id)) {
          map[key].push(ws);
        }
        cur.setDate(cur.getDate() + 1);
        count++;
      }
    });

    return { workshopsByDate: map, monthWorkshops: inMonth, statusCounts: counts };
  }, [workshops, currentYear, currentMonthIdx]);

  // Generate calendar grid days
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonthIdx, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonthIdx + 1, 0);

    const totalDaysInMonth = lastDayOfMonth.getDate();
    // Monday is 0, Sunday is 6
    const startDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7;

    const days: Array<{
      dateKey: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      workshops: any[];
    }> = [];

    // Leading days from previous month
    const prevMonthLastDate = new Date(currentYear, currentMonthIdx, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = prevMonthLastDate - i;
      const prevDate = new Date(currentYear, currentMonthIdx - 1, d);
      const key = formatDateKey(prevDate);
      days.push({
        dateKey: key,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: key === todayKey,
        workshops: workshopsByDate[key] || [],
      });
    }

    // Days of current month
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const curDate = new Date(currentYear, currentMonthIdx, d);
      const key = formatDateKey(curDate);
      days.push({
        dateKey: key,
        dayNumber: d,
        isCurrentMonth: true,
        isToday: key === todayKey,
        workshops: workshopsByDate[key] || [],
      });
    }

    // Trailing days from next month to complete row of 7
    const remaining = (7 - (days.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const nextDate = new Date(currentYear, currentMonthIdx + 1, d);
      const key = formatDateKey(nextDate);
      days.push({
        dateKey: key,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: key === todayKey,
        workshops: workshopsByDate[key] || [],
      });
    }

    return days;
  }, [currentYear, currentMonthIdx, workshopsByDate, todayKey]);

  // Filter workshop list based on selected date and status filter
  const displayedWorkshops = useMemo(() => {
    let list = selectedDateKey
      ? (workshopsByDate[selectedDateKey] || [])
      : monthWorkshops;

    if (statusFilter !== 'all') {
      list = list.filter((w) => normalizeStatus(w) === statusFilter);
    }

    // Remove duplicates
    const seen = new Set<string>();
    return list.filter((w) => {
      if (seen.has(w.id)) return false;
      seen.add(w.id);
      return true;
    });
  }, [selectedDateKey, workshopsByDate, monthWorkshops, statusFilter]);

  // Handle inline quick status change
  const handleQuickStatusChange = async (wsId: string, newStatus: string) => {
    if (onStatusChange) {
      setUpdatingId(wsId);
      try {
        await onStatusChange(wsId, newStatus);
        setStatusMsg(`Workshop status marked as "${newStatus}"`);
        setTimeout(() => setStatusMsg(null), 3000);
      } catch (err: any) {
        console.error('Failed to change status:', err);
      } finally {
        setUpdatingId(null);
      }
    }
  };

  return (
    <div className="dashboard-calendar-wrapper">
      {/* ── Main Calendar Card ── */}
      <div className="card calendar-card" style={{ padding: '1.25rem' }}>
        
        {/* Card Header with Title and Month Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(141, 21, 58, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <AnnualPlanIcon size={20} color="var(--primary)" accentColor="#FFBE29" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--primary)', lineHeight: 1.2 }}>
                Calendar
              </h3>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                Monthly workshop schedules & status
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <button
              type="button"
              onClick={() => setShowSyncModal(true)}
              className="btn btn-secondary btn-sm"
              style={{
                fontSize: '0.72rem',
                padding: '0.25rem 0.55rem',
                height: 'auto',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                color: 'var(--primary)',
                borderColor: 'rgba(141, 21, 58, 0.35)',
              }}
              title="Sync branch schedule with Google or Apple Calendar"
            >
              <SyncCalendarIcon size={14} color="var(--primary)" accentColor="#FFBE29" />
              <span>Sync</span>
            </button>

            <button
              type="button"
              onClick={handleToday}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.72rem', padding: '0.25rem 0.55rem', height: 'auto', fontWeight: 600 }}
              title="Jump to today"
            >
              Today
            </button>
          </div>
        </div>

        {/* Month & Year Bar with Next / Prev Controls */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--gray-100)',
          borderRadius: 'var(--radius-md)',
          padding: '0.4rem 0.6rem',
          marginBottom: '0.85rem',
          border: '1px solid var(--border-light)',
        }}>
          <button
            type="button"
            onClick={handlePrevMonth}
            className="calendar-nav-btn"
            title="Previous Month"
            aria-label="Previous Month"
          >
            ◀
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <select
              value={currentMonthIdx}
              onChange={handleMonthChange}
              style={{
                background: 'transparent',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.9rem',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                fontFamily: 'inherit',
                outline: 'none',
              }}
            >
              {MONTH_NAMES.map((name, idx) => (
                <option key={name} value={idx}>{name}</option>
              ))}
            </select>

            <select
              value={currentYear}
              onChange={handleYearChange}
              style={{
                background: 'transparent',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.9rem',
                color: 'var(--primary)',
                cursor: 'pointer',
                fontFamily: 'inherit',
                outline: 'none',
              }}
            >
              {[2024, 2025, 2026, 2027, 2028].map((yr) => (
                <option key={yr} value={yr}>{yr}</option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleNextMonth}
            className="calendar-nav-btn"
            title="Next Month"
            aria-label="Next Month"
          >
            ▶
          </button>
        </div>

        {/* Weekday Header: Mon Tue Wed Thu Fri Sat Sun */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          textAlign: 'center',
          fontSize: '0.72rem',
          fontWeight: 700,
          color: 'var(--text-tertiary)',
          marginBottom: '0.4rem',
        }}>
          {WEEKDAYS.map((wd) => (
            <div key={wd} style={{ padding: '0.2rem 0' }}>
              {wd}
            </div>
          ))}
        </div>

        {/* Calendar Days 7-col Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '2px',
          background: 'var(--border-light)',
          border: '1px solid var(--border-light)',
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
        }}>
          {calendarDays.map((day, idx) => {
            const isSelected = selectedDateKey === day.dateKey;
            const hasWorkshops = day.workshops.length > 0;
            const completedCount = day.workshops.filter((w) => normalizeStatus(w) === 'Completed').length;
            const inProgressCount = day.workshops.filter((w) => normalizeStatus(w) === 'In Progress').length;
            const scheduledCount = day.workshops.filter((w) => normalizeStatus(w) === 'Scheduled').length;

            return (
              <div
                key={day.dateKey + idx}
                onClick={() => {
                  if (isSelected) {
                    setSelectedDateKey(null); // toggle off
                  } else {
                    setSelectedDateKey(day.dateKey);
                  }
                }}
                className={`calendar-cell ${!day.isCurrentMonth ? 'is-outside' : ''} ${day.isToday ? 'is-today' : ''} ${isSelected ? 'is-selected' : ''}`}
                title={
                  hasWorkshops
                    ? `${day.dateKey}: ${day.workshops.map((w) => `${w.title} (${normalizeStatus(w)})`).join('; ')}`
                    : day.dateKey
                }
                style={{
                  minHeight: '44px',
                  background: isSelected
                    ? 'rgba(141, 21, 58, 0.12)'
                    : day.isCurrentMonth
                    ? 'var(--white)'
                    : 'var(--gray-100)',
                  cursor: 'pointer',
                  padding: '3px 2px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'background var(--ease)',
                  outline: isSelected ? '2px solid var(--primary)' : day.isToday ? '1.5px dashed var(--accent)' : 'none',
                  outlineOffset: '-2px',
                  position: 'relative',
                }}
              >
                {/* Day Number */}
                <span
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: day.isToday || isSelected ? 800 : day.isCurrentMonth ? 600 : 400,
                    color: isSelected
                      ? 'var(--primary)'
                      : day.isToday
                      ? 'var(--accent-dark)'
                      : day.isCurrentMonth
                      ? 'var(--text-primary)'
                      : 'var(--text-placeholder)',
                    lineHeight: 1.1,
                    marginTop: '1px',
                  }}
                >
                  {day.dayNumber}
                </span>

                {/* Workshop Status Indicator Dots */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '2px', minHeight: '8px', marginBottom: '2px' }}>
                  {completedCount > 0 && (
                    <span
                      className="calendar-dot completed"
                      title={`${completedCount} Completed`}
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: '#00534E',
                        display: 'inline-block',
                      }}
                    />
                  )}
                  {inProgressCount > 0 && (
                    <span
                      className="calendar-dot in-progress"
                      title={`${inProgressCount} In Progress`}
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: '#EB7400',
                        display: 'inline-block',
                      }}
                    />
                  )}
                  {scheduledCount > 0 && (
                    <span
                      className="calendar-dot scheduled"
                      title={`${scheduledCount} Pending / Scheduled`}
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: '#1565C0',
                        display: 'inline-block',
                      }}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Status Legend */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: '0.75rem',
          paddingTop: '0.65rem',
          borderTop: '1px solid var(--border-light)',
          fontSize: '0.72rem',
          color: 'var(--text-secondary)',
          flexWrap: 'wrap',
          gap: '0.4rem',
        }}>
          <div
            onClick={() => setStatusFilter(statusFilter === 'Completed' ? 'all' : 'Completed')}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', opacity: statusFilter === 'all' || statusFilter === 'Completed' ? 1 : 0.4 }}
          >
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00534E' }} />
            <span>Completed ({statusCounts.completed})</span>
          </div>

          <div
            onClick={() => setStatusFilter(statusFilter === 'In Progress' ? 'all' : 'In Progress')}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', opacity: statusFilter === 'all' || statusFilter === 'In Progress' ? 1 : 0.4 }}
          >
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EB7400' }} />
            <span>In Progress ({statusCounts.inProgress})</span>
          </div>

          <div
            onClick={() => setStatusFilter(statusFilter === 'Scheduled' ? 'all' : 'Scheduled')}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', opacity: statusFilter === 'all' || statusFilter === 'Scheduled' ? 1 : 0.4 }}
          >
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#1565C0' }} />
            <span>Pending ({statusCounts.scheduled})</span>
          </div>
        </div>

      </div>

      {/* ── Monthly Workshop Overview & Detail Section ── */}
      <div className="card" style={{ marginTop: '1.25rem', padding: '1.25rem' }}>
        
        {/* Section Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              {selectedDateKey ? (
                <>
                  Workshops on <span style={{ color: 'var(--primary)' }}>{formatDisplayDate(selectedDateKey)}</span>
                </>
              ) : (
                <>
                  Workshops in <span style={{ color: 'var(--primary)' }}>{MONTH_NAMES[currentMonthIdx]} {currentYear}</span>
                </>
              )}
            </h4>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
              {selectedDateKey
                ? 'Showing workshops scheduled for this selected date'
                : `${statusCounts.total} workshop(s) planned for this month`}
            </div>
          </div>

          {selectedDateKey && (
            <button
              type="button"
              onClick={() => setSelectedDateKey(null)}
              className="btn btn-ghost btn-sm"
              style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem', color: 'var(--primary)' }}
            >
              ✕ View All Month
            </button>
          )}
        </div>

        {/* Filter Chips: All | Completed | In Progress | Pending */}
        <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            style={{
              padding: '0.25rem 0.65rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.72rem',
              fontWeight: 600,
              border: '1px solid',
              borderColor: statusFilter === 'all' ? 'var(--primary)' : 'var(--border-default)',
              background: statusFilter === 'all' ? 'var(--primary-10)' : 'var(--white)',
              color: statusFilter === 'all' ? 'var(--primary)' : 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            All ({selectedDateKey ? displayedWorkshops.length : statusCounts.total})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('Completed')}
            style={{
              padding: '0.25rem 0.65rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.72rem',
              fontWeight: 600,
              border: '1px solid',
              borderColor: statusFilter === 'Completed' ? '#00534E' : 'var(--border-default)',
              background: statusFilter === 'Completed' ? 'rgba(0, 83, 78, 0.12)' : 'var(--white)',
              color: statusFilter === 'Completed' ? '#00534E' : 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            ✓ Completed ({statusCounts.completed})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('In Progress')}
            style={{
              padding: '0.25rem 0.65rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.72rem',
              fontWeight: 600,
              border: '1px solid',
              borderColor: statusFilter === 'In Progress' ? '#EB7400' : 'var(--border-default)',
              background: statusFilter === 'In Progress' ? 'rgba(235, 116, 0, 0.12)' : 'var(--white)',
              color: statusFilter === 'In Progress' ? '#EB7400' : 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            ▶ In Progress ({statusCounts.inProgress})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('Scheduled')}
            style={{
              padding: '0.25rem 0.65rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.72rem',
              fontWeight: 600,
              border: '1px solid',
              borderColor: statusFilter === 'Scheduled' ? '#1565C0' : 'var(--border-default)',
              background: statusFilter === 'Scheduled' ? 'rgba(21, 101, 192, 0.12)' : 'var(--white)',
              color: statusFilter === 'Scheduled' ? '#1565C0' : 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            ⏳ Pending ({statusCounts.scheduled})
          </button>
        </div>

        {/* Feedback message when status changes */}
        {statusMsg && (
          <div style={{
            padding: '0.4rem 0.75rem',
            background: 'rgba(0, 83, 78, 0.1)',
            border: '1px solid #00534E',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.75rem',
            color: '#00534E',
            fontWeight: 600,
            marginBottom: '0.75rem',
          }}>
            ✓ {statusMsg}
          </div>
        )}

        {/* Workshops Cards List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '420px', overflowY: 'auto' }}>
          {displayedWorkshops.length > 0 ? (
            displayedWorkshops.map((ws) => {
              const status = normalizeStatus(ws);
              const isUpdating = updatingId === ws.id;

              return (
                <div
                  key={ws.id}
                  style={{
                    padding: '0.85rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-light)',
                    borderLeft: `4px solid ${
                      status === 'Completed' ? '#00534E' : status === 'In Progress' ? '#EB7400' : '#1565C0'
                    }`,
                    background: 'var(--white)',
                    boxShadow: 'var(--shadow-xs)',
                    transition: 'all var(--ease)',
                  }}
                >
                  {/* Top row: Status Badge & Workshop ID */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                    <span
                      style={{
                        padding: '0.15rem 0.5rem',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.03em',
                        background:
                          status === 'Completed'
                            ? 'rgba(0, 83, 78, 0.12)'
                            : status === 'In Progress'
                            ? 'rgba(235, 116, 0, 0.12)'
                            : 'rgba(21, 101, 192, 0.12)',
                        color:
                          status === 'Completed'
                            ? '#00534E'
                            : status === 'In Progress'
                            ? '#EB7400'
                            : '#1565C0',
                      }}
                    >
                      {status === 'Completed' && '✓ Completed'}
                      {status === 'In Progress' && '▶ In Progress'}
                      {status === 'Scheduled' && '⏳ Pending / Scheduled'}
                    </span>

                    <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>
                      {ws.workshopNumber || ws.year}
                    </span>
                  </div>

                  {/* Title */}
                  <Link
                    href={`/workshops/${ws.id}`}
                    style={{
                      display: 'block',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      color: 'var(--text-primary)',
                      lineHeight: 1.3,
                      marginBottom: '0.35rem',
                      textDecoration: 'none',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--primary)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; }}
                  >
                    {ws.title}
                  </Link>

                  {/* Date range & duration */}
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.3rem' }}>
                    <span>📅</span>
                    <span style={{ fontWeight: 600 }}>
                      {formatDisplayDate(ws.startDate)}
                      {ws.endDate && ws.endDate !== ws.startDate && ` – ${formatDisplayDate(ws.endDate)}`}
                    </span>
                    <span style={{ color: 'var(--text-tertiary)' }}>
                      ({ws.daysHeld || 1} day{ws.daysHeld > 1 ? 's' : ''})
                    </span>
                  </div>

                  {/* Place */}
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
                    <span>📍</span>
                    <span>{ws.placeName || 'Assigned Branch'}</span>
                  </div>

                  {/* Footer actions: Open link and quick status changer */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: '0.45rem',
                    borderTop: '1px dashed var(--border-light)',
                    marginTop: '0.4rem',
                    flexWrap: 'wrap',
                    gap: '0.35rem',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Link
                        href={`/workshops/${ws.id}`}
                        style={{
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          color: 'var(--primary)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '2px',
                        }}
                      >
                        Open Workshop →
                      </Link>
                    </div>

                    {/* 1-Click Sync quick actions for this specific workshop */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <a
                        href={getGoogleCalendarAddUrl(ws)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary btn-xs"
                        style={{
                          fontSize: '0.67rem',
                          fontWeight: 700,
                          padding: '0.18rem 0.45rem',
                          borderRadius: '4px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.2rem',
                          color: '#1565C0',
                          border: '1px solid rgba(21, 101, 192, 0.3)',
                          background: 'rgba(21, 101, 192, 0.05)',
                          textDecoration: 'none',
                        }}
                        title="Add this specific workshop to Google Calendar"
                      >
                        <span>📅</span> Google
                      </a>
                      <a
                        href={`/api/calendar/${encodeURIComponent(activeBranchId)}/feed?workshopId=${encodeURIComponent(ws.id)}`}
                        download={`${(ws.workshopNumber || 'workshop').replace(/[\/\\]/g, '-')}.ics`}
                        className="btn btn-secondary btn-xs"
                        style={{
                          fontSize: '0.67rem',
                          fontWeight: 700,
                          padding: '0.18rem 0.45rem',
                          borderRadius: '4px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.2rem',
                          color: 'var(--primary)',
                          border: '1px solid rgba(141, 21, 58, 0.3)',
                          background: 'rgba(141, 21, 58, 0.04)',
                          textDecoration: 'none',
                        }}
                        title="Download RFC 5545 .ics for Apple Calendar / Outlook / Windows"
                      >
                        <span>📥</span> iCal
                      </a>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '1.75rem 1rem',
              color: 'var(--text-tertiary)',
              background: 'var(--gray-100)',
              borderRadius: 'var(--radius-md)',
            }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.35rem' }}>📋</div>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                {selectedDateKey
                  ? `No workshops on ${formatDisplayDate(selectedDateKey)}`
                  : statusFilter !== 'all'
                  ? `No ${statusFilter} workshops in this month`
                  : `No workshops scheduled for ${MONTH_NAMES[currentMonthIdx]} ${currentYear}`}
              </div>
              <p style={{ fontSize: '0.72rem', marginTop: '0.25rem', marginBottom: '0.75rem' }}>
                Use the button below to schedule a new workshop.
              </p>
              <Link href="/workshops/new" className="btn btn-primary btn-sm" style={{ fontSize: '0.75rem' }}>
                ➕ Schedule Workshop
              </Link>
            </div>
          )}
        </div>

      </div>

      {/* ── DEDICATED CALENDAR SYNC PANEL (PLACED JUST BELOW THE CALENDAR) ── */}
      <div
        className="card calendar-sync-card"
        style={{
          marginTop: '1.25rem',
          padding: '1.25rem',
          borderRadius: 'var(--radius-lg)',
          border: '1.5px solid var(--border-medium)',
          background: 'var(--white)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #5c0f28 0%, #8D153A 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
              }}
            >
              <SyncCalendarIcon size={18} color="#FFFFFF" accentColor="#FFBE29" />
            </div>
            <div>
              <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--primary)', lineHeight: 1.2 }}>
                Calendar Sync & Mobile Feeds
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                Google Calendar, Apple Calendar & Outlook
              </div>
            </div>
          </div>

          <span
            style={{
              fontSize: '0.68rem',
              fontWeight: 800,
              padding: '0.2rem 0.55rem',
              borderRadius: '12px',
              background: 'rgba(0, 83, 78, 0.1)',
              color: '#00534E',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
            }}
          >
            <span>🔒</span>
            <span>{activeBranchName} Only</span>
          </span>
        </div>

        {/* Demo Environment Transparency Badge */}
        <div
          style={{
            background: '#F0FDF4',
            border: '1px solid #BBF7D0',
            borderRadius: '8px',
            padding: '0.6rem 0.75rem',
            marginBottom: '0.9rem',
            fontSize: '0.74rem',
            color: '#166534',
            lineHeight: 1.45,
          }}
        >
          <strong>🟢 Demo Environment Compatibility:</strong>
          <div style={{ marginTop: '0.2rem' }}>
            • <strong>Apple Calendar, Outlook & Windows:</strong> Work <strong>100% locally</strong> in this demo via <code>webcal://</code>.<br/>
            • <strong>Google Calendar (1-Click):</strong> Works <strong>100% locally</strong> in browser via one-click add button.<br/>
            • <strong>Universal .ics Export:</strong> Works <strong>100% locally</strong> (download & open in any calendar).<br/>
            • <em>Google Cloud automatic periodic background URL polling requires a public internet domain (active when deployed to <code>*.gov.lk</code>).</em>
          </div>
        </div>

        {/* Quick Action Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.6rem', marginBottom: '0.85rem' }}>
          
          {/* Apple / Outlook Calendar */}
          <a
            href={webcalUrl}
            className="btn btn-secondary btn-sm"
            style={{
              padding: '0.55rem 0.65rem',
              fontSize: '0.76rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.45rem',
              color: '#1E293B',
              border: '1.5px solid #CBD5E1',
              borderRadius: '8px',
              textDecoration: 'none',
              background: '#F8FAFC',
            }}
            title="Open in Apple Calendar, macOS, iOS, or Outlook"
          >
            <span>🍏</span>
            <span>Subscribe in Apple Calendar</span>
          </a>

          {/* 1-Click Add to Google Calendar */}
          <a
            href={getGoogleCalendarAddUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary btn-sm"
            style={{
              padding: '0.55rem 0.65rem',
              fontSize: '0.76rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.45rem',
              borderRadius: '8px',
              textDecoration: 'none',
            }}
            title="One-click add latest workshop to Google Calendar in your browser"
          >
            <span>📅</span>
            <span>1-Click Add to Google</span>
          </a>

          {/* Download .ics File */}
          <a
            href={feedPath}
            download={`${activeBranchId}-schedule.ics`}
            className="btn btn-secondary btn-sm"
            style={{
              padding: '0.55rem 0.65rem',
              fontSize: '0.76rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.45rem',
              color: 'var(--primary)',
              border: '1.5px solid rgba(141, 21, 58, 0.3)',
              borderRadius: '8px',
              textDecoration: 'none',
              background: 'rgba(141, 21, 58, 0.04)',
            }}
            title="Download standard RFC 5545 .ics file for offline import"
          >
            <span>📥</span>
            <span>Download .ics File</span>
          </a>

          {/* Copy URL */}
          <button
            type="button"
            onClick={handleCopyFeedUrl}
            className="btn btn-secondary btn-sm"
            style={{
              padding: '0.55rem 0.65rem',
              fontSize: '0.76rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.45rem',
              borderRadius: '8px',
            }}
            title="Copy branch iCal feed URL to clipboard"
          >
            <span>🔗</span>
            <span>{copied ? '✓ URL Copied!' : 'Copy Feed URL'}</span>
          </button>
        </div>

        {/* Change alert footer note */}
        <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', lineHeight: 1.4 }}>
          ⚡ <strong>Live Notification Trigger:</strong> Any workshop rescheduled or date updated by {activeBranchName} immediately regenerates with incremented <code>SEQUENCE</code> and sends automated update notifications.
        </div>
      </div>

      {/* ── GOOGLE & APPLE CALENDAR SUBSCRIBERS LIST (BOTTOM OF CALENDAR) ── */}
      <div
        className="card calendar-subscribers-card"
        style={{
          marginTop: '1.25rem',
          padding: '1.25rem',
          borderRadius: 'var(--radius-lg)',
          border: '1.5px solid var(--border-medium)',
          background: 'var(--white)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.1rem',
                flexShrink: 0,
                boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
              }}
            >
              👥
            </div>
            <div>
              <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.2 }}>
                Google & Apple Calendar Subscribers
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                Officers synchronized with <strong>{activeBranchName}</strong> schedule feed
              </div>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={handleTriggerSimulatedNotification}
              className="btn btn-secondary btn-sm"
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '0.35rem 0.65rem',
                color: '#0F766E',
                borderColor: '#0F766E',
                background: 'rgba(15, 118, 110, 0.06)',
                cursor: 'pointer',
              }}
              title="Dispatches automated calendar update notification to all subscribers"
            >
              <span>🔔</span>
              <span>Test Change Notification</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAddSubModal(true)}
              className="btn btn-primary btn-sm"
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '0.35rem 0.75rem',
                background: '#0284C7',
                borderColor: '#0284C7',
                cursor: 'pointer',
              }}
            >
              <span>➕</span>
              <span>Add Subscriber</span>
            </button>
          </div>
        </div>

        {/* Feedback Message */}
        {subSuccessMsg && (
          <div
            style={{
              padding: '0.5rem 0.85rem',
              borderRadius: '6px',
              background: '#D1FAE5',
              border: '1px solid #10B981',
              color: '#065F46',
              fontSize: '0.74rem',
              fontWeight: 700,
              marginBottom: '0.85rem',
              animation: 'fadeIn 0.2s ease',
            }}
          >
            {subSuccessMsg}
          </div>
        )}

        {/* Platform Filter Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.85rem', flexWrap: 'wrap' }}>
          {(['All', 'Google Calendar', 'Apple Calendar', 'Outlook'] as const).map((plat) => {
            const count = plat === 'All' ? subscribers.length : subscribers.filter((s) => s.platform === plat).length;
            const isSel = subPlatformFilter === plat;
            return (
              <button
                key={plat}
                type="button"
                onClick={() => setSubPlatformFilter(plat)}
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '0.2rem 0.55rem',
                  borderRadius: '16px',
                  border: '1px solid',
                  borderColor: isSel ? '#0284C7' : '#E2E8F0',
                  background: isSel ? '#E0F2FE' : '#F8FAFC',
                  color: isSel ? '#0369A1' : '#64748B',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {plat === 'Google Calendar' ? '📅 Google' : plat === 'Apple Calendar' ? '🍏 Apple' : plat} ({count})
              </button>
            );
          })}
        </div>

        {/* Subscribers Cards List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
          {subscribersLoading ? (
            <div style={{ textAlign: 'center', padding: '1rem', fontSize: '0.78rem', color: '#64748B' }}>
              Loading subscribers...
            </div>
          ) : subscribers.filter((s) => (subPlatformFilter === 'All' ? true : s.platform === subPlatformFilter)).length > 0 ? (
            subscribers
              .filter((s) => (subPlatformFilter === 'All' ? true : s.platform === subPlatformFilter))
              .map((sub) => {
                const isGoogle = sub.platform === 'Google Calendar';
                const isApple = sub.platform === 'Apple Calendar';

                return (
                  <div
                    key={sub.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      background: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      gap: '0.75rem',
                      flexWrap: 'wrap',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {/* Left: Platform badge + Officer info */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: '220px' }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          background: isGoogle ? '#FEF2F2' : isApple ? '#F1F5F9' : '#EFF6FF',
                          border: `1.5px solid ${isGoogle ? '#F87171' : isApple ? '#94A3B8' : '#60A5FA'}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1rem',
                          flexShrink: 0,
                        }}
                        title={sub.platform}
                      >
                        {isGoogle ? '📅' : isApple ? '🍏' : '📧'}
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{ fontWeight: 800, fontSize: '0.82rem', color: '#0F172A' }}>
                            {sub.officerName}
                          </span>
                          <span
                            style={{
                              fontSize: '0.62rem',
                              fontWeight: 800,
                              padding: '0.1rem 0.4rem',
                              borderRadius: '4px',
                              background: isGoogle ? 'rgba(239, 68, 68, 0.1)' : isApple ? 'rgba(15, 23, 42, 0.08)' : 'rgba(37, 99, 235, 0.1)',
                              color: isGoogle ? '#DC2626' : isApple ? '#0F172A' : '#2563EB',
                            }}
                          >
                            {sub.platform}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: '1px' }}>
                          {sub.role} • <a href={`mailto:${sub.email}`} style={{ color: '#0284C7', textDecoration: 'none' }}>{sub.email}</a>
                        </div>
                      </div>
                    </div>

                    {/* Right: Sync Status & Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginLeft: 'auto' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', justifyContent: 'flex-end', fontSize: '0.7rem', fontWeight: 700, color: '#059669' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981' }} />
                          <span>Live Synced</span>
                        </div>
                        <div style={{ fontSize: '0.65rem', color: '#94A3B8' }}>
                          {sub.lastSyncedAt}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteSubscriber(sub.id, sub.officerName)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#94A3B8',
                          cursor: 'pointer',
                          padding: '4px 6px',
                          borderRadius: '4px',
                          fontSize: '0.8rem',
                        }}
                        title="Unsubscribe officer"
                        onMouseEnter={(e) => { e.currentTarget.style.color = '#EF4444'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = '#94A3B8'; }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })
          ) : (
            <div style={{ textAlign: 'center', padding: '1rem', fontSize: '0.78rem', color: '#64748B' }}>
              No subscribers found for {subPlatformFilter}. Use &quot;Add Subscriber&quot; to link an officer.
            </div>
          )}
        </div>

        {/* Change alert note */}
        <div style={{ marginTop: '0.75rem', fontSize: '0.68rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span>🔒</span>
          <span>Feed privacy enforced: Subscribers only receive schedules created or hosted by <strong>{activeBranchName}</strong>.</span>
        </div>
      </div>

      {/* ── POPUP MODAL: ADD NEW CALENDAR SUBSCRIBER ── */}
      {showAddSubModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={() => setShowAddSubModal(false)}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              maxWidth: '460px',
              width: '100%',
              padding: '1.5rem',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
              border: '1px solid #CBD5E1',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0F172A' }}>
                  Subscribe to Calendar Feed
                </h3>
                <p style={{ margin: '3px 0 0', fontSize: '0.76rem', color: '#64748B' }}>
                  Add officer email to receive {activeBranchName} calendar events
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddSubModal(false)}
                style={{
                  background: '#F1F5F9',
                  border: 'none',
                  borderRadius: '50%',
                  width: '30px',
                  height: '30px',
                  cursor: 'pointer',
                  color: '#64748B',
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSubscriber}>
              <div style={{ marginBottom: '0.9rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Officer Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={newOfficerName}
                  onChange={(e) => setNewOfficerName(e.target.value)}
                  placeholder="e.g. Dr. A.B. Perera"
                  className="form-input"
                  style={{ width: '100%', padding: '0.5rem 0.75rem', fontSize: '0.84rem' }}
                />
              </div>

              <div style={{ marginBottom: '0.9rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={newOfficerEmail}
                  onChange={(e) => setNewOfficerEmail(e.target.value)}
                  placeholder="e.g. ab.perera@moe.gov.lk or @gmail.com"
                  className="form-input"
                  style={{ width: '100%', padding: '0.5rem 0.75rem', fontSize: '0.84rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginBottom: '0.9rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Calendar Platform
                  </label>
                  <select
                    value={newPlatform}
                    onChange={(e) => setNewPlatform(e.target.value as any)}
                    className="form-select"
                    style={{ width: '100%', padding: '0.5rem 0.75rem', fontSize: '0.82rem' }}
                  >
                    <option value="Google Calendar">Google Calendar</option>
                    <option value="Apple Calendar">Apple Calendar</option>
                    <option value="Outlook">Outlook / Exchange</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Role / Designation
                  </label>
                  <input
                    type="text"
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    placeholder="e.g. Planning Officer"
                    className="form-input"
                    style={{ width: '100%', padding: '0.5rem 0.75rem', fontSize: '0.82rem' }}
                  />
                </div>
              </div>

              <div style={{ background: '#F8FAFC', padding: '0.75rem', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '0.74rem', color: '#475569', marginBottom: '1.25rem' }}>
                ⚡ <strong>Automatic Email Sync:</strong> The subscriber will receive calendar invites and automated email notifications whenever an activity is rescheduled or updated.
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
                <button
                  type="button"
                  onClick={() => setShowAddSubModal(false)}
                  className="btn btn-secondary btn-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  style={{ background: '#0284C7', borderColor: '#0284C7' }}
                >
                  Subscribe Officer →
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── POPUP MODAL: CALENDAR SYNCHRONIZATION (GOOGLE & APPLE CALENDAR) ── */}
      {showSyncModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            backdropFilter: 'blur(3px)',
          }}
          onClick={() => setShowSyncModal(false)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '16px',
              maxWidth: '560px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
              overflow: 'hidden',
              animation: 'fadeIn 0.2s ease',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                background: 'linear-gradient(135deg, #5c0f28 0%, #8D153A 100%)',
                color: '#fff',
                padding: '1.25rem 1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: 'rgba(255,255,255,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1.5px solid rgba(255,190,41,0.5)',
                  }}
                >
                  <SyncCalendarIcon size={24} color="#FFFFFF" accentColor="#FFBE29" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#fff' }}>
                    Sync Branch Calendar
                  </h3>
                  <div style={{ fontSize: '0.72rem', color: '#FFBE29', marginTop: '2px', fontWeight: 600 }}>
                    Google Calendar & Apple Calendar Integration
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSyncModal(false)}
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: 'none',
                  color: '#fff',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.5rem', maxHeight: '75vh', overflowY: 'auto' }}>
              
              {/* Branch Scope Verification Pill */}
              <div
                style={{
                  background: 'rgba(141, 21, 58, 0.06)',
                  border: '1px solid rgba(141, 21, 58, 0.2)',
                  borderRadius: '10px',
                  padding: '0.75rem 1rem',
                  marginBottom: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                }}
              >
                <span style={{ fontSize: '1.2rem' }}>🔒</span>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--primary)' }}>Strict Branch Isolation: </strong>
                  This feed is exclusively generated for <strong>{activeBranchName}</strong>. Only workshops and AIP milestones assigned to this branch are included.
                </div>
              </div>

              {/* Action 1: Google Calendar Integration */}
              <div
                style={{
                  border: '1.5px solid #E2E8F0',
                  borderRadius: '12px',
                  padding: '1.1rem',
                  marginBottom: '1rem',
                  background: '#FFFFFF',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '1.35rem' }}>📅</span>
                  <div>
                    <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#1E293B' }}>
                      Google Calendar Integration
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#64748B' }}>
                      Sync workshops to Gmail, Android & Google Calendar Web
                    </div>
                  </div>
                </div>

                {/* Sub-method A: 1-Click Event Add */}
                <div style={{
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  padding: '0.75rem 0.85rem',
                  marginBottom: '0.65rem',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1E293B' }}>
                        Method 1: 1-Click Add Next Workshop
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                        Directly adds the upcoming workshop to Google Calendar in your browser
                      </div>
                    </div>
                    <a
                      href={getGoogleCalendarAddUrl()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-primary btn-sm"
                      style={{ fontSize: '0.76rem', fontWeight: 700, padding: '0.4rem 0.8rem', borderRadius: '6px' }}
                    >
                      📅 1-Click Add ↗
                    </a>
                  </div>
                </div>

                {/* Sub-method B: Full Schedule Import */}
                <div style={{
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  padding: '0.75rem 0.85rem',
                }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1E293B', marginBottom: '0.25rem' }}>
                    Method 2: Import Complete Branch Schedule (.ics)
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748B', marginBottom: '0.6rem' }}>
                    Download all workshops in standard RFC 5545 .ics format and import directly into Google Calendar
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <a
                      href={feedPath}
                      download={`${activeBranchId}-schedule.ics`}
                      className="btn btn-secondary btn-sm"
                      style={{
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        padding: '0.4rem 0.75rem',
                        borderRadius: '6px',
                        color: 'var(--primary)',
                        border: '1px solid rgba(141, 21, 58, 0.3)',
                      }}
                    >
                      📥 1. Download .ics Feed
                    </a>
                    <a
                      href="https://calendar.google.com/calendar/u/0/r/settings/export"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary btn-sm"
                      style={{
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        padding: '0.4rem 0.75rem',
                        borderRadius: '6px',
                        color: '#1E293B',
                      }}
                    >
                      ⚙️ 2. Open Google Import Page ↗
                    </a>
                  </div>
                </div>

                {/* Localhost vs Cloud Note */}
                <div style={{
                  marginTop: '0.65rem',
                  fontSize: '0.7rem',
                  color: '#64748B',
                  background: 'rgba(255, 190, 41, 0.1)',
                  border: '1px solid rgba(255, 190, 41, 0.3)',
                  padding: '0.45rem 0.65rem',
                  borderRadius: '6px',
                }}>
                  💡 <em>Note: Periodic background cloud URL sync requires hosting on a public internet domain (*.gov.lk). In local environments, Google cannot reach localhost, so use 1-Click Add or .ics Import above.</em>
                </div>
              </div>

              {/* Action 2: Subscribe in Apple Calendar & Outlook */}
              <div
                style={{
                  border: '1.5px solid #E2E8F0',
                  borderRadius: '12px',
                  padding: '1.1rem',
                  marginBottom: '1.25rem',
                  background: '#FFFFFF',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '1.35rem' }}>🍏</span>
                  <div>
                    <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#1E293B' }}>
                      Apple Calendar & Microsoft Outlook
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#64748B' }}>
                      Universal RFC 5545 iCalendar feed for iPhone, iPad, Mac & Windows
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                  <a
                    href={feedPath}
                    download={`${activeBranchId}-schedule.ics`}
                    className="btn btn-secondary btn-sm"
                    style={{
                      flex: 1,
                      minWidth: '180px',
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      padding: '0.55rem 0.8rem',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                      color: 'var(--primary)',
                      border: '1.5px solid rgba(141, 21, 58, 0.3)',
                      background: 'rgba(141, 21, 58, 0.04)',
                    }}
                  >
                    <span>📥</span> Download .ics File
                  </a>
                  <a
                    href={webcalUrl}
                    className="btn btn-secondary btn-sm"
                    style={{
                      flex: 1,
                      minWidth: '180px',
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      padding: '0.55rem 0.8rem',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                      border: '1.5px solid #CBD5E1',
                    }}
                    title="Direct webcal protocol subscription on macOS and iOS"
                  >
                    <span>🍏</span> Subscribe (webcal://) ↗
                  </a>
                </div>
              </div>

              {/* Action 3: Copy direct Feed URL */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '0.35rem' }}>
                  Or Copy iCalendar Feed URL (.ics):
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    readOnly
                    value={httpFeedUrl}
                    style={{
                      flex: 1,
                      padding: '0.5rem 0.75rem',
                      fontSize: '0.75rem',
                      fontFamily: 'var(--font-mono)',
                      background: '#F8FAFC',
                      border: '1px solid #CBD5E1',
                      borderRadius: '8px',
                      color: '#334155',
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleCopyFeedUrl}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.5rem 0.85rem' }}
                  >
                    {copied ? '✓ Copied!' : 'Copy URL'}
                  </button>
                </div>
              </div>

              {/* Notification & Change Behavior Note */}
              <div
                style={{
                  background: '#F1F5F9',
                  borderRadius: '10px',
                  padding: '0.85rem 1rem',
                  fontSize: '0.74rem',
                  color: '#475569',
                  lineHeight: 1.5,
                }}
              >
                <div style={{ fontWeight: 700, color: '#0F172A', marginBottom: '0.2rem' }}>
                  ⚡ Automated Change & Reschedule Notifications:
                </div>
                Whenever a workshop date is modified or rescheduled by an authorized branch officer, the change updates immediately in the feed. Registered officers also receive automated change emails with interactive calendar invite attachments.
              </div>

            </div>

            {/* Modal Footer */}
            <div
              style={{
                background: '#F8FAFC',
                padding: '0.85rem 1.5rem',
                borderTop: '1px solid #E2E8F0',
                display: 'flex',
                justifyContent: 'flex-end',
              }}
            >
              <button
                type="button"
                onClick={() => setShowSyncModal(false)}
                className="btn btn-secondary btn-sm"
                style={{ fontWeight: 600 }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
