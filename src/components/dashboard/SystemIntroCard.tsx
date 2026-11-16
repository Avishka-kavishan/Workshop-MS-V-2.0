'use client';

import React from 'react';
import Link from 'next/link';

interface SystemIntroCardProps {
  lastUpdatedTime?: string;
  totalWorkshops?: number;
  totalActivities?: number;
  nationalExecutionRate?: number;
}

export default function SystemIntroCard({
  lastUpdatedTime = '14 Nov 2026, 03:00 PM SLST',
  totalWorkshops = 186,
  totalActivities = 184,
  nationalExecutionRate = 54.1,
}: SystemIntroCardProps) {
  return (
    <div
      style={{
        background: 'linear-gradient(145deg, #0A2540 0%, #0F3B66 100%)',
        borderRadius: '14px',
        padding: '1rem 1.15rem',
        color: '#FFFFFF',
        boxShadow: '0 4px 16px rgba(10, 37, 64, 0.15)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        border: '1px solid rgba(255, 255, 255, 0.12)',
      }}
    >
      {/* Subtle background glow effect */}
      <div
        style={{
          position: 'absolute',
          top: '-30px',
          right: '-30px',
          width: '120px',
          height: '120px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(14, 165, 233, 0.25) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Top Header Row with Logo & Identity */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.65rem' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: '#FFFFFF',
              padding: '3px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)',
              flexShrink: 0,
            }}
          >
            <img
              src="/logo-emblem.png"
              alt="MoE IPMIS Emblem"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: '#FFBE29',
                }}
              >
                Ministry of Education • Sri Lanka
              </span>
              <span
                style={{
                  fontSize: '0.62rem',
                  fontWeight: 700,
                  padding: '1px 6px',
                  borderRadius: '10px',
                  background: 'rgba(16, 185, 129, 0.25)',
                  color: '#34D399',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                }}
              >
                ● Operational
              </span>
            </div>
            <h2
              style={{
                margin: '2px 0 0',
                fontSize: '1.05rem',
                fontWeight: 800,
                color: '#FFFFFF',
                letterSpacing: '-0.01em',
                lineHeight: 1.25,
              }}
            >
              IPMIS Platform
            </h2>
            <div style={{ fontSize: '0.72rem', color: '#93C5FD', fontWeight: 600 }}>
              Integrated Planning & Monitoring Information System
            </div>
          </div>
        </div>

        {/* Compact Description */}
        <p
          style={{
            margin: '0.4rem 0 0.75rem',
            fontSize: '0.74rem',
            lineHeight: 1.45,
            color: '#E2E8F0',
            opacity: 0.95,
          }}
        >
          Annual Budget Formulation, AIP Implementation & Multi-Tier Monitoring Platform connecting the General Education Sector.
        </p>

        {/* Administrative Coverage Matrix Pills */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '0.4rem',
            marginBottom: '0.75rem',
          }}
        >
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '8px',
              padding: '0.35rem 0.55rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <span style={{ fontSize: '0.85rem' }}>🏛️</span>
            <div>
              <div style={{ fontSize: '0.62rem', color: '#93C5FD', textTransform: 'uppercase', fontWeight: 700 }}>National</div>
              <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#FFFFFF' }}>Ministry of Education</div>
            </div>
          </div>

          <div
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '8px',
              padding: '0.35rem 0.55rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <span style={{ fontSize: '0.85rem' }}>🗺️</span>
            <div>
              <div style={{ fontSize: '0.62rem', color: '#93C5FD', textTransform: 'uppercase', fontWeight: 700 }}>Regional</div>
              <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#FFFFFF' }}>9 Provincial Depts</div>
            </div>
          </div>

          <div
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '8px',
              padding: '0.35rem 0.55rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <span style={{ fontSize: '0.85rem' }}>📍</span>
            <div>
              <div style={{ fontSize: '0.62rem', color: '#93C5FD', textTransform: 'uppercase', fontWeight: 700 }}>Sub-Regional</div>
              <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#FFFFFF' }}>100 Education Zones</div>
            </div>
          </div>

          <div
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '8px',
              padding: '0.35rem 0.55rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <span style={{ fontSize: '0.85rem' }}>🏫</span>
            <div>
              <div style={{ fontSize: '0.62rem', color: '#93C5FD', textTransform: 'uppercase', fontWeight: 700 }}>Grassroots</div>
              <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#FFFFFF' }}>10,150+ Schools</div>
            </div>
          </div>
        </div>
      </div>

      {/* Card Footer: Metadata & Quick Links */}
      <div
        style={{
          borderTop: '1px solid rgba(255, 255, 255, 0.15)',
          paddingTop: '0.6rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.68rem',
          color: '#CBD5E1',
          flexWrap: 'wrap',
          gap: '0.4rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span style={{ color: '#38BDF8' }}>⏱️</span>
          <span>Updated: <strong>{lastUpdatedTime}</strong></span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <Link
            href="/monitoring"
            style={{
              color: '#FFBE29',
              fontWeight: 700,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '2px',
            }}
          >
            Audit Workspace →
          </Link>
        </div>
      </div>
    </div>
  );
}
