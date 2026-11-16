'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';

interface SelectOptionItem {
  value: string;
  label: string;
  disabled: boolean;
  selected: boolean;
  index: number;
}

/**
 * Robust helper to trigger React 16/17/18 controlled state updates on native HTMLSelectElements
 */
function setNativeSelectValue(select: HTMLSelectElement, value: string) {
  const previousValue = select.value;
  select.value = value;

  for (let i = 0; i < select.options.length; i++) {
    select.options[i].selected = select.options[i].value === value;
  }

  // Sync React internal value tracker if present
  const tracker = (select as any)._valueTracker;
  if (tracker) {
    tracker.setValue(previousValue);
  }

  // Use prototype setter to notify React's virtual DOM
  const prototypeSetter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value')?.set;
  if (prototypeSetter) {
    prototypeSetter.call(select, value);
  }

  // Dispatch standard events with bubbling
  select.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
  select.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
}

/**
 * Extracts options from a native HTMLSelectElement
 */
function extractOptionsFromSelect(select: HTMLSelectElement): SelectOptionItem[] {
  const list: SelectOptionItem[] = [];
  const options = select.options;
  for (let i = 0; i < options.length; i++) {
    const opt = options[i];
    list.push({
      value: opt.value,
      label: opt.text || opt.label || opt.value || `(Option ${i + 1})`,
      disabled: opt.disabled,
      selected: opt.value === select.value,
      index: i,
    });
  }
  return list;
}

/**
 * GlobalSearchableSelect
 * 
 * Provides an automatic, instantaneous type-to-search combobox overlay for ANY
 * native HTML <select> element across the entire IPMIS application.
 * Users can simply type a few letters of any word to filter and find relevant options immediately.
 */
