'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import AppShell from '@/components/layout/AppShell';
import DashboardCalendar from '@/components/dashboard/DashboardCalendar';
import RegionalMap, { ProvinceData } from '@/components/dashboard/RegionalMap';
import PerformanceMonitoringChart from '@/components/dashboard/PerformanceMonitoringChart';
import CompactCalendarCard from '@/components/dashboard/CompactCalendarCard';
import AutoImplementationTimeline from '@/components/dashboard/AutoImplementationTimeline';
import ProgressMonitoringCurve from '@/components/dashboard/ProgressMonitoringCurve';
import ManagementSummaryKpis from '@/components/dashboard/ManagementSummaryKpis';
import BranchBadge, { getBranchAbbreviation } from '@/components/common/BranchBadge';
import { computeWorkshopStatus } from '@/lib/workshopStatus';
import { broadcastDataChange, subscribeToDataChanges } from '@/lib/broadcastSync';

// Client-side quick memory cache for instant tab/page transitions
interface DashboardMemoryCache {
  workshops?: any[];
  places?: any[];
  notifications?: any[];
  resourcePersons?: any[];
  announcements?: any[];
  deadlines?: any[];
  monitoringData?: any;
  budgetData?: any;
  showProgressMeter?: boolean;
}

let globalDashboardCache: DashboardMemoryCache | null = null;

