'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';

export interface SearchableOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

interface SearchableSelectProps {
  id?: string;
  name?: string;
  value: string | number;
  onChange: (e: { target: { value: string; name?: string } }) => void;
  options?: SearchableOption[];
  children?: React.ReactNode;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * SearchableSelect
 * 
 * Standalone combobox dropdown component that accepts either an `options` prop or standard `<option>` children.
 * Renders via createPortal so it is never clipped by modal scrollbars or table overflow.
 * Allows users to type a few letters to instantly filter and select relevant options with highlighted matches.
 */
export default function SearchableSelect({
  id,
  name,
  value,
  onChange,
  options: explicitOptions,
  children,
  placeholder = 'Select option...',
  disabled = false,
  required = false,
  className = '',
  style,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [pos, setPos] = useState<{ top: number; left: number; width: number; placeAbove: boolean }>({
    top: 0,
    left: 0,
    width: 280,
    placeAbove: false,
  });

  const triggerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const optionItemRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Parse options from either explicit options prop or option children
  const parsedOptions: SearchableOption[] = useMemo(() => {
    if (explicitOptions && explicitOptions.length > 0) {
      return explicitOptions;
    }

    const items: SearchableOption[] = [];
    React.Children.forEach(children, (child) => {
      if (React.isValidElement(child) && child.type === 'option') {
        const val = child.props.value !== undefined ? child.props.value : child.props.children;
        const label = child.props.children ? String(child.props.children) : String(val);
        items.push({
          value: val,
          label,
          disabled: child.props.disabled,
        });
      }
    });
    return items;
  }, [explicitOptions, children]);

  // Current selected option
  const selectedOption = useMemo(() => {
    return parsedOptions.find((opt) => String(opt.value) === String(value));
  }, [parsedOptions, value]);

  // Calculate popover coordinates
  const updatePos = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const width = Math.min(Math.max(rect.width, 300), viewportWidth - 24);
    let left = rect.left;
    if (left + width > viewportWidth - 12) {
      left = Math.max(12, viewportWidth - width - 12);
    }
    if (left < 12) left = 12;

    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    const placeAbove = spaceBelow < 220 && spaceAbove > spaceBelow;

    let top = 0;
    if (placeAbove) {
      top = Math.max(12, rect.top - 6);
    } else {
      top = Math.min(viewportHeight - 12, rect.bottom + 4);
    }

    setPos({ top, left, width, placeAbove });
  }, []);

  // Filtered options based on search query
  const filteredOptions = useMemo(() => {
    const trimmed = searchQuery.trim().toLowerCase();
    if (!trimmed) return parsedOptions;

    const words = trimmed.split(/\s+/).filter(Boolean);
    return parsedOptions.filter((opt) => {
      const label = (opt.label || '').toLowerCase();
      const val = String(opt.value || '').toLowerCase();
      return words.every((w) => label.includes(w) || val.includes(w));
    });
  }, [parsedOptions, searchQuery]);

  // Adjust highlighted index when filtered results change
  useEffect(() => {
    if (filteredOptions.length > 0) {
      setHighlightedIndex((prev) => (prev >= 0 && prev < filteredOptions.length ? prev : 0));
    } else {
      setHighlightedIndex(0);
    }
  }, [filteredOptions]);