export default function GlobalSearchableSelect() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [activeSelect, setActiveSelect] = useState<HTMLSelectElement | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [options, setOptions] = useState<SelectOptionItem[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number; width: number; placeAbove: boolean }>({
    top: 0,
    left: 0,
    width: 320,
    placeAbove: false,
  });

  const searchInputRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const optionItemRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Close on route change
  useEffect(() => {
    setIsOpen(false);
    setActiveSelect(null);
  }, [pathname]);

  // Calculate popover position relative to target select
  const updatePosition = useCallback((target: HTMLSelectElement) => {
    if (!target || !document.body.contains(target)) {
      setIsOpen(false);
      return;
    }

    const rect = target.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      setIsOpen(false);
      return;
    }

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Minimum width of 320px or target width, whichever is larger, but not exceeding screen
    const popoverWidth = Math.min(Math.max(rect.width, 320), viewportWidth - 24);

    let left = rect.left;
    if (left + popoverWidth > viewportWidth - 12) {
      left = Math.max(12, viewportWidth - popoverWidth - 12);
    }
    if (left < 12) {
      left = 12;
    }

    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    const placeAbove = spaceBelow < 240 && spaceAbove > spaceBelow;

    let top = 0;
    if (placeAbove) {
      top = Math.max(12, rect.top - 6);
    } else {
      top = Math.min(viewportHeight - 12, rect.bottom + 4);
    }

    setPopoverPos({
      top,
      left,
      width: popoverWidth,
      placeAbove,
    });
  }, []);

  // Open the search popup for a given select element
  const openForSelect = useCallback((select: HTMLSelectElement, initialQuery: string = '') => {
    if (select.disabled || select.getAttribute('data-no-search') === 'true') {
      return;
    }

    const currentOptions = extractOptionsFromSelect(select);
    setOptions(currentOptions);
    setActiveSelect(select);
    setSearchQuery(initialQuery);

    // Initial selected index
    const initialSelectedIdx = currentOptions.findIndex((o) => o.selected && !o.disabled);
    setHighlightedIndex(initialSelectedIdx >= 0 ? initialSelectedIdx : 0);

    updatePosition(select);
    setIsOpen(true);

    // Auto-focus search input
    setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
        if (initialQuery) {
          searchInputRef.current.setSelectionRange(initialQuery.length, initialQuery.length);
        } else {
          searchInputRef.current.select();
        }
      }
    }, 25);
  }, [updatePosition]);

  const close = useCallback(() => {
    setIsOpen(false);
    if (activeSelect && document.body.contains(activeSelect)) {
      activeSelect.focus();
    }
    setActiveSelect(null);
    setSearchQuery('');
  }, [activeSelect]);

  // Filter options based on typed query (supports multi-word sub-matches)
  const filteredOptions = useMemo(() => {
    const trimmed = searchQuery.trim().toLowerCase();
    if (!trimmed) return options;

    const queryWords = trimmed.split(/\s+/).filter(Boolean);
    return options.filter((opt) => {
      const label = (opt.label || '').toLowerCase();
      const val = (opt.value || '').toLowerCase();
      // Match if all words in query appear in either label or value
      return queryWords.every((w) => label.includes(w) || val.includes(w));
    });
  }, [options, searchQuery]);

  // Adjust highlighted index when filtered results change
  useEffect(() => {
    if (filteredOptions.length > 0) {
      setHighlightedIndex((prev) => {
        if (prev < 0 || prev >= filteredOptions.length) return 0;
        return prev;
      });
    } else {
      setHighlightedIndex(0);
    }
  }, [filteredOptions]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && optionItemRefs.current[highlightedIndex]) {
      optionItemRefs.current[highlightedIndex]?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [highlightedIndex, isOpen]);

  // Select an option
  const handleSelectOption = useCallback((option: SelectOptionItem) => {
    if (option.disabled || !activeSelect) return;
    setNativeSelectValue(activeSelect, option.value);
    close();
  }, [activeSelect, close]);

  // Global listeners for select interactions
  useEffect(() => {
    let lastHandledTarget: HTMLSelectElement | null = null;
    let lastHandledTime = 0;

    const handlePointerOrMouseDown = (e: Event) => {
      if (popoverRef.current && popoverRef.current.contains(e.target as Node)) {
        return;
      }

      const target = (e.target as HTMLElement)?.closest('select') as HTMLSelectElement | null;
      if (target && !target.disabled && target.getAttribute('data-no-search') !== 'true') {
        e.preventDefault();
        e.stopPropagation();

        const now = Date.now();
        // Prevent double-trigger when both pointerdown and mousedown fire in quick succession
        if (lastHandledTarget === target && now - lastHandledTime < 300) {
          return;
        }
        lastHandledTarget = target;
        lastHandledTime = now;

        if (isOpen && activeSelect === target) {
          close();
        } else {
          openForSelect(target);
        }
      } else if (isOpen) {
        close();
      }
    };

    const handleClick = (e: MouseEvent) => {
      if (popoverRef.current && popoverRef.current.contains(e.target as Node)) {
        return;
      }

      const target = (e.target as HTMLElement)?.closest('select') as HTMLSelectElement | null;
      if (target && !target.disabled && target.getAttribute('data-no-search') !== 'true') {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // If popup is open, handle in popup component
      if (isOpen) return;

      const activeEl = document.activeElement as HTMLElement | null;
      if (activeEl && activeEl.tagName === 'SELECT') {
        const select = activeEl as HTMLSelectElement;
        if (select.disabled || select.getAttribute('data-no-search') === 'true') return;

        // Space, Enter, ArrowDown, ArrowUp opens popup
        if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          openForSelect(select);
        } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
          // User started typing letters (e.g. 'i', 'c', 't', 'm', '2')
          e.preventDefault();
          openForSelect(select, e.key);
        }
      }
    };

    const handleScrollOrResize = () => {
      if (isOpen && activeSelect) {
        updatePosition(activeSelect);
      }
    };

    window.addEventListener('pointerdown', handlePointerOrMouseDown, true);
    window.addEventListener('mousedown', handlePointerOrMouseDown, true);
    window.addEventListener('click', handleClick, true);
    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize, true);

    return () => {
      window.removeEventListener('pointerdown', handlePointerOrMouseDown, true);
      window.removeEventListener('mousedown', handlePointerOrMouseDown, true);
      window.removeEventListener('click', handleClick, true);
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize, true);
    };
  }, [isOpen, activeSelect, openForSelect, close, updatePosition]);

  // Handle keyboard navigation inside popup
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
        handleSelectOption(filteredOptions[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'Tab') {
      close();
    }
  };

  // Helper to highlight matching letters in option text
  const renderHighlightedText = (text: string, query: string) => {
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

  if (!isOpen || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div
      ref={popoverRef}
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'fixed',
        top: popoverPos.placeAbove ? undefined : `${popoverPos.top}px`,
        bottom: popoverPos.placeAbove ? `${window.innerHeight - popoverPos.top}px` : undefined,
        left: `${popoverPos.left}px`,
        width: `${popoverPos.width}px`,
        maxHeight: '340px',
        backgroundColor: '#ffffff',
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
      {/* Search Bar Header */}
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
              title="Clear search"
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
              <span>{options.length} options available</span>
            )}
          </span>
          <span style={{ fontSize: '0.7rem', color: '#0F766E' }}>Type letters to filter</span>
        </div>
      </div>

      {/* Options List */}
      <div
        ref={listRef}
        style={{
          overflowY: 'auto',
          maxHeight: '230px',
          padding: '4px',
        }}
      >
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
            const isHighlighted = idx === highlightedIndex;
            const isCurrentValue = activeSelect ? opt.value === activeSelect.value : false;

            return (
              <div
                key={`${opt.value}-${opt.index}`}
                ref={(el) => {
                  optionItemRefs.current[idx] = el;
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  !opt.disabled && handleSelectOption(opt);
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  !opt.disabled && handleSelectOption(opt);
                }}
                onMouseEnter={() => !opt.disabled && setHighlightedIndex(idx)}
                style={{
                  padding: '7px 10px',
                  borderRadius: '5px',
                  fontSize: '0.82rem',
                  cursor: opt.disabled ? 'not-allowed' : 'pointer',
                  opacity: opt.disabled ? 0.45 : 1,
                  backgroundColor: isCurrentValue
                    ? '#E6F4EA'
                    : isHighlighted
                    ? '#F0FDFA'
                    : 'transparent',
                  color: opt.disabled
                    ? '#94A3B8'
                    : isCurrentValue
                    ? '#00534E'
                    : isHighlighted
                    ? '#0F766E'
                    : '#1E293B',
                  fontWeight: isCurrentValue ? 700 : isHighlighted ? 600 : 400,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  transition: 'background-color 0.1s ease',
                  borderLeft: isCurrentValue
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
                  {renderHighlightedText(opt.label, searchQuery)}
                </span>
                {isCurrentValue && (
                  <span
                    style={{
                      color: '#00534E',
                      fontWeight: 800,
                      fontSize: '0.85rem',
                      flexShrink: 0,
                    }}
                    title="Currently selected"
                  >
                    ✓
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Keyboard Footer Hint */}
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
  );
}
