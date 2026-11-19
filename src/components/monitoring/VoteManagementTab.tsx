'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

interface GovernmentVote {
  id: string;
  voteNumber: string;
  voteName: string;
  description: string;
  category: 'Recurrent' | 'Capital';
  availableFor?: string;
  status?: 'Active' | 'Inactive';
  financialYear: string;
  createdAt: string;
  updatedAt?: string;
  createdBy?: string;
}

const AVAILABLE_FOR_OPTIONS = [
  'All Branches',
  'Ministry Line Branches',
  'Provincial Education Departments',
  'Zonal Education Offices',
  'Apex Institutions (NIE / EPD / DoE)',
  'Annual Implementation Plan (AIP)',
  'Budget Proposals & Forecasting',
  'Workshops & Capacity Building',
  'Custom Scope...',
];

export default function VoteManagementTab() {
  const { data: session } = useSession();
  const user = session?.user as any;

  // Planning branch check (Vote Management is managed by Planning Branch / SuperAdmin)
  const isSuperAdmin = Boolean(
    user?.isSuperAdmin === true ||
    user?.adminLevel === 0 ||
    user?.roleId === 'role-superadmin' ||
    user?.username === 'superadmin' ||
    user?.roleName === 'Super Administrator'
  );

  const isPlanningBranchUser = Boolean(
    isSuperAdmin ||
    user?.functionalCategory === 'Planning' ||
    user?.username === 'planning.officer' ||
    user?.username === 'planning' ||
    user?.username === 'doe.planning' ||
    user?.organizationName?.toLowerCase().includes('plan') ||
    user?.organizationId?.toLowerCase().includes('plan')
  );

  // Financial Year Selection
  const [selectedYear, setSelectedYear] = useState<string>('2027');
  const [availableYears, setAvailableYears] = useState<string[]>(['2025', '2026', '2027', '2028']);
  const [previousYears, setPreviousYears] = useState<string[]>(['2026', '2025']);

  // Dynamic Rule: Current year (2026) and previous years (2025) are locked/non-editable.
  // Upcoming planning years (2027+) are fully editable.
  const isEditableYear = Number(selectedYear) > 2026;

  // Data & Filters
  const [votes, setVotes] = useState<GovernmentVote[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 5;

  // Populate Section State
  const [populateSourceYear, setPopulateSourceYear] = useState<string>('2026');
  const [sourceYearVotes, setSourceYearVotes] = useState<GovernmentVote[]>([]);
  const [selectedSourceVoteId, setSelectedSourceVoteId] = useState<string>('');
  const [isPopulating, setIsPopulating] = useState<boolean>(false);

  // Expenditure Preview for selected source vote
  const [selectedVoteExpenditure, setSelectedVoteExpenditure] = useState<any | null>(null);

  // Register Modal State
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState<boolean>(false);
  const [regVoteNumber, setRegVoteNumber] = useState<string>('');
  const [regVoteName, setRegVoteName] = useState<string>('');
  const [regDescription, setRegDescription] = useState<string>('');
  const [regCategory, setRegCategory] = useState<'Recurrent' | 'Capital'>('Recurrent');
  const [regAvailableFor, setRegAvailableFor] = useState<string>('All Branches');
  const [regCustomAvailableFor, setRegCustomAvailableFor] = useState<string>('');
  const [isSubmittingReg, setIsSubmittingReg] = useState<boolean>(false);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editingVote, setEditingVote] = useState<GovernmentVote | null>(null);
  const [editVoteNumber, setEditVoteNumber] = useState<string>('');
  const [editVoteName, setEditVoteName] = useState<string>('');
  const [editDescription, setEditDescription] = useState<string>('');
  const [editCategory, setEditCategory] = useState<'Recurrent' | 'Capital'>('Recurrent');
  const [editAvailableFor, setEditAvailableFor] = useState<string>('All Branches');
  const [editCustomAvailableFor, setEditCustomAvailableFor] = useState<string>('');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState<boolean>(false);

  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [deletingVote, setDeletingVote] = useState<GovernmentVote | null>(null);
  const [isSubmittingDelete, setIsSubmittingDelete] = useState<boolean>(false);

  // Toast Notification
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch Votes for Selected Financial Year
  const fetchVotes = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        financialYear: selectedYear,
        search: searchQuery,
        category: categoryFilter,
      });
      const res = await fetch(`/api/votes?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setVotes(data.votes || []);
        setTotalCount(data.totalCount || 0);
        if (data.financialYears && data.financialYears.length > 0) {
          setAvailableYears(data.financialYears);
        }
        if (data.populateSourceYears && data.populateSourceYears.length > 0) {
          setPreviousYears(data.populateSourceYears);
          if (!data.populateSourceYears.includes(populateSourceYear)) {
            setPopulateSourceYear(data.populateSourceYears[0]);
          }
        } else {
          const prevs = (data.financialYears || availableYears)
            .filter((y: string) => Number(y) < Number(selectedYear))
            .sort((a: string, b: string) => Number(b) - Number(a));
          const fallback = prevs.length > 0 ? prevs : ['2026', '2025'];
          setPreviousYears(fallback);
          if (!fallback.includes(populateSourceYear)) {
            setPopulateSourceYear(fallback[0]);
          }
        }
      } else {
        const err = await res.json();
        showToast('error', err.error || 'Failed to fetch votes');
      }
    } catch (err: any) {
      console.error(err);
      showToast('error', 'Error loading votes');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch Source Year Votes for Populate Dropdown
  const fetchSourceVotes = async (srcYear: string) => {
    try {
      if (!srcYear) return;
      const res = await fetch(`/api/votes?sourceYear=${srcYear}`);
      if (res.ok) {
        const data = await res.json();
        setSourceYearVotes(data.sourceVotes || []);
        setSelectedSourceVoteId('');
        setSelectedVoteExpenditure(null);
      }
    } catch (err) {
      console.error('Error fetching source votes:', err);
    }
  };

  useEffect(() => {
    if (session?.user) {
      fetchVotes();
      setCurrentPage(1);
    }
  }, [session?.user, selectedYear, searchQuery, categoryFilter]);

  useEffect(() => {
    if (populateSourceYear) {
      fetchSourceVotes(populateSourceYear);
    }
  }, [populateSourceYear]);

  // When source vote is selected, calculate expenditure preview
  useEffect(() => {
    if (!selectedSourceVoteId) {
      setSelectedVoteExpenditure(null);
      return;
    }
    const vote = sourceYearVotes.find((v) => v.id === selectedSourceVoteId);
    if (vote) {
      // Mocked or calculated financial figure for preview
      const baseEstimate = vote.category === 'Capital' ? 185.0 : 82.5;
      const actualSpend = vote.category === 'Capital' ? 142.3 : 68.2;
      const rate = Math.round((actualSpend / baseEstimate) * 100);
      setSelectedVoteExpenditure({
        voteNumber: vote.voteNumber,
        voteName: vote.voteName,
        category: vote.category,
        year: populateSourceYear,
        allocatedMn: baseEstimate,
        spentMn: actualSpend,
        balanceMn: Math.round((baseEstimate - actualSpend) * 10) / 10,
        rate,
      });
    }
  }, [selectedSourceVoteId, sourceYearVotes, populateSourceYear]);

  // Handle Populate Vote
  const handlePopulateVote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditableYear) {
      showToast('error', `Votes can only be populated into upcoming planning years (e.g. 2027). Financial Year ${selectedYear} is locked.`);
      return;
    }
    if (!selectedSourceVoteId) {
      showToast('error', 'Please select a vote to copy.');
      return;
    }

    try {
      setIsPopulating(true);
      const res = await fetch('/api/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'populate',
          sourceFinancialYear: populateSourceYear,
          targetFinancialYear: selectedYear,
          voteId: selectedSourceVoteId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        showToast('success', data.message || 'Vote populated successfully! You can now edit its details.');
        setSelectedSourceVoteId('');
        fetchVotes();
      } else {
        const err = await res.json();
        showToast('error', err.error || 'Failed to populate vote');
      }
    } catch (err: any) {
      console.error(err);
      showToast('error', 'Error populating vote');
    } finally {
      setIsPopulating(false);
    }
  };

  // Handle Register Vote
  const handleRegisterVote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditableYear) {
      showToast('error', `Direct vote registration is disabled for finalized year ${selectedYear}. Switch to 2027 to register or populate votes.`);
      return;
    }
    if (!regVoteNumber.trim()) {
      showToast('error', 'Vote number is required.');
      return;
    }
    if (!regVoteName.trim()) {
      showToast('error', 'Vote name is required.');
      return;
    }

    const effectiveAvailableFor = regAvailableFor === 'Custom Scope...'
      ? (regCustomAvailableFor.trim() || 'All Branches')
      : regAvailableFor;

    try {
      setIsSubmittingReg(true);
      const res = await fetch('/api/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          voteNumber: regVoteNumber.trim(),
          voteName: regVoteName.trim(),
          description: regDescription.trim(),
          category: regCategory,
          availableFor: effectiveAvailableFor,
          financialYear: selectedYear,
        }),
      });

      if (res.ok) {
        showToast('success', `Vote ${regVoteNumber} registered successfully for Financial Year ${selectedYear}!`);
        setIsRegisterModalOpen(false);
        setRegVoteNumber('');
        setRegVoteName('');
        setRegDescription('');
        setRegCategory('Recurrent');
        setRegAvailableFor('All Branches');
        setRegCustomAvailableFor('');
        fetchVotes();
      } else {
        const err = await res.json();
        showToast('error', err.error || 'Failed to register vote');
      }
    } catch (err: any) {
      console.error(err);
      showToast('error', 'Error registering vote');
    } finally {
      setIsSubmittingReg(false);
    }
  };

  // Handle Edit Open
  const openEditModal = (vote: GovernmentVote) => {
    if (!isEditableYear) {
      showToast('error', `Votes in Financial Year ${selectedYear} are finalized/operational and cannot be edited.`);
      return;
    }
    setEditingVote(vote);
    setEditVoteNumber(vote.voteNumber);
    setEditVoteName(vote.voteName);
    setEditDescription(vote.description || '');
    setEditCategory(vote.category || 'Recurrent');
    const isPreset = AVAILABLE_FOR_OPTIONS.slice(0, -1).includes(vote.availableFor || '');
    if (isPreset || !vote.availableFor) {
      setEditAvailableFor(vote.availableFor || 'All Branches');
      setEditCustomAvailableFor('');
    } else {
      setEditAvailableFor('Custom Scope...');
      setEditCustomAvailableFor(vote.availableFor);
    }
    setIsEditModalOpen(true);
  };

  // Handle Update Vote
  const handleUpdateVote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVote) return;
    if (!isEditableYear) {
      showToast('error', `Votes in Financial Year ${selectedYear} are non-editable.`);
      return;
    }
    if (!editVoteNumber.trim() || !editVoteName.trim()) {
      showToast('error', 'Vote number and vote name are required.');
      return;
    }

    const effectiveAvailableFor = editAvailableFor === 'Custom Scope...'
      ? (editCustomAvailableFor.trim() || 'All Branches')
      : editAvailableFor;

    try {
      setIsSubmittingEdit(true);
      const res = await fetch('/api/votes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingVote.id,
          voteNumber: editVoteNumber.trim(),
          voteName: editVoteName.trim(),
          description: editDescription.trim(),
          category: editCategory,
          availableFor: effectiveAvailableFor,
        }),
      });

      if (res.ok) {
        showToast('success', `Vote ${editVoteNumber} updated successfully!`);
        setIsEditModalOpen(false);
        setEditingVote(null);
        fetchVotes();
      } else {
        const err = await res.json();
        showToast('error', err.error || 'Failed to update vote');
      }
    } catch (err: any) {
      console.error(err);
      showToast('error', 'Error updating vote');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Handle Delete Open
  const openDeleteModal = (vote: GovernmentVote) => {
    if (!isEditableYear) {
      showToast('error', `Votes in Financial Year ${selectedYear} are locked and cannot be deleted.`);
      return;
    }
    setDeletingVote(vote);
    setIsDeleteModalOpen(true);
  };

  // Handle Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deletingVote) return;
    if (!isEditableYear) {
      showToast('error', `Votes in Financial Year ${selectedYear} cannot be deleted.`);
      return;
    }

    try {
      setIsSubmittingDelete(true);
      const res = await fetch(`/api/votes?id=${deletingVote.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        showToast('success', `Vote ${deletingVote.voteNumber} deleted successfully.`);
        setIsDeleteModalOpen(false);
        setDeletingVote(null);
        fetchVotes();
      } else {
        const err = await res.json();
        showToast('error', err.error || 'Failed to delete vote');
      }
    } catch (err: any) {
      console.error(err);
      showToast('error', 'Error deleting vote');
    } finally {
      setIsSubmittingDelete(false);
    }
  };

  // Pagination slicing
  const totalPages = Math.ceil(votes.length / pageSize) || 1;
  const paginatedVotes = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return votes.slice(start, start + pageSize);
  }, [votes, currentPage, pageSize]);

  // Format date helper
  const formatDate = (isoString?: string) => {
    if (!isoString) return '-';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div style={{ color: '#1E293B', width: '100%' }}>
      {/* Toast Alert */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '24px',
            zIndex: 9999,
            background: toast.type === 'success' ? '#065F46' : '#991B1B',
            color: '#FFFFFF',
            padding: '0.85rem 1.4rem',
            borderRadius: '10px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            fontSize: '0.9rem',
            fontWeight: 500,
            animation: 'fadeIn 0.3s ease-out',
          }}
        >
          {toast.type === 'success' ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F87171" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Banner & Action Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderLeft: '5px solid #00534E',
          borderRadius: '12px',
          padding: '1.25rem 1.6rem',
          marginBottom: '1.5rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>
            Monitoring &amp; Verification / Vote Management
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1E293B', margin: 0, letterSpacing: '-0.02em' }}>
              Vote Management
            </h1>
            <span
              style={{
                background: '#F0FDFA',
                color: '#00534E',
                border: '1px solid #99F6E4',
                padding: '0.2rem 0.6rem',
                borderRadius: '9999px',
                fontSize: '0.72rem',
                fontWeight: 700,
              }}
            >
              Planning &amp; Governance Module
            </span>
          </div>
          <p style={{ color: '#64748B', fontSize: '0.85rem', marginTop: '0.35rem', marginBottom: 0 }}>
            Register and manage government votes used across annual implementation plans and budget proposals.
          </p>
        </div>

        {/* Top Right Controls: Register Vote & Financial Year Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
          {/* Register Vote Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', opacity: isEditableYear ? 1 : 0.65 }}>
            <button
              type="button"
              onClick={() => {
                if (isEditableYear) {
                  setIsRegisterModalOpen(true);
                } else {
                  showToast('error', `Financial Year ${selectedYear} is locked (operational/past year). New votes can only be registered for planning year 2027.`);
                }
              }}
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                background: isEditableYear ? '#F0FDFA' : '#F1F5F9',
                border: isEditableYear ? '1px solid #99F6E4' : '1px solid #CBD5E1',
                color: isEditableYear ? '#00534E' : '#64748B',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: isEditableYear ? 'pointer' : 'not-allowed',
                fontSize: isEditableYear ? '1.25rem' : '0.9rem',
                fontWeight: 700,
                transition: 'all 0.15s',
              }}
              title={isEditableYear ? "Register New Vote" : "Direct registration locked for current/past years"}
            >
              {isEditableYear ? '+' : '🔒'}
            </button>
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1E293B' }}>
                Register Vote {isEditableYear ? '' : '(Locked)'}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#64748B' }}>
                {isEditableYear
                  ? 'Create a new vote for the selected financial year.'
                  : `Direct creation locked for ${selectedYear}.`}
              </div>
            </div>
          </div>

          {/* Financial Year Selector */}
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: '170px' }}>
            <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748B', marginBottom: '3px' }}>
              Financial Year
            </label>
            <div style={{ position: 'relative' }}>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                style={{
                  width: '100%',
                  appearance: 'none',
                  background: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  borderRadius: '8px',
                  padding: '0.45rem 2rem 0.45rem 0.75rem',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  color: '#1E293B',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                {availableYears.map((year) => (
                  <option key={year} value={year}>
                    {year === '2026' ? '2026 (Current Year)' : year === '2025' ? '2025 (Previous Year)' : year === '2027' ? '2027 (Planning Year)' : year}
                  </option>
                ))}
              </select>
              <div
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                  color: '#64748B',
                }}
              >
                ▼
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Card 1: Populate Vote */}
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          padding: '1.4rem 1.6rem',
          marginBottom: '1.5rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1E293B', margin: 0 }}>
                Populate Vote
              </h2>
              {!isEditableYear && (
                <span
                  style={{
                    background: '#F1F5F9',
                    border: '1px solid #CBD5E1',
                    color: '#64748B',
                    padding: '0.15rem 0.55rem',
                    borderRadius: '6px',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                  }}
                >
                  🔒 Locked for {selectedYear}
                </span>
              )}
            </div>
            <p style={{ color: '#64748B', fontSize: '0.82rem', marginTop: '0.2rem', marginBottom: 0 }}>
              {isEditableYear
                ? `Copy votes from this year (2026) or previous years (2025) into financial year ${selectedYear}. Populated votes can be freely edited.`
                : `Vote population can only target upcoming planning years (e.g. 2027).`}
            </p>
          </div>
          {isEditableYear && (
            <div
              style={{
                background: '#ECFDF5',
                border: '1px solid #A7F3D0',
                color: '#065F46',
                padding: '0.25rem 0.75rem',
                borderRadius: '9999px',
                fontSize: '0.72rem',
                fontWeight: 600,
              }}
            >
              A separate record will be created for {selectedYear}
            </div>
          )}
        </div>

        {!isEditableYear ? (
          <div
            style={{
              background: '#F8FAFC',
              border: '1px dashed #CBD5E1',
              borderRadius: '8px',
              padding: '1rem 1.25rem',
              color: '#475569',
              fontSize: '0.84rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <div>
              <strong>Populate Vote Locked for Financial Year {selectedYear}:</strong> Financial Year {selectedYear} is {selectedYear === '2026' ? 'the current operational financial year' : 'a closed/archived financial year'}. All vote records for this year are non-editable. To copy and edit votes for next year, select <strong>Financial Year 2027</strong> in the top-right selector.
            </div>
          </div>
        ) : (
          <form onSubmit={handlePopulateVote}>
            <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr 170px', gap: '1rem', alignItems: 'flex-end' }}>
              {/* Previous Financial Year Select */}
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: '#475569', marginBottom: '5px' }}>
                  Source Financial Year
                </label>
                <div style={{ position: 'relative' }}>
                  <select
                    value={populateSourceYear}
                    onChange={(e) => setPopulateSourceYear(e.target.value)}
                    style={{
                      width: '100%',
                      appearance: 'none',
                      background: '#FFFFFF',
                      border: '1px solid #CBD5E1',
                      borderRadius: '8px',
                      padding: '0.55rem 2rem 0.55rem 0.75rem',
                      fontSize: '0.84rem',
                      color: '#1E293B',
                      fontWeight: 600,
                      cursor: 'pointer',
                      outline: 'none',
                    }}
                  >
                    {previousYears.map((y) => (
                      <option key={y} value={y}>
                        {y === '2026' ? '2026 (Current Year)' : y === '2025' ? '2025 (Previous Year)' : y}
                      </option>
                    ))}
                  </select>
                  <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748B', fontSize: '0.7rem' }}>
                    ▼
                  </div>
                </div>
              </div>

              {/* Select Vote Select */}
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: '#475569', marginBottom: '5px' }}>
                  Select Vote to Populate into {selectedYear}
                </label>
                <div style={{ position: 'relative' }}>
                  <select
                    value={selectedSourceVoteId}
                    onChange={(e) => setSelectedSourceVoteId(e.target.value)}
                    style={{
                      width: '100%',
                      appearance: 'none',
                      background: '#FFFFFF',
                      border: '1px solid #CBD5E1',
                      borderRadius: '8px',
                      padding: '0.55rem 2rem 0.55rem 0.75rem',
                      fontSize: '0.84rem',
                      color: selectedSourceVoteId ? '#1E293B' : '#94A3B8',
                      fontWeight: 500,
                      cursor: 'pointer',
                      outline: 'none',
                    }}
                  >
                    <option value="">Select a vote to copy</option>
                    {sourceYearVotes.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.voteNumber} — {v.voteName} ({v.category || 'Recurrent'})
                      </option>
                    ))}
                  </select>
                  <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748B', fontSize: '0.7rem' }}>
                    ▼
                  </div>
                </div>
              </div>

              {/* Populate Vote Button */}
              <div>
                <button
                  type="submit"
                  disabled={isPopulating || !selectedSourceVoteId}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    background: selectedSourceVoteId ? '#00534E' : '#94A3B8',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.55rem 1rem',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: selectedSourceVoteId ? 'pointer' : 'not-allowed',
                    transition: 'background 0.2s',
                    height: '38px',
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  {isPopulating ? 'Populating...' : 'Populate Vote'}
                </button>
              </div>
            </div>

            {/* Expenditure Summary Preview when vote is selected */}
            {selectedVoteExpenditure && (
              <div
                style={{
                  marginTop: '1rem',
                  padding: '0.85rem 1.1rem',
                  background: '#F0FDFA',
                  border: '1px solid #CCFBF1',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                  fontSize: '0.82rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <span style={{ fontSize: '1.2rem' }}>📊</span>
                  <div>
                    <span style={{ fontWeight: 700, color: '#00534E' }}>
                      Historical Financial Expenditure for Vote {selectedVoteExpenditure.voteNumber} ({selectedVoteExpenditure.year}):
                    </span>{' '}
                    <span style={{ color: '#475569' }}>
                      Allocated: <strong>LKR {selectedVoteExpenditure.allocatedMn} Mn</strong> | Actual Spent: <strong>LKR {selectedVoteExpenditure.spentMn} Mn</strong> ({selectedVoteExpenditure.rate}% utilized) | Balance: <strong>LKR {selectedVoteExpenditure.balanceMn} Mn</strong>
                    </span>
                  </div>
                </div>
                <span
                  style={{
                    background: '#00534E',
                    color: '#FFFFFF',
                    padding: '0.2rem 0.6rem',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                  }}
                >
                  {selectedVoteExpenditure.rate}% Spend Rate
                </span>
              </div>
            )}
          </form>
        )}
      </div>

      {/* Card 2: Votes for Financial Year */}
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          padding: '1.4rem 1.6rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        }}
      >
        {/* Header & Count */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1E293B', margin: 0 }}>
                Votes for Financial Year {selectedYear}
              </h2>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '9999px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  background: isEditableYear ? '#ECFDF5' : '#F1F5F9',
                  color: isEditableYear ? '#065F46' : '#64748B',
                  border: `1px solid ${isEditableYear ? '#A7F3D0' : '#CBD5E1'}`,
                }}
              >
                {isEditableYear ? (
                  <>
                    <span style={{ fontSize: '0.65rem' }}>●</span> Editable (Planning Year)
                  </>
                ) : (
                  <>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    Non-Editable ({selectedYear === '2026' ? 'Current Year' : 'Previous Year'})
                  </>
                )}
              </span>
            </div>
            <p style={{ color: '#64748B', fontSize: '0.82rem', marginTop: '0.2rem', marginBottom: 0 }}>
              {isEditableYear
                ? 'Manage and edit all votes available for annual planning and budgeting.'
                : `Government votes included for operational/historical year ${selectedYear} (read-only reference).`}
            </p>
          </div>
          <div
            style={{
              fontSize: '0.8rem',
              fontWeight: 700,
              color: '#475569',
            }}
          >
            {votes.length} Votes
          </div>
        </div>

        {/* Informational Banner for Non-Editable Years */}
        {!isEditableYear && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderLeft: '4px solid #64748B',
              borderRadius: '8px',
              padding: '0.8rem 1.1rem',
              marginBottom: '1.25rem',
              fontSize: '0.82rem',
              color: '#475569',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <div>
              <strong>Financial Year {selectedYear} is {selectedYear === '2026' ? 'the Current Operational Year' : 'a Closed / Previous Year'}:</strong> The vote numbers included for this year are displayed for reference and are <strong>not editable</strong>. If you populate these vote numbers into <strong>Financial Year 2027</strong> (or upcoming planning years), you will be able to edit and customize them freely.
            </div>
          </div>
        )}

        {/* Filters & Search Toolbar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            marginBottom: '1.25rem',
            flexWrap: 'wrap',
          }}
        >
          {/* Search Box */}
          <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
            <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search by vote number, name or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem 0.55rem 2.3rem',
                fontSize: '0.84rem',
                border: '1px solid #CBD5E1',
                borderRadius: '8px',
                outline: 'none',
                color: '#1E293B',
              }}
            />
          </div>

          {/* Category Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.82rem', color: '#64748B', fontWeight: 600 }}>Category</label>
            <div style={{ position: 'relative', minWidth: '135px' }}>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                style={{
                  appearance: 'none',
                  background: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  borderRadius: '8px',
                  padding: '0.45rem 1.8rem 0.45rem 0.75rem',
                  fontSize: '0.84rem',
                  color: '#1E293B',
                  fontWeight: 500,
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="All">All Categories</option>
                <option value="Recurrent">Recurrent</option>
                <option value="Capital">Capital</option>
              </select>
              <div style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748B', fontSize: '0.68rem' }}>
                ▼
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.83rem' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                <th style={{ padding: '0.7rem 0.9rem', color: '#64748B', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', width: '45px' }}>#</th>
                <th style={{ padding: '0.7rem 0.9rem', color: '#64748B', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', width: '120px' }}>VOTE NUMBER</th>
                <th style={{ padding: '0.7rem 0.9rem', color: '#64748B', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', width: '200px' }}>VOTE NAME</th>
                <th style={{ padding: '0.7rem 0.9rem', color: '#64748B', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase' }}>DESCRIPTION</th>
                <th style={{ padding: '0.7rem 0.9rem', color: '#64748B', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', width: '110px' }}>CATEGORY</th>
                <th style={{ padding: '0.7rem 0.9rem', color: '#64748B', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', width: '160px' }}>AVAILABLE FOR</th>
                <th style={{ padding: '0.7rem 0.9rem', color: '#64748B', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', width: '110px' }}>CREATED DATE</th>
                <th style={{ padding: '0.7rem 0.9rem', color: '#64748B', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', width: '150px', textAlign: 'center' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} style={{ padding: '2.5rem', textAlign: 'center', color: '#64748B' }}>
                    Loading government votes...
                  </td>
                </tr>
              ) : paginatedVotes.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '2.5rem', textAlign: 'center', color: '#64748B' }}>
                    No votes registered for Financial Year {selectedYear}. Use <strong>&quot;Register Vote&quot;</strong> or <strong>&quot;Populate Vote&quot;</strong> above.
                  </td>
                </tr>
              ) : (
                paginatedVotes.map((vote, idx) => {
                  const rowNumber = (currentPage - 1) * pageSize + idx + 1;
                  const isCapital = vote.category === 'Capital';
                  return (
                    <tr
                      key={vote.id}
                      style={{
                        borderBottom: '1px solid #F1F5F9',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#F8FAFC')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = '#FFFFFF')}
                    >
                      <td style={{ padding: '0.75rem 0.9rem', color: '#64748B', fontWeight: 500 }}>
                        {rowNumber}
                      </td>
                      <td style={{ padding: '0.75rem 0.9rem', color: '#00534E', fontWeight: 700, fontSize: '0.88rem' }}>
                        {vote.voteNumber}
                      </td>
                      <td style={{ padding: '0.75rem 0.9rem', color: '#0F172A', fontWeight: 600 }}>
                        {vote.voteName}
                      </td>
                      <td style={{ padding: '0.75rem 0.9rem', color: '#64748B', lineHeight: 1.4 }}>
                        {vote.description || '-'}
                      </td>
                      <td style={{ padding: '0.75rem 0.9rem' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.2rem 0.65rem',
                            borderRadius: '9999px',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            background: isCapital ? '#FEF3C7' : '#EFF6FF',
                            color: isCapital ? '#B45309' : '#1D4ED8',
                            border: `1px solid ${isCapital ? '#FDE68A' : '#BFDBFE'}`,
                          }}
                        >
                          <span style={{ fontSize: '0.65rem' }}>●</span> {vote.category || 'Recurrent'}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 0.9rem' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '0.2rem 0.6rem',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            background: '#F1F5F9',
                            color: '#334155',
                            border: '1px solid #E2E8F0',
                          }}
                        >
                          {vote.availableFor || 'All Branches'}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 0.9rem', color: '#475569', fontSize: '0.8rem' }}>
                        {formatDate(vote.createdAt)}
                      </td>
                      <td style={{ padding: '0.75rem 0.9rem', textAlign: 'center' }}>
                        {isEditableYear ? (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
                            {/* Edit Button */}
                            <button
                              type="button"
                              onClick={() => openEditModal(vote)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                padding: '0.3rem 0.6rem',
                                borderRadius: '6px',
                                border: '1px solid #99F6E4',
                                background: '#F0FDFA',
                                color: '#0D9488',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.15s',
                              }}
                              title="Edit Vote"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 20h9" />
                                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                              </svg>
                              Edit
                            </button>

                            {/* Delete Button */}
                            <button
                              type="button"
                              onClick={() => openDeleteModal(vote)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                padding: '0.3rem 0.6rem',
                                borderRadius: '6px',
                                border: '1px solid #FECDD3',
                                background: '#FFF1F2',
                                color: '#E11D48',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.15s',
                              }}
                              title="Delete Vote"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                              Delete
                            </button>
                          </div>
                        ) : (
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              padding: '0.28rem 0.65rem',
                              borderRadius: '6px',
                              background: '#F1F5F9',
                              border: '1px solid #E2E8F0',
                              color: '#64748B',
                              fontSize: '0.74rem',
                              fontWeight: 600,
                            }}
                            title={`Votes for ${selectedYear} are finalized/operational and cannot be edited. Populate into 2027 to customize.`}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                            </svg>
                            Locked
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {votes.length > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '1.25rem',
              fontSize: '0.82rem',
              color: '#64748B',
              flexWrap: 'wrap',
              gap: '0.75rem',
            }}
          >
            <div>
              Showing {Math.min((currentPage - 1) * pageSize + 1, votes.length)} - {Math.min(currentPage * pageSize, votes.length)} of {votes.length} votes
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  color: currentPage === 1 ? '#CBD5E1' : '#334155',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.8rem',
                }}
              >
                &lt;
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '6px',
                    border: page === currentPage ? 'none' : '1px solid #CBD5E1',
                    background: page === currentPage ? '#00534E' : '#FFFFFF',
                    color: page === currentPage ? '#FFFFFF' : '#334155',
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                    fontWeight: page === currentPage ? 700 : 500,
                  }}
                >
                  {page}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  color: currentPage === totalPages ? '#CBD5E1' : '#334155',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.8rem',
                }}
              >
                &gt;
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal 1: Register Vote Modal */}
      {isRegisterModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(3px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              maxWidth: '540px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              overflow: 'hidden',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.6rem', borderBottom: '1px solid #E2E8F0' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1E293B', margin: 0 }}>
                  Register Government Vote
                </h3>
                <p style={{ color: '#64748B', fontSize: '0.78rem', margin: '0.2rem 0 0 0' }}>
                  Create a new vote head for Financial Year {selectedYear}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsRegisterModalOpen(false)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: '#64748B',
                  fontSize: '1.3rem',
                  cursor: 'pointer',
                  padding: '0.2rem 0.5rem',
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRegisterVote} style={{ padding: '1.4rem 1.6rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#1E293B', marginBottom: '0.35rem' }}>
                  Vote Number <span style={{ color: '#E11D48' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 126 or 126-1-2-0-2103"
                  value={regVoteNumber}
                  onChange={(e) => setRegVoteNumber(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    border: '1px solid #CBD5E1',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    outline: 'none',
                  }}
                  required
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#1E293B', marginBottom: '0.35rem' }}>
                  Vote Name / Head Title <span style={{ color: '#E11D48' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Primary Education Development"
                  value={regVoteName}
                  onChange={(e) => setRegVoteName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    border: '1px solid #CBD5E1',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    outline: 'none',
                  }}
                  required
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#1E293B', marginBottom: '0.35rem' }}>
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Scope, objectives, and expenditure categories for this vote..."
                  value={regDescription}
                  onChange={(e) => setRegDescription(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    border: '1px solid #CBD5E1',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#1E293B', marginBottom: '0.35rem' }}>
                    Category (Recurrent / Capital) <span style={{ color: '#E11D48' }}>*</span>
                  </label>
                  <select
                    value={regCategory}
                    onChange={(e) => setRegCategory(e.target.value as 'Recurrent' | 'Capital')}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      border: '1px solid #CBD5E1',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      outline: 'none',
                      background: '#FFFFFF',
                    }}
                  >
                    <option value="Recurrent">Recurrent</option>
                    <option value="Capital">Capital</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#1E293B', marginBottom: '0.35rem' }}>
                    Available For <span style={{ color: '#E11D48' }}>*</span>
                  </label>
                  <select
                    value={regAvailableFor}
                    onChange={(e) => setRegAvailableFor(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      border: '1px solid #CBD5E1',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      outline: 'none',
                      background: '#FFFFFF',
                    }}
                  >
                    {AVAILABLE_FOR_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {regAvailableFor === 'Custom Scope...' && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#1E293B', marginBottom: '0.35rem' }}>
                    Specify Custom Scope / Divisions
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Planning Division, Zonal Offices Only..."
                    value={regCustomAvailableFor}
                    onChange={(e) => setRegCustomAvailableFor(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      border: '1px solid #CBD5E1',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      outline: 'none',
                    }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid #F1F5F9' }}>
                <button
                  type="button"
                  onClick={() => setIsRegisterModalOpen(false)}
                  style={{
                    padding: '0.55rem 1.1rem',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    background: '#FFFFFF',
                    color: '#475569',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReg}
                  style={{
                    padding: '0.55rem 1.3rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#00534E',
                    color: '#FFFFFF',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {isSubmittingReg ? 'Registering...' : 'Register Vote'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Edit Vote Modal */}
      {isEditModalOpen && editingVote && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(3px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              maxWidth: '540px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              overflow: 'hidden',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.6rem', borderBottom: '1px solid #E2E8F0' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1E293B', margin: 0 }}>
                  Edit Government Vote
                </h3>
                <p style={{ color: '#64748B', fontSize: '0.78rem', margin: '0.2rem 0 0 0' }}>
                  Update details for vote {editingVote.voteNumber} in Financial Year {selectedYear}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: '#64748B',
                  fontSize: '1.3rem',
                  cursor: 'pointer',
                  padding: '0.2rem 0.5rem',
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateVote} style={{ padding: '1.4rem 1.6rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#1E293B', marginBottom: '0.35rem' }}>
                  Vote Number <span style={{ color: '#E11D48' }}>*</span>
                </label>
                <input
                  type="text"
                  value={editVoteNumber}
                  onChange={(e) => setEditVoteNumber(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    border: '1px solid #CBD5E1',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    outline: 'none',
                  }}
                  required
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#1E293B', marginBottom: '0.35rem' }}>
                  Vote Name / Head Title <span style={{ color: '#E11D48' }}>*</span>
                </label>
                <input
                  type="text"
                  value={editVoteName}
                  onChange={(e) => setEditVoteName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    border: '1px solid #CBD5E1',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    outline: 'none',
                  }}
                  required
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#1E293B', marginBottom: '0.35rem' }}>
                  Description
                </label>
                <textarea
                  rows={2}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    border: '1px solid #CBD5E1',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#1E293B', marginBottom: '0.35rem' }}>
                    Category (Recurrent / Capital) <span style={{ color: '#E11D48' }}>*</span>
                  </label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value as 'Recurrent' | 'Capital')}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      border: '1px solid #CBD5E1',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      outline: 'none',
                      background: '#FFFFFF',
                    }}
                  >
                    <option value="Recurrent">Recurrent</option>
                    <option value="Capital">Capital</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#1E293B', marginBottom: '0.35rem' }}>
                    Available For <span style={{ color: '#E11D48' }}>*</span>
                  </label>
                  <select
                    value={editAvailableFor}
                    onChange={(e) => setEditAvailableFor(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      border: '1px solid #CBD5E1',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      outline: 'none',
                      background: '#FFFFFF',
                    }}
                  >
                    {AVAILABLE_FOR_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {editAvailableFor === 'Custom Scope...' && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#1E293B', marginBottom: '0.35rem' }}>
                    Specify Custom Scope / Divisions
                  </label>
                  <input
                    type="text"
                    value={editCustomAvailableFor}
                    onChange={(e) => setEditCustomAvailableFor(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      border: '1px solid #CBD5E1',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      outline: 'none',
                    }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid #F1F5F9' }}>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  style={{
                    padding: '0.55rem 1.1rem',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    background: '#FFFFFF',
                    color: '#475569',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  style={{
                    padding: '0.55rem 1.3rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#00534E',
                    color: '#FFFFFF',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {isSubmittingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Delete Vote Confirmation Modal */}
      {isDeleteModalOpen && deletingVote && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(3px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              maxWidth: '440px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              padding: '1.8rem',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                background: '#FFE4E6',
                color: '#BE123C',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem',
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
            </div>

            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1E293B', marginBottom: '0.5rem' }}>
              Delete Vote {deletingVote.voteNumber}?
            </h3>

            <p style={{ color: '#64748B', fontSize: '0.85rem', lineHeight: 1.5, marginBottom: '1.5rem' }}>
              Are you sure you want to delete <strong>{deletingVote.voteNumber} — {deletingVote.voteName}</strong> from Financial Year {selectedYear}? This action cannot be undone.
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                style={{
                  padding: '0.6rem 1.2rem',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  color: '#475569',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingDelete}
                onClick={handleConfirmDelete}
                style={{
                  padding: '0.6rem 1.4rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#E11D48',
                  color: '#FFFFFF',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {isSubmittingDelete ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
