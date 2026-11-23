'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';
import { SystemAuditLog } from '@/lib/db';
import { AuditStats } from '@/lib/auditLogger';
import TileActionMenu, { TileExportData } from '@/components/dashboard/TileActionMenu';

export default function SuperAdminAuditLogsPage() {
  const { data: session, status } = useSession();
  const user = session?.user as any;

  // Strict Super Admin Access Authorization
  const isSuperAdmin = useMemo(() => {
    if (!user) return false;
    return Boolean(
      user.isSuperAdmin === true ||
      user.adminLevel === 0 ||
      user.adminLevel === 1 ||
      user.roleId === 'role-superadmin' ||
      user.roleId === 'role-admin' ||
      user.username === 'superadmin' ||
      user.username === 'admin' ||
      user.roleName === 'Super Administrator' ||
      user.roleName === 'System Administrator'
    );
  }, [user]);

  // Data states
  const [logs, setLogs] = useState<SystemAuditLog[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [totalInDb, setTotalInDb] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedEntityType, setSelectedEntityType] = useState<string>('all');
  const [selectedUsername, setSelectedUsername] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Inspection modal state
  const [selectedLog, setSelectedLog] = useState<SystemAuditLog | null>(null);
  const [copyFeedback, setCopyFeedback] = useState(false);

  // Fetch audit logs from API
  const fetchLogs = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') params.set('category', selectedCategory);
      if (selectedSeverity !== 'all') params.set('severity', selectedSeverity);
      if (selectedEntityType !== 'all') params.set('entityType', selectedEntityType);
      if (selectedUsername !== 'all') params.set('username', selectedUsername);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      params.set('limit', '500');

      const res = await fetch(`/api/audit-logs?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to fetch system audit logs');
      }

      const data = await res.json();
      setLogs(data.logs || []);
      setTotalInDb(data.totalInDb || 0);
      if (data.stats) setStats(data.stats);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred while loading audit logs.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated' && isSuperAdmin) {
      fetchLogs();
    } else if (status === 'authenticated' && !isSuperAdmin) {
      setLoading(false);
    }
  }, [status, isSuperAdmin, selectedCategory, selectedSeverity, selectedEntityType, selectedUsername]);

  // Handle Search on Submit or Debounced
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs();
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedSeverity('all');
    setSelectedEntityType('all');
    setSelectedUsername('all');
    setStartDate('');
    setEndDate('');
    setTimeout(() => {
      fetchLogs();
    }, 10);
  };

  // Export audit trail to CSV
  const handleExportCSV = () => {
    if (logs.length === 0) return;

    const headers = [
      'Log ID',
      'Timestamp (ISO)',
      'Timestamp (SLST)',
      'Username',
      'Officer Name',
      'Organization / Branch',
      'Category',
      'Severity',
      'Action Code',
      'Entity Type',
      'Entity Reference ID',
      'Action Summary',
      'IP Address',
      'User Agent',
      'Details JSON',
    ];

    const rows = logs.map((l) => [
      `"${l.id}"`,
      `"${l.timestamp}"`,
      `"${formatSLST(l.timestamp)}"`,
      `"${l.username}"`,
      `"${l.userFullName || ''}"`,
      `"${l.organizationName || ''}"`,
      `"${l.category}"`,
      `"${l.severity}"`,
      `"${l.action}"`,
      `"${l.entityType}"`,
      `"${l.entityId}"`,
      `"${(l.summary || '').replace(/"/g, '""')}"`,
      `"${l.ipAddress || '127.0.0.1'}"`,
      `"${(l.userAgent || '').replace(/"/g, '""')}"`,
      `"${JSON.stringify(l.details || {}).replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `IPMIS_Enterprise_Audit_Trail_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Memoized export dataset for TileActionMenu (Excel CSV & Landscape A4 PDF)
  const auditLogsExportData: TileExportData = useMemo(() => {
    return {
      filename: `Enterprise_Audit_Events_Ledger_${new Date().toISOString().slice(0, 10)}`,
      reportTitle: 'Enterprise System Audit Trail & Forensics Registry',
      subtitle: 'Government of Sri Lanka • Ministry of Education • Official Forensic Log',
      headers: [
        'Timestamp (SLST)',
        'Officer / User',
        'Organization',
        'Category',
        'Action',
        'Entity Type',
        'Entity ID',
        'Summary',
        'Severity',
      ],
      rows: logs.map((log) => [
        new Date(log.timestamp).toLocaleString('en-GB', { timeZone: 'Asia/Colombo' }),
        log.username || 'System',
        log.organizationName || 'Ministry of Education',
        log.category || 'General',
        log.action,
        log.entityType || '-',
        log.entityId || '-',
        log.summary || '-',
        log.severity || 'INFO',
      ]),
      summaryStats: [
        { label: 'Total in Ledger', value: totalInDb },
        { label: 'Current Filter', value: logs.length },
        { label: 'Security Auth', value: stats?.securityCount ?? 0 },
        { label: 'Financial / Budget', value: stats?.financialCount ?? 0 },
        { label: 'Governance Logs', value: stats?.governanceCount ?? 0 },
        { label: 'High / Critical', value: (stats?.criticalCount ?? 0) + (stats?.warningCount ?? 0) },
      ],
      copySummaryText: `Enterprise System Audit Trail: Showing ${logs.length} of ${totalInDb} events. Security: ${stats?.securityCount ?? 0}, Financial: ${stats?.financialCount ?? 0}, Governance: ${stats?.governanceCount ?? 0}.`,
      orientation: 'landscape',
    };
  }, [logs, totalInDb, stats]);

  // Helper: Format SLST Timestamp
  const formatSLST = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleString('en-GB', {
        timeZone: 'Asia/Colombo',
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      }) + ' SLST';
    } catch {
      return isoString;
    }
  };

  // Helper: Relative time ago
  const formatTimeAgo = (isoString: string) => {
    try {
      const diffSec = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
      if (diffSec < 60) return `${diffSec}s ago`;
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
      return `${Math.floor(diffSec / 86400)}d ago`;
    } catch {
      return '';
    }
  };

  // Distinct Entity Types in dataset
  const distinctEntityTypes = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((l) => {
      if (l.entityType) set.add(l.entityType);
    });
    return Array.from(set).sort();
  }, [logs]);

  // Distinct Users in dataset
  const distinctUsers = useMemo(() => {
    const map = new Map<string, string>();
    logs.forEach((l) => {
      if (l.username) map.set(l.username, l.userFullName || l.username);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [logs]);

  // ═════════════════════════════════════════════════════════════════════════════
  // NON-SUPERADMIN SECURITY GATE / RESTRICTED ACCESS SCREEN
  // ═════════════════════════════════════════════════════════════════════════════
  if (status === 'authenticated' && !isSuperAdmin) {
    return (
      <AppShell>
        <div style={{ maxWidth: '800px', margin: '4rem auto', padding: '0 1rem', textAlign: 'center' }}>
          <div style={{
            background: 'linear-gradient(135deg, #FFF5F5 0%, #FED7D7 100%)',
            border: '2px solid #E53E3E',
            borderRadius: '16px',
            padding: '3rem 2.5rem',
            boxShadow: '0 8px 30px rgba(229, 62, 62, 0.15)'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              margin: '0 auto 1.5rem auto',
              background: '#E53E3E',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2.5rem',
              color: '#fff',
              boxShadow: '0 4px 14px rgba(229, 62, 62, 0.4)'
            }}>
              🛡️
            </div>

            <span className="badge" style={{
              background: '#C53030',
              color: '#fff',
              fontWeight: 800,
              fontSize: '0.8rem',
              padding: '0.35rem 0.85rem',
              letterSpacing: '0.05em'
            }}>
              SECURITY BARRIER • ACCESS RESTRICTED
            </span>

            <h1 style={{ fontSize: '1.85rem', fontWeight: 900, color: '#9B2C2C', margin: '1rem 0 0.5rem 0' }}>
              Super Administrator Authority Required
            </h1>

            <p style={{ fontSize: '1rem', color: '#742A2A', maxWidth: '600px', margin: '0 auto 1.75rem auto', lineHeight: 1.6 }}>
              The <strong>Enterprise System Audit Trail & Forensics Registry</strong> contains confidential system-wide governance records, user authentication traces, and financial modification ledgers.
            </p>

            <div style={{
              background: 'rgba(255, 255, 255, 0.85)',
              borderRadius: '10px',
              padding: '1.25rem 1.5rem',
              maxWidth: '520px',
              margin: '0 auto 2rem auto',
              textAlign: 'left',
              border: '1px solid #FEB2B2',
              fontSize: '0.88rem'
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.5rem', marginBottom: '0.4rem' }}>
                <strong style={{ color: '#4A5568' }}>Current User:</strong>
                <span style={{ fontWeight: 700, color: '#2D3748' }}>{user?.username} ({user?.name || user?.fullName})</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.5rem', marginBottom: '0.4rem' }}>
                <strong style={{ color: '#4A5568' }}>Assigned Role:</strong>
                <span style={{ color: '#2D3748' }}>{user?.roleName || user?.roleId || 'Branch Officer'}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.5rem' }}>
                <strong style={{ color: '#4A5568' }}>Branch / Unit:</strong>
                <span style={{ color: '#2D3748' }}>{user?.organizationName || 'Line Ministry'}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <Link href="/budget-forecasting" className="btn btn-primary" style={{ padding: '0.75rem 1.75rem', fontWeight: 700 }}>
                Return to Main Menu
              </Link>
              <Link href="/reports" className="btn btn-secondary" style={{ padding: '0.75rem 1.5rem', fontWeight: 600 }}>
                View Operational Reports
              </Link>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // SUPER ADMINISTRATOR AUDIT CONSOLE VIEW
  // ═════════════════════════════════════════════════════════════════════════════
  return (
    <AppShell>
      <div style={{ maxWidth: '1440px', margin: '0 auto', paddingBottom: '3.5rem' }}>

        {/* ── Page Header & Action Controls ── */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.75rem',
          paddingBottom: '1.5rem',
          borderBottom: '1px solid var(--border-light)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
              <span className="badge" style={{
                background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
                color: '#fff',
                fontSize: '0.75rem',
                fontWeight: 800,
                padding: '0.25rem 0.65rem',
                letterSpacing: '0.04em'
              }}>
                🔒 SUPER ADMIN AUDIT VAULT
              </span>
              <span className="badge badge-success" style={{ fontSize: '0.72rem', fontWeight: 700 }}>
                ISO 27001 & GDS Auditability Standard
              </span>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)' }}>
                Immutable Governance & Operational Ledger
              </span>
            </div>

            <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--primary)', margin: 0, letterSpacing: '-0.02em' }}>
              System-Wide Audit Trail & Forensics Registry
            </h1>
            <p style={{ margin: '0.35rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
              Complete chronological audit trail capturing all user actions, security authentications, financial allocations, AIP approvals, and monitoring verifications across the Ministry.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => fetchLogs(true)}
              className="btn btn-secondary btn-sm"
              disabled={refreshing}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}
              title="Refresh live stream"
            >
              <span>{refreshing ? '⏳' : '🔄'}</span>
              <span>{refreshing ? 'Syncing...' : 'Refresh Stream'}</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="btn btn-secondary btn-sm"
              disabled={logs.length === 0}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}
              title="Export filtered records to CSV"
            >
              <span>📥</span> Export CSV
            </button>

            <button
              onClick={() => window.print()}
              className="btn btn-primary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}
            >
              <span>🖨️</span> Print / PDF
            </button>
          </div>
        </div>

        {/* ── Metric KPI Cards ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          {/* Card 1: Total Audited Events */}
          <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--primary)', background: '#fff' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Total Logged Events
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 900, color: 'var(--primary)', margin: '0.25rem 0' }}>
              {stats?.total ?? totalInDb}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
              Retained in high-speed registry
            </div>
          </div>

          {/* Card 2: Security & Authentication */}
          <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #4F46E5', background: '#fff' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Security & Auth
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#4F46E5', margin: '0.25rem 0' }}>
              {stats?.securityCount ?? 0}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
              Logins, sessions & auth events
            </div>
          </div>

          {/* Card 3: Governance & Approvals */}
          <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #00534E', background: '#fff' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Governance & AIP
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#00534E', margin: '0.25rem 0' }}>
              {stats?.governanceCount ?? 0}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
              Plan submissions & approvals
            </div>
          </div>

          {/* Card 4: Financial & Budget */}
          <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #D97706', background: '#fff' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Financial Actions
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#D97706', margin: '0.25rem 0' }}>
              {stats?.financialCount ?? 0}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
              Proposals, votes & revisions
            </div>
          </div>

          {/* Card 5: Operational Events */}
          <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #2563EB', background: '#fff' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Operational Actions
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#2563EB', margin: '0.25rem 0' }}>
              {stats?.operationalCount ?? 0}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
              Workshops, resource persons & QA
            </div>
          </div>

          {/* Card 6: Critical & Warnings */}
          <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #DC2626', background: '#fff' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Critical & Warnings
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#DC2626', margin: '0.25rem 0' }}>
              {(stats?.criticalCount ?? 0) + (stats?.warningCount ?? 0)}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
              {stats?.criticalCount ?? 0} Critical • {stats?.warningCount ?? 0} Warnings
            </div>
          </div>
        </div>

        {/* ── Multi-Parameter Filter & Search Bar ── */}
        <div className="card" style={{
          padding: '1.5rem',
          marginBottom: '1.75rem',
          background: 'linear-gradient(180deg, #FFFFFF 0%, #FAFAFA 100%)',
          border: '1px solid var(--border-default)',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
        }}>
          <form onSubmit={handleSearchSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>

              {/* Search Box */}
              <div style={{ gridColumn: 'span 2' }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.84rem' }}>
                  🔍 Search Audit Ledger
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Search by action, user, summary, entity ID, keywords..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <button type="submit" className="btn btn-primary btn-sm" style={{ fontWeight: 700, padding: '0 1.25rem' }}>
                    Search
                  </button>
                </div>
              </div>

              {/* Category Filter */}
              <div>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.84rem' }}>
                  Action Category
                </label>
                <select
                  className="form-input"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <option value="all">All Categories</option>
                  <option value="Governance">🏛️ Governance</option>
                  <option value="Financial">💰 Financial</option>
                  <option value="Operational">⚙️ Operational</option>
                  <option value="Security">🔒 Security</option>
                </select>
              </div>

              {/* Severity Filter */}
              <div>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.84rem' }}>
                  Severity Level
                </label>
                <select
                  className="form-input"
                  value={selectedSeverity}
                  onChange={(e) => setSelectedSeverity(e.target.value)}
                >
                  <option value="all">All Severities</option>
                  <option value="Info">ℹ️ Info</option>
                  <option value="Warning">⚠️ Warning</option>
                  <option value="Critical">🛑 Critical</option>
                </select>
              </div>

              {/* Entity Type Filter */}
              <div>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.84rem' }}>
                  Target Entity Type
                </label>
                <select
                  className="form-input"
                  value={selectedEntityType}
                  onChange={(e) => setSelectedEntityType(e.target.value)}
                >
                  <option value="all">All Entity Types</option>
                  {distinctEntityTypes.map((et) => (
                    <option key={et} value={et}>{et}</option>
                  ))}
                </select>
              </div>

              {/* Officer / User Filter */}
              <div>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.84rem' }}>
                  Action Taken By (User)
                </label>
                <select
                  className="form-input"
                  value={selectedUsername}
                  onChange={(e) => setSelectedUsername(e.target.value)}
                >
                  <option value="all">All Users & Officers</option>
                  {distinctUsers.map(([uname, fullname]) => (
                    <option key={uname} value={uname}>
                      {fullname} ({uname})
                    </option>
                  ))}
                </select>
              </div>

              {/* Date From */}
              <div>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.84rem' }}>
                  From Date
                </label>
                <input
                  type="date"
                  className="form-input"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              {/* Date To */}
              <div>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.84rem' }}>
                  To Date
                </label>
                <input
                  type="date"
                  className="form-input"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>

              {/* Reset Filter Button */}
              <div>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="btn btn-ghost btn-sm"
                  style={{ width: '100%', fontWeight: 600 }}
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* ── Error Banner ── */}
        {error && (
          <div style={{
            background: 'rgba(211, 47, 47, 0.08)',
            border: '2px solid var(--error)',
            borderRadius: '10px',
            padding: '1rem 1.25rem',
            marginBottom: '1.5rem',
            color: 'var(--error)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <span style={{ fontSize: '1.3rem' }}>⚠️</span>
            <div>
              <strong>Error Loading Audit Trail:</strong> {error}
            </div>
          </div>
        )}

        {/* ── Audit Trail Ledger Table ── */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border-default)', boxShadow: '0 4px 16px rgba(0, 0, 0, 0.05)' }}>
          <div style={{
            padding: '1.25rem 1.5rem',
            background: '#F8FAFC',
            borderBottom: '1px solid var(--border-light)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.1rem' }}>📋</span>
              <strong style={{ fontSize: '0.98rem', color: 'var(--text-primary)' }}>
                Audit Events Ledger
              </strong>
              <span className="badge" style={{ background: '#E2E8F0', color: '#334155', fontSize: '0.75rem', fontWeight: 700 }}>
                Showing {logs.length} matching events (of {totalInDb} total)
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)' }}>
                Ordered by timestamp (newest first) • Cryptographically verifiable UUID
              </div>
              <TileActionMenu
                tileTitle="Enterprise System Audit Trail & Forensics Registry"
                exportData={auditLogsExportData}
                onRefresh={() => fetchLogs(true)}
                position="right"
              />
            </div>
          </div>

          {loading ? (
            <div style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <span className="spinner-border text-primary" role="status" style={{ display: 'inline-block', width: '2rem', height: '2rem', marginBottom: '1rem' }}></span>
              <p style={{ margin: 0, fontWeight: 600 }}>Loading secure audit records from database...</p>
            </div>
          ) : logs.length === 0 ? (
            <div style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🔍</div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>No Audit Records Found</h3>
              <p style={{ margin: '0.35rem 0 1.25rem 0', fontSize: '0.88rem' }}>
                No events match your selected filters. Try clearing your search or date criteria.
              </p>
              <button onClick={handleResetFilters} className="btn btn-secondary btn-sm" style={{ fontWeight: 600 }}>
                Reset Filters
              </button>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ margin: 0, width: '100%', fontSize: '0.86rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#F1F5F9', borderBottom: '1px solid var(--border-default)', textAlign: 'left' }}>
                    <th style={{ padding: '0.75rem 1rem', width: '190px' }}>Timestamp (SLST)</th>
                    <th style={{ padding: '0.75rem 1rem', width: '210px' }}>Officer / User</th>
                    <th style={{ padding: '0.75rem 1rem', width: '130px' }}>Category</th>
                    <th style={{ padding: '0.75rem 1rem', width: '100px' }}>Severity</th>
                    <th style={{ padding: '0.75rem 1rem', width: '190px' }}>Action Code</th>
                    <th style={{ padding: '0.75rem 1rem', minWidth: '320px' }}>Summary / Target Entity</th>
                    <th style={{ padding: '0.75rem 1rem', width: '100px', textAlign: 'center' }}>Inspect</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => {
                    const isCrit = log.severity === 'Critical';
                    const isWarn = log.severity === 'Warning';

                    return (
                      <tr
                        key={log.id}
                        style={{
                          borderBottom: '1px solid #EDF2F7',
                          background: isCrit ? 'rgba(254, 226, 226, 0.25)' : isWarn ? 'rgba(254, 243, 199, 0.2)' : 'transparent',
                          transition: 'background 0.15s ease'
                        }}
                      >
                        {/* 1. Timestamp */}
                        <td style={{ padding: '0.85rem 1rem', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                          <div style={{ fontWeight: 700, color: '#1E293B' }}>
                            {formatSLST(log.timestamp)}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.15rem' }}>
                            <span>⏱️ {formatTimeAgo(log.timestamp)}</span>
                          </div>
                        </td>

                        {/* 2. Officer / User */}
                        <td style={{ padding: '0.85rem 1rem', verticalAlign: 'top' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              background: 'var(--primary-10)',
                              color: 'var(--primary)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '0.8rem',
                              flexShrink: 0
                            }}>
                              {(log.userFullName || log.username || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, color: '#0F172A', lineHeight: 1.2 }}>
                                {log.userFullName || log.username}
                              </div>
                              <div style={{ fontSize: '0.74rem', color: '#64748B' }}>
                                <span style={{ fontFamily: 'monospace' }}>@{log.username}</span>
                              </div>
                              <div style={{ fontSize: '0.7rem', color: '#475569', marginTop: '0.1rem' }}>
                                {log.organizationName || 'Line Ministry'}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 3. Category */}
                        <td style={{ padding: '0.85rem 1rem', verticalAlign: 'top' }}>
                          <span className="badge" style={{
                            padding: '0.25rem 0.55rem',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            borderRadius: '4px',
                            background:
                              log.category === 'Security' ? '#EEF2FF' :
                              log.category === 'Financial' ? '#FEF3C7' :
                              log.category === 'Governance' ? '#E6FFFA' : '#F1F5F9',
                            color:
                              log.category === 'Security' ? '#4338CA' :
                              log.category === 'Financial' ? '#92400E' :
                              log.category === 'Governance' ? '#047857' : '#334155',
                            border: `1px solid ${
                              log.category === 'Security' ? '#C7D2FE' :
                              log.category === 'Financial' ? '#FDE68A' :
                              log.category === 'Governance' ? '#A7F3D0' : '#CBD5E1'
                            }`
                          }}>
                            {log.category === 'Security' ? '🔒 Security' :
                             log.category === 'Financial' ? '💰 Financial' :
                             log.category === 'Governance' ? '🏛️ Governance' : '⚙️ Operational'}
                          </span>
                        </td>

                        {/* 4. Severity */}
                        <td style={{ padding: '0.85rem 1rem', verticalAlign: 'top' }}>
                          <span className="badge" style={{
                            padding: '0.25rem 0.55rem',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            borderRadius: '4px',
                            background:
                              isCrit ? '#FEE2E2' :
                              isWarn ? '#FEF3C7' : '#F0FDF4',
                            color:
                              isCrit ? '#991B1B' :
                              isWarn ? '#92400E' : '#166534',
                            border: `1px solid ${
                              isCrit ? '#F87171' :
                              isWarn ? '#FBBF24' : '#86EFAC'
                            }`
                          }}>
                            {isCrit ? '🛑 Critical' : isWarn ? '⚠️ Warning' : '● Info'}
                          </span>
                        </td>

                        {/* 5. Action Code */}
                        <td style={{ padding: '0.85rem 1rem', verticalAlign: 'top' }}>
                          <code style={{
                            background: '#F1F5F9',
                            padding: '0.25rem 0.45rem',
                            borderRadius: '4px',
                            fontSize: '0.78rem',
                            fontWeight: 800,
                            color: '#1E293B',
                            display: 'inline-block',
                            border: '1px solid #E2E8F0'
                          }}>
                            {log.action}
                          </code>
                          <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '0.2rem' }}>
                            Entity: <strong style={{ color: '#334155' }}>{log.entityType}</strong>
                          </div>
                        </td>

                        {/* 6. Summary / Target Entity */}
                        <td style={{ padding: '0.85rem 1rem', verticalAlign: 'top' }}>
                          <div style={{ fontWeight: 600, color: '#1E293B', lineHeight: 1.45 }}>
                            {log.summary}
                          </div>
                          {log.entityId && log.entityId !== 'none' && (
                            <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '0.25rem' }}>
                              Ref ID: <code style={{ fontSize: '0.72rem', color: '#475569' }}>{log.entityId}</code>
                            </div>
                          )}
                        </td>

                        {/* 7. Action / Inspect Button */}
                        <td style={{ padding: '0.85rem 1rem', verticalAlign: 'top', textAlign: 'center' }}>
                          <button
                            onClick={() => setSelectedLog(log)}
                            className="btn btn-secondary btn-sm"
                            style={{
                              padding: '0.35rem 0.65rem',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              whiteSpace: 'nowrap'
                            }}
                            title="Inspect complete payload, metadata and IP address"
                          >
                            🔍 Inspect
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════════════════
            INSPECTION PAYLOAD MODAL
            ═══════════════════════════════════════════════════════════════════════ */}
        {selectedLog && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.65)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: '1rem',
              backdropFilter: 'blur(3px)'
            }}
            onClick={() => setSelectedLog(null)}
          >
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '16px',
                maxWidth: '750px',
                width: '100%',
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
                animation: 'fadeIn 0.2s ease-in-out'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div style={{
                padding: '1.25rem 1.75rem',
                borderBottom: '1px solid var(--border-light)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#F8FAFC'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span style={{ fontSize: '1.3rem' }}>🔍</span>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary)' }}>
                      Audit Event Inspector & Forensic Payload
                    </h3>
                    <span style={{ fontSize: '0.78rem', color: '#64748B' }}>
                      Cryptographic Log ID: <code style={{ fontWeight: 700 }}>{selectedLog.id}</code>
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedLog(null)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    fontSize: '1.4rem',
                    cursor: 'pointer',
                    color: '#64748B',
                    lineHeight: 1
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Modal Body */}
              <div style={{ padding: '1.5rem 1.75rem', overflowY: 'auto' }}>

                {/* Primary Overview */}
                <div style={{
                  background: '#F1F5F9',
                  borderRadius: '10px',
                  padding: '1rem 1.25rem',
                  marginBottom: '1.25rem',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '0.75rem',
                  fontSize: '0.85rem'
                }}>
                  <div>
                    <span style={{ color: '#64748B', fontSize: '0.78rem' }}>Timestamp (SLST):</span>
                    <div style={{ fontWeight: 800, color: '#0F172A' }}>{formatSLST(selectedLog.timestamp)}</div>
                  </div>
                  <div>
                    <span style={{ color: '#64748B', fontSize: '0.78rem' }}>Action Executed:</span>
                    <div style={{ fontWeight: 800, color: 'var(--primary)' }}>{selectedLog.action}</div>
                  </div>
                  <div>
                    <span style={{ color: '#64748B', fontSize: '0.78rem' }}>Officer Name:</span>
                    <div style={{ fontWeight: 800, color: '#0F172A' }}>
                      {selectedLog.userFullName || selectedLog.username} (@{selectedLog.username})
                    </div>
                  </div>
                  <div>
                    <span style={{ color: '#64748B', fontSize: '0.78rem' }}>Branch / Unit:</span>
                    <div style={{ fontWeight: 800, color: '#0F172A' }}>{selectedLog.organizationName || 'Line Ministry'}</div>
                  </div>
                  <div>
                    <span style={{ color: '#64748B', fontSize: '0.78rem' }}>Category & Severity:</span>
                    <div style={{ fontWeight: 800, color: selectedLog.severity === 'Critical' ? '#DC2626' : selectedLog.severity === 'Warning' ? '#D97706' : '#166534' }}>
                      {selectedLog.category} • {selectedLog.severity}
                    </div>
                  </div>
                  <div>
                    <span style={{ color: '#64748B', fontSize: '0.78rem' }}>Target Entity:</span>
                    <div style={{ fontWeight: 800, color: '#0F172A' }}>
                      {selectedLog.entityType} ({selectedLog.entityId})
                    </div>
                  </div>
                </div>

                {/* Event Summary */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase' }}>
                    Event Summary / Description
                  </label>
                  <div style={{
                    padding: '0.75rem 1rem',
                    background: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    color: '#1E293B',
                    marginTop: '0.35rem'
                  }}>
                    {selectedLog.summary}
                  </div>
                </div>

                {/* Forensic Payload Details JSON */}
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase' }}>
                      Audit Details & State Payload (JSON)
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(JSON.stringify(selectedLog, null, 2));
                        setCopyFeedback(true);
                        setTimeout(() => setCopyFeedback(false), 2000);
                      }}
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: '0.75rem', fontWeight: 700 }}
                    >
                      {copyFeedback ? '✓ Copied to Clipboard!' : '📋 Copy JSON Payload'}
                    </button>
                  </div>

                  <pre style={{
                    background: '#0F172A',
                    color: '#38BDF8',
                    padding: '1.25rem',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    overflowX: 'auto',
                    margin: 0,
                    lineHeight: 1.5,
                    border: '1px solid #1E293B',
                    fontFamily: 'Consolas, Monaco, monospace'
                  }}>
                    {JSON.stringify(selectedLog.details && Object.keys(selectedLog.details).length > 0 ? selectedLog.details : { message: 'No extended payload attributes recorded for this event.' }, null, 2)}
                  </pre>
                </div>

                {/* Network / Client Footprint */}
                <div style={{
                  padding: '0.75rem 1rem',
                  background: '#F8FAFC',
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                  fontSize: '0.78rem',
                  color: '#64748B'
                }}>
                  <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                    <span><strong>Client IP:</strong> {selectedLog.ipAddress || '127.0.0.1 (Internal Host)'}</span>
                    <span><strong>User Agent:</strong> {selectedLog.userAgent || 'Enterprise Browser Client'}</span>
                  </div>
                </div>

              </div>

              {/* Modal Footer */}
              <div style={{
                padding: '1rem 1.75rem',
                borderTop: '1px solid var(--border-light)',
                display: 'flex',
                justifyContent: 'flex-end',
                background: '#F8FAFC'
              }}>
                <button
                  type="button"
                  onClick={() => setSelectedLog(null)}
                  className="btn btn-secondary btn-sm"
                  style={{ fontWeight: 700 }}
                >
                  Close Inspector
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </AppShell>
  );
}
