'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  downloadAsExcelCsv,
  downloadAsPdfReport,
  copyTextToClipboard,
  SummaryStatItem,
} from '@/lib/dashboardExport';

export interface TileExportData {
  filename: string;
  reportTitle: string;
  subtitle?: string;
  headers: string[];
  rows: (string | number | null | undefined)[][];
  summaryStats?: SummaryStatItem[];
  copySummaryText?: string;
  orientation?: 'portrait' | 'landscape';
}

export interface TileActionMenuProps {
  tileTitle: string;
  exportData: TileExportData | (() => TileExportData);
  onRefresh?: () => void | Promise<void>;
  drillDownContent?: React.ReactNode;
  position?: 'left' | 'right';
  className?: string;
}

export default function TileActionMenu({
  tileTitle,
  exportData,
  onRefresh,
  drillDownContent,
  position = 'right',
  className = '',
}: TileActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showDrillDown, setShowDrillDown] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [drillSearch, setDrillSearch] = useState('');

  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Keyboard shortcut (Escape to close menu and popup modal)
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setShowDrillDown(false);
        setIsOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Helper to resolve export data dynamically
  const getResolvedData = useCallback((): TileExportData => {
    if (typeof exportData === 'function') {
      return exportData();
    }
    return exportData;
  }, [exportData]);

  // 1. Download as Excel (CSV)
  const handleExportExcel = () => {
    const data = getResolvedData();
    downloadAsExcelCsv(
      data.filename || tileTitle,
      data.reportTitle || tileTitle,
      data.headers,
      data.rows
    );
    setIsOpen(false);
    showToast('Excel (CSV) downloaded successfully');
  };

  // 2. Download as Landscape A4 PDF Report
  const handleExportPdf = () => {
    const data = getResolvedData();
    downloadAsPdfReport(
      data.reportTitle || tileTitle,
      data.subtitle || 'Ministry of Education - Integrated Planning & Monitoring Information System',
      data.headers,
      data.rows,
      data.summaryStats,
      data.orientation || 'landscape'
    );
    setIsOpen(false);
  };

  // 3. Live Sync / Refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    setIsOpen(false);
    try {
      if (onRefresh) {
        await onRefresh();
      }
      showToast('Live telemetry refreshed');
    } catch (err) {
      console.error('Refresh error:', err);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // 4. Copy Summary
  const handleCopySummary = async () => {
    const data = getResolvedData();
    const summaryText =
      data.copySummaryText ||
      `Integrated Planning & Monitoring Information System (IPMIS)\nReport Title: ${data.reportTitle || tileTitle}\nGenerated On: ${new Date().toLocaleString('en-GB', { timeZone: 'Asia/Colombo' })} SLST\n` +
      data.headers.join('\t') +
      '\n' +
      data.rows.slice(0, 10).map((r) => r.join('\t')).join('\n');

    const ok = await copyTextToClipboard(summaryText);
    setIsOpen(false);
    if (ok) {
      showToast('Summary copied to clipboard');
    }
  };

  // 5. Expand / Drill-down modal
  const handleOpenDrillDown = () => {
    setIsOpen(false);
    setShowDrillDown(true);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Filter rows for drilldown search
  const currentData = getResolvedData();
  const filteredRows = drillSearch
    ? currentData.rows.filter((row) =>
        row.some((cell) => String(cell || '').toLowerCase().includes(drillSearch.toLowerCase()))
      )
    : currentData.rows;

  return (
    <>
      <div
        className={`tile-action-menu-container ${className}`}
        style={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          verticalAlign: 'middle',
          zIndex: 40,
        }}
      >
        {/* The 3-Dots Action Button (Horizontal Triple Dots '•••' on left top corner) */}
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-label={`${tileTitle} options`}
          title={`Tile actions: Download as Excel, Download as PDF, Refresh, Expand`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '24px',
            height: '24px',
            borderRadius: '6px',
            border: isOpen ? '1px solid #0F766E' : '1px solid #E2E8F0',
            background: isOpen ? '#F0FDFA' : '#F8FAFC',
            color: isOpen ? '#0F766E' : '#475569',
            cursor: 'pointer',
            padding: 0,
            transition: 'all 0.15s ease',
            boxShadow: isOpen ? '0 1px 3px rgba(15, 118, 110, 0.2)' : 'none',
          }}
          onMouseEnter={(e) => {
            if (!isOpen) {
              e.currentTarget.style.background = '#F1F5F9';
              e.currentTarget.style.borderColor = '#CBD5E1';
              e.currentTarget.style.color = '#0F172A';
            }
          }}
          onMouseLeave={(e) => {
            if (!isOpen) {
              e.currentTarget.style.background = '#F8FAFC';
              e.currentTarget.style.borderColor = '#E2E8F0';
              e.currentTarget.style.color = '#475569';
            }
          }}
        >
          {/* Horizontal Triple Dots Icon */}
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="currentColor"
            style={{
              animation: isRefreshing ? 'spin 0.8s linear infinite' : 'none',
              transformOrigin: 'center',
            }}
          >
            <circle cx="5" cy="12" r="2.2" />
            <circle cx="12" cy="12" r="2.2" />
            <circle cx="19" cy="12" r="2.2" />
          </svg>
        </button>

        {/* Dropdown Floating Menu */}
        {isOpen && (
          <div
            ref={menuRef}
            style={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              left: position === 'left' ? '0' : 'auto',
              right: position === 'right' ? '0' : 'auto',
              width: '215px',
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: '10px',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
              padding: '4px',
              zIndex: 9999,
              display: 'flex',
              flexDirection: 'column',
              gap: '1px',
              animation: 'fadeInMenu 0.15s ease-out',
            }}
          >
            {/* Header / Tile Label */}
            <div
              style={{
                padding: '6px 10px 5px',
                borderBottom: '1px solid #F1F5F9',
                marginBottom: '3px',
              }}
            >
              <div
                style={{
                  fontSize: '0.62rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  color: '#64748B',
                }}
              >
                Tile Actions & Export
              </div>
              <div
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: '#0F172A',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {tileTitle}
              </div>
            </div>

            {/* Item 1: Download as Excel (CSV) */}
            <button
              type="button"
              onClick={handleExportExcel}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                width: '100%',
                padding: '6px 10px',
                borderRadius: '6px',
                border: 'none',
                background: 'transparent',
                color: '#1E293B',
                fontSize: '0.74rem',
                fontWeight: 600,
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'background 0.12s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#F0FDF4';
                e.currentTarget.style.color = '#15803D';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#1E293B';
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '20px',
                  height: '20px',
                  borderRadius: '4px',
                  background: '#DCFCE7',
                  color: '#16A34A',
                  flexShrink: 0,
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="8" y1="13" x2="16" y2="13" />
                  <line x1="8" y1="17" x2="16" y2="17" />
                </svg>
              </span>
              <div style={{ flex: 1 }}>
                <div>Download as Excel</div>
                <div style={{ fontSize: '0.62rem', color: '#64748B' }}>Spreadsheet (.csv / UTF-8)</div>
              </div>
            </button>

            {/* Item 2: Download as PDF Report */}
            <button
              type="button"
              onClick={handleExportPdf}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                width: '100%',
                padding: '6px 10px',
                borderRadius: '6px',
                border: 'none',
                background: 'transparent',
                color: '#1E293B',
                fontSize: '0.74rem',
                fontWeight: 600,
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'background 0.12s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#FEF2F2';
                e.currentTarget.style.color = '#DC2626';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#1E293B';
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '20px',
                  height: '20px',
                  borderRadius: '4px',
                  background: '#FEE2E2',
                  color: '#DC2626',
                  flexShrink: 0,
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <path d="M12 18v-5M9 15l3 3 3-3" />
                </svg>
              </span>
              <div style={{ flex: 1 }}>
                <div>Download as PDF</div>
                <div style={{ fontSize: '0.62rem', color: '#64748B' }}>Official printable dossier</div>
              </div>
            </button>

            <div style={{ height: '1px', background: '#F1F5F9', margin: '2px 0' }} />

            {/* Item 3: Refresh Tile Live Telemetry */}
            <button
              type="button"
              onClick={handleRefresh}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                width: '100%',
                padding: '6px 10px',
                borderRadius: '6px',
                border: 'none',
                background: 'transparent',
                color: '#1E293B',
                fontSize: '0.74rem',
                fontWeight: 600,
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'background 0.12s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#F0FDFA';
                e.currentTarget.style.color = '#0F766E';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#1E293B';
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '20px',
                  height: '20px',
                  borderRadius: '4px',
                  background: '#CCFBF1',
                  color: '#0D9488',
                  flexShrink: 0,
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                </svg>
              </span>
              <div style={{ flex: 1 }}>
                <div>Live Sync / Refresh</div>
                <div style={{ fontSize: '0.62rem', color: '#64748B' }}>Pull latest metrics</div>
              </div>
            </button>

            {/* Item 4: Copy Summary */}
            <button
              type="button"
              onClick={handleCopySummary}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                width: '100%',
                padding: '6px 10px',
                borderRadius: '6px',
                border: 'none',
                background: 'transparent',
                color: '#1E293B',
                fontSize: '0.74rem',
                fontWeight: 600,
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'background 0.12s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#F8FAFC';
                e.currentTarget.style.color = '#0284C7';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#1E293B';
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '20px',
                  height: '20px',
                  borderRadius: '4px',
                  background: '#E0F2FE',
                  color: '#0284C7',
                  flexShrink: 0,
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                  <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                </svg>
              </span>
              <div style={{ flex: 1 }}>
                <div>Copy Summary</div>
                <div style={{ fontSize: '0.62rem', color: '#64748B' }}>Clipboard text bulletin</div>
              </div>
            </button>

            {/* Item 5: Expand / Drill-down Modal */}
            <button
              type="button"
              onClick={handleOpenDrillDown}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                width: '100%',
                padding: '6px 10px',
                borderRadius: '6px',
                border: 'none',
                background: 'transparent',
                color: '#1E293B',
                fontSize: '0.74rem',
                fontWeight: 600,
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'background 0.12s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#F1F5F9';
                e.currentTarget.style.color = '#4338CA';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#1E293B';
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '20px',
                  height: '20px',
                  borderRadius: '4px',
                  background: '#EDE9FE',
                  color: '#7C3AED',
                  flexShrink: 0,
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="15 3 21 3 21 9" />
                  <polyline points="9 21 3 21 3 15" />
                  <line x1="21" y1="3" x2="14" y2="10" />
                  <line x1="3" y1="21" x2="10" y2="14" />
                </svg>
              </span>
              <div style={{ flex: 1 }}>
                <div>Expand Tile (Popup Window)</div>
                <div style={{ fontSize: '0.62rem', color: '#64748B' }}>Detailed records popup dialog</div>
              </div>
            </button>
          </div>
        )}

        {/* Floating Toast Notification */}
        {toastMessage && (
          <div
            style={{
              position: 'fixed',
              bottom: '24px',
              right: '24px',
              background: '#0F172A',
              color: '#FFFFFF',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '0.78rem',
              fontWeight: 700,
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.25)',
              zIndex: 99999,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              animation: 'fadeInUp 0.2s ease',
            }}
          >
            <span>{toastMessage}</span>
          </div>
        )}
      </div>

      {/* Drill-down Full-Screen / Modal Popup Dialog (Portal mounted directly on document.body) */}
      {showDrillDown && isMounted && typeof document !== 'undefined'
        ? createPortal(
            <div
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(15, 23, 42, 0.72)',
                backdropFilter: 'blur(4px)',
                zIndex: 999999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: isMaximized ? '0' : '1.25rem',
                animation: 'fadeIn 0.15s ease-out',
              }}
              onClick={(e) => {
                if (e.target === e.currentTarget) setShowDrillDown(false);
              }}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-label={`${tileTitle} Detailed Records Popup`}
                style={{
                  background: '#FFFFFF',
                  borderRadius: isMaximized ? '0' : '16px',
                  width: isMaximized ? '100vw' : '96%',
                  maxWidth: isMaximized ? '100vw' : '1180px',
                  height: isMaximized ? '100vh' : 'auto',
                  maxHeight: isMaximized ? '100vh' : '90vh',
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.45)',
                  border: isMaximized ? 'none' : '1px solid #CBD5E1',
                  overflow: 'hidden',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              >
                {/* Modal Header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.85rem 1.25rem',
                    borderBottom: '1px solid #E2E8F0',
                    background: 'linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 100%)',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <span
                      style={{
                        background: '#E6FFFA',
                        border: '1px solid #0F766E',
                        color: '#0F766E',
                        borderRadius: '6px',
                        padding: '2px 8px',
                        fontSize: '0.65rem',
                        fontWeight: 800,
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                      }}
                    >
                      Popup Window
                    </span>
                    <div>
                      <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#0F766E', textTransform: 'uppercase' }}>
                        Tile Expansion & Detailed Records
                      </div>
                      <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>
                        {tileTitle}
                      </h3>
                    </div>
                  </div>

                  {/* Action Buttons inside Modal */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    {/* Landscape A4 PDF Button */}
                    <button
                      type="button"
                      onClick={handleExportPdf}
                      title="Print or Save as Landscape A4 PDF"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        background: '#DC2626',
                        color: '#FFFFFF',
                        border: 'none',
                        padding: '0.35rem 0.85rem',
                        borderRadius: '6px',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        boxShadow: '0 1px 3px rgba(220, 38, 38, 0.3)',
                      }}
                    >
                      <span>🖨️</span>
                      <span>Landscape A4 PDF</span>
                    </button>

                    {/* Excel Button */}
                    <button
                      type="button"
                      onClick={handleExportExcel}
                      title="Download as Excel (CSV)"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        background: '#16A34A',
                        color: '#FFFFFF',
                        border: 'none',
                        padding: '0.35rem 0.85rem',
                        borderRadius: '6px',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        boxShadow: '0 1px 3px rgba(22, 163, 74, 0.3)',
                      }}
                    >
                      <span>📥</span>
                      <span>Excel</span>
                    </button>

                    {/* Maximize / Restore Toggle */}
                    <button
                      type="button"
                      onClick={() => setIsMaximized((prev) => !prev)}
                      title={isMaximized ? 'Restore standard popup window' : 'Maximize popup window to full screen'}
                      style={{
                        background: '#FFFFFF',
                        border: '1px solid #CBD5E1',
                        borderRadius: '6px',
                        width: '30px',
                        height: '30px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: '#334155',
                      }}
                    >
                      {isMaximized ? (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
                        </svg>
                      ) : (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="15 3 21 3 21 9" />
                          <polyline points="9 21 3 21 3 15" />
                          <line x1="21" y1="3" x2="14" y2="10" />
                          <line x1="3" y1="21" x2="10" y2="14" />
                        </svg>
                      )}
                    </button>

                    {/* Close Button */}
                    <button
                      type="button"
                      onClick={() => setShowDrillDown(false)}
                      title="Close Popup Window (Esc)"
                      style={{
                        background: '#FFFFFF',
                        border: '1px solid #CBD5E1',
                        borderRadius: '6px',
                        width: '30px',
                        height: '30px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: '#475569',
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Modal Body with Search & Table */}
                <div style={{ padding: '0.85rem 1.25rem', overflowY: 'auto', flex: 1 }}>
                  {drillDownContent ? (
                    <div style={{ marginBottom: '1rem' }}>{drillDownContent}</div>
                  ) : null}

                  {/* Search Filter */}
                  <div style={{ marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <input
                      type="text"
                      placeholder="Filter records..."
                      value={drillSearch}
                      onChange={(e) => setDrillSearch(e.target.value)}
                      style={{
                        padding: '0.4rem 0.85rem',
                        borderRadius: '6px',
                        border: '1px solid #CBD5E1',
                        fontSize: '0.78rem',
                        width: '280px',
                      }}
                    />
                    <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>
                      Showing {filteredRows.length} of {currentData.rows.length} rows
                    </span>
                  </div>

                  {/* Tabular View */}
                  <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'auto', maxHeight: '55vh' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                      <thead>
                        <tr style={{ background: '#F1F5F9', borderBottom: '2px solid #CBD5E1', position: 'sticky', top: 0, zIndex: 1 }}>
                          {currentData.headers.map((h, i) => (
                            <th key={i} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 800, color: '#0F172A', background: '#F1F5F9' }}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRows.map((r, ri) => (
                          <tr
                            key={ri}
                            style={{
                              borderBottom: '1px solid #E2E8F0',
                              background: ri % 2 === 0 ? '#FFFFFF' : '#F8FAFC',
                            }}
                          >
                            {r.map((c, ci) => (
                              <td key={ci} style={{ padding: '7px 12px', color: '#334155' }}>
                                {c !== null && c !== undefined ? String(c) : '-'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Modal Footer */}
                <div
                  style={{
                    padding: '0.65rem 1.25rem',
                    borderTop: '1px solid #E2E8F0',
                    background: '#F8FAFC',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.72rem',
                    color: '#64748B',
                  }}
                >
                  <div>MoE IPMIS • Integrated Planning & Monitoring Information System</div>
                  <button
                    type="button"
                    onClick={() => setShowDrillDown(false)}
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid #CBD5E1',
                      borderRadius: '6px',
                      padding: '0.35rem 1rem',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      color: '#334155',
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