export default function DashboardPage() {
  const { data: session } = useSession();
  const [workshops, setWorkshops] = useState<any[]>(() => globalDashboardCache?.workshops || []);
  const [places, setPlaces] = useState<any[]>(() => globalDashboardCache?.places || []);
  const [resourcePersons, setResourcePersons] = useState<any[]>(() => globalDashboardCache?.resourcePersons || []);
  const [notifications, setNotifications] = useState<any[]>(() => globalDashboardCache?.notifications || []);
  const [announcements, setAnnouncements] = useState<any[]>(() => globalDashboardCache?.announcements || []);
  const [deadlines, setDeadlines] = useState<any[]>(() => globalDashboardCache?.deadlines || []);
  const [monitoringData, setMonitoringData] = useState<any>(() => globalDashboardCache?.monitoringData || null);
  const [budgetData, setBudgetData] = useState<any>(() => globalDashboardCache?.budgetData || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(() => !globalDashboardCache?.workshops);
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline-kpis' | 'calendar' | 'workshops'>('overview');
  const [operationalDeckTab, setOperationalDeckTab] = useState<'announcements' | 'recommendations' | 'monitoring'>('announcements');

  // Multi-tier administrative and financial filters
  const [selectedYear, setSelectedYear] = useState('2026');
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [selectedProvince, setSelectedProvince] = useState('all');
  const [selectedBranch, setSelectedBranch] = useState('all');

  const handleSelectProvince = (prov: any) => {
    if (prov?.name) {
      setSelectedProvince(prov.name);
    }
  };

  const handleResetFilters = () => {
    setSelectedYear('2026');
    setSelectedLevel('all');
    setSelectedProvince('all');
    setSelectedBranch('all');
  };

  // Real-Time Progress Meter State (Controlled by Super Admin)
  const [showProgressMeter, setShowProgressMeter] = useState<boolean>(() => 
    typeof globalDashboardCache?.showProgressMeter === 'boolean' ? globalDashboardCache.showProgressMeter : true
  );
  const [meterSettingsLoading, setMeterSettingsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Live Telemetry & Progress Data from Unified Telemetry Engine
  const [telemetryData, setTelemetryData] = useState<any>(null);

  // Live Updating Engine State: Tracking Real-Time Background Synchronization
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());

  // Data-driven Last Updated Time (user organization / planning data)
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string>('14 Nov 2026, 01:00 AM SLST');

  const user = session?.user as any;
  const isSuperAdmin = Boolean(
    user?.isSuperAdmin ||
    user?.adminLevel === 0 ||
    user?.username === 'superadmin' ||
    user?.roleName === 'Super Administrator' ||
    user?.roleId === 'role-superadmin'
  );

  // Full Live Dashboard Synchronizer
  const loadDashboard = useCallback(async (isBackground = false) => {
    if (isBackground) {
      setIsSyncing(true);
    } else if (!globalDashboardCache?.workshops) {
      setLoading(true);
    }

    try {
      const [wsRes, orgRes, notifRes, rpRes, annRes, dlRes, monRes, budRes, setRes, telRes, lastUpRes] = await Promise.all([
        fetch('/api/workshops'),
        fetch('/api/organizations'),
        fetch('/api/notifications'),
        fetch('/api/resource-persons'),
        fetch('/api/admin/announcements'),
        fetch('/api/admin/deadlines'),
        fetch('/api/monitoring').catch(() => null),
        fetch('/api/planning/budget').catch(() => null),
        fetch('/api/admin/settings').catch(() => null),
        fetch('/api/system/telemetry').catch(() => null),
        fetch('/api/system/last-updated').catch(() => null),
      ]);

      if (lastUpRes?.ok) {
        const upJson = await lastUpRes.json();
        if (upJson?.lastUpdated) {
          setLastUpdatedTime(upJson.lastUpdated);
        }
      }

      if (telRes?.ok) {
        const telJson = await telRes.json();
        setTelemetryData(telJson);
      }

      const newCache: DashboardMemoryCache = { ...globalDashboardCache };

      if (setRes?.ok) {
        const setJson = await setRes.json();
        if (typeof setJson.showDashboardProgressMeter === 'boolean') {
          setShowProgressMeter(setJson.showDashboardProgressMeter);
          newCache.showProgressMeter = setJson.showDashboardProgressMeter;
        }
      }

      if (wsRes.ok) {
        const wsJson = await wsRes.json();
        const wsList = wsJson.workshops || [];
        setWorkshops(wsList);
        newCache.workshops = wsList;
      }

      if (orgRes.ok) {
        const orgJson = await orgRes.json();
        const orgList = orgJson.places || [];
        setPlaces(orgList);
        newCache.places = orgList;
      }

      if (notifRes.ok) {
        const notifJson = await notifRes.json();
        const notifList = notifJson.notifications || [];
        setNotifications(notifList);
        newCache.notifications = notifList;
      }

      if (rpRes.ok) {
        const rpJson = await rpRes.json();
        const rpList = rpJson.resourcePersons || [];
        setResourcePersons(rpList);
        newCache.resourcePersons = rpList;
      }

      if (annRes?.ok) {
        const annJson = await annRes.json();
        const annList = annJson.announcements || [];
        setAnnouncements(annList);
        newCache.announcements = annList;
      }

      if (dlRes?.ok) {
        const dlJson = await dlRes.json();
        const dlList = dlJson.deadlines || [];
        setDeadlines(dlList);
        newCache.deadlines = dlList;
      }

      if (monRes?.ok) {
        const monJson = await monRes.json();
        setMonitoringData(monJson);
        newCache.monitoringData = monJson;
      }

      if (budRes?.ok) {
        const budJson = await budRes.json();
        setBudgetData(budJson);
        newCache.budgetData = budJson;
      }

      globalDashboardCache = newCache;
      setLastSyncTime(new Date());
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setLoading(false);
      setIsSyncing(false);
    }
  }, []);

  // Multi-tier Live Updating: Periodic polling, Tab Visibility, Window Focus & Cross-Tab Broadcasts
  useEffect(() => {
    // 1. Initial Load
    loadDashboard(false);

    // 2. High-Frequency Live Telemetry Polling (every 12 seconds in background)
    const pollTimer = setInterval(() => {
      loadDashboard(true);
    }, 12000);

    // 3. Tab Visibility & Window Focus Event Listener (instant refresh when returning to tab)
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        loadDashboard(true);
      }
    };
    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    // 4. Cross-Tab Live Broadcast Synchronization (reacts immediately to actions in other tabs)
    const unsubscribe = subscribeToDataChanges(() => {
      loadDashboard(true);
    });

    return () => {
      clearInterval(pollTimer);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      unsubscribe();
    };
  }, [loadDashboard]);

  const handleToggleProgressMeter = useCallback(async (newVal: boolean) => {
    try {
      setMeterSettingsLoading(true);
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ showDashboardProgressMeter: newVal }),
      });
      if (res.ok) {
        setShowProgressMeter(newVal);
        if (globalDashboardCache) {
          globalDashboardCache.showProgressMeter = newVal;
        }
        broadcastDataChange('SETTINGS_UPDATED');
        setToastMessage(
          newVal
            ? '✓ Real-Time Progress Meter is now VISIBLE to all officers.'
            : '🔒 Real-Time Progress Meter is now HIDDEN from standard officers.'
        );
        setTimeout(() => setToastMessage(null), 4000);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to update progress meter setting');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update progress meter setting');
    } finally {
      setMeterSettingsLoading(false);
    }
  }, []);

  const handleStatusChange = useCallback(async (workshopId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/workshops/${workshopId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        broadcastDataChange('WORKSHOP_STATUS', workshopId);
        loadDashboard(true);
      }
    } catch (err) {
      console.error('Failed to update workshop status:', err);
    }
  }, [loadDashboard]);

  // 1. Total Workshops Breakdown (Completed vs Pending) - Memoized
  const { totalWorkshops, completedWorkshops, pendingWorkshops } = useMemo(() => {
    const total = workshops.length;
    const completed = workshops.filter((w) => computeWorkshopStatus(w).status === 'Completed').length;
    return {
      totalWorkshops: total,
      completedWorkshops: completed,
      pendingWorkshops: Math.max(0, total - completed),
    };
  }, [workshops]);

  // 2. Total Participants / Trainees Breakdown - Memoized
  const { totalTrainees, completedTrainees, pendingTrainees } = useMemo(() => {
    const total = workshops.reduce((sum, w) => sum + (w.traineeCount || 0), 0);
    const completed = workshops
      .filter((w) => computeWorkshopStatus(w).status === 'Completed')
      .reduce((sum, w) => sum + (w.traineeCount || 0), 0);
    return {
      totalTrainees: total,
      completedTrainees: completed,
      pendingTrainees: Math.max(0, total - completed),
    };
  }, [workshops]);

  // 3. Resource Persons - Memoized
  const totalResourcePersons = useMemo(() => {
    return resourcePersons.length > 0
      ? resourcePersons.length
      : workshops.reduce((sum, w) => sum + (w.resourcePersonCount || 0), 0);
  }, [resourcePersons, workshops]);

  // 4. Executive Metrics Matching the Reference Screenshot Exactly - Memoized
  const activePlansCount = useMemo(() => {
    return (budgetData?.proposals?.length || 0) + (monitoringData?.activities?.length || 0) + workshops.length || 128;
  }, [budgetData, monitoringData, workshops.length]);

  const monitoringAlertsCount = monitoringData?.openObservationsCount || 7;
  const pendingReviewCount = 3;
  const resolvedAlertsCount = 4;

  const budgetUtilisationRate = useMemo(() => {
    return budgetData?.summary?.utilisationRate || monitoringData?.budgetUtilisationRate || 76;
  }, [budgetData, monitoringData]);

  const totalAllocatedMn = budgetData?.summary?.totalAllocatedMn || 3200;
  const totalExpenditureMn = budgetData?.summary?.totalExpenditureMn || 2432;

  // 5. Universal Search filtering across all workshop fields
  const filteredWorkshops = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return workshops;

    return workshops.filter((ws) => {
      const statusObj = computeWorkshopStatus(ws);
      const num = (ws.workshopNumber || '').toLowerCase();
      const title = (ws.title || '').toLowerCase();
      const status = (statusObj.status || '').toLowerCase();
      const statusName = (ws.statusName || '').toLowerCase();
      const subject = (ws.subject || '').toLowerCase();
      const place = (ws.placeName || ws.targetOrgName || '').toLowerCase();
      const branch = (ws.branch || ws.organizingOrgName || '').toLowerCase();
      const year = String(ws.year || '').toLowerCase();
      const dates = `${ws.startDate || ''} ${ws.endDate || ''}`.toLowerCase();
      const aim = (ws.aim || ws.objective || '').toLowerCase();

      return (
        num.includes(q) ||
        title.includes(q) ||
        status.includes(q) ||
        statusName.includes(q) ||
        subject.includes(q) ||
        place.includes(q) ||
        branch.includes(q) ||
        year.includes(q) ||
        dates.includes(q) ||
        aim.includes(q)
      );
    });
  }, [workshops, searchQuery]);

  // Upcoming workshops glance for overview tab
  const upcomingWorkshops = useMemo(() => {
    const nonCompleted = workshops.filter((w) => computeWorkshopStatus(w).status !== 'Completed');
    return (nonCompleted.length > 0 ? nonCompleted : workshops).slice(0, 3);
  }, [workshops]);

  const getGoogleCalendarAddUrl = useCallback((ws: any) => {
    if (!ws) return 'https://calendar.google.com';
    const title = encodeURIComponent(`[${ws.workshopNumber || ws.year || 'WS'}] ${ws.title || 'MoE Workshop'}`);
    const startStr = (ws.startDate || '').replace(/-/g, '').slice(0, 8);
    let endStr = startStr;
    const lastDateStr = ws.endDate || ws.startDate;
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
      `Ministry of Education • Sri Lanka\nIntegrated Planning & Monitoring Information System (IPMIS)\n\n` +
      `Workshop: ${ws.title || ''}\n` +
      `Workshop No: ${ws.workshopNumber || ''}\n` +
      `Organizing Branch: ${ws.branch || 'Ministry of Education'}\n` +
      `Venue: ${ws.venue || ws.placeName || 'Assigned Venue'}\n` +
      `Duration: ${ws.daysHeld || 1} day(s)\n` +
      `Aim: ${ws.aim || 'Annual Implementation Plan Workshop'}`
    );
    const location = encodeURIComponent(ws.venue || ws.placeName || 'Ministry of Education, Sri Lanka');
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startStr}/${endStr}&details=${details}&location=${location}`;
  }, []);

  return (
    <AppShell hideHeader hideFooter>
      <div style={{ maxWidth: '1480px', margin: '0 auto', padding: '0.85rem 1.25rem 2rem' }}>
        
        {/* ══════════════════════════════════════════════════════
            1. EXECUTIVE TOP GOVERNMENT BANNER
            Clean Executive Header matching user mockup
           ══════════════════════════════════════════════════════ */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '0.85rem',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          {/* Left: IPMIS & Subtitle */}
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: '1.65rem',
                fontWeight: 900,
                color: '#1E293B',
                letterSpacing: '-0.03em',
                lineHeight: 1.1,
              }}
            >
              IPMIS
            </h1>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748B', marginTop: '2px' }}>
              Integrated Planning & Monitoring Information System
            </div>
          </div>

          {/* Right: Role Pill, Live Sync, Bell with badge 3, Avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            {/* Current Role Capsule */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: '#64748B' }}>
              <span>Current Role:</span>
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('OPEN_ROLE_SWITCHER'))}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '9999px',
                  padding: '0.35rem 0.85rem',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#1E293B',
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}
                title="Click to switch active role"
              >
                <span>👤</span>
                <span>{user?.roleName || user?.organizationName || 'MOE Data Management Branch'}</span>
                <span style={{ fontSize: '0.65rem', opacity: 0.7 }}>▾</span>
              </button>
            </div>

            {/* Live Sync Pill */}
            <button
              type="button"
              onClick={() => loadDashboard(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                background: '#E8F5E9',
                border: '1px solid #C8E6C9',
                borderRadius: '9999px',
                padding: '0.35rem 0.85rem',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#2E7D32',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
              }}
              title="Real-Time Database Sync Active. Click to refresh."
            >
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: '#10B981',
                  display: 'inline-block',
                  animation: isSyncing ? 'spin 1s linear infinite' : 'pulse 2s infinite',
                }}
              />
              <span>{isSyncing ? 'Syncing...' : 'Live Sync'}</span>
            </button>

            {/* Notification Bell with Badge 3 */}
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                cursor: 'pointer',
              }}
              title="Notifications (3 unread)"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <span
                style={{
                  position: 'absolute',
                  top: '-2px',
                  right: '-2px',
                  background: '#EF4444',
                  color: '#FFFFFF',
                  fontSize: '0.62rem',
                  fontWeight: 800,
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid #FAF5F2',
                }}
              >
                3
              </span>
            </div>

            {/* User Profile Avatar with Coral/Red Border */}
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                border: '2px solid #E11D48',
                overflow: 'hidden',
                background: '#FFE4E6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(225, 29, 72, 0.2)',
              }}
            >
              <img
                src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face"
                alt="User Avatar"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                }}
              />
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════
            2. HIGHLIGHT METRICS ROW (4 Cards)
            Last Updated (Maroon) | Activities | Plan Progress | FY 2026
           ══════════════════════════════════════════════════════ */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
            gap: '0.75rem',
            marginBottom: '0.85rem',
          }}
        >
          {/* Card 1: Last Updated (Deep Maroon Card) */}
          <div
            style={{
              background: 'linear-gradient(135deg, #7B112A 0%, #600B20 100%)',
              borderRadius: '14px',
              padding: '0.75rem 1rem',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              boxShadow: '0 4px 14px rgba(123, 17, 42, 0.25)',
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: '0.68rem', color: '#FBCFE8', fontWeight: 600 }}>Last Updated</div>
              <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#FFFFFF', marginTop: '2px', letterSpacing: '-0.01em' }}>
                20 Nov 2026, 09:13 AM SLST
              </div>
            </div>
          </div>

          {/* Card 2: 241 Activities + Red Sparkline */}
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '14px',
              border: '1px solid #F0E5DF',
              padding: '0.75rem 1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: '#FEE2E2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: '1.12rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
                  {telemetryData?.metrics?.totalActivities || 241} Activities
                </div>
                <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#16A34A', marginTop: '2px' }}>
                  ↑ 74% vs last period
                </div>
              </div>
            </div>
            {/* Red Sparkline */}
            <svg width="68" height="28" viewBox="0 0 68 28" fill="none">
              <path d="M2 24 C14 22, 22 10, 34 16 C44 22, 54 4, 66 6" stroke="#DC2626" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </div>

          {/* Card 3: 28% Plan Progress + Green Sparkline */}
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '14px',
              border: '1px solid #F0E5DF',
              padding: '0.75rem 1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: '#DCFCE7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="6" />
                  <circle cx="12" cy="2" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: '1.12rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
                  {telemetryData?.metrics?.budgetUtilizationRate || 28}% Plan Progress
                </div>
                <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#16A34A', marginTop: '2px' }}>
                  ↑ 8% vs last month
                </div>
              </div>
            </div>
            {/* Green Sparkline */}
            <svg width="68" height="28" viewBox="0 0 68 28" fill="none">
              <path d="M2 22 C14 20, 24 16, 36 10 C46 6, 56 12, 66 4" stroke="#16A34A" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </div>

          {/* Card 4: FY 2026 (Active) ▾ */}
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '14px',
              border: '1px solid #F0E5DF',
              padding: '0.75rem 1.15rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: '#FEE2E2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                style={{
                  width: '100%',
                  fontSize: '0.92rem',
                  fontWeight: 800,
                  color: '#0F172A',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="2026">FY 2026 (Active)</option>
                <option value="2025">FY 2025 (Previous)</option>
                <option value="2027">FY 2027 (MTEF Horizon)</option>
              </select>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════
            3. GLOBAL ADMINISTRATIVE CONTROLS & SEGMENTED VIEW TABS
           ══════════════════════════════════════════════════════ */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '0.85rem',
            flexWrap: 'wrap',
            gap: '0.65rem',
          }}
        >
          {/* Left: Global Multi-Tier Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#FFFFFF',
                background: '#7B112A',
                padding: '0.35rem 0.95rem',
                borderRadius: '9999px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                boxShadow: '0 1px 3px rgba(123, 17, 42, 0.25)',
              }}
            >
              <span style={{ fontSize: '0.7rem' }}>🔻</span> Filters
            </span>

            {/* Administrative Level Filter */}
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                padding: '0.35rem 0.85rem',
                borderRadius: '9999px',
                border: '1px solid #E2E8F0',
                background: '#FFFFFF',
                color: '#1E293B',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
              }}
              title="Administrative Monitoring Tier"
            >
              <option value="all">All Admin Tiers ▾</option>
              <option value="level-1">Level 1: National MoE</option>
              <option value="level-2">Level 2: 9 Provincial Depts</option>
              <option value="level-3">Level 3: 100 Education Zones</option>
              <option value="level-4">Level 4: 10,150+ Schools</option>
            </select>

            {/* Province Filter */}
            <select
              value={selectedProvince}
              onChange={(e) => setSelectedProvince(e.target.value)}
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                padding: '0.35rem 0.85rem',
                borderRadius: '9999px',
                border: '1px solid #E2E8F0',
                background: '#FFFFFF',
                color: '#1E293B',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
              }}
              title="Filter by Province"
            >
              <option value="all">All 9 Provinces ▾</option>
              <option value="Western">Western Province</option>
              <option value="Central">Central Province</option>
              <option value="Southern">Southern Province</option>
              <option value="Northern">Northern Province</option>
              <option value="Eastern">Eastern Province</option>
              <option value="North Western">North Western</option>
              <option value="North Central">North Central</option>
              <option value="Uva">Uva Province</option>
              <option value="Sabaragamuwa">Sabaragamuwa</option>
            </select>

            {/* Division Filter */}
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                padding: '0.35rem 0.85rem',
                borderRadius: '9999px',
                border: '1px solid #E2E8F0',
                background: '#FFFFFF',
                color: '#1E293B',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
              }}
              title="Implementing Division / Branch"
            >
              <option value="all">All Implementing Divisions ▾</option>
              <option value="org-moe-planning">Planning Branch</option>
              <option value="org-moe-ict">ICT & Digital Education</option>
              <option value="org-moe-data">Data Management Branch</option>
              <option value="org-moe-infra">School Infrastructure Division</option>
              <option value="org-moe-teacher">Teacher Education Branch</option>
              <option value="org-moe-reforms">Education Reforms Division</option>
            </select>

            {(selectedLevel !== 'all' || selectedProvince !== 'all' || selectedBranch !== 'all') && (
              <button
                type="button"
                onClick={handleResetFilters}
                style={{
                  border: '1px solid #EF4444',
                  background: '#FEE2E2',
                  color: '#DC2626',
                  borderRadius: '9999px',
                  padding: '0.3rem 0.65rem',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Reset
              </button>
            )}
          </div>

          {/* Right: Modern Segmented Tab Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              style={{
                border: 'none',
                background: activeTab === 'overview' ? '#7B112A' : 'transparent',
                color: activeTab === 'overview' ? '#FFFFFF' : '#475569',
                boxShadow: activeTab === 'overview' ? '0 1px 3px rgba(123, 17, 42, 0.25)' : 'none',
                borderRadius: '9999px',
                padding: '0.35rem 0.95rem',
                fontSize: '0.75rem',
                fontWeight: activeTab === 'overview' ? 800 : 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.15s ease',
              }}
            >
              <span>📊</span> Executive Overview
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('timeline-kpis')}
              style={{
                border: 'none',
                background: activeTab === 'timeline-kpis' ? '#7B112A' : 'transparent',
                color: activeTab === 'timeline-kpis' ? '#FFFFFF' : '#475569',
                boxShadow: activeTab === 'timeline-kpis' ? '0 1px 3px rgba(123, 17, 42, 0.25)' : 'none',
                borderRadius: '9999px',
                padding: '0.35rem 0.85rem',
                fontSize: '0.75rem',
                fontWeight: activeTab === 'timeline-kpis' ? 800 : 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.15s ease',
              }}
            >
              <span>📈</span> Timeline & KPIs
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('calendar')}
              style={{
                border: 'none',
                background: activeTab === 'calendar' ? '#7B112A' : 'transparent',
                color: activeTab === 'calendar' ? '#FFFFFF' : '#475569',
                boxShadow: activeTab === 'calendar' ? '0 1px 3px rgba(123, 17, 42, 0.25)' : 'none',
                borderRadius: '9999px',
                padding: '0.35rem 0.85rem',
                fontSize: '0.75rem',
                fontWeight: activeTab === 'calendar' ? 800 : 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.15s ease',
              }}
            >
              <span>📅</span> Calendar
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('workshops')}
              style={{
                border: 'none',
                background: activeTab === 'workshops' ? '#7B112A' : 'transparent',
                color: activeTab === 'workshops' ? '#FFFFFF' : '#475569',
                boxShadow: activeTab === 'workshops' ? '0 1px 3px rgba(123, 17, 42, 0.25)' : 'none',
                borderRadius: '9999px',
                padding: '0.35rem 0.85rem',
                fontSize: '0.75rem',
                fontWeight: activeTab === 'workshops' ? 800 : 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.15s ease',
              }}
            >
              Workshops Directory ({workshops.length})
            </button>
          </div>
        </div>

        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {/* ══════════════════════════════════════════════════════════════
                ROW 1: TOP THREE EXECUTIVE TILES
                Col 1: Achievement Curves | Col 2: Admin Map | Col 3: Calendar
               ══════════════════════════════════════════════════════════════ */}
            <div className="gov-top-3col">
              {/* Tile 1 – Physical & Financial Achievement Curves (relevant to branch) */}
              <PerformanceMonitoringChart
                branchName={user?.organizationName || 'MOE Data Management Branch'}
                monthlyData={telemetryData?.monthlyProgress}
                metrics={telemetryData?.metrics}
              />

              {/* Tile 2 – Administrative Coverage Map */}
              <RegionalMap
                workshops={workshops}
                provincesData={telemetryData?.provinces}
                onSelectProvince={handleSelectProvince}
              />

              {/* Tile 3 – Calendar View */}
              <CompactCalendarCard
                workshops={workshops}
                deadlines={deadlines}
                activities={telemetryData?.timelineActivities}
              />
            </div>

            {/* ══════════════════════════════════════════════════════════════
                ROW 2: SECOND SET OF THREE MANAGEMENT TILES
                Tile 01: Timeline | Tile 02: Performance Curve | Tile 03: KPIs
                (Clean, seamless transition matching user mockup without divider)
               ══════════════════════════════════════════════════════════════ */}
            <div className="gov-main-3col">
              {/* Tile 01 – Auto-Generated Implementation Timeline (Left) */}
              <AutoImplementationTimeline
                activities={telemetryData?.timelineActivities}
                fiscalYear={selectedYear}
                filterDivision={selectedBranch}
                filterStatus="all"
              />

              {/* Tile 02 – Progress Monitoring and Performance Curve (Middle) */}
              <ProgressMonitoringCurve
                monthlyData={telemetryData?.monthlyProgress}
                physicalAchievementRate={telemetryData?.metrics?.physicalAchievementRate}
                budgetUtilizationRate={telemetryData?.metrics?.budgetUtilizationRate}
                nationalExecutionRate={telemetryData?.metrics?.nationalExecutionRate}
              />

              {/* Tile 03 – Management Summary and Key Performance Indicators (Right) */}
              <ManagementSummaryKpis
                kpis={telemetryData?.kpiGroups}
              />
            </div>
          </div>
        )}

        {/* TAB: TIMELINE & MANAGEMENT KPIS (Direct View) */}
        {activeTab === 'timeline-kpis' && (
          <div className="gov-main-3col" style={{ marginTop: '0.5rem' }}>
            <AutoImplementationTimeline
              activities={telemetryData?.timelineActivities}
              fiscalYear={selectedYear}
              filterDivision={selectedBranch}
              filterStatus="all"
            />
            <ProgressMonitoringCurve
              monthlyData={telemetryData?.monthlyProgress}
              physicalAchievementRate={telemetryData?.metrics?.physicalAchievementRate}
              budgetUtilizationRate={telemetryData?.metrics?.budgetUtilizationRate}
              nationalExecutionRate={telemetryData?.metrics?.nationalExecutionRate}
            />
            <ManagementSummaryKpis
              kpis={telemetryData?.kpiGroups}
            />
          </div>
        )}

        {activeTab === 'calendar' && (
          <div style={{ marginTop: '0.5rem' }}>
            <DashboardCalendar
              workshops={workshops}
              onStatusChange={handleStatusChange}
              loading={loading}
              branchId={user?.organizationId || 'org-moe-ict'}
              branchName={user?.organizationName || user?.name || 'MOE ICT Branch'}
            />
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            6. TAB: WORKSHOPS DIRECTORY & UNIVERSAL SEARCH
            (Complete database listing with real-time status management)
           ══════════════════════════════════════════════════════ */}
        {activeTab === 'workshops' && (
          <div className="card" style={{ border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-lg)' }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 className="card-title" style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  Scheduled workshops.
                </h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '3px', marginBottom: 0 }}>
                  Workshops dispatched across organizing branches and target venues
                </p>
              </div>
              <Link href="/workshops" className="btn btn-secondary btn-sm" style={{ fontWeight: 600 }}>
                Open Dedicated Directory →
              </Link>
            </div>

            {/* Universal Search Bar */}
            <div
              style={{
                padding: '0.85rem 1.25rem',
                background: 'var(--gray-100)',
                borderTop: '1px solid var(--border-light)',
                borderBottom: '1px solid var(--border-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem',
              }}
            >
              <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
                <span
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: '0.95rem',
                    color: 'var(--text-tertiary)',
                    pointerEvents: 'none',
                  }}
                >
                  🔍
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Universal Search: ID, title, status, subject, host branch, year..."
                  className="form-input"
                  style={{
                    width: '100%',
                    paddingLeft: '2.4rem',
                    paddingRight: searchQuery ? '2.4rem' : '0.85rem',
                    fontSize: '0.84rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-medium)',
                    background: 'var(--white)',
                    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.03)',
                  }}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-tertiary)',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      padding: '2px 6px',
                      borderRadius: '50%',
                    }}
                    title="Clear search"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Showing <strong>{filteredWorkshops.length}</strong> of {workshops.length} workshops
                </span>
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: '0.74rem', padding: '0.2rem 0.5rem', color: 'var(--primary)', fontWeight: 600 }}
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            {/* Workshops Table */}
            <div className="table-responsive">
              <table className="table" style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th style={{ width: '130px' }}>Workshop ID</th>
                    <th>Workshop Title & Scope</th>
                    <th style={{ width: '130px' }}>Schedule</th>
                    <th style={{ width: '140px' }}>Status</th>
                    <th style={{ width: '160px' }}>Target Place</th>
                    <th style={{ width: '100px', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWorkshops.length > 0 ? (
                    filteredWorkshops.slice(0, 15).map((ws) => {
                      const statusObj = computeWorkshopStatus(ws);
                      return (
                        <tr key={ws.id}>
                          <td>
                            <span style={{ fontWeight: 800, color: 'var(--primary)', fontFamily: 'monospace', fontSize: '0.84rem' }}>
                              {ws.workshopNumber || ws.id.slice(0, 8)}
                            </span>
                          </td>
                          <td>
                            <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.88rem' }}>
                              {ws.title}
                            </div>
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                              <span style={{ color: 'var(--text-tertiary)' }}>Branch:</span>
                              <BranchBadge name={ws.organizingOrgName || ws.branch || 'MOE Branch'} size="xs" />
                              <span style={{ color: 'var(--text-tertiary)' }}>• Trainees: {ws.traineeCount || 0}</span>
                            </div>
                          </td>
                          <td>
                            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                              {ws.startDate}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                              to {ws.endDate}
                            </div>
                          </td>
                          <td>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                padding: '0.2rem 0.6rem',
                                borderRadius: '12px',
                                fontSize: '0.74rem',
                                fontWeight: 700,
                                background: statusObj.status === 'Completed' ? '#D1FAE5' : statusObj.status === 'In Progress' ? '#E0F2FE' : '#FEF3C7',
                                color: statusObj.status === 'Completed' ? '#065F46' : statusObj.status === 'In Progress' ? '#075985' : '#92400E',
                              }}
                            >
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor' }} />
                              {statusObj.status}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                              {ws.placeName || ws.targetOrgName || 'National Center'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <Link href={`/workshops/${ws.id}`} className="btn btn-secondary btn-sm" style={{ fontWeight: 600 }}>
                              Manage →
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-tertiary)' }}>
                        No workshops found matching search criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}



        {/* ══════════════════════════════════════════════════════
            8. BOTTOM TELEMETRY STATUS BAR
            Matching the Reference Image Footer Exactly
           ══════════════════════════════════════════════════════ */}
        {activeTab !== 'overview' && (
        <div className="gov-dashboard-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', display: 'inline-block', boxShadow: '0 0 6px #10B981' }}></span>
            <span><strong>LAST UPDATED: {lastUpdatedTime}</strong></span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span className="gov-footer-badge" style={{ background: '#D1FAE5', color: '#065F46' }}>
              <span>✓</span>
              <span>System Status: Operational</span>
            </span>

            <span className="gov-footer-badge" style={{ background: '#E0F2FE', color: '#0369A1' }}>
              <span>🔄</span>
              <span>Data Synced</span>
            </span>

            <span style={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 600 }}>
              Version 2.4.0 • MoE Core
            </span>
          </div>
        </div>
        )}

        {/* Super Admin Toast Notification */}
        {toastMessage && (
          <div
            style={{
              position: 'fixed',
              bottom: '24px',
              right: '24px',
              background: '#0F766E',
              color: '#FFFFFF',
              padding: '0.85rem 1.35rem',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '0.86rem',
              boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              border: '1px solid rgba(255,255,255,0.2)',
              animation: 'fadeIn 0.25s ease',
            }}
          >
            <span style={{ fontSize: '1.1rem' }}>👑</span>
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Dashboard Footer Matching Mockup */}
        <footer
          style={{
            marginTop: '2rem',
            paddingTop: '0.85rem',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
            fontSize: '0.75rem',
            color: '#64748B',
          }}
        >
          <div style={{ fontWeight: 600, color: '#334155' }}>
            DMISU+ - MoE, © 2026
          </div>
          <a
            href="mailto:gasithamoe@gmail.com"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              color: '#334155',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            <span>✉</span>
            <span>Contact: gasithamoe@gmail.com</span>
          </a>
        </footer>

      </div>
    </AppShell>
  );
}
