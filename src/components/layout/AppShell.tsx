'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import {
  DashboardIcon,
  BudgetPlanningIcon,
  AnnualPlanIcon,
  MonitoringIcon,
  AnalyticsIcon,
  ReportsIcon,
  DirectoryIcon,
  HierarchyIcon,
  NewWorkshopIcon,
  RegisterPersonIcon,
  AdminConsoleIcon,
  WorkshopsDirectoryIcon,
  AuditVaultIcon,
  VoteManagementIcon,
} from '@/components/icons/NavIcons';
import GlobalSearchableSelect from '@/components/common/GlobalSearchableSelect';
import { getBranchAbbreviation, getBranchColor } from '@/lib/branchUtils';

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, update } = useSession();

  // Multi-Role Access Management (AUTH-01 – AUTH-12)
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [roleProfile, setRoleProfile] = useState<any>(null);
  const [switchingRole, setSwitchingRole] = useState(false);
  const [rememberRolePref, setRememberRolePref] = useState(true);

  // Live Sync & Profile Avatar Menu
  const [isLiveSyncing, setIsLiveSyncing] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const handleLiveSync = () => {
    setIsLiveSyncing(true);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('app:live-sync'));
    }
    fetchNotifications();
    setTimeout(() => setIsLiveSyncing(false), 1200);
  };

  const fetchUserRoles = async () => {
    try {
      const res = await fetch('/api/auth/switch-role');
      if (res.ok) {
        const json = await res.json();
        setRoleProfile(json);
        setRememberRolePref(json.rememberLastRole ?? true);
      }
    } catch (err) {
      console.error('Error fetching user roles:', err);
    }
  };

  useEffect(() => {
    if (session?.user) {
      fetchUserRoles();
    }
  }, [session?.user]);

  const handleSwitchRole = async (assignmentId: string) => {
    try {
      setSwitchingRole(true);
      const res = await fetch('/api/auth/switch-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleAssignmentId: assignmentId, remember: rememberRolePref }),
      });
      if (res.ok) {
        if (update) {
          await update({ activeRoleAssignmentId: assignmentId });
        }
        setShowRoleModal(false);
        window.location.reload();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to switch role');
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Error switching role');
    } finally {
      setSwitchingRole(false);
    }
  };

  // Navigation Dock States
  const [isHovered, setIsHovered] = useState(false);

  // Rail Vertical Scroll & Active Arrow Edge Indicators
  const railRef = useRef<HTMLDivElement>(null);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);

  // Notifications
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showNavMenu, setShowNavMenu] = useState(false);
  const navPaneRef = useRef<HTMLDivElement>(null);

  // Close nav pane on click outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (navPaneRef.current && !navPaneRef.current.contains(e.target as Node)) {
        setShowNavMenu(false);
      }
    };
    if (showNavMenu) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [showNavMenu]);

  // Close nav pane on navigation
  useEffect(() => {
    setShowNavMenu(false);
  }, [pathname]);

  // Close profile menu on click outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    if (showProfileMenu) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [showProfileMenu]);

  // Close profile menu on navigation
  useEffect(() => {
    setShowProfileMenu(false);
  }, [pathname]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const user = session?.user as any;
  const branchAbbr = getBranchAbbreviation(user?.organizationName || 'MOE Data Management Branch');
  const branchColor = getBranchColor(branchAbbr || user?.organizationName || 'MOE');

  const isExpanded = isHovered;

  const checkRailScroll = () => {
    if (!railRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = railRef.current;
    setCanScrollUp(scrollTop > 6);
    setCanScrollDown(scrollTop < scrollHeight - clientHeight - 6);
  };

  useEffect(() => {
    checkRailScroll();
    const timer = setTimeout(checkRailScroll, 150);
    const handleResize = () => checkRailScroll();
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [pathname, isHovered]);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const json = await res.json();
        setNotifications(json.notifications || []);
        setUnreadCount(json.unreadCount || 0);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const timer = setInterval(fetchNotifications, 10000);
    return () => clearInterval(timer);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      });
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const handleNotificationClick = async (notif: any) => {
    setShowNotifMenu(false);
    if (!notif.isRead) {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: notif.id }),
      });
      fetchNotifications();
    }
    if (notif.workshopId === 'aip-amendment') {
      const amendmentMatch = notif.message?.match(/Amendment\s+(\d+)/i);
      const amendmentNumber = amendmentMatch ? parseInt(amendmentMatch[1], 10) : 1;
      router.push(`/annual-plan?amendmentNumber=${amendmentNumber}`);
    } else if (notif.workshopId) {
      router.push(`/workshops/${notif.workshopId}`);
    }
  };

  // Check if current user is Super Administrator (Apex Level 0)
  const isSuperAdmin = Boolean(
    (user as any)?.isSuperAdmin === true ||
    (user as any)?.adminLevel === 0 ||
    (user as any)?.roleId === 'role-superadmin' ||
    user?.username === 'superadmin' ||
    (user as any)?.roleName === 'Super Administrator'
  );

  // Check if user is an Administrator at any level (Levels 0-5)
  const userAdminLevel = (user as any)?.adminLevel !== undefined && (user as any)?.adminLevel !== null ? Number((user as any)?.adminLevel) : (
    user?.username === 'superadmin' ? 0 :
      (user?.username === 'moe' || user?.username === 'moe.admin') ? 1 :
        (user?.username === 'nie.admin' || user?.username === 'nie') ? 2 :
          (user?.username === 'ped.sp' || user?.username === 'provincial.admin' || user?.username === 'sp.admin') ? 3 :
            (user?.username === 'zeo.galle' || user?.username === 'zonal.admin' || user?.username === 'galle.admin') ? 4 :
              (user?.username === 'deo.galle' || user?.username === 'divisional.admin') ? 5 :
                (user?.username === 'admin' ? 1 : null)
  );

  const isAdminUser = Boolean(
    isSuperAdmin ||
    (userAdminLevel !== null && userAdminLevel !== undefined && userAdminLevel >= 0 && userAdminLevel <= 5) ||
    ['superadmin', 'admin', 'moe', 'moe.admin', 'nie.admin', 'nie', 'ped.sp', 'provincial.admin', 'sp.admin', 'zeo.galle', 'zonal.admin', 'galle.admin', 'deo.galle', 'divisional.admin'].includes(user?.username) ||
    (user as any)?.roleName?.includes('Administrator') ||
    ((user as any)?.roleName?.includes('Level') && (user as any)?.roleName?.includes('Admin'))
  );

  // Governance officers (Planning / Monitoring leadership) who also have access to audit/reports
  const isGovernanceOfficer = Boolean(
    (user as any)?.functionalCategory === 'Planning' ||
    (user as any)?.functionalCategory === 'Monitoring' ||
    user?.username === 'planning.officer' ||
    user?.username === 'monitoring.officer'
  );

  // Planning branch check (Vote Management module is strictly reserved for Planning Branch)
  const isPlanningBranchUser = Boolean(
    isSuperAdmin ||
    (user as any)?.functionalCategory === 'Planning' ||
    user?.username === 'planning.officer' ||
    user?.username === 'planning' ||
    user?.username === 'doe.planning' ||
    (user as any)?.organizationName?.toLowerCase().includes('plan') ||
    (user as any)?.organizationId?.toLowerCase().includes('plan')
  );

  // Primary System Pillars (Matching the Architecture Flow - Reports restricted to Admins/Governance)
  const primaryNavItems = [
    { href: '/dashboard', label: 'Dashboard', icon: DashboardIcon },
    { href: '/budget-forecasting', label: 'Budget Planning', icon: BudgetPlanningIcon },
    { href: '/annual-plan', label: 'Annual Plan (AIP)', icon: AnnualPlanIcon },
    { href: '/monitoring', label: 'Monitoring & Verification', icon: MonitoringIcon },
    ...(isAdminUser || isGovernanceOfficer ? [
      { href: '/reports', label: 'Analytics & Audit', icon: AnalyticsIcon },
    ] : []),
  ];

  // Secondary Operational Navigation Items (Admin Console & Hierarchy restricted to Admins)
  const operationalNavItems = [
    { href: '/workshops', label: 'Workshops Directory', icon: WorkshopsDirectoryIcon },
    { href: '/workshops/new', label: 'Schedule Workshop', icon: NewWorkshopIcon, badge: 'New' },
    { href: '/resource-persons', label: 'Resource Persons', icon: DirectoryIcon },
    { href: '/resource-persons/new', label: 'Register Person', icon: RegisterPersonIcon },
    { href: '/organizations', label: 'Hierarchy & Branches', icon: HierarchyIcon, adminOnly: true },
    { href: '/admin', label: 'Admin Console', icon: AdminConsoleIcon, adminOnly: true },
    { href: '/admin/audit-logs', label: 'System Audit Logs', icon: AuditVaultIcon, superAdminOnly: true, badge: 'Super' },
  ];

  const isActive = (href: string, exact = false) => {
    if (exact) return pathname === href;
    if (href === '/admin/audit-logs') return pathname.startsWith('/admin/audit-logs') || pathname.startsWith('/audit-logs');
    if (href === '/workshops') return pathname.startsWith('/workshops') && pathname !== '/workshops/new';
    if (href === '/vote-management') return pathname.startsWith('/vote-management');
    if (href === '/annual-plan') return pathname.startsWith('/annual-plan');
    if (href === '/budget-forecasting') return pathname.startsWith('/budget-forecasting');
    if (href === '/monitoring') return pathname.startsWith('/monitoring');
    if (href === '/reports') return pathname.startsWith('/reports');
    if (href === '/organizations') return pathname.startsWith('/organizations');
    if (href === '/admin') return pathname === '/admin';
    if (href === '/resource-persons') return pathname.startsWith('/resource-persons') && pathname !== '/resource-persons/new';
    return pathname === href || pathname.startsWith(href + '/');
  };

  // Get active breadcrumb icon
  const getActivePageDetails = () => {
    if (pathname === '/dashboard') return { title: 'Dashboard', href: '/dashboard', parent: null };
    if (pathname === '/vote-management') return { title: 'Vote Management', href: '/vote-management', parent: { title: 'Planning Division', href: '/annual-plan' } };
    if (pathname === '/budget-forecasting') return { title: 'Budget Forecasting & Formulation', href: '/budget-forecasting', parent: null };
    if (pathname === '/annual-plan') return { title: 'Annual Implementation Plan (AIP)', href: '/annual-plan', parent: null };
    if (pathname.startsWith('/annual-plan/')) return { title: 'AIP Details', href: pathname, parent: { title: 'Annual Implementation Plan (AIP)', href: '/annual-plan' } };
    if (pathname === '/monitoring') return { title: 'Monitoring & Verification', href: '/monitoring', parent: null };
    if (pathname === '/reports') return { title: 'Analytics & Audit Reports', href: '/reports', parent: null };
    if (pathname === '/workshops') return { title: 'Workshops Directory', href: '/workshops', parent: null };
    if (pathname === '/workshops/new') return { title: 'Schedule New Workshop', href: '/workshops/new', parent: { title: 'Workshops Directory', href: '/workshops' } };
    if (pathname.startsWith('/workshops/')) return { title: 'Workshop Details', href: pathname, parent: { title: 'Workshops Directory', href: '/workshops' } };
    if (pathname === '/resource-persons') return { title: 'Resource Persons Pool', href: '/resource-persons', parent: null };
    if (pathname === '/resource-persons/new') return { title: 'Register Resource Person', href: '/resource-persons/new', parent: { title: 'Resource Persons Pool', href: '/resource-persons' } };
    if (pathname === '/organizations') return { title: 'Organizational Hierarchy & Branches', href: '/organizations', parent: null };
    if (pathname === '/admin') {
      const adminTitle = !isAdminUser
        ? 'Administrative Console'
        : userAdminLevel === 0
          ? 'Super Administrator Console'
          : `Level ${userAdminLevel} Administrator Console`;
      return { title: adminTitle, href: '/admin', parent: null };
    }
    if (pathname.startsWith('/admin/audit-logs') || pathname === '/audit-logs') return { title: 'System Audit Logs & Forensics Registry', href: '/admin/audit-logs', parent: { title: 'Admin Console', href: '/admin' } };
    return { title: 'Overview', href: pathname, parent: null };
  };

  const getActiveBreadcrumbIcon = () => {
    if (pathname === '/dashboard') return <DashboardIcon size={16} color="var(--primary)" />;
    if (pathname.startsWith('/admin/audit-logs') || pathname === '/audit-logs') return <AuditVaultIcon size={16} color="var(--primary)" />;
    if (pathname === '/vote-management') return <VoteManagementIcon size={16} color="var(--primary)" />;
    if (pathname === '/budget-forecasting') return <BudgetPlanningIcon size={16} color="var(--primary)" />;
    if (pathname.startsWith('/annual-plan')) return <AnnualPlanIcon size={16} color="var(--primary)" />;
    if (pathname === '/monitoring') return <MonitoringIcon size={16} color="var(--primary)" />;
    if (pathname === '/reports') return <AnalyticsIcon size={16} color="var(--primary)" />;
    if (pathname === '/workshops/new') return <NewWorkshopIcon size={16} color="var(--primary)" />;
    if (pathname.startsWith('/workshops')) return <WorkshopsDirectoryIcon size={16} color="var(--primary)" />;
    if (pathname.startsWith('/resource-persons')) return <DirectoryIcon size={16} color="var(--primary)" />;
    if (pathname === '/organizations') return <HierarchyIcon size={16} color="var(--primary)" />;
    if (pathname === '/admin') return <AdminConsoleIcon size={16} color="var(--primary)" />;
    return <HierarchyIcon size={16} color="var(--primary)" />;
  };

  return (
    <div className="app-layout">

      {/* ══════════════════════════════════════════════════════
          AUTO-HIDING ICON DOCK & EXPANDABLE SIDE PANEL
          Reveals full icons and labels whenever mouse moves to left
         ══════════════════════════════════════════════════════ */}
      <aside
        className={`app-sidebar ${isExpanded ? 'sidebar-expanded' : ''}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Brand Header with Ministry Crest & Pin Button */}
        <div
          style={{
            padding: isExpanded ? '1.1rem 0.85rem' : '1.1rem 0',
            borderBottom: '1px solid rgba(255,255,255,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: isExpanded ? 'flex-start' : 'center',
            minHeight: '68px',
            width: '100%',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0, justifyContent: isExpanded ? 'flex-start' : 'center', width: isExpanded ? 'auto' : '100%' }}>
            {/* IPMIS Official System Logo */}
            <div
              style={{
                width: '42px',
                height: '42px',
                background: '#FFFFFF',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid #FFBE29',
                boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                flexShrink: 0,
                overflow: 'hidden',
                padding: '2px',
              }}
              title="Integrated Planning & Monitoring Information System (IPMIS)"
            >
              <img
                src="/logo-emblem.png"
                alt="IPMIS Logo"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </div>

            {/* Brand Title (Visible only when expanded) */}
            {isExpanded && (
              <div className="sidebar-brand-text">
                <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#fff', lineHeight: 1.25, letterSpacing: '0.01em' }}>
                  MoE-IPMIS
                </div>
                <div style={{ fontSize: '0.64rem', color: '#FFBE29', marginTop: '2px', letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: 700 }}>
                  Integrated Planning & Monitoring
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Active Arrow Icon at TOP Edge (Only in collapsed rail view, hidden in expanded view) ── */}
        {!isExpanded && canScrollUp && (
          <button
            type="button"
            onClick={() => {
              railRef.current?.scrollBy({ top: -140, behavior: 'smooth' });
              setTimeout(checkRailScroll, 250);
            }}
            className="nav-rail-scroll-edge-btn top"
            title="Scroll navigation up"
            aria-label="Scroll navigation up"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFBE29" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="18 15 12 9 6 15" />
            </svg>
          </button>
        )}

        {/* Navigation Rail with Visual Icons & Suitable Scrolling Edge */}
        <div
          ref={railRef}
          onScroll={checkRailScroll}
          className="nav-rail-scroll-container"
          style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', overflowX: 'hidden', padding: '0.45rem 0' }}
        >

          {/* Primary System Pillars */}
          <nav className="nav-rail-group">
            {primaryNavItems.map((item) => {
              const active = isActive(item.href);
              const IconComp = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-rail-item ${active ? 'active' : ''}`}
                  title={item.label}
                >
                  <div className="nav-rail-icon-box">
                    <IconComp
                      size={22}
                      color={active ? '#80142B' : '#FFFFFF'}
                      accentColor={active ? '#80142B' : '#FFBE29'}
                    />
                  </div>
                  <span className="nav-rail-label" style={{ fontWeight: active ? 700 : 500 }}>
                    {item.label}
                  </span>
                  {active && isExpanded && (
                    <span style={{ marginLeft: 'auto', color: '#FFBE29', fontSize: '1.2rem', lineHeight: 1 }}>•</span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Section Divider: Workshop Operations */}
          <div className="sidebar-section-divider" />
          {isExpanded && (
            <div className="sidebar-section-title">
              Operations & Directory
            </div>
          )}

          {/* Operations & Directory Pillars */}
          <nav className="nav-rail-group">
            {operationalNavItems.map((item) => {
              if ((item as any).superAdminOnly && !isSuperAdmin) return null;
              if ((item as any).adminOnly && !isAdminUser) return null;
              const active = isActive(item.href);
              const IconComp = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-rail-item ${active ? 'active' : ''}`}
                  title={item.label}
                >
                  <div className="nav-rail-icon-box">
                    <IconComp
                      size={22}
                      color={active ? '#80142B' : '#FFFFFF'}
                      accentColor={active ? '#80142B' : '#FFBE29'}
                    />
                  </div>
                  <span className="nav-rail-label" style={{ fontWeight: active ? 700 : 500 }}>
                    {item.label}
                  </span>
                  {item.badge && isExpanded && (
                    <span
                      style={{
                        marginLeft: 'auto',
                        background: '#FFBE29',
                        color: '#5c0f28',
                        fontSize: '0.62rem',
                        fontWeight: 800,
                        padding: '0.15rem 0.4rem',
                        borderRadius: '4px',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* ── Active Arrow Icon at BOTTOM Edge (Only in collapsed rail view, hidden in expanded view) ── */}
        {!isExpanded && canScrollDown && (
          <button
            type="button"
            onClick={() => {
              railRef.current?.scrollBy({ top: 140, behavior: 'smooth' });
              setTimeout(checkRailScroll, 250);
            }}
            className="nav-rail-scroll-edge-btn bottom"
            title="Scroll navigation down"
            aria-label="Scroll navigation down"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFBE29" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        )}

        {/* Bottom Logout Area */}
        <div
          style={{
            padding: isExpanded ? '0.75rem 0.85rem' : '0.65rem 0',
            borderTop: '1px solid rgba(255,255,255,0.15)',
            background: 'rgba(0,0,0,0.18)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: isExpanded ? 'flex-start' : 'center',
          }}
        >
          {/* Logout button */}
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: '/login' })}
            style={{
              width: isExpanded ? '100%' : '44px',
              height: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: isExpanded ? '0.55rem' : '0',
              borderRadius: isExpanded ? '8px' : '11px',
              color: 'rgba(255,255,255,0.85)',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              fontWeight: 600,
              fontSize: '0.82rem',
              cursor: 'pointer',
              transition: 'all 150ms ease',
              margin: isExpanded ? '0' : '0 auto',
            }}
            title="Sign out of system"
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(220, 38, 38, 0.45)';
              e.currentTarget.style.borderColor = 'rgba(220, 38, 38, 0.7)';
              e.currentTarget.style.color = '#fff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
              e.currentTarget.style.color = 'rgba(255,255,255,0.85)';
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            {isExpanded && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* ══════════════════════════════════════════════════════
          MAIN WORKSPACE CONTENT AREA
         ══════════════════════════════════════════════════════ */}
      <div className="app-main">

        {/* Top Header Bar */}
        <header className="app-header">
          {/* Left: Clickable Navigation Pane & Breadcrumb */}
          <div ref={navPaneRef} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0, position: 'relative' }}>
            <div className="header-breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', color: 'var(--text-tertiary)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>

              {/* Root Institutional & System Link (Clickable Navigation to Dashboard) */}
              <Link
                href="/dashboard"
                className="header-breadcrumb-root header-breadcrumb-link"
                style={{
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.2rem 0.45rem',
                  borderRadius: '6px',
                  transition: 'all 0.15s ease',
                  cursor: 'pointer',
                }}
                title="Return to IPMIS Dashboard Home"
              >
                <img
                  src="/logo-emblem.png"
                  alt="IPMIS Logo"
                  style={{ width: '18px', height: '18px', objectFit: 'contain' }}
                />
                <span style={{ fontWeight: 800, color: '#0F766E' }}>IPMIS</span>
              </Link>

              <span className="header-breadcrumb-separator" style={{ color: 'var(--border-medium)', userSelect: 'none', margin: '0 2px' }}>/</span>

              {/* Optional Parent Link (e.g., Workshops Directory) */}
              {(() => {
                const details = getActivePageDetails();
                return (
                  <>
                    {details.parent && (
                      <>
                        <Link
                          href={details.parent.href}
                          className="header-breadcrumb-link"
                          style={{
                            fontWeight: 600,
                            color: 'var(--text-secondary)',
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '0.2rem 0.45rem',
                            borderRadius: '6px',
                            transition: 'all 0.15s ease',
                            cursor: 'pointer',
                          }}
                          title={`Go to ${details.parent.title}`}
                        >
                          {details.parent.title}
                        </Link>
                        <span className="header-breadcrumb-separator" style={{ color: 'var(--border-medium)', userSelect: 'none', margin: '0 2px' }}>/</span>
                      </>
                    )}

                    {/* Active Navigation Pane Button */}
                    <button
                      type="button"
                      onClick={() => setShowNavMenu((prev) => !prev)}
                      className="header-nav-pane-btn"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        background: showNavMenu ? 'rgba(128, 20, 43, 0.08)' : 'transparent',
                        border: '1px solid',
                        borderColor: showNavMenu ? '#80142B' : 'transparent',
                        borderRadius: '6px',
                        padding: '0.2rem 0.5rem',
                        color: showNavMenu ? '#80142B' : 'var(--text-primary)',
                        fontWeight: 700,
                        cursor: 'pointer',
                        fontSize: '0.84rem',
                        transition: 'all 0.15s ease',
                      }}
                      title="Open Clickable Navigation Pane"
                      aria-expanded={showNavMenu}
                    >
                      {getActiveBreadcrumbIcon()}
                      <span>{details.title}</span>
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{
                          transition: 'transform 0.15s ease',
                          transform: showNavMenu ? 'rotate(180deg)' : 'rotate(0deg)',
                          color: '#80142B',
                        }}
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>
                  </>
                );
              })()}
            </div>

            {/* Floating Navigation Pane Dropdown Drawer */}
            {showNavMenu && (
              <div
                className="header-nav-pane-dropdown"
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 'calc(100% + 8px)',
                  background: '#FFFFFF',
                  border: '1px solid #EADBDE',
                  borderRadius: '14px',
                  boxShadow: '0 12px 36px rgba(128, 20, 43, 0.14), 0 4px 12px rgba(0, 0, 0, 0.06)',
                  width: '380px',
                  zIndex: 1000,
                  overflow: 'hidden',
                  animation: 'fadeIn 0.15s ease',
                }}
              >
                {/* Drawer Header */}
                <div
                  style={{
                    padding: '0.75rem 1rem',
                    background: 'linear-gradient(135deg, #7A1228 0%, #8D153A 100%)',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.05rem' }}>🧭</span>
                    <span style={{ fontWeight: 800, fontSize: '0.84rem', letterSpacing: '0.02em', color: '#FFFFFF' }}>
                      IPMIS Navigation Pane
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: '0.66rem',
                      color: '#FFFFFF',
                      fontWeight: 700,
                      background: 'rgba(255, 255, 255, 0.18)',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      letterSpacing: '0.02em',
                    }}
                  >
                    Jump to Module
                  </span>
                </div>

                {/* Content */}
                <div style={{ padding: '0.75rem', maxHeight: '440px', overflowY: 'auto' }}>
                  <div style={{ fontSize: '0.66rem', fontWeight: 800, color: '#80142B', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0.2rem 0.5rem 0.45rem' }}>
                    Core Planning & Monitoring Pillars
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginBottom: '0.75rem' }}>
                    {primaryNavItems.map((item) => {
                      const active = isActive(item.href);
                      const IconComp = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setShowNavMenu(false)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.45rem 0.65rem',
                            borderRadius: '10px',
                            textDecoration: 'none',
                            color: active ? '#80142B' : '#1E293B',
                            background: active ? '#FFF0EC' : 'transparent',
                            border: active ? '1px solid #F5D0C5' : '1px solid transparent',
                            fontWeight: active ? 800 : 500,
                            fontSize: '0.82rem',
                            transition: 'all 0.12s ease',
                          }}
                          className="nav-pane-item"
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                            <div
                              style={{
                                width: '30px',
                                height: '30px',
                                borderRadius: '8px',
                                background: active ? '#80142B' : '#F8EFEA',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: active ? '0 2px 6px rgba(128, 20, 43, 0.25)' : 'none',
                              }}
                            >
                              <IconComp size={16} color={active ? '#FFFFFF' : '#80142B'} />
                            </div>
                            <span style={{ fontWeight: active ? 800 : 600 }}>{item.label}</span>
                          </div>
                          {active && (
                            <span
                              style={{
                                fontSize: '0.68rem',
                                color: '#80142B',
                                fontWeight: 800,
                                background: '#FFFFFF',
                                border: '1px solid #F2DDD5',
                                padding: '2px 7px',
                                borderRadius: '10px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                              }}
                            >
                              Active ✓
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>

                  <div style={{ fontSize: '0.66rem', fontWeight: 800, color: '#80142B', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0.35rem 0.5rem 0.45rem', borderTop: '1px solid #F1E5E2', paddingTop: '0.6rem' }}>
                    Operations & Directory
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    {operationalNavItems.map((item) => {
                      if ((item as any).superAdminOnly && !isSuperAdmin) return null;
                      if ((item as any).adminOnly && !isAdminUser) return null;
                      const active = isActive(item.href);
                      const IconComp = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setShowNavMenu(false)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.45rem 0.65rem',
                            borderRadius: '10px',
                            textDecoration: 'none',
                            color: active ? '#80142B' : '#1E293B',
                            background: active ? '#FFF0EC' : 'transparent',
                            border: active ? '1px solid #F5D0C5' : '1px solid transparent',
                            fontWeight: active ? 800 : 500,
                            fontSize: '0.82rem',
                            transition: 'all 0.12s ease',
                          }}
                          className="nav-pane-item"
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                            <div
                              style={{
                                width: '30px',
                                height: '30px',
                                borderRadius: '8px',
                                background: active ? '#80142B' : '#F8EFEA',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: active ? '0 2px 6px rgba(128, 20, 43, 0.25)' : 'none',
                              }}
                            >
                              <IconComp size={16} color={active ? '#FFFFFF' : '#80142B'} />
                            </div>
                            <span style={{ fontWeight: active ? 800 : 600 }}>{item.label}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                            {item.badge && (
                              <span
                                style={{
                                  background: '#80142B',
                                  color: '#FFFFFF',
                                  fontSize: '0.62rem',
                                  fontWeight: 800,
                                  padding: '0.12rem 0.45rem',
                                  borderRadius: '6px',
                                  letterSpacing: '0.02em',
                                }}
                              >
                                {item.badge}
                              </span>
                            )}
                            {active && (
                              <span
                                style={{
                                  fontSize: '0.68rem',
                                  color: '#80142B',
                                  fontWeight: 800,
                                  background: '#FFFFFF',
                                  border: '1px solid #F2DDD5',
                                  padding: '2px 7px',
                                  borderRadius: '10px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                }}
                              >
                                Active ✓
                              </span>
                            )}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right: User Profile & Notifications */}
          <div className="app-header-right" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>

            {/* Current Role Capsule (First Image Mockup Design) */}
            <button
              type="button"
              className="header-switch-role-capsule"
              onClick={() => {
                fetchUserRoles();
                setShowRoleModal(true);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: '#F8EFEA',
                border: '1px solid #EADBDE',
                borderRadius: '20px',
                padding: '0.28rem 0.85rem',
                fontSize: '0.74rem',
                color: '#332E2C',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: '0 1px 3px rgba(128, 20, 43, 0.06)',
              }}
              title="Click to switch working role"
            >
              <span style={{ color: '#80142B', fontWeight: 600 }}>Current Role:</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontWeight: 800 }}>
                <span>👥</span> {user?.organizationName || user?.roleName || 'MOE Data Management Branch'}
              </span>
              <span style={{ color: '#685F5C', fontSize: '0.68rem', marginLeft: '2px' }}>▾</span>
            </button>

            {/* Live Sync Badge (First Image Mockup Design) */}
            <button
              type="button"
              onClick={handleLiveSync}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                background: '#E8F8EE',
                border: '1px solid #A7F3D0',
                borderRadius: '20px',
                padding: '0.28rem 0.75rem',
                fontSize: '0.72rem',
                fontWeight: 800,
                color: '#15803D',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title="Click to refresh telemetry sync"
            >
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: '#10B981',
                  boxShadow: '0 0 6px #10B981',
                  display: 'inline-block',
                }}
              />
              <span>{isLiveSyncing ? 'Syncing...' : 'Live Sync'}</span>
            </button>

            {/* Notification Bell */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                className={`header-icon-btn notif-bell-btn ${unreadCount > 0 ? 'has-unread' : ''}`}
                onClick={() => setShowNotifMenu((prev) => !prev)}
                title={unreadCount > 0 ? `Active Notifications: ${unreadCount} unread` : 'Notifications'}
                aria-label="Notifications"
                style={{
                  position: 'relative',
                  width: '36px',
                  height: '36px',
                  borderRadius: 'var(--radius-md)',
                  border: unreadCount > 0 ? '1.5px solid #EF4444' : '1px solid var(--border-medium)',
                  background: unreadCount > 0 ? '#FEF2F2' : 'var(--white)',
                  color: unreadCount > 0 ? '#DC2626' : 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: unreadCount > 0 ? '0 0 10px rgba(239, 68, 68, 0.35), 0 2px 6px rgba(220, 38, 38, 0.2)' : 'none',
                }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill={unreadCount > 0 ? 'rgba(239, 68, 68, 0.15)' : 'none'}
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    color: unreadCount > 0 ? '#DC2626' : 'currentColor',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {unreadCount > 0 && (
                  <>
                    {/* Glowing radar ping effect */}
                    <span
                      style={{
                        position: 'absolute',
                        top: '-4px',
                        right: '-4px',
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        background: '#EF4444',
                        animation: 'notifRadarPing 2s cubic-bezier(0, 0, 0.2, 1) infinite',
                        pointerEvents: 'none',
                        zIndex: 1,
                      }}
                    />
                    {/* Eye-catching red counter badge */}
                    <span
                      style={{
                        position: 'absolute',
                        top: '-4px',
                        right: '-4px',
                        background: '#DC2626',
                        color: '#FFFFFF',
                        fontSize: '0.65rem',
                        fontWeight: 800,
                        borderRadius: '50%',
                        minWidth: '18px',
                        height: '18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0 3px',
                        border: '2px solid #FFFFFF',
                        boxShadow: '0 2px 6px rgba(220, 38, 38, 0.5)',
                        zIndex: 2,
                      }}
                    >
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  </>
                )}
              </button>

              {showNotifMenu && (
                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: '110%',
                    background: 'var(--white)',
                    border: '1px solid var(--border-medium)',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: 'var(--shadow-lg)',
                    width: '340px',
                    zIndex: 100,
                    overflow: 'hidden',
                  }}
                >
                  <div style={{
                    padding: '0.75rem 1rem',
                    borderBottom: '1px solid var(--border-light)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}>
                    <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>
                      Notifications ({notifications.length})
                    </span>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={handleMarkAllRead}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--primary)',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>
                  <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {notifications.length === 0 ? (
                      <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.82rem' }}>
                        No notifications yet.
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => handleNotificationClick(n)}
                          style={{
                            padding: '0.75rem 1rem',
                            borderBottom: '1px solid var(--border-light)',
                            cursor: 'pointer',
                            background: n.isRead ? 'transparent' : 'rgba(141, 21, 58, 0.05)',
                          }}
                        >
                          <div style={{ fontSize: '0.82rem', fontWeight: n.isRead ? 400 : 600, color: 'var(--text-primary)' }}>
                            {n.message}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: '3px' }}>
                            {new Date(n.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Avatar / Branch Initials Badge */}
            <div ref={profileMenuRef} style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setShowProfileMenu((prev) => !prev)}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  border: '2px solid #EADBDE',
                  background: branchColor.bg,
                  color: branchColor.text,
                  padding: 0,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '0.74rem',
                  letterSpacing: '0.04em',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
                  userSelect: 'none',
                }}
                title={`${user?.name || 'Authorized Officer'} (${user?.organizationName || 'MOE Data Management Branch'})`}
              >
                {branchAbbr}
              </button>

              {showProfileMenu && (
                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: 'calc(100% + 8px)',
                    background: '#FFFFFF',
                    border: '1px solid #EADBDE',
                    borderRadius: '12px',
                    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.06)',
                    padding: '0.85rem',
                    minWidth: '220px',
                    zIndex: 100,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.65rem' }}>
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        background: branchColor.bg,
                        color: branchColor.text,
                        border: '1.5px solid #EADBDE',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '0.8rem',
                        letterSpacing: '0.04em',
                        flexShrink: 0,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        userSelect: 'none',
                      }}
                    >
                      {branchAbbr}
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.82rem', color: '#1E1B18', lineHeight: 1.2 }}>
                        {user?.name || 'Authorized Officer'}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#685F5C', marginTop: '2px' }}>
                        {user?.organizationName || 'MOE Data Management Branch'}
                      </div>
                    </div>
                  </div>
                  <div style={{ height: '1px', background: '#F1E8E6', margin: '6px 0 8px' }} />
                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileMenu(false);
                      fetchUserRoles();
                      setShowRoleModal(true);
                    }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      background: 'none',
                      border: 'none',
                      padding: '6px 8px',
                      fontSize: '0.76rem',
                      color: '#80142B',
                      fontWeight: 700,
                      cursor: 'pointer',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <span>⇄</span> Switch Role
                  </button>
                  <button
                    type="button"
                    onClick={() => signOut({ callbackUrl: '/login' })}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      background: 'none',
                      border: 'none',
                      padding: '6px 8px',
                      fontSize: '0.76rem',
                      color: '#DC2626',
                      fontWeight: 700,
                      cursor: 'pointer',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <span>🚪</span> Sign Out
                  </button>
                </div>
              )}
            </div>

          </div>
        </header>

        {/* Content Body */}
        <main className="app-content" style={{ flex: 1 }}>
          {children}
        </main>

        {/* Global Application Normalized Footer */}
        <footer
          className="app-footer"
          style={{
            borderTop: '1px solid var(--border-medium, #E2E8F0)',
            background: 'var(--bg-card, #FFFFFF)',
            padding: '0.55rem 1.5rem',
            marginTop: 'auto',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
            fontSize: '0.75rem',
            color: 'var(--text-secondary, #64748B)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontWeight: 600, color: 'var(--text-primary, #0F172A)' }}>
              DMISDU- MoE, copyrights MoE
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <a
              href="mailto:gasithamoe@gmail.com"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                color: '#0F766E',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '0.75rem',
                transition: 'color 0.15s ease',
              }}
              title="Official MoE Contact & Support"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <rect width="20" height="16" x="2" y="4" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
              <span>Contact: gasithamoe@gmail.com</span>
            </a>
          </div>
        </footer>

      </div>

      {/* ── Centralized Multi-Role Switcher Modal Dialog (createPortal) ── */}
      {showRoleModal && typeof document !== 'undefined'
        ? createPortal(
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.72)',
              backdropFilter: 'blur(4px)',
              zIndex: 999999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1.25rem',
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowRoleModal(false);
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Switch Working Role"
              style={{
                background: '#FFFFFF',
                borderRadius: '16px',
                width: '96%',
                maxWidth: '720px',
                maxHeight: '85vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.45)',
                border: '1px solid #CBD5E1',
                overflow: 'hidden',
              }}
            >
              {/* Modal Header */}
              <div
                style={{
                  padding: '1.15rem 1.5rem',
                  borderBottom: '1px solid #E2E8F0',
                  background: 'linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                    <span
                      style={{
                        background: '#E6FFFA',
                        border: '1px solid #0F766E',
                        color: '#0F766E',
                        borderRadius: '6px',
                        padding: '2px 8px',
                        fontSize: '0.65rem',
                        fontWeight: 800,
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                      }}
                    >
                      Single Login • Multi-Role
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>
                      AUTH-07 Active Switch
                    </span>
                  </div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0F172A' }}>
                    Switch Working Role
                  </h3>
                  <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: '2px' }}>
                    Officer: <strong>{user?.name || user?.fullName}</strong> ({user?.username}) • Current Role: <span style={{ color: '#0F766E', fontWeight: 700 }}>{user?.roleName}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowRoleModal(false)}
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    borderRadius: '6px',
                    width: '32px',
                    height: '32px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#475569',
                  }}
                  title="Close role switcher"
                >
                  ✕
                </button>
              </div>

              {/* Modal Body: Available Assigned Roles */}
              <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', flex: 1 }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>
                  Authorized Working Roles Assigned to You:
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {(roleProfile?.assignedRoles || user?.assignedRoles || []).map((assignment: any) => {
                    const isCurrent =
                      assignment.id === roleProfile?.activeRoleAssignmentId ||
                      assignment.roleName === user?.roleName;

                    return (
                      <div
                        key={assignment.id}
                        style={{
                          border: isCurrent ? '2px solid #0F766E' : '1px solid #E2E8F0',
                          borderRadius: '10px',
                          padding: '1rem 1.15rem',
                          background: isCurrent ? '#F0FDFA' : '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '1rem',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                            <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#0F172A' }}>
                              {assignment.roleName}
                            </h4>
                            {isCurrent && (
                              <span
                                style={{
                                  background: '#0F766E',
                                  color: '#FFFFFF',
                                  fontSize: '0.62rem',
                                  fontWeight: 800,
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                }}
                              >
                                CURRENTLY ACTIVE
                              </span>
                            )}
                            <span
                              style={{
                                background: '#F1F5F9',
                                color: '#475569',
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                padding: '2px 6px',
                                borderRadius: '4px',
                                textTransform: 'uppercase',
                              }}
                            >
                              {assignment.functionalCategory || 'Normal'} Scope
                            </span>
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#0F766E', fontWeight: 600 }}>
                            🏢 {assignment.organizationName}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '2px' }}>
                            {assignment.description || 'Assigned institutional duties and authorized workflows.'}
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={isCurrent || switchingRole}
                          onClick={() => handleSwitchRole(assignment.id)}
                          style={{
                            background: isCurrent ? '#E2E8F0' : '#0F766E',
                            color: isCurrent ? '#94A3B8' : '#FFFFFF',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '0.5rem 1.15rem',
                            fontSize: '0.78rem',
                            fontWeight: 800,
                            cursor: (isCurrent || switchingRole) ? 'default' : 'pointer',
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {isCurrent ? 'Active Context' : (switchingRole ? 'Switching...' : 'Switch to this Role →')}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Modal Footer with Remember Option */}
              <div
                style={{
                  padding: '0.85rem 1.5rem',
                  borderTop: '1px solid #E2E8F0',
                  background: '#F8FAFC',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', userSelect: 'none' }}>
                  <input
                    type="checkbox"
                    checked={rememberRolePref}
                    onChange={(e) => setRememberRolePref(e.target.checked)}
                    style={{ accentColor: '#0F766E' }}
                  />
                  <span style={{ fontSize: '0.76rem', color: '#334155', fontWeight: 600 }}>
                    Remember selected role for subsequent logins
                  </span>
                </label>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Link
                    href="/select-role"
                    onClick={() => setShowRoleModal(false)}
                    style={{
                      padding: '0.45rem 0.85rem',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      background: '#FFFFFF',
                      color: '#0F766E',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                    }}
                  >
                    Full Role Selection Portal
                  </Link>
                  <button
                    type="button"
                    onClick={() => setShowRoleModal(false)}
                    style={{
                      padding: '0.45rem 1rem',
                      borderRadius: '6px',
                      border: 'none',
                      background: '#334155',
                      color: '#FFFFFF',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )
        : null}

      {/* Global Type-to-Search Combobox for all Dropdowns */}
      <GlobalSearchableSelect />
    </div>
  );
}
