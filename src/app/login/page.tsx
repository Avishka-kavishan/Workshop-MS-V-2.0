'use client';

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await signIn('credentials', {
      username: username.trim(),
      password: password.trim(),
      redirect: false,
    });

    if (res?.error) {
      setError('Invalid username or password.');
      setLoading(false);
    } else {
      try {
        const checkRes = await fetch('/api/auth/switch-role');
        if (checkRes.ok) {
          const profile = await checkRes.json();
          if (profile?.assignedRoles && profile.assignedRoles.length > 1) {
            router.push('/select-role');
            return;
          }
        }
      } catch (e) {
        // fallback
      }
      router.push('/budget-forecasting');
    }
  };

  return (
    <div
      style={{
        height: '100vh',
        maxHeight: '100vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: 'linear-gradient(135deg, #F8FAFC 0%, #EEF2F6 50%, #E2E8F0 100%)',
        position: 'relative',
      }}
    >
      {/* ── Subtle Background Watermark / Accent Circles ── */}
      <div
        style={{
          position: 'absolute',
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
          position: 'absolute',
          bottom: '-10%',
          right: '-5%',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255, 190, 41, 0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* ── Main Side-by-Side Content Area (Centered Vertically and Horizontally) ── */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.25rem 2.5rem',
          minHeight: 0,
          zIndex: 1,
        }}
      >
        <div
          style={{
            maxWidth: '1100px',
            width: '100%',
            display: 'grid',
            gridTemplateColumns: '1.15fr 0.85fr',
            gap: '3.5rem',
            alignItems: 'center',
          }}
        >
          {/* ══════════════════════════════════════════════════════
              LEFT SIDE: LARGER LOGO & SYSTEM DESCRIPTION
              Click on logo returns to landing page (/)
             ══════════════════════════════════════════════════════ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
            {/* Clickable Larger Official Crest Logo */}
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
                    width: '114px',
                    height: '114px',
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

            {/* Title & Description Block */}
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
                  fontSize: '1.9rem',
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
                    fontSize: '0.88rem',
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

          {/* ══════════════════════════════════════════════════════
              RIGHT SIDE: LOGIN WINDOW CARD
             ══════════════════════════════════════════════════════ */}
          <div>
            <div
              className="card"
              style={{
                padding: '2.15rem 2.25rem',
                borderTop: '4px solid var(--primary)',
                boxShadow: '0 16px 36px rgba(0, 0, 0, 0.08), 0 4px 12px rgba(0, 0, 0, 0.04)',
                borderRadius: '16px',
                background: '#FFFFFF',
              }}
            >
              <h2
                style={{
                  fontSize: '1.3rem',
                  fontWeight: 800,
                  color: 'var(--primary)',
                  marginBottom: '0.25rem',
                  letterSpacing: '-0.01em',
                }}
              >
                Sign In
              </h2>
              <p style={{ color: '#64748B', fontSize: '0.84rem', marginBottom: '1.35rem' }}>
                Enter your institutional account credentials
              </p>

              {error && (
                <div
                  style={{
                    padding: '0.7rem 0.9rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--error-bg)',
                    border: '1px solid var(--error)',
                    color: 'var(--error)',
                    fontSize: '0.84rem',
                    marginBottom: '1.15rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <span>⚠️</span> {error}
                </div>
              )}

              <form onSubmit={handleLogin}>
                <div className="form-group" style={{ marginBottom: '1.15rem' }}>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem', color: '#1E293B' }}>
                    Username
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    required
                    autoFocus
                    style={{ fontSize: '0.88rem', padding: '0.65rem 0.85rem' }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '1.35rem' }}>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem', color: '#1E293B' }}>
                    Password
                  </label>
                  <input
                    type="password"
                    className="form-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    style={{ fontSize: '0.88rem', padding: '0.65rem 0.85rem' }}
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
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
                  {loading ? <div className="spinner" /> : 'Log In to Portal'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>

      {/* ══════════════════════════════════════════════════════
          SLIM GOVERNMENT FOOTER
         ══════════════════════════════════════════════════════ */}
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