  // Handle open / close & positioning
  const handleOpen = () => {
    if (disabled) return;
    updatePos();
    setIsOpen(true);
    setSearchQuery('');
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 25);
  };

  const handleClose = () => {
    setIsOpen(false);
    setSearchQuery('');
    triggerRef.current?.focus();
  };

  // Close on outside click, window scroll, or resize
  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e: MouseEvent) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node) &&
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        handleClose();
      }
    };

    const handleScrollOrResize = () => {
      updatePos();
    };

    document.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize, true);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize, true);
    };
  }, [isOpen, updatePos]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && optionItemRefs.current[highlightedIndex]) {
      optionItemRefs.current[highlightedIndex]?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [highlightedIndex, isOpen]);

  const handleSelect = (opt: SearchableOption) => {
    if (opt.disabled) return;
    onChange({
      target: {
        value: String(opt.value),
        name,
      },
    });
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        handleOpen();
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        updatePos();
        setIsOpen(true);
        setSearchQuery(e.key);
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 25);
      }
    }
  };

  const handlePopupKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => {
        let next = prev + 1;
        while (next < filteredOptions.length && filteredOptions[next].disabled) {
          next++;
        }
        return next < filteredOptions.length ? next : prev;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => {
        let next = prev - 1;
        while (next >= 0 && filteredOptions[next].disabled) {
          next--;
        }
        return next >= 0 ? next : prev;
      });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredOptions[highlightedIndex] && !filteredOptions[highlightedIndex].disabled) {
        handleSelect(filteredOptions[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleClose();
    } else if (e.key === 'Tab') {
      handleClose();
    }
  };

  // Highlight matching letters
  const renderHighlighted = (text: string, query: string) => {
    if (!query.trim()) return text;
    const words = query
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    if (words.length === 0) return text;

    const regex = new RegExp(`(${words.join('|')})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark
          key={i}
          style={{
            backgroundColor: '#FEF08A',
            color: '#854D0E',
            fontWeight: 700,
            borderRadius: '2px',
            padding: '0 2px',
          }}
        >
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div
      style={{
        position: 'relative',
        display: 'inline-block',
        width: style?.width || '100%',
        ...style,
      }}
      className={className}
    >
      {/* Visual Trigger Box */}
      <div
        ref={triggerRef}
        id={id}
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && (isOpen ? handleClose() : handleOpen())}
        onKeyDown={handleTriggerKeyDown}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.45rem 0.65rem',
          backgroundColor: disabled ? '#F1F5F9' : '#FFFFFF',
          border: isOpen ? '1.5px solid #00534E' : '1px solid #CBD5E1',
          borderRadius: '6px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          outline: 'none',
          fontSize: '0.85rem',
          color: selectedOption ? '#1E293B' : '#94A3B8',
          boxShadow: isOpen ? '0 0 0 2px rgba(0, 83, 78, 0.12)' : 'none',
          userSelect: 'none',
          transition: 'all 0.15s ease',
        }}
      >
        <span
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            marginRight: '8px',
            fontWeight: selectedOption ? 500 : 400,
          }}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <span style={{ fontSize: '0.7rem', color: '#00534E', flexShrink: 0, fontWeight: 700 }}>
          {isOpen ? '▲' : '▼'}
        </span>
      </div>

      {/* Popover Menu via Portal */}
      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={popoverRef}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              top: pos.placeAbove ? undefined : `${pos.top}px`,
              bottom: pos.placeAbove ? `${window.innerHeight - pos.top}px` : undefined,
              left: `${pos.left}px`,
              width: `${pos.width}px`,
              maxHeight: '340px',
              backgroundColor: '#FFFFFF',
              borderRadius: '8px',
              boxShadow: '0 12px 28px -4px rgba(0, 83, 78, 0.25), 0 6px 14px -2px rgba(0, 0, 0, 0.15)',
              border: '1.5px solid #00534E',
              zIndex: 100000,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              fontFamily: 'inherit',
            }}
            role="dialog"
            aria-label="Searchable Dropdown Options"
          >
            {/* Search Header */}
            <div
              style={{
                padding: '8px 10px',
                background: '#F8FAFC',
                borderBottom: '1px solid #E2E8F0',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <span
                  style={{
                    position: 'absolute',
                    left: '10px',
                    fontSize: '0.85rem',
                    color: '#00534E',
                    pointerEvents: 'none',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  🔍
                </span>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handlePopupKeyDown}
                  placeholder="Type a few letters to find..."
                  style={{
                    width: '100%',
                    padding: '6px 28px 6px 32px',
                    border: '1.5px solid #00534E',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    outline: 'none',
                    backgroundColor: '#FFFFFF',
                    color: '#1E293B',
                    boxShadow: '0 0 0 2px rgba(0, 83, 78, 0.1)',
                  }}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      searchInputRef.current?.focus();
                    }}
                    style={{
                      position: 'absolute',
                      right: '8px',
                      background: 'transparent',
                      border: 'none',
                      color: '#94A3B8',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      padding: '2px 4px',
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.72rem',
                  color: '#64748B',
                  padding: '0 2px',
                }}
              >
                <span>
                  {searchQuery ? (
                    <strong>
                      {filteredOptions.length} match{filteredOptions.length === 1 ? '' : 'es'}
                    </strong>
                  ) : (
                    <span>{parsedOptions.length} options available</span>
                  )}
                </span>
                <span style={{ fontSize: '0.7rem', color: '#0F766E' }}>Type letters to filter</span>
              </div>
            </div>

            {/* List */}
            <div style={{ overflowY: 'auto', maxHeight: '230px', padding: '4px' }}>
              {filteredOptions.length === 0 ? (
                <div
                  style={{
                    padding: '16px 12px',
                    textAlign: 'center',
                    color: '#64748B',
                    fontSize: '0.82rem',
                  }}
                >
                  <div style={{ fontSize: '1.2rem', marginBottom: '4px' }}>🔍</div>
                  <div style={{ fontWeight: 600 }}>No matching options found</div>
                  <div style={{ fontSize: '0.74rem', marginTop: '2px', color: '#94A3B8' }}>
                    Try typing different letters
                  </div>
                </div>
              ) : (
                filteredOptions.map((opt, idx) => {
                  const isCurrent = String(opt.value) === String(value);
                  const isHighlighted = idx === highlightedIndex;

                  return (
                    <div
                      key={`${opt.value}-${idx}`}
                      ref={(el) => {
                        optionItemRefs.current[idx] = el;
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        !opt.disabled && handleSelect(opt);
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        !opt.disabled && handleSelect(opt);
                      }}
                      onMouseEnter={() => !opt.disabled && setHighlightedIndex(idx)}
                      style={{
                        padding: '7px 10px',
                        borderRadius: '5px',
                        fontSize: '0.82rem',
                        cursor: opt.disabled ? 'not-allowed' : 'pointer',
                        opacity: opt.disabled ? 0.45 : 1,
                        backgroundColor: isCurrent
                          ? '#E6F4EA'
                          : isHighlighted
                          ? '#F0FDFA'
                          : 'transparent',
                        color: opt.disabled
                          ? '#94A3B8'
                          : isCurrent
                          ? '#00534E'
                          : isHighlighted
                          ? '#0F766E'
                          : '#1E293B',
                        fontWeight: isCurrent ? 700 : isHighlighted ? 600 : 400,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                        borderLeft: isCurrent
                          ? '3px solid #00534E'
                          : isHighlighted
                          ? '3px solid #0F766E'
                          : '3px solid transparent',
                      }}
                    >
                      <span
                        style={{
                          flex: 1,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'normal',
                          wordBreak: 'break-word',
                          lineHeight: '1.3',
                        }}
                      >
                        {renderHighlighted(opt.label, searchQuery)}
                      </span>
                      {isCurrent && (
                        <span style={{ color: '#00534E', fontWeight: 800, fontSize: '0.85rem' }}>
                          ✓
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div
              style={{
                background: '#F8FAFC',
                borderTop: '1px solid #F1F5F9',
                padding: '4px 10px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.7rem',
                color: '#64748B',
              }}
            >
              <span>
                <kbd style={{ background: '#E2E8F0', padding: '1px 4px', borderRadius: '3px' }}>↑</kbd>
                <kbd style={{ background: '#E2E8F0', padding: '1px 4px', borderRadius: '3px', marginLeft: '2px' }}>↓</kbd> navigate
              </span>
              <span>
                <kbd style={{ background: '#E2E8F0', padding: '1px 4px', borderRadius: '3px' }}>↵</kbd> select
              </span>
              <span>
                <kbd style={{ background: '#E2E8F0', padding: '1px 4px', borderRadius: '3px' }}>esc</kbd> close
              </span>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
