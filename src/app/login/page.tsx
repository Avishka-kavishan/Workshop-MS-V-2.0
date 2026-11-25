'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import SearchableSelect from '@/components/common/SearchableSelect';

interface BranchOption {
  id: string;
  name: string;
  code: string;
  abbreviation: string;
  typeName: string;
  level: number;
  functionalCategory: string;
  userCount: number;
}

interface RoleOption {
  id: string;
  name: string;
  description: string;
  functionalScope: string;
}

interface BranchUserEntry {
  userId: string;
  username: string;
  fullName: string;
  designation: string;
  organizationId: string;
  organizationName: string;
  roleId: string;
  roleName: string;
  functionalCategory: string;
  roleAssignmentId: string;
}

function getScopeStyle(scope?: string) {
  switch (scope) {
    case 'Planning':
      return { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' };
    case 'Monitoring':
      return { bg: '#FAF5FF', text: '#7E22CE', border: '#E9D5FF' };
    case 'All':
      return { bg: '#FEF3C7', text: '#B45309', border: '#FDE68A' };
    default:
      return { bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0' };
  }
}

export default function LoginPage() {
  const router = useRouter();

  const [loginMode, setLoginMode] = useState<'role-branch' | 'direct'>('role-branch');
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [branchUsers, setBranchUsers] = useState<BranchUserEntry[]>([]);

  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [selectedUsername, setSelectedUsername] = useState('');

  const [directUsername, setDirectUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    fetch('/api/auth/login-options')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Failed to load'))))
      .then((data) => {
        if (!active) return;
        setBranches(data.branches || []);
        setRoles(data.roles || []);
        setBranchUsers(data.branchUsers || []);
      })
      .catch(() => {
        if (!active) return;
        // Fallback silently to direct login if options fail to load
        setLoginMode('direct');
      })
      .finally(() => {
        if (active) setLoadingOptions(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Branches filtered by selectedRoleId (if role is chosen first)
  const availableBranches = useMemo(() => {
    if (!selectedRoleId) return branches;
    const validOrgIds = new Set(
      branchUsers.filter((u) => u.roleId === selectedRoleId).map((u) => u.organizationId)
    );
    return branches.filter((b) => validOrgIds.has(b.id));
  }, [branches, branchUsers, selectedRoleId]);

  // Roles available in the selected branch (or all roles if no branch chosen yet)
  const availableRoles = useMemo(() => {
    if (!selectedBranchId) return roles;
    const validRoleIds = new Set(
      branchUsers.filter((u) => u.organizationId === selectedBranchId).map((u) => u.roleId)
    );
    return roles.filter((r) => validRoleIds.has(r.id));
  }, [roles, branchUsers, selectedBranchId]);

  // Matching login users for selected branch & role
  const matchingUsers = useMemo(() => {
    return branchUsers.filter((u) => {
      if (selectedBranchId && u.organizationId !== selectedBranchId) return false;
      if (selectedRoleId && u.roleId !== selectedRoleId) return false;
      return true;
    });
  }, [branchUsers, selectedBranchId, selectedRoleId]);

  // Auto-select role when branch has only 1 role; clear if invalid for new branch
  useEffect(() => {
    if (!selectedBranchId) return;
    const validRoleIds = availableRoles.map((r) => r.id);
    if (selectedRoleId && !validRoleIds.includes(selectedRoleId)) {
      setSelectedRoleId(validRoleIds.length === 1 ? validRoleIds[0] : '');
    } else if (!selectedRoleId && validRoleIds.length === 1) {
      setSelectedRoleId(validRoleIds[0]);
    }
  }, [selectedBranchId, availableRoles, selectedRoleId]);

  // Auto-select user when branch + role narrows down to 1 user
  useEffect(() => {
    if (loginMode !== 'role-branch') return;
    if (!selectedBranchId && !selectedRoleId) {
      setSelectedUsername('');
      return;
    }
    if (matchingUsers.length === 1) {
      setSelectedUsername(matchingUsers[0].username);
    } else if (!matchingUsers.some((u) => u.username === selectedUsername)) {
      setSelectedUsername('');
    }
  }, [loginMode, selectedBranchId, selectedRoleId, matchingUsers, selectedUsername]);

  const activeUserEntry = useMemo(
    () =>
      matchingUsers.find((u) => u.username === selectedUsername) ||
      (matchingUsers.length === 1 ? matchingUsers[0] : undefined),
    [matchingUsers, selectedUsername]
  );

  const handleBranchChange = (branchId: string) => {
    setError('');
    setSelectedBranchId(branchId);
  };

  const handleRoleChange = (roleId: string) => {
    setError('');
    setSelectedRoleId((prev) => (prev === roleId ? '' : roleId));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const usernameToUse =
      loginMode === 'role-branch'
        ? (activeUserEntry?.username || selectedUsername).trim()
        : directUsername.trim();

    if (!usernameToUse) {
      setError('Please select your branch, role, and login user.');
      return;
    }
    if (!password.trim()) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);

    const credentialsPayload: Record<string, string> = {
      username: usernameToUse,
      password: password.trim(),
    };

    if (loginMode === 'role-branch') {
      if (activeUserEntry?.organizationId || selectedBranchId) {
        credentialsPayload.branchId = activeUserEntry?.organizationId || selectedBranchId;
      }
      if (activeUserEntry?.roleId || selectedRoleId) {
        credentialsPayload.roleId = activeUserEntry?.roleId || selectedRoleId;
      }
      if (activeUserEntry?.roleAssignmentId) {
        credentialsPayload.roleAssignmentId = activeUserEntry.roleAssignmentId;
      }
    }

    const res = await signIn('credentials', {
      ...credentialsPayload,
      redirect: false,
    });

    if (res?.error) {
      setError('Invalid credentials for the selected branch/role user.');
      setLoading(false);
      return;
    }

    if (loginMode === 'role-branch') {
      const cat = activeUserEntry?.functionalCategory;
      if (cat === 'Planning') {
        router.push('/annual-plan');
      } else if (cat === 'Monitoring') {
        router.push('/monitoring');
      } else {
        router.push('/dashboard');
      }
      return;
    }

    // Direct username login preserves multi-role selection redirect
    try {
      const checkRes = await fetch('/api/auth/switch-role');
      if (checkRes.ok) {
        const profile = await checkRes.json();
        if (profile?.assignedRoles && profile.assignedRoles.length > 1) {
          router.push('/select-role');
          return;
        }
      }
    } catch {
      // fallback
    }
    router.push('/dashboard');
  };

  const branchSelectOptions = useMemo(
    () =>
      availableBranches.map((b) => ({
        value: b.id,
        label: `[${b.abbreviation}] ${b.name} (${b.userCount} ${b.userCount === 1 ? 'user' : 'users'})`,
      })),
    [availableBranches]
  );

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: 'linear-gradient(135deg, #F8FAFC 0%, #EEF2F6 50%, #E2E8F0 100%)',
        position: 'relative',
      }}
    >
      {/* Subtle Background Accent Circles */}
      <div
        style={{
          position: 'fixed',
          top: '-10%',
          left: '-5%',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(141, 21, 58, 0.05) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'fixed',
          bottom: '-10%',
          right: '-5%',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255, 190, 41, 0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Main Content */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem 2rem',
          zIndex: 1,
        }}
      >
        <div
          style={{
            maxWidth: '1140px',
            width: '100%',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: '3rem',
            alignItems: 'center',
          }}
        >
          {/* LEFT SIDE: LOGO & SYSTEM DESCRIPTION */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
            <div>
              <Link
                href="/"
                title="Click logo to return to landing page"
                style={{
                  display: 'inline-block',
                  textDecoration: 'none',
                  cursor: 'pointer',
                  borderRadius: '50%',
                }}
              >
                <div
                  style={{
                    width: '110px',
                    height: '110px',
                    borderRadius: '50%',
                    background: '#FFFFFF',
                    border: '3px solid #FFBE29',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 8px 26px rgba(92, 15, 40, 0.16)',
                    padding: '5px',
                    overflow: 'hidden',
                    transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.06)';
                    e.currentTarget.style.boxShadow = '0 12px 32px rgba(92, 15, 40, 0.25)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = '0 8px 26px rgba(92, 15, 40, 0.16)';
                  }}
                >
                  <img
                    src="/logo-emblem.png"
                    alt="IPMIS Official Logo - Click to return to landing page"
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                </div>
              </Link>
            </div>

            <div>
              <div
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  color: 'var(--primary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  marginBottom: '0.4rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#FFBE29', display: 'inline-block' }} />
                Ministry of Education • Sri Lanka
              </div>
              <h1
                style={{
                  fontSize: '1.85rem',
                  fontWeight: 800,
                  letterSpacing: '-0.025em',
                  color: '#0F172A',
                  margin: 0,
                  lineHeight: 1.22,
                }}
              >
                Integrated Planning & Monitoring Information System
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginTop: '0.55rem' }}>
                <span
                  style={{
                    fontSize: '0.86rem',
                    fontWeight: 800,
                    color: '#FFFFFF',
                    background: 'var(--primary)',
                    padding: '0.2rem 0.75rem',
                    borderRadius: '6px',
                    letterSpacing: '0.04em',
                  }}
                >
                  MoE-IPMIS
                </span>
                <span style={{ fontSize: '0.82rem', color: '#64748B', fontWeight: 600 }}>
                  National Education Sector Platform
                </span>
              </div>
              <p
                style={{
                  color: '#475569',
                  marginTop: '0.75rem',
                  fontSize: '0.92rem',
                  lineHeight: 1.55,
                  maxWidth: '500px',
                }}
              >
                Annual Budget Formulation, AIP Implementation & Multi-Tier Monitoring Platform connecting General Education Sector
              </p>

              {/* Branch & Role Isolation Info Pill */}
              <div
                style={{
                  marginTop: '1rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  padding: '0.55rem 0.9rem',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.8)',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.78rem',
                  color: '#334155',
                  fontWeight: 600,
                }}
              >
                <span style={{ color: 'var(--primary)', fontWeight: 800 }}>Role-Based Branch Access:</span>
                <span>Select your branch & role to sign in with your branch-specific officer account.</span>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE: ROLE & BRANCH LOGIN CARD */}
          <div>
            <div
              className="card"
              style={{
                padding: '1.75rem 2rem',
                borderTop: '4px solid var(--primary)',
                boxShadow: '0 16px 36px rgba(0, 0, 0, 0.08), 0 4px 12px rgba(0, 0, 0, 0.04)',
                borderRadius: '16px',
                background: '#FFFFFF',
              }}
            >
              {/* Header + Mode Switcher */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '0.75rem',
                  marginBottom: '1rem',
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <h2
                    style={{
                      fontSize: '1.25rem',
                      fontWeight: 800,
                      color: 'var(--primary)',
                      margin: 0,
                      letterSpacing: '-0.01em',
                    }}
                  >
                    Sign In by Role & Branch
                  </h2>
                  <p style={{ color: '#64748B', fontSize: '0.8rem', margin: '0.2rem 0 0' }}>
                    Each branch maintains separate role-based login users
                  </p>
                </div>

                {/* Mode Toggle */}
                <div
                  style={{
                    display: 'inline-flex',
                    background: '#F1F5F9',
                    padding: '3px',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setLoginMode('role-branch');
                      setError('');
                    }}
                    style={{
                      border: 'none',
                      borderRadius: '6px',
                      padding: '0.32rem 0.65rem',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      background: loginMode === 'role-branch' ? '#FFFFFF' : 'transparent',
                      color: loginMode === 'role-branch' ? 'var(--primary)' : '#64748B',
                      boxShadow: loginMode === 'role-branch' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                    }}
                  >
                    Branch & Role
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLoginMode('direct');
                      setError('');
                    }}
                    style={{
                      border: 'none',
                      borderRadius: '6px',
                      padding: '0.32rem 0.65rem',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      background: loginMode === 'direct' ? '#FFFFFF' : 'transparent',
                      color: loginMode === 'direct' ? 'var(--primary)' : '#64748B',
                      boxShadow: loginMode === 'direct' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                    }}
                  >
                    Direct Username
                  </button>
                </div>
              </div>

              {error && (
                <div
                  style={{
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--error-bg)',
                    border: '1px solid var(--error)',
                    color: 'var(--error)',
                    fontSize: '0.82rem',
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <span>⚠️</span> {error}
                </div>
              )}

              <form onSubmit={handleLogin}>
                {loginMode === 'role-branch' ? (
                  <>
                    {/* 1. Branch Selector */}
                    <div className="form-group" style={{ marginBottom: '0.95rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                        <label className="form-label" style={{ fontWeight: 700, fontSize: '0.8rem', color: '#1E293B', margin: 0 }}>
                          1. Select Branch / Institution
                        </label>
                        {selectedBranchId && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedBranchId('');
                              setSelectedUsername('');
                            }}
                            style={{
                              border: 'none',
                              background: 'transparent',
                              color: '#64748B',
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              padding: 0,
                            }}
                          >
                            Clear
                          </button>
                        )}
                      </div>
                      <SearchableSelect
                        value={selectedBranchId}
                        onChange={(e) => handleBranchChange(e.target.value)}
                        options={branchSelectOptions}
                        placeholder={loadingOptions ? 'Loading branches...' : 'Search branch (e.g. ICT, Data, Galle, EQD)...'}
                        disabled={loadingOptions}
                      />
                    </div>

                    {/* 2. User Role Selector */}
                    <div className="form-group" style={{ marginBottom: '0.95rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                        <label className="form-label" style={{ fontWeight: 700, fontSize: '0.8rem', color: '#1E293B', margin: 0 }}>
                          2. Select User Role
                        </label>
                        <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>
                          {availableRoles.length} {availableRoles.length === 1 ? 'role' : 'roles'}
                        </span>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '0.45rem',
                          maxHeight: '132px',
                          overflowY: 'auto',
                          padding: '2px',
                        }}
                      >
                        {availableRoles.map((role) => {
                          const isSelected = selectedRoleId === role.id;
                          const scopeStyle = getScopeStyle(role.functionalScope);
                          return (
                            <button
                              key={role.id}
                              type="button"
                              onClick={() => handleRoleChange(role.id)}
                              title={role.description || role.name}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                padding: '0.4rem 0.7rem',
                                borderRadius: '8px',
                                border: isSelected ? '1.5px solid var(--primary)' : '1px solid #CBD5E1',
                                background: isSelected ? 'rgba(141, 21, 58, 0.08)' : '#F8FAFC',
                                color: isSelected ? 'var(--primary)' : '#1E293B',
                                fontSize: '0.77rem',
                                fontWeight: isSelected ? 800 : 600,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <span>{role.name}</span>
                              {role.functionalScope && (
                                <span
                                  style={{
                                    fontSize: '0.65rem',
                                    fontWeight: 700,
                                    padding: '0.08rem 0.35rem',
                                    borderRadius: '4px',
                                    background: scopeStyle.bg,
                                    color: scopeStyle.text,
                                    border: `1px solid ${scopeStyle.border}`,
                                  }}
                                >
                                  {role.functionalScope}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 3. Branch Login User Selector */}
                    {(selectedBranchId || selectedRoleId) && (
                      <div className="form-group" style={{ marginBottom: '0.95rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                          <label className="form-label" style={{ fontWeight: 700, fontSize: '0.8rem', color: '#1E293B', margin: 0 }}>
                            3. Select Branch Login User
                          </label>
                          <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>
                            {matchingUsers.length} {matchingUsers.length === 1 ? 'account' : 'accounts'}
                          </span>
                        </div>

                        {matchingUsers.length === 0 ? (
                          <div
                            style={{
                              padding: '0.65rem 0.85rem',
                              borderRadius: '8px',
                              background: '#F8FAFC',
                              border: '1px dashed #CBD5E1',
                              fontSize: '0.78rem',
                              color: '#64748B',
                            }}
                          >
                            No active login user found for this branch and role combination.
                          </div>
                        ) : (
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.45rem',
                              maxHeight: '165px',
                              overflowY: 'auto',
                              paddingRight: '2px',
                            }}
                          >
                            {matchingUsers.map((u) => {
                              const isSelected = activeUserEntry?.username === u.username && activeUserEntry?.organizationId === u.organizationId && activeUserEntry?.roleId === u.roleId;
                              const scopeStyle = getScopeStyle(u.functionalCategory);
                              return (
                                <button
                                  key={`${u.userId}-${u.organizationId}-${u.roleId}`}
                                  type="button"
                                  onClick={() => {
                                    setSelectedUsername(u.username);
                                    if (!selectedBranchId) setSelectedBranchId(u.organizationId);
                                    if (!selectedRoleId) setSelectedRoleId(u.roleId);
                                    setError('');
                                  }}
                                  style={{
                                    textAlign: 'left',
                                    padding: '0.55rem 0.75rem',
                                    borderRadius: '9px',
                                    border: isSelected ? '1.5px solid var(--primary)' : '1px solid #E2E8F0',
                                    background: isSelected ? 'rgba(141, 21, 58, 0.06)' : '#FFFFFF',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '0.65rem',
                                    transition: 'all 0.15s ease',
                                  }}
                                >
                                  <div style={{ minWidth: 0 }}>
                                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {u.fullName}
                                    </div>
                                    <div style={{ fontSize: '0.72rem', color: '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {u.designation ? `${u.designation} • ` : ''}
                                      <code style={{ color: 'var(--primary)', fontWeight: 700 }}>@{u.username}</code>
                                    </div>
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem', flexShrink: 0 }}>
                                    <span
                                      style={{
                                        fontSize: '0.66rem',
                                        fontWeight: 700,
                                        padding: '0.12rem 0.45rem',
                                        borderRadius: '999px',
                                        background: scopeStyle.bg,
                                        color: scopeStyle.text,
                                        border: `1px solid ${scopeStyle.border}`,
                                      }}
                                    >
                                      {u.roleName}
                                    </span>
                                    {!selectedBranchId && (
                                      <span style={{ fontSize: '0.66rem', color: '#64748B', fontWeight: 600 }}>
                                        {u.organizationName}
                                      </span>
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  /* Direct Username Input Mode */
                  <div className="form-group" style={{ marginBottom: '1.1rem' }}>
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem', color: '#1E293B' }}>
                      Username
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={directUsername}
                      onChange={(e) => setDirectUsername(e.target.value)}
                      placeholder="Enter your username (e.g. ict, galle.it, admin)"
                      required
                      autoFocus
                      style={{ fontSize: '0.88rem', padding: '0.65rem 0.85rem' }}
                    />
                  </div>
                )}

                {/* Password Input */}
                <div className="form-group" style={{ marginBottom: '1.2rem' }}>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '0.8rem', color: '#1E293B' }}>
                    {loginMode === 'role-branch' ? 'Password' : 'Password'}
                    {loginMode === 'role-branch' && activeUserEntry && (
                      <span style={{ fontWeight: 600, color: '#64748B', marginLeft: '0.4rem' }}>
                        for <code style={{ color: 'var(--primary)' }}>@{activeUserEntry.username}</code>
                      </span>
                    )}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="form-input"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                      style={{ fontSize: '0.88rem', padding: '0.62rem 2.5rem 0.62rem 0.85rem' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      style={{
                        position: 'absolute',
                        right: '0.6rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        border: 'none',
                        background: 'transparent',
                        color: '#64748B',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading || (loginMode === 'role-branch' && !activeUserEntry)}
                  style={{
                    width: '100%',
                    justifyContent: 'center',
                    padding: '0.72rem',
                    fontWeight: 800,
                    fontSize: '0.9rem',
                    borderRadius: '8px',
                    letterSpacing: '0.02em',
                    opacity: loading || (loginMode === 'role-branch' && !activeUserEntry) ? 0.65 : 1,
                  }}
                >
                  {loading ? (
                    <div className="spinner" />
                  ) : loginMode === 'role-branch' && activeUserEntry ? (
                    `Sign In as ${activeUserEntry.roleName}`
                  ) : (
                    'Log In to Portal'
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>

      {/* SLIM GOVERNMENT FOOTER */}
      <footer
        style={{
          borderTop: '1px solid #E2E8F0',
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(8px)',
          padding: '0.45rem 1.5rem',
          flexShrink: 0,
          zIndex: 10,
        }}
      >
        <div
          style={{
            maxWidth: '1440px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 600 }}>
            DMISDU- MoE, copyrights MoE
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
                fontSize: '0.74rem',
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
        </div>
      </footer>
    </div>
  );
}
