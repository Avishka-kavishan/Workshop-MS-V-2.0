'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import AppShell from '@/components/layout/AppShell';
import BranchBadge, { getBranchAbbreviation } from '@/components/common/BranchBadge';
import SearchableSelect from '@/components/common/SearchableSelect';
import TileActionMenu, { TileExportData } from '@/components/dashboard/TileActionMenu';
import { formatMillion, formatRupees, formatDualDeclaration, roundToCentInMn, format2DecMn, formatExactMn } from '@/lib/financialFormat';
import { MOE_STANDARD_VOTE_NUMBERS, getVoteDetails } from '@/lib/sriLankanVotes';

interface BudgetProposalActivity {
  id: string;
  financialYear: string;
  implementationYear?: string;
  institutionId: string;
  institutionName: string;
  divisionId: string;
  divisionName: string;
  activityTitle: string;
  category: string;
  categoryDetail?: string;
  expenditureNature?: 'Recurrent' | 'Capital';
  proposedExecutingAgencyType?: string;
  executingAgencyName?: string;
  isExtensionOfPreviousAip?: boolean;
  linkedPreviousAipActivityId?: string;
  linkedPreviousAipActivityCode?: string;
  linkedPreviousAipActivityTitle?: string;
  linkedOtherActivityTitle?: string;
  description: string;
  purpose?: string;
  justification: string;
  expectedOutputs: string;
  keyDeliverables?: string;
  implementationPeriod: string;
  targetBeneficiaries: string;
  beneficiaryCount: number;
  estimatedCostMn: number;
  noBudgetRequired?: boolean;
  status: 'Draft' | 'Submitted' | 'Under Review' | 'Accepted' | 'Adjusted' | 'Rejected' | 'Deferred' | 'Duplicate';
  submittedBy: string;
  submittedAt?: string;
  activityNumber?: number;
  assignedActivityCode?: string;
  allocatedAmountMn?: number;
  ppbModificationsNote?: string;
  isStrategicVisionAddition?: boolean;
  governmentPriorityTheme?: string;
  assignedVoteNumber?: string;
  assignedObjectCode?: string;
  assignedFundingSource?: string;
  adjustedCostMn?: number;
  planningRemarks?: string;
  rejectionReasonCategory?: string;
  rejectionRemarks?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  includedInBudgetSpeech?: boolean;
  budgetSpeechSummary?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  previousAcceptedVersion?: {
    activityTitle: string;
    description: string;
    purpose?: string;
    justification: string;
    expectedOutputs: string;
    keyDeliverables?: string;
    category: string;
    categoryDetail?: string;
    expenditureNature?: 'Recurrent' | 'Capital';
    proposedExecutingAgencyType?: string;
    executingAgencyName?: string;
    implementationPeriod: string;
    targetBeneficiaries: string;
    beneficiaryCount: number;
    estimatedCostMn: number;
    noBudgetRequired?: boolean;
    adjustedCostMn?: number;
    allocatedAmountMn?: number;
    assignedVoteNumber?: string;
    assignedObjectCode?: string;
    assignedFundingSource?: string;
    governmentPriorityTheme?: string;
    planningRemarks?: string;
    activityNumber?: number;
    assignedActivityCode?: string;
    reviewedBy?: string;
    reviewedAt?: string;
    status: 'Accepted' | 'Adjusted';
    savedAt: string;
    savedBy: string;
  };
  isEditedFromAccepted?: boolean;
  editedAfterAcceptedAt?: string;
  editedAfterAcceptedBy?: string;
  editedByBranchOrRole?: string;
  updatedAt: string;
}

interface ProposalSummary {
  financialYear: string;
  totalProposals: number;
  branchProposalsCount: number;
  branchProposedMn: number;
  visionProposalsCount: number;
  visionProposedMn: number;
  totalDemandMn: number;
  acceptedCount: number;
  acceptedCostMn: number;
  budgetSpeechCount: number;
  budgetSpeechCostMn: number;
}

interface BudgetSummary {
  financialYear: string;
  totalCeilingMn: number;
  totalAllocatedMn: number;
  totalCommittedMn: number;
  totalExpenditureMn: number;
  totalPaidMn: number;
  unallocatedCeilingMn: number;
  utilisationRate: number;
  commitmentRate: number;
}

