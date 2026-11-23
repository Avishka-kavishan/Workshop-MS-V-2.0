'use client';

import React from 'react';

export interface IconProps {
  size?: number;
  className?: string;
  color?: string;
  accentColor?: string;
  style?: React.CSSProperties;
}

// 1. Dashboard: Home outline icon matching official IPMIS reference
export function DashboardIcon({ size = 24, className = '', color = '#FFFFFF', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <path d="M3 9.5L12 3l9 6.5V20a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9.5z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

// 2. Budget Planning: Wallet with coin and mini calculator
export function BudgetPlanningIcon({ size = 24, className = '', color = '#FFFFFF', accentColor = '#FFBE29', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      {/* Golden Coin on top */}
      <circle cx="15" cy="8" r="4.8" fill={accentColor} />
      <text x="15" y="10.8" textAnchor="middle" fill="#5c0f28" fontSize="5.5" fontWeight="900" fontFamily="sans-serif">Rs</text>
      {/* Wallet Body */}
      <path d="M4 11C4 9.89543 4.89543 9 6 9H20C21.1046 9 22 9.89543 22 11V23C22 24.1046 21.1046 25 20 25H6C4.89543 25 4 24.1046 4 23V11Z" fill={color} />
      {/* Flap */}
      <path d="M13 14H22V20H13C12.1 20 11.5 19.4 11.5 18.5V15.5C11.5 14.6 12.1 14 13 14Z" fill="#F3F4F6" />
      <circle cx="17.5" cy="17" r="1.5" fill={accentColor} />
      {/* Front Calculator */}
      <rect x="17" y="13" width="11" height="14" rx="2" fill={color} stroke="#5c0f28" strokeWidth="1.2" />
      <rect x="19" y="15" width="7" height="2.5" rx="0.5" fill={accentColor} />
      {/* Keypad dots */}
      <circle cx="20" cy="19.5" r="0.8" fill="#5c0f28" />
      <circle cx="22.5" cy="19.5" r="0.8" fill="#5c0f28" />
      <circle cx="25" cy="19.5" r="0.8" fill="#5c0f28" />
      <circle cx="20" cy="22" r="0.8" fill="#5c0f28" />
      <circle cx="22.5" cy="22" r="0.8" fill="#5c0f28" />
      <circle cx="25" cy="22" r="0.8" fill={accentColor} />
      <circle cx="20" cy="24.5" r="0.8" fill="#5c0f28" />
      <circle cx="22.5" cy="24.5" r="0.8" fill="#5c0f28" />
      <circle cx="25" cy="24.5" r="0.8" fill="#5c0f28" />
    </svg>
  );
}

// 3. Annual Plan (AIP): Calendar with grid cells and circular checkmark badge
export function AnnualPlanIcon({ size = 24, className = '', color = '#FFFFFF', accentColor = '#FFBE29', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      {/* Calendar body */}
      <rect x="4" y="6" width="22" height="22" rx="3.5" fill={color} />
      {/* Top hanging loops */}
      <rect x="8" y="3" width="2.8" height="5.5" rx="1.4" fill={accentColor} />
      <rect x="19.2" y="3" width="2.8" height="5.5" rx="1.4" fill={accentColor} />
      {/* Grid cells */}
      <rect x="7" y="11" width="3" height="3" rx="0.6" fill="#5c0f28" opacity="0.75" />
      <rect x="12" y="11" width="3" height="3" rx="0.6" fill="#5c0f28" opacity="0.75" />
      <rect x="17" y="11" width="3" height="3" rx="0.6" fill="#5c0f28" opacity="0.75" />
      <rect x="7" y="16" width="3" height="3" rx="0.6" fill="#5c0f28" opacity="0.75" />
      <rect x="12" y="16" width="3" height="3" rx="0.6" fill="#5c0f28" opacity="0.75" />
      <rect x="17" y="16" width="3" height="3" rx="0.6" fill="#5c0f28" opacity="0.75" />
      <rect x="7" y="21" width="3" height="3" rx="0.6" fill="#5c0f28" opacity="0.75" />
      {/* Checkmark Badge */}
      <circle cx="23" cy="23" r="6.5" fill={accentColor} stroke="#5c0f28" strokeWidth="1.6" />
      <path d="M19.8 23.2 L22 25.4 L26.2 20.8" stroke="#5c0f28" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// 4. Monitoring: Magnifying glass with security shield & checkmark
export function MonitoringIcon({ size = 24, className = '', color = '#FFFFFF', accentColor = '#FFBE29', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      {/* Magnifier lens circle */}
      <circle cx="14" cy="14" r="10" stroke={color} strokeWidth="2.8" />
      {/* Handle */}
      <path d="M21.5 21.5 L28 28" stroke={color} strokeWidth="3.2" strokeLinecap="round" />
      {/* Shield inside lens */}
      <path d="M14 8.5 L18 10.5 V14.5 C18 17 16 19 14 19.5 C12 19 10 17 10 14.5 V10.5 L14 8.5 Z" fill={accentColor} />
      {/* Checkmark inside shield */}
      <path d="M12 14.2 L13.5 15.6 L16 12.8" stroke="#5c0f28" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// 5. Analytics & Reports: Bar chart with ascending columns and pie chart
export function AnalyticsIcon({ size = 24, className = '', color = '#FFFFFF', accentColor = '#FFBE29', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      {/* Baseline */}
      <path d="M4 26 H28" stroke={color} strokeWidth="2" strokeLinecap="round" />
      {/* Bar 1 */}
      <rect x="5.5" y="17" width="4.2" height="9" rx="1" fill={color} />
      {/* Bar 2 */}
      <rect x="11.5" y="11" width="4.2" height="15" rx="1" fill={accentColor} />
      {/* Bar 3 */}
      <rect x="17.5" y="15" width="4.2" height="11" rx="1" fill={accentColor} />
      {/* Pie Chart Top-Right */}
      <circle cx="23.5" cy="9.5" r="5.5" stroke={color} strokeWidth="1.8" />
      <path d="M23.5 9.5 L23.5 4 A5.5 5.5 0 0 1 29 9.5 Z" fill={accentColor} />
      <path d="M23.5 9.5 L18 9.5" stroke={color} strokeWidth="1.4" />
      <path d="M23.5 9.5 L23.5 15" stroke={color} strokeWidth="1.4" />
    </svg>
  );
}

// 6. Verification: Clipboard with checkboxes and document rows
export function VerificationIcon({ size = 24, className = '', color = '#FFFFFF', accentColor = '#FFBE29', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      {/* Clipboard frame */}
      <rect x="5.5" y="5.5" width="21" height="23" rx="3" stroke={accentColor} strokeWidth="2.5" fill="none" />
      {/* Top Clip */}
      <rect x="11" y="3" width="10" height="4" rx="1.5" fill={accentColor} />
      {/* Rows with check boxes */}
      <rect x="8.5" y="11" width="3.5" height="3.5" rx="0.6" fill={color} />
      <path d="M14.5 12.7 H22.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <rect x="8.5" y="16.5" width="3.5" height="3.5" rx="0.6" fill={color} />
      <path d="M14.5 18.2 H22.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <rect x="8.5" y="22" width="3.5" height="3.5" rx="0.6" fill={accentColor} />
      <path d="M14.5 23.7 H19.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// 7. Reports: Clipboard with document and pen
export function ReportsIcon({ size = 24, className = '', color = '#FFFFFF', accentColor = '#FFBE29', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      {/* Base clipboard */}
      <rect x="4.5" y="5.5" width="18" height="23" rx="2.5" stroke={accentColor} strokeWidth="2.4" fill="none" />
      <rect x="8.5" y="3" width="10" height="3.5" rx="1.2" fill={accentColor} />
      {/* Document lines */}
      <path d="M8 11.5 H17.5 M8 15.5 H17.5 M8 19.5 H14.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
      {/* Pen */}
      <path d="M25 8.5 L27 10.5 L24.5 22.5 L22.5 25.5 L22 22.5 L24 8.5 Z" fill={color} />
      <circle cx="25" cy="7" r="1.4" fill={accentColor} />
      <path d="M22.5 22.5 L22 25.5 L24.5 24.5 Z" fill={accentColor} />
    </svg>
  );
}

// 8. Directory / Resource Persons: Group of people silhouettes
export function DirectoryIcon({ size = 24, className = '', color = '#FFFFFF', accentColor = '#FFBE29', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      {/* Center leader (amber) */}
      <circle cx="16" cy="11" r="4.5" fill={accentColor} />
      <path d="M9.5 24.5 C9.5 20.2 12.2 17.5 16 17.5 C19.8 17.5 22.5 20.2 22.5 24.5 Z" fill={accentColor} />
      {/* Left person (white) */}
      <circle cx="9" cy="13" r="3.5" fill={color} opacity="0.95" />
      <path d="M4 24.5 C4 21.2 6 19 8.8 18.5 C8.3 19.8 8.3 22 8.5 24.5 Z" fill={color} opacity="0.95" />
      {/* Right person (white) */}
      <circle cx="23" cy="13" r="3.5" fill={color} opacity="0.95" />
      <path d="M28 24.5 C28 21.2 26 19 23.2 18.5 C23.7 19.8 23.7 22 23.5 24.5 Z" fill={color} opacity="0.95" />
    </svg>
  );
}

// 9. Hierarchy: Ministry building with institutional hierarchy tree
export function HierarchyIcon({ size = 24, className = '', color = '#FFFFFF', accentColor = '#FFBE29', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      {/* Ministry pediment & pillars */}
      <path d="M16 3 L10 6.8 H22 Z" fill={accentColor} />
      <rect x="11.2" y="7" width="1.8" height="4" fill={accentColor} />
      <rect x="15.1" y="7" width="1.8" height="4" fill={accentColor} />
      <rect x="19" y="7" width="1.8" height="4" fill={accentColor} />
      <rect x="9.5" y="11" width="13" height="1.5" fill={accentColor} />
      {/* Connecting trunk */}
      <path d="M16 12.5 V15" stroke={color} strokeWidth="2" />
      <circle cx="16" cy="17" r="2.5" fill={accentColor} />
      {/* Branch lines */}
      <path d="M16 19.5 V21 M10 21 H22" stroke={color} strokeWidth="1.8" />
      <path d="M10 21 V23.5 M22 21 V23.5" stroke={color} strokeWidth="1.8" />
      <circle cx="10" cy="25" r="2.3" fill={accentColor} />
      <circle cx="22" cy="25" r="2.3" fill={accentColor} />
      {/* Child leaves */}
      <path d="M7 27.5 H13 M19 27.5 H25" stroke={color} strokeWidth="1.4" />
      <circle cx="7" cy="29" r="1.5" fill={color} />
      <circle cx="13" cy="29" r="1.5" fill={color} />
      <circle cx="19" cy="29" r="1.5" fill={color} />
      <circle cx="25" cy="29" r="1.5" fill={color} />
    </svg>
  );
}

// 10. New Workshop: Calendar with golden plus sign badge
export function NewWorkshopIcon({ size = 24, className = '', color = '#FFFFFF', accentColor = '#FFBE29', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      {/* Calendar body */}
      <rect x="4" y="6" width="22" height="22" rx="3.5" fill={color} />
      {/* Loops */}
      <rect x="8" y="3" width="2.8" height="5.5" rx="1.4" fill={accentColor} />
      <rect x="19.2" y="3" width="2.8" height="5.5" rx="1.4" fill={accentColor} />
      {/* Grid cells */}
      <rect x="7" y="11" width="3" height="3" rx="0.6" fill="#5c0f28" opacity="0.75" />
      <rect x="12" y="11" width="3" height="3" rx="0.6" fill="#5c0f28" opacity="0.75" />
      <rect x="17" y="11" width="3" height="3" rx="0.6" fill="#5c0f28" opacity="0.75" />
      <rect x="7" y="16" width="3" height="3" rx="0.6" fill="#5c0f28" opacity="0.75" />
      <rect x="12" y="16" width="3" height="3" rx="0.6" fill="#5c0f28" opacity="0.75" />
      {/* Plus badge on bottom-right */}
      <circle cx="23" cy="23" r="6.5" fill={accentColor} stroke="#5c0f28" strokeWidth="1.6" />
      <path d="M23 19.8 V26.2 M19.8 23 H26.2" stroke="#5c0f28" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// 11. Register Person: Person silhouette with plus badge
export function RegisterPersonIcon({ size = 24, className = '', color = '#FFFFFF', accentColor = '#FFBE29', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      {/* Person head */}
      <circle cx="14" cy="11" r="5" fill={accentColor} />
      {/* Person torso */}
      <path d="M6 26 C6 20.5 9.5 17.5 14 17.5 C16.5 17.5 18.5 18.7 19.8 20.5 C18.7 22 18 23.9 18 26 Z" fill={accentColor} />
      {/* Plus sign */}
      <path d="M25 15.5 V25.5 M20 20.5 H30" stroke={accentColor} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

// 12. Admin Console: Shield with central gear mechanism
export function AdminConsoleIcon({ size = 24, className = '', color = '#FFFFFF', accentColor = '#FFBE29', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      {/* Shield frame */}
      <path d="M16 4 L26 8 V16 C26 22 21.5 26.5 16 28 C10.5 26.5 6 22 6 16 V8 L16 4 Z" stroke={accentColor} strokeWidth="2.5" fill="none" />
      {/* Center gear */}
      <circle cx="16" cy="16" r="4.5" stroke={color} strokeWidth="2" />
      <circle cx="16" cy="16" r="2" fill={accentColor} />
      <path d="M16 9.5 V11.5 M16 20.5 V22.5 M9.5 16 H11.5 M20.5 16 H22.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M11.5 11.5 L13 13 M19 19 L20.5 20.5 M11.5 20.5 L13 19 M19 13 L20.5 11.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// 13. Workshops Directory: List with calendar markers
export function WorkshopsDirectoryIcon({ size = 24, className = '', color = '#FFFFFF', accentColor = '#FFBE29', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      <rect x="5" y="4" width="22" height="24" rx="3" stroke={color} strokeWidth="2.4" fill="none" />
      <path d="M9 10 H23 M9 16 H23 M9 22 H16" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <circle cx="21" cy="21" r="3.5" fill={accentColor} />
      <path d="M21 19.2 V22.8 M19.2 21 H22.8" stroke="#5c0f28" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

// 14. Calendar Sync: Calendar with dual sync arrows
export function SyncCalendarIcon({ size = 24, className = '', color = '#FFFFFF', accentColor = '#FFBE29', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      <rect x="4" y="6" width="24" height="22" rx="3.5" stroke={color} strokeWidth="2.2" fill="none" />
      <rect x="8" y="3" width="2.8" height="5" rx="1.4" fill={accentColor} />
      <rect x="21" y="3" width="2.8" height="5" rx="1.4" fill={accentColor} />
      {/* Circular sync arrows */}
      <path d="M12 18 A5 5 0 0 1 20 14" stroke={accentColor} strokeWidth="2" strokeLinecap="round" />
      <path d="M20 14 L20 11 M20 14 L17 14" stroke={accentColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 18 A5 5 0 0 1 12 22" stroke={accentColor} strokeWidth="2" strokeLinecap="round" />
      <path d="M12 22 L12 25 M12 22 L15 22" stroke={accentColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// 15. Pin / Lock Toggle Icon
export function PinIcon({ size = 18, className = '', color = 'currentColor', pinned = false }: { size?: number; className?: string; color?: string; pinned?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={pinned ? color : 'none'} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="12" y1="17" x2="12" y2="22" />
      <path d="M5 17h14v-2l-2-3V5a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7l-2 3v2z" />
    </svg>
  );
}

// 16. System Audit Vault: Shield with central cryptographic keyhole and ledger lines
export function AuditVaultIcon({ size = 24, className = '', color = '#FFFFFF', accentColor = '#FFBE29', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      {/* Shield boundary */}
      <path d="M16 3 L27 7 V16 C27 23 22 28 16 30 C10 28 5 23 5 16 V7 Z" stroke={color} strokeWidth="2.2" strokeLinejoin="round" fill="none" />
      {/* Central Keyhole */}
      <circle cx="16" cy="13" r="3" stroke={accentColor} strokeWidth="2" fill="none" />
      <path d="M14.5 15.5 L13 21 H19 L17.5 15.5 Z" fill={accentColor} />
      {/* Verification check or audit mark */}
      <path d="M11 25 H21" stroke={accentColor} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

// 17. Vote Management: Ballot ledger document with badge and checkmark
export function VoteManagementIcon({ size = 24, className = '', color = '#FFFFFF', accentColor = '#FFBE29', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      {/* Document / Card backing */}
      <rect x="5" y="4" width="22" height="24" rx="3" stroke={color} strokeWidth="2.2" fill="none" />
      {/* Vote number badge on top right */}
      <rect x="15" y="7" width="9" height="4" rx="1.5" fill={accentColor} />
      {/* Ledger list lines */}
      <line x1="8" y1="9" x2="12" y2="9" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <line x1="8" y1="14" x2="24" y2="14" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <line x1="8" y1="18" x2="19" y2="18" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <line x1="8" y1="22" x2="16" y2="22" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      {/* Ballot check circle at bottom right */}
      <circle cx="22" cy="22" r="3.5" fill={accentColor} />
      <path d="M20.5 22 L21.5 23 L23.5 21" stroke="#5c0f28" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

