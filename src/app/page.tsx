'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import PerformanceMonitoringChart from '@/components/dashboard/PerformanceMonitoringChart';
import RegionalMap from '@/components/dashboard/RegionalMap';

export default function LandingPage() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const [showSignUpNotice, setShowSignUpNotice] = useState(false);

  // Data-driven Last Updated Time (MoE Planning baseline for public, organization-level for logged-in users)
  const [lastUpdatedTime, setLastUpdatedTime] = useState('14 Nov 2026, 01:00 AM SLST');

  React.useEffect(() => {
    fetch('/api/system/last-updated')
      .then((res) => res.json())
      .then((data) => {
        if (data?.lastUpdated) {
          setLastUpdatedTime(data.lastUpdated);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div
      style={{
        height: '100vh',
        maxHeight: '100vh',
        overflow: 'hidden',
        background: 'radial-gradient(ellipse at 50% 0%, #4a0d1e 0%, #24050b 70%, #150307 100%)',
        color: '#FFFFFF',
        fontFamily: 'inherit',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ══════════════════════════════════════════════════════
          1. COMPACT TOP GOVERNMENT NAVIGATION BAR
         ══════════════════════════════════════════════════════ */}
      <header
        style={{
          borderBottom: '1px solid rgba(255, 190, 41, 0.25)',
          background: 'rgba(44, 7, 15, 0.96)',
          backdropFilter: 'blur(10px)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          padding: '0.65rem 1.5rem',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            maxWidth: '1440px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          {/* Brand Identity with Official Crest Emblem */}
          <Link
            href="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              textDecoration: 'none',
              color: '#fff',
            }}
          >
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: '#FFFFFF',
                border: '2px solid #FFBE29',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
                padding: '2px',
                overflow: 'hidden',
                flexShrink: 0,
              }}
            >
              <img
                src="/logo-emblem.png"
                alt="MoE-IPMIS Crest"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </div>
            <div>
              <div style={{ fontSize: '1.15rem', fontWeight: 900, letterSpacing: '0.04em', color: '#FFFFFF' }}>
                IPMIS
              </div>
              <div
                style={{
                  fontSize: '0.68rem',
                  color: '#FFBE29',
                  fontWeight: 700,
                  letterSpacing: '0.03em',
                  textTransform: 'uppercase',
                }}
              >
                Ministry of Education • Sri Lanka
              </div>
            </div>
          </Link>

          {/* Action CTAs: Sign Up & Sign In */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            {/* Sign Up Button (opens notice to contact system administrator) */}
            <button
              type="button"
              onClick={() => setShowSignUpNotice(true)}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#FFBE29',
                border: '1px solid rgba(255, 190, 41, 0.45)',
                padding: '0.42rem 0.95rem',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.84rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 190, 41, 0.15)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)')}
            >
              <span>Sign Up</span>
            </button>

            {/* Log in CTA Button */}
            <Link
              href="/login"
              style={{
                background: 'linear-gradient(135deg, #FFBE29 0%, #F59E0B 100%)',
                color: '#3b0a13',
                padding: '0.42rem 1.15rem',
                borderRadius: '8px',
                fontWeight: 800,
                fontSize: '0.84rem',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 3px 12px rgba(255, 190, 41, 0.35)',
                cursor: 'pointer',
              }}
            >
              <span>Log in</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════
          2. UNIFIED SINGLE-WINDOW CONTENT WORKSPACE
         ══════════════════════════════════════════════════════ */}
      <main
        style={{
          flex: 1,
          minHeight: 0,
          maxWidth: '1440px',
          width: '100%',
          margin: '0 auto',
          padding: '0.65rem 1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.65rem',
        }}
      >
        {/* Compact Executive Header Banner */}
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.22)',
            border: '1px solid rgba(255, 190, 41, 0.25)',
            borderRadius: '12px',
            padding: '0.65rem 1.15rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Executive System Headline */}
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 900, color: '#FFFFFF', letterSpacing: '-0.01em' }}>
              Integrated Planning & Monitoring Information System (IPMIS)
            </div>
            <div style={{ fontSize: '0.74rem', color: 'rgba(255, 255, 255, 0.76)', marginTop: '2px' }}>
              An integrated national platform for coordinated education-sector planning, budgeting, implementation, and performance monitoring across the General Education Sector
            </div>
          </div>
        </div>

        {/* Side-by-Side Public Telemetry Dashboard (Performance Monitoring & Province-Wise Map) */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: '1rem',
            alignItems: 'stretch',
          }}
        >
          {/* Tile 1: Performance Monitoring (Physical completion curve & sector progress) */}
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, height: '100%' }}>
            <PerformanceMonitoringChart />
          </div>

          {/* Tile 2: Province-Wise Monitoring Map (Sri Lanka 9 Provinces • Traffic Light System) */}
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, height: '100%' }}>
            <RegionalMap />
          </div>
        </div>
      </main>

      {/* ══════════════════════════════════════════════════════
          3. SLIM GOVERNMENT FOOTER
         ══════════════════════════════════════════════════════ */}
      <footer
        style={{
          borderTop: '1px solid rgba(255, 190, 41, 0.2)',
          background: 'rgba(20, 3, 7, 0.98)',
          padding: '0.5rem 1.5rem',
          flexShrink: 0,
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.74rem', color: 'rgba(255, 255, 255, 0.75)' }}>
              DMISDU- MoE, copyrights MoE
            </span>
            <a
              href="mailto:gasithamoe@gmail.com"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                color: '#FFBE29',
                textDecoration: 'none',
                fontSize: '0.74rem',
                fontWeight: 600,
                transition: 'opacity 0.15s ease',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', display: 'inline-block', boxShadow: '0 0 6px #10B981' }}></span>
            <span style={{ fontSize: '0.7rem', color: '#10B981', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              LAST UPDATED: {lastUpdatedTime}
            </span>
          </div>
        </div>
      </footer>

      {/* ──── Sign Up / Registration Notice Modal ──── */}
      {showSignUpNotice && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '1.25rem',
          }}
          onClick={() => setShowSignUpNotice(false)}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              maxWidth: '480px',
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
              border: '1px solid #E2E8F0',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                background: 'linear-gradient(135deg, #3b0a13 0%, #5c1421 100%)',
                color: '#FFFFFF',
                padding: '1.15rem 1.4rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '2px solid #FFBE29',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <span style={{ fontSize: '1.3rem' }}>🛡️</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.02rem', fontWeight: 800, color: '#FFFFFF' }}>
                    Officer Account Registration
                  </h3>
                  <div style={{ fontSize: '0.72rem', color: '#FFBE29', fontWeight: 600 }}>
                    Ministry of Education Sri Lanka • IPMIS
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSignUpNotice(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '30px',
                  height: '30px',
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.4rem 1.5rem', color: '#1E293B' }}>
              <div
                style={{
                  background: '#FEF3C7',
                  border: '1px solid #F59E0B',
                  borderRadius: '10px',
                  padding: '0.85rem 1rem',
                  display: 'flex',
                  gap: '0.75rem',
                  alignItems: 'flex-start',
                  marginBottom: '1rem',
                }}
              >
                <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>⚠️</span>
                <div style={{ fontSize: '0.82rem', color: '#92400E', lineHeight: 1.5 }}>
                  <strong>Self-registration is restricted.</strong> Please contact your system administrator to provision your official account.
                </div>
              </div>

              <div style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.6, marginBottom: '1.15rem' }}>
                IPMIS access is governed by National Education Security protocols. National Ministry, Provincial Department, and Zonal Education Office personnel must be provisioned by an authorized administrator.
              </div>

              <div style={{ background: '#F8FAFC', borderRadius: '8px', padding: '0.75rem 1rem', border: '1px solid #E2E8F0', fontSize: '0.78rem', color: '#334155' }}>
                <div><strong>Support Helpdesk:</strong> MOE ICT & Planning Branch</div>
                <div style={{ marginTop: '3px' }}><strong>Contact:</strong> admin-ipmis@moe.gov.lk</div>
              </div>

              {/* Action */}
              <div style={{ marginTop: '1.35rem', display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
                <button
                  type="button"
                  onClick={() => setShowSignUpNotice(false)}
                  style={{
                    background: '#0F172A',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.45rem 1.25rem',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                  }}
                >
                  Understood
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
