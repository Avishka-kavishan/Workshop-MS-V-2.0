'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export interface MonitoringActivityItem {
  id: string;
  title: string;
  location: string;
  status: 'Completed' | 'In Progress' | 'Delayed';
  progressPct?: number;
  timeAgo: string;
  category: string;
  notes?: string;
}

const DEFAULT_MONITORING_ITEMS: MonitoringActivityItem[] = [
  {
    id: 'act-1',
    title: 'Water Supply & Sanitation Project',
    location: 'Central Province • Matale',
    status: 'Completed',
    progressPct: 100,
    timeAgo: '2 hours ago',
    category: 'Infrastructure',
    notes: 'Potable water filtration units installed and verified by Regional Engineer.',
  },
  {
    id: 'act-2',
    title: 'Science Lab Modernization & Solar Retrofit',
    location: 'Western Province • Gampaha',
    status: 'In Progress',
    progressPct: 65,
    timeAgo: '5 hours ago',
    category: 'Facilities',
    notes: 'Equipment delivered; electrical wiring underway with 65% completion.',
  },
  {
    id: 'act-3',
    title: 'School Building Structural Renovation',
    location: 'Uva Province • Monaragala',
    status: 'Delayed',
    progressPct: 42,
    timeAgo: '1 day ago',
    category: 'Civil Works',
    notes: 'Review Required: Material delivery delayed due to monsoon transport disruption.',
  },
  {
    id: 'act-4',
    title: 'Teacher ICT Capacity Building Workshop',
    location: 'Southern Province • Galle Zone',
    status: 'Completed',
    progressPct: 100,
    timeAgo: '1 day ago',
    category: 'Pedagogy',
    notes: '52 teachers completed 3-day practical training on smart board teaching.',
  },
  {
    id: 'act-5',
    title: 'Special Education Needs Resource Center',
    location: 'Northern Province • Jaffna',
    status: 'In Progress',
    progressPct: 40,
    timeAgo: '2 days ago',
    category: 'Inclusion',
    notes: 'Acoustic treatment and braille display hardware currently being calibrated.',
  },
];

interface RecentMonitoringFeedProps {
  items?: MonitoringActivityItem[];
}

function RecentMonitoringFeed({ items = DEFAULT_MONITORING_ITEMS }: RecentMonitoringFeedProps) {
  const [filter, setFilter] = useState<'All' | 'Completed' | 'In Progress' | 'Delayed'>('All');

  const filteredItems = items.filter((item) => {
    if (filter === 'All') return true;
    return item.status === filter;
  });

  const getStatusIcon = (status: 'Completed' | 'In Progress' | 'Delayed') => {
    switch (status) {
      case 'Completed':
        return (
          <div
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              background: '#D1FAE5',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.85rem',
              fontWeight: 800,
              flexShrink: 0,
            }}
            title="Completed"
          >
            ✓
          </div>
        );
      case 'In Progress':
        return (
          <div
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              background: '#E0F2FE',
              color: '#0284C7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.85rem',
              fontWeight: 800,
              flexShrink: 0,
            }}
            title="In Progress"
          >
            ℹ
          </div>
        );
      case 'Delayed':
        return (
          <div
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              background: '#FEF3C7',
              color: '#D97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.85rem',
              fontWeight: 800,
              flexShrink: 0,
            }}
            title="Delayed • Review Required"
          >
            ⚠
          </div>
        );
    }
  };

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
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.01em' }}>
            Recent Monitoring Activities
          </h3>
          <p style={{ margin: '3px 0 0', fontSize: '0.74rem', color: '#64748B' }}>
            Live field verifications & quality audits
          </p>
        </div>

        <Link
          href="/monitoring"
          style={{
            fontSize: '0.76rem',
            color: '#0F766E',
            fontWeight: 700,
            textDecoration: 'none',
          }}
        >
          View All →
        </Link>
      </div>

      {/* Activity Items List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
        {filteredItems.slice(0, 4).map((item) => (
          <div
            key={item.id}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
              padding: '0.65rem 0.75rem',
              borderRadius: '10px',
              background: '#F8FAFC',
              border: '1px solid #F1F5F9',
              transition: 'all 0.15s ease',
            }}
          >
            {/* Status Indicator Icon */}
            {getStatusIcon(item.status)}

            {/* Content Text */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: '#1E293B',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {item.title} <span style={{ color: '#94A3B8' }}>|</span>{' '}
                <span style={{ color: '#64748B', fontWeight: 500 }}>{item.location}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '2px', fontSize: '0.72rem' }}>
                <span
                  style={{
                    fontWeight: 700,
                    color:
                      item.status === 'Completed'
                        ? '#059669'
                        : item.status === 'In Progress'
                        ? '#0284C7'
                        : '#D97706',
                  }}
                >
                  {item.status}
                  {item.progressPct && item.status === 'In Progress' ? ` • ${item.progressPct}%` : ''}
                  {item.status === 'Delayed' ? ' • Review Required' : ''}
                </span>
                <span style={{ color: '#94A3B8' }}>•</span>
                <span style={{ color: '#64748B' }}>{item.timeAgo}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default React.memo(RecentMonitoringFeed);
