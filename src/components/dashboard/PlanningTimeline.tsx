'use client';

import React, { useState } from 'react';

export interface TimelineProject {
  id: string;
  title: string;
  sector: string;
  startQuarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  endQuarter: 'Q1' | 'Q2' | 'Q3' | 'Q4' | "Q1'26";
  progressPct: number;
  gradient: string;
  leadBranch: string;
  budgetMn: number;
  status: 'In Progress' | 'Completed' | 'Delayed';
  deliverable: string;
}

const DEFAULT_TIMELINE_PROJECTS: TimelineProject[] = [
  {
    id: 'proj-infra',
    title: 'School Infrastructure & Physical Facilities Modernization',
    sector: 'Infrastructure Development',
    startQuarter: 'Q1',
    endQuarter: 'Q3',
    progressPct: 78,
    gradient: 'linear-gradient(90deg, #0F766E 0%, #14B8A6 100%)', // Deep Teal
    leadBranch: 'School Infrastructure & Physical Planning Division',
    budgetMn: 850.0,
    status: 'In Progress',
    deliverable: '120 STEM labs retrofitted, 45 sanitary complexes completed',
  },
  {
    id: 'proj-edu',
    title: 'National Teacher Pedagogy & Curriculum Reform Program',
    sector: 'Education Program',
    startQuarter: 'Q2',
    endQuarter: "Q1'26",
    progressPct: 65,
    gradient: 'linear-gradient(90deg, #0284C7 0%, #38BDF8 100%)', // Sky Blue / Cyan
    leadBranch: 'Teacher Education & National Institute of Education (NIE)',
    budgetMn: 620.5,
    status: 'In Progress',
    deliverable: '14,500 primary & secondary teachers trained in competency-based grading',
  },
  {
    id: 'proj-health',
    title: 'Student Mid-Day Meal, Nutrition & School Health Initiative',
    sector: 'Healthcare Initiative',
    startQuarter: 'Q2',
    endQuarter: 'Q4',
    progressPct: 90,
    gradient: 'linear-gradient(90deg, #2563EB 0%, #60A5FA 100%)', // Royal Blue
    leadBranch: 'Health, Nutrition & Student Welfare Branch',
    budgetMn: 1100.0,
    status: 'In Progress',
    deliverable: '1.2M primary school students provided daily fortified mid-day meals',
  },
  {
    id: 'proj-digital',
    title: 'Digital Education Services, e-Thaksalawa & LMS Upgrade',
    sector: 'Digital Services Upgrade',
    startQuarter: 'Q2',
    endQuarter: 'Q3',
    progressPct: 82,
    gradient: 'linear-gradient(90deg, #0D9488 0%, #2DD4BF 100%)', // Emerald Teal
    leadBranch: 'Information & Communication Technology (ICT) Branch',
    budgetMn: 480.0,
    status: 'In Progress',
    deliverable: 'National cloud LMS migration & 1,500 smart interactive board activations',
  },
];

interface PlanningTimelineProps {
  fiscalYear?: string;
}

