'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

export interface DirectiveItem {
  id: string;
  category: 'Performance' | 'Financial' | 'Statutory' | 'Operational';
  severity: 'Critical' | 'High' | 'Strategic' | 'Normal';
  derivedFrom: string;
  title: string;
  background: string;
  rootCause?: string;
  recommendedAction: string;
  responsibleLead: string;
  actionUrl: string;
  actionLabel: string;
  targetEntity?: string;
  dueDate?: string;
  statusBadge?: string;
}

const STATIC_DIRECTIVES: DirectiveItem[] = [
  // 1. Critical Performance Directives (Derived from Provincial Traffic Lights & Stalled Issues)
  {
    id: 'rec-uva-01',
    category: 'Performance',
    severity: 'Critical',
    derivedFrom: 'Provincial Traffic Light Monitor (Uva Province: 44% - Red)',
    title: 'Uva Province: Critical Deficit in Science Infrastructure Delivery (<50%)',
    background: 'Uva Province is currently at 44% physical progress, the lowest in the national traffic-light matrix. 18 rural schools in Badulla and Monaragala have halted science room conversions.',
    rootCause: 'Treated timber scarcity for science bench framing due to State Timber Corporation quota exhaustion in the northern regional depot (Delayed 34 days).',
    recommendedAction: 'Execute emergency quota reallocation from Anuradhapura central depot; dispatch provincial building engineering taskforce to verify bench installation within 7 days.',
    responsibleLead: 'Provincial Building Engineer & Zonal Planning Directors',
    actionUrl: '/monitoring',
    actionLabel: 'Inspect Province Telemetry →',
    targetEntity: 'Uva Province (Badulla / Monaragala)',
    statusBadge: '🔴 Red (<50%)',
  },
  {
    id: 'rec-sab-01',
    category: 'Performance',
    severity: 'Critical',
    derivedFrom: 'Provincial Traffic Light Monitor (Sabaragamuwa: 48% - Red)',
    title: 'Sabaragamuwa Province: Solar Inverter Customs Clearance Bottleneck (<50%)',
    background: 'Sabaragamuwa Province is operating at 48% overall progress due to delayed solar renewable installation in off-grid rural secondary schools.',
    rootCause: 'Port customs clearance documents required Ministry tax exemption letter, delaying equipment release at Colombo port for 26 days.',
    recommendedAction: 'Ministry Secretary signed formal customs exemption certificate; Provincial Planning Deputy Director must clear shipments and begin installation by Friday.',
    responsibleLead: 'Provincial Planning Deputy Director & Port Clearing Agent',
    actionUrl: '/monitoring',
    actionLabel: 'Open Field Observations →',
    targetEntity: 'Sabaragamuwa Province (Ratnapura)',
    statusBadge: '🔴 Red (<50%)',
  },
  {
    id: 'rec-np-01',
    category: 'Performance',
    severity: 'High',
    derivedFrom: 'Provincial Traffic Light Monitor (Northern Province: 62% - Light Red)',
    title: 'Northern Province: Marine Science Lab Civil Works Stalled',
    background: 'Northern Province sits at 62% progress. Marine science aquarium and wet-lab construction in Jaffna coastal schools is 21 days behind schedule.',
    rootCause: 'Specialist glass panel reinforcement contractor delayed glass panel delivery from regional vendor.',
    recommendedAction: 'Issue liquidated damages notice to default vendor; schedule an on-site QA verification inspection from the MOE Monitoring Branch.',
    responsibleLead: 'Provincial Infrastructure Engineer & Jaffna Zonal Director',
    actionUrl: '/monitoring',
    actionLabel: 'Verify QA Progress →',
    targetEntity: 'Northern Province (Jaffna)',
    statusBadge: '🔴 Light Red (50-69%)',
  },

  // 2. Financial & Budget Execution Directives (Derived from Budget Ledger & Object Codes)
  {
    id: 'rec-fin-01',
    category: 'Financial',
    severity: 'High',
    derivedFrom: 'Treasury Budget Execution Ledger (Capital Vote Head 2105)',
    title: 'Capital Vote 2105 (ICT Hardware): Low Utilization Rate (42%)',
    background: 'Total capital hardware allocation of Rs. 145.0 Mn has only achieved 42% disbursement with 45 days remaining before annual fiscal closing.',
    rootCause: 'Technical Evaluation Committees (TEC) for multimedia projectors and smart lab servers are pending specification approvals.',
    recommendedAction: 'Fast-track final TEC evaluation sign-offs this week. In case of tender delays, prepare formal virement reallocation requests to recurrent teacher training vote 2101.',
    responsibleLead: 'MOE Chief Accountant & ICT Procurement Directorate',
    actionUrl: '/budget-forecasting',
    actionLabel: 'Adjust Vote Allocations →',
    targetEntity: 'Vote Code 2105 (Capital ICT Equipment)',
    statusBadge: '💰 Financial Warning',
  },
  {
    id: 'rec-fin-02',
    category: 'Financial',
    severity: 'Strategic',
    derivedFrom: 'Workshop Management Ledger & Honoraria Accounts (Vote 2102)',
    title: 'Fast-Track Facilitator Honoraria Payments for 50 Concluded Workshops',
    background: '50 workshops across 9 provinces have successfully concluded, but pending trainer payment vouchers remain unliquidated under Vote Code 2102.',
    recommendedAction: 'Disburse approved facilitator honoraria and trainee travel claims under Circular ED/CIR/2026/WS-12 to maintain trainer pool retention for 2027.',
    responsibleLead: 'Branch Financial Officers & Zonal Accounts Units',
    actionUrl: '/reports',
    actionLabel: 'View Completed Audit →',
    targetEntity: 'Vote Code 2102 (Facilitator Honoraria)',
    statusBadge: '✓ Concluded Audits',
  },

  // 3. Statutory Deadlines & Ministry Circular Directives (Derived from Deadlines & Announcements)
  {
    id: 'rec-stat-01',
    category: 'Statutory',
    severity: 'Critical',
    derivedFrom: 'Ministry Circular ED/CIR/2026/AIP-04 & Statutory Deadlines',
    title: 'Statutory Deadline: Final AIP 2027 Submission (Due 15 Dec 2026)',
    background: 'National Annual Implementation Plan portal for Financial Year 2027 requires full draft completion across all 20 MoE Headquarters Divisions and 9 Provincial Departments.',
    recommendedAction: 'All branch officers must move drafted activities to "Submitted" status with assigned Treasury Vote Numbers and quarterly milestones before the portal lockdown.',
    responsibleLead: 'All Heads of Divisions & Provincial Education Directors',
    actionUrl: '/annual-plan',
    actionLabel: 'Go to Annual Plan →',
    dueDate: '2026-12-15',
    statusBadge: '⏳ Due in 32 Days',
  },
  {
    id: 'rec-stat-02',
    category: 'Statutory',
    severity: 'High',
    derivedFrom: 'SuperAdmin Statutory Directives & Circular ED/MEMO/2026/AUD-02',
    title: 'Digital Verification & Evidence Attachment Mandate for Progress Claims >80%',
    background: 'Under the revised Performance Management Framework, all physical progress claims exceeding 80% must be supported by uploaded evidence files.',
    recommendedAction: 'Ensure implementing branches attach signed trainee attendance registries, photo documentation, and completion sign-offs prior to authorization requests.',
    responsibleLead: 'Quality Assurance Directorate & Internal Audit',
    actionUrl: '/monitoring',
    actionLabel: 'Check Audit Evidence →',
    dueDate: '2026-12-31',
    statusBadge: '📜 Policy Directive',
  },
  {
    id: 'rec-stat-03',
    category: 'Statutory',
    severity: 'Strategic',
    derivedFrom: 'Treasury Budget Call Circular & Medium-Term Expenditure Framework (MTEF)',
    title: 'Treasury Budget Ceilings & Object-Code Allocations (Due 20 Dec 2026)',
    background: 'General Planning and Finance Division 1 must register approved Treasury ceiling breakdowns for all programmes and projects for 2027–2028 rolling plans.',
    recommendedAction: 'Planning Officer to verify branch ceiling alignment and resolve any outstanding ceiling variances before final dispatch to Treasury.',
    responsibleLead: 'MOE Planning Division Officer (@planning.officer)',
    actionUrl: '/budget-forecasting',
    actionLabel: 'Review Ceilings →',
    dueDate: '2026-12-20',
    statusBadge: '⏳ Due in 37 Days',
  },

  // 4. Operational & Capacity Building Instructions (Derived from Workshops Data)
  {
    id: 'rec-op-01',
    category: 'Operational',
    severity: 'Normal',
    derivedFrom: 'National Workshop Schedule (108 Scheduled Programs)',
    title: 'Call for Trainee Nominations for Upcoming IT & Pedagogy Workshops',
    background: '108 workshops are scheduled across Zonal IT Centers. Under Circular ED/CIR/2026/WS-12, trainee attendance rosters must be confirmed at least 14 days prior to start.',
    recommendedAction: 'Dispatch nomination circulars to Zonal Directors to enroll teachers and enter participant NICs into the Trainee Management Portal.',
    responsibleLead: 'Organizing Branch Officers & Zonal IT Coordinators',
    actionUrl: '/workshops',
    actionLabel: 'Manage Workshop Rosters →',
    targetEntity: 'Zonal IT Training Centers',
    statusBadge: '👥 108 Programs Scheduled',
  },
  {
    id: 'rec-op-02',
    category: 'Operational',
    severity: 'High',
    derivedFrom: 'Central Province Monitoring Observation (Central Province: 92%)',
    title: 'Central Province: Reroute Mobile STEM Kits via 4WD Fleet',
    background: 'Heavy rainfall in Nuwara Eliya and Hatton blocked primary access roads to 6 plantation secondary schools, delaying mobile science kits by 12 days.',
    recommendedAction: 'Zonal Transport Coordinator to dispatch provincial 4WD utility fleet by 18 Nov to ensure laboratory classes resume on schedule.',
    responsibleLead: 'Zonal Transport Coordinator & Science Deputy Director',
    actionUrl: '/monitoring',
    actionLabel: 'View Corrective Action →',
    targetEntity: 'Central Province (Hatton / Nuwara Eliya)',
    statusBadge: '🟢 Light Green (92%)',
  },
];

