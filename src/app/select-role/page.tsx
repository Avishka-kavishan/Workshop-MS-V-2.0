'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function SelectRoleContent() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get('returnUrl') || '/dashboard';

  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>('');
  const [rememberRole, setRememberRole] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated') {
      fetchUserRoles();
    }
  }, [status]);

  const fetchUserRoles = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await fetch('/api/auth/switch-role');
      if (res.ok) {
        const json = await res.json();
        setProfileData(json);
        const roles = json.assignedRoles || [];
        // Set initially selected role: active role or remembered or default or first
        const activeId = json.activeRoleAssignmentId || roles.find((r: any) => r.isDefault)?.id || roles[0]?.id || '';
        setSelectedAssignmentId(activeId);
        setRememberRole(json.rememberLastRole ?? true);
      } else {
        setErrorMsg('Failed to load assigned working roles. Please contact system administrator.');
      }
    } catch (err) {
      console.error('Error fetching roles:', err);
      setErrorMsg('Error communicating with authentication service.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAndProceed = async (assignmentIdToSelect?: string) => {
    const targetId = assignmentIdToSelect || selectedAssignmentId;
    if (!targetId) {
      setErrorMsg('Please select a working role to proceed.');
      return;
    }

    try {
      setSwitching(true);
      setErrorMsg('');

      const res = await fetch('/api/auth/switch-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roleAssignmentId: targetId,
          remember: rememberRole,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Failed to switch role');
      }

      // Update NextAuth client-side session token
      if (update) {
        await update({ activeRoleAssignmentId: targetId });
      }

      // Route to destination
      const selected = profileData?.assignedRoles?.find((r: any) => r.id === targetId);
      if (selected?.functionalCategory === 'Planning') {
        router.push(returnUrl !== '/dashboard' ? returnUrl : '/annual-plan');
      } else if (selected?.functionalCategory === 'Monitoring') {
        router.push(returnUrl !== '/dashboard' ? returnUrl : '/monitoring');
      } else {
        router.push(returnUrl);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Error activating role');
      setSwitching(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '48px', height: '48px', border: '4px solid #CBD5E1', borderTopColor: '#0F766E', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1E293B' }}>Retrieving Authorized Roles...</h3>
          <p style={{ fontSize: '0.82rem', color: '#64748B' }}>Connecting to Centralized IPMIS Access Management</p>
        </div>
        <style jsx>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  const assignedRoles: any[] = profileData?.assignedRoles || [];

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #F8FAFC 0%, #EEF2F6 50%, #E2E8F0 100%)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ── Top Header Navigation ── */}
      <header
        style={{
          borderBottom: '1px solid #CBD5E1',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(8px)',
          padding: '0.75rem 2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', textDecoration: 'none' }}>
            <img src="/logo-emblem.png" alt="MoE Crest" style={{ width: '38px', height: '38px', objectFit: 'contain' }} />
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0F766E', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Ministry of Education Sri Lanka
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 900, color: '#0F172A' }}>
                Integrated Planning & Monitoring Information System (IPMIS)
              </div>
            </div>
          </Link>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0F172A' }}>
              {profileData?.fullName || session?.user?.name}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>
              {profileData?.designation || (session?.user as any)?.designation || 'Authorized Officer'} • Account: <code style={{ color: '#0F766E', fontWeight: 700 }}>{profileData?.username || session?.user?.email}</code>
            </div>
          </div>
          <Link
            href="/api/auth/signout"
            style={{
              padding: '0.4rem 0.85rem',
              borderRadius: '6px',
              border: '1px solid #E2E8F0',
              background: '#FFFFFF',
              color: '#DC2626',
              fontSize: '0.78rem',
              fontWeight: 700,
              textDecoration: 'none',
              cursor: 'pointer',
            }}
          >
            Sign Out
          </Link>
        </div>
      </header>

      {/* ── Main Role Selection Container ── */}
      <main style={{ flex: 1, maxWidth: '1080px', width: '100%', margin: '0 auto', padding: '2.5rem 1.5rem' }}>
        
        {/* Core Principle Banner */}
        <div
          style={{
            background: 'linear-gradient(90deg, #0F766E 0%, #115E59 100%)',
            color: '#FFFFFF',
            borderRadius: '12px',
            padding: '1.25rem 1.75rem',
            marginBottom: '2rem',
            boxShadow: '0 4px 15px rgba(15, 118, 110, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#99F6E4', marginBottom: '0.2rem' }}>
              Centralized Access Architecture • AUTH-01 to AUTH-12
            </div>
            <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900 }}>
              One User Account — Multiple Authorized Roles — One Platform
            </h2>
            <p style={{ margin: '0.35rem 0 0', fontSize: '0.84rem', color: '#E6FFFA', maxWidth: '720px', lineHeight: 1.4 }}>
              Select your working context for this session. You can switch between your authorized branch and oversight roles at any time without logging out.
            </p>
          </div>
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '1.4rem', fontWeight: 900 }}>{assignedRoles.length}</div>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Authorized Roles
            </div>
          </div>
        </div>

        {errorMsg && (
          <div
            style={{
              background: '#FEF2F2',
              border: '1px solid #FCA5A5',
              color: '#B91C1C',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              marginBottom: '1.5rem',
              fontSize: '0.85rem',
              fontWeight: 600,
            }}
          >
            ⚠️ {errorMsg}
          </div>
        )}

        {/* Roles List */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>
              Select Your Working Role:
            </h3>
            <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 600 }}>
              Assigned specifically to your officer identity
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem' }}>
            {assignedRoles.map((roleAssignment) => {
              const isSelected = selectedAssignmentId === roleAssignment.id;
              const isActiveInSession = profileData?.activeRoleAssignmentId === roleAssignment.id;

              const getBadgeColor = (category: string) => {
                switch (category) {
                  case 'Planning':
                    return { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' };
                  case 'Monitoring':
                    return { bg: '#FAF5FF', text: '#7E22CE', border: '#E9D5FF' };
                  case 'All':
                    return { bg: '#FEF3C7', text: '#B45309', border: '#FDE68A' };
                  default:
                    return { bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0' };
                }
              };

              const badge = getBadgeColor(roleAssignment.functionalCategory);

              return (
                <div
                  key={roleAssignment.id}
                  onClick={() => setSelectedAssignmentId(roleAssignment.id)}
                  style={{
                    background: isSelected ? '#FFFFFF' : '#FFFFFF',
                    border: isSelected ? '2.5px solid #0F766E' : '1.5px solid #CBD5E1',
                    borderRadius: '12px',
                    padding: '1.25rem',
                    cursor: 'pointer',
                    boxShadow: isSelected
                      ? '0 10px 25px -5px rgba(15, 118, 110, 0.25), 0 0 0 1px #0F766E'
                      : '0 2px 6px rgba(0, 0, 0, 0.04)',
                    transition: 'all 0.18s ease',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    {/* Top Status Indicators */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
                      <span
                        style={{
                          background: badge.bg,
                          color: badge.text,
                          border: `1px solid ${badge.border}`,
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                        }}
                      >
                        {roleAssignment.functionalCategory === 'All' ? 'System Administrator' : `${roleAssignment.functionalCategory} Scope`}
                      </span>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        {roleAssignment.isDefault && (
                          <span
                            style={{
                              background: '#FEF9C3',
                              color: '#854D0E',
                              border: '1px solid #FE04',
                              fontSize: '0.65rem',
                              fontWeight: 800,
                              padding: '2px 6px',
                              borderRadius: '4px',
                            }}
                          >
                            Default
                          </span>
                        )}
                        {isActiveInSession && (
                          <span
                            style={{
                              background: '#E6FFFA',
                              color: '#0F766E',
                              border: '1px solid #0F766E',
                              fontSize: '0.65rem',
                              fontWeight: 800,
                              padding: '2px 6px',
                              borderRadius: '4px',
                            }}
                          >
                            Currently Active ✓
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Role Title */}
                    <h4 style={{ margin: '0 0 0.25rem', fontSize: '1.12rem', fontWeight: 800, color: '#0F172A' }}>
                      {roleAssignment.roleName}
                    </h4>

                    {/* Organization / Branch Name */}
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0F766E', marginBottom: '0.65rem' }}>
                      🏢 {roleAssignment.organizationName}
                    </div>

                    {/* Description */}
                    <p style={{ margin: '0 0 1rem', fontSize: '0.8rem', color: '#475569', lineHeight: 1.45 }}>
                      {roleAssignment.description || 'Assigned institutional duties and authorized IPMIS workflows.'}
                    </p>
                  </div>

                  {/* Delegated Authority & Selection Radio */}
                  <div
                    style={{
                      borderTop: '1px solid #F1F5F9',
                      paddingTop: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 700 }}>
                      Authority: <strong style={{ color: '#1E293B' }}>{roleAssignment.delegatedAuthority || 'Standard'}</strong>
                    </span>

                    <button
                      type="button"
                      disabled={switching}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectAndProceed(roleAssignment.id);
                      }}
                      style={{
                        background: isSelected ? '#0F766E' : '#F1F5F9',
                        color: isSelected ? '#FFFFFF' : '#334155',
                        border: 'none',
                        padding: '0.45rem 1rem',
                        borderRadius: '6px',
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {isSelected ? 'Activate & Enter →' : 'Select'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Footer Controls: Remember Choice (Requirement A) & Confirmation ── */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #CBD5E1',
            borderRadius: '12px',
            padding: '1.25rem 1.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          }}
        >
          {/* Checkbox: Remember last selected role */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer', userSelect: 'none' }}>
            <input
              type="checkbox"
              checked={rememberRole}
              onChange={(e) => setRememberRole(e.target.checked)}
              style={{ width: '18px', height: '18px', accentColor: '#0F766E', cursor: 'pointer' }}
            />
            <div>
              <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#0F172A' }}>
                Remember this role for subsequent logins
              </div>
              <div style={{ fontSize: '0.74rem', color: '#64748B' }}>
                You can switch between authorized roles anytime using the top-right profile menu.
              </div>
            </div>
          </label>

          {/* Action Button */}
          <button
            type="button"
            disabled={!selectedAssignmentId || switching}
            onClick={() => handleSelectAndProceed()}
            style={{
              background: '#0F766E',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              padding: '0.75rem 2rem',
              fontSize: '0.92rem',
              fontWeight: 800,
              cursor: (!selectedAssignmentId || switching) ? 'not-allowed' : 'pointer',
              opacity: (!selectedAssignmentId || switching) ? 0.6 : 1,
              boxShadow: '0 2px 6px rgba(15, 118, 110, 0.3)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            {switching ? 'Activating Working Role...' : 'Enter IPMIS Workspace →'}
          </button>
        </div>
      </main>
    </div>
  );
}

export default function SelectRolePage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '48px', height: '48px', border: '4px solid #CBD5E1', borderTopColor: '#0F766E', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1E293B' }}>Retrieving Authorized Roles...</h3>
            <p style={{ fontSize: '0.82rem', color: '#64748B' }}>Connecting to Centralized IPMIS Access Management</p>
          </div>
          <style jsx>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      }
    >
      <SelectRoleContent />
    </Suspense>
  );
}