function PlanningTimeline({ fiscalYear = 'FY 2025-2026' }: PlanningTimelineProps) {
  const [hoveredProject, setHoveredProject] = useState<TimelineProject | null>(null);

  // Quarter column definitions (percentages for horizontal position)
  // Q1: 0% - 22%
  // Q2: 22% - 44%
  // Q3: 44% - 66%
  // Q4: 66% - 85%
  // Q1'26: 85% - 100%
  const quarters = [
    { label: 'Q1', left: '0%' },
    { label: 'Q2', left: '22%' },
    { label: 'Q3', left: '44%' },
    { label: 'Q4', left: '66%' },
    { label: "Q1'26", left: '85%' },
  ];

  // Helper to map start and end quarters to left % and width %
  const getBarStyle = (start: string, end: string) => {
    let leftPct = 4;
    let widthPct = 50;

    if (start === 'Q1') leftPct = 4;
    if (start === 'Q2') leftPct = 26;
    if (start === 'Q3') leftPct = 48;
    if (start === 'Q4') leftPct = 70;

    if (start === 'Q1' && end === 'Q3') widthPct = 44;
    else if (start === 'Q1' && end === 'Q4') widthPct = 68;
    else if (start === 'Q2' && end === 'Q3') widthPct = 25;
    else if (start === 'Q2' && end === 'Q4') widthPct = 45;
    else if (start === 'Q2' && end === "Q1'26") widthPct = 68;
    else if (start === 'Q3' && end === 'Q4') widthPct = 24;

    return { leftPct, widthPct };
  };

  return (
    <div
      style={{
        background: '#FFFFFF',
        borderRadius: '16px',
        border: '1px solid #E2E8F0',
        padding: '1.25rem 1.45rem',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.01em' }}>
            Project Planning Timeline
          </h3>
          <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: '#64748B' }}>
            Multi-branch implementation roadmap & quarterly milestone progression
          </p>
        </div>

        {/* Fiscal Year Calendar Badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.35rem 0.85rem',
            borderRadius: '8px',
            background: '#F1F5F9',
            border: '1px solid #CBD5E1',
            fontSize: '0.82rem',
            fontWeight: 700,
            color: '#1E293B',
          }}
        >
          <span>📅</span>
          <span>{fiscalYear}</span>
          <span style={{ color: '#10B981', fontSize: '0.9rem', marginLeft: '0.2rem' }}>↗</span>
        </div>
      </div>

      {/* Gantt Timeline Area */}
      <div style={{ position: 'relative', padding: '0.5rem 0 1.25rem' }}>
        
        {/* Background Grid Lines for Quarters */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            bottom: '24px',
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'space-between',
            pointerEvents: 'none',
          }}
        >
          {quarters.map((q, idx) => (
            <div
              key={q.label}
              style={{
                width: '1px',
                background: idx === 0 ? 'transparent' : '#E2E8F0',
                height: '100%',
              }}
            />
          ))}
        </div>

        {/* Project Gantt Bars */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative', zIndex: 2 }}>
          {DEFAULT_TIMELINE_PROJECTS.map((proj) => {
            const { leftPct, widthPct } = getBarStyle(proj.startQuarter, proj.endQuarter);
            const isHovered = hoveredProject?.id === proj.id;

            return (
              <div
                key={proj.id}
                onMouseEnter={() => setHoveredProject(proj)}
                onMouseLeave={() => setHoveredProject(null)}
                style={{
                  position: 'relative',
                  cursor: 'pointer',
                  padding: '2px 0',
                }}
              >
                {/* Sector Label Above Bar */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '4px',
                    paddingLeft: `${leftPct}%`,
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      color: isHovered ? '#0F766E' : '#334155',
                      transition: 'color 0.15s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                  >
                    <span
                      style={{
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        background: isHovered ? '#14B8A6' : '#94A3B8',
                      }}
                    />
                    {proj.sector}
                  </span>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0F766E' }}>
                    {proj.progressPct}%
                  </span>
                </div>

                {/* Progress Bar Container */}
                <div
                  style={{
                    height: '24px',
                    borderRadius: '6px',
                    background: '#F1F5F9',
                    position: 'relative',
                    overflow: 'visible',
                  }}
                >
                  {/* Styled Gradient Filled Bar */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      bottom: 0,
                      left: `${leftPct}%`,
                      width: `${widthPct}%`,
                      borderRadius: '6px',
                      background: proj.gradient,
                      boxShadow: isHovered
                        ? '0 4px 12px rgba(15, 118, 110, 0.35)'
                        : '0 2px 6px rgba(15, 118, 110, 0.18)',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0 8px',
                      color: '#FFFFFF',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {/* Inner Progress Accent Line */}
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        bottom: 0,
                        width: `${proj.progressPct}%`,
                        background: 'rgba(255, 255, 255, 0.18)',
                        borderRadius: '6px 0 0 6px',
                      }}
                    />
                    <span style={{ position: 'relative', zIndex: 2 }}>{proj.title}</span>
                  </div>

                  {/* Left Milestone Pin */}
                  <div
                    style={{
                      position: 'absolute',
                      left: `calc(${leftPct}% - 4px)`,
                      top: '7px',
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: '#FFFFFF',
                      border: '2px solid #0F766E',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                      zIndex: 3,
                    }}
                  />

                  {/* Right Milestone Arrow */}
                  <div
                    style={{
                      position: 'absolute',
                      left: `calc(${leftPct + widthPct}% - 4px)`,
                      top: '7px',
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: '#10B981',
                      border: '2px solid #FFFFFF',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                      zIndex: 3,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Timeline Bottom Axis Labels */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: '1.25rem',
            paddingTop: '0.5rem',
            borderTop: '1px solid #CBD5E1',
            color: '#64748B',
            fontSize: '0.76rem',
            fontWeight: 700,
          }}
        >
          {quarters.map((q) => (
            <span key={q.label}>{q.label}</span>
          ))}
        </div>

        {/* Hover Popover Details */}
        {hoveredProject && (
          <div
            style={{
              marginTop: '0.85rem',
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              padding: '0.65rem 0.85rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              animation: 'fadeIn 0.2s ease',
            }}
          >
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.82rem', color: '#0F172A' }}>
                {hoveredProject.title}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '2px' }}>
                Lead: <strong>{hoveredProject.leadBranch}</strong> • Deliverable: {hoveredProject.deliverable}
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#0F766E' }}>
                Rs. {hoveredProject.budgetMn.toLocaleString()} Mn
              </div>
              <div style={{ fontSize: '0.7rem', color: '#10B981', fontWeight: 700 }}>
                {hoveredProject.status} ({hoveredProject.progressPct}%)
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default React.memo(PlanningTimeline);