export default function BudgetPlanningWorkspacePage() {
  const { data: session } = useSession();
  const user = session?.user as any;

  const [selectedYear, setSelectedYear] = useState('2027');
  const [loading, setLoading] = useState(true);

  // Active Tab:
  // 'branch-planning' (Stage 1) | 'formulation' (Stage 2) | 'budget-speech' (Outputs) | 'allocations' (Post-Appropriation)
  const [activeTab, setActiveTab] = useState<'branch-planning' | 'formulation' | 'budget-speech' | 'allocations'>('branch-planning');

  // Server Data
  const [proposals, setProposals] = useState<BudgetProposalActivity[]>([]);
  const [proposalSummary, setProposalSummary] = useState<ProposalSummary | null>(null);
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [ceilings, setCeilings] = useState<any[]>([]);
  const [allocations, setAllocations] = useState<any[]>([]);
  const [revisions, setRevisions] = useState<any[]>([]);
  const [objectCodes, setObjectCodes] = useState<any[]>([]);
  const [fundingSources, setFundingSources] = useState<any[]>([]);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [aipActivities, setAipActivities] = useState<any[]>([]);
  const [userContext, setUserContext] = useState<any>(null);

  // Filter states
  const [selectedDivisionFilter, setSelectedDivisionFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [themeFilter, setThemeFilter] = useState<string>('all');

  // Branch Plan View Selector
  const [branchWorkspaceDivId, setBranchWorkspaceDivId] = useState<string>('');

  // ── POPUP MODAL 1: PROPOSE / EDIT BRANCH ACTIVITY (STAGE 1) ───────────────
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [isEditingProposal, setIsEditingProposal] = useState(false);
  const [editingProposalId, setEditingProposalId] = useState<string | null>(null);

  const initialProposalForm = {
    activityTitle: '',
    implementationYear: '2027',
    proposedExecutingAgencyType: 'Self (Branch)',
    executingAgencyName: '',
    expenditureNature: 'Recurrent' as 'Recurrent' | 'Capital',
    category: 'Workshop & Training',
    categoryDetail: '',
    isExtensionOfPreviousAip: false,
    linkedPreviousAipActivityId: '',
    linkedPreviousAipActivityCode: '',
    linkedPreviousAipActivityTitle: '',
    linkedOtherActivityTitle: '',
    description: '',
    purpose: '',
    justification: '',
    expectedOutputs: '',
    keyDeliverables: '',
    implementationPeriod: 'Q1',
    targetBeneficiaries: '',
    beneficiaryCount: '' as unknown as number,
    estimatedCostMn: '' as unknown as number,
    noBudgetRequired: false,
  };

  const [proposalForm, setProposalForm] = useState(initialProposalForm);

  // ── POPUP MODAL 2: ADD GOVERNMENT VISION INITIATIVE (STAGE 2) ─────────────
  const [showVisionModal, setShowVisionModal] = useState(false);
  const [visionForm, setVisionForm] = useState({
    activityTitle: '',
    implementationYear: '2027',
    proposedExecutingAgencyType: 'Self (Branch)',
    executingAgencyName: '',
    expenditureNature: 'Capital' as 'Recurrent' | 'Capital',
    category: 'Infrastructure & ICT',
    governmentPriorityTheme: 'Digital Education & STEM',
    description: '',
    justification: 'National Policy Directive & Cabinet Priority Mandate',
    expectedOutputs: '',
    implementationPeriod: 'Annual',
    targetBeneficiaries: 'National Secondary Schools',
    beneficiaryCount: 10000,
    estimatedCostMn: 25.0,
    assignedVoteNumber: '126-02-04-2104',
    assignedObjectCode: '2104',
    assignedFundingSource: 'Treasury Consolidated Fund',
    includedInBudgetSpeech: true,
    budgetSpeechSummary: '',
  });

  // ── POPUP MODAL 3: REVIEW / APPRAISE / REJECT PROPOSAL (STAGE 2) ──────────
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedProposalForReview, setSelectedProposalForReview] = useState<BudgetProposalActivity | null>(null);
  const [reviewDecisionType, setReviewDecisionType] = useState<'approve' | 'edit' | 'reject'>('approve');
  const [reviewForm, setReviewForm] = useState({
    status: 'Accepted' as 'Accepted' | 'Adjusted' | 'Rejected' | 'Under Review' | 'Deferred' | 'Duplicate',
    activityNumber: 1,
    activityTitle: '',
    purpose: '',
    justification: '',
    expectedOutputs: '',
    keyDeliverables: '',
    ppbModificationsNote: '',
    adjustedCostMn: 0,
    governmentPriorityTheme: 'General Education Development',
    planningRemarks: '',
    rejectionReasonCategory: 'Incomplete Information / Lack of Activity Specification',
    rejectionRemarks: '',
    assignedVoteNumber: '',
    assignedObjectCode: '2502',
    assignedFundingSource: 'Treasury Consolidated Fund',
    includedInBudgetSpeech: false,
    budgetSpeechSummary: '',
  });

  // PPB Announced Deadlines
  const [deadlines, setDeadlines] = useState<any[]>([]);

  // Guidelines Circular Modal
  const [showGuidelinesModal, setShowGuidelinesModal] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4500);
  };

  const fetchBudgetData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/planning/budget?year=${selectedYear}`);
      if (res.ok) {
        const data = await res.json();
        setProposals(data.proposals || []);
        setProposalSummary(data.proposalSummary || null);
        setSummary(data.summary || null);
        setCeilings(data.ceilings || []);
        setAllocations(data.allocations || []);
        setRevisions(data.revisions || []);
        setObjectCodes(data.objectCodes || []);
        setFundingSources(data.fundingSources || []);
        setOrganizations(data.organizations || []);
        setAipActivities(data.aipActivities || []);
        if (data.deadlines) setDeadlines(data.deadlines);
        setUserContext(data.userContext || null);

        const isPlanning = Boolean(data.userContext?.isPlanningDivision || data.userContext?.isSuperAdmin);
        const isMonitoring = Boolean(data.userContext?.isMonitoringDivision);

        if (!isPlanning && !isMonitoring) {
          setBranchWorkspaceDivId(data.userContext?.divisionId || 'org-moe-ict');
          setActiveTab('branch-planning');
        } else {
          if (!branchWorkspaceDivId) {
            setBranchWorkspaceDivId('org-moe-ict');
          }
          if (!userContext) {
            setActiveTab(isPlanning ? 'formulation' : 'branch-planning');
          }
        }
      }
    } catch (err) {
      console.error('Failed to load budget data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBudgetData();
  }, [selectedYear]);

  const isPlanningOfficer = Boolean(userContext?.isPlanningDivision || userContext?.isSuperAdmin);
  const isMonitoringOfficer = Boolean(userContext?.isMonitoringDivision);

  // Strict operational role lockdown: non-planning, non-monitoring users are strictly restricted to their division
  useEffect(() => {
    if (userContext && !isPlanningOfficer && !isMonitoringOfficer) {
      if (userContext.divisionId && branchWorkspaceDivId !== userContext.divisionId) {
        setBranchWorkspaceDivId(userContext.divisionId);
      }
      if (activeTab !== 'branch-planning') {
        setActiveTab('branch-planning');
      }
    }
  }, [userContext, isPlanningOfficer, isMonitoringOfficer, branchWorkspaceDivId, activeTab]);

  // Interactive Tile Filter State (filters the Proposed Activities table below)
  const [activeTileFilter, setActiveTileFilter] = useState<'all' | 'drafts' | 'submitted' | 'accepted' | 'rejected'>('all');

  const handleTileClick = (filter: 'all' | 'drafts' | 'submitted' | 'accepted' | 'rejected') => {
    setActiveTileFilter((prev) => (prev === filter ? 'all' : filter));
  };

  // Filtered Proposals for Stage 1 (Branch Workspace)
  const currentBranchProposals = useMemo(() => {
    return proposals.filter((p) => p.divisionId === branchWorkspaceDivId && !p.isStrategicVisionAddition);
  }, [proposals, branchWorkspaceDivId]);

  const branchTotalDemand = useMemo(() => {
    return currentBranchProposals.reduce((sum, p) => sum + (Number(p.estimatedCostMn) || 0), 0);
  }, [currentBranchProposals]);

  const branchDraftsCount = useMemo(() => {
    return currentBranchProposals.filter((p) => p.status === 'Draft').length;
  }, [currentBranchProposals]);

  // Comprehensive branch-specific stats for operational branch front tiles
  const branchStats = useMemo(() => {
    const list = currentBranchProposals;
    const totalCount = list.length;
    const totalDemandMn = list.reduce((sum, p) => sum + (Number(p.estimatedCostMn) || 0), 0);

    const drafts = list.filter((p) => p.status === 'Draft');
    const draftsCount = drafts.length;
    const draftsCostMn = drafts.reduce((sum, p) => sum + (Number(p.estimatedCostMn) || 0), 0);

    const submitted = list.filter((p) => p.status === 'Submitted');
    const submittedCount = submitted.length;
    const submittedCostMn = submitted.reduce((sum, p) => sum + (Number(p.estimatedCostMn) || 0), 0);

    const accepted = list.filter((p) => p.status === 'Accepted' || p.status === 'Adjusted');
    const acceptedCount = accepted.length;
    const acceptedCostMn = accepted.reduce((sum, p) => sum + (Number(p.adjustedCostMn ?? p.estimatedCostMn) || 0), 0);

    const rejected = list.filter((p) => p.status === 'Rejected');
    const rejectedCount = rejected.length;

    const underReview = list.filter((p) => p.status === 'Under Review');
    const underReviewCount = underReview.length;

    const adjusted = list.filter((p) => p.status === 'Adjusted');
    const adjustedCount = adjusted.length;

    return {
      totalCount,
      totalDemandMn: Math.round(totalDemandMn * 1000) / 1000,
      draftsCount,
      draftsCostMn: Math.round(draftsCostMn * 1000) / 1000,
      submittedCount,
      submittedCostMn: Math.round(submittedCostMn * 1000) / 1000,
      acceptedCount,
      acceptedCostMn: Math.round(acceptedCostMn * 1000) / 1000,
      rejectedCount,
      underReviewCount,
      adjustedCount,
      actionRequiredCount: rejectedCount + adjustedCount,
    };
  }, [currentBranchProposals]);

  // Filtered proposals based on interactive tile click
  const displayedBranchProposals = useMemo(() => {
    if (activeTileFilter === 'drafts') {
      return currentBranchProposals.filter((p) => p.status === 'Draft');
    }
    if (activeTileFilter === 'submitted') {
      return currentBranchProposals.filter((p) => p.status === 'Submitted' || p.status === 'Under Review');
    }
    if (activeTileFilter === 'accepted') {
      return currentBranchProposals.filter((p) => p.status === 'Accepted' || p.status === 'Adjusted');
    }
    if (activeTileFilter === 'rejected') {
      return currentBranchProposals.filter((p) => p.status === 'Rejected');
    }
    return currentBranchProposals;
  }, [currentBranchProposals, activeTileFilter]);

  const activeFilterMeta = useMemo(() => {
    switch (activeTileFilter) {
      case 'drafts':
        return { label: 'Drafts (In Preparation)', count: branchStats.draftsCount, color: '#334155', bg: '#F1F5F9', border: '#CBD5E1' };
      case 'submitted':
        return { label: 'Submitted to Planning', count: branchStats.submittedCount, color: '#0369A1', bg: '#F0F9FF', border: '#BAE6FD' };
      case 'accepted':
        return { label: 'Accepted by Planning', count: branchStats.acceptedCount, color: '#15803D', bg: '#F0FDF4', border: '#BBF7D0' };
      case 'rejected':
        return { label: 'Planning Feedback / Rejected', count: branchStats.rejectedCount, color: '#B91C1C', bg: '#FEF2F2', border: '#FECACA' };
      default:
        return null;
    }
  }, [activeTileFilter, branchStats]);

  // Active Policy Planning Branch (PPB) Announced Deadline for Selected FY
  const activePpbDeadline = useMemo(() => {
    return deadlines.find(
      (d) =>
        String(d.financialYear) === String(selectedYear) &&
        (d.id.includes('budget') || d.category === 'Budget Request')
    );
  }, [deadlines, selectedYear]);

  const deadlineStatus = useMemo(() => {
    if (!activePpbDeadline) return null;
    const deadlineDate = new Date(activePpbDeadline.dueDate + 'T23:59:59');
    const now = new Date();
    const isExpired = now > deadlineDate;
    const diffMs = deadlineDate.getTime() - now.getTime();
    const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    return {
      ...activePpbDeadline,
      isExpired,
      daysRemaining,
      formattedDueDate: new Date(activePpbDeadline.dueDate).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
    };
  }, [activePpbDeadline]);

  // Filtered Proposals for Stage 2 (Formulation Desk)
  const filteredFormulationProposals = useMemo(() => {
    return proposals.filter((p) => {
      const matchesDiv = selectedDivisionFilter === 'all' || p.divisionId === selectedDivisionFilter;
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
      const matchesTheme = themeFilter === 'all' || (p.governmentPriorityTheme || '') === themeFilter;
      return matchesDiv && matchesStatus && matchesTheme;
    });
  }, [proposals, selectedDivisionFilter, statusFilter, themeFilter]);

  // Standard previous AIP activities list (combining server aipActivities + standard reference library)
  const availablePreviousAipActivities = useMemo(() => {
    const list: Array<{ code: string; title: string; year: string }> = [
      { code: 'ACT-2026-01', title: 'National In-Service Teacher Training in Digital Pedagogy', year: '2026' },
      { code: 'ACT-2026-02', title: 'Smart Classroom LMS Server Maintenance & Networking', year: '2026' },
      { code: 'ACT-2026-03', title: 'Secondary Mathematics Olympiad Mentorship Programme', year: '2026' },
      { code: 'ACT-2026-04', title: 'Primary Student Nutrition & School Meals Quality Assurance', year: '2026' },
      { code: 'ACT-2026-05', title: 'Modular Competency Curriculum Pilot Seminars', year: '2026' },
    ];
    if (Array.isArray(aipActivities)) {
      aipActivities.forEach((a) => {
        if (a.activityCode && a.activity && !list.some((item) => item.code === a.activityCode)) {
          list.push({
            code: a.activityCode,
            title: a.activity,
            year: a.year || '2026',
          });
        }
      });
    }
    return list;
  }, [aipActivities]);

  // ── Open Create Proposal Modal ───────────────────────────────────────────
  const openCreateModal = () => {
    setIsEditingProposal(false);
    setEditingProposalId(null);
    setProposalForm({
      ...initialProposalForm,
      implementationYear: selectedYear,
    });
    if (!branchWorkspaceDivId && (organizations.length > 0 || userContext)) {
      setBranchWorkspaceDivId(userContext?.divisionId || (organizations[0]?.id) || 'org-moe-ict');
    }
    setShowProposalModal(true);
  };

  // ── Open Edit Proposal Modal ─────────────────────────────────────────────
  const openEditProposalModal = (p: BudgetProposalActivity) => {
    setIsEditingProposal(true);
    setEditingProposalId(p.id);
    const isZeroCost = Boolean(p.noBudgetRequired || Number(p.estimatedCostMn) === 0);
    setProposalForm({
      activityTitle: p.activityTitle,
      implementationYear: p.implementationYear || p.financialYear || selectedYear,
      proposedExecutingAgencyType: p.proposedExecutingAgencyType || 'Self (Branch)',
      executingAgencyName: p.executingAgencyName || '',
      expenditureNature: p.expenditureNature || 'Recurrent',
      category: p.category || 'Workshop & Training',
      categoryDetail: p.categoryDetail || '',
      isExtensionOfPreviousAip: Boolean(p.isExtensionOfPreviousAip),
      linkedPreviousAipActivityId: p.linkedPreviousAipActivityId || '',
      linkedPreviousAipActivityCode: p.linkedPreviousAipActivityCode || '',
      linkedPreviousAipActivityTitle: p.linkedPreviousAipActivityTitle || '',
      linkedOtherActivityTitle: p.linkedOtherActivityTitle || '',
      description: p.description || '',
      purpose: p.purpose || '',
      justification: p.justification || '',
      expectedOutputs: p.expectedOutputs || '',
      keyDeliverables: p.keyDeliverables || '',
      implementationPeriod: p.implementationPeriod || 'Q1',
      targetBeneficiaries: p.targetBeneficiaries || '',
      beneficiaryCount: p.beneficiaryCount !== undefined && p.beneficiaryCount !== null ? (p.beneficiaryCount as any) : ('' as any),
      estimatedCostMn: isZeroCost ? (0 as any) : (p.estimatedCostMn !== undefined && p.estimatedCostMn !== null ? (p.estimatedCostMn as any) : ('' as any)),
      noBudgetRequired: isZeroCost,
    });
    setShowProposalModal(true);
  };

  // ── Save Proposal (Create or Update) ─────────────────────────────────────
  const handleSaveProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const effectiveDivId = branchWorkspaceDivId || userContext?.divisionId || (organizations[0]?.id) || 'org-moe-ict';
      const effectiveDivObj = organizations.find((o) => o.id === effectiveDivId);
      const effectiveDivName = effectiveDivObj?.name || userContext?.divisionName || currentBranchName;

      const finalCost = proposalForm.noBudgetRequired
        ? 0
        : (proposalForm.estimatedCostMn === ('' as any) || isNaN(Number(proposalForm.estimatedCostMn)))
        ? 0
        : Number(proposalForm.estimatedCostMn);

      const payload: any = {
        financialYear: selectedYear,
        implementationYear: proposalForm.implementationYear,
        divisionId: effectiveDivId,
        divisionName: effectiveDivName,
        activityTitle: proposalForm.activityTitle,
        category: proposalForm.category,
        categoryDetail: proposalForm.category === 'Other' ? proposalForm.categoryDetail : undefined,
        expenditureNature: proposalForm.expenditureNature,
        proposedExecutingAgencyType: proposalForm.proposedExecutingAgencyType,
        executingAgencyName: proposalForm.executingAgencyName,
        isExtensionOfPreviousAip: proposalForm.isExtensionOfPreviousAip,
        linkedPreviousAipActivityCode: proposalForm.linkedPreviousAipActivityCode,
        linkedPreviousAipActivityTitle: proposalForm.linkedPreviousAipActivityTitle,
        linkedOtherActivityTitle: proposalForm.linkedOtherActivityTitle,
        description: proposalForm.description,
        purpose: proposalForm.purpose,
        justification: proposalForm.justification,
        expectedOutputs: proposalForm.expectedOutputs,
        keyDeliverables: proposalForm.keyDeliverables,
        implementationPeriod: proposalForm.implementationPeriod,
        targetBeneficiaries: proposalForm.targetBeneficiaries,
        beneficiaryCount: proposalForm.beneficiaryCount === ('' as any) ? 0 : Number(proposalForm.beneficiaryCount),
        estimatedCostMn: finalCost,
        noBudgetRequired: proposalForm.noBudgetRequired,
      };

      if (isEditingProposal && editingProposalId) {
        // Update existing proposal
        const res = await fetch('/api/planning/budget', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update_proposal',
            proposalId: editingProposalId,
            updatedData: payload,
          }),
        });

        if (res.ok) {
          const resp = await res.json();
          const isRevised = resp.proposal?.isEditedFromAccepted;
          showToast(
            'success',
            isRevised
              ? 'Activity updated! Because this activity was previously accepted, its status has returned to Draft for PPB re-acceptance. The branch can also reverse to the previous version anytime.'
              : 'Activity proposal updated successfully!'
          );
          setShowProposalModal(false);
          await fetchBudgetData();
        } else {
          const err = await res.json();
          showToast('error', err.error || 'Failed to update proposal');
        }
      } else {
        // Create new proposal
        const res = await fetch('/api/planning/budget', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'create_proposal',
            ...payload,
          }),
        });

        if (res.ok) {
          showToast('success', 'Activity proposal created in Draft! Note: Vote numbers are not required at this stage.');
          setShowProposalModal(false);
          await fetchBudgetData();
        } else {
          const err = await res.json();
          showToast('error', err.error || 'Failed to create activity proposal');
        }
      }
    } catch (err: any) {
      showToast('error', err.message);
    }
  };

  // ── Restore Edited Proposal to Previous Accepted Version ─────────────────
  const handleReverseToPreviousVersion = async (proposalId: string) => {
    const prop = proposals.find((p) => p.id === proposalId);
    const prevTitle = prop?.previousAcceptedVersion?.activityTitle || 'previously accepted version';
    if (
      !window.confirm(
        `Are you sure you want to restore this activity to the previous version accepted by Planning Branch (PPB)?\n\nTarget version: "${prevTitle}"\n\nRecent modifications will be discarded and the activity will be restored to "Accepted" status.`
      )
    ) {
      return;
    }

    try {
      const res = await fetch('/api/planning/budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reverse_proposal_version',
          proposalId,
        }),
      });

      if (res.ok) {
        showToast('success', 'Activity successfully restored to previous accepted version!');
        await fetchBudgetData();
      } else {
        const err = await res.json();
        showToast('error', err.error || 'Failed to restore activity to previous version');
      }
    } catch (err: any) {
      showToast('error', err.message);
    }
  };

  // ── Submit Branch Plan to Planning Division ──────────────────────────────
  const handleSubmitBranchPlan = async () => {
    // 1. PPB Deadline Verification
    if (deadlineStatus?.isExpired) {
      showToast(
        'error',
        `Submission blocked: The deadline announced by Policy Planning Branch (PPB) expired on ${deadlineStatus.formattedDueDate}. Submissions for FY ${selectedYear} are officially closed.`
      );
      return;
    }

    // 2. Drafts existence check
    if (branchStats.draftsCount === 0) {
      showToast(
        'error',
        `No draft activity proposals pending submission. All ${branchStats.totalCount} activities for ${currentBranchName} are already submitted or accepted by PPB.`
      );
      return;
    }

    // 3. User Confirmation Dialog
    const confirmPrompt =
      `Submit all ${branchStats.draftsCount} draft activity proposals for ${currentBranchName} totaling Rs. ${formatMillion(branchStats.draftsCostMn)} Mn (${formatRupees(branchStats.draftsCostMn, true)}) to the Policy Planning Branch (PPB) for FY ${selectedYear}?\n\n` +
      `🏛️ PPB Submission Cutoff: ${deadlineStatus ? `${deadlineStatus.formattedDueDate} (${deadlineStatus.daysRemaining} days remaining)` : 'Announced Cutoff'}\n\n` +
      `Once submitted, activities will be locked from direct editing and transferred to Stage 2 Ministry appraisal for vote assignment and cost rationalization.`;

    if (!window.confirm(confirmPrompt)) {
      return;
    }

    try {
      const res = await fetch('/api/planning/budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit_branch_plan',
          divisionId: branchWorkspaceDivId,
          financialYear: selectedYear,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        showToast('success', json.message || `Successfully submitted ${branchStats.draftsCount} activity proposals to Policy Planning Branch (PPB)!`);
        fetchBudgetData();
      } else {
        const err = await res.json();
        showToast('error', err.error || 'Failed to submit budgetary plan');
      }
    } catch (err: any) {
      showToast('error', err.message);
    }
  };

  // ── Delete Proposal ──────────────────────────────────────────────────────
  const handleDeleteProposal = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this activity proposal?')) return;
    try {
      const res = await fetch(`/api/planning/budget?proposalId=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        showToast('success', 'Proposal deleted successfully.');
        fetchBudgetData();
      } else {
        const err = await res.json();
        showToast('error', err.error || 'Could not delete proposal.');
      }
    } catch (err: any) {
      showToast('error', err.message);
    }
  };

  // ── Add Top-Down Government Vision Initiative (Planning Division) ────────
  const handleAddVisionInitiative = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/planning/budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_vision_initiative',
          financialYear: selectedYear,
          activityTitle: visionForm.activityTitle,
          category: visionForm.category,
          governmentPriorityTheme: visionForm.governmentPriorityTheme,
          description: visionForm.description,
          justification: visionForm.justification,
          expectedOutputs: visionForm.expectedOutputs,
          implementationPeriod: visionForm.implementationPeriod,
          targetBeneficiaries: visionForm.targetBeneficiaries,
          beneficiaryCount: visionForm.beneficiaryCount,
          estimatedCostMn: visionForm.estimatedCostMn,
          assignedVoteNumber: visionForm.assignedVoteNumber,
          assignedObjectCode: visionForm.assignedObjectCode,
          assignedFundingSource: visionForm.assignedFundingSource,
          includedInBudgetSpeech: visionForm.includedInBudgetSpeech,
          budgetSpeechSummary: visionForm.budgetSpeechSummary || visionForm.activityTitle,
        }),
      });

      if (res.ok) {
        showToast('success', 'Government Vision Strategic Initiative successfully injected into Ministry Plan!');
        setShowVisionModal(false);
        fetchBudgetData();
      } else {
        const err = await res.json();
        showToast('error', err.error || 'Failed to add vision initiative');
      }
    } catch (err: any) {
      showToast('error', err.message);
    }
  };

  // ── Open Planning Appraisal & Review Modal ───────────────────────────────
  const openReviewModal = (p: BudgetProposalActivity) => {
    setSelectedProposalForReview(p);
    setReviewDecisionType(p.status === 'Rejected' ? 'reject' : 'approve');

    // Auto-calculate sequential activity number starting from 1 for this branch and year
    const branchAccepted = proposals.filter(
      (x) => x.divisionId === p.divisionId && (x.financialYear === (p.financialYear || selectedYear)) && typeof x.activityNumber === 'number'
    );
    const maxNum = branchAccepted.reduce((max, x) => Math.max(max, x.activityNumber || 0), 0);
    const nextNum = maxNum + 1;

    setReviewForm({
      status: p.status === 'Rejected' ? 'Rejected' : (p.status === 'Draft' || p.status === 'Submitted') ? 'Accepted' : p.status,
      activityNumber: p.activityNumber || nextNum,
      activityTitle: p.activityTitle,
      purpose: p.purpose || '',
      justification: p.justification || '',
      expectedOutputs: p.expectedOutputs || '',
      keyDeliverables: p.keyDeliverables || '',
      ppbModificationsNote: p.ppbModificationsNote || '',
      adjustedCostMn: p.adjustedCostMn ?? p.estimatedCostMn,
      governmentPriorityTheme: p.governmentPriorityTheme || 'General Education Development',
      planningRemarks: p.planningRemarks || '',
      rejectionReasonCategory: p.rejectionReasonCategory || 'Incomplete Information / Lack of Activity Specification',
      rejectionRemarks: p.rejectionRemarks || '',
      assignedVoteNumber: p.assignedVoteNumber || '126-02-03-2502',
      assignedObjectCode: p.assignedObjectCode || '2502',
      assignedFundingSource: p.assignedFundingSource || 'Treasury Consolidated Fund',
      includedInBudgetSpeech: Boolean(p.includedInBudgetSpeech),
      budgetSpeechSummary: p.budgetSpeechSummary || p.activityTitle,
    });
    setShowReviewModal(true);
  };

  // ── Save Planning Review Decision (Approve / Edit / Reject) ──────────────
  const handleSaveReviewDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProposalForReview) return;

    try {
      const finalStatus = reviewDecisionType === 'reject' ? 'Rejected' : reviewForm.status;

      if (finalStatus === 'Rejected' && !reviewForm.rejectionRemarks.trim()) {
        showToast('error', 'Please provide specific rejection remarks explaining why the activity was rejected.');
        return;
      }

      // 1. Review status, activity number, modifications, & cost adjustment
      const resReview = await fetch('/api/planning/budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'review_proposal',
          proposalId: selectedProposalForReview.id,
          status: finalStatus,
          activityNumber: Number(reviewForm.activityNumber),
          activityTitle: reviewForm.activityTitle,
          purpose: reviewForm.purpose,
          justification: reviewForm.justification,
          expectedOutputs: reviewForm.expectedOutputs,
          keyDeliverables: reviewForm.keyDeliverables,
          ppbModificationsNote: reviewForm.ppbModificationsNote,
          adjustedCostMn: Number(reviewForm.adjustedCostMn),
          allocatedAmountMn: Number(reviewForm.adjustedCostMn),
          governmentPriorityTheme: reviewForm.governmentPriorityTheme,
          planningRemarks: reviewForm.planningRemarks,
          rejectionReasonCategory: reviewForm.rejectionReasonCategory,
          rejectionRemarks: reviewForm.rejectionRemarks,
          assignedVoteNumber: reviewForm.assignedVoteNumber,
          assignedObjectCode: reviewForm.assignedObjectCode,
          assignedFundingSource: reviewForm.assignedFundingSource,
        }),
      });

      // 2. Assign classifications if approved/adjusted
      if (finalStatus !== 'Rejected') {
        await fetch('/api/planning/budget', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'assign_classifications',
            proposalId: selectedProposalForReview.id,
            activityNumber: Number(reviewForm.activityNumber),
            allocatedAmountMn: Number(reviewForm.adjustedCostMn),
            assignedVoteNumber: reviewForm.assignedVoteNumber,
            assignedObjectCode: reviewForm.assignedObjectCode,
            assignedFundingSource: reviewForm.assignedFundingSource,
            includedInBudgetSpeech: reviewForm.includedInBudgetSpeech,
            budgetSpeechSummary: reviewForm.budgetSpeechSummary,
          }),
        });
      }

      if (resReview.ok) {
        const msg = finalStatus === 'Rejected'
          ? `Activity proposal rejected with reason: "${reviewForm.rejectionReasonCategory}"`
          : `Proposal "${selectedProposalForReview.activityTitle.slice(0, 30)}..." approved and classified!`;
        showToast('success', msg);
        setShowReviewModal(false);
        fetchBudgetData();
      } else {
        showToast('error', 'Failed to update review decision.');
      }
    } catch (err: any) {
      showToast('error', err.message);
    }
  };

  const currentBranchName = useMemo(() => {
    const org = organizations.find((o) => o.id === branchWorkspaceDivId);
    return org?.name || userContext?.divisionName || (session?.user as any)?.organizationName || 'Line Ministry Branch';
  }, [organizations, branchWorkspaceDivId, userContext, session]);

  // Export Data for Proposed Activities & Estimated Budgets Table
  const branchProposalsExportData: TileExportData = useMemo(() => {
    return {
      filename: `Proposed_Activities_and_Estimated_Budgets_${(currentBranchName || 'Branch').replace(/\s+/g, '_')}_FY${selectedYear}${activeTileFilter !== 'all' ? `_${activeTileFilter}` : ''}`,
      reportTitle: `Proposed Activities & Estimated Budgets — FY ${selectedYear}${activeFilterMeta ? ` (${activeFilterMeta.label})` : ''}`,
      subtitle: `${currentBranchName || 'Ministry Branch'} • Government of Sri Lanka Ministry of Education`,
      headers: [
        'Item #',
        'Activity Code',
        'Activity Title',
        'Category',
        'Executing Agency',
        'Nature',
        'Target Period',
        'Beneficiaries',
        'Estimated Budget (Rs. Mn)',
        'Vote Number',
        'Review Status',
      ],
      rows: displayedBranchProposals.map((p, idx) => [
        `#${idx + 1}`,
        p.assignedActivityCode || (p.activityNumber ? `ACT-${String(p.activityNumber).padStart(2, '0')}` : 'In Queue'),
        p.activityTitle,
        p.category || 'General',
        p.proposedExecutingAgencyType || p.executingAgencyName || 'Self (Branch)',
        p.expenditureNature || 'Recurrent',
        p.implementationPeriod || 'Q1',
        p.targetBeneficiaries || (p.beneficiaryCount ? `${p.beneficiaryCount} Persons` : 'General'),
        p.noBudgetRequired ? 'Rs. 0.00 Mn (Zero Budget)' : `Rs. ${formatMillion(p.estimatedCostMn)} Mn (${formatRupees(p.estimatedCostMn, true)})`,
        p.assignedVoteNumber || 'Pending Planning Assignment',
        p.status,
      ]),
      summaryStats: [
        { label: 'Showing Proposals', value: displayedBranchProposals.length },
        { label: 'Total Demand', value: `Rs. ${formatMillion(branchStats.totalDemandMn)} Mn (${formatRupees(branchStats.totalDemandMn, true)})` },
        { label: 'Accepted', value: branchStats.acceptedCount },
        { label: 'Submitted', value: branchStats.submittedCount },
        { label: 'Drafts', value: branchStats.draftsCount },
        { label: 'Rejected', value: branchStats.rejectedCount },
      ],
      copySummaryText: `Proposed Activities & Estimated Budgets (${currentBranchName} FY ${selectedYear}${activeFilterMeta ? ` - ${activeFilterMeta.label}` : ''}): ${displayedBranchProposals.length} activities shown out of ${branchStats.totalCount} total.`,
      orientation: 'landscape',
    };
  }, [displayedBranchProposals, currentBranchName, selectedYear, branchStats, activeTileFilter, activeFilterMeta]);

  // Memoized export dataset for Consolidated Budget Formulation Matrix
  const formulationExportData: TileExportData = useMemo(() => {
    return {
      filename: `Consolidated_Budget_Formulation_FY${selectedYear}`,
      reportTitle: `Consolidated Budget Formulation Matrix — FY ${selectedYear}`,
      subtitle: `Government of Sri Lanka Ministry of Education • Planning & Budget Division`,
      headers: [
        'Initiative Origin & Title',
        'Originating Division',
        'Executing Agency',
        'Proposed Demand (Rs. Mn)',
        'Rationalized Cost (Rs. Mn)',
        'Assigned Vote Number',
        'Review Status',
      ],
      rows: filteredFormulationProposals.map((p) => [
        p.activityTitle,
        p.divisionName || p.institutionName || 'Ministry Branch',
        p.proposedExecutingAgencyType || p.executingAgencyName || 'Self (Branch)',
        p.noBudgetRequired ? '0.00 (Zero Budget)' : formatMillion(p.estimatedCostMn),
        formatMillion(p.allocatedAmountMn ?? p.estimatedCostMn),
        p.assignedVoteNumber || 'Pending Planning Assignment',
        p.status,
      ]),
      summaryStats: [
        { label: 'Requirements', value: filteredFormulationProposals.length },
        { label: 'Total Demand', value: `Rs. ${format2DecMn(proposalSummary?.totalDemandMn || 0)} Mn (Exact: Rs. ${formatExactMn(proposalSummary?.totalDemandMn || 0)} Mn)` },
        { label: 'Branch Proposed', value: `Rs. ${format2DecMn(proposalSummary?.branchProposedMn || 0)} Mn (Exact: Rs. ${formatExactMn(proposalSummary?.branchProposedMn || 0)} Mn)` },
        { label: 'Vision Proposed', value: `Rs. ${format2DecMn(proposalSummary?.visionProposedMn || 0)} Mn (Exact: Rs. ${formatExactMn(proposalSummary?.visionProposedMn || 0)} Mn)` },
        { label: 'Accepted / Rationalized', value: `Rs. ${format2DecMn(proposalSummary?.acceptedCostMn || 0)} Mn (Exact: Rs. ${formatExactMn(proposalSummary?.acceptedCostMn || 0)} Mn)` },
        { label: 'Budget Speech Earmarked', value: `Rs. ${format2DecMn(proposalSummary?.budgetSpeechCostMn || 0)} Mn (Exact: Rs. ${formatExactMn(proposalSummary?.budgetSpeechCostMn || 0)} Mn)` },
      ],
      orientation: 'landscape',
    };
  }, [filteredFormulationProposals, selectedYear, proposalSummary]);

  return (
    <AppShell>
      <div className="page-container">

        {/* Toast Alert */}
        {toast && (
          <div
            style={{
              position: 'fixed',
              top: '1.5rem',
              right: '1.5rem',
              zIndex: 9999,
              padding: '0.85rem 1.25rem',
              borderRadius: '8px',
              color: '#fff',
              background: toast.type === 'success' ? '#00534E' : '#8D153A',
              boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
              fontWeight: 600,
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <span>{toast.type === 'success' ? '✅' : '⚠️'}</span>
            <span>{toast.message}</span>
          </div>
        )}

        {/* Top Header */}
        <div className="page-header" style={{ marginBottom: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.5rem' }}>📈</span>
              <h1 className="page-title" style={{ margin: 0 }}>
                Budgetary Planning & Annual Budget Formulation
              </h1>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Financial Year:
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="form-input"
              style={{ width: '90px', padding: '0.35rem 0.5rem', fontSize: '0.85rem' }}
            >
              <option value="2027">2027</option>
              <option value="2028">2028</option>
              <option value="2026">2026</option>
            </select>
          </div>
        </div>

        {/* Monitoring Division Banner (Special Visibility) */}
        {isMonitoringOfficer && (
          <div
            style={{
              padding: '0.75rem 1.25rem',
              borderRadius: '8px',
              background: '#E6FFFA',
              border: '1px solid #81E6D9',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            <span style={{ fontSize: '1.3rem' }}>👁️</span>
            <div>
              <div style={{ fontWeight: 700, color: '#234E52', fontSize: '0.88rem' }}>
                Monitoring & Verification Division Oversight Desk (Active)
              </div>
              <div style={{ fontSize: '0.78rem', color: '#285E61' }}>
                You have institutional observation visibility into all branch activity forecasts, estimated financial requirements, and Planning Division appraisal decisions.
              </div>
            </div>
          </div>
        )}

        {/* ── HIGH-LEVEL METRICS TILES (ROLE-AWARE) ─────────────────────── */}
        {isPlanningOfficer || isMonitoringOfficer ? (
          /* PLANNING DIVISION & MONITORING: MINISTRY-WIDE CONSOLIDATED TILES */
          proposalSummary && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
                gap: '0.65rem',
                marginBottom: '1.25rem',
              }}
            >
              {/* Card 1: Branch Proposals */}
              <div className="card" style={{ padding: '0.9rem 1.15rem', borderLeft: '4px solid #00534E' }}>
                <div style={{ fontSize: '0.73rem', color: '#666', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  Branch Proposals
                </div>
                <div
                  style={{
                    fontSize: '1.38rem',
                    fontWeight: 800,
                    color: '#00534E',
                    marginTop: '0.2rem',
                    whiteSpace: 'nowrap',
                    cursor: 'help',
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: '0.25rem',
                  }}
                  title={`Exact Demand: Rs. ${formatExactMn(proposalSummary.branchProposedMn)} Mn (${formatRupees(proposalSummary.branchProposedMn, true)})`}
                >
                  <span>Rs. {format2DecMn(proposalSummary.branchProposedMn)}</span>
                  <span style={{ fontSize: '0.92rem', fontWeight: 700, opacity: 0.9 }}>Mn</span>
                </div>
                <div
                  style={{ fontSize: '0.71rem', color: '#64748B', marginTop: '0.15rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                  title={`Exact Demand: Rs. ${formatExactMn(proposalSummary.branchProposedMn)} Mn (${formatRupees(proposalSummary.branchProposedMn, true)})`}
                >
                  Exact: Rs. {formatExactMn(proposalSummary.branchProposedMn)} Mn
                </div>
                <div style={{ fontSize: '0.72rem', color: '#888', marginTop: '0.2rem' }}>
                  {proposalSummary.branchProposalsCount} activities submitted (No votes required)
                </div>
              </div>

              {/* Card 2: Government Vision */}
              <div className="card" style={{ padding: '0.9rem 1.15rem', borderLeft: '4px solid #8D153A' }}>
                <div style={{ fontSize: '0.73rem', color: '#666', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  Stage 2: Government Vision
                </div>
                <div
                  style={{
                    fontSize: '1.38rem',
                    fontWeight: 800,
                    color: '#8D153A',
                    marginTop: '0.2rem',
                    whiteSpace: 'nowrap',
                    cursor: 'help',
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: '0.25rem',
                  }}
                  title={`Exact Government Vision: Rs. ${formatExactMn(proposalSummary.visionProposedMn)} Mn (${formatRupees(proposalSummary.visionProposedMn, true)})`}
                >
                  <span>Rs. {format2DecMn(proposalSummary.visionProposedMn)}</span>
                  <span style={{ fontSize: '0.92rem', fontWeight: 700, opacity: 0.9 }}>Mn</span>
                </div>
                <div
                  style={{ fontSize: '0.71rem', color: '#64748B', marginTop: '0.15rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                  title={`Exact Government Vision: Rs. ${formatExactMn(proposalSummary.visionProposedMn)} Mn (${formatRupees(proposalSummary.visionProposedMn, true)})`}
                >
                  Exact: Rs. {formatExactMn(proposalSummary.visionProposedMn)} Mn
                </div>
                <div style={{ fontSize: '0.72rem', color: '#888', marginTop: '0.2rem' }}>
                  {proposalSummary.visionProposalsCount} strategic policy initiatives injected
                </div>
              </div>

              {/* Card 3: Total Ministry Demand */}
              <div className="card" style={{ padding: '0.9rem 1.15rem', borderLeft: '4px solid #EB7400' }}>
                <div style={{ fontSize: '0.73rem', color: '#666', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  Total Ministry Demand
                </div>
                <div
                  style={{
                    fontSize: '1.38rem',
                    fontWeight: 800,
                    color: '#EB7400',
                    marginTop: '0.2rem',
                    whiteSpace: 'nowrap',
                    cursor: 'help',
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: '0.25rem',
                  }}
                  title={`Exact Total Demand: Rs. ${formatExactMn(proposalSummary.totalDemandMn)} Mn (${formatRupees(proposalSummary.totalDemandMn, true)})`}
                >
                  <span>Rs. {format2DecMn(proposalSummary.totalDemandMn)}</span>
                  <span style={{ fontSize: '0.92rem', fontWeight: 700, opacity: 0.9 }}>Mn</span>
                </div>
                <div
                  style={{ fontSize: '0.71rem', color: '#64748B', marginTop: '0.15rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                  title={`Exact Total Demand: Rs. ${formatExactMn(proposalSummary.totalDemandMn)} Mn (${formatRupees(proposalSummary.totalDemandMn, true)})`}
                >
                  Exact: Rs. {formatExactMn(proposalSummary.totalDemandMn)} Mn
                </div>
                <div style={{ fontSize: '0.72rem', color: '#888', marginTop: '0.2rem' }}>
                  Across {proposalSummary.totalProposals} total combined requirements
                </div>
              </div>

              {/* Card 4: Rationalized / Accepted */}
              <div className="card" style={{ padding: '0.9rem 1.15rem', borderLeft: '4px solid #2B6CB0' }}>
                <div style={{ fontSize: '0.73rem', color: '#666', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  Rationalized / Accepted
                </div>
                <div
                  style={{
                    fontSize: '1.38rem',
                    fontWeight: 800,
                    color: '#2B6CB0',
                    marginTop: '0.2rem',
                    whiteSpace: 'nowrap',
                    cursor: 'help',
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: '0.25rem',
                  }}
                  title={`Exact Accepted: Rs. ${formatExactMn(proposalSummary.acceptedCostMn)} Mn (${formatRupees(proposalSummary.acceptedCostMn, true)})`}
                >
                  <span>Rs. {format2DecMn(proposalSummary.acceptedCostMn)}</span>
                  <span style={{ fontSize: '0.92rem', fontWeight: 700, opacity: 0.9 }}>Mn</span>
                </div>
                <div
                  style={{ fontSize: '0.71rem', color: '#64748B', marginTop: '0.15rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                  title={`Exact Accepted: Rs. ${formatExactMn(proposalSummary.acceptedCostMn)} Mn (${formatRupees(proposalSummary.acceptedCostMn, true)})`}
                >
                  Exact: Rs. {formatExactMn(proposalSummary.acceptedCostMn)} Mn
                </div>
                <div style={{ fontSize: '0.72rem', color: '#888', marginTop: '0.2rem' }}>
                  {proposalSummary.acceptedCount} proposals classified with official votes
                </div>
              </div>

              {/* Card 5: Annual Budget Speech */}
              <div className="card" style={{ padding: '0.9rem 1.15rem', borderLeft: '4px solid #B7791F' }}>
                <div style={{ fontSize: '0.73rem', color: '#666', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  Annual Budget Speech
                </div>
                <div
                  style={{
                    fontSize: '1.38rem',
                    fontWeight: 800,
                    color: '#B7791F',
                    marginTop: '0.2rem',
                    whiteSpace: 'nowrap',
                    cursor: 'help',
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: '0.25rem',
                  }}
                  title={`Exact Budget Speech: Rs. ${formatExactMn(proposalSummary.budgetSpeechCostMn)} Mn (${formatRupees(proposalSummary.budgetSpeechCostMn, true)})`}
                >
                  <span>Rs. {format2DecMn(proposalSummary.budgetSpeechCostMn)}</span>
                  <span style={{ fontSize: '0.92rem', fontWeight: 700, opacity: 0.9 }}>Mn</span>
                </div>
                <div
                  style={{ fontSize: '0.71rem', color: '#64748B', marginTop: '0.15rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                  title={`Exact Budget Speech: Rs. ${formatExactMn(proposalSummary.budgetSpeechCostMn)} Mn (${formatRupees(proposalSummary.budgetSpeechCostMn, true)})`}
                >
                  Exact: Rs. {formatExactMn(proposalSummary.budgetSpeechCostMn)} Mn
                </div>
                <div style={{ fontSize: '0.72rem', color: '#888', marginTop: '0.2rem' }}>
                  {proposalSummary.budgetSpeechCount} flagship proposals earmarked
                </div>
              </div>
            </div>
          )
        ) : (
          /* OPERATIONAL BRANCH USER (E.G. ICT BRANCH): BRANCH BUDGETARY PLANNING TILES */
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
              gap: '0.65rem',
              marginBottom: '1.25rem',
            }}
          >
            {/* Tile 1: Branch Total Estimated Demand */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => handleTileClick('all')}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleTileClick('all'); }}
              title="Click to view all branch activity proposals"
              className="card"
              style={{
                padding: '0.75rem 1rem',
                border: activeTileFilter === 'all' ? '2px solid #00534E' : '1px solid #E2E8F0',
                borderLeft: '4px solid #00534E',
                borderRadius: '10px',
                boxShadow: activeTileFilter === 'all' ? '0 0 0 2px rgba(0, 83, 78, 0.18), 0 4px 12px rgba(0, 83, 78, 0.1)' : '0 2px 6px rgba(0,0,0,0.03)',
                background: activeTileFilter === 'all' ? '#F2FAF9' : 'var(--white)',
                cursor: 'pointer',
                transition: 'all 0.18s ease-in-out',
                userSelect: 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Branch Estimated Demand
                </span>
                <span style={{ fontSize: '1.05rem' }}>💰</span>
              </div>
              <div
                style={{ fontSize: '1.45rem', fontWeight: 800, color: '#00534E', lineHeight: 1.2, whiteSpace: 'nowrap', cursor: 'help' }}
                title={`Exact Demand: Rs. ${formatExactMn(branchStats.totalDemandMn)} Mn (${formatRupees(branchStats.totalDemandMn, true)})`}
              >
                Rs. {format2DecMn(branchStats.totalDemandMn)} <span style={{ fontSize: '0.95rem', fontWeight: 700 }}>Mn</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748B', marginTop: '0.25rem' }}>
                <span title={`Exact Demand: Rs. ${formatExactMn(branchStats.totalDemandMn)} Mn (${formatRupees(branchStats.totalDemandMn, true)})`}>
                  Exact: Rs. {formatExactMn(branchStats.totalDemandMn)} Mn
                </span>
                {activeTileFilter === 'all' && (
                  <span style={{ fontSize: '0.64rem', fontWeight: 700, color: '#00534E', background: 'rgba(0, 83, 78, 0.1)', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>
                    All ✓
                  </span>
                )}
              </div>
            </div>

            {/* Tile 2: Draft Proposals */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => handleTileClick('drafts')}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleTileClick('drafts'); }}
              title="Click to filter table by Draft activities"
              className="card"
              style={{
                padding: '0.75rem 1rem',
                border: activeTileFilter === 'drafts' ? '2px solid #475569' : '1px solid #E2E8F0',
                borderLeft: '4px solid #475569',
                borderRadius: '10px',
                boxShadow: activeTileFilter === 'drafts' ? '0 0 0 2px rgba(71, 85, 105, 0.25), 0 4px 12px rgba(71, 85, 105, 0.12)' : '0 2px 6px rgba(0,0,0,0.03)',
                background: activeTileFilter === 'drafts' ? '#F8FAFC' : 'var(--white)',
                cursor: 'pointer',
                transition: 'all 0.18s ease-in-out',
                userSelect: 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Drafts (In Preparation)
                </span>
                <span style={{ fontSize: '1.05rem' }}>📝</span>
              </div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#334155', lineHeight: 1.2 }}>
                {branchStats.draftsCount} Drafts
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748B', marginTop: '0.25rem' }}>
                <span title={`Exact Drafts: Rs. ${formatExactMn(branchStats.draftsCostMn)} Mn (${formatRupees(branchStats.draftsCostMn, true)})`}>Rs. {format2DecMn(branchStats.draftsCostMn)} Mn in prep</span>
                {activeTileFilter === 'drafts' ? (
                  <span style={{ fontSize: '0.64rem', fontWeight: 700, color: '#334155', background: 'rgba(71, 85, 105, 0.15)', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>
                    Filtered ✓
                  </span>
                ) : (
                  <span style={{ fontSize: '0.65rem', color: '#94A3B8' }}>Filter table ↓</span>
                )}
              </div>
            </div>

            {/* Tile 3: Submitted to Planning Division */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => handleTileClick('submitted')}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleTileClick('submitted'); }}
              title="Click to filter table by Submitted activities awaiting appraisal"
              className="card"
              style={{
                padding: '0.75rem 1rem',
                border: activeTileFilter === 'submitted' ? '2px solid #0284C7' : '1px solid #E2E8F0',
                borderLeft: '4px solid #0284C7',
                borderRadius: '10px',
                boxShadow: activeTileFilter === 'submitted' ? '0 0 0 2px rgba(2, 132, 199, 0.25), 0 4px 12px rgba(2, 132, 199, 0.12)' : '0 2px 6px rgba(0,0,0,0.03)',
                background: activeTileFilter === 'submitted' ? '#F0F9FF' : 'var(--white)',
                cursor: 'pointer',
                transition: 'all 0.18s ease-in-out',
                userSelect: 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Submitted to Planning
                </span>
                <span style={{ fontSize: '1.05rem' }}>📤</span>
              </div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0284C7', lineHeight: 1.2 }}>
                {branchStats.submittedCount} Activities
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748B', marginTop: '0.25rem' }}>
                <span title={`Exact Submitted: Rs. ${formatExactMn(branchStats.submittedCostMn)} Mn (${formatRupees(branchStats.submittedCostMn, true)})`}>Rs. {format2DecMn(branchStats.submittedCostMn)} Mn under appraisal</span>
                {activeTileFilter === 'submitted' ? (
                  <span style={{ fontSize: '0.64rem', fontWeight: 700, color: '#0369A1', background: 'rgba(2, 132, 199, 0.15)', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>
                    Filtered ✓
                  </span>
                ) : (
                  <span style={{ fontSize: '0.65rem', color: '#94A3B8' }}>Filter table ↓</span>
                )}
              </div>
            </div>

            {/* Tile 4: Accepted by Planning */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => handleTileClick('accepted')}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleTileClick('accepted'); }}
              title="Click to filter table by Accepted & Adjusted activities"
              className="card"
              style={{
                padding: '0.75rem 1rem',
                border: activeTileFilter === 'accepted' ? '2px solid #16A34A' : '1px solid #E2E8F0',
                borderLeft: '4px solid #16A34A',
                borderRadius: '10px',
                boxShadow: activeTileFilter === 'accepted' ? '0 0 0 2px rgba(22, 163, 74, 0.25), 0 4px 12px rgba(22, 163, 74, 0.12)' : '0 2px 6px rgba(0,0,0,0.03)',
                background: activeTileFilter === 'accepted' ? '#F0FDF4' : 'var(--white)',
                cursor: 'pointer',
                transition: 'all 0.18s ease-in-out',
                userSelect: 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Accepted by Planning
                </span>
                <span style={{ fontSize: '1.05rem' }}>✅</span>
              </div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#16A34A', lineHeight: 1.2 }}>
                {branchStats.acceptedCount} Activities
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748B', marginTop: '0.25rem' }}>
                <span title={`Exact Accepted: Rs. ${formatExactMn(branchStats.acceptedCostMn)} Mn (${formatRupees(branchStats.acceptedCostMn, true)})`}>Rs. {format2DecMn(branchStats.acceptedCostMn)} Mn approved</span>
                {activeTileFilter === 'accepted' ? (
                  <span style={{ fontSize: '0.64rem', fontWeight: 700, color: '#15803D', background: 'rgba(22, 163, 74, 0.15)', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>
                    Filtered ✓
                  </span>
                ) : (
                  <span style={{ fontSize: '0.65rem', color: '#94A3B8' }}>Filter table ↓</span>
                )}
              </div>
            </div>

            {/* Tile 5: Planning Feedback & Review */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => handleTileClick('rejected')}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleTileClick('rejected'); }}
              title="Click to filter table by Rejected activities requiring revision"
              className="card"
              style={{
                padding: '0.75rem 1rem',
                border: activeTileFilter === 'rejected' ? '2px solid #DC2626' : '1px solid #E2E8F0',
                borderLeft: `4px solid ${
                  branchStats.rejectedCount > 0 ? '#DC2626' : branchStats.underReviewCount > 0 ? '#D97706' : '#16A34A'
                }`,
                borderRadius: '10px',
                boxShadow: activeTileFilter === 'rejected' ? '0 0 0 2px rgba(220, 38, 38, 0.25), 0 4px 12px rgba(220, 38, 38, 0.12)' : '0 2px 6px rgba(0,0,0,0.03)',
                background: activeTileFilter === 'rejected' ? '#FEF2F2' : 'var(--white)',
                cursor: 'pointer',
                transition: 'all 0.18s ease-in-out',
                userSelect: 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Planning Feedback
                </span>
                <span style={{ fontSize: '1.05rem' }}>⚖️</span>
              </div>
              <div
                style={{
                  fontSize: '1.45rem',
                  fontWeight: 800,
                  color: branchStats.rejectedCount > 0 ? '#DC2626' : branchStats.underReviewCount > 0 ? '#D97706' : '#16A34A',
                  lineHeight: 1.2,
                }}
              >
                {branchStats.rejectedCount > 0
                  ? `${branchStats.rejectedCount} Rejected`
                  : branchStats.underReviewCount > 0
                  ? `${branchStats.underReviewCount} Under Review`
                  : 'All In Order'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748B', marginTop: '0.25rem' }}>
                <span>
                  {branchStats.rejectedCount > 0
                    ? '⚠️ Requires edit & re-submission'
                    : branchStats.adjustedCount > 0
                    ? `${branchStats.adjustedCount} cost-adjusted`
                    : 'No revision queries'}
                </span>
                {activeTileFilter === 'rejected' ? (
                  <span style={{ fontSize: '0.64rem', fontWeight: 700, color: '#B91C1C', background: 'rgba(220, 38, 38, 0.15)', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>
                    Filtered ✓
                  </span>
                ) : (
                  <span style={{ fontSize: '0.65rem', color: '#94A3B8' }}>Filter table ↓</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── WORKSPACE TABS (RESTRICTED FOR OPERATIONAL BRANCHES) ─────────── */}
        {isPlanningOfficer || isMonitoringOfficer ? (
          <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '2px solid #E2E8F0', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setActiveTab('branch-planning')}
              style={{
                padding: '0.75rem 1.25rem',
                fontWeight: 700,
                fontSize: '0.9rem',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                borderBottom: activeTab === 'branch-planning' ? '3px solid var(--primary)' : '3px solid transparent',
                color: activeTab === 'branch-planning' ? 'var(--primary)' : 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <span>🏢</span>
              <span>Branch Budgetary Planning Workspace</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('formulation')}
              style={{
                padding: '0.75rem 1.25rem',
                fontWeight: 700,
                fontSize: '0.9rem',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                borderBottom: activeTab === 'formulation' ? '3px solid var(--primary)' : '3px solid transparent',
                color: activeTab === 'formulation' ? 'var(--primary)' : 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <span>🏛️</span>
              <span>Stage 2: Ministry Formulation & Vision Desk</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('budget-speech')}
              style={{
                padding: '0.75rem 1.25rem',
                fontWeight: 700,
                fontSize: '0.9rem',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                borderBottom: activeTab === 'budget-speech' ? '3px solid var(--primary)' : '3px solid transparent',
                color: activeTab === 'budget-speech' ? 'var(--primary)' : 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <span>📜</span>
              <span>Annual Budget Speech & Estimates</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('allocations')}
              style={{
                padding: '0.75rem 1.25rem',
                fontWeight: 700,
                fontSize: '0.9rem',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                borderBottom: activeTab === 'allocations' ? '3px solid var(--primary)' : '3px solid transparent',
                color: activeTab === 'allocations' ? 'var(--primary)' : 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <span>📊</span>
              <span>Post-Appropriation 5-Stage Control</span>
            </button>
          </div>
        ) : null}

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* TAB 1: STAGE 1 - BRANCH-LEVEL BUDGETARY PLANNING WORKSPACE             */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'branch-planning' && (
          <div>
            {/* ── STREAMLINED BRANCH ACTION BAR (SIMPLE & NO REPETITIONS) ── */}
            <div
              style={{
                display: 'flex',
                justifyContent: (isPlanningOfficer || isMonitoringOfficer) ? 'space-between' : 'flex-end',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.75rem',
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '10px',
                padding: '0.5rem 1rem',
                marginBottom: '1rem',
                boxShadow: '0 2px 6px rgba(15, 23, 42, 0.03)',
              }}
            >
              {/* For Planning/Monitoring Officer: quick branch selector */}
              {(isPlanningOfficer || isMonitoringOfficer) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#00534E' }}>
                    Branch:
                  </span>
                  <select
                    className="form-input"
                    value={branchWorkspaceDivId}
                    onChange={(e) => setBranchWorkspaceDivId(e.target.value)}
                    style={{ fontSize: '0.78rem', padding: '0.25rem 0.5rem', fontWeight: 600, background: '#fff', borderRadius: '6px' }}
                  >
                    {organizations
                      .filter((o) => o.functionalCategory !== 'Monitoring')
                      .map((org) => (
                        <option key={org.id} value={org.id}>
                          [{getBranchAbbreviation(org.name, org.abbreviation)}] {org.name}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {/* Right: Primary Operational Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setShowGuidelinesModal(true)}
                  className="btn btn-secondary"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    padding: '0.35rem 0.75rem',
                    cursor: 'pointer',
                    borderRadius: '6px',
                  }}
                  title="View Budget Call Guidelines & Circular Rules"
                >
                  <span>📄</span>
                  <span>Guidelines</span>
                </button>

                <button
                  type="button"
                  onClick={openCreateModal}
                  className="btn btn-primary"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    padding: '0.35rem 0.85rem',
                    background: 'linear-gradient(135deg, #00534E 0%, #00796B 100%)',
                    borderColor: '#00534E',
                    boxShadow: '0 2px 6px rgba(0, 83, 78, 0.2)',
                    cursor: 'pointer',
                    borderRadius: '6px',
                  }}
                  id="btn-propose-new-activity"
                >
                  <span>➕</span>
                  <span>Propose Activity</span>
                </button>
              </div>
            </div>

            {/* Branch Proposals Table */}
            <div id="proposed-activities-table-card" className="card" style={{ padding: '1.25rem' }}>
              <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Proposed Activities & Estimated Budgets
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-tertiary)', marginLeft: '0.45rem' }}>
                      ({displayedBranchProposals.length}{activeTileFilter !== 'all' ? ` of ${currentBranchProposals.length}` : ''})
                    </span>
                  </h3>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {/* Filter Indicator Pill & Clear Action */}
                  {activeFilterMeta && (
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '20px',
                        background: activeFilterMeta.bg,
                        border: `1px solid ${activeFilterMeta.border}`,
                        color: activeFilterMeta.color,
                        fontSize: '0.78rem',
                        fontWeight: 700,
                      }}
                    >
                      <span>Showing: <strong>{activeFilterMeta.label}</strong> ({displayedBranchProposals.length})</span>
                      <button
                        type="button"
                        onClick={() => setActiveTileFilter('all')}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: activeFilterMeta.color,
                          fontSize: '0.85rem',
                          lineHeight: 1,
                          cursor: 'pointer',
                          padding: '0 2px',
                          display: 'inline-flex',
                          alignItems: 'center',
                        }}
                        title="Clear filter and show all activities"
                      >
                        ✕
                      </button>
                    </div>
                  )}

                  <TileActionMenu
                    tileTitle="Proposed Activities & Estimated Budgets"
                    exportData={branchProposalsExportData}
                    onRefresh={fetchBudgetData}
                    position="right"
                  />
                </div>
              </div>

              {currentBranchProposals.length === 0 ? (
                <div style={{ padding: '3rem 1rem', textAlign: 'center', color: '#888' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📝</div>
                  <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)' }}>No activities proposed yet for this branch in FY {selectedYear}.</div>
                  <div style={{ fontSize: '0.84rem', marginTop: '0.35rem', marginBottom: '1.25rem', color: 'var(--text-secondary)' }}>
                    Click below to open the popup window and draft your division&apos;s activity proposals.
                  </div>
                  <button
                    type="button"
                    onClick={openCreateModal}
                    className="btn btn-primary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', padding: '0.6rem 1.25rem', cursor: 'pointer' }}
                  >
                    <span>➕</span>
                    <span>Propose Activity</span>
                  </button>
                </div>
              ) : displayedBranchProposals.length === 0 ? (
                <div style={{ padding: '3rem 1rem', textAlign: 'center', color: '#64748B' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🔍</div>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
                    No activities found with status &ldquo;{activeFilterMeta?.label}&rdquo;
                  </div>
                  <div style={{ fontSize: '0.84rem', marginTop: '0.35rem', marginBottom: '1.25rem', color: 'var(--text-secondary)' }}>
                    There are {currentBranchProposals.length} total activities recorded for this branch in FY {selectedYear}.
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTileFilter('all')}
                    className="btn btn-secondary btn-sm"
                  >
                    Show All {currentBranchProposals.length} Activities
                  </button>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="table" style={{ width: '100%', fontSize: '0.84rem' }}>
                    <thead>
                      <tr style={{ background: '#F8F9FA' }}>
                        <th style={{ padding: '0.75rem', width: '90px', textAlign: 'center' }}>Item #</th>
                        <th style={{ padding: '0.75rem' }}>Activity & Linkage</th>
                        <th style={{ padding: '0.75rem' }}>Executing Agency</th>
                        <th style={{ padding: '0.75rem' }}>Nature & Period</th>
                        <th style={{ padding: '0.75rem' }}>Beneficiaries</th>
                        <th style={{ padding: '0.75rem' }}>Estimated Cost</th>
                        <th style={{ padding: '0.75rem' }}>Vote Status</th>
                        <th style={{ padding: '0.75rem' }}>Review Status</th>
                        <th style={{ padding: '0.75rem', textAlign: 'center' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayedBranchProposals.map((p, idx) => (
                        <tr key={p.id} style={{ borderBottom: '1px solid #EBEBEB', background: p.status === 'Rejected' ? '#FFF5F5' : undefined }}>
                          {/* Dedicated Action Item Number Column */}
                          <td style={{ padding: '0.75rem', textAlign: 'center', verticalAlign: 'top', width: '90px' }}>
                            <div style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                              #{idx + 1}
                            </div>
                            {p.activityNumber ? (
                              <span
                                style={{
                                  display: 'inline-block',
                                  marginTop: '0.35rem',
                                  padding: '0.15rem 0.45rem',
                                  borderRadius: '4px',
                                  background: '#00534E',
                                  color: '#ffffff',
                                  fontWeight: 800,
                                  fontSize: '0.68rem',
                                  whiteSpace: 'nowrap',
                                }}
                                title={`Officially assigned Activity Code: ${p.assignedActivityCode || `ACT-${String(p.activityNumber).padStart(2, '0')}`}`}
                              >
                                {p.assignedActivityCode || `ACT-${String(p.activityNumber).padStart(2, '0')}`}
                              </span>
                            ) : (
                              <span
                                style={{
                                  display: 'inline-block',
                                  marginTop: '0.35rem',
                                  padding: '0.12rem 0.4rem',
                                  borderRadius: '4px',
                                  background: '#EDF2F7',
                                  color: '#718096',
                                  fontSize: '0.65rem',
                                  fontWeight: 600,
                                  whiteSpace: 'nowrap',
                                }}
                                title="Pending PPB review and vote assignment"
                              >
                                In Queue
                              </span>
                            )}
                          </td>

                          <td style={{ padding: '0.75rem', maxWidth: '320px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.3rem', flexWrap: 'wrap' }}>
                              {p.category && (
                                <span
                                  style={{
                                    padding: '0.12rem 0.45rem',
                                    borderRadius: '4px',
                                    background: 'rgba(15, 118, 110, 0.08)',
                                    color: '#0F766E',
                                    fontSize: '0.68rem',
                                    fontWeight: 700,
                                  }}
                                >
                                  {p.category}
                                </span>
                              )}
                              {p.ppbModificationsNote && (
                                <span
                                  style={{
                                    padding: '0.12rem 0.45rem',
                                    borderRadius: '4px',
                                    background: '#FEFCBF',
                                    color: '#744210',
                                    fontSize: '0.68rem',
                                    fontWeight: 700,
                                  }}
                                  title={p.ppbModificationsNote}
                                >
                                  ✏️ Modified by PPB
                                </span>
                              )}
                            </div>

                            <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{p.activityTitle}</div>
                            
                            {/* Previous AIP Extension Badge */}
                            {p.isExtensionOfPreviousAip && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.2rem' }}>
                                <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: '4px', background: '#EBF8FF', color: '#2B6CB0', fontWeight: 700 }}>
                                  🔗 Extension of AIP {p.linkedPreviousAipActivityCode || 'Activity'}:
                                </span>
                                <span style={{ fontSize: '0.72rem', color: '#4A5568' }}>{p.linkedPreviousAipActivityTitle}</span>
                              </div>
                            )}

                            {/* Linked other activity */}
                            {p.linkedOtherActivityTitle && (
                              <div style={{ fontSize: '0.72rem', color: '#718096', marginTop: '0.15rem' }}>
                                ↳ Linked: <em>{p.linkedOtherActivityTitle}</em>
                              </div>
                            )}

                            <div style={{ fontSize: '0.74rem', color: '#666', marginTop: '0.25rem', lineHeight: 1.3 }}>
                              {p.justification || p.description}
                            </div>
                            {p.purpose && (
                              <div style={{ fontSize: '0.73rem', color: '#4A5568', marginTop: '0.2rem' }}>
                                <strong style={{ color: '#2D3748' }}>Purpose:</strong> {p.purpose}
                              </div>
                            )}
                            <div style={{ fontSize: '0.72rem', color: '#00534E', marginTop: '0.2rem', fontWeight: 600 }}>
                              Outputs: {p.expectedOutputs || 'Not specified'}
                            </div>
                            {p.keyDeliverables && (
                              <div style={{ fontSize: '0.72rem', color: '#2B6CB0', marginTop: '0.15rem' }}>
                                <strong>Deliverables:</strong> {p.keyDeliverables}
                              </div>
                            )}

                            {/* REJECTION REASON ALERT BOX */}
                            {p.status === 'Rejected' && (
                              <div
                                style={{
                                  marginTop: '0.5rem',
                                  padding: '0.5rem 0.75rem',
                                  borderRadius: '6px',
                                  background: '#FFF5F5',
                                  border: '1px solid #FEB2B2',
                                  color: '#C53030',
                                  fontSize: '0.74rem',
                                }}
                              >
                                <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                  <span>❌ Rejected by Planning Division:</span>
                                  <span>{p.rejectionReasonCategory || 'Revision Required'}</span>
                                </div>
                                <div style={{ marginTop: '0.2rem', color: '#742A2A', fontStyle: 'italic' }}>
                                  &quot;{p.rejectionRemarks || 'Please review and adjust activity specification.'}&quot;
                                </div>
                                <div style={{ marginTop: '0.35rem' }}>
                                  <button
                                    onClick={() => openEditProposalModal(p)}
                                    className="btn btn-secondary btn-sm"
                                    style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderColor: '#C53030', color: '#C53030' }}
                                  >
                                    ✏️ Edit & Resubmit Proposal
                                  </button>
                                </div>
                              </div>
                            )}
                          </td>

                          <td style={{ padding: '0.75rem' }}>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                              {p.proposedExecutingAgencyType || 'Self (Branch)'}
                            </div>
                            {p.executingAgencyName && (
                              <div style={{ fontSize: '0.72rem', color: '#718096' }}>{p.executingAgencyName}</div>
                            )}
                          </td>

                          <td style={{ padding: '0.75rem' }}>
                            <span
                              style={{
                                padding: '0.15rem 0.45rem',
                                borderRadius: '4px',
                                background: p.expenditureNature === 'Capital' ? '#EBF8FF' : '#F7FAFC',
                                color: p.expenditureNature === 'Capital' ? '#2B6CB0' : '#4A5568',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                display: 'inline-block',
                                marginBottom: '0.25rem',
                              }}
                            >
                              {p.expenditureNature || 'Recurrent'}
                            </span>
                            <div style={{ fontWeight: 600 }}>{p.implementationPeriod} ({p.implementationYear || p.financialYear})</div>
                          </td>

                          <td style={{ padding: '0.75rem' }}>
                            <div style={{ fontWeight: 600 }}>
                              {p.beneficiaryCount && Number(p.beneficiaryCount) > 0
                                ? `${Number(p.beneficiaryCount).toLocaleString()} Persons`
                                : '—'}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#888' }}>{p.targetBeneficiaries || 'Not specified'}</div>
                          </td>

                          <td style={{ padding: '0.75rem' }}>
                            {p.noBudgetRequired || Number(p.estimatedCostMn) === 0 ? (
                              <div>
                                <span
                                  style={{
                                    padding: '0.18rem 0.5rem',
                                    borderRadius: '4px',
                                    background: '#EDF2F7',
                                    color: '#4A5568',
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    display: 'inline-block',
                                  }}
                                >
                                  Zero Budget
                                </span>
                                <div style={{ fontSize: '0.7rem', color: '#718096', marginTop: '0.15rem' }}>
                                  Rs. 0.00 Mn (Internal Resources)
                                </div>
                              </div>
                            ) : (
                              <>
                                <div style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '0.92rem' }} title={`Exact: Rs. ${formatExactMn(p.estimatedCostMn)} Mn (${formatRupees(p.estimatedCostMn, true)})`}>
                                  Rs. {format2DecMn(p.estimatedCostMn)} Mn
                                </div>
                                <div style={{ fontSize: '0.68rem', color: '#64748B' }} title={`Exact: Rs. ${formatExactMn(p.estimatedCostMn)} Mn`}>
                                  Exact: Rs. {formatExactMn(p.estimatedCostMn)} Mn
                                </div>
                                {p.adjustedCostMn && p.adjustedCostMn !== p.estimatedCostMn && (
                                  <div style={{ fontSize: '0.72rem', color: '#2B6CB0', fontWeight: 600 }} title={`Exact: Rs. ${formatExactMn(p.adjustedCostMn)} Mn (${formatRupees(p.adjustedCostMn, true)})`}>
                                    Rationalized: Rs. {format2DecMn(p.adjustedCostMn)} Mn
                                  </div>
                                )}
                              </>
                            )}
                          </td>

                          <td style={{ padding: '0.75rem' }}>
                            {p.assignedVoteNumber ? (
                              <span
                                style={{
                                  padding: '0.2rem 0.5rem',
                                  borderRadius: '4px',
                                  background: '#E6FFFA',
                                  color: '#00534E',
                                  fontWeight: 700,
                                  fontSize: '0.74rem',
                                  fontFamily: 'monospace',
                                }}
                              >
                                {p.assignedVoteNumber}
                              </span>
                            ) : (
                              <span
                                style={{
                                  padding: '0.2rem 0.5rem',
                                  borderRadius: '4px',
                                  background: '#FFF5F5',
                                  color: '#C53030',
                                  fontSize: '0.72rem',
                                  fontWeight: 600,
                                }}
                              >
                                ⏳ Pending Planning Assignment
                              </span>
                            )}
                          </td>

                          <td style={{ padding: '0.75rem' }}>
                            <span
                              style={{
                                padding: '0.2rem 0.6rem',
                                borderRadius: '999px',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                background:
                                  p.isEditedFromAccepted && p.status === 'Draft'
                                    ? '#FEF3C7'
                                    : p.status === 'Accepted'
                                    ? '#E6FFFA'
                                    : p.status === 'Adjusted'
                                    ? '#EBF8FF'
                                    : p.status === 'Rejected'
                                    ? '#FFF5F5'
                                    : p.status === 'Submitted'
                                    ? '#FEFCBF'
                                    : '#EDF2F7',
                                color:
                                  p.isEditedFromAccepted && p.status === 'Draft'
                                    ? '#92400E'
                                    : p.status === 'Accepted'
                                    ? '#00534E'
                                    : p.status === 'Adjusted'
                                    ? '#2B6CB0'
                                    : p.status === 'Rejected'
                                    ? '#C53030'
                                    : p.status === 'Submitted'
                                    ? '#B7791F'
                                    : '#4A5568',
                                border:
                                  p.isEditedFromAccepted && p.status === 'Draft'
                                    ? '1px solid #F59E0B'
                                    : 'none',
                              }}
                            >
                              {p.isEditedFromAccepted && p.status === 'Draft' ? 'Draft (Revised)' : p.status}
                            </span>
                          </td>

                          <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center', alignItems: 'center' }}>
                              <button
                                onClick={() => openEditProposalModal(p)}
                                className="btn btn-secondary btn-sm"
                                style={{ fontSize: '0.74rem' }}
                                title="Edit activity within editing frame"
                              >
                                ✏️ Edit
                              </button>
                              {p.isEditedFromAccepted && p.previousAcceptedVersion && (
                                <button
                                  type="button"
                                  onClick={() => handleReverseToPreviousVersion(p.id)}
                                  className="btn btn-secondary btn-sm"
                                  style={{
                                    fontSize: '0.72rem',
                                    padding: '0.22rem 0.55rem',
                                    color: '#B45309',
                                    borderColor: '#F59E0B',
                                    background: '#FFFBEB',
                                    fontWeight: 700,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                    whiteSpace: 'nowrap',
                                  }}
                                  title={`Restore previous accepted version: "${p.previousAcceptedVersion.activityTitle}"`}
                                >
                                  <span>↩️</span>
                                  <span>Restore Previous Version</span>
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteProposal(p.id)}
                                className="btn btn-secondary btn-sm"
                                style={{ color: '#E53E3E', borderColor: '#FEB2B2', fontSize: '0.74rem' }}
                                title="Delete proposal"
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* ══════════════════════════════════════════════════════════════════ */}
              {/* STAGE 1 SUBMISSION FOOTER & PPB DEADLINE ENFORCEMENT BAR         */}
              {/* ══════════════════════════════════════════════════════════════════ */}
              <div
                style={{
                  marginTop: '1.5rem',
                  padding: '1.25rem 1.5rem',
                  borderRadius: '10px',
                  background: deadlineStatus?.isExpired
                    ? 'linear-gradient(135deg, #FFF5F5 0%, #FED7D7 100%)'
                    : 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)',
                  border: `1.5px solid ${deadlineStatus?.isExpired ? '#FEB2B2' : '#86EFAC'}`,
                  boxShadow: '0 4px 14px rgba(0,0,0,0.04)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '1.25rem',
                }}
              >
                {/* Left side: PPB Announced Deadline & Guidance */}
                <div style={{ flex: '1 1 500px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '1.35rem' }}>
                      {deadlineStatus?.isExpired ? '⚠️' : '🏛️'}
                    </span>
                    <span
                      style={{
                        fontWeight: 800,
                        fontSize: '1rem',
                        color: deadlineStatus?.isExpired ? '#9B1C1C' : '#14532D',
                        letterSpacing: '0.01em',
                      }}
                    >
                      Policy Planning Branch (PPB) Submission Deadline & Validation
                    </span>

                    {/* Deadline status badge */}
                    {deadlineStatus ? (
                      <span
                        style={{
                          fontSize: '0.74rem',
                          fontWeight: 800,
                          padding: '0.2rem 0.65rem',
                          borderRadius: '999px',
                          background: deadlineStatus.isExpired ? '#FDE8E8' : '#DEF7EC',
                          color: deadlineStatus.isExpired ? '#C81E1E' : '#03543F',
                          border: `1px solid ${deadlineStatus.isExpired ? '#F8B4B4' : '#31C48D'}`,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                        }}
                      >
                        <span>{deadlineStatus.isExpired ? '🔴 Closed' : '🟢 Open for Submission'}</span>
                        <span>
                          {deadlineStatus.isExpired
                            ? `Cutoff Passed on ${deadlineStatus.formattedDueDate}`
                            : `${deadlineStatus.daysRemaining} Day${deadlineStatus.daysRemaining === 1 ? '' : 's'} Remaining (Due: ${deadlineStatus.formattedDueDate})`}
                        </span>
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          padding: '0.2rem 0.6rem',
                          borderRadius: '999px',
                          background: '#E0F2FE',
                          color: '#0369A1',
                        }}
                      >
                        📅 Scheduled by PPB for FY {selectedYear}
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: '0.82rem', color: deadlineStatus?.isExpired ? '#7F1D1D' : '#166534', lineHeight: 1.5 }}>
                    {deadlineStatus?.isExpired ? (
                      <span>
                        The official submission window for <strong>FY {selectedYear}</strong> activity proposals announced by the <strong>Policy Planning Branch (PPB)</strong> closed on <strong>{deadlineStatus.formattedDueDate}</strong>. Submissions are locked. Contact the Director of Planning to request an administrative extension.
                      </span>
                    ) : (
                      <span>
                        All proposed activities must be finalized and formally submitted to the <strong>Policy Planning Branch (PPB)</strong> before the announced deadline (<strong>{deadlineStatus?.formattedDueDate || 'PPB Cutoff'}</strong>). Submitted activities enter Stage 2 Ministry review for official vote code assignment and cost rationalization.
                      </span>
                    )}
                  </div>

                  {/* Operational Readiness Summary */}
                  <div style={{ marginTop: '0.65rem', display: 'flex', gap: '1.25rem', fontSize: '0.78rem', fontWeight: 600, color: '#374151', flexWrap: 'wrap' }}>
                    <span style={{ color: '#92400E', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>📝</span>
                      <span>Ready to Submit: <strong>{branchStats.draftsCount} Draft Activit{branchStats.draftsCount === 1 ? 'y' : 'ies'}</strong> ({formatRupees(branchStats.draftsCostMn, true)})</span>
                    </span>
                    <span style={{ color: '#0369A1', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>📤</span>
                      <span>Already Submitted: <strong>{branchStats.submittedCount}</strong></span>
                    </span>
                    <span style={{ color: '#065F46', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>✅</span>
                      <span>Accepted by PPB: <strong>{branchStats.acceptedCount}</strong></span>
                    </span>
                  </div>
                </div>

                {/* Right side: Action Submit Button */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem', flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={handleSubmitBranchPlan}
                    disabled={deadlineStatus?.isExpired || branchStats.draftsCount === 0}
                    className="btn btn-primary"
                    style={{
                      padding: '0.75rem 1.6rem',
                      fontSize: '0.92rem',
                      fontWeight: 800,
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.6rem',
                      boxShadow: deadlineStatus?.isExpired || branchStats.draftsCount === 0
                        ? 'none'
                        : '0 4px 14px rgba(0, 83, 78, 0.28)',
                      background: deadlineStatus?.isExpired
                        ? '#9CA3AF'
                        : branchStats.draftsCount === 0
                        ? '#10B981'
                        : '#00534E',
                      borderColor: deadlineStatus?.isExpired
                        ? '#9CA3AF'
                        : branchStats.draftsCount === 0
                        ? '#10B981'
                        : '#00534E',
                      color: '#FFFFFF',
                      cursor: deadlineStatus?.isExpired || branchStats.draftsCount === 0 ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                    title={
                      deadlineStatus?.isExpired
                        ? `Cannot submit: Deadline announced by PPB expired on ${deadlineStatus.formattedDueDate}`
                        : branchStats.draftsCount === 0
                        ? 'All proposed activities for this branch are already submitted or accepted by PPB'
                        : `Submit ${branchStats.draftsCount} draft activity proposals to Policy Planning Branch`
                    }
                  >
                    <span style={{ fontSize: '1.2rem' }}>
                      {deadlineStatus?.isExpired ? '🔒' : branchStats.draftsCount === 0 ? '✅' : '🚀'}
                    </span>
                    <span>
                      {deadlineStatus?.isExpired
                        ? 'Submissions Closed (Deadline Expired)'
                        : branchStats.draftsCount === 0
                        ? 'All Proposals Submitted to PPB'
                        : `Submit Proposed Activities to PPB (${branchStats.draftsCount})`}
                    </span>
                  </button>

                  <div style={{ fontSize: '0.7rem', color: '#6B7280', textAlign: 'right' }}>
                    {deadlineStatus?.isExpired
                      ? 'Locked by PPB system deadline policy'
                      : branchStats.draftsCount === 0
                      ? 'No pending draft items requiring submission'
                      : `Applies to all ${branchStats.draftsCount} draft proposals for ${currentBranchName}`}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* TAB 2: STAGE 2 - MINISTRY BUDGET FORMULATION & VISION DESK            */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'formulation' && (isPlanningOfficer || isMonitoringOfficer) && (
          <div>
            {/* Planning Division Policy Notice */}
            <div
              style={{
                padding: '1rem 1.25rem',
                borderRadius: '8px',
                background: '#FFF5F5',
                border: '1px solid #FED7D7',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.5rem' }}>🏛️</span>
                <div>
                  <div style={{ fontWeight: 700, color: '#8D153A', fontSize: '0.92rem' }}>
                    Stage 2: Ministry-Level Budget Formulation & Policy Consolidation Desk
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#742A2A', marginTop: '0.15rem' }}>
                    Planning Division reviews branch proposals: <strong>Approve</strong>, <strong>Edit/Adjust Cost</strong>, or <strong>Reject with reason</strong>. Injects <strong>Government Vision initiatives</strong> and assigns <strong>official Vote Numbers & Object Codes</strong>.
                  </div>
                </div>
              </div>

              {isPlanningOfficer && (
                <button
                  onClick={() => setShowVisionModal(true)}
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.84rem' }}
                >
                  <span>🌟</span>
                  <span>Add Government Vision Initiative</span>
                </button>
              )}
            </div>

            {/* Filter Controls */}
            <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#666' }}>Division:</label>
                  <SearchableSelect
                    className="form-input"
                    value={selectedDivisionFilter}
                    onChange={(e) => setSelectedDivisionFilter(e.target.value)}
                    style={{ fontSize: '0.82rem', minWidth: '220px' }}
                    placeholder="Search division..."
                  >
                    <option value="all">All Divisions & Apex Units</option>
                    {organizations.map((o) => (
                      <option key={o.id} value={o.id}>
                        [{getBranchAbbreviation(o.name, o.abbreviation)}] {o.name}
                      </option>
                    ))}
                  </SearchableSelect>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#666' }}>Review Status:</label>
                  <SearchableSelect
                    className="form-input"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    style={{ fontSize: '0.82rem', minWidth: '180px' }}
                  >
                    <option value="all">All Statuses</option>
                    <option value="Submitted">Submitted (Pending Review)</option>
                    <option value="Under Review">Under Review</option>
                    <option value="Accepted">Accepted / Approved</option>
                    <option value="Adjusted">Adjusted</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Draft">Draft (Branch Editing)</option>
                  </SearchableSelect>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#666' }}>Priority Theme:</label>
                  <SearchableSelect
                    className="form-input"
                    value={themeFilter}
                    onChange={(e) => setThemeFilter(e.target.value)}
                    style={{ fontSize: '0.82rem', minWidth: '200px' }}
                  >
                    <option value="all">All National Themes</option>
                    <option value="Digital Education & STEM">Digital Education & STEM</option>
                    <option value="Educational Curriculum Reforms">Educational Curriculum Reforms</option>
                    <option value="Health, Nutrition & Welfare">Health, Nutrition & Welfare</option>
                    <option value="General Education Development">General Education Development</option>
                  </SearchableSelect>
                </div>

                <div style={{ marginLeft: 'auto', fontSize: '0.8rem', color: '#666' }}>
                  Showing <strong>{filteredFormulationProposals.length}</strong> of {proposals.length} requirements
                </div>
              </div>
            </div>

            {/* Consolidated Formulation Table */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Consolidated Budget Formulation Matrix ({filteredFormulationProposals.length} requirements)
                </h3>
                <TileActionMenu
                  tileTitle="Consolidated Budget Formulation Matrix"
                  exportData={formulationExportData}
                  onRefresh={fetchBudgetData}
                  position="right"
                />
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="table" style={{ width: '100%', fontSize: '0.84rem' }}>
                  <thead>
                    <tr style={{ background: '#F8F9FA' }}>
                      <th style={{ padding: '0.75rem' }}>Initiative Origin & Title</th>
                      <th style={{ padding: '0.75rem' }}>Originating Division</th>
                      <th style={{ padding: '0.75rem' }}>Executing Agency</th>
                      <th style={{ padding: '0.75rem' }}>Proposed Demand</th>
                      <th style={{ padding: '0.75rem' }}>Rationalized Cost</th>
                      <th style={{ padding: '0.75rem' }}>Assigned Vote Number</th>
                      <th style={{ padding: '0.75rem' }}>Review Status</th>
                      <th style={{ padding: '0.75rem', textAlign: 'center' }}>Appraisal Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFormulationProposals.map((p) => (
                      <tr key={p.id} style={{ borderBottom: '1px solid #EBEBEB', background: p.status === 'Rejected' ? '#FFF5F5' : undefined }}>
                        <td style={{ padding: '0.75rem', maxWidth: '300px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                            {p.isStrategicVisionAddition ? (
                              <span
                                style={{
                                  padding: '0.15rem 0.45rem',
                                  borderRadius: '4px',
                                  background: '#8D153A',
                                  color: '#fff',
                                  fontSize: '0.68rem',
                                  fontWeight: 800,
                                }}
                              >
                                🌟 Government Vision
                              </span>
                            ) : (
                              <span
                                style={{
                                  padding: '0.15rem 0.45rem',
                                  borderRadius: '4px',
                                  background: '#EDF2F7',
                                  color: '#4A5568',
                                  fontSize: '0.68rem',
                                  fontWeight: 600,
                                }}
                              >
                                📥 Branch Request
                              </span>
                            )}
                            <span style={{ fontSize: '0.7rem', color: '#888' }}>{p.implementationPeriod}</span>
                            <span style={{ fontSize: '0.68rem', padding: '0.1rem 0.35rem', borderRadius: '4px', background: '#F7FAFC', color: '#4A5568', fontWeight: 600 }}>
                              {p.expenditureNature || 'Recurrent'}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.25rem', marginTop: '0.2rem', flexWrap: 'wrap' }}>
                            {p.activityNumber ? (
                              <span
                                style={{
                                  padding: '0.12rem 0.45rem',
                                  borderRadius: '4px',
                                  background: '#00534E',
                                  color: '#fff',
                                  fontWeight: 800,
                                  fontSize: '0.7rem',
                                }}
                              >
                                Act #{p.activityNumber} ({p.assignedActivityCode || `ACT-${String(p.activityNumber).padStart(2, '0')}`})
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.68rem', color: '#718096', background: '#EDF2F7', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>
                                Unassigned
                              </span>
                            )}
                            {p.ppbModificationsNote && (
                              <span style={{ fontSize: '0.68rem', color: '#744210', background: '#FEFCBF', padding: '0.1rem 0.35rem', borderRadius: '4px', fontWeight: 700 }}>
                                ✏️ Modified by PPB
                              </span>
                            )}
                          </div>

                          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{p.activityTitle}</div>

                          {p.isExtensionOfPreviousAip && (
                            <div style={{ fontSize: '0.72rem', color: '#2B6CB0', marginTop: '0.15rem' }}>
                              🔗 Continuation of AIP: <strong>{p.linkedPreviousAipActivityCode}</strong>
                            </div>
                          )}

                          {p.status === 'Rejected' && (
                            <div style={{ fontSize: '0.72rem', color: '#C53030', marginTop: '0.25rem', fontWeight: 700 }}>
                              ⚠️ Rejection Reason: {p.rejectionReasonCategory}
                              <div style={{ fontWeight: 400, fontStyle: 'italic', color: '#742A2A' }}>&quot;{p.rejectionRemarks}&quot;</div>
                            </div>
                          )}
                        </td>

                        <td style={{ padding: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                          <BranchBadge name={p.divisionName} size="xs" />
                        </td>

                        <td style={{ padding: '0.75rem', fontSize: '0.8rem' }}>
                          <div style={{ fontWeight: 600 }}>{p.proposedExecutingAgencyType || 'Self (Branch)'}</div>
                          {p.executingAgencyName && (
                            <div style={{ fontSize: '0.72rem', color: '#888' }}>{p.executingAgencyName}</div>
                          )}
                        </td>

                        <td style={{ padding: '0.75rem', fontWeight: 700, color: '#666' }} title={`Exact: Rs. ${formatExactMn(p.estimatedCostMn)} Mn (${formatRupees(p.estimatedCostMn, true)})`}>
                          {p.noBudgetRequired || Number(p.estimatedCostMn) === 0 ? (
                            <span style={{ fontSize: '0.75rem', color: '#718096' }}>Rs. 0.00 Mn (Zero-Cost)</span>
                          ) : (
                            <div>
                              <div>Rs. {format2DecMn(p.estimatedCostMn)} Mn</div>
                              <div style={{ fontSize: '0.68rem', color: '#64748B' }}>Exact: Rs. {formatExactMn(p.estimatedCostMn)} Mn</div>
                            </div>
                          )}
                        </td>

                        <td style={{ padding: '0.75rem' }} title={p.status !== 'Rejected' ? `Exact: Rs. ${formatExactMn(p.adjustedCostMn ?? p.estimatedCostMn)} Mn (${formatRupees(p.adjustedCostMn ?? p.estimatedCostMn, true)})` : ''}>
                          {p.status === 'Rejected' ? (
                            <span style={{ color: '#C53030', fontWeight: 700 }}>Rs. 0.00 Mn (Rejected)</span>
                          ) : (
                            <div>
                              <div style={{ fontWeight: 800, color: '#00534E', fontSize: '0.92rem' }}>
                                Rs. {format2DecMn(p.adjustedCostMn ?? p.estimatedCostMn)} Mn
                              </div>
                              <div style={{ fontSize: '0.68rem', color: '#64748B' }}>
                                Exact: Rs. {formatExactMn(p.adjustedCostMn ?? p.estimatedCostMn)} Mn
                              </div>
                            </div>
                          )}
                        </td>

                        <td style={{ padding: '0.75rem' }}>
                          {p.assignedVoteNumber ? (
                            <div>
                              <div style={{ fontFamily: 'monospace', fontWeight: 700, color: '#00534E', fontSize: '0.8rem' }}>
                                {p.assignedVoteNumber}
                              </div>
                              <div style={{ fontSize: '0.7rem', color: '#888' }}>
                                Code: <strong>{p.assignedObjectCode || '2502'}</strong>
                              </div>
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.72rem', color: p.status === 'Rejected' ? '#A0AEC0' : '#C53030', fontWeight: 600 }}>
                              {p.status === 'Rejected' ? '—' : '⚠️ Unclassified'}
                            </span>
                          )}
                        </td>

                        <td style={{ padding: '0.75rem' }}>
                          <span
                            style={{
                              padding: '0.2rem 0.6rem',
                              borderRadius: '999px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              background:
                                p.status === 'Accepted'
                                  ? '#E6FFFA'
                                  : p.status === 'Adjusted'
                                  ? '#EBF8FF'
                                  : p.status === 'Rejected'
                                  ? '#FFF5F5'
                                  : p.status === 'Submitted'
                                  ? '#FEFCBF'
                                  : '#EDF2F7',
                              color:
                                p.status === 'Accepted'
                                  ? '#00534E'
                                  : p.status === 'Adjusted'
                                  ? '#2B6CB0'
                                  : p.status === 'Rejected'
                                  ? '#C53030'
                                  : p.status === 'Submitted'
                                  ? '#B7791F'
                                  : '#4A5568',
                            }}
                          >
                            {p.status}
                          </span>
                        </td>

                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                          {isPlanningOfficer ? (
                            <button
                              onClick={() => openReviewModal(p)}
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: '0.76rem', fontWeight: 600 }}
                            >
                              ⚙️ Appraise & Classify
                            </button>
                          ) : (
                            <span style={{ fontSize: '0.74rem', color: '#888' }}>View Only</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* TAB 3: ANNUAL BUDGET SPEECH & CONSOLIDATED ESTIMATES (OUTPUTS)         */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'budget-speech' && (isPlanningOfficer || isMonitoringOfficer) && (
          <div>
            <div
              style={{
                padding: '1.25rem',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #00534E 0%, #003632 100%)',
                color: '#fff',
                marginBottom: '1.5rem',
              }}
            >
              <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.85, fontWeight: 700 }}>
                Ministry of Education • Democratic Socialist Republic of Sri Lanka
              </div>
              <h2 style={{ margin: '0.4rem 0 0.2rem 0', fontSize: '1.4rem', fontWeight: 800 }}>
                Annual Budget Speech Key Priority Proposals (FY {selectedYear})
              </h2>
              <p style={{ margin: 0, fontSize: '0.84rem', opacity: 0.9 }}>
                Consolidated submission package for the Ministry of Finance and General Treasury Department of National Budget.
              </p>
            </div>

            {/* Speech Priority Highlights */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
              {proposals
                .filter((p) => p.includedInBudgetSpeech && p.status !== 'Rejected')
                .map((sp) => (
                  <div
                    key={sp.id}
                    className="card"
                    style={{
                      padding: '1.25rem',
                      borderLeft: sp.isStrategicVisionAddition ? '4px solid #8D153A' : '4px solid #00534E',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '0.15rem 0.5rem',
                          borderRadius: '4px',
                          background: sp.isStrategicVisionAddition ? '#8D153A' : '#00534E',
                          color: '#fff',
                        }}
                      >
                        {sp.isStrategicVisionAddition ? 'Government Vision Priority' : 'Strategic Educational Initiative'}
                      </span>
                      <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1rem' }} title={`Exact: ${formatRupees(sp.adjustedCostMn ?? sp.estimatedCostMn, true)}`}>
                        Rs. {formatMillion(sp.adjustedCostMn ?? sp.estimatedCostMn)} Mn
                      </span>
                    </div>

                    <h4 style={{ margin: '0.25rem 0 0.5rem 0', fontSize: '0.96rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {sp.activityTitle}
                    </h4>

                    <p style={{ fontSize: '0.82rem', color: '#4A5568', lineHeight: 1.4, margin: '0 0 0.75rem 0' }}>
                      {sp.budgetSpeechSummary || sp.justification}
                    </p>

                    <div style={{ fontSize: '0.74rem', color: '#718096', borderTop: '1px solid #EDF2F7', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Vote: <strong>{sp.assignedVoteNumber || '126-02-03-2502'}</strong></span>
                      <span>Fund: <strong>{sp.assignedFundingSource || 'Treasury'}</strong></span>
                      <span>Beneficiaries: <strong>{sp.beneficiaryCount?.toLocaleString()}</strong></span>
                    </div>
                  </div>
                ))}
            </div>

            {/* Thematic Summary */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.05rem', fontWeight: 800 }}>
                Thematic Consolidation by National Educational Priority Head
              </h3>

              <div style={{ overflowX: 'auto' }}>
                <table className="table" style={{ width: '100%', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: '#F8F9FA' }}>
                      <th style={{ padding: '0.75rem' }}>Thematic Focus Area</th>
                      <th style={{ padding: '0.75rem' }}>Branch Requests</th>
                      <th style={{ padding: '0.75rem' }}>Bottom-Up Demand (Mn)</th>
                      <th style={{ padding: '0.75rem' }}>Government Vision (Mn)</th>
                      <th style={{ padding: '0.75rem' }}>Total Proposed Allocation (Mn)</th>
                      <th style={{ padding: '0.75rem' }}>Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      'Digital Education & STEM',
                      'Educational Curriculum Reforms',
                      'Health, Nutrition & Welfare',
                      'General Education Development',
                    ].map((theme) => {
                      const themeItems = proposals.filter((p) => (p.governmentPriorityTheme === theme || (!p.governmentPriorityTheme && theme === 'General Education Development')) && p.status !== 'Rejected');
                      const branchItems = themeItems.filter((p) => !p.isStrategicVisionAddition);
                      const visionItems = themeItems.filter((p) => p.isStrategicVisionAddition);

                      const branchCost = branchItems.reduce((s, p) => s + (Number(p.estimatedCostMn) || 0), 0);
                      const visionCost = visionItems.reduce((s, p) => s + (Number(p.estimatedCostMn) || 0), 0);
                      const totalThemeCost = branchCost + visionCost;
                      const totalAll = proposalSummary?.totalDemandMn || 1;
                      const pct = Math.round((totalThemeCost / totalAll) * 100);

                      return (
                        <tr key={theme} style={{ borderBottom: '1px solid #EBEBEB' }}>
                          <td style={{ padding: '0.75rem', fontWeight: 700, color: '#00534E' }}>{theme}</td>
                          <td style={{ padding: '0.75rem' }}>{branchItems.length} activities</td>
                          <td style={{ padding: '0.75rem' }} title={`Exact: Rs. ${formatExactMn(branchCost)} Mn (${formatRupees(branchCost, true)})`}>
                            <div>Rs. {format2DecMn(branchCost)} Mn</div>
                            <div style={{ fontSize: '0.68rem', color: '#64748B' }}>Exact: Rs. {formatExactMn(branchCost)} Mn</div>
                          </td>
                          <td style={{ padding: '0.75rem', fontWeight: 600, color: '#8D153A' }} title={`Exact: Rs. ${formatExactMn(visionCost)} Mn (${formatRupees(visionCost, true)})`}>
                            <div>Rs. {format2DecMn(visionCost)} Mn</div>
                            <div style={{ fontSize: '0.68rem', color: '#64748B' }}>Exact: Rs. {formatExactMn(visionCost)} Mn</div>
                          </td>
                          <td style={{ padding: '0.75rem', fontWeight: 800, color: 'var(--primary)' }} title={`Exact: Rs. ${formatExactMn(totalThemeCost)} Mn (${formatRupees(totalThemeCost, true)})`}>
                            <div>Rs. {format2DecMn(totalThemeCost)} Mn</div>
                            <div style={{ fontSize: '0.68rem', color: '#64748B' }}>Exact: Rs. {formatExactMn(totalThemeCost)} Mn</div>
                          </td>
                          <td style={{ padding: '0.75rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <div style={{ width: '80px', height: '8px', background: '#EDF2F7', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{ width: `${pct}%`, height: '100%', background: 'var(--primary)' }} />
                              </div>
                              <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>{pct}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* TAB 4: POST-APPROPRIATION 5-STAGE CONTROL & ALLOCATIONS (LEGACY)      */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'allocations' && (isPlanningOfficer || isMonitoringOfficer) && (
          <div>
            <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#1A1A1A' }}>
                    Post-Appropriation 5-Stage Financial Control Engine (BR-009)
                  </h3>
                  <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: '#666' }}>
                    Once Parliament passes the Appropriation Act, Treasury releases formal budget ceilings and Object Code allocations.
                  </p>
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table className="table" style={{ width: '100%', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: '#F5F5F5' }}>
                      <th style={{ padding: '0.75rem' }}>Division / Unit</th>
                      <th style={{ padding: '0.75rem' }}>Activity Title</th>
                      <th style={{ padding: '0.75rem' }}>Obj. Code</th>
                      <th style={{ padding: '0.75rem' }}>Funding Source</th>
                      <th style={{ padding: '0.75rem' }}>Allocated (Mn)</th>
                      <th style={{ padding: '0.75rem' }}>Commitments (Mn)</th>
                      <th style={{ padding: '0.75rem' }}>Expenditure (Mn)</th>
                      <th style={{ padding: '0.75rem' }}>Paid (Mn)</th>
                      <th style={{ padding: '0.75rem' }}>Balance (Mn)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allocations.map((a) => (
                      <tr key={a.id} style={{ borderBottom: '1px solid #EBEBEB' }}>
                        <td style={{ padding: '0.75rem', fontWeight: 700, color: '#00534E' }}>
                          <BranchBadge name={a.divisionName} size="xs" />
                        </td>
                        <td style={{ padding: '0.75rem', maxWidth: '240px' }}>
                          <div style={{ fontWeight: 600 }}>{a.activityName}</div>
                          <span style={{ fontSize: '0.72rem', color: '#888' }}>Version: v{a.version} ({a.status})</span>
                        </td>
                        <td style={{ padding: '0.75rem', fontWeight: 600 }}>{a.objectCode}</td>
                        <td style={{ padding: '0.75rem', fontSize: '0.8rem' }}>{a.fundingSource?.slice(0, 30)}...</td>
                        <td style={{ padding: '0.75rem', fontWeight: 700 }} title={`Exact: ${formatRupees(a.allocationAmount, true)}`}>Rs. {formatMillion(a.allocationAmount)}</td>
                        <td style={{ padding: '0.75rem', color: '#8D153A' }} title={`Exact: ${formatRupees(a.commitmentAmount, true)}`}>Rs. {formatMillion(a.commitmentAmount)}</td>
                        <td style={{ padding: '0.75rem', fontWeight: 600, color: '#00534E' }} title={`Exact: ${formatRupees(a.expenditureAmount, true)}`}>
                          Rs. {formatMillion(a.expenditureAmount)}
                        </td>
                        <td style={{ padding: '0.75rem' }} title={`Exact: ${formatRupees(a.paymentAmount, true)}`}>Rs. {formatMillion(a.paymentAmount)}</td>
                        <td style={{ padding: '0.75rem', fontWeight: 700, color: '#2E7D32' }} title={`Exact: ${formatRupees(a.balanceAmount, true)}`}>
                          Rs. {formatMillion(a.balanceAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* POPUP WINDOW: STAGE 1 - PROPOSE / EDIT NEW BRANCH ACTIVITY            */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        {showProposalModal && (
          <div
            className="modal-overlay modal-backdrop"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.55)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: '1rem',
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowProposalModal(false);
            }}
          >
            <div
              className="modal-content modal"
              style={{
                maxWidth: '780px',
                width: '100%',
                maxHeight: '92vh',
                overflowY: 'auto',
                background: '#ffffff',
                borderRadius: '12px',
                padding: '1.75rem',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '0.75rem' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--primary)' }}>
                    {isEditingProposal ? '✏️ Edit Activity' : 'Propose Activity'}
                  </h3>
                  <div style={{ fontSize: '0.75rem', color: '#718096', marginTop: '0.15rem' }}>
                    Activity-Based Proposal Window (AIP Format) • <strong>Government Vote numbers are not required at this stage.</strong>
                  </div>
                </div>
                <button onClick={() => setShowProposalModal(false)} style={{ border: 'none', background: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveProposal}>
                {/* 1. Year of Implementation & Expenditure Nature */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Proposed Year of Implementation *</label>
                    <select
                      className="form-input"
                      value={proposalForm.implementationYear}
                      onChange={(e) => setProposalForm({ ...proposalForm, implementationYear: e.target.value })}
                      required
                    >
                      <option value="2027">2027</option>
                      <option value="2028">2028</option>
                      <option value="2026">2026</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Expenditure Nature *</label>
                    <SearchableSelect
                      className="form-input"
                      value={proposalForm.expenditureNature}
                      onChange={(e) => setProposalForm({ ...proposalForm, expenditureNature: e.target.value as any })}
                      required
                    >
                      <option value="Recurrent">Recurrent Activity</option>
                      <option value="Capital">Capital Activity</option>
                    </SearchableSelect>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Target Implementation Period *</label>
                    <SearchableSelect
                      className="form-input"
                      value={proposalForm.implementationPeriod}
                      onChange={(e) => setProposalForm({ ...proposalForm, implementationPeriod: e.target.value })}
                      required
                    >
                      <option value="Q1">Quarter 1 (Jan – Mar)</option>
                      <option value="Q2">Quarter 2 (Apr – Jun)</option>
                      <option value="Q3">Quarter 3 (Jul – Sep)</option>
                      <option value="Q4">Quarter 4 (Oct – Dec)</option>
                      <option value="Annual">Annual Continuous Cycle</option>
                    </SearchableSelect>
                  </div>
                </div>

                {/* 2. Activity Title */}
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Activity Title *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={proposalForm.activityTitle}
                    onChange={(e) => setProposalForm({ ...proposalForm, activityTitle: e.target.value })}
                    placeholder="e.g. National Teacher Training on Digital Pedagogy & STEM"
                    required
                  />
                </div>

                {/* 3. Category & Executing Agency */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Activity Category *</label>
                    <SearchableSelect
                      className="form-input"
                      value={proposalForm.category}
                      onChange={(e) => setProposalForm({ ...proposalForm, category: e.target.value })}
                    >
                      <option value="Workshop & Training">Workshop & Teacher Training</option>
                      <option value="Curriculum Development">Curriculum Development</option>
                      <option value="Infrastructure & ICT">Infrastructure & ICT Lab Equipment</option>
                      <option value="Student Programme">Student Programme & Competitions</option>
                      <option value="Monitoring & Evaluation">Monitoring & Evaluation</option>
                      <option value="Other">Other (Please specify)</option>
                    </SearchableSelect>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Proposed Executing Agency *</label>
                    <SearchableSelect
                      className="form-input"
                      value={proposalForm.proposedExecutingAgencyType}
                      onChange={(e) => setProposalForm({ ...proposalForm, proposedExecutingAgencyType: e.target.value })}
                      required
                    >
                      <option value="Self (Branch)">Self (Originating Branch / Division)</option>
                      <option value="Level 1 – Ministry Department">Level 1 – Other Ministry Department / Unit</option>
                      <option value="Level 2 – National Apex (NIE/EPD/DoE)">Level 2 – National Apex (NIE / EPD / DoE)</option>
                      <option value="Level 3 – Provincial Education Department">Level 3 – Provincial Education Department</option>
                      <option value="Level 4 – Zonal Education Office">Level 4 – Zonal Education Office</option>
                      <option value="Level 5 – Divisional Education Office">Level 5 – Divisional Education Office</option>
                      <option value="Level 6 – School / Implementing Unit">Level 6 – School / Implementing Institution</option>
                      <option value="Other Agency">Other Collaborative Public Agency</option>
                    </SearchableSelect>
                  </div>
                </div>

                {/* Other Category Specification Input (if Category is 'Other') */}
                {proposalForm.category === 'Other' && (
                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label className="form-label">Please Specify Category *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={proposalForm.categoryDetail || ''}
                      onChange={(e) => setProposalForm({ ...proposalForm, categoryDetail: e.target.value })}
                      placeholder="Type custom operational activity category..."
                      required
                    />
                  </div>
                )}

                {/* Agency Name Details (if non-self) */}
                {proposalForm.proposedExecutingAgencyType !== 'Self (Branch)' && (
                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label className="form-label">Executing Agency Details / Target Locations</label>
                    <input
                      type="text"
                      className="form-input"
                      value={proposalForm.executingAgencyName}
                      onChange={(e) => setProposalForm({ ...proposalForm, executingAgencyName: e.target.value })}
                      placeholder="e.g. Southern Provincial Education Department & Galle Zonal Office"
                    />
                  </div>
                )}

                {/* 4. EXTENSION OF PREVIOUS AIP ACTIVITIES (AIP LINKAGE) */}
                <div style={{ padding: '0.85rem 1rem', background: '#F8F9FA', borderRadius: '8px', border: '1px solid #E2E8F0', marginBottom: '1rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: '#2B6CB0', fontSize: '0.85rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={proposalForm.isExtensionOfPreviousAip}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setProposalForm({
                          ...proposalForm,
                          isExtensionOfPreviousAip: checked,
                          linkedPreviousAipActivityCode: checked ? (availablePreviousAipActivities[0]?.code || '') : '',
                          linkedPreviousAipActivityTitle: checked ? (availablePreviousAipActivities[0]?.title || '') : '',
                        });
                      }}
                    />
                    <span>🔗 Is this activity an extension or continuation of a previous AIP activity?</span>
                  </label>

                  {proposalForm.isExtensionOfPreviousAip && (
                    <div style={{ marginTop: '0.65rem' }}>
                      <label style={{ fontSize: '0.76rem', fontWeight: 600, color: '#4A5568', display: 'block', marginBottom: '0.25rem' }}>
                        Select Previous AIP Activity to Extend:
                      </label>
                      <select
                        className="form-input"
                        value={proposalForm.linkedPreviousAipActivityCode}
                        onChange={(e) => {
                          const code = e.target.value;
                          const selected = availablePreviousAipActivities.find((a) => a.code === code);
                          setProposalForm({
                            ...proposalForm,
                            linkedPreviousAipActivityCode: code,
                            linkedPreviousAipActivityTitle: selected?.title || '',
                          });
                        }}
                        style={{ fontSize: '0.82rem' }}
                      >
                        {availablePreviousAipActivities.map((act) => (
                          <option key={act.code} value={act.code}>
                            [{act.code}] {act.title} (AIP {act.year})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* 5. Linking with any other activity (if any) */}
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Linking with Any Other Activity (Optional)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={proposalForm.linkedOtherActivityTitle}
                    onChange={(e) => setProposalForm({ ...proposalForm, linkedOtherActivityTitle: e.target.value })}
                    placeholder="e.g. Coordinated with Secondary School Smart Classroom Hardware Setup"
                  />
                </div>

                {/* 6. Purpose */}
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Purpose *</label>
                  <textarea
                    className="form-input"
                    rows={2}
                    value={proposalForm.purpose}
                    onChange={(e) => setProposalForm({ ...proposalForm, purpose: e.target.value })}
                    placeholder="State the core objective, intention, and target change expected from this activity..."
                    required
                  />
                </div>

                {/* 7. Justification */}
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Justification *</label>
                  <textarea
                    className="form-input"
                    rows={2}
                    value={proposalForm.justification}
                    onChange={(e) => setProposalForm({ ...proposalForm, justification: e.target.value })}
                    placeholder="Why is this activity necessary? Which national policy, ministry objective, or syllabus requirement does it address?"
                    required
                  />
                </div>

                {/* 8. Expected Output & Key Deliverables (Split into two) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Expected Output *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={proposalForm.expectedOutputs}
                      onChange={(e) => setProposalForm({ ...proposalForm, expectedOutputs: e.target.value })}
                      placeholder="e.g. 500 teachers certified across 9 provinces"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Key Deliverables *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={proposalForm.keyDeliverables}
                      onChange={(e) => setProposalForm({ ...proposalForm, keyDeliverables: e.target.value })}
                      placeholder="e.g. 9 training manuals, LMS digital modules, evaluation report"
                      required
                    />
                  </div>
                </div>

                {/* 9. Beneficiaries & Cost (with Zero-Budget Tickbox) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 0.8fr 1.2fr', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div className="form-group">
                    <label className="form-label">Target Beneficiaries</label>
                    <input
                      type="text"
                      className="form-input"
                      value={proposalForm.targetBeneficiaries}
                      onChange={(e) => setProposalForm({ ...proposalForm, targetBeneficiaries: e.target.value })}
                      placeholder="e.g. G.C.E. O/L Math Teachers"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Beneficiary Count</label>
                    <input
                      type="number"
                      className="form-input"
                      value={proposalForm.beneficiaryCount ?? ''}
                      onChange={(e) =>
                        setProposalForm({
                          ...proposalForm,
                          beneficiaryCount: e.target.value === '' ? ('' as any) : Number(e.target.value),
                        })
                      }
                      placeholder="e.g. 50"
                      min="0"
                    />
                  </div>

                  <div className="form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <label className="form-label" style={{ margin: 0 }}>
                        Estimated Cost (Rs. Mn) {proposalForm.noBudgetRequired ? '(Zero Cost)' : '*'}
                      </label>
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.74rem', color: '#2B6CB0', cursor: 'pointer', fontWeight: 600 }}>
                        <input
                          type="checkbox"
                          checked={proposalForm.noBudgetRequired}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setProposalForm({
                              ...proposalForm,
                              noBudgetRequired: checked,
                              estimatedCostMn: checked ? (0 as any) : (proposalForm.estimatedCostMn === 0 ? ('' as any) : proposalForm.estimatedCostMn),
                            });
                          }}
                        />
                        <span>No budget required</span>
                      </label>
                    </div>
                    <input
                      type="number"
                      step="0.000001"
                      className="form-input"
                      value={proposalForm.noBudgetRequired ? 0 : (proposalForm.estimatedCostMn ?? '')}
                      onChange={(e) =>
                        setProposalForm({
                          ...proposalForm,
                          estimatedCostMn: e.target.value === '' ? ('' as any) : e.target.value,
                        })
                      }
                      placeholder="e.g. 2.500000"
                      min="0"
                      disabled={proposalForm.noBudgetRequired}
                      required={!proposalForm.noBudgetRequired}
                      style={{ background: proposalForm.noBudgetRequired ? '#F7FAFC' : '#fff' }}
                    />
                    {!proposalForm.noBudgetRequired && proposalForm.estimatedCostMn !== ('' as any) && proposalForm.estimatedCostMn !== undefined && (
                      <div style={{ fontSize: '0.72rem', color: '#00534E', fontWeight: 600, marginTop: '0.25rem' }}>
                        Exact: {formatRupees(proposalForm.estimatedCostMn, true)} (6 decimal points: {formatMillion(proposalForm.estimatedCostMn)} Mn)
                      </div>
                    )}
                    {proposalForm.noBudgetRequired && (
                      <div style={{ fontSize: '0.72rem', color: '#2C5282', marginTop: '0.25rem' }}>
                        ✓ Zero budget required (Activity utilizes existing division staff & internal resources).
                      </div>
                    )}
                  </div>
                </div>

                <div
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: '6px',
                    background: '#EDF2F7',
                    fontSize: '0.78rem',
                    color: '#4A5568',
                    marginBottom: '1.25rem',
                  }}
                >
                  🔒 <strong>Accounting Note:</strong> Vote Numbers (Head/Prog/Project/Object Code) are NOT required at this stage. The Planning Division will classify and assign these during Stage 2 budget formulation.
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button type="button" onClick={() => setShowProposalModal(false)} className="btn btn-secondary">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}
                  >
                    <span>🚀</span>
                    <span>Submit Proposed Activity</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* POPUP MODAL 2: ADD GOVERNMENT VISION INITIATIVE (STAGE 2)              */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        {showVisionModal && isPlanningOfficer && (
          <div
            className="modal-overlay modal-backdrop"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.55)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: '1rem',
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowVisionModal(false);
            }}
          >
            <div
              className="modal-content modal"
              style={{
                maxWidth: '680px',
                width: '100%',
                maxHeight: '90vh',
                overflowY: 'auto',
                background: '#ffffff',
                borderRadius: '12px',
                padding: '1.75rem',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '0.75rem' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#8D153A' }}>
                    🌟 Add Government Vision Strategic Initiative
                  </h3>
                  <div style={{ fontSize: '0.75rem', color: '#718096', marginTop: '0.15rem' }}>
                    Top-Down Strategic Policy Injection into Ministry Budget Proposal & Budget Speech.
                  </div>
                </div>
                <button onClick={() => setShowVisionModal(false)} style={{ border: 'none', background: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>
                  ✕
                </button>
              </div>

              <form onSubmit={handleAddVisionInitiative}>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Strategic Policy Initiative Title *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={visionForm.activityTitle}
                    onChange={(e) => setVisionForm({ ...visionForm, activityTitle: e.target.value })}
                    placeholder="e.g. Presidential Flagship: Smart Classroom Transformation in 1,000 Schools"
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">National Priority Theme *</label>
                    <select
                      className="form-input"
                      value={visionForm.governmentPriorityTheme}
                      onChange={(e) => setVisionForm({ ...visionForm, governmentPriorityTheme: e.target.value })}
                    >
                      <option value="Digital Education & STEM">Digital Education & STEM</option>
                      <option value="Educational Curriculum Reforms">Educational Curriculum Reforms</option>
                      <option value="Health, Nutrition & Welfare">Health, Nutrition & Welfare</option>
                      <option value="General Education Development">General Education Development</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select
                      className="form-input"
                      value={visionForm.category}
                      onChange={(e) => setVisionForm({ ...visionForm, category: e.target.value })}
                    >
                      <option value="Infrastructure & ICT">Infrastructure & ICT Lab Transformation</option>
                      <option value="Workshop & Training">National Teacher Capacity Building</option>
                      <option value="Curriculum Development">National Curriculum Transformation</option>
                      <option value="Student Programme">Special Student Welfare & Nutrition</option>
                    </select>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Policy Directive & Rationale</label>
                  <textarea
                    className="form-input"
                    rows={2}
                    value={visionForm.justification}
                    onChange={(e) => setVisionForm({ ...visionForm, justification: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Estimated Budget (Rs. Mn) *</label>
                    <input
                      type="number"
                      step="0.000001"
                      min="0"
                      className="form-input"
                      value={visionForm.estimatedCostMn}
                      onChange={(e) => setVisionForm({ ...visionForm, estimatedCostMn: e.target.value as any })}
                      placeholder="e.g. 25.000000"
                      required
                    />
                    {visionForm.estimatedCostMn !== ('' as any) && visionForm.estimatedCostMn !== undefined && (
                      <div style={{ fontSize: '0.72rem', color: '#00534E', fontWeight: 600, marginTop: '0.25rem' }}>
                        Exact: {formatRupees(visionForm.estimatedCostMn, true)} (6 decimal points: {formatMillion(visionForm.estimatedCostMn)} Mn)
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Official Treasury Vote Number</label>
                    <select
                      className="form-input"
                      style={{ marginBottom: '4px', background: '#F0FDFA', color: '#00534E', fontWeight: 600, fontSize: '0.8rem' }}
                      value={MOE_STANDARD_VOTE_NUMBERS.some(v => v.voteNumber === visionForm.assignedVoteNumber) ? visionForm.assignedVoteNumber : 'custom'}
                      onChange={(e) => {
                        if (e.target.value !== 'custom') {
                          const details = getVoteDetails(e.target.value);
                          setVisionForm({
                            ...visionForm,
                            assignedVoteNumber: e.target.value,
                            assignedObjectCode: details.objectCode,
                            assignedFundingSource: details.fundingSource,
                          });
                        }
                      }}
                    >
                      <option value="">-- Pick Standard Vote --</option>
                      {MOE_STANDARD_VOTE_NUMBERS.map((v) => (
                        <option key={v.voteNumber} value={v.voteNumber}>
                          {v.voteNumber} • {v.projectName.slice(0, 30)} ({v.objectCode})
                        </option>
                      ))}
                      <option value="custom">-- Custom Vote Number --</option>
                    </select>
                    <input
                      type="text"
                      className="form-input"
                      value={visionForm.assignedVoteNumber}
                      onChange={(e) => setVisionForm({ ...visionForm, assignedVoteNumber: e.target.value })}
                      placeholder="126-02-04-2104"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Funding Source</label>
                    <select
                      className="form-input"
                      value={visionForm.assignedFundingSource}
                      onChange={(e) => setVisionForm({ ...visionForm, assignedFundingSource: e.target.value })}
                    >
                      <option value="Treasury Consolidated Fund">Treasury Consolidated Fund</option>
                      <option value="ADB-ESDP Foreign Aid & Treasury Co-Financing">ADB-ESDP Foreign Aid</option>
                      <option value="World Bank GEMP Programme">World Bank GEMP Programme</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginBottom: '1.25rem', padding: '0.75rem 1rem', background: '#FEFCBF', borderRadius: '6px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: '#744210', fontSize: '0.85rem' }}>
                    <input
                      type="checkbox"
                      checked={visionForm.includedInBudgetSpeech}
                      onChange={(e) => setVisionForm({ ...visionForm, includedInBudgetSpeech: e.target.checked })}
                    />
                    <span>Include as Key Announcement in Annual Budget Speech</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={visionForm.budgetSpeechSummary}
                    onChange={(e) => setVisionForm({ ...visionForm, budgetSpeechSummary: e.target.value })}
                    placeholder="Short 1-line announcement text for the Minister's Budget Speech..."
                    style={{ marginTop: '0.4rem', fontSize: '0.8rem' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button type="button" onClick={() => setShowVisionModal(false)} className="btn btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" style={{ background: '#8D153A', borderColor: '#8D153A' }}>
                    🌟 Inject Government Vision Initiative
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* POPUP MODAL 3: APPRAISE / EDIT / REJECT ACTIVITY (PLANNING DESK)      */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        {showReviewModal && isPlanningOfficer && selectedProposalForReview && (
          <div
            className="modal-overlay modal-backdrop"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.55)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: '1rem',
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowReviewModal(false);
            }}
          >
            <div
              className="modal-content modal"
              style={{
                maxWidth: '720px',
                width: '100%',
                maxHeight: '92vh',
                overflowY: 'auto',
                background: '#ffffff',
                borderRadius: '12px',
                padding: '1.75rem',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '0.75rem' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#00534E' }}>
                    Planning Division Appraisal & Classification Desk
                  </h3>
                  <div style={{ fontSize: '0.75rem', color: '#718096', marginTop: '0.15rem' }}>
                    Division: <strong>{selectedProposalForReview.divisionName}</strong> • Activity: <strong>{selectedProposalForReview.activityTitle}</strong>
                  </div>
                </div>
                <button onClick={() => setShowReviewModal(false)} style={{ border: 'none', background: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>
                  ✕
                </button>
              </div>

              {/* Activity Summary Overview */}
              <div style={{ padding: '0.85rem 1rem', background: '#F8F9FA', borderRadius: '8px', border: '1px solid #E2E8F0', marginBottom: '1.25rem', fontSize: '0.82rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <div><strong>Proposed Demand:</strong> <span style={{ color: 'var(--primary)', fontWeight: 800 }} title={`Exact: ${formatRupees(selectedProposalForReview.estimatedCostMn, true)}`}>Rs. {formatMillion(selectedProposalForReview.estimatedCostMn)} Mn ({formatRupees(selectedProposalForReview.estimatedCostMn, true)})</span></div>
                  <div><strong>Period:</strong> {selectedProposalForReview.implementationPeriod} ({selectedProposalForReview.implementationYear || selectedProposalForReview.financialYear})</div>
                  <div><strong>Executing Agency:</strong> {selectedProposalForReview.proposedExecutingAgencyType || 'Self'}</div>
                </div>
                <div style={{ color: '#4A5568' }}><strong>Justification:</strong> {selectedProposalForReview.justification}</div>
                <div style={{ color: '#00534E', marginTop: '0.2rem' }}><strong>Outputs:</strong> {selectedProposalForReview.expectedOutputs}</div>
              </div>

              {/* THREE-WAY DECISION TOGGLES: APPROVE / EDIT / REJECT */}
              <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setReviewDecisionType('approve');
                    setReviewForm({ ...reviewForm, status: 'Accepted' });
                  }}
                  className={`btn ${reviewDecisionType === 'approve' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{
                    flex: 1,
                    justifyContent: 'center',
                    background: reviewDecisionType === 'approve' ? '#00534E' : undefined,
                    borderColor: reviewDecisionType === 'approve' ? '#00534E' : undefined,
                    color: reviewDecisionType === 'approve' ? '#fff' : undefined,
                    fontWeight: 700,
                  }}
                >
                  ✅ Approve / Accept
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setReviewDecisionType('edit');
                    setReviewForm({ ...reviewForm, status: 'Adjusted' });
                  }}
                  className={`btn ${reviewDecisionType === 'edit' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{
                    flex: 1,
                    justifyContent: 'center',
                    background: reviewDecisionType === 'edit' ? '#2B6CB0' : undefined,
                    borderColor: reviewDecisionType === 'edit' ? '#2B6CB0' : undefined,
                    color: reviewDecisionType === 'edit' ? '#fff' : undefined,
                    fontWeight: 700,
                  }}
                >
                  ✏️ Edit / Adjust Cost
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setReviewDecisionType('reject');
                    setReviewForm({ ...reviewForm, status: 'Rejected' });
                  }}
                  className={`btn ${reviewDecisionType === 'reject' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{
                    flex: 1,
                    justifyContent: 'center',
                    background: reviewDecisionType === 'reject' ? '#8D153A' : undefined,
                    borderColor: reviewDecisionType === 'reject' ? '#8D153A' : undefined,
                    color: reviewDecisionType === 'reject' ? '#fff' : undefined,
                    fontWeight: 700,
                  }}
                >
                  ❌ Reject Activity
                </button>
              </div>

              <form onSubmit={handleSaveReviewDecision}>
                {/* ── CASE A: REJECT ACTIVITY (MANDATORY STRUCTURED REASON) ── */}
                {reviewDecisionType === 'reject' ? (
                  <div style={{ padding: '1rem', background: '#FFF5F5', borderRadius: '8px', border: '1px solid #FEB2B2', marginBottom: '1.25rem' }}>
                    <div style={{ fontWeight: 800, color: '#C53030', fontSize: '0.92rem', marginBottom: '0.75rem' }}>
                      ⚠️ Rejection Feedback & Mandatory Reason Specification
                    </div>

                    <div className="form-group" style={{ marginBottom: '1rem' }}>
                      <label className="form-label" style={{ fontWeight: 700, color: '#742A2A' }}>
                        Primary Reason for Rejection *
                      </label>
                      <select
                        className="form-input"
                        value={reviewForm.rejectionReasonCategory}
                        onChange={(e) => setReviewForm({ ...reviewForm, rejectionReasonCategory: e.target.value })}
                        required
                        style={{ background: '#fff' }}
                      >
                        <option value="Incomplete Information / Lack of Activity Specification">
                          Incomplete Information / Lack of Activity Specification
                        </option>
                        <option value="Does Not Match Ministry Strategic Plan / Priorities">
                          Does Not Match Ministry Strategic Plan / Priorities
                        </option>
                        <option value="Conceptual / Methodological Issue">
                          Conceptual / Methodological Issue
                        </option>
                        <option value="Duplication / Overlap with Another Branch Activity">
                          Duplication / Overlap with Another Branch Activity
                        </option>
                        <option value="Cost Estimate Exceeds Realistic Treasury Norms">
                          Cost Estimate Exceeds Realistic Treasury Norms
                        </option>
                        <option value="Non-Viable Implementation Timeline / Capacity Constraints">
                          Non-Viable Implementation Timeline / Capacity Constraints
                        </option>
                        <option value="Other">
                          Other (Specify custom reason below)
                        </option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 700, color: '#742A2A' }}>
                        Detailed Rejection Explanation & Directives for Branch *
                      </label>
                      <textarea
                        className="form-input"
                        rows={3}
                        value={reviewForm.rejectionRemarks}
                        onChange={(e) => setReviewForm({ ...reviewForm, rejectionRemarks: e.target.value })}
                        placeholder="Explain specifically why the proposal is rejected and what adjustments the branch must make before re-submitting..."
                        required
                        style={{ background: '#fff' }}
                      />
                    </div>
                  </div>
                ) : (
                  /* ── CASE B & C: APPROVE OR EDIT / ADJUST ── */
                  <div>
                    {/* Auto Activity Number Assignment (Starts from 1 per branch) */}
                    <div style={{ padding: '0.85rem 1rem', background: '#F0FDF4', borderRadius: '8px', border: '1px solid #BBF7D0', marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                        <label className="form-label" style={{ margin: 0, fontWeight: 700, color: '#166534', fontSize: '0.86rem' }}>
                          Assigned Activity Number (Auto-Generated) *
                        </label>
                        <span style={{ fontSize: '0.72rem', color: '#166534', background: '#DCFCE7', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: 800 }}>
                          ✓ Starts from 1 for this Branch
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#166534' }}>Activity #</span>
                          <input
                            type="number"
                            min="1"
                            className="form-input"
                            value={reviewForm.activityNumber}
                            onChange={(e) => setReviewForm({ ...reviewForm, activityNumber: parseInt(e.target.value, 10) || 1 })}
                            style={{ width: '85px', fontWeight: 800, color: '#166534', textAlign: 'center' }}
                            required
                          />
                        </div>
                        <span style={{ fontSize: '0.8rem', color: '#15803D', fontWeight: 600 }}>
                          AIP Matrix Code: <strong>ACT-{String(reviewForm.activityNumber || 1).padStart(2, '0')}</strong> (Will populate AIP Matrix)
                        </span>
                      </div>
                    </div>

                    {/* PPB Activity Title Modifications (PPB can adjust the proposed activity) */}
                    <div className="form-group" style={{ marginBottom: '1rem' }}>
                      <label className="form-label" style={{ fontWeight: 700, color: '#2D3748' }}>
                        Activity Title (PPB Adjusted / Approved) *
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        value={reviewForm.activityTitle}
                        onChange={(e) => setReviewForm({ ...reviewForm, activityTitle: e.target.value })}
                        required
                        style={{ fontWeight: 600 }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                      <div className="form-group">
                        <label className="form-label">Purpose / Intention</label>
                        <textarea
                          className="form-input"
                          rows={2}
                          value={reviewForm.purpose}
                          onChange={(e) => setReviewForm({ ...reviewForm, purpose: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Expected Outputs / Targets</label>
                        <textarea
                          className="form-input"
                          rows={2}
                          value={reviewForm.expectedOutputs}
                          onChange={(e) => setReviewForm({ ...reviewForm, expectedOutputs: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: '1rem' }}>
                      <label className="form-label">PPB Modifications / Directives for Branch</label>
                      <input
                        type="text"
                        className="form-input"
                        value={reviewForm.ppbModificationsNote}
                        onChange={(e) => setReviewForm({ ...reviewForm, ppbModificationsNote: e.target.value })}
                        placeholder="e.g. Activity title and scope refined; merged with provincial training facilities."
                      />
                    </div>

                    {/* Cost & Classification Adjustment */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                      <div className="form-group">
                        <label className="form-label" style={{ fontWeight: 700, color: '#00534E' }}>
                          Approved Budget Allocation (Rs. Mn) *
                        </label>
                        <input
                          type="number"
                          step="0.000001"
                          min="0"
                          className="form-input"
                          value={reviewForm.adjustedCostMn}
                          onChange={(e) => setReviewForm({ ...reviewForm, adjustedCostMn: e.target.value as any })}
                          required
                          style={{ fontWeight: 700 }}
                          placeholder="0.000000"
                        />
                        {reviewForm.adjustedCostMn !== ('' as any) && reviewForm.adjustedCostMn !== undefined && (
                          <div style={{ fontSize: '0.72rem', color: '#00534E', fontWeight: 600, marginTop: '0.25rem' }}>
                            Exact: {formatRupees(reviewForm.adjustedCostMn, true)} (6 decimal points: {formatMillion(reviewForm.adjustedCostMn)} Mn)
                          </div>
                        )}
                      </div>

                      <div className="form-group">
                        <label className="form-label">National Priority Theme *</label>
                        <select
                          className="form-input"
                          value={reviewForm.governmentPriorityTheme}
                          onChange={(e) => setReviewForm({ ...reviewForm, governmentPriorityTheme: e.target.value })}
                        >
                          <option value="Digital Education & STEM">Digital Education & STEM</option>
                          <option value="Educational Curriculum Reforms">Educational Curriculum Reforms</option>
                          <option value="Health, Nutrition & Welfare">Health, Nutrition & Welfare</option>
                          <option value="General Education Development">General Education Development</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: '1rem' }}>
                      <label className="form-label">Planning Remarks / Adjustment Justification</label>
                      <input
                        type="text"
                        className="form-input"
                        value={reviewForm.planningRemarks}
                        onChange={(e) => setReviewForm({ ...reviewForm, planningRemarks: e.target.value })}
                        placeholder="e.g. Residential rates rationalized; merged with zonal CRC training facilities."
                      />
                    </div>

                    {/* Stage 2 Official Budget Classifications */}
                    <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '1rem', marginBottom: '1rem' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.75rem' }}>
                        🏷️ Assign Official Budget Classifications
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                        <div className="form-group">
                          <label className="form-label">Official Vote Number *</label>
                          <select
                            className="form-input"
                            style={{ marginBottom: '4px', background: '#F0FDFA', color: '#00534E', fontWeight: 600, fontSize: '0.8rem' }}
                            value={MOE_STANDARD_VOTE_NUMBERS.some((v) => v.voteNumber === reviewForm.assignedVoteNumber) ? reviewForm.assignedVoteNumber : 'custom'}
                            onChange={(e) => {
                              if (e.target.value !== 'custom') {
                                const details = getVoteDetails(e.target.value);
                                setReviewForm({
                                  ...reviewForm,
                                  assignedVoteNumber: e.target.value,
                                  assignedObjectCode: details.objectCode,
                                  assignedFundingSource: details.fundingSource,
                                });
                              }
                            }}
                          >
                            <option value="">-- Pick Standard Vote --</option>
                            {MOE_STANDARD_VOTE_NUMBERS.map((v) => (
                              <option key={v.voteNumber} value={v.voteNumber}>
                                {v.voteNumber} • {v.projectName.slice(0, 30)} ({v.objectCode})
                              </option>
                            ))}
                            <option value="custom">-- Custom Vote Number --</option>
                          </select>
                          <input
                            type="text"
                            className="form-input"
                            value={reviewForm.assignedVoteNumber}
                            onChange={(e) => setReviewForm({ ...reviewForm, assignedVoteNumber: e.target.value })}
                            placeholder="e.g. 126-02-03-2502"
                            required
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label">Object Code *</label>
                          <select
                            className="form-input"
                            value={reviewForm.assignedObjectCode}
                            onChange={(e) => setReviewForm({ ...reviewForm, assignedObjectCode: e.target.value })}
                          >
                            <option value="2502">2502 - Capacity Building & Training</option>
                            <option value="1101">1101 - Salaries & Overtime</option>
                            <option value="1201">1201 - Domestic Traveling</option>
                            <option value="2101">2101 - Curriculum & Teaching Aids</option>
                            <option value="2104">2104 - Machinery & Digital Hardware</option>
                          </select>
                        </div>

                        <div className="form-group">
                          <label className="form-label">Funding Source *</label>
                          <select
                            className="form-input"
                            value={reviewForm.assignedFundingSource}
                            onChange={(e) => setReviewForm({ ...reviewForm, assignedFundingSource: e.target.value })}
                          >
                            <option value="Treasury Consolidated Fund">Treasury Consolidated Fund</option>
                            <option value="ADB-ESDP Foreign Aid">ADB-ESDP Foreign Aid</option>
                            <option value="World Bank GEMP Programme">World Bank GEMP</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Budget Speech Highlight */}
                    <div style={{ padding: '0.75rem 1rem', background: '#FEFCBF', borderRadius: '6px', marginBottom: '1.25rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: '#744210', fontSize: '0.85rem' }}>
                        <input
                          type="checkbox"
                          checked={reviewForm.includedInBudgetSpeech}
                          onChange={(e) => setReviewForm({ ...reviewForm, includedInBudgetSpeech: e.target.checked })}
                        />
                        <span>Earmark for Annual Budget Speech Announcement</span>
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        value={reviewForm.budgetSpeechSummary}
                        onChange={(e) => setReviewForm({ ...reviewForm, budgetSpeechSummary: e.target.value })}
                        placeholder="Short 1-line announcement text for the Budget Speech..."
                        style={{ marginTop: '0.4rem', fontSize: '0.8rem' }}
                      />
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid #E2E8F0', paddingTop: '1rem' }}>
                  <button type="button" onClick={() => setShowReviewModal(false)} className="btn btn-secondary">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{
                      background: reviewDecisionType === 'reject' ? '#8D153A' : undefined,
                      borderColor: reviewDecisionType === 'reject' ? '#8D153A' : undefined,
                    }}
                  >
                    {reviewDecisionType === 'reject' ? 'Confirm Activity Rejection' : 'Save Appraisal & Classifications'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* POPUP MODAL 4: GUIDELINES & CIRCULAR VIEW                             */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        {showGuidelinesModal && (
          <div
            className="modal-overlay modal-backdrop"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.55)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: '1rem',
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowGuidelinesModal(false);
            }}
          >
            <div
              className="modal-content modal"
              style={{
                maxWidth: '640px',
                width: '100%',
                maxHeight: '90vh',
                overflowY: 'auto',
                background: '#ffffff',
                borderRadius: '12px',
                padding: '1.75rem',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '0.75rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--primary)' }}>
                  📄 Budgetary Planning & Submission Circular (ED/CIR/2026/AIP-04)
                </h3>
                <button onClick={() => setShowGuidelinesModal(false)} style={{ border: 'none', background: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>
                  ✕
                </button>
              </div>

              <div style={{ fontSize: '0.86rem', color: '#2D3748', lineHeight: 1.6 }}>
                <p><strong>To:</strong> All Heads of National Divisions, Provincial Directors, and Zonal Officers</p>
                <p><strong>From:</strong> Policy Planning & Performance Review Division, Ministry of Education</p>
                <hr style={{ border: 'none', borderTop: '1px solid #E2E8F0', margin: '0.75rem 0' }} />

                <h4 style={{ margin: '0.5rem 0 0.25rem 0', color: '#00534E' }}>Instructions for Stage 1: Branch Budgetary Planning</h4>
                <ol style={{ paddingLeft: '1.2rem', margin: '0 0 0.75rem 0' }}>
                  <li>All operational branches must identify anticipated workshops, training, curriculum seminars, and infrastructure needs for FY {selectedYear}.</li>
                  <li>Use the activity-based format (Title, Implementation Year, Executing Agency, Recurrent/Capital, AIP Linkage, Justification, Outputs, Period, Beneficiaries, Estimated Cost).</li>
                  <li><strong>Important:</strong> Branches are NOT required to assign Government Vote Numbers or accounting classifications.</li>
                  <li>Activities can be edited or deleted anytime within the editing frame.</li>
                </ol>

                <h4 style={{ margin: '0.5rem 0 0.25rem 0', color: '#8D153A' }}>Stage 2: Planning Division Formulation & Appraisal</h4>
                <p style={{ margin: 0 }}>
                  The Planning Division can approve, edit, or reject activities. When rejecting, a structured reason must be specified. Accepted activities are assigned official Vote Numbers and considered for the Annual Budget Speech.
                </p>
              </div>

              <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={() => setShowGuidelinesModal(false)} className="btn btn-primary">
                  Understood
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </AppShell>
  );
}
