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

export default function LoginPage() {
  const router = useRouter();

  const [loadingOptions, setLoadingOptions] = useState(true);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [branchUsers, setBranchUsers] = useState<BranchUserEntry[]>([]);

  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState('');
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
        if (active) setError('Unable to load branch and role options.');
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

  // Matching user entry for selected branch & role
  const matchedUser = useMemo(() => {
    if (!selectedBranchId || !selectedRoleId) return undefined;
    return branchUsers.find(
      (u) => u.organizationId === selectedBranchId && u.roleId === selectedRoleId
    );
  }, [branchUsers, selectedBranchId, selectedRoleId]);

  const branchSelectOptions = useMemo(
    () =>
      availableBranches.map((b) => ({
        value: b.id,
        label: `[${b.abbreviation}] ${b.name}`,
      })),
    [availableBranches]
  );

  const roleSelectOptions = useMemo(
    () =>
      availableRoles.map((r) => ({
        value: r.id,
        label: r.name,
      })),
    [availableRoles]
  );

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedBranchId) {
      setError('Please select a branch / institution.');
      return;
    }
    if (!selectedRoleId) {
      setError('Please select a user role.');
      return;
    }
    if (!matchedUser) {
      setError('No active login account found for the selected branch and role.');
      return;
    }
    if (!password.trim()) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);

    const res = await signIn('credentials', {
      username: matchedUser.username,
      password: password.trim(),
      branchId: matchedUser.organizationId,
      roleId: matchedUser.roleId,
      ...(matchedUser.roleAssignmentId ? { roleAssignmentId: matchedUser.roleAssignmentId } : {}),
      redirect: false,
    });

    if (res?.error) {
      setError('Invalid password for the selected branch and role.');
      setLoading(false);
      return;
    }

    if (matchedUser.functionalCategory === 'Planning') {
      router.push('/annual-plan');
    } else if (matchedUser.functionalCategory === 'Monitoring') {
      router.push('/monitoring');
    } else {
      router.push('/dashboard');
    }
  };

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
            maxWidth: '1100px',
            width: '100%',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: '3.5rem',
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
            </div>
          </div>

          {/* RIGHT SIDE: CLEAN SIGN IN CARD */}
          <div>
            <div
              className="card"
              style={{
                padding: '2.1rem 2.2rem',
                borderTop: '4px solid var(--primary)',
                boxShadow: '0 16px 36px rgba(0, 0, 0, 0.08), 0 4px 12px rgba(0, 0, 0, 0.04)',
                borderRadius: '16px',
                background: '#FFFFFF',
              }}
            >
              <h2
                style={{
                  fontSize: '1.35rem',
                  fontWeight: 800,
                  color: 'var(--primary)',
                  marginBottom: '1.35rem',
                  letterSpacing: '-0.01em',
                }}
              >
                Sign In
              </h2>

              {error && (
                <div
                  style={{
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--error-bg)',
                    border: '1px solid var(--error)',
                    color: 'var(--error)',
                    fontSize: '0.82rem',
                    marginBottom: '1.1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <span>⚠️</span> {error}
                </div>
              )}

              <form onSubmit={handleLogin}>
                {/* Select branch / Institution */}
                <div className="form-group" style={{ marginBottom: '1.1rem' }}>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '0.84rem', color: '#1E293B', marginBottom: '0.4rem', display: 'block' }}>
                    Select branch / Institution
                  </label>
                  <SearchableSelect
                    value={selectedBranchId}
                    onChange={(e) => {
                      setError('');
                      setSelectedBranchId(e.target.value);
                    }}
                    options={branchSelectOptions}
                    placeholder={loadingOptions ? 'Loading branches...' : 'Select branch / institution...'}
                    disabled={loadingOptions}
                  />
                </div>

                {/* Select user role */}
                <div className="form-group" style={{ marginBottom: '1.1rem' }}>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '0.84rem', color: '#1E293B', marginBottom: '0.4rem', display: 'block' }}>
                    Select user role
                  </label>
                  <SearchableSelect
                    value={selectedRoleId}
                    onChange={(e) => {
                      setError('');
                      setSelectedRoleId(e.target.value);
                    }}
                    options={roleSelectOptions}
                    placeholder={loadingOptions ? 'Loading roles...' : 'Select user role...'}
                    disabled={loadingOptions}
                  />
                </div>

                {/* Password */}
                <div className="form-group" style={{ marginBottom: '1.4rem' }}>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '0.84rem', color: '#1E293B', marginBottom: '0.4rem', display: 'block' }}>
                    Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="form-input"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                      style={{ fontSize: '0.9rem', padding: '0.65rem 3rem 0.65rem 0.85rem' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      style={{
                        position: 'absolute',
                        right: '0.7rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        border: 'none',
                        background: 'transparent',
                        color: '#64748B',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading || loadingOptions}
                    style={{
                      width: '100%',
                      justifyContent: 'center',
                      padding: '0.75rem',
                      fontWeight: 800,
                      fontSize: '0.92rem',
                      borderRadius: '8px',
                      letterSpacing: '0.02em',
                    }}
                  >
                    {loading ? <div className="spinner" /> : 'Login'}
                  </button>
                </div>
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
