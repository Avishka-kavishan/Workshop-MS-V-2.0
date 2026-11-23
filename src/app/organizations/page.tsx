'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import AppShell from '@/components/layout/AppShell';
import BranchBadge from '@/components/common/BranchBadge';
import { OFFICIAL_MOE_DIVISIONS_DATA } from '@/lib/hierarchyData';

export default function OrganizationsPage() {
  const { data: session } = useSession();
  const user = session?.user as any;

  const isAdminUser = Boolean(
    user?.isSuperAdmin === true ||
    (user?.adminLevel !== undefined && user?.adminLevel !== null && user?.adminLevel >= 0 && user?.adminLevel <= 5) ||
    ['superadmin', 'admin', 'moe', 'moe.admin', 'nie.admin', 'nie', 'ped.sp', 'provincial.admin', 'sp.admin', 'zeo.galle', 'zonal.admin', 'galle.admin', 'deo.galle', 'divisional.admin'].includes(user?.username) ||
    user?.roleName?.includes('Administrator') ||
    (user?.roleName?.includes('Level') && user?.roleName?.includes('Admin'))
  );

  const [organizations, setOrganizations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLevel, setSelectedLevel] = useState<number | 'all'>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function loadOrgs() {
      try {
        const res = await fetch('/api/organizations');
        if (res.ok) {
          const json = await res.json();
          setOrganizations(json.organizations || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadOrgs();
  }, []);

  const filteredOrgs = organizations.filter((org) => {
    const matchesLevel = selectedLevel === 'all' || org.level === selectedLevel;
    const matchesSearch =
      !search ||
      org.name.toLowerCase().includes(search.toLowerCase()) ||
      org.code?.toLowerCase().includes(search.toLowerCase()) ||
      org.typeName?.toLowerCase().includes(search.toLowerCase());
    return matchesLevel && matchesSearch;
  });

  const getLevelBadge = (level: number) => {
    switch (level) {
      case 1:
        return { label: 'Level 1: MoE / National Branch', color: 'var(--primary)', bg: 'var(--primary-10)', border: 'var(--primary)' };
      case 2:
        return { label: 'Level 2: National Apex (NIE/EPD/DoE)', color: '#7E22CE', bg: 'rgba(126, 34, 206, 0.1)', border: '#7E22CE' };
      case 3:
        return { label: 'Level 3: Province', color: 'var(--accent)', bg: 'var(--accent-10)', border: 'var(--accent)' };
      case 4:
        return { label: 'Level 4: Zone', color: 'var(--teal)', bg: 'var(--teal-10)', border: 'var(--teal)' };
      case 5:
        return { label: 'Level 5: Division', color: '#1565C0', bg: 'rgba(21, 101, 192, 0.1)', border: '#1565C0' };
      case 6:
        return { label: 'Level 6: School / Institution', color: 'var(--gold-dark)', bg: 'var(--gold-10)', border: 'var(--gold)' };
      default:
        return { label: `Level ${level}`, color: 'var(--text-secondary)', bg: 'var(--gray-100)', border: 'var(--border-default)' };
    }
  };

  if (session && !isAdminUser) {
    return (
      <AppShell>
        <div style={{ maxWidth: '800px', margin: '3.5rem auto', textAlign: 'center', padding: '2rem 1.5rem' }}>
          <div style={{
            background: '#FFF5F5',
            border: '2px solid #FEB2B2',
            borderRadius: '16px',
            padding: '2.5rem 2rem',
            boxShadow: '0 10px 25px -5px rgba(229, 62, 62, 0.15)'
          }}>
            <div style={{
              width: '72px',
              height: '72px',
              margin: '0 auto 1.25rem auto',
              background: '#E53E3E',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2.2rem',
              color: '#fff',
            }}>
              🛡️
            </div>
            <span style={{
              background: '#C53030',
              color: '#fff',
              fontWeight: 800,
              fontSize: '0.78rem',
              padding: '0.3rem 0.8rem',
              borderRadius: '6px',
              letterSpacing: '0.05em'
            }}>
              SECURITY BARRIER • 403 ACCESS RESTRICTED
            </span>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#9B2C2C', margin: '1rem 0 0.5rem 0' }}>
              Administrator Privilege Required
            </h1>
            <p style={{ fontSize: '0.95rem', color: '#742A2A', maxWidth: '560px', margin: '0 auto 1.5rem auto', lineHeight: 1.6 }}>
              The <strong>Hierarchy & Branches Management Directory</strong> is restricted to authorized National, Apex, Provincial, Zonal, and Divisional Administrators.
              Your account <strong>({user?.username || 'User'})</strong> is a standard operational user and is restricted to operational workshop and plan modules.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <Link href="/budget-forecasting" className="btn btn-primary" style={{ padding: '0.65rem 1.5rem', fontWeight: 700 }}>
                Return to Main Menu
              </Link>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="page-container">
        {/* Header */}
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 className="page-title">Educational Organizational Hierarchy</h1>
            <p className="page-subtitle">
              6-Tier national administrative hierarchy governing education sector planning, budgeting, AIP, workshops, and performance monitoring
            </p>
          </div>
          <Link href="/admin" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}>
            <span>⚙️</span> Manage Branches & Levels
          </Link>
        </div>

        {/* Hierarchy Clarification Alert Box */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--white)',
            border: '1px solid var(--border-light)',
            borderLeft: '5px solid var(--primary)',
            boxShadow: 'var(--shadow-sm)',
            marginBottom: '1.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '1.4rem' }}>🏛️</span>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--primary)' }}>
              Official 6-Tier Organizational Hierarchy Architecture
            </h3>
          </div>
          <div style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.7, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <div>• <strong>Level 1 – Ministry of Education (MoE)</strong>: National headquarters and functional branches (ICT, Planning, Monitoring, Data Management, etc.). Space reserved for adding additional MoE branches.</div>
            <div>• <strong>Level 2 – National Apex Institutions (NIE / EPD / DoE)</strong>: Autonomous national institutions (National Institute of Education, Educational Publications Department, Department of Examinations) with independent statutory mandates; operating at national level without provincial or zonal cascade.</div>
            <div>• <strong>Level 3 – Provincial Departments of Education (9 Provinces)</strong>: Western, Central, Southern, Northern, Eastern, North Western, North Central, Uva, and Sabaragamuwa.</div>
            <div>• <strong>Level 4 – Zonal Education Offices (100 Zones)</strong>: Operational educational zones structured across 25 administrative districts.</div>
            <div>• <strong>Level 5 – Divisional Education Offices (312 Divisions)</strong>: Ground-level administrative divisions executing zonal directives.</div>
            <div>• <strong>Level 6 – Schools & Implementing Institutions</strong>: Schools and educational centers where curricular activities and workshops take place.</div>
          </div>
        </div>

        {/* Level Filters & Search */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
            marginBottom: '1.5rem',
          }}
        >
          {/* Level Pills */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {[
              { level: 'all', label: 'All Levels' },
              { level: 1, label: 'Level 1: MoE Branches' },
              { level: 2, label: 'Level 2: National Apex (NIE/EPD/DoE)' },
              { level: 3, label: 'Level 3: Provinces (9)' },
              { level: 4, label: 'Level 4: Zones (100)' },
              { level: 5, label: 'Level 5: Divisions (312)' },
              { level: 6, label: 'Level 6: Schools' },
            ].map((tab) => {
              const active = selectedLevel === tab.level;
              return (
                <button
                  key={String(tab.level)}
                  type="button"
                  onClick={() => setSelectedLevel(tab.level as any)}
                  style={{
                    padding: '0.45rem 0.95rem',
                    borderRadius: 'var(--radius-full)',
                    border: '1px solid',
                    borderColor: active ? 'var(--primary)' : 'var(--border-default)',
                    background: active ? 'var(--primary)' : 'var(--white)',
                    color: active ? '#fff' : 'var(--text-secondary)',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'var(--font)',
                    transition: 'all var(--ease)',
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div style={{ minWidth: '260px' }}>
            <input
              type="text"
              className="form-input"
              placeholder="Search organizations or codes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ fontSize: '0.85rem' }}
            />
          </div>
        </div>

        {/* MoE 20 Divisions Accordion / Directory (Visible on Level 1 or All) */}
        {(selectedLevel === 1 || (selectedLevel === 'all' && !search)) && (
          <div style={{ marginBottom: '2rem' }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem',
            }}>
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>🏛️</span> Ministry of Education: 20 Official Administrative Divisions & Operational Units
                </h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
                  Full organizational chart of Level 1 headquarters divisions and functional sub-branches / departments
                </p>
              </div>
              <span className="badge badge-primary" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                20 Divisions · 88 Branches/Units
              </span>
            </div>

            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1rem',
            }}>
              {OFFICIAL_MOE_DIVISIONS_DATA.map((div) => (
                <div
                  key={div.sn}
                  className="card"
                  style={{
                    padding: '1.1rem 1.25rem', borderLeft: '4px solid var(--primary)',
                    display: 'flex', flexDirection: 'column', gap: '0.65rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{
                        width: '26px', height: '26px', borderRadius: '50%',
                        background: 'var(--primary)', color: '#fff',
                        fontWeight: 800, fontSize: '0.78rem',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {div.sn}
                      </span>
                      <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {div.division}
                      </h4>
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>
                      {div.code}
                    </span>
                  </div>

                  <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '0.5rem' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: '0.35rem' }}>
                      BRANCHES & UNITS ({div.branches.length})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      {div.branches.map((b) => (
                        <div
                          key={b.id}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '0.3rem 0.5rem', background: 'var(--bg-secondary)',
                            borderRadius: 'var(--radius-sm)', fontSize: '0.78rem',
                          }}
                        >
                          <BranchBadge name={b.name} size="xs" />
                          {b.category === 'Planning' && (
                            <span className="badge" style={{ fontSize: '0.65rem', background: 'rgba(235, 116, 0, 0.1)', color: '#EB7400' }}>
                              Planning
                            </span>
                          )}
                          {b.category === 'Monitoring' && (
                            <span className="badge" style={{ fontSize: '0.65rem', background: 'rgba(0, 83, 78, 0.1)', color: 'var(--teal)' }}>
                              Monitoring
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Organizations Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '1.25rem',
          }}
        >
          {filteredOrgs.map((org) => {
            const badge = getLevelBadge(org.level);
            return (
              <div
                key={org.id}
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '1.25rem',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '0.2rem 0.6rem',
                        borderRadius: 'var(--radius-sm)',
                        background: badge.bg,
                        color: badge.color,
                        border: `1px solid ${badge.border}`,
                        letterSpacing: '0.03em',
                      }}
                    >
                      {badge.label}
                    </span>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.75rem',
                        color: 'var(--text-tertiary)',
                        fontWeight: 600,
                      }}
                    >
                      {org.code}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <BranchBadge name={org.name} code={org.abbreviation} showName={false} size="sm" />
                    <span>{org.name}</span>
                  </h3>

                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                    {org.typeName}
                    {org.parentName && (
                      <span style={{ display: 'block', color: 'var(--text-tertiary)', marginTop: '0.2rem' }}>
                        ↳ Reports to: {org.parentName}
                      </span>
                    )}
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingTop: '0.75rem',
                    borderTop: '1px solid var(--border-light)',
                    fontSize: '0.78rem',
                  }}
                >
                  <span style={{ color: 'var(--text-tertiary)' }}>
                    Linked Workshops: <strong style={{ color: 'var(--text-primary)' }}>{org.workshopCount}</strong>
                  </span>
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      color: org.isActive ? 'var(--teal)' : 'var(--error)',
                      fontWeight: 600,
                    }}
                  >
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor' }} />
                    {org.isActive ? 'Active Unit' : 'Inactive'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
