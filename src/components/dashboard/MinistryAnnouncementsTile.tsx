'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';

export interface AnnouncementItem {
  id: string;
  title: string;
  circularNumber?: string;
  content: string;
  priority: 'Urgent' | 'High' | 'Normal';
  targetLevel: number | 'All';
  targetBranchIds?: string[];
  publishDate: string;
  expiryDate?: string;
  isPublished: boolean;
  authorName: string;
  createdAt: string;
  createdBy?: string;
}

interface MinistryAnnouncementsTileProps {
  currentUser?: {
    id?: string;
    name?: string;
    username?: string;
    roleName?: string;
    isSuperAdmin?: boolean;
    isLevelAdmin?: boolean;
    adminLevel?: number;
  };
  initialAnnouncements?: AnnouncementItem[];
}

export default function MinistryAnnouncementsTile({ currentUser, initialAnnouncements }: MinistryAnnouncementsTileProps) {
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>(() => initialAnnouncements || []);
  const [loading, setLoading] = useState(() => !initialAnnouncements || initialAnnouncements.length === 0);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [activeCategory, setActiveCategory] = useState<'all' | 'urgent' | 'planning' | 'monitoring' | 'workshops'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Official Letterhead Modal
  const [viewingLetterhead, setViewingLetterhead] = useState<AnnouncementItem | null>(null);

  // Publish Circular Modal
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishForm, setPublishForm] = useState({
    title: '',
    circularNumber: `ED/CIR/${new Date().getFullYear()}/`,
    priority: 'Normal' as 'Urgent' | 'High' | 'Normal',
    targetLevel: 'All' as number | 'All',
    content: '',
    authorName: currentUser?.name || 'Ministry Chief Super Administrator',
  });
  const [publishSuccessMessage, setPublishSuccessMessage] = useState<string | null>(null);

  const canPublish = useMemo(() => {
    if (!currentUser) return false;
    return Boolean(
      currentUser.isSuperAdmin ||
      currentUser.isLevelAdmin ||
      currentUser.adminLevel === 1 ||
      currentUser.username === 'superadmin' ||
      currentUser.username === 'admin' ||
      currentUser.username === 'planning.officer'
    );
  }, [currentUser]);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/admin/announcements');
      if (!res.ok) throw new Error('Failed to load announcements');
      const data = await res.json();
      setAnnouncements(data.announcements || []);
    } catch (err: any) {
      console.error('Error fetching announcements:', err);
      setError(err.message || 'Error fetching announcements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialAnnouncements && initialAnnouncements.length > 0) {
      setAnnouncements(initialAnnouncements);
      setLoading(false);
    } else {
      fetchAnnouncements();
    }
  }, [initialAnnouncements]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copyCircularRef = (refNum: string, id: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(refNum);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2500);
    }
  };

  const handlePublishSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publishForm.title.trim() || !publishForm.content.trim()) return;

    try {
      setPublishing(true);
      const res = await fetch('/api/admin/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...publishForm,
          publishDate: new Date().toISOString().split('T')[0],
          isPublished: true,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to publish announcement');
      }

      setPublishSuccessMessage('Official Circular published and broadcasted successfully!');
      setTimeout(() => setPublishSuccessMessage(null), 4000);
      setIsPublishModalOpen(false);
      setPublishForm({
        title: '',
        circularNumber: `ED/CIR/${new Date().getFullYear()}/`,
        priority: 'Normal',
        targetLevel: 'All',
        content: '',
        authorName: currentUser?.name || 'Ministry Chief Super Administrator',
      });
      fetchAnnouncements();
    } catch (err: any) {
      alert(`Publishing failed: ${err.message}`);
    } finally {
      setPublishing(false);
    }
  };

  // Filtered List
  const filteredAnnouncements = useMemo(() => {
    return announcements.filter((a) => {
      // Category filter
      if (activeCategory === 'urgent' && a.priority !== 'Urgent' && a.priority !== 'High') return false;
      if (activeCategory === 'planning' && !a.title.toLowerCase().includes('plan') && !a.title.toLowerCase().includes('aip') && !a.title.toLowerCase().includes('budget') && !a.content.toLowerCase().includes('aip')) return false;
      if (activeCategory === 'monitoring' && !a.title.toLowerCase().includes('monitor') && !a.title.toLowerCase().includes('audit') && !a.content.toLowerCase().includes('verification')) return false;
      if (activeCategory === 'workshops' && !a.title.toLowerCase().includes('workshop') && !a.title.toLowerCase().includes('teacher') && !a.content.toLowerCase().includes('trainee')) return false;

      // Text search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesTitle = a.title.toLowerCase().includes(query);
        const matchesContent = a.content.toLowerCase().includes(query);
        const matchesRef = a.circularNumber?.toLowerCase().includes(query);
        const matchesAuthor = a.authorName?.toLowerCase().includes(query);
        return matchesTitle || matchesContent || matchesRef || matchesAuthor;
      }

      return true;
    });
  }, [announcements, activeCategory, searchQuery]);

  const urgentCount = announcements.filter((a) => a.priority === 'Urgent').length;
  const highCount = announcements.filter((a) => a.priority === 'High').length;

  return (
    <div
      id="ministry-announcements-section"
      style={{
        background: '#FFFFFF',
        borderRadius: '16px',
        border: '1px solid #E2E8F0',
        boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.06)',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* ── TOP HEADER (Official Ministry Branding) ── */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #334155 100%)',
          padding: '1.25rem 1.5rem',
          color: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          borderBottom: '3px solid #FFBE29',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #FFBE29 0%, #D97706 100%)',
              color: '#0F172A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.45rem',
              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.35)',
              flexShrink: 0,
            }}
          >
            📢
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
              <h3 style={{ margin: 0, fontSize: '1.18rem', fontWeight: 800, letterSpacing: '-0.01em', color: '#FFFFFF' }}>
                Ministry Announcements & Policy Circulars
              </h3>
              <span
                style={{
                  background: 'rgba(255, 190, 41, 0.2)',
                  color: '#FFBE29',
                  border: '1px solid rgba(255, 190, 41, 0.4)',
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  padding: '0.15rem 0.55rem',
                  borderRadius: '12px',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                Official Dispatch
              </span>
            </div>
            <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: '#94A3B8' }}>
              Gazetted circulars, annual implementation directives, and statutory notifications issued by Ministry Leadership
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          {urgentCount > 0 && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: 'rgba(239, 68, 68, 0.2)',
                border: '1px solid #EF4444',
                color: '#FCA5A5',
                padding: '0.35rem 0.75rem',
                borderRadius: '8px',
                fontSize: '0.74rem',
                fontWeight: 700,
              }}
            >
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#EF4444' }} />
              <span>{urgentCount} Urgent Directive{urgentCount > 1 ? 's' : ''}</span>
            </div>
          )}

          <button
            type="button"
            onClick={fetchAnnouncements}
            disabled={loading}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#F8FAFC',
              borderRadius: '8px',
              padding: '0.42rem 0.75rem',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              transition: 'all 0.15s ease',
            }}
            title="Refresh announcements feed"
          >
            <span style={{ display: 'inline-block', transform: loading ? 'rotate(180deg)' : 'none', transition: 'transform 0.5s ease' }}>🔄</span>
            <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          {canPublish && (
            <button
              type="button"
              onClick={() => setIsPublishModalOpen(true)}
              style={{
                background: 'linear-gradient(135deg, #0F766E 0%, #0D9488 100%)',
                border: '1px solid #14B8A6',
                color: '#FFFFFF',
                borderRadius: '8px',
                padding: '0.42rem 0.95rem',
                fontSize: '0.76rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: '0 2px 8px rgba(13, 148, 136, 0.3)',
              }}
            >
              <span>➕</span>
              <span>Publish Circular</span>
            </button>
          )}
        </div>
      </div>

      {/* ── NOTIFICATION SUCCESS BANNER ── */}
      {publishSuccessMessage && (
        <div
          style={{
            background: '#F0FDF4',
            borderBottom: '1px solid #86EFAC',
            color: '#166534',
            padding: '0.65rem 1.5rem',
            fontSize: '0.8rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <span>✅</span>
          <span>{publishSuccessMessage}</span>
        </div>
      )}

      {/* ── FILTER TABS & SEARCH BAR ── */}
      <div
        style={{
          padding: '0.85rem 1.5rem',
          background: '#F8FAFC',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        {/* Category Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: `All Notices (${announcements.length})`, icon: '📄' },
            { id: 'urgent', label: `Urgent & High (${urgentCount + highCount})`, icon: '🚨' },
            { id: 'planning', label: 'Planning & AIP', icon: '📅' },
            { id: 'monitoring', label: 'Monitoring & Audit', icon: '🔍' },
            { id: 'workshops', label: 'Workshops & Training', icon: '🎓' },
          ].map((tab) => {
            const isSelected = activeCategory === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveCategory(tab.id as any)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.38rem 0.8rem',
                  borderRadius: '20px',
                  fontSize: '0.76rem',
                  fontWeight: isSelected ? 800 : 600,
                  border: isSelected ? '1px solid #0F766E' : '1px solid #CBD5E1',
                  background: isSelected ? '#0F766E' : '#FFFFFF',
                  color: isSelected ? '#FFFFFF' : '#475569',
                  cursor: 'pointer',
                  boxShadow: isSelected ? '0 2px 6px rgba(15, 118, 110, 0.2)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Real-time Search */}
        <div style={{ minWidth: '240px', position: 'relative' }}>
          <input
            type="text"
            placeholder="Search circulars, ref #, or author..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.42rem 0.75rem 0.42rem 2.1rem',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              fontSize: '0.78rem',
              background: '#FFFFFF',
              color: '#0F172A',
              outline: 'none',
            }}
          />
          <span style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.82rem', color: '#94A3B8' }}>
            🔍
          </span>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '0.5rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer',
                fontSize: '0.8rem',
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ── MAIN ANNOUNCEMENTS CONTENT FEED ── */}
      <div style={{ padding: '1.25rem 1.5rem' }}>
        {loading && (
          <div style={{ padding: '3rem 1rem', textAlign: 'center', color: '#64748B' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>⏳</div>
            <div style={{ fontSize: '0.86rem', fontWeight: 600 }}>Loading official announcements & circulars...</div>
          </div>
        )}

        {!loading && error && (
          <div style={{ padding: '2rem', textAlign: 'center', background: '#FEF2F2', borderRadius: '10px', border: '1px solid #FCA5A5' }}>
            <div style={{ color: '#DC2626', fontWeight: 700, fontSize: '0.86rem' }}>Failed to load announcements</div>
            <p style={{ margin: '4px 0 10px', fontSize: '0.76rem', color: '#7F1D1D' }}>{error}</p>
            <button type="button" onClick={fetchAnnouncements} className="btn btn-secondary btn-sm">
              Retry
            </button>
          </div>
        )}

        {!loading && !error && filteredAnnouncements.length === 0 && (
          <div style={{ padding: '3rem 1rem', textAlign: 'center', background: '#F8FAFC', borderRadius: '12px', border: '1px dashed #CBD5E1' }}>
            <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>📭</div>
            <h4 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 700, color: '#334155' }}>
              No circulars found matching your selection
            </h4>
            <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#64748B' }}>
              {searchQuery ? `No circulars match "${searchQuery}". Clear your search query.` : 'No official announcements have been published in this category.'}
            </p>
          </div>
        )}

        {!loading && !error && filteredAnnouncements.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filteredAnnouncements.map((item) => {
              const isUrgent = item.priority === 'Urgent';
              const isHigh = item.priority === 'High';
              const isExpanded = Boolean(expandedIds[item.id]);

              const borderColor = isUrgent ? '#EF4444' : isHigh ? '#F59E0B' : '#0284C7';
              const badgeBg = isUrgent ? '#FEE2E2' : isHigh ? '#FEF3C7' : '#E0F2FE';
              const badgeTextColor = isUrgent ? '#991B1B' : isHigh ? '#92400E' : '#075985';

              // Contextual Action Link based on title/circular
              let actionLink: { label: string; href: string } | null = null;
              if (item.circularNumber?.includes('AIP') || item.title.includes('AIP') || item.title.includes('Budget')) {
                actionLink = { label: 'Open Annual Implementation Plan (AIP) Portal →', href: '/annual-plan' };
              } else if (item.circularNumber?.includes('WS') || item.title.includes('Workshop') || item.title.includes('Training')) {
                actionLink = { label: 'Open Workshops & Logistics Directory →', href: '/workshops' };
              } else if (item.circularNumber?.includes('AUD') || item.title.includes('Monitoring') || item.title.includes('Evidence')) {
                actionLink = { label: 'Open Monitoring & Evidence Upload Portal →', href: '/monitoring' };
              }

              return (
                <div
                  key={item.id}
                  style={{
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                    borderLeft: `5px solid ${borderColor}`,
                    background: isUrgent ? 'linear-gradient(to right, #FFF5F5, #FFFFFF)' : '#FFFFFF',
                    boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
                    padding: '1.15rem 1.35rem',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {/* Card Meta Row: Circular Ref #, Priority Badge, Target Level, Date */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.65rem', marginBottom: '0.65rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {/* Circular Ref Pill */}
                      {item.circularNumber ? (
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            background: '#0F172A',
                            color: '#FFBE29',
                            fontFamily: 'monospace',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            padding: '0.2rem 0.55rem',
                            borderRadius: '6px',
                            letterSpacing: '0.04em',
                          }}
                        >
                          <span>📜</span>
                          <span>{item.circularNumber}</span>
                          <button
                            type="button"
                            onClick={() => copyCircularRef(item.circularNumber!, item.id)}
                            style={{
                              background: 'rgba(255, 255, 255, 0.15)',
                              border: 'none',
                              color: '#FFFFFF',
                              borderRadius: '4px',
                              padding: '1px 5px',
                              fontSize: '0.65rem',
                              cursor: 'pointer',
                              marginLeft: '3px',
                            }}
                            title="Copy Circular Reference Number"
                          >
                            {copiedId === item.id ? '✓' : 'Copy'}
                          </button>
                        </div>
                      ) : (
                        <span
                          style={{
                            background: '#E2E8F0',
                            color: '#475569',
                            fontFamily: 'monospace',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '0.15rem 0.5rem',
                            borderRadius: '6px',
                          }}
                        >
                          NOTICE
                        </span>
                      )}

                      {/* Priority Badge */}
                      <span
                        style={{
                          background: badgeBg,
                          color: badgeTextColor,
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          padding: '0.18rem 0.55rem',
                          borderRadius: '12px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.03em',
                        }}
                      >
                        <span
                          style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: borderColor,
                            display: 'inline-block',
                          }}
                        />
                        <span>{item.priority} Priority</span>
                      </span>

                      {/* Target Level */}
                      <span
                        style={{
                          background: '#F1F5F9',
                          color: '#475569',
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          padding: '0.18rem 0.5rem',
                          borderRadius: '6px',
                          border: '1px solid #E2E8F0',
                        }}
                      >
                        🎯 Target: {item.targetLevel === 'All' ? 'All Administrative Tiers' : `Level ${item.targetLevel}`}
                      </span>
                    </div>

                    {/* Date & Issuing Authority */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.72rem', color: '#64748B' }}>
                      <span>📅 {item.publishDate}</span>
                      <span>•</span>
                      <span style={{ fontWeight: 600, color: '#334155' }}>🏛️ {item.authorName}</span>
                    </div>
                  </div>

                  {/* Circular Title */}
                  <h4
                    style={{
                      margin: '0 0 0.5rem 0',
                      fontSize: '0.98rem',
                      fontWeight: 800,
                      color: '#0F172A',
                      lineHeight: 1.4,
                    }}
                  >
                    {item.title}
                  </h4>

                  {/* Circular Content Body */}
                  <div
                    style={{
                      fontSize: '0.82rem',
                      lineHeight: 1.55,
                      color: '#334155',
                      background: '#F8FAFC',
                      padding: '0.85rem 1rem',
                      borderRadius: '8px',
                      border: '1px solid #F1F5F9',
                      marginBottom: '0.75rem',
                      maxHeight: isExpanded ? 'none' : '4.6rem',
                      overflow: 'hidden',
                      position: 'relative',
                    }}
                  >
                    {item.content}
                    {!isExpanded && item.content.length > 200 && (
                      <div
                        style={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          height: '2rem',
                          background: 'linear-gradient(to bottom, rgba(248, 250, 252, 0), rgba(248, 250, 252, 1))',
                        }}
                      />
                    )}
                  </div>

                  {/* Card Footer: Expand toggle, Action deep link, Official Letterhead preview */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.65rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {item.content.length > 200 && (
                        <button
                          type="button"
                          onClick={() => toggleExpand(item.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#0F766E',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            padding: 0,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.2rem',
                          }}
                        >
                          <span>{isExpanded ? '▲ Collapse Circular' : '▼ Read Full Circular Text'}</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setViewingLetterhead(item)}
                        style={{
                          background: '#FFFFFF',
                          border: '1px solid #CBD5E1',
                          color: '#334155',
                          borderRadius: '6px',
                          padding: '0.28rem 0.65rem',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <span>🏛️</span>
                        <span>View Official Letterhead</span>
                      </button>
                    </div>

                    {actionLink && (
                      <Link
                        href={actionLink.href}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          background: '#0F766E',
                          color: '#FFFFFF',
                          padding: '0.35rem 0.85rem',
                          borderRadius: '6px',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          textDecoration: 'none',
                          boxShadow: '0 2px 6px rgba(15, 118, 110, 0.25)',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <span>{actionLink.label}</span>
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════
          OFFICIAL MINISTRY LETTERHEAD MODAL PREVIEW
         ══════════════════════════════════════════════════════ */}
      {viewingLetterhead && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
          }}
          onClick={() => setViewingLetterhead(null)}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              maxWidth: '720px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              border: '2px solid #0F172A',
              padding: '2.5rem',
              position: 'relative',
              fontFamily: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setViewingLetterhead(null)}
              style={{
                position: 'absolute',
                top: '1.25rem',
                right: '1.25rem',
                background: '#F1F5F9',
                border: '1px solid #CBD5E1',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontWeight: 800,
                color: '#334155',
              }}
            >
              ✕
            </button>

            {/* Ministry Emblem Header */}
            <div style={{ textAlign: 'center', borderBottom: '2px solid #0F172A', paddingBottom: '1.25rem', marginBottom: '1.5rem' }}>
              <div
                style={{
                  width: '60px',
                  height: '60px',
                  margin: '0 auto 0.75rem',
                  borderRadius: '50%',
                  background: '#FFFFFF',
                  border: '2px solid #FFBE29',
                  padding: '4px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <img src="/logo-emblem.png" alt="Sri Lanka Crest" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, letterSpacing: '0.08em', color: '#64748B', textTransform: 'uppercase' }}>
                DEMOCRATIC SOCIALIST REPUBLIC OF SRI LANKA
              </div>
              <h2 style={{ margin: '4px 0 2px', fontSize: '1.35rem', fontWeight: 900, color: '#0F172A' }}>
                MINISTRY OF EDUCATION
              </h2>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#8D153A' }}>
                Policy Planning, Monitoring & Implementation Directorate • Isurupaya, Battaramulla
              </div>
            </div>

            {/* Meta Table (Ref, Date, To, Priority) */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.75rem',
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                padding: '0.85rem 1.15rem',
                marginBottom: '1.5rem',
                fontSize: '0.78rem',
              }}
            >
              <div>
                <span style={{ color: '#64748B', fontWeight: 600 }}>Circular Reference: </span>
                <span style={{ fontWeight: 800, color: '#0F172A', fontFamily: 'monospace' }}>
                  {viewingLetterhead.circularNumber || 'ED/OFFICIAL-NOTICE'}
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ color: '#64748B', fontWeight: 600 }}>Date of Dispatch: </span>
                <span style={{ fontWeight: 800, color: '#0F172A' }}>{viewingLetterhead.publishDate}</span>
              </div>
              <div>
                <span style={{ color: '#64748B', fontWeight: 600 }}>Addressed To: </span>
                <span style={{ fontWeight: 800, color: '#0F172A' }}>
                  {viewingLetterhead.targetLevel === 'All'
                    ? 'All Heads of Divisions, Provincial Directors & Zonal Directors'
                    : `Administrative Level ${viewingLetterhead.targetLevel} Officers`}
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ color: '#64748B', fontWeight: 600 }}>Dispatch Priority: </span>
                <span
                  style={{
                    fontWeight: 800,
                    color: viewingLetterhead.priority === 'Urgent' ? '#DC2626' : viewingLetterhead.priority === 'High' ? '#D97706' : '#0284C7',
                  }}
                >
                  {viewingLetterhead.priority.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Circular Subject */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                SUBJECT / DIRECTIVE TITLE:
              </div>
              <h3 style={{ margin: '4px 0 0', fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.35 }}>
                {viewingLetterhead.title}
              </h3>
            </div>

            {/* Circular Body */}
            <div
              style={{
                fontSize: '0.88rem',
                lineHeight: 1.8,
                color: '#1E293B',
                textAlign: 'justify',
                borderTop: '1px solid #E2E8F0',
                paddingTop: '1.25rem',
                marginBottom: '2rem',
                whiteSpace: 'pre-line',
              }}
            >
              {viewingLetterhead.content}
            </div>

            {/* Signatory & Official Stamp Block */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-end',
                borderTop: '1px solid #CBD5E1',
                paddingTop: '1.5rem',
              }}
            >
              {/* Circular Seal graphic */}
              <div
                style={{
                  border: '2px dashed #0F766E',
                  borderRadius: '50%',
                  width: '90px',
                  height: '90px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  color: '#0F766E',
                  fontSize: '0.62rem',
                  fontWeight: 800,
                  textAlign: 'center',
                  transform: 'rotate(-10deg)',
                  background: 'rgba(15, 118, 110, 0.04)',
                }}
              >
                <div>MOE-IPMIS</div>
                <div>OFFICIAL</div>
                <div>DISPATCH</div>
              </div>

              {/* Signature block */}
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: "'Brush Script MT', cursive, sans-serif", fontSize: '1.35rem', color: '#0F172A', marginBottom: '4px' }}>
                  {viewingLetterhead.authorName}
                </div>
                <div style={{ fontWeight: 800, fontSize: '0.82rem', color: '#0F172A' }}>
                  {viewingLetterhead.authorName}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                  Ministry of Education • Democratic Socialist Republic of Sri Lanka
                </div>
              </div>
            </div>

            {/* Printable Controls */}
            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => window.print()}
                className="btn btn-secondary btn-sm"
                style={{ fontWeight: 700 }}
              >
                🖨️ Print Circular
              </button>
              <button
                type="button"
                onClick={() => setViewingLetterhead(null)}
                className="btn btn-primary btn-sm"
                style={{ background: '#0F172A', borderColor: '#0F172A', fontWeight: 700 }}
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          PUBLISH NEW CIRCULAR MODAL (Authorized Admins Only)
         ══════════════════════════════════════════════════════ */}
      {isPublishModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
          }}
          onClick={() => !publishing && setIsPublishModalOpen(false)}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              maxWidth: '620px',
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              border: '1px solid #CBD5E1',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                background: 'linear-gradient(135deg, #0F766E 0%, #0D9488 100%)',
                color: '#FFFFFF',
                padding: '1.25rem 1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>
                  Publish Official Ministry Circular
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.74rem', color: '#CCFBF1' }}>
                  Issue a binding policy directive or administrative notice across IPMIS
                </p>
              </div>
              <button
                type="button"
                onClick={() => !publishing && setIsPublishModalOpen(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  border: 'none',
                  color: '#FFFFFF',
                  borderRadius: '50%',
                  width: '30px',
                  height: '30px',
                  cursor: 'pointer',
                  fontWeight: 800,
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handlePublishSubmit} style={{ padding: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.85rem', marginBottom: '0.85rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Circular Reference Number
                  </label>
                  <input
                    type="text"
                    required
                    value={publishForm.circularNumber}
                    onChange={(e) => setPublishForm({ ...publishForm, circularNumber: e.target.value })}
                    placeholder="e.g. ED/CIR/2026/AIP-05"
                    style={{
                      width: '100%',
                      padding: '0.45rem 0.65rem',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.82rem',
                      fontFamily: 'monospace',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Priority Level
                  </label>
                  <select
                    value={publishForm.priority}
                    onChange={(e) => setPublishForm({ ...publishForm, priority: e.target.value as any })}
                    style={{
                      width: '100%',
                      padding: '0.45rem 0.65rem',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.82rem',
                    }}
                  >
                    <option value="Normal">Normal</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '0.85rem' }}>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Directive / Circular Title
                </label>
                <input
                  type="text"
                  required
                  value={publishForm.title}
                  onChange={(e) => setPublishForm({ ...publishForm, title: e.target.value })}
                  placeholder="e.g. Guidelines for Mid-Year Performance Monitoring..."
                  style={{
                    width: '100%',
                    padding: '0.45rem 0.65rem',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.82rem',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', marginBottom: '0.85rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Target Administrative Level
                  </label>
                  <select
                    value={publishForm.targetLevel}
                    onChange={(e) => setPublishForm({ ...publishForm, targetLevel: e.target.value === 'All' ? 'All' : Number(e.target.value) })}
                    style={{
                      width: '100%',
                      padding: '0.45rem 0.65rem',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.82rem',
                    }}
                  >
                    <option value="All">All Administrative Tiers</option>
                    <option value="1">Level 1 - Line Ministry</option>
                    <option value="2">Level 2 - Apex Bodies</option>
                    <option value="3">Level 3 - Provincial</option>
                    <option value="4">Level 4 - Zonal</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Issuing Authority Designation
                  </label>
                  <input
                    type="text"
                    value={publishForm.authorName}
                    onChange={(e) => setPublishForm({ ...publishForm, authorName: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.45rem 0.65rem',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.82rem',
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Circular Directive Body / Content
                </label>
                <textarea
                  required
                  rows={5}
                  value={publishForm.content}
                  onChange={(e) => setPublishForm({ ...publishForm, content: e.target.value })}
                  placeholder="Enter the full directive body, statutory requirements, deadlines, and compliance notes..."
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.65rem',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.82rem',
                    lineHeight: 1.5,
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
                <button
                  type="button"
                  disabled={publishing}
                  onClick={() => setIsPublishModalOpen(false)}
                  className="btn btn-secondary btn-sm"
                  style={{ fontWeight: 700 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={publishing}
                  className="btn btn-primary btn-sm"
                  style={{ background: '#0F766E', borderColor: '#0F766E', fontWeight: 700 }}
                >
                  {publishing ? 'Publishing...' : 'Broadcast & Publish Circular'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