export default function RecommendationsAndInstructionsTile({ workshops = [] }: { workshops?: any[] }) {
  const { data: session } = useSession();
  const user = session?.user as any;

  const [activeTab, setActiveTab] = useState<'all' | 'Performance' | 'Financial' | 'Statutory' | 'Operational'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [acknowledgedIds, setAcknowledgedIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Load acknowledged directives from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('ipmis_acknowledged_directives');
      if (saved) {
        setAcknowledgedIds(new Set(JSON.parse(saved)));
      }
    } catch {}
  }, []);

  const toggleAcknowledge = (id: string) => {
    setAcknowledgedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      try {
        localStorage.setItem('ipmis_acknowledged_directives', JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  };

  const handleCopyDirective = (directive: DirectiveItem) => {
    const text = `[IPMIS DIRECTIVE - ${directive.severity.toUpperCase()}]\n${directive.title}\n\nBackground: ${directive.background}\n${directive.rootCause ? `Root Cause: ${directive.rootCause}\n` : ''}Recommended Action: ${directive.recommendedAction}\nResponsible Lead: ${directive.responsibleLead}\nSource: ${directive.derivedFrom}`;
    navigator.clipboard?.writeText(text);
    setCopiedId(directive.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filtered directives
  const filteredDirectives = useMemo(() => {
    return STATIC_DIRECTIVES.filter((d) => {
      const matchesTab = activeTab === 'all' || d.category === activeTab;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        d.title.toLowerCase().includes(q) ||
        d.background.toLowerCase().includes(q) ||
        (d.rootCause && d.rootCause.toLowerCase().includes(q)) ||
        d.recommendedAction.toLowerCase().includes(q) ||
        d.responsibleLead.toLowerCase().includes(q) ||
        d.derivedFrom.toLowerCase().includes(q);

      return matchesTab && matchesSearch;
    });
  }, [activeTab, searchQuery]);

  const stats = useMemo(() => {
    const criticalCount = STATIC_DIRECTIVES.filter((d) => d.severity === 'Critical').length;
    const highCount = STATIC_DIRECTIVES.filter((d) => d.severity === 'High').length;
    const statutoryCount = STATIC_DIRECTIVES.filter((d) => d.category === 'Statutory').length;
    const resolvedCount = acknowledgedIds.size;
    return { criticalCount, highCount, statutoryCount, resolvedCount };
  }, [acknowledgedIds]);

  return (
    <div
      className="card"
      style={{
        border: '1.5px solid #CBD5E1',
        borderRadius: '16px',
        background: '#FFFFFF',
        boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
        overflow: 'hidden',
        marginBottom: '1.75rem',
      }}
    >
      {/* ─── Top Banner ─── */}
      <div
        style={{
          padding: '1.25rem 1.5rem',
          background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
          color: '#FFFFFF',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          borderBottom: '2px solid #FFBE29',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'rgba(255, 190, 41, 0.2)',
              border: '1.5px solid #FFBE29',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.4rem',
              flexShrink: 0,
            }}
          >
            💡
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.01em' }}>
                Strategic Recommendations & Operational Instructions
              </h2>
              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  padding: '0.2rem 0.55rem',
                  borderRadius: '12px',
                  background: 'rgba(255, 190, 41, 0.25)',
                  color: '#FFBE29',
                  border: '1px solid rgba(255, 190, 41, 0.4)',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                Data-Driven Intelligence
              </span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#94A3B8', lineHeight: 1.4 }}>
              Directives synthesized from provincial traffic-light tracking, treasury budget outturns, statutory circulars, and ongoing field audits.
            </p>
          </div>
        </div>

        {/* Quick KPI Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.18)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: '8px',
              padding: '0.35rem 0.7rem',
              fontSize: '0.74rem',
              fontWeight: 700,
              color: '#FCA5A5',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}
          >
            <span>🚨</span> {stats.criticalCount} Critical Actions
          </div>
          <div
            style={{
              background: 'rgba(245, 158, 11, 0.18)',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              borderRadius: '8px',
              padding: '0.35rem 0.7rem',
              fontSize: '0.74rem',
              fontWeight: 700,
              color: '#FCD34D',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}
          >
            <span>⏳</span> {stats.statutoryCount} Statutory Deadlines
          </div>
          {stats.resolvedCount > 0 && (
            <div
              style={{
                background: 'rgba(16, 185, 129, 0.18)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                borderRadius: '8px',
                padding: '0.35rem 0.7rem',
                fontSize: '0.74rem',
                fontWeight: 700,
                color: '#6EE7B7',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              <span>✓</span> {stats.resolvedCount} Addressed
            </div>
          )}
        </div>
      </div>

      {/* ─── Filter Tabs & Search Bar ─── */}
      <div
        style={{
          padding: '0.85rem 1.25rem',
          background: '#F8FAFC',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        {/* Category Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: 'All Directives', icon: '📋', count: STATIC_DIRECTIVES.length },
            { id: 'Performance', label: 'Provincial Traffic Lights', icon: '🚦', count: STATIC_DIRECTIVES.filter((d) => d.category === 'Performance').length },
            { id: 'Financial', label: 'Treasury & Budgeting', icon: '💰', count: STATIC_DIRECTIVES.filter((d) => d.category === 'Financial').length },
            { id: 'Statutory', label: 'Deadlines & Circulars', icon: '📅', count: STATIC_DIRECTIVES.filter((d) => d.category === 'Statutory').length },
            { id: 'Operational', label: 'Workshop Logistics', icon: '🏫', count: STATIC_DIRECTIVES.filter((d) => d.category === 'Operational').length },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.4rem 0.8rem',
                  borderRadius: '20px',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: isActive ? '1.5px solid #8D153A' : '1px solid #CBD5E1',
                  background: isActive ? '#8D153A' : '#FFFFFF',
                  color: isActive ? '#FFFFFF' : '#475569',
                  transition: 'all 120ms ease',
                }}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                <span
                  style={{
                    padding: '0.05rem 0.4rem',
                    borderRadius: '10px',
                    fontSize: '0.68rem',
                    background: isActive ? 'rgba(255, 255, 255, 0.25)' : '#F1F5F9',
                    color: isActive ? '#FFFFFF' : '#64748B',
                  }}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div style={{ position: 'relative', minWidth: '220px' }}>
          <input
            type="text"
            placeholder="🔍 Filter directives by province, vote, or keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.4rem 0.75rem',
              fontSize: '0.76rem',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              background: '#FFFFFF',
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* ─── Directives List ─── */}
      <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
        {filteredDirectives.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748B' }}>
            <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.5rem' }}>🔍</span>
            <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>No Directives Match Your Filter</div>
            <p style={{ fontSize: '0.76rem', margin: '4px 0 0' }}>Try searching another keyword or select &ldquo;All Directives&rdquo;.</p>
          </div>
        ) : (
          filteredDirectives.map((d) => {
            const isAcknowledged = acknowledgedIds.has(d.id);

            const sevBorder =
              d.severity === 'Critical'
                ? '#DC2626'
                : d.severity === 'High'
                ? '#EA580C'
                : d.severity === 'Strategic'
                ? '#7C3AED'
                : '#0D9488';

            const sevBg =
              d.severity === 'Critical'
                ? '#FEF2F2'
                : d.severity === 'High'
                ? '#FFF7ED'
                : d.severity === 'Strategic'
                ? '#F5F3FF'
                : '#F0FDFA';

            const sevBadgeColor =
              d.severity === 'Critical'
                ? '#991B1B'
                : d.severity === 'High'
                ? '#C2410C'
                : d.severity === 'Strategic'
                ? '#6D28D9'
                : '#0F766E';

            return (
              <div
                key={d.id}
                style={{
                  border: `1.5px solid ${isAcknowledged ? '#E2E8F0' : sevBorder}`,
                  borderLeft: `5px solid ${isAcknowledged ? '#94A3B8' : sevBorder}`,
                  borderRadius: '10px',
                  background: isAcknowledged ? '#F8FAFC' : sevBg,
                  padding: '1rem 1.25rem',
                  transition: 'all 150ms ease',
                  opacity: isAcknowledged ? 0.75 : 1,
                }}
              >
                {/* Top Row: Meta badges, source, and quick actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.6rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {/* Severity Pill */}
                    <span
                      style={{
                        padding: '0.15rem 0.55rem',
                        borderRadius: '6px',
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        background: isAcknowledged ? '#CBD5E1' : sevBorder,
                        color: '#FFFFFF',
                      }}
                    >
                      {d.severity} Directive
                    </span>

                    {/* Derived Source Tag */}
                    <span
                      style={{
                        padding: '0.15rem 0.5rem',
                        borderRadius: '6px',
                        fontSize: '0.68rem',
                        fontWeight: 600,
                        background: 'rgba(15, 23, 42, 0.08)',
                        color: '#334155',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                      }}
                    >
                      <span>📊</span> {d.derivedFrom}
                    </span>

                    {/* Status Badge */}
                    {d.statusBadge && (
                      <span
                        style={{
                          padding: '0.15rem 0.5rem',
                          borderRadius: '6px',
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          background: 'rgba(255, 255, 255, 0.8)',
                          color: sevBadgeColor,
                          border: `1px solid ${sevBorder}40`,
                        }}
                      >
                        {d.statusBadge}
                      </span>
                    )}

                    {d.dueDate && (
                      <span
                        style={{
                          padding: '0.15rem 0.5rem',
                          borderRadius: '6px',
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          background: '#FEE2E2',
                          color: '#B91C1C',
                          border: '1px solid #FCA5A5',
                        }}
                      >
                        📅 Cutoff: {d.dueDate}
                      </span>
                    )}
                  </div>

                  {/* Actions Header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => handleCopyDirective(d)}
                      title="Copy directive details to clipboard"
                      style={{
                        background: 'transparent',
                        border: '1px solid #CBD5E1',
                        borderRadius: '6px',
                        padding: '0.2rem 0.5rem',
                        fontSize: '0.7rem',
                        color: '#64748B',
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                    >
                      {copiedId === d.id ? '✓ Copied' : '📋 Copy Memo'}
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleAcknowledge(d.id)}
                      title={isAcknowledged ? 'Mark as Unaddressed' : 'Mark as Acknowledged / In Action'}
                      style={{
                        background: isAcknowledged ? '#E2E8F0' : '#FFFFFF',
                        border: '1px solid #94A3B8',
                        borderRadius: '6px',
                        padding: '0.2rem 0.55rem',
                        fontSize: '0.7rem',
                        color: isAcknowledged ? '#334155' : '#0F172A',
                        cursor: 'pointer',
                        fontWeight: 700,
                      }}
                    >
                      {isAcknowledged ? '✓ Addressed' : 'Mark Done'}
                    </button>
                  </div>
                </div>

                {/* Title */}
                <h3
                  style={{
                    margin: '0 0 0.45rem',
                    fontSize: '0.96rem',
                    fontWeight: 800,
                    color: isAcknowledged ? '#64748B' : '#0F172A',
                    textDecoration: isAcknowledged ? 'line-through' : 'none',
                    lineHeight: 1.35,
                  }}
                >
                  {d.title}
                </h3>

                {/* Background & Context */}
                <p style={{ margin: '0 0 0.45rem', fontSize: '0.78rem', color: '#475569', lineHeight: 1.45 }}>
                  {d.background}
                </p>

                {/* Root Cause (If identified in telemetry) */}
                {d.rootCause && (
                  <div
                    style={{
                      background: 'rgba(255, 255, 255, 0.7)',
                      borderLeft: '3px solid #F59E0B',
                      padding: '0.45rem 0.75rem',
                      borderRadius: '0 6px 6px 0',
                      marginBottom: '0.5rem',
                      fontSize: '0.74rem',
                      color: '#78350F',
                      lineHeight: 1.4,
                    }}
                  >
                    <strong>Identified Bottleneck:</strong> {d.rootCause}
                  </div>
                )}

                {/* Operational Action Box */}
                <div
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    padding: '0.65rem 0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                    marginTop: '0.5rem',
                  }}
                >
                  <div style={{ flex: 1, minWidth: '240px' }}>
                    <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#64748B' }}>
                      ⚡ Required Operational Action
                    </div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0F172A', marginTop: '2px', lineHeight: 1.35 }}>
                      {d.recommendedAction}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: '3px' }}>
                      <strong>Responsible Authority:</strong> {d.responsibleLead}
                    </div>
                  </div>

                  {/* Direct Link Action Button */}
                  <Link
                    href={d.actionUrl}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      background: '#0F172A',
                      color: '#FFFFFF',
                      padding: '0.45rem 0.85rem',
                      borderRadius: '6px',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      textDecoration: 'none',
                      flexShrink: 0,
                      boxShadow: '0 2px 6px rgba(15, 23, 42, 0.15)',
                      transition: 'background 120ms ease',
                    }}
                  >
                    {d.actionLabel}
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
