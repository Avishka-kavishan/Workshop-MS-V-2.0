'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  MOE_HEADQUARTERS_DIVISIONS_DATA,
  getTrafficLight,
} from '@/lib/trafficLightUtils';
import BranchBadge from '@/components/common/BranchBadge';
import { formatMillion, formatRupees } from '@/lib/financialFormat';

function MoEDivisionBranchProgressTile() {
  const [bandFilter, setBandFilter] = useState<'All' | '100%' | '90-99%' | '80-89%' | '70-79%' | '50-69%' | '<50%'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Expanded divisions state
  const [expandedDivisions, setExpandedDivisions] = useState<Record<string, boolean>>({
    'div-curriculum': false,
    'div-planning': false,
    'div-teacher': true,
    'div-infra': false,
  });

  const [sortBy, setSortBy] = useState<'default' | 'progress-asc' | 'progress-desc'>('default');

  const toggleDivision = (id: string) => {
    setExpandedDivisions((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const expandAll = () => {
    const allExpanded: Record<string, boolean> = {};
    MOE_HEADQUARTERS_DIVISIONS_DATA.forEach((div) => {
      allExpanded[div.id] = true;
    });
    setExpandedDivisions(allExpanded);
  };

  const collapseAll = () => {
    setExpandedDivisions({});
  };

  const filteredDivisions = useMemo(() => {
    let result = MOE_HEADQUARTERS_DIVISIONS_DATA.filter((div) => {
      if (bandFilter !== 'All') {
        const tl = getTrafficLight(div.progressPct);
        if (tl.band !== bandFilter) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesDivName = div.name.toLowerCase().includes(q) || div.shortName.toLowerCase().includes(q);
        const matchesHead = div.headOfficer.toLowerCase().includes(q);
        const matchesBranch = div.branches.some(
          (b) =>
            b.name.toLowerCase().includes(q) ||
            b.abbreviation.toLowerCase().includes(q) ||
            (b.voteNumber && b.voteNumber.toLowerCase().includes(q))
        );
        return matchesDivName || matchesHead || matchesBranch;
      }

      return true;
    });

    if (sortBy === 'progress-asc') {
      result = [...result].sort((a, b) => a.progressPct - b.progressPct);
    } else if (sortBy === 'progress-desc') {
      result = [...result].sort((a, b) => b.progressPct - a.progressPct);
    }

    return result;
  }, [bandFilter, searchQuery, sortBy]);

  const totalAllocated = MOE_HEADQUARTERS_DIVISIONS_DATA.reduce((acc, d) => acc + d.budgetAllocatedMn, 0);
  const totalSpent = MOE_HEADQUARTERS_DIVISIONS_DATA.reduce((acc, d) => acc + d.budgetSpentMn, 0);

  return (
    <div
      style={{
        background: '#FFFFFF',
        borderRadius: '16px',
        border: '1px solid #E2E8F0',
        padding: '1.25rem 1.35rem',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
      }}
    >
      {/* ──── Header ──── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(15, 118, 110, 0.1)',
              color: '#0F766E',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.1rem',
              flexShrink: 0,
            }}
          >
            🏛️
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.01em' }}>
              MoE Division & Branch Progress
            </h3>
            <div style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 500 }}>
              National Line Ministry Central Command • 10 Divisions
            </div>
          </div>
        </div>

        {/* Global Expand / Collapse Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <button
            type="button"
            onClick={expandAll}
            style={{
              padding: '0.2rem 0.45rem',
              borderRadius: '6px',
              fontSize: '0.7rem',
              fontWeight: 700,
              border: '1px solid #CBD5E1',
              background: '#F8FAFC',
              color: '#475569',
              cursor: 'pointer',
            }}
          >
            Expand
          </button>
          <button
            type="button"
            onClick={collapseAll}
            style={{
              padding: '0.2rem 0.45rem',
              borderRadius: '6px',
              fontSize: '0.7rem',
              fontWeight: 700,
              border: '1px solid #CBD5E1',
              background: '#F8FAFC',
              color: '#475569',
              cursor: 'pointer',
            }}
          >
            Collapse
          </button>
        </div>
      </div>

      {/* ──── Compact Single-Line Traffic Light Filter Strip ──── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem',
          marginBottom: '0.75rem',
          padding: '3px',
          background: '#F8FAFC',
          borderRadius: '8px',
          border: '1px solid #E2E8F0',
          overflowX: 'auto',
        }}
      >
        <button
          type="button"
          onClick={() => setBandFilter('All')}
          style={{
            flex: '1 0 auto',
            textAlign: 'center',
            fontSize: '0.68rem',
            padding: '0.25rem 0.4rem',
            borderRadius: '6px',
            border: 'none',
            background: bandFilter === 'All' ? '#0F172A' : 'transparent',
            color: bandFilter === 'All' ? '#FFFFFF' : '#475569',
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          All (10)
        </button>

        <button
          type="button"
          onClick={() => setBandFilter(bandFilter === '100%' ? 'All' : '100%')}
          style={{
            flex: '1 0 auto',
            textAlign: 'center',
            fontSize: '0.68rem',
            padding: '0.25rem 0.4rem',
            borderRadius: '6px',
            border: 'none',
            background: bandFilter === '100%' ? '#16A34A' : 'transparent',
            color: bandFilter === '100%' ? '#FFFFFF' : '#166534',
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
          title="100% Target"
        >
          🟢 100%
        </button>

        <button
          type="button"
          onClick={() => setBandFilter(bandFilter === '90-99%' ? 'All' : '90-99%')}
          style={{
            flex: '1 0 auto',
            textAlign: 'center',
            fontSize: '0.68rem',
            padding: '0.25rem 0.4rem',
            borderRadius: '6px',
            border: 'none',
            background: bandFilter === '90-99%' ? '#65A30D' : 'transparent',
            color: bandFilter === '90-99%' ? '#FFFFFF' : '#3F6212',
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
          title="90-99% High Progress"
        >
          🟢 90%+
        </button>

        <button
          type="button"
          onClick={() => setBandFilter(bandFilter === '80-89%' ? 'All' : '80-89%')}
          style={{
            flex: '1 0 auto',
            textAlign: 'center',
            fontSize: '0.68rem',
            padding: '0.25rem 0.4rem',
            borderRadius: '6px',
            border: 'none',
            background: bandFilter === '80-89%' ? '#EAB308' : 'transparent',
            color: bandFilter === '80-89%' ? '#FFFFFF' : '#854D0E',
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
          title="80-89% Satisfactory"
        >
          🟡 80%+
        </button>

        <button
          type="button"
          onClick={() => setBandFilter(bandFilter === '70-79%' ? 'All' : '70-79%')}
          style={{
            flex: '1 0 auto',
            textAlign: 'center',
            fontSize: '0.68rem',
            padding: '0.25rem 0.4rem',
            borderRadius: '6px',
            border: 'none',
            background: bandFilter === '70-79%' ? '#F59E0B' : 'transparent',
            color: bandFilter === '70-79%' ? '#FFFFFF' : '#92400E',
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
          title="70-79% Attention"
        >
          🟠 70%+
        </button>

        <button
          type="button"
          onClick={() => setBandFilter(bandFilter === '50-69%' ? 'All' : '50-69%')}
          style={{
            flex: '1 0 auto',
            textAlign: 'center',
            fontSize: '0.68rem',
            padding: '0.25rem 0.4rem',
            borderRadius: '6px',
            border: 'none',
            background: bandFilter === '50-69%' ? '#F87171' : 'transparent',
            color: bandFilter === '50-69%' ? '#FFFFFF' : '#991B1B',
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
          title="50-69% Underperforming"
        >
          🔴 50%+
        </button>

        <button
          type="button"
          onClick={() => setBandFilter(bandFilter === '<50%' ? 'All' : '<50%')}
          style={{
            flex: '1 0 auto',
            textAlign: 'center',
            fontSize: '0.68rem',
            padding: '0.25rem 0.4rem',
            borderRadius: '6px',
            border: 'none',
            background: bandFilter === '<50%' ? '#DC2626' : 'transparent',
            color: bandFilter === '<50%' ? '#FFFFFF' : '#7F1D1D',
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
          title="< 50% Critical Deficit"
        >
          🔴 &lt;50%
        </button>
      </div>

      {/* ──── Compact Live Search Bar ──── */}
      <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
        <span
          style={{
            position: 'absolute',
            left: '9px',
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '0.76rem',
            color: '#94A3B8',
            pointerEvents: 'none',
          }}
        >
          🔍
        </span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter branch abbreviation (TEB, ICT, PPB, CDB) or officer..."
          style={{
            width: '100%',
            paddingLeft: '1.9rem',
            paddingRight: searchQuery ? '1.8rem' : '0.55rem',
            paddingTop: '0.3rem',
            paddingBottom: '0.3rem',
            borderRadius: '6px',
            border: '1px solid #CBD5E1',
            fontSize: '0.74rem',
            outline: 'none',
            background: '#F8FAFC',
          }}
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            style={{
              position: 'absolute',
              right: '7px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              color: '#94A3B8',
              fontSize: '0.76rem',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* ──── Clean Division Accordion List (Styled to Match Existing Cards) ──── */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.65rem',
          flex: 1,
          maxHeight: '340px',
          overflowY: 'auto',
          paddingRight: '2px',
        }}
      >
        {filteredDivisions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '1.5rem', color: '#64748B', fontSize: '0.78rem' }}>
            No divisions match the filter.
          </div>
        ) : (
          filteredDivisions.map((div) => {
            const tl = getTrafficLight(div.progressPct);
            const isExpanded = !!expandedDivisions[div.id];
            const hasIssues = div.branches.some((b) => !!b.highlightedIssue);

            return (
              <div
                key={div.id}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderLeft: `4px solid ${tl.bg}`,
                  borderRadius: '10px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                  overflow: 'visible',
                  transition: 'background 0.15s ease',
                }}
              >
                {/* Division Header Row */}
                <div
                  onClick={() => toggleDivision(div.id)}
                  style={{
                    padding: '0.65rem 0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    userSelect: 'none',
                    minHeight: '44px',
                    lineHeight: 1.35,
                    borderBottom: isExpanded ? '1px solid #F1F5F9' : 'none',
                    background: isExpanded ? '#F8FAFC' : '#FFFFFF',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 0, paddingRight: '0.5rem' }}>
                    <span style={{ fontSize: '0.68rem', color: '#64748B', transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}>
                      ▶
                    </span>

                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.84rem', color: '#0F172A' }}>
                          {div.shortName}
                        </span>
                        <span
                          style={{
                            fontSize: '0.64rem',
                            padding: '0.08rem 0.35rem',
                            borderRadius: '4px',
                            background: tl.lightBg,
                            color: tl.badgeColor,
                            fontWeight: 700,
                          }}
                        >
                          {tl.label}
                        </span>
                        {hasIssues && (
                          <span
                            style={{
                              fontSize: '0.62rem',
                              padding: '0.06rem 0.3rem',
                              borderRadius: '3px',
                              background: '#FEE2E2',
                              color: '#DC2626',
                              fontWeight: 700,
                            }}
                          >
                            ⚠️ Action
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }}>
                        {div.headOfficer} • {div.branches.length} Branches
                      </div>
                    </div>
                  </div>

                  {/* Progress & Bar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexShrink: 0 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.95rem', fontWeight: 800, color: tl.bg }}>
                        {div.progressPct}%
                      </div>
                      <div style={{ fontSize: '0.62rem', color: '#64748B' }} title={`Exact: ${formatRupees(div.budgetSpentMn, true)}`}>
                        Rs. {formatMillion(div.budgetSpentMn)} Mn
                      </div>
                    </div>

                    <div style={{ width: '40px', height: '6px', background: '#E2E8F0', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(div.progressPct, 100)}%`, height: '100%', background: tl.bg, borderRadius: '3px' }} />
                    </div>
                  </div>
                </div>

                {/* Expanded Constituent Branches */}
                {isExpanded && (
                  <div style={{ padding: '0.65rem 0.85rem', background: '#FAFCFF', display: 'flex', flexDirection: 'column', gap: '0.55rem', animation: 'fadeIn 0.18s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                    {div.branches.map((branch) => {
                      const btl = getTrafficLight(branch.progressPct);

                      return (
                        <div
                          key={branch.id}
                          style={{
                            background: '#FFFFFF',
                            border: '1px solid #E2E8F0',
                            borderRadius: '8px',
                            padding: '0.55rem 0.75rem',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.4rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <BranchBadge
                                name={branch.name}
                                code={branch.abbreviation}
                                size="sm"
                                shape="circle"
                                showName={false}
                              />
                              <div>
                                <div style={{ fontWeight: 800, fontSize: '0.8rem', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                  <span>{branch.name}</span>
                                  <span style={{ fontSize: '0.66rem', background: '#F1F5F9', color: '#475569', padding: '0.05rem 0.3rem', borderRadius: '3px' }}>
                                    {branch.abbreviation}
                                  </span>
                                </div>
                                <div style={{ fontSize: '0.66rem', color: '#64748B', marginTop: '1px' }}>
                                  Vote: <code>{branch.voteNumber}</code> • Milestones: <strong>{branch.completedMilestones}/{branch.plannedMilestones}</strong>
                                </div>
                              </div>
                            </div>

                            <span
                              style={{
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                padding: '0.1rem 0.4rem',
                                borderRadius: '4px',
                                background: btl.bg,
                                color: btl.textColor,
                              }}
                            >
                              {branch.progressPct}%
                            </span>
                          </div>

                          <div style={{ height: '5px', background: '#E2E8F0', borderRadius: '3px', overflow: 'hidden', marginTop: '0.4rem' }}>
                            <div style={{ width: `${Math.min(branch.progressPct, 100)}%`, height: '100%', background: btl.bg, borderRadius: '3px' }} />
                          </div>

                          {branch.highlightedIssue && (
                            <div
                              style={{
                                marginTop: '0.45rem',
                                background: branch.issueSeverity === 'Critical' ? '#FEF2F2' : '#FFFBEB',
                                border: `1px solid ${branch.issueSeverity === 'Critical' ? '#FCA5A5' : '#FDE68A'}`,
                                borderRadius: '6px',
                                padding: '0.4rem 0.55rem',
                                fontSize: '0.68rem',
                              }}
                            >
                              <strong style={{ color: branch.issueSeverity === 'Critical' ? '#991B1B' : '#92400E' }}>
                                ⚠️ {branch.issueSeverity} Blocker:
                              </strong>{' '}
                              <span style={{ color: branch.issueSeverity === 'Critical' ? '#7F1D1D' : '#78350F' }}>
                                {branch.highlightedIssue}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ──── Footer (Matching Existing Cards) ──── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: '0.75rem',
          paddingTop: '0.65rem',
          borderTop: '1px solid #F1F5F9',
          fontSize: '0.72rem',
        }}
      >
        <span style={{ color: '#64748B' }} title={`Exact: Rs. ${formatRupees(totalSpent, true)} / Rs. ${formatRupees(totalAllocated, true)}`}>
          Line Ministry: <strong>Rs. {formatMillion(totalSpent)} Mn</strong> / <strong>{formatMillion(totalAllocated)} Mn</strong>
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Link
            href="/organizations"
            style={{ color: '#0F766E', fontWeight: 700, textDecoration: 'none' }}
          >
            Tree →
          </Link>
          <span style={{ color: '#CBD5E1' }}>•</span>
          <Link
            href="/annual-plan"
            style={{ color: '#0284C7', fontWeight: 700, textDecoration: 'none' }}
          >
            AIP →
          </Link>
        </div>
      </div>
    </div>
  );
}

export default React.memo(MoEDivisionBranchProgressTile);
