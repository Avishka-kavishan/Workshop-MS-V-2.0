'use client';

import React from 'react';
import { getBranchAbbreviation, getBranchColor } from '@/lib/branchUtils';

interface BranchBadgeProps {
  name?: string;
  code?: string;
  showName?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  shape?: 'circle' | 'rounded';
  subText?: string;
  className?: string;
  style?: React.CSSProperties;
}

export default function BranchBadge({
  name = 'MOE Branch',
  code,
  showName = true,
  size = 'sm',
  shape = 'circle',
  subText,
  className = '',
  style = {},
}: BranchBadgeProps) {
  const abbr = getBranchAbbreviation(name, code);
  const color = getBranchColor(abbr || name);

  const sizeMap = {
    xs: { dim: '20px', font: '0.58rem', borderRadius: shape === 'circle' ? '50%' : '4px' },
    sm: { dim: '26px', font: '0.68rem', borderRadius: shape === 'circle' ? '50%' : '6px' },
    md: { dim: '32px', font: '0.78rem', borderRadius: shape === 'circle' ? '50%' : '8px' },
    lg: { dim: '40px', font: '0.92rem', borderRadius: shape === 'circle' ? '50%' : '10px' },
  };

  const { dim, font, borderRadius } = sizeMap[size] || sizeMap.sm;

  return (
    <span
      className={`branch-badge-container ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.45rem',
        verticalAlign: 'middle',
        ...style,
      }}
      title={`${name} (${abbr})`}
    >
      {/* Google-style Avatar Badge with max 3 Letters */}
      <span
        style={{
          width: dim,
          height: dim,
          minWidth: dim,
          borderRadius: borderRadius,
          background: color.bg,
          color: color.text,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 800,
          fontSize: font,
          letterSpacing: '0.04em',
          boxShadow: '0 1px 3px rgba(0,0,0,0.18)',
          userSelect: 'none',
          flexShrink: 0,
        }}
      >
        {abbr}
      </span>

      {/* Optional Branch Name & Subtext */}
      {showName && (
        <span style={{ display: 'inline-flex', flexDirection: 'column', lineHeight: 1.25 }}>
          <span style={{ fontWeight: 600, color: 'inherit' }}>
            {name}
          </span>
          {subText && (
            <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary, #64748B)' }}>
              {subText}
            </span>
          )}
        </span>
      )}
    </span>
  );
}

export { getBranchAbbreviation, getBranchColor };
