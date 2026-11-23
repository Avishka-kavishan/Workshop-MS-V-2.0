'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';
import BranchBadge from '@/components/common/BranchBadge';
import SearchableSelect from '@/components/common/SearchableSelect';
import TileActionMenu, { TileExportData } from '@/components/dashboard/TileActionMenu';
import { downloadAsPdfReport } from '@/lib/dashboardExport';
import { broadcastDataChange } from '@/lib/broadcastSync';
import { formatMillion, formatRupees, formatDualDeclaration, roundToCentInMn, parseAmountToMn } from '@/lib/financialFormat';
import { MOE_STANDARD_VOTE_NUMBERS, getVoteDetails, MoeStandardVote } from '@/lib/sriLankanVotes';

interface AipAmendment {
  id: string;
  year: string;
  amendmentNumber: number;
  title: string;
  circularRef?: string;
  deadline?: string;
  notes?: string;
  progressStartDate?: string;
  progressEndDate?: string;
  status: 'Active' | 'Closed';
  totalBranches?: number;
  submittedBranchesCount?: number;
  branchSubmissions?: Array<{
    branchId: string;
    branchName: string;
    status: string;
    submittedAt: string | null;
    activityCount: number;
    totalCost: number;
    isDispatchedToBranch?: boolean;
    dispatchedAt?: string | null;
  }>;
}

interface AipPlan {
  id: string;
  branchId: string;
  branchName: string;
  year: string;
  phaseTitle: string;
  targetTitle: string;
  mainResponsibility: string;
  mainContactNo: string;
  overallResponsibility: string;
  overallContactNo: string;
  progressStartDate?: string;
  progressEndDate?: string;
  amendmentNumber?: number;
  amendmentId?: string;
  submittedAt?: string;
  submissionNotes?: string;
  approvedAt?: string;
  approvedBy?: string;
  approvalNotes?: string;
  dispatchedAt?: string;
  dispatchedBy?: string;
  isDispatchedToBranch?: boolean;
  submittedToPlanningOrgId?: string;
  submittedToPlanningOrgName?: string;
  status: 'Draft' | 'Submitted' | 'Approved';
  createdAt: string;
  updatedAt: string;
}

interface AipActivity {
  id: string;
  planId?: string;
  branchId: string;
  branchName: string;
  year: string;
  outputNo: string;
  activityCode: string;
  activity: string;
  voteNumber: string;
  estimatedCost: number;
  financialMonths: number[];
  physicalMonths: string[];
  financialQ1: number;
  financialQ2: number;
  financialQ3: number;
  financialQ4: number;
  targetQ1: string;
  targetQ2: string;
  targetQ3: string;
  targetQ4: string;
  responsibleOfficer: string;
  remarks?: string;
  proposalId?: string;
  proposalActivityNumber?: number;
  isAddedByPlanning?: boolean;
  isAdjustedByPlanning?: boolean;
  originalProposedCost?: number;
  planningNotes?: string;
  planningOfficerName?: string;
  sourceProposalTitle?: string;
  physicalProgress?: string;
  physicalProgressPct?: string;
  financialProgress?: number;
  financialProgressPct?: string;
  customFields?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

interface MoeBranch {
  id: string;
  name: string;
  code: string;
}

const MONTH_NAMES_SHORT = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

export default function AnnualPlanPage() {
  const { data: session, status } = useSession();
    const user = session?.user as any;

  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState('2027');
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [moeBranches, setMoeBranches] = useState<MoeBranch[]>([]);
  const [aipDeadline, setAipDeadline] = useState<any>(null);
  const [isConsolidated, setIsConsolidated] = useState(false);

  const [plan, setPlan] = useState<AipPlan | null>(null);
  const [activities, setActivities] = useState<AipActivity[]>([]);

  // Amendment states
  const [amendments, setAmendments] = useState<AipAmendment[]>([]);
  const [originalPlanSubmissions, setOriginalPlanSubmissions] = useState<any[]>([]);
  const [selectedAmendmentNumber, setSelectedAmendmentNumber] = useState<number>(0);
  const [currentAmendment, setCurrentAmendment] = useState<AipAmendment | null>(null);

  // Planning Branch: Call for Amendment Modal
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [callTitle, setCallTitle] = useState('');
  const [callCircular, setCallCircular] = useState('');
  const [callDeadline, setCallDeadline] = useState('');
  const [callNotes, setCallNotes] = useState('');
  const [callProgressStart, setCallProgressStart] = useState('2027.01.01');
  const [callProgressEnd, setCallProgressEnd] = useState('2027.10.31');
  const [callTargetBranchIds, setCallTargetBranchIds] = useState<string[]>([]);
  const [callSendMode, setCallSendMode] = useState<'all' | 'selected'>('all');
  const [isSavingProgress, setIsSavingProgress] = useState(false);
  const [progressSavedSuccess, setProgressSavedSuccess] = useState(false);
  const [isCalling, setIsCalling] = useState(false);
  const [callSuccessMsg, setCallSuccessMsg] = useState('');

  // Planning Branch: Submissions Tracker Modal
  const [isTrackerModalOpen, setIsTrackerModalOpen] = useState(false);

  // Branch Officer: Submit Amendment to Planning Modal
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [submitNotes, setSubmitNotes] = useState('');
  const [isSubmittingAmendment, setIsSubmittingAmendment] = useState(false);
  const [submitSuccessMsg, setSubmitSuccessMsg] = useState('');
  const [branchInfo, setBranchInfo] = useState<{ id: string; name: string; code?: string } | null>(null);
  const [relevantPlanningBranch, setRelevantPlanningBranch] = useState<{
    planningOrgId: string;
    planningOrgName: string;
    planningAuthorityLabel: string;
    departmentCode: string;
    departmentName: string;
    submissionInstructions: string;
  } | null>(null);
  const [relevantMonitoringBranch, setRelevantMonitoringBranch] = useState<{
    monitoringOrgId: string;
    monitoringOrgName: string;
    monitoringAuthorityLabel: string;
    description: string;
  } | null>(null);

  // Monthly Progress Reporting State (Post-Approval Implementation Phase)
  const [monthlyReturns, setMonthlyReturns] = useState<any[]>([]);
  const [selectedReportingMonth, setSelectedReportingMonth] = useState<number>(1);
  const [isMonthlyReturnModalOpen, setIsMonthlyReturnModalOpen] = useState(false);
  const [monthlyReturnItems, setMonthlyReturnItems] = useState<Array<{
    activityId: string;
    activityCode: string;
    activityTitle: string;
    voteNumber: string;
    plannedTargetMonth: string;
    plannedFinancialMonth: number;
    actualPhysicalPct: number;
    actualFinancialMonth: number;
    status: 'On Track' | 'Delayed' | 'Critical' | 'Completed';
    implementationNotes: string;
  }>>([]);
  const [monthlyReturnRemarks, setMonthlyReturnRemarks] = useState('');
  const [isSubmittingMonthlyReturn, setIsSubmittingMonthlyReturn] = useState(false);
  const [approvedProposalsCount, setApprovedProposalsCount] = useState(0);
  const [isImportingPpb, setIsImportingPpb] = useState(false);

  const isPrivileged =
    user?.username !== 'planning' &&
    (user?.username === 'planning.officer' ||
      user?.username === 'doe.planning' ||
      (user?.functionalCategory === 'Planning' && (user?.organizationId === 'org-moe-planning' || user?.organizationId === 'org-doe-planning' || user?.organizationId === 'org-moe')) ||
      user?.isSuperAdmin ||
      user?.adminLevel === 0 ||
      user?.adminLevel === 1 ||
      user?.roleId === 'role-superadmin' ||
      user?.roleId === 'role-planning-officer' ||
      (user?.organizationId === 'org-moe-planning' && user?.roleId !== 'role-moe-officer') ||
      (user?.organizationId === 'org-doe-planning' && user?.roleId !== 'role-moe-officer'));

  // Directly editable fields in the sheet
  const [mainResp, setMainResp] = useState('');
  const [mainContact, setMainContact] = useState('');
  const [overallResp, setOverallResp] = useState('');
  const [overallContact, setOverallContact] = useState('');
  const [formPhaseTitle, setFormPhaseTitle] = useState('3. Implementation Phase');
  const [formTargetTitle, setFormTargetTitle] = useState('');
  const [progressRangeStart, setProgressRangeStart] = useState('2026.01.01');
  const [progressRangeEnd, setProgressRangeEnd] = useState('2026.10.31');
  const [formPhysicalProgress, setFormPhysicalProgress] = useState('');
  const [formPhysicalProgressPct, setFormPhysicalProgressPct] = useState('');
  const [formFinancialProgress, setFormFinancialProgress] = useState('');
  const [formFinancialProgressPct, setFormFinancialProgressPct] = useState('');
  const [isSavingHeader, setIsSavingHeader] = useState(false);
  const [headerSavedSuccess, setHeaderSavedSuccess] = useState(false);

  // Modal form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<AipActivity | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // AIP Template & Custom Fields State
  const [aipTemplate, setAipTemplate] = useState<any | null>(null);
  const [formCustomFields, setFormCustomFields] = useState<Record<string, any>>({});
  const customColumns = useMemo(
    () => (aipTemplate?.columns || []).filter((c: any) => !c.isSystemCore && c.visible !== false),
    [aipTemplate]
  );

  // Activity Form Fields
  const [formOutputNo, setFormOutputNo] = useState('1');
  const [formActivityCode, setFormActivityCode] = useState('');
  const [formActivity, setFormActivity] = useState('');
  const [formVoteNumber, setFormVoteNumber] = useState('-');
  const [formEstimatedCost, setFormEstimatedCost] = useState('');
  const [formResponsibleOfficer, setFormResponsibleOfficer] = useState('');
  const [formRemarks, setFormRemarks] = useState('');

  const [formFinancialMonths, setFormFinancialMonths] = useState<number[]>(Array(12).fill(0));
  const [formPhysicalMonths, setFormPhysicalMonths] = useState<string[]>(Array(12).fill('-'));

  const [formFinancialQ1, setFormFinancialQ1] = useState(0);
  const [formFinancialQ2, setFormFinancialQ2] = useState(0);
  const [formFinancialQ3, setFormFinancialQ3] = useState(0);
  const [formFinancialQ4, setFormFinancialQ4] = useState(0);

  const [formTargetQ1, setFormTargetQ1] = useState('-');
  const [formTargetQ2, setFormTargetQ2] = useState('-');
  const [formTargetQ3, setFormTargetQ3] = useState('-');
  const [formTargetQ4, setFormTargetQ4] = useState('100%');

  // Interactive Tile Filter State (filters the AIP Matrix table below)
  const [activeTileFilter, setActiveTileFilter] = useState<'all' | 'completed' | 'in_progress' | 'scheduled' | 'high_budget'>('all');

  // Origin Filter: Branch Proposed vs Planning Added vs Planning Adjusted
  const [originFilter, setOriginFilter] = useState<'all' | 'proposed' | 'planning_added' | 'adjusted'>('all');

  // Planning Officer Dispatch Facility
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [dispatchNotes, setDispatchNotes] = useState('Official Treasury Voted Budget Allocation & Implementation Directives issued by Ministry Planning Division (PPB).');
  const [isDispatchingPlan, setIsDispatchingPlan] = useState(false);

  // Planning Officer Top-Down Activity Addition Facility
  const [isPlanningAddModalOpen, setIsPlanningAddModalOpen] = useState(false);
  const [planningAddBranchId, setPlanningAddBranchId] = useState('');
  const [planningAddTitle, setPlanningAddTitle] = useState('');
  const [planningAddCost, setPlanningAddCost] = useState('');
  const [planningAddVoteNumber, setPlanningAddVoteNumber] = useState('126-02-03-2502');
  const [planningAddPeriod, setPlanningAddPeriod] = useState<'Q1' | 'Q2' | 'Q3' | 'Q4' | 'Annual'>('Annual');
  const [planningAddNotes, setPlanningAddNotes] = useState('Initiated directly under Government Vision and National Educational Policy Mandate.');
  const [planningAddOfficer, setPlanningAddOfficer] = useState('');
  const [isSubmittingPlanningAdd, setIsSubmittingPlanningAdd] = useState(false);

  // Quick Vote Number Giving Popover / Modal
  const [quickVoteActivity, setQuickVoteActivity] = useState<AipActivity | null>(null);
  const [quickVoteSelected, setQuickVoteSelected] = useState('126-02-03-2502');
  const [isSavingQuickVote, setIsSavingQuickVote] = useState(false);

  // Edit form planning extension fields
  const [formPlanningNotes, setFormPlanningNotes] = useState('');
  const [formIsAddedByPlanning, setFormIsAddedByPlanning] = useState(false);
  const [formIsAdjustedByPlanning, setFormIsAdjustedByPlanning] = useState(false);
  const [formOriginalProposedCost, setFormOriginalProposedCost] = useState('');

  // User-Friendly UI State Enhancements
  const [showLifecycleStages, setShowLifecycleStages] = useState(false);
  const [showBranchTabs, setShowBranchTabs] = useState(true);
  const [branchSearch, setBranchSearch] = useState('');
  const [showMonthlyProgress, setShowMonthlyProgress] = useState(false);
  const [showResponsibilityCard, setShowResponsibilityCard] = useState(false);
  const [viewMode, setViewMode] = useState<'monthly' | 'quarterly'>('monthly');
  const [decimalMode, setDecimalMode] = useState<'dual' | 'standard' | 'full'>('dual');

  const formatMnValues = (val: number | string | null | undefined) => {
    if (val === null || val === undefined || val === '') {
      return { val2Dec: '-', valExact: '-', valRupees: 'Rs. 0.00', num: 0, isZero: true, hasExtraDecimals: false };
    }
    const n = parseAmountToMn(val);
    if (isNaN(n) || n === 0) {
      return { val2Dec: '0.00', valExact: '0.000000', valRupees: 'Rs. 0.00', num: 0, isZero: true, hasExtraDecimals: false };
    }
    const val2Dec = formatMillion(n, { minDecimals: 2, maxDecimals: 2 });
    const valExact = formatMillion(n, { minDecimals: 6, maxDecimals: 6 });
    const valRupees = formatRupees(n, true);
    const hasExtraDecimals = Math.abs(n - parseFloat(val2Dec.replace(/,/g, ''))) > 0.000001;

    return { val2Dec, valExact, valRupees, num: n, isZero: false, hasExtraDecimals };
  };

  const displayMn = (val: number | string | null | undefined, forceExact = false) => {
    const { val2Dec, valExact, isZero } = formatMnValues(val);
    if (val === null || val === undefined || val === '') return '-';
    if (isZero) return '0.00';
    if (forceExact || decimalMode === 'full') return valExact;
    return val2Dec;
  };

  /**
   * Render helper for table cells:
   * Displays clean 2 decimals by default (e.g. 18.50, 1.54).
   * In smaller font (or on hover), displays the exact 6-decimal precision (e.g. 18.500000, 1.541666).
   * On mouse hover, shows full exact value tooltip with Rupee cents.
   */
  const renderMnCell = (
    val: number | string | null | undefined,
    options?: {
      bold?: boolean;
      color?: string;
      align?: 'right' | 'center' | 'left';
      prefix?: string;
      suffix?: string;
      alwaysShowSubtext?: boolean;
    }
  ) => {
    if (val === null || val === undefined || val === '') return '-';
    const { val2Dec, valExact, valRupees, isZero, hasExtraDecimals } = formatMnValues(val);
    if (isZero) {
      return (
        <span
          title="Exact: 0.000000 Mn (Rs. 0.00)"
          style={{ color: '#94a3b8', fontSize: '0.75rem', cursor: 'help' }}
        >
          0.00
        </span>
      );
    }

    const align = options?.align || 'center';
    const bold = options?.bold ?? true;
    const color = options?.color || 'inherit';
    const prefix = options?.prefix || '';
    const suffix = options?.suffix || '';
    const showSub = options?.alwaysShowSubtext || decimalMode === 'dual';

    return (
      <div
        className="mn-hover-cell"
        title={`Exact: ${valExact} Mn (${valRupees})`}
        style={{
          display: 'inline-flex',
          flexDirection: 'column',
          alignItems: align === 'right' ? 'flex-end' : align === 'center' ? 'center' : 'flex-start',
          lineHeight: 1.15,
          cursor: 'help',
          width: '100%',
        }}
      >
        <span style={{ fontWeight: bold ? 700 : 500, color, fontSize: '0.78rem' }}>
          {prefix}{decimalMode === 'full' ? valExact : val2Dec}{suffix}
        </span>
        {showSub && decimalMode !== 'full' && (
          <span
            className="mn-subtext"
            style={{
              fontSize: '0.62rem',
              color: hasExtraDecimals ? '#b45309' : '#64748b',
              fontWeight: hasExtraDecimals ? 700 : 500,
              fontFamily: 'monospace',
              letterSpacing: '-0.02em',
              lineHeight: 1,
              marginTop: '1px',
            }}
          >
            {valExact}
          </span>
        )}
      </div>
    );
  };

  const handleTileClick = (filter: 'all' | 'completed' | 'in_progress' | 'scheduled' | 'high_budget') => {
    setActiveTileFilter((prev) => (prev === filter ? 'all' : filter));
  };

  // Activity counts for origin
  const branchProposedCount = useMemo(() => activities.filter((a) => !a.isAddedByPlanning).length, [activities]);
  const planningAddedCount = useMemo(() => activities.filter((a) => Boolean(a.isAddedByPlanning)).length, [activities]);
  const planningAdjustedCount = useMemo(() => activities.filter((a) => Boolean(a.isAdjustedByPlanning)).length, [activities]);

  const filteredMoeBranches = useMemo(() => {
    if (!branchSearch.trim()) return moeBranches;
    const q = branchSearch.toLowerCase();
    return moeBranches.filter((b) => b.name.toLowerCase().includes(q) || (b.code && b.code.toLowerCase().includes(q)));
  }, [moeBranches, branchSearch]);

  // Filtered activities based on tile click and origin filter
  const displayedActivities = useMemo(() => {
    let list = activities;
    if (activeTileFilter === 'completed') {
      list = list.filter((a) => (a.physicalProgressPct || '').trim() === '100%');
    } else if (activeTileFilter === 'in_progress') {
      const pct = (a: AipActivity) => parseFloat(a.physicalProgressPct || '0');
      list = list.filter((a) => pct(a) > 0 && pct(a) < 100);
    } else if (activeTileFilter === 'scheduled') {
      const pct = (a: AipActivity) => parseFloat(a.physicalProgressPct || '0');
      list = list.filter((a) => pct(a) === 0 || !a.physicalProgressPct || a.physicalProgressPct === '-');
    } else if (activeTileFilter === 'high_budget') {
      list = list.filter((a) => Number(a.estimatedCost || 0) >= 5);
    }

    if (originFilter === 'proposed') {
      list = list.filter((a) => !a.isAddedByPlanning);
    } else if (originFilter === 'planning_added') {
      list = list.filter((a) => Boolean(a.isAddedByPlanning));
    } else if (originFilter === 'adjusted') {
      list = list.filter((a) => Boolean(a.isAdjustedByPlanning));
    }

    return list;
  }, [activities, activeTileFilter, originFilter]);

  // Activity counts for tiles
  const completedActivitiesCount = useMemo(() => {
    return activities.filter((a) => (a.physicalProgressPct || '').trim() === '100%').length;
  }, [activities]);

  const inProgressActivitiesCount = useMemo(() => {
    return activities.filter((a) => {
      const p = parseFloat(a.physicalProgressPct || '0');
      return p > 0 && p < 100;
    }).length;
  }, [activities]);

  const scheduledActivitiesCount = useMemo(() => {
    return activities.filter((a) => {
      const p = parseFloat(a.physicalProgressPct || '0');
      return p === 0 || !a.physicalProgressPct || a.physicalProgressPct === '-';
    }).length;
  }, [activities]);

  // 6-Stage Process Sequence Status Helper (Official National Education Planning Lifecycle)
  const currentStageStatus = useMemo(() => {
    // Stage 1: Submission of AIP Proposals by Branches
    const isStage1Complete = plan?.status === 'Submitted' || plan?.status === 'Approved';
    const isStage1Active = !isStage1Complete;

    // Stage 2: Review and Consolidation by Planning Branch
    const isStage2Complete = plan?.status === 'Approved' || (isConsolidated && plan?.status === 'Submitted');
    const isStage2Active = plan?.status === 'Submitted' || (isPrivileged && isConsolidated);

    // Stage 3: AIP Approval by PPB
    const isStage3Complete = plan?.status === 'Approved';
    const isStage3Active = plan?.status === 'Submitted';

    // Stage 4: Allocation of Approved AIP to Relevant Branches
    const isStage4Complete = Boolean(plan?.isDispatchedToBranch);
    const isStage4Active = plan?.status === 'Approved' && !plan?.isDispatchedToBranch;

    // Stage 5: Progress Reporting by Branches
    const hasMonthlyReturns = Boolean(monthlyReturns && monthlyReturns.length > 0);
    const isStage5Active = Boolean(plan?.isDispatchedToBranch);

    // Stage 6: Monitoring and Evaluation
    const isStage6Active = Boolean(plan?.isDispatchedToBranch) || plan?.status === 'Approved';

    return {
      stage1: { complete: isStage1Complete, active: isStage1Active },
      stage2: { complete: isStage2Complete, active: isStage2Active },
      stage3: { complete: isStage3Complete, active: isStage3Active },
      stage4: { complete: isStage4Complete, active: isStage4Active },
      stage5: { complete: hasMonthlyReturns, active: isStage5Active },
      stage6: { complete: false, active: isStage6Active },
    };
  }, [plan?.status, plan?.isDispatchedToBranch, isConsolidated, isPrivileged, monthlyReturns]);

  // Load Data - dynamically detects branch, year, and amendment version
  const loadPlanData = async (targetBranchId?: string, targetAmendmentNum?: number) => {
    try {
      setLoading(true);
      const isPrivileged =
        user?.username !== 'planning' &&
        (user?.username === 'planning.officer' ||
          user?.username === 'doe.planning' ||
          (user?.functionalCategory === 'Planning' && (user?.organizationId === 'org-moe-planning' || user?.organizationId === 'org-doe-planning' || user?.organizationId === 'org-moe')) ||
          user?.isSuperAdmin ||
          user?.adminLevel === 0 ||
          user?.adminLevel === 1 ||
          user?.roleId === 'role-superadmin' ||
          user?.roleId === 'role-planning-officer' ||
          (user?.organizationId === 'org-moe-planning' && user?.roleId !== 'role-moe-officer') ||
          (user?.organizationId === 'org-doe-planning' && user?.roleId !== 'role-moe-officer'));
      const bId = targetBranchId || (isPrivileged && selectedBranchId ? selectedBranchId : user?.organizationId);
      const amendNum = targetAmendmentNum !== undefined ? targetAmendmentNum : selectedAmendmentNumber;
      const url = bId 
        ? `/api/annual-plan?year=${selectedYear}&branchId=${encodeURIComponent(bId)}&amendmentNumber=${amendNum}`
        : `/api/annual-plan?year=${selectedYear}&amendmentNumber=${amendNum}`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setBranchInfo(json.branch);
        setMoeBranches(json.moeBranches || []);
        if (json.relevantPlanningBranch) {
          setRelevantPlanningBranch(json.relevantPlanningBranch);
        }
        if (json.relevantMonitoringBranch) {
          setRelevantMonitoringBranch(json.relevantMonitoringBranch);
        }
        if (json.monthlyReturns) {
          setMonthlyReturns(json.monthlyReturns);
        }
        if (json.aipTemplate) {
          setAipTemplate(json.aipTemplate);
        }
        if (json.branch?.id) {
          setSelectedBranchId(json.branch.id);
        }
        setPlan(json.plan);
        setActivities(json.activities || []);
        setAmendments(json.amendments || []);
        if (json.originalPlanSubmissions) {
          setOriginalPlanSubmissions(json.originalPlanSubmissions);
        }
        if (json.deadline) {
          setAipDeadline(json.deadline);
        }
        setIsConsolidated(Boolean(json.isConsolidated));
        setCurrentAmendment(json.currentAmendment || null);
        if (json.approvedProposalsCount !== undefined) {
          setApprovedProposalsCount(json.approvedProposalsCount);
        }

        if (json.plan) {
          setMainResp(json.plan.mainResponsibility || '');
          setMainContact(json.plan.mainContactNo || '');
          setOverallResp(json.plan.overallResponsibility || '');
          setOverallContact(json.plan.overallContactNo || '');
          setFormPhaseTitle(json.plan.phaseTitle || '3. Implementation Phase');
          setFormTargetTitle(json.plan.targetTitle || '');
          setProgressRangeStart(json.plan.progressStartDate || `${selectedYear}.01.01`);
          setProgressRangeEnd(json.plan.progressEndDate || `${selectedYear}.10.31`);
        }
      }
    } catch (err) {
      console.error('Failed to load annual plan data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Sync with URL query parameter ?amendmentNumber=X without requiring Suspense
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const qNum = params.get('amendmentNumber');
      if (qNum !== null) {
        const parsed = parseInt(qNum, 10);
        if (!isNaN(parsed) && parsed !== selectedAmendmentNumber) {
          setSelectedAmendmentNumber(parsed);
        }
      }
    }
  }, []);

  useEffect(() => {
    if (status === 'loading') return;
    const isPrivileged =
    user?.username !== 'planning' &&
    (user?.username === 'planning.officer' ||
      (user?.functionalCategory === 'Planning' && (user?.organizationId === 'org-moe-planning' || user?.organizationId === 'org-moe')) ||
      user?.isSuperAdmin ||
      user?.adminLevel === 0 ||
      user?.adminLevel === 1 ||
      user?.roleId === 'role-superadmin' ||
      user?.roleId === 'role-planning-officer' ||
      (user?.organizationId === 'org-moe-planning' && user?.roleId !== 'role-moe-officer'));
    const bId = (isPrivileged && selectedBranchId) ? selectedBranchId : user?.organizationId;
    loadPlanData(bId, selectedAmendmentNumber);
  }, [status, user?.organizationId, selectedYear, selectedAmendmentNumber]);

  // Handle branch switch
  const handleBranchChange = (newBranchId: string) => {
    setSelectedBranchId(newBranchId);
    loadPlanData(newBranchId, selectedAmendmentNumber);
  };

  // Handle inline progress changes in the amendment table
  const handleProgressChange = (
    actId: string,
    field: 'physicalProgress' | 'physicalProgressPct' | 'financialProgress' | 'financialProgressPct',
    val: any
  ) => {
    setActivities((prev) =>
      prev.map((a) => (a.id === actId ? { ...a, [field]: val } : a))
    );
  };

  // Batch save all progress numbers for the current amendment
  const handleSaveAllProgress = async () => {
    try {
      setIsSavingProgress(true);
      const payload = {
        activities: activities.map((a) => ({
          id: a.id,
          physicalProgress: a.physicalProgress || '',
          physicalProgressPct: a.physicalProgressPct || '',
          financialProgress: a.financialProgress !== undefined && !isNaN(Number(a.financialProgress)) ? Number(a.financialProgress) : undefined,
          financialProgressPct: a.financialProgressPct || '',
        })),
      };
      const res = await fetch('/api/annual-plan/activities', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        broadcastDataChange('AIP_ACTIVITIES_SAVED');
        setProgressSavedSuccess(true);
        setTimeout(() => setProgressSavedSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Failed to save progress updates:', err);
    } finally {
      setIsSavingProgress(false);
    }
  };

  // Save directly editable fields in the sheet
  const handleSaveHeaderFields = async () => {
    try {
      setIsSavingHeader(true);
      const res = await fetch('/api/annual-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: plan?.id,
          branchId: branchInfo?.id || selectedBranchId,
          branchName: branchInfo?.name,
          year: selectedYear,
          amendmentNumber: selectedAmendmentNumber,
          mainResponsibility: mainResp,
          mainContactNo: mainContact,
          overallResponsibility: overallResp,
          overallContactNo: overallContact,
          phaseTitle: formPhaseTitle,
          targetTitle: formTargetTitle,
          progressStartDate: progressRangeStart,
          progressEndDate: progressRangeEnd,
        }),
      });
      if (res.ok) {
        setHeaderSavedSuccess(true);
        setTimeout(() => setHeaderSavedSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Error saving header fields:', err);
    } finally {
      setIsSavingHeader(false);
    }
  };

  // Calculations for bottom Total rows - computed with exact cent-level precision
  const totals = useMemo(() => {
    // 1. Total Estimated Cost (in Millions, precise to 1 cent: 10^-8 Mn)
    const totalEstimatedCost = roundToCentInMn(
      activities.reduce((sum, a) => sum + parseAmountToMn(a.estimatedCost), 0)
    );

    // 2. Monthly Financial Totals
    const monthlyFinancial = Array(12).fill(0);
    activities.forEach((act) => {
      (act.financialMonths || []).forEach((val, idx) => {
        if (idx < 12) {
          monthlyFinancial[idx] = roundToCentInMn(monthlyFinancial[idx] + parseAmountToMn(val));
        }
      });
    });

    // 3. Quarterly Cumulative Financial Totals
    const q1Fin = roundToCentInMn(monthlyFinancial[0] + monthlyFinancial[1] + monthlyFinancial[2]);
    const q2Fin = roundToCentInMn(q1Fin + monthlyFinancial[3] + monthlyFinancial[4] + monthlyFinancial[5]);
    const q3Fin = roundToCentInMn(q2Fin + monthlyFinancial[6] + monthlyFinancial[7] + monthlyFinancial[8]);
    const q4Fin = roundToCentInMn(q3Fin + monthlyFinancial[9] + monthlyFinancial[10] + monthlyFinancial[11]);
    const quarterlyFinancial = [q1Fin, q2Fin, q3Fin, q4Fin];

    // 4. Monthly Physical Progress Totals
    const n = activities.length || 1;
    const monthlyPhysicalSums = Array(12).fill(0);
    activities.forEach((act) => {
      (act.physicalMonths || []).forEach((val, idx) => {
        if (idx < 12) {
          const raw = String(val || '').replace('%', '').trim();
          const num = parseFloat(raw);
          if (!isNaN(num)) monthlyPhysicalSums[idx] += num;
        }
      });
    });

    const monthlyPhysical = monthlyPhysicalSums.map((sum) => Math.round((sum / n) * 10) / 10);

    // 5. Quarterly Cumulative Physical Targets
    const q1Phys = Math.round((monthlyPhysical[0] + monthlyPhysical[1] + monthlyPhysical[2]) * 10) / 10;
    const q2Phys = Math.round((q1Phys + monthlyPhysical[3] + monthlyPhysical[4] + monthlyPhysical[5]) * 10) / 10;
    const q3Phys = Math.round((q2Phys + monthlyPhysical[6] + monthlyPhysical[7] + monthlyPhysical[8]) * 10) / 10;
    const q4Phys = activities.length > 0 ? 100 : 0;
    const quarterlyPhysical = [q1Phys, q2Phys, q3Phys, q4Phys];

    // 6. Progress Totals
    const totalFinancialProgress = roundToCentInMn(
      activities.reduce((sum, a) => sum + parseAmountToMn(a.financialProgress), 0)
    );
    const overallFinancialProgressPct = totalEstimatedCost > 0
      ? `${Math.round((totalFinancialProgress / totalEstimatedCost) * 1000) / 10}%`
      : '';

    let physicalProgressSum = 0;
    let physicalProgressCount = 0;
    activities.forEach((a) => {
      if (a.physicalProgressPct) {
        const num = parseFloat(String(a.physicalProgressPct).replace('%', '').trim());
        if (!isNaN(num)) {
          physicalProgressSum += num;
          physicalProgressCount++;
        }
      }
    });
    const overallPhysicalProgressPct = physicalProgressCount > 0
      ? `${Math.round((physicalProgressSum / physicalProgressCount) * 10) / 10}%`
      : '';

    return {
      totalEstimatedCost,
      monthlyFinancial,
      quarterlyFinancial,
      monthlyPhysical,
      quarterlyPhysical,
      totalFinancialProgress,
      overallFinancialProgressPct,
      totalPhysicalProgress: '',
      overallPhysicalProgressPct,
    };
  }, [activities]);

  // Dedicated Landscape PDF Export for Official Matrix (Optimized for paper-saving & filing)
  const handleExportLandscapePdf = () => {
    const headers = [
      'Output #',
      'Act #',
      'Main Activities',
      'Vote No',
      'Est. Cost (Mn)',
      'Remark',
      'J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D',
      'Q1', 'Q2', 'Q3', 'Q4',
      'Progress %',
      'Responsible Officer',
    ];

    const rows: (string | number)[][] = activities.map((a) => {
      const fMonths = a.financialMonths || Array(12).fill(0);
      return [
        a.outputNo || '1',
        a.activityCode || '-',
        a.activity || '-',
        a.voteNumber || '-',
        formatMillion(a.estimatedCost),
        a.remarks || '-',
        ...fMonths.map((m: any) => (Number(m) > 0 ? formatMillion(m) : '-')),
        formatMillion(a.financialQ1),
        formatMillion(a.financialQ2),
        formatMillion(a.financialQ3),
        formatMillion(a.financialQ4),
        a.physicalProgressPct || a.targetQ4 || '100%',
        a.responsibleOfficer || mainResp || '-',
      ];
    });

    // Add Totals Row with cent precision
    rows.push([
      'TOTAL',
      '',
      'Cumulative Plan Totals',
      '',
      formatMillion(totals.totalEstimatedCost),
      '',
      ...totals.monthlyFinancial.map((m: number) => (m > 0 ? formatMillion(m) : '-')),
      formatMillion(totals.quarterlyFinancial[0]),
      formatMillion(totals.quarterlyFinancial[1]),
      formatMillion(totals.quarterlyFinancial[2]),
      formatMillion(totals.quarterlyFinancial[3]),
      totals.overallPhysicalProgressPct || '0%',
      '',
    ]);

    downloadAsPdfReport(
      `Annual Implementation Plan (AIP) Matrix — FY ${selectedYear}`,
      `Official Implementation Matrix • Branch: ${branchInfo?.name || 'MOE Branch'} • Status: ${plan?.status || 'Draft'} • Version: ${selectedAmendmentNumber === 0 ? 'Original Baseline' : `Amendment 0${selectedAmendmentNumber}`}`,
      headers,
      rows,
      [
        { label: 'Total Budget', value: `Rs. ${formatMillion(totals.totalEstimatedCost)} Mn (${formatRupees(totals.totalEstimatedCost, true)})` },
        { label: 'Total Activities', value: activities.length },
        { label: 'Physical Progress', value: totals.overallPhysicalProgressPct || '0%' },
        { label: 'Financial Progress', value: `Rs. ${formatMillion(totals.totalFinancialProgress)} Mn (${formatRupees(totals.totalFinancialProgress, true)})` },
        { label: 'Baseline Version', value: selectedAmendmentNumber === 0 ? 'Original Plan' : `Amendment 0${selectedAmendmentNumber}` },
      ],
      'landscape',
      {
        branchName: branchInfo?.name || 'Ministry of Education Branch',
        mainResponsibility: `${mainResp || 'Subject Officer'} (${mainContact || 'N/A'})`,
        overallResponsibility: `${overallResp || 'Director / HOD'} (${overallContact || 'N/A'})`,
        fiscalYear: selectedYear,
        version: selectedAmendmentNumber === 0 ? 'Original Baseline Plan' : `Amendment 0${selectedAmendmentNumber}`,
      }
    );
  };

  // Tile 1: Budget Export Data with Landscape orientation
  const budgetTileExportData: TileExportData = useMemo(() => ({
    filename: `MOE_AIP_Budget_Allocation_${(branchInfo?.name || 'Plan').replace(/\s+/g, '_')}_FY_${selectedYear}`,
    reportTitle: `AIP Budget Allocation Summary - FY ${selectedYear}`,
    subtitle: `Total Vote Allocation • Branch: ${branchInfo?.name || 'MOE'} • Version: ${selectedAmendmentNumber === 0 ? 'Original Baseline' : `Amendment 0${selectedAmendmentNumber}`}`,
    headers: ['Output #', 'Activity #', 'Main Activity', 'Vote Number', 'Estimated Cost (Rs. Mn)', 'Quarterly Phasing', 'Responsible Officer'],
    rows: activities.map((a) => [
      a.outputNo || '1',
      a.activityCode || '-',
      a.activity || '-',
      a.voteNumber || '-',
      formatMillion(a.estimatedCost),
      `Q1: ${formatMillion(a.financialQ1)} | Q2: ${formatMillion(a.financialQ2)} | Q3: ${formatMillion(a.financialQ3)} | Q4: ${formatMillion(a.financialQ4)}`,
      a.responsibleOfficer || mainResp || '-',
    ]),
    summaryStats: [
      { label: 'Total Budget (Mn)', value: `Rs. ${formatMillion(totals.totalEstimatedCost)} Mn` },
      { label: 'Exact Allocation', value: formatRupees(totals.totalEstimatedCost, true) },
      { label: 'Total Activities', value: activities.length },
      { label: 'Avg Cost per Act', value: `Rs. ${formatMillion(activities.length > 0 ? totals.totalEstimatedCost / activities.length : 0)} Mn` },
    ],
    copySummaryText: `MOE AIP FY ${selectedYear} Budget: Rs. ${formatMillion(totals.totalEstimatedCost)} Mn (${formatRupees(totals.totalEstimatedCost, true)}) across ${activities.length} activities for ${branchInfo?.name || 'Branch'}.`,
    orientation: 'landscape',
  }), [activities, branchInfo, selectedYear, selectedAmendmentNumber, totals, mainResp]);

  // Tile 2: Activities Directory Export Data
  const activitiesTileExportData: TileExportData = useMemo(() => ({
    filename: `MOE_AIP_Activities_Directory_${(branchInfo?.name || 'Plan').replace(/\s+/g, '_')}_FY_${selectedYear}`,
    reportTitle: `AIP Implementation Activities Directory - FY ${selectedYear}`,
    subtitle: `Activities Status: ${completedActivitiesCount} Completed • ${inProgressActivitiesCount} Active • ${scheduledActivitiesCount} Scheduled`,
    headers: ['Output #', 'Activity #', 'Main Activity', 'Vote No', 'Estimated Cost (Mn)', 'Physical Progress %', 'Responsible Officer'],
    rows: activities.map((a) => [
      a.outputNo || '1',
      a.activityCode || '-',
      a.activity || '-',
      a.voteNumber || '-',
      formatMillion(a.estimatedCost),
      a.physicalProgressPct || '0%',
      a.responsibleOfficer || mainResp || '-',
    ]),
    summaryStats: [
      { label: 'Total Activities', value: activities.length },
      { label: 'Completed (100%)', value: completedActivitiesCount },
      { label: 'In Progress', value: inProgressActivitiesCount },
      { label: 'Scheduled', value: scheduledActivitiesCount },
    ],
    copySummaryText: `MOE AIP FY ${selectedYear} Activities (${branchInfo?.name || 'Branch'}): Total ${activities.length} activities (${completedActivitiesCount} completed, ${inProgressActivitiesCount} in progress, ${scheduledActivitiesCount} scheduled).`,
    orientation: 'landscape',
  }), [activities, branchInfo, selectedYear, totals, mainResp, completedActivitiesCount, inProgressActivitiesCount, scheduledActivitiesCount]);

  // Tile 3: Physical Milestone Targets Export Data
  const physicalTileExportData: TileExportData = useMemo(() => ({
    filename: `MOE_AIP_Physical_Milestones_${(branchInfo?.name || 'Plan').replace(/\s+/g, '_')}_FY_${selectedYear}`,
    reportTitle: `AIP Physical Milestone Targets - FY ${selectedYear}`,
    subtitle: `Quarterly Milestone Progress Matrix • Overall Target: ${totals.overallPhysicalProgressPct || '0%'}`,
    headers: ['Output #', 'Activity #', 'Main Activity', 'Q1 Target', 'Q2 Target', 'Q3 Target', 'Q4 Target', 'Achieved %', 'Responsible Officer'],
    rows: activities.map((a) => [
      a.outputNo || '1',
      a.activityCode || '-',
      a.activity || '-',
      a.targetQ1 || '-',
      a.targetQ2 || '-',
      a.targetQ3 || '-',
      a.targetQ4 || '100%',
      a.physicalProgressPct || '0%',
      a.responsibleOfficer || mainResp || '-',
    ]),
    summaryStats: [
      { label: 'Overall Progress', value: totals.overallPhysicalProgressPct || '0%' },
      { label: 'Activities Tracked', value: activities.length },
      { label: 'Completed Milestones', value: `${completedActivitiesCount} / ${activities.length}` },
    ],
    copySummaryText: `MOE AIP FY ${selectedYear} Physical Progress (${branchInfo?.name || 'Branch'}): Overall achieved ${totals.overallPhysicalProgressPct || '0%'} across ${activities.length} milestone activities.`,
    orientation: 'landscape',
  }), [activities, branchInfo, selectedYear, totals, mainResp, completedActivitiesCount]);

  // Tile 4: Financial Phasing & Disbursement Export Data
  const disbursementTileExportData: TileExportData = useMemo(() => ({
    filename: `MOE_AIP_Financial_Disbursement_${(branchInfo?.name || 'Plan').replace(/\s+/g, '_')}_FY_${selectedYear}`,
    reportTitle: `AIP Financial Disbursement & Phasing - FY ${selectedYear}`,
    subtitle: `Disbursement Progress: Rs. ${formatMillion(totals.totalFinancialProgress)} Mn (${totals.overallFinancialProgressPct || '0%'}) of Rs. ${formatMillion(totals.totalEstimatedCost)} Mn`,
    headers: ['Output #', 'Activity #', 'Main Activity', 'Allocation (Mn)', 'Disbursed (Mn)', 'Disbursed %', 'Q1 (Mn)', 'Q2 (Mn)', 'Q3 (Mn)', 'Q4 (Mn)', 'Responsible Officer'],
    rows: activities.map((a) => [
      a.outputNo || '1',
      a.activityCode || '-',
      a.activity || '-',
      formatMillion(a.estimatedCost),
      formatMillion(a.financialProgress),
      a.financialProgressPct || '0%',
      formatMillion(a.financialQ1),
      formatMillion(a.financialQ2),
      formatMillion(a.financialQ3),
      formatMillion(a.financialQ4),
      a.responsibleOfficer || mainResp || '-',
    ]),
    summaryStats: [
      { label: 'Total Allocation', value: `Rs. ${formatMillion(totals.totalEstimatedCost)} Mn` },
      { label: 'Disbursed', value: `Rs. ${formatMillion(totals.totalFinancialProgress)} Mn` },
      { label: 'Exact Disbursed', value: formatRupees(totals.totalFinancialProgress, true) },
      { label: 'Disbursement %', value: totals.overallFinancialProgressPct || '0%' },
    ],
    copySummaryText: `MOE AIP FY ${selectedYear} Disbursement (${branchInfo?.name || 'Branch'}): Rs. ${formatMillion(totals.totalFinancialProgress)} Mn (${formatRupees(totals.totalFinancialProgress, true)}) disbursed (${totals.overallFinancialProgressPct || '0%'} of Rs. ${formatMillion(totals.totalEstimatedCost)} Mn).`,
    orientation: 'landscape',
  }), [activities, branchInfo, selectedYear, totals, mainResp]);

  // Tile 5: Plan Status & Revision Record Export Data
  const statusTileExportData: TileExportData = useMemo(() => ({
    filename: `MOE_AIP_Plan_Status_Revision_${(branchInfo?.name || 'Plan').replace(/\s+/g, '_')}_FY_${selectedYear}`,
    reportTitle: `AIP Plan Status & Revision Record - FY ${selectedYear}`,
    subtitle: `Status: ${plan?.status || 'Draft'} • Version: ${selectedAmendmentNumber === 0 ? 'Original Baseline' : `Amendment 0${selectedAmendmentNumber}`}`,
    headers: ['Fiscal Year', 'Branch Name', 'Plan Status', 'Revision Version', 'Submitted Date', 'Approved Date', 'Activities Count', 'Total Budget (Mn)'],
    rows: [[
      selectedYear,
      branchInfo?.name || 'MOE Branch',
      plan?.status || 'Draft',
      selectedAmendmentNumber === 0 ? 'Original Baseline Plan' : (currentAmendment?.title || `Amendment 0${selectedAmendmentNumber}`),
      plan?.submittedAt ? new Date(plan.submittedAt).toLocaleDateString() : 'Not Submitted',
      plan?.approvedAt ? new Date(plan.approvedAt).toLocaleDateString() : 'Pending',
      activities.length,
      `Rs. ${formatMillion(totals.totalEstimatedCost)} Mn`,
    ]],
    summaryStats: [
      { label: 'Plan Status', value: plan?.status || 'Draft' },
      { label: 'Revision', value: selectedAmendmentNumber === 0 ? 'Baseline' : `Amend 0${selectedAmendmentNumber}` },
      { label: 'Total Activities', value: activities.length },
      { label: 'Exact Budget', value: formatRupees(totals.totalEstimatedCost, true) },
    ],
    copySummaryText: `MOE AIP FY ${selectedYear} Status (${branchInfo?.name || 'Branch'}): ${plan?.status || 'Draft'} (${selectedAmendmentNumber === 0 ? 'Original Baseline' : `Amendment 0${selectedAmendmentNumber}`}), Total Budget: Rs. ${formatMillion(totals.totalEstimatedCost)} Mn (${formatRupees(totals.totalEstimatedCost, true)}).`,
    orientation: 'landscape',
  }), [activities, branchInfo, selectedYear, selectedAmendmentNumber, totals, plan, currentAmendment]);

  // Overall AIP Matrix Export Data for Main Page Header Menu
  const aipExportData: TileExportData = useMemo(() => ({
    filename: `MOE_AIP_Full_Matrix_${(branchInfo?.name || 'Plan').replace(/\s+/g, '_')}_FY_${selectedYear}`,
    reportTitle: `Annual Implementation Plan (AIP) Full Matrix - FY ${selectedYear}`,
    subtitle: `Official Implementation Matrix • Branch: ${branchInfo?.name || 'MOE Branch'} • Status: ${plan?.status || 'Draft'} • Version: ${selectedAmendmentNumber === 0 ? 'Original Baseline' : `Amendment 0${selectedAmendmentNumber}`}`,
    headers: ['Output #', 'Activity #', 'Main Activity', 'Vote Number', 'Estimated Cost (Rs. Mn)', 'Quarterly Phasing (Q1-Q4)', 'Progress %', 'Responsible Officer'],
    rows: activities.map((a) => [
      a.outputNo || '1',
      a.activityCode || '-',
      a.activity || '-',
      a.voteNumber || '-',
      formatMillion(a.estimatedCost),
      `Q1: ${formatMillion(a.financialQ1)} | Q2: ${formatMillion(a.financialQ2)} | Q3: ${formatMillion(a.financialQ3)} | Q4: ${formatMillion(a.financialQ4)}`,
      a.physicalProgressPct || '0%',
      a.responsibleOfficer || mainResp || '-',
    ]),
    summaryStats: [
      { label: 'Total Budget (Mn)', value: `Rs. ${formatMillion(totals.totalEstimatedCost)} Mn` },
      { label: 'Exact Budget', value: formatRupees(totals.totalEstimatedCost, true) },
      { label: 'Financial Progress', value: `Rs. ${formatMillion(totals.totalFinancialProgress || 0)} Mn` },
      { label: 'Exact Financial Progress', value: formatRupees(totals.totalFinancialProgress || 0, true) },
      { label: 'Total Activities', value: activities.length },
      { label: 'Physical Progress', value: totals.overallPhysicalProgressPct || '0%' },
    ],
    copySummaryText: `Annual Implementation Plan (AIP) FY ${selectedYear} (${branchInfo?.name || 'Branch'}): Total Budget Rs. ${formatMillion(totals.totalEstimatedCost)} Mn (${formatRupees(totals.totalEstimatedCost, true)}) across ${activities.length} activities.`,
    orientation: 'landscape',
  }), [activities, branchInfo, selectedYear, selectedAmendmentNumber, totals, plan, mainResp]);

  // Import PPB Approved Activities into AIP
  const handleImportPpbActivities = async () => {
    try {
      setIsImportingPpb(true);
      const bId = selectedBranchId || user?.organizationId || 'org-moe-ict';
      const res = await fetch('/api/annual-plan/import-budget-activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchId: bId,
          year: selectedYear,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'PPB activities imported successfully!');
        loadPlanData(bId, 0);
      } else {
        alert(data.message || data.error || 'Failed to import PPB activities.');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to import activities');
    } finally {
      setIsImportingPpb(false);
    }
  };

  // Open modal to add activity
  const handleOpenAddModal = () => {
    setEditingActivity(null);
    setFormOutputNo('1');
    setFormActivityCode(String(activities.length + 1));
    setFormActivity('');
    setFormVoteNumber(MOE_STANDARD_VOTE_NUMBERS[0].voteNumber);
    setFormEstimatedCost('');
    setFormResponsibleOfficer('');
    setFormRemarks('');
    setFormPlanningNotes('');
    setFormIsAddedByPlanning(false);
    setFormIsAdjustedByPlanning(false);
    setFormOriginalProposedCost('');
    setFormFinancialMonths(Array(12).fill(0));
    setFormPhysicalMonths(Array(12).fill('-'));
    setFormFinancialQ1(0);
    setFormFinancialQ2(0);
    setFormFinancialQ3(0);
    setFormFinancialQ4(0);
    setFormTargetQ1('-');
    setFormTargetQ2('-');
    setFormTargetQ3('-');
    setFormTargetQ4('100%');
    setFormPhysicalProgress('');
    setFormPhysicalProgressPct('');
    setFormFinancialProgress('');
    setFormFinancialProgressPct('');
    const initialCustom: Record<string, any> = {};
    (aipTemplate?.columns || []).forEach((c: any) => {
      if (!c.isSystemCore && c.defaultValue !== undefined) {
        initialCustom[c.key] = c.defaultValue;
      }
    });
    setFormCustomFields(initialCustom);
    setFormError('');
    setIsModalOpen(true);
  };

  // Open modal to edit existing activity
  const handleOpenEditModal = (act: AipActivity) => {
    setEditingActivity(act);
    setFormOutputNo(act.outputNo || '1');
    setFormActivityCode(act.activityCode || '1');
    setFormActivity(act.activity || '');
    setFormVoteNumber(act.voteNumber || MOE_STANDARD_VOTE_NUMBERS[0].voteNumber);
    setFormEstimatedCost(act.estimatedCost !== undefined && act.estimatedCost !== null ? String(act.estimatedCost) : '');
    setFormResponsibleOfficer(act.responsibleOfficer || '');
    setFormRemarks(act.remarks || '');
    setFormPlanningNotes(act.planningNotes || '');
    setFormIsAddedByPlanning(Boolean(act.isAddedByPlanning));
    setFormIsAdjustedByPlanning(Boolean(act.isAdjustedByPlanning));
    setFormOriginalProposedCost(act.originalProposedCost !== undefined ? String(act.originalProposedCost) : (act.estimatedCost !== undefined ? String(act.estimatedCost) : ''));

    const fin = act.financialMonths && act.financialMonths.length === 12
      ? [...act.financialMonths]
      : Array(12).fill(0);
    setFormFinancialMonths(fin);

    const phys = act.physicalMonths && act.physicalMonths.length === 12
      ? [...act.physicalMonths]
      : Array(12).fill('-');
    setFormPhysicalMonths(phys);

    setFormFinancialQ1(act.financialQ1 || 0);
    setFormFinancialQ2(act.financialQ2 || 0);
    setFormFinancialQ3(act.financialQ3 || 0);
    setFormFinancialQ4(act.financialQ4 || 0);

    setFormTargetQ1(act.targetQ1 || '-');
    setFormTargetQ2(act.targetQ2 || '-');
    setFormTargetQ3(act.targetQ3 || '-');
    setFormTargetQ4(act.targetQ4 || '100%');
    setFormPhysicalProgress(act.physicalProgress || '');
    setFormPhysicalProgressPct(act.physicalProgressPct || '');
    setFormFinancialProgress(act.financialProgress !== undefined && act.financialProgress !== null ? String(act.financialProgress) : '');
    setFormFinancialProgressPct(act.financialProgressPct || '');
    setFormCustomFields(act.customFields || {});

    setFormError('');
    setIsModalOpen(true);
  };

  // Live calculation of quarters in the form when user updates monthly numbers
  const handleFinancialMonthChange = (monthIdx: number, valStr: string) => {
    const num = parseFloat(valStr) || 0;
    const updated = [...formFinancialMonths];
    updated[monthIdx] = num;
    setFormFinancialMonths(updated);

    const q1 = updated[0] + updated[1] + updated[2];
    const q2 = q1 + updated[3] + updated[4] + updated[5];
    const q3 = q2 + updated[6] + updated[7] + updated[8];
    const q4 = q3 + updated[9] + updated[10] + updated[11];
    setFormFinancialQ1(roundToCentInMn(q1));
    setFormFinancialQ2(roundToCentInMn(q2));
    setFormFinancialQ3(roundToCentInMn(q3));
    setFormFinancialQ4(roundToCentInMn(q4));
  };

  const handlePhysicalMonthChange = (monthIdx: number, valStr: string) => {
    const updated = [...formPhysicalMonths];
    updated[monthIdx] = valStr;
    setFormPhysicalMonths(updated);

    const parseP = (v: string) => {
      const n = parseFloat(String(v || '').replace('%', '').trim());
      return isNaN(n) ? 0 : n;
    };

    const q1 = parseP(updated[0]) + parseP(updated[1]) + parseP(updated[2]);
    const q2 = q1 + parseP(updated[3]) + parseP(updated[4]) + parseP(updated[5]);
    const q3 = q2 + parseP(updated[6]) + parseP(updated[7]) + parseP(updated[8]);
    const q4 = q3 + parseP(updated[9]) + parseP(updated[10]) + parseP(updated[11]);

    if (q1 > 0) setFormTargetQ1(`${q1}%`);
    if (q2 > 0) setFormTargetQ2(`${q2}%`);
    if (q3 > 0) setFormTargetQ3(`${q3}%`);
    if (q4 > 0) setFormTargetQ4(`${q4}%`);
  };

  // Submit Activity Form (Add or Edit)
  const handleSaveActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formActivity.trim()) {
      setFormError('Please enter the Main Activities description.');
      return;
    }

    try {
      setFormSubmitting(true);
      setFormError('');

      const parsedCost = parseFloat(formEstimatedCost) || 0;
      const wasAdjusted = isPrivileged && editingActivity && (
        parsedCost !== Number(editingActivity.estimatedCost) ||
        formActivity.trim() !== (editingActivity.activity || '').trim() ||
        formVoteNumber !== editingActivity.voteNumber
      );

      const payload = {
        id: editingActivity?.id,
        planId: plan?.id,
        branchId: branchInfo?.id || selectedBranchId,
        branchName: branchInfo?.name,
        year: selectedYear,
        outputNo: formOutputNo,
        activityCode: formActivityCode || String(activities.length + 1),
        activity: formActivity,
        voteNumber: formVoteNumber,
        estimatedCost: parsedCost,
        responsibleOfficer: formResponsibleOfficer,
        remarks: formRemarks,
        isAddedByPlanning: formIsAddedByPlanning,
        isAdjustedByPlanning: formIsAdjustedByPlanning || Boolean(wasAdjusted),
        originalProposedCost: formOriginalProposedCost ? parseFloat(formOriginalProposedCost) : (editingActivity?.originalProposedCost || parsedCost),
        planningNotes: formPlanningNotes,
        planningOfficerName: user?.name || user?.username,
        amendmentNumber: selectedAmendmentNumber,
        amendmentId: currentAmendment?.id,
        financialMonths: formFinancialMonths,
        physicalMonths: formPhysicalMonths,
        financialQ1: formFinancialQ1,
        financialQ2: formFinancialQ2,
        financialQ3: formFinancialQ3,
        financialQ4: formFinancialQ4,
        targetQ1: formTargetQ1,
        targetQ2: formTargetQ2,
        targetQ3: formTargetQ3,
        targetQ4: formTargetQ4,
        physicalProgress: formPhysicalProgress,
        physicalProgressPct: formPhysicalProgressPct,
        financialProgress: formFinancialProgress !== '' ? parseFloat(formFinancialProgress) : undefined,
        financialProgressPct: formFinancialProgressPct,
        customFields: formCustomFields,
      };

      const res = await fetch('/api/annual-plan/activities', {
        method: editingActivity ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsModalOpen(false);
        await loadPlanData();
      } else {
        const data = await res.json();
        setFormError(data.error || 'Failed to save activity');
      }
    } catch (err: any) {
      setFormError(err.message || 'Error submitting activity');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Open Top-Down Planning Initiative Modal (Planning Branch)
  const handleOpenPlanningAddModal = () => {
    setPlanningAddBranchId(selectedBranchId || branchInfo?.id || 'org-moe-ict');
    setPlanningAddTitle('');
    setPlanningAddCost('');
    setPlanningAddVoteNumber(MOE_STANDARD_VOTE_NUMBERS[0].voteNumber);
    setPlanningAddPeriod('Annual');
    setPlanningAddNotes('Initiated directly under Government Vision and Ministry Planning Policy Mandate.');
    setPlanningAddOfficer(branchInfo?.name ? `${branchInfo.name.replace(/^MOE\s+/i, '')} Divisional Lead` : 'Branch Lead Officer');
    setIsPlanningAddModalOpen(true);
  };

  // Submit Top-Down Planning Initiative
  const handleSavePlanningAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planningAddTitle.trim()) {
      alert('Please enter the Planning Initiative Title.');
      return;
    }
    const cost = parseFloat(planningAddCost);
    if (isNaN(cost) || cost <= 0) {
      alert('Please enter a valid Voted Budget Allocation (in Rs. Mn).');
      return;
    }

    try {
      setIsSubmittingPlanningAdd(true);

      const targetBr = moeBranches.find((b) => b.id === planningAddBranchId) || branchInfo;
      const finMonths = Array(12).fill(0);
      const physMonths = Array(12).fill('-');

      if (planningAddPeriod === 'Q1') {
        finMonths[0] = roundToCentInMn(cost * 0.3);
        finMonths[1] = roundToCentInMn(cost * 0.4);
        finMonths[2] = roundToCentInMn(cost - (finMonths[0] + finMonths[1]));
        physMonths[0] = '30%'; physMonths[1] = '70%'; physMonths[2] = '100%';
      } else if (planningAddPeriod === 'Q2') {
        finMonths[3] = roundToCentInMn(cost * 0.3);
        finMonths[4] = roundToCentInMn(cost * 0.4);
        finMonths[5] = roundToCentInMn(cost - (finMonths[3] + finMonths[4]));
        physMonths[3] = '30%'; physMonths[4] = '70%'; physMonths[5] = '100%';
      } else if (planningAddPeriod === 'Q3') {
        finMonths[6] = roundToCentInMn(cost * 0.3);
        finMonths[7] = roundToCentInMn(cost * 0.4);
        finMonths[8] = roundToCentInMn(cost - (finMonths[6] + finMonths[7]));
        physMonths[6] = '30%'; physMonths[7] = '70%'; physMonths[8] = '100%';
      } else if (planningAddPeriod === 'Q4') {
        finMonths[9] = roundToCentInMn(cost * 0.3);
        finMonths[10] = roundToCentInMn(cost * 0.4);
        finMonths[11] = roundToCentInMn(cost - (finMonths[9] + finMonths[10]));
        physMonths[9] = '30%'; physMonths[10] = '70%'; physMonths[11] = '100%';
      } else {
        const perM = roundToCentInMn(cost / 12);
        let sum = 0;
        for (let m = 0; m < 11; m++) {
          finMonths[m] = perM;
          sum = roundToCentInMn(sum + perM);
          physMonths[m] = `${Math.round(((m + 1) / 12) * 100)}%`;
        }
        finMonths[11] = roundToCentInMn(cost - sum);
        physMonths[11] = '100%';
      }

      const q1Fin = roundToCentInMn(finMonths[0] + finMonths[1] + finMonths[2]);
      const q2Fin = roundToCentInMn(q1Fin + finMonths[3] + finMonths[4] + finMonths[5]);
      const q3Fin = roundToCentInMn(q2Fin + finMonths[6] + finMonths[7] + finMonths[8]);
      const q4Fin = roundToCentInMn(q3Fin + finMonths[9] + finMonths[10] + finMonths[11]);

      const actNum = activities.length + 1;
      const payload = {
        branchId: planningAddBranchId,
        branchName: targetBr?.name || 'MOE Branch',
        year: selectedYear,
        amendmentNumber: selectedAmendmentNumber,
        outputNo: '1',
        activityCode: String(actNum),
        activity: planningAddTitle.trim(),
        voteNumber: planningAddVoteNumber.trim() || '126-02-03-2502',
        estimatedCost: cost,
        responsibleOfficer: planningAddOfficer.trim() || 'Branch Lead Officer',
        remarks: `Top-down Priority added by Planning Division (PPB). Vote: ${planningAddVoteNumber}`,
        isAddedByPlanning: true,
        isAdjustedByPlanning: false,
        planningNotes: planningAddNotes.trim(),
        planningOfficerName: user?.name || user?.username || 'Planning Division Officer',
        financialMonths: finMonths,
        physicalMonths: physMonths,
        financialQ1: q1Fin,
        financialQ2: q2Fin,
        financialQ3: q3Fin,
        financialQ4: q4Fin,
        targetQ1: planningAddPeriod === 'Q1' ? '100%' : planningAddPeriod === 'Annual' ? '25%' : '-',
        targetQ2: planningAddPeriod === 'Q2' ? '100%' : planningAddPeriod === 'Annual' ? '50%' : '-',
        targetQ3: planningAddPeriod === 'Q3' ? '100%' : planningAddPeriod === 'Annual' ? '75%' : '-',
        targetQ4: '100%',
      };

      const res = await fetch('/api/annual-plan/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsPlanningAddModalOpen(false);
        alert(`Successfully added Top-Down Planning Initiative to ${targetBr?.name || 'branch'}!`);
        await loadPlanData(planningAddBranchId);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to add planning initiative');
      }
    } catch (err: any) {
      alert(err.message || 'Error submitting planning initiative');
    } finally {
      setIsSubmittingPlanningAdd(false);
    }
  };

  // Submit Official Voted Plan Dispatch to Branch
  const handleDispatchVotedPlan = async () => {
    try {
      setIsDispatchingPlan(true);
      const targetBId = selectedBranchId || branchInfo?.id;
      const res = await fetch('/api/annual-plan/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchId: targetBId,
          year: selectedYear,
          amendmentNumber: selectedAmendmentNumber,
          dispatchNotes,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setIsDispatchModalOpen(false);
        alert(data.message || 'Official Voted Annual Plan dispatched to branch successfully!');
        await loadPlanData(targetBId);
      } else {
        alert(data.error || 'Failed to dispatch plan to branch.');
      }
    } catch (err: any) {
      alert(err.message || 'Error dispatching annual plan');
    } finally {
      setIsDispatchingPlan(false);
    }
  };

  // Quick Vote Number Assignment
  const handleSaveQuickVote = async (act: AipActivity, newVote: string) => {
    try {
      setIsSavingQuickVote(true);
      const res = await fetch('/api/annual-plan/activities', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: act.id,
          voteNumber: newVote,
        }),
      });
      if (res.ok) {
        setQuickVoteActivity(null);
        await loadPlanData();
      } else {
        alert('Failed to update Vote Number');
      }
    } catch (err) {
      console.error('Quick vote update error:', err);
    } finally {
      setIsSavingQuickVote(false);
    }
  };

  // Delete Activity
  const handleDeleteActivity = async (id: string, code: string) => {
    if (!confirm(`Are you sure you want to remove Activity ${code}?`)) return;

    try {
      const res = await fetch(`/api/annual-plan/activities?id=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await loadPlanData();
      }
    } catch (err) {
      console.error('Error deleting activity:', err);
    }
  };

  // Open Call for Amendment Modal (Planning Branch)
  const handleOpenCallModal = () => {
    const nextNum = (amendments.length || 0) + 1;
    setCallTitle(`Amendment 0${nextNum} - Budget & Target Revision`);
    setCallCircular('');
    setCallDeadline('');
    setCallNotes('');
    setCallSuccessMsg('');
    setCallSendMode('all');
    setCallTargetBranchIds([]);
    setIsCallModalOpen(true);
  };

  // Submit Call for Amendment (Planning Branch)
  const handleCreateAmendmentCall = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsCalling(true);
      const res = await fetch('/api/annual-plan/amendments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: selectedYear,
          title: callTitle,
          circularRef: callCircular,
          deadline: callDeadline,
          notes: callNotes,
          progressStartDate: callProgressStart,
          progressEndDate: callProgressEnd,
          targetBranchIds: callSendMode === 'selected' ? callTargetBranchIds : [],
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setCallSuccessMsg(json.message || 'Amendment broadcasted successfully!');
        setTimeout(() => {
          setIsCallModalOpen(false);
          setCallSuccessMsg('');
        }, 2000);
        // Refresh and switch to new amendment
        const createdNum = json.amendment?.amendmentNumber || (amendments.length + 1);
        setSelectedAmendmentNumber(createdNum);
        await loadPlanData(undefined, createdNum);
      } else {
        alert(json.error || 'Failed to call amendment');
      }
    } catch (err: any) {
      alert(err.message || 'Error calling amendment');
    } finally {
      setIsCalling(false);
    }
  };

  // Submit Plan (Original or Amendment) to Planning Branch (Branch Officers)
  const handleSubmitPlanToPlanning = async () => {
    try {
      setIsSubmittingAmendment(true);
      const res = await fetch('/api/annual-plan/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: plan?.id,
          branchId: branchInfo?.id || user?.organizationId,
          year: selectedYear,
          amendmentNumber: selectedAmendmentNumber,
          notes: submitNotes,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setSubmitSuccessMsg(json.message || 'Submitted successfully!');
        setTimeout(() => {
          setIsSubmitModalOpen(false);
          setSubmitSuccessMsg('');
        }, 2000);
        await loadPlanData();
      } else {
        alert(json.error || 'Failed to submit plan');
      }
    } catch (err: any) {
      alert(err.message || 'Error submitting plan');
    } finally {
      setIsSubmittingAmendment(false);
    }
  };

  // Handle Open Monthly Progress Return Modal
  const handleOpenMonthlyReturnModal = (monthNum: number) => {
    setSelectedReportingMonth(monthNum);
    const existing = monthlyReturns.find((r) => r.month === monthNum);

    const items = activities.map((act) => {
      const existingItem = existing?.activityProgressItems?.find((it: any) => it.activityId === act.id);
      const plannedFin = act.financialMonths?.[monthNum - 1] ?? 0;
      const plannedTgt = act.physicalMonths?.[monthNum - 1] ?? '-';

      const prevPct = existingItem !== undefined
        ? existingItem.actualPhysicalPct
        : parseFloat(String(act.physicalProgressPct || '0').replace('%', '')) || (plannedTgt !== '-' ? 100 : 0);

      const prevFin = existingItem !== undefined
        ? existingItem.actualFinancialMonth
        : (act.financialMonths?.[monthNum - 1] ?? plannedFin);

      return {
        activityId: act.id,
        activityCode: act.activityCode || 'ACT',
        activityTitle: act.activity,
        voteNumber: act.voteNumber || '-',
        plannedTargetMonth: plannedTgt,
        plannedFinancialMonth: roundToCentInMn(plannedFin),
        actualPhysicalPct: prevPct,
        actualFinancialMonth: roundToCentInMn(prevFin),
        status: (existingItem?.status || (prevPct >= 100 ? 'Completed' : prevPct > 0 ? 'On Track' : 'On Track')) as any,
        implementationNotes: existingItem?.implementationNotes || '',
      };
    });

    setMonthlyReturnItems(items);
    setMonthlyReturnRemarks(existing?.overallRemarks || '');
    setIsMonthlyReturnModalOpen(true);
  };

  // Handle Monthly Progress Return Submit to M&E
  const handleMonthlyReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetBranch = branchInfo?.id || selectedBranchId || user?.organizationId;
    if (!targetBranch) return;

    try {
      setIsSubmittingMonthlyReturn(true);
      const res = await fetch('/api/monitoring/monthly-returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchId: targetBranch,
          year: selectedYear,
          month: selectedReportingMonth,
          activityUpdates: monthlyReturnItems,
          overallRemarks: monthlyReturnRemarks,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSubmitSuccessMsg(`✅ Month ${selectedReportingMonth} Progress Return submitted to ${data.targetMonitoringOrgName || 'Monitoring & Performance Branch'}!`);
        setIsMonthlyReturnModalOpen(false);
        broadcastDataChange('AIP_MONTHLY_RETURN_SUBMITTED', targetBranch);
        await loadPlanData();
        setTimeout(() => setSubmitSuccessMsg(''), 6000);
      } else {
        alert(data.error || 'Failed to submit monthly progress return');
      }
    } catch (err: any) {
      alert(err.message || 'Error submitting monthly return');
    } finally {
      setIsSubmittingMonthlyReturn(false);
    }
  };

  // Approve or Return Plan (Planning Branch & Admin)
  const [isApproving, setIsApproving] = useState(false);
  const handleApproveOrReturnPlan = async (action: 'Approve' | 'Return', notesPrompt?: string) => {
    const planLabel = selectedAmendmentNumber === 0 ? 'Original Implementation Plan' : `Amendment 0${selectedAmendmentNumber}`;
    const confirmMsg = action === 'Approve'
      ? `Approve this ${planLabel} for ${branchInfo?.name}?`
      : `Return this ${planLabel} to ${branchInfo?.name} for revision?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      setIsApproving(true);
      const res = await fetch('/api/annual-plan/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchId: branchInfo?.id || selectedBranchId,
          year: selectedYear,
          amendmentNumber: selectedAmendmentNumber,
          action,
          notes: notesPrompt || '',
        }),
      });
      const json = await res.json();
      if (res.ok) {
        alert(json.message);
        await loadPlanData();
      } else {
        alert(json.error || 'Failed to process approval');
      }
    } catch (err: any) {
      alert(err.message || 'Error processing approval');
    } finally {
      setIsApproving(false);
    }
  };

  // Planning Branch: Send Amendment to This Branch
  const [isDispatching, setIsDispatching] = useState(false);
  const handleDispatchAmendmentToBranch = async () => {
    if (selectedAmendmentNumber === 0) return;
    const branchName = branchInfo?.name || 'this branch';
    const confirmMsg = `Send Amendment 0${selectedAmendmentNumber} to ${branchName}?\n\nPlanning Branch has prepared the activities & baseline targets. Once sent, ${branchName} will be notified to enter their actual progress (green & peach columns) and submit back.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      setIsDispatching(true);
      const res = await fetch('/api/annual-plan/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchId: branchInfo?.id || selectedBranchId,
          year: selectedYear,
          amendmentNumber: selectedAmendmentNumber,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        alert(json.message);
        await loadPlanData();
      } else {
        alert(json.error || 'Failed to send amendment to branch');
      }
    } catch (err: any) {
      alert(err.message || 'Error sending amendment to branch');
    } finally {
      setIsDispatching(false);
    }
  };

  // Planning Branch: Remove / Delete Amendment
  const [isDeletingAmendment, setIsDeletingAmendment] = useState(false);
  const handleDeleteAmendment = async (targetAmendmentNum?: number, targetAmendmentTitle?: string) => {
    const amendNum = targetAmendmentNum !== undefined ? targetAmendmentNum : selectedAmendmentNumber;
    if (amendNum === 0) return;
    const title = targetAmendmentTitle || currentAmendment?.title || `Amendment 0${amendNum}`;

    const confirmMsg = `Are you sure you want to permanently remove "${title}" (Amendment 0${amendNum})?\n\nThis will delete all revision activities, baseline targets, and branch submissions associated with this amendment for ${selectedYear}.\n\nThis action cannot be undone.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      setIsDeletingAmendment(true);
      const res = await fetch(`/api/annual-plan/amendments?year=${selectedYear}&amendmentNumber=${amendNum}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (res.ok) {
        alert(json.message || 'Amendment removed successfully');
        setSelectedAmendmentNumber(0);
        await loadPlanData(selectedBranchId, 0);
      } else {
        alert(json.error || 'Failed to remove amendment');
      }
    } catch (err: any) {
      alert(err.message || 'Error removing amendment');
    } finally {
      setIsDeletingAmendment(false);
    }
  };

  // Export to CSV matching MOE Matrix
  const handleExportCSV = () => {
    const headers = [
      'Outcome/Output No',
      'Activity No',
      'Main Activities',
      'Vote Number',
      'Allocation/Estimated Cost (Mn)',
      'Remarks',
      'J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D',
      'Q1 (Cumulative)', 'Q2 (Cumulative)', 'Q3 (Cumulative)', 'Q4 (Cumulative)',
      'Responsibility'
    ];

    const rows: string[][] = [];

    // Header info rows
    rows.push(['3. Implementation Phase']);
    rows.push([`Overall Physical and Financial Targets ${selectedYear} - ${branchInfo?.name || 'MOE Branch'}`]);
    rows.push([`Main responsibility: ${mainResp}`, '', '', '', '', '', `Contact No: ${mainContact}`]);
    rows.push([`Overall responsibility: ${overallResp}`, '', '', '', '', '', `Contact No: ${overallContact}`]);
    rows.push([]);
    rows.push(headers);

    // Activity rows (2 sub-rows per activity)
    activities.forEach((a) => {
      // Row 1: Financial
      rows.push([
        `"${a.outputNo}"`,
        `"${a.activityCode}"`,
        `"${(a.activity || '').replace(/"/g, '""')}"`,
        `"${a.voteNumber || '-'}"`,
        String(a.estimatedCost || '0'),
        'Financial (Rs. Mn)',
        ...(a.financialMonths || Array(12).fill(0)).map(String),
        String(a.financialQ1 || 0),
        String(a.financialQ2 || 0),
        String(a.financialQ3 || 0),
        String(a.financialQ4 || 0),
        `"${a.responsibleOfficer || ''}"`
      ]);

      // Row 2: Physical
      rows.push([
        '', '', '', '', '',
        'Physical (%)',
        ...(a.physicalMonths || Array(12).fill('-')).map((v) => `"${v}"`),
        `"${a.targetQ1 || '-'}"`,
        `"${a.targetQ2 || '-'}"`,
        `"${a.targetQ3 || '-'}"`,
        `"${a.targetQ4 || '100%'}"`,
        ''
      ]);
    });

    // Totals rows
    rows.push([
      'Total', '', '', '',
      String(totals.totalEstimatedCost),
      'Financial (Rs. Mn) Cumulative',
      ...totals.monthlyFinancial.map(String),
      ...totals.quarterlyFinancial.map(String),
      ''
    ]);
    rows.push([
      '', '', '', '', '',
      'Physical (%) Cumulative',
      ...totals.monthlyPhysical.map((p) => `${p}%`),
      ...totals.quarterlyPhysical.map((p) => `${p}%`),
      ''
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `MOE_${branchInfo?.name?.replace(/\s+/g, '_')}_AIP_${selectedYear}_Official_Matrix.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AppShell>
      <style jsx global>{`
        .page-container.aip-full-width {
          max-width: 100% !important;
          width: 100% !important;
          padding: 0.5rem 1.25rem !important;
          margin: 0 auto !important;
        }
        .aip-sheet-card {
          width: 100% !important;
          background: #ffffff;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.05);
          overflow: hidden;
        }
        .aip-table-wrapper {
          width: 100% !important;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }
        .aip-table {
          width: 100% !important;
          min-width: 100% !important;
          border-collapse: collapse;
          font-size: 0.8125rem;
          color: #1f2937;
        }
        .aip-table th, .aip-table td {
          border: 1px solid #cbd5e1;
          padding: 6px 8px;
          text-align: center;
          vertical-align: middle;
        }
        .aip-table th {
          background: #f8fafc;
          font-weight: 700;
          color: #374151;
        }
        .aip-table .header-sub-group {
          background: #f1f5f9;
          font-weight: 700;
          color: #1e293b;
        }
        .aip-table td.text-left {
          text-align: left;
        }
        .aip-table td.text-right {
          text-align: right;
        }
        .aip-table .type-financial {
          background: #fdf2f4;
          font-weight: 600;
          color: #7a1c2d;
        }
        .aip-table .type-physical {
          background: #f0fdf4;
          font-weight: 600;
          color: #166534;
        }
        .aip-table .total-row-fin {
          background: #fef2f2;
          font-weight: 700;
          color: #991b1b;
        }
        .aip-table .total-row-phys {
          background: #f0fdf4;
          font-weight: 700;
          color: #166534;
        }
        .mn-hover-cell {
          transition: background-color 0.15s ease, transform 0.1s ease;
          border-radius: 4px;
          padding: 1px 3px;
        }
        .mn-hover-cell:hover {
          background-color: rgba(0, 83, 78, 0.09) !important;
        }
        @media print {
          .no-print { display: none !important; }
          .app-sidebar, .app-header { display: none !important; }
          body { background: #ffffff !important; padding: 0 !important; font-size: 8pt !important; color: #0f172a !important; }
          .page-container { padding: 0 !important; max-width: 100% !important; width: 100% !important; margin: 0 !important; }
          .aip-sheet-card { border: none !important; box-shadow: none !important; width: 100% !important; }
          .aip-table { width: 100% !important; min-width: 100% !important; font-size: 7.2pt !important; border: 1px solid #64748b !important; }
          .aip-table th, .aip-table td { padding: 2.5px 3.5px !important; border: 0.75px solid #94a3b8 !important; }
          .print-filing-header { display: block !important; }
          .print-filing-footer { display: block !important; }
          thead { display: table-header-group !important; }
          tr { page-break-inside: avoid !important; }
          @page { size: A4 landscape; margin: 8mm 8mm 10mm 8mm; }
        }
      `}</style>

      <div className="page-container aip-full-width" style={{ maxWidth: '100%', width: '100%', padding: '0.5rem 1.25rem', boxSizing: 'border-box' }}>

        {/* ── Page Header & Controls ── */}
        <div className="no-print page-header" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '0.85rem',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
              <span style={{ fontSize: '1.6rem' }}>📅</span>
              <h1 className="page-title" style={{ fontSize: '1.5rem', fontWeight: 800, color: '#7a1c2d', margin: 0 }}>
                Annual Implementation Plan (AIP)
              </h1>
            </div>
            <p className="page-subtitle" style={{ margin: 0, fontSize: '0.82rem', color: '#6b7280' }}>
              Ministry of Education Official Format • Implementation Matrix &amp; Quarterly Targets
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            {/* Plan Approval / Status Pill */}
            {isPrivileged ? (
              plan?.status === 'Submitted' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <button
                    onClick={() => handleApproveOrReturnPlan('Approve')}
                    disabled={isApproving}
                    style={{
                      background: '#166534',
                      color: '#ffffff',
                      border: 'none',
                      padding: '0.45rem 1rem',
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      boxShadow: '0 2px 4px rgba(22, 101, 52, 0.25)',
                    }}
                    title="Approve this implementation plan"
                  >
                    <span>✅</span> {isApproving ? 'Approving...' : 'Approve Plan'}
                  </button>
                  <button
                    onClick={() => {
                      const notes = prompt('Enter remarks/reason for returning this plan for revision:');
                      if (notes !== null) handleApproveOrReturnPlan('Return', notes);
                    }}
                    disabled={isApproving}
                    style={{
                      background: '#fff',
                      color: '#b91c1c',
                      border: '1px solid #b91c1c',
                      padding: '0.45rem 0.8rem',
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                    title="Return plan to branch for revision"
                  >
                    <span>↩️</span> Return for Revision
                  </button>
                </div>
              ) : plan?.status === 'Approved' ? (
                <div style={{
                  background: '#dcfce7',
                  color: '#166534',
                  border: '1px solid #86efac',
                  padding: '0.45rem 0.85rem',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}>
                  <span>✅</span> Approved Plan
                </div>
              ) : null
            ) : (
              plan?.status === 'Approved' ? (
                <div style={{
                  background: '#dcfce7',
                  color: '#166534',
                  border: '1px solid #86efac',
                  padding: '0.45rem 0.85rem',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}>
                  <span>✅</span> Approved by Planning Branch
                </div>
              ) : plan?.status === 'Submitted' ? (
                <div style={{
                  background: '#fef3c7',
                  color: '#92400e',
                  border: '1px solid #fde68a',
                  padding: '0.45rem 0.85rem',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}>
                  <span>⏳</span> Submitted (Pending Approval)
                </div>
              ) : (
                <button
                  onClick={() => setIsSubmitModalOpen(true)}
                  style={{
                    background: '#166534',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.45rem 1rem',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    boxShadow: '0 2px 4px rgba(22, 101, 52, 0.25)',
                  }}
                  title={`Submit to ${relevantPlanningBranch?.planningAuthorityLabel || 'Planning Branch'} for Approval`}
                >
                  <span>📤</span> {selectedAmendmentNumber === 0 ? `Submit Plan to ${relevantPlanningBranch?.planningAuthorityLabel || 'Planning Branch'}` : `Submit Amendment 0${selectedAmendmentNumber}`}
                </button>
              )
            )}

            {/* Super Admin: AIP Template Configuration Link */}
            {Boolean(user?.adminLevel === 0 || user?.isSuperAdmin || user?.username === 'superadmin' || user?.roleName === 'Super Administrator') && (
              <Link
                href="/admin?tab=aip-templates"
                style={{
                  background: '#FEF3C7',
                  color: '#92400E',
                  border: '1px solid #FDE68A',
                  padding: '0.45rem 0.85rem',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  boxShadow: '0 1px 3px rgba(146, 64, 14, 0.1)',
                }}
                title="Super Admin Console: Configure AIP Templates and Column Specifications"
              >
                <span>⚙️</span> AIP Template: {aipTemplate?.name ? aipTemplate.name : 'Standard MoE'}
              </Link>
            )}

            {/* Primary Action Button: Add Activity */}
            {(selectedAmendmentNumber === 0 ? plan?.status !== 'Approved' : isPrivileged) && (
              <button
                onClick={handleOpenAddModal}
                style={{
                  background: '#7a1c2d',
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.45rem 1rem',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  boxShadow: '0 2px 5px rgba(122, 28, 45, 0.25)',
                }}
              >
                <span>➕</span> Add Activity
              </button>
            )}

            <TileActionMenu
              tileTitle="Annual Implementation Plan (AIP)"
              exportData={aipExportData}
              onRefresh={() => loadPlanData(selectedBranchId, selectedAmendmentNumber)}
              position="right"
            />
          </div>
        </div>

        {/* ── Toolbar Card (Selectors & Secondary Actions) ── */}
        <div
          className="no-print"
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '0.65rem 1rem',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.65rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}
        >
          {/* Selectors Group */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            {/* Year Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#f8fafc', padding: '3px 8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
              <span style={{ fontSize: '0.76rem', fontWeight: 600, color: '#475569' }}>Year:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                style={{
                  border: 'none',
                  outline: 'none',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  color: '#7a1c2d',
                  background: 'transparent',
                  cursor: 'pointer',
                }}
              >
                <option value="2027">2027</option>
                <option value="2026">2026</option>
                <option value="2028">2028</option>
              </select>
            </div>

            {/* Version / Amendment Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#f8fafc', padding: '3px 8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
              <span style={{ fontSize: '0.76rem', fontWeight: 600, color: '#475569' }}>Plan / Revision:</span>
              <SearchableSelect
                value={selectedAmendmentNumber}
                onChange={(e) => setSelectedAmendmentNumber(parseInt(e.target.value, 10))}
                style={{ minWidth: '160px' }}
              >
                <option value={0}>📋 Original Plan</option>
                {amendments.map((a) => (
                  <option key={a.id} value={a.amendmentNumber}>
                    🔄 Amendment 0{a.amendmentNumber}: {a.title} {a.deadline ? `(Due ${a.deadline})` : ''}
                  </option>
                ))}
              </SearchableSelect>
            </div>
          </div>

          {/* Action Buttons Group */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
            {/* Planning Branch / Admin Tools */}
            {isPrivileged && (
              <>
                <button
                  onClick={handleOpenCallModal}
                  style={{
                    background: '#8D153A',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.4rem 0.8rem',
                    borderRadius: '6px',
                    fontWeight: 700,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                  }}
                  title="Initiate a new amendment cycle and broadcast notification to all branches"
                >
                  <span>📢</span> Call for Amendment
                </button>

                <button
                  onClick={() => setIsTrackerModalOpen(true)}
                  style={{
                    background: '#ffffff',
                    color: '#7a1c2d',
                    border: '1px solid #7a1c2d',
                    padding: '0.4rem 0.8rem',
                    borderRadius: '6px',
                    fontWeight: 700,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                  }}
                  title="View submission progress of all branches for amendments"
                >
                  <span>📊</span> Submissions Tracker
                </button>
              </>
            )}

            {/* Import PPB Approved Activities Button */}
            {(selectedAmendmentNumber === 0 && (plan?.status !== 'Approved' || isPrivileged)) && (
              <button
                type="button"
                onClick={handleImportPpbActivities}
                disabled={isImportingPpb}
                style={{
                  background: '#00534E',
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.4rem 0.85rem',
                  borderRadius: '6px',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                }}
                title="Import activities approved by Policy & Planning Branch (PPB) with assigned activity numbers and vote numbers"
              >
                <span>📥</span>
                <span>{isImportingPpb ? 'Importing...' : `Import PPB Approved Activities${approvedProposalsCount > 0 ? ` (${approvedProposalsCount})` : ''}`}</span>
              </button>
            )}

            {/* Planning Division: Baseline Voted Plan Dispatch & Directives (Original Plan 0) */}
            {isPrivileged && selectedAmendmentNumber === 0 && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setDispatchNotes(`Official Treasury Voted Budget Allocation & Implementation Directives issued by Ministry Planning Division (PPB) for FY ${selectedYear}.`);
                    setIsDispatchModalOpen(true);
                  }}
                  style={{
                    background: plan?.isDispatchedToBranch ? '#ffffff' : '#00534E',
                    color: plan?.isDispatchedToBranch ? '#00534E' : '#ffffff',
                    border: plan?.isDispatchedToBranch ? '1px solid #00534E' : 'none',
                    padding: '0.4rem 0.85rem',
                    borderRadius: '6px',
                    fontWeight: 700,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                  }}
                  title={`Dispatch official voted annual plan with vote numbers to ${branchInfo?.name || 'Branch'}`}
                >
                  <span>{plan?.isDispatchedToBranch ? '📨' : '📤'}</span>
                  <span>{plan?.isDispatchedToBranch ? 'Re-dispatch Voted Plan' : 'Dispatch Voted Plan to Branch'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenPlanningAddModal}
                  style={{
                    background: '#6B21A8',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.4rem 0.8rem',
                    borderRadius: '6px',
                    fontWeight: 700,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                  }}
                  title="Add top-down government vision / planning directive activity directly into this branch plan"
                >
                  <span>🏛️</span>
                  <span>Add Planning Initiative</span>
                </button>
              </>
            )}

            {/* Export buttons */}
            <button
              onClick={handleExportCSV}
              style={{
                background: '#ffffff',
                color: '#374151',
                border: '1px solid #cbd5e1',
                padding: '0.4rem 0.75rem',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '0.78rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
              }}
            >
              <span>📥</span> Export CSV
            </button>

            <button
              onClick={handleExportLandscapePdf}
              style={{
                background: '#ffffff',
                color: '#7a1c2d',
                border: '1px solid #7a1c2d',
                padding: '0.4rem 0.75rem',
                borderRadius: '6px',
                fontWeight: 700,
                fontSize: '0.78rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
              }}
              title="Export official Landscape PDF optimized for paper saving, clear readability, and institutional hard copy filing"
            >
              <span>🖨️</span> Landscape PDF / Print
            </button>
          </div>
        </div>

        {/* ── AIP 6-STAGE OFFICIAL PROCESS WORKFLOW SEQUENCE (National Education Standard) ── */}
        <div
          className="no-print"
          style={{
            background: '#ffffff',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
            marginBottom: '1rem',
            padding: '0.6rem 1rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: showLifecycleStages ? '0.65rem' : '0',
              flexWrap: 'wrap',
              gap: '0.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '1.1rem' }}>🔄</span>
              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                AIP Official 6-Stage Process Lifecycle Sequence
              </span>
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                • National Education Planning Standard
              </span>
              {!showLifecycleStages && (
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: '#166534',
                  background: '#dcfce7',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  border: '1px solid #bbf7d0',
                }}>
                  {currentStageStatus.stage4.complete ? 'Stage 4: Dispatched & Voted' : currentStageStatus.stage3.complete ? 'Stage 3: PPB Approved' : currentStageStatus.stage1.complete ? 'Stage 1: Submitted' : 'Stage 1: Proposals Active'}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              {aipDeadline && (
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    background: '#fef3c7',
                    border: '1px solid #fde68a',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontSize: '0.72rem',
                    color: '#92400e',
                    fontWeight: 700,
                  }}
                  title={`Official PPB Submission Cutoff: ${aipDeadline.dueDate || '2026-12-15'}`}
                >
                  <span>⏰</span>
                  <span>Cutoff Deadline: <strong>{aipDeadline.dueDate || '15 Dec 2026'}</strong></span>
                </div>
              )}
              {isPrivileged && (
                <button
                  type="button"
                  onClick={() => handleBranchChange('all')}
                  style={{
                    background: isConsolidated ? '#00534E' : '#f1f5f9',
                    color: isConsolidated ? '#ffffff' : '#00534E',
                    border: '1px solid #00534E',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                  }}
                  title="Switch to Consolidated Ministry View"
                >
                  <span>🌐</span>
                  <span>{isConsolidated ? 'Consolidated Active' : 'View Ministry Consolidation'}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowLifecycleStages(!showLifecycleStages)}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  color: '#475569',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {showLifecycleStages ? '▲ Hide Stages' : '▼ Show All 6 Stages'}
              </button>
            </div>
          </div>

          {/* Stepper Grid (6 Steps in 1 Row) */}
          {showLifecycleStages && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
              gap: '0.5rem',
            }}
          >
            {/* Stage 1: Submission */}
            <div
              style={{
                padding: '0.55rem 0.65rem',
                borderRadius: '8px',
                background: currentStageStatus.stage1.complete ? '#f0fdf4' : currentStageStatus.stage1.active ? '#eff6ff' : '#f8fafc',
                border: `1.5px solid ${currentStageStatus.stage1.complete ? '#86efac' : currentStageStatus.stage1.active ? '#93c5fd' : '#e2e8f0'}`,
                borderLeft: `3.5px solid ${currentStageStatus.stage1.complete ? '#166534' : currentStageStatus.stage1.active ? '#2563eb' : '#94a3b8'}`,
                minWidth: 0,
              }}
              title="All branches submit their annual AIP proposals, based on approved budget proposals, to Planning Branch before deadline."
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                <span style={{ fontSize: '0.66rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
                  Stage 1
                </span>
                <span style={{ fontSize: '0.75rem' }}>{currentStageStatus.stage1.complete ? '✅' : '📝'}</span>
              </div>
              <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Branch Proposals
              </div>
              <div style={{ fontSize: '0.64rem', color: currentStageStatus.stage1.complete ? '#166534' : '#2563eb', fontWeight: 700, marginTop: '2px' }}>
                {currentStageStatus.stage1.complete ? '✓ Submitted' : '▶ Due 15 Dec 2026'}
              </div>
            </div>

            {/* Stage 2: Planning Review & Consolidation */}
            <div
              onClick={() => isPrivileged && handleBranchChange('all')}
              style={{
                padding: '0.55rem 0.65rem',
                borderRadius: '8px',
                background: currentStageStatus.stage2.complete ? '#f0fdf4' : currentStageStatus.stage2.active ? '#f0fdfa' : '#f8fafc',
                border: `1.5px solid ${currentStageStatus.stage2.complete ? '#86efac' : currentStageStatus.stage2.active ? '#5eead4' : '#e2e8f0'}`,
                borderLeft: `3.5px solid ${currentStageStatus.stage2.complete ? '#166534' : currentStageStatus.stage2.active ? '#00534E' : '#94a3b8'}`,
                minWidth: 0,
                cursor: isPrivileged ? 'pointer' : 'default',
              }}
              title="Planning Branch reviews, coordinates and consolidates submitted proposals into the Ministry-level AIP. (Click to view consolidation)"
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                <span style={{ fontSize: '0.66rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
                  Stage 2
                </span>
                <span style={{ fontSize: '0.75rem' }}>{currentStageStatus.stage2.complete ? '✅' : '🌐'}</span>
              </div>
              <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Review &amp; Consolidation
              </div>
              <div style={{ fontSize: '0.64rem', color: currentStageStatus.stage2.complete ? '#166534' : '#00534E', fontWeight: 700, marginTop: '2px' }}>
                {isConsolidated ? '✓ Consolidated View' : currentStageStatus.stage2.complete ? '✓ Consolidated' : '▶ Planning Review'}
              </div>
            </div>

            {/* Stage 3: AIP Approval by PPB */}
            <div
              style={{
                padding: '0.55rem 0.65rem',
                borderRadius: '8px',
                background: currentStageStatus.stage3.complete ? '#f0fdf4' : currentStageStatus.stage3.active ? '#fef3c7' : '#f8fafc',
                border: `1.5px solid ${currentStageStatus.stage3.complete ? '#86efac' : currentStageStatus.stage3.active ? '#fde68a' : '#e2e8f0'}`,
                borderLeft: `3.5px solid ${currentStageStatus.stage3.complete ? '#166534' : currentStageStatus.stage3.active ? '#d97706' : '#94a3b8'}`,
                minWidth: 0,
              }}
              title="The consolidated AIP is submitted to the PPB for review and approval."
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                <span style={{ fontSize: '0.66rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
                  Stage 3
                </span>
                <span style={{ fontSize: '0.75rem' }}>{currentStageStatus.stage3.complete ? '✅' : '🏛️'}</span>
              </div>
              <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                PPB Approval
              </div>
              <div style={{ fontSize: '0.64rem', color: currentStageStatus.stage3.complete ? '#166534' : '#b45309', fontWeight: 700, marginTop: '2px' }}>
                {currentStageStatus.stage3.complete ? '✓ PPB Approved' : currentStageStatus.stage3.active ? '▶ Pending PPB' : '○ Pre-Approval'}
              </div>
            </div>

            {/* Stage 4: Allocation to Branches */}
            <div
              style={{
                padding: '0.55rem 0.65rem',
                borderRadius: '8px',
                background: currentStageStatus.stage4.complete ? '#f0fdf4' : currentStageStatus.stage4.active ? '#f0fdf4' : '#f8fafc',
                border: `1.5px solid ${currentStageStatus.stage4.complete ? '#86efac' : currentStageStatus.stage4.active ? '#86efac' : '#e2e8f0'}`,
                borderLeft: `3.5px solid ${currentStageStatus.stage4.complete ? '#166534' : currentStageStatus.stage4.active ? '#15803d' : '#94a3b8'}`,
                minWidth: 0,
              }}
              title="Following PPB approval, the approved AIP activities and targets are communicated to respective branches for implementation."
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                <span style={{ fontSize: '0.66rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
                  Stage 4
                </span>
                <span style={{ fontSize: '0.75rem' }}>{currentStageStatus.stage4.complete ? '✅' : '📤'}</span>
              </div>
              <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Branch Allocation
              </div>
              <div style={{ fontSize: '0.64rem', color: currentStageStatus.stage4.complete ? '#166534' : '#15803d', fontWeight: 700, marginTop: '2px' }}>
                {currentStageStatus.stage4.complete ? '✓ Dispatched & Voted' : currentStageStatus.stage4.active ? '▶ Ready to Dispatch' : '○ Pending PPB'}
              </div>
            </div>

            {/* Stage 5: Progress Reporting by Branches */}
            <div
              onClick={() => handleOpenMonthlyReturnModal(1)}
              style={{
                padding: '0.55rem 0.65rem',
                borderRadius: '8px',
                background: currentStageStatus.stage5.complete ? '#f0fdf4' : currentStageStatus.stage5.active ? '#eff6ff' : '#f8fafc',
                border: `1.5px solid ${currentStageStatus.stage5.complete ? '#86efac' : currentStageStatus.stage5.active ? '#93c5fd' : '#e2e8f0'}`,
                borderLeft: `3.5px solid ${currentStageStatus.stage5.complete ? '#166534' : currentStageStatus.stage5.active ? '#2563eb' : '#94a3b8'}`,
                minWidth: 0,
                cursor: 'pointer',
              }}
              title="Each branch updates and submits implementation progress against approved AIP activities periodically through the system. (Click to open returns)"
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                <span style={{ fontSize: '0.66rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
                  Stage 5
                </span>
                <span style={{ fontSize: '0.75rem' }}>{currentStageStatus.stage5.complete ? '✅' : '📊'}</span>
              </div>
              <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Progress Reporting
              </div>
              <div style={{ fontSize: '0.64rem', color: currentStageStatus.stage5.complete ? '#166534' : currentStageStatus.stage5.active ? '#2563eb' : '#64748b', fontWeight: 700, marginTop: '2px' }}>
                {monthlyReturns.length > 0 ? `✓ Returns (${monthlyReturns.length}/12)` : currentStageStatus.stage5.active ? '▶ Returns Active' : '○ Post-Allocation'}
              </div>
            </div>

            {/* Stage 6: Monitoring and Evaluation */}
            <a
              href="/monitoring"
              style={{
                padding: '0.55rem 0.65rem',
                borderRadius: '8px',
                background: currentStageStatus.stage6.active ? '#f5f3ff' : '#f8fafc',
                border: `1.5px solid ${currentStageStatus.stage6.active ? '#ddd6fe' : '#e2e8f0'}`,
                borderLeft: `3.5px solid ${currentStageStatus.stage6.active ? '#7c3aed' : '#94a3b8'}`,
                minWidth: 0,
                textDecoration: 'none',
                display: 'block',
              }}
              title="Planning Branch monitors overall implementation, reviews progress, identifies delays and prepares consolidated progress reports. (Click to open M&E portal)"
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                <span style={{ fontSize: '0.66rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
                  Stage 6
                </span>
                <span style={{ fontSize: '0.75rem' }}>🎯</span>
              </div>
              <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                M&amp;E Governance
              </div>
              <div style={{ fontSize: '0.64rem', color: '#7c3aed', fontWeight: 700, marginTop: '2px' }}>
                ▶ Open M&amp;E Portal ↗
              </div>
            </a>
          </div>
          )}
        </div>

        {/* ── Google Sheets-Style Branch Sheet Tab Bar (Planning Branch & Admin Master Mode) ── */}
        {isPrivileged && (
          <div className="no-print" style={{
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '10px',
            marginBottom: '1rem',
            boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
            overflow: 'hidden',
          }}>
            {/* Header / Sub-title bar */}
            <div style={{
              background: '#f8fafc',
              padding: '0.5rem 1rem',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.5rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1rem' }}>📑</span>
                <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#1e293b' }}>
                  Branch Sheets (Workbook Tabs)
                </span>
                <span style={{
                  fontSize: '0.72rem',
                  color: '#475569',
                  background: '#e2e8f0',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontWeight: 600,
                }}>
                  {moeBranches.length} Branches
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="text"
                  placeholder="🔍 Filter branch..."
                  value={branchSearch}
                  onChange={(e) => setBranchSearch(e.target.value)}
                  style={{
                    padding: '3px 8px',
                    fontSize: '0.75rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    width: '150px',
                    outline: 'none',
                    background: '#ffffff',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowBranchTabs(!showBranchTabs)}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    color: '#475569',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {showBranchTabs ? '▲ Hide Tabs' : '▼ Show Tabs'}
                </button>
              </div>
            </div>

            {/* Scrollable sheet tabs row */}
            {showBranchTabs && (
              <div style={{
                display: 'flex',
                alignItems: 'stretch',
                overflowX: 'auto',
                background: '#f1f5f9',
                padding: '0.4rem 0.6rem 0 0.6rem',
                gap: '0.35rem',
              }}>
                {/* Consolidated Ministry AIP Tab */}
                <button
                  type="button"
                  onClick={() => handleBranchChange('all')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    padding: '0.55rem 0.95rem',
                    fontSize: '0.82rem',
                    fontWeight: (selectedBranchId === 'all' || isConsolidated) ? 700 : 500,
                    color: (selectedBranchId === 'all' || isConsolidated) ? '#00534E' : '#475569',
                    background: (selectedBranchId === 'all' || isConsolidated) ? '#ffffff' : 'transparent',
                    borderTop: (selectedBranchId === 'all' || isConsolidated) ? '3px solid #00534E' : '3px solid transparent',
                    borderLeft: (selectedBranchId === 'all' || isConsolidated) ? '1px solid #cbd5e1' : '1px solid transparent',
                    borderRight: (selectedBranchId === 'all' || isConsolidated) ? '1px solid #cbd5e1' : '1px solid transparent',
                    borderBottom: (selectedBranchId === 'all' || isConsolidated) ? '1px solid #ffffff' : '1px solid transparent',
                    borderRadius: '6px 6px 0 0',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease',
                    boxShadow: (selectedBranchId === 'all' || isConsolidated) ? '0 -2px 5px rgba(0,0,0,0.05)' : 'none',
                  }}
                  title="Consolidated Ministry-Level AIP: All operational branches aggregated into one unified implementation plan"
                >
                  <span style={{ fontSize: '0.95rem' }}>🌐</span>
                  <span>Consolidated Ministry AIP</span>
                  <span style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: '10px',
                    background: '#dcfce7',
                    color: '#166534',
                  }}>
                    All Branches
                  </span>
                </button>

                {filteredMoeBranches.map((br) => {
                  const isActive = (branchInfo?.id || selectedBranchId) === br.id;
                  const amendSubmission = currentAmendment?.branchSubmissions?.find((s) => s.branchId === br.id);
                  const isSubmitted = amendSubmission?.status === 'Submitted' || amendSubmission?.status === 'Approved';

                  return (
                    <button
                      key={br.id}
                      type="button"
                      onClick={() => handleBranchChange(br.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                        padding: '0.55rem 0.95rem',
                        fontSize: '0.82rem',
                        fontWeight: isActive ? 700 : 500,
                        color: isActive ? '#7a1c2d' : '#475569',
                        background: isActive ? '#ffffff' : 'transparent',
                        borderTop: isActive ? '3px solid #7a1c2d' : '3px solid transparent',
                        borderLeft: isActive ? '1px solid #cbd5e1' : '1px solid transparent',
                        borderRight: isActive ? '1px solid #cbd5e1' : '1px solid transparent',
                        borderBottom: isActive ? '1px solid #ffffff' : '1px solid transparent',
                        borderRadius: '6px 6px 0 0',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.15s ease',
                        boxShadow: isActive ? '0 -2px 5px rgba(0,0,0,0.05)' : 'none',
                      }}
                      title={`Switch to sheet for ${br.name}`}
                    >
                      <BranchBadge name={br.name} showName={false} size="xs" />
                      <span>{br.name.replace(/^MOE\s+/i, '')}</span>
                      {selectedAmendmentNumber > 0 ? (
                        <span style={{
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: '10px',
                          background: isSubmitted ? '#dcfce7' : amendSubmission?.isDispatchedToBranch ? '#e0f2fe' : '#fef3c7',
                          color: isSubmitted ? '#166534' : amendSubmission?.isDispatchedToBranch ? '#0369a1' : '#92400e',
                        }}>
                          {isSubmitted ? '✓ Done' : amendSubmission?.isDispatchedToBranch ? 'Sent to Branch' : 'Draft'}
                        </span>
                      ) : (
                        (() => {
                          const origSub = (originalPlanSubmissions || []).find((s: any) => s.branchId === br.id);
                          const isAppr = origSub?.status === 'Approved';
                          const isSubm = origSub?.status === 'Submitted';
                          if (!isAppr && !isSubm) return null;
                          return (
                            <span style={{
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              padding: '1px 6px',
                              borderRadius: '10px',
                              background: isAppr ? '#dcfce7' : '#fef3c7',
                              color: isAppr ? '#166534' : '#92400e',
                            }}>
                              {isAppr ? '✓ Approved' : 'Submitted'}
                            </span>
                          );
                        })()
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: '#6b7280' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>⏳</div>
            Loading Annual Implementation Plan...
          </div>
        ) : (
          <>
            {/* ── AIP EXECUTIVE SUMMARY TILES (Uniform Single-Row Space-Saving Layout) ── */}
            <div
              className="no-print"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
                gap: '0.65rem',
                marginBottom: '1.25rem',
              }}
            >
              {/* Tile 1: Total Plan Estimated Demand */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => handleTileClick('all')}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleTileClick('all'); }}
                title="Click to view all activities"
                className="card"
                style={{
                  padding: '0.85rem 1rem',
                  border: activeTileFilter === 'all' ? '2px solid #00534E' : '1px solid #E2E8F0',
                  borderLeft: '4.5px solid #00534E',
                  borderRadius: '10px',
                  boxShadow: activeTileFilter === 'all' ? '0 0 0 2px rgba(0, 83, 78, 0.18), 0 4px 12px rgba(0, 83, 78, 0.1)' : '0 2px 6px rgba(0,0,0,0.03)',
                  background: activeTileFilter === 'all' ? '#F2FAF9' : '#FFFFFF',
                  cursor: 'pointer',
                  transition: 'all 0.18s ease-in-out',
                  userSelect: 'none',
                  position: 'relative',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ fontSize: '1.1rem' }}>💰</span>
                    <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Total Plan Budget
                    </span>
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <TileActionMenu
                      tileTitle="Total Plan Budget"
                      exportData={budgetTileExportData}
                      onRefresh={() => loadPlanData(selectedBranchId, selectedAmendmentNumber)}
                      position="right"
                    />
                  </div>
                </div>
                <div
                  title={`Exact Plan Budget: ${formatMillion(totals.totalEstimatedCost, { minDecimals: 6, maxDecimals: 6 })} Mn (${formatRupees(totals.totalEstimatedCost, true)})`}
                  style={{ cursor: 'help' }}
                >
                  <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#00534E', lineHeight: 1.2 }}>
                    Rs. {displayMn(totals.totalEstimatedCost)} Mn
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600, fontFamily: 'monospace', marginTop: '2px' }}>
                    {formatMillion(totals.totalEstimatedCost, { minDecimals: 6, maxDecimals: 6 })} Mn
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748B', marginTop: '0.25rem' }}>
                  <span title={`Exact vote allocation: ${formatRupees(totals.totalEstimatedCost, true)}`}>
                    Exact: {formatRupees(totals.totalEstimatedCost, true)}
                  </span>
                  {activeTileFilter === 'all' && (
                    <span style={{ fontSize: '0.64rem', fontWeight: 700, color: '#00534E', background: 'rgba(0, 83, 78, 0.1)', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>
                      All ✓
                    </span>
                  )}
                </div>
              </div>

              {/* Tile 2: Implementation Activities */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => handleTileClick('completed')}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleTileClick('completed'); }}
                title="Click to filter completed activities (100%)"
                className="card"
                style={{
                  padding: '0.85rem 1rem',
                  border: activeTileFilter === 'completed' ? '2px solid #8D153A' : '1px solid #E2E8F0',
                  borderLeft: '4.5px solid #8D153A',
                  borderRadius: '10px',
                  boxShadow: activeTileFilter === 'completed' ? '0 0 0 2px rgba(141, 21, 58, 0.2), 0 4px 12px rgba(141, 21, 58, 0.12)' : '0 2px 6px rgba(0,0,0,0.03)',
                  background: activeTileFilter === 'completed' ? '#FFF5F7' : '#FFFFFF',
                  cursor: 'pointer',
                  transition: 'all 0.18s ease-in-out',
                  userSelect: 'none',
                  position: 'relative',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ fontSize: '1.1rem' }}>📋</span>
                    <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      AIP Activities
                    </span>
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <TileActionMenu
                      tileTitle="AIP Implementation Activities"
                      exportData={activitiesTileExportData}
                      onRefresh={() => loadPlanData(selectedBranchId, selectedAmendmentNumber)}
                      position="right"
                    />
                  </div>
                </div>
                <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#8D153A', lineHeight: 1.2 }}>
                  {activities.length} Activities
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748B', marginTop: '0.25rem' }}>
                  <span>{completedActivitiesCount} completed • {inProgressActivitiesCount} active</span>
                  {activeTileFilter === 'completed' ? (
                    <span style={{ fontSize: '0.64rem', fontWeight: 700, color: '#8D153A', background: 'rgba(141, 21, 58, 0.1)', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>
                      Completed ✓
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.65rem', color: '#94A3B8' }}>Filter 100% ↓</span>
                  )}
                </div>
              </div>

              {/* Tile 3: Cumulative Physical Milestone Targets */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => handleTileClick('in_progress')}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleTileClick('in_progress'); }}
                title="Click to filter in-progress activities"
                className="card"
                style={{
                  padding: '0.85rem 1rem',
                  border: activeTileFilter === 'in_progress' ? '2px solid #EB7400' : '1px solid #E2E8F0',
                  borderLeft: '4.5px solid #EB7400',
                  borderRadius: '10px',
                  boxShadow: activeTileFilter === 'in_progress' ? '0 0 0 2px rgba(235, 116, 0, 0.2), 0 4px 12px rgba(235, 116, 0, 0.12)' : '0 2px 6px rgba(0,0,0,0.03)',
                  background: activeTileFilter === 'in_progress' ? '#FFFBF0' : '#FFFFFF',
                  cursor: 'pointer',
                  transition: 'all 0.18s ease-in-out',
                  userSelect: 'none',
                  position: 'relative',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ fontSize: '1.1rem' }}>🎯</span>
                    <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Physical Milestones
                    </span>
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <TileActionMenu
                      tileTitle="Physical Milestone Targets"
                      exportData={physicalTileExportData}
                      onRefresh={() => loadPlanData(selectedBranchId, selectedAmendmentNumber)}
                      position="right"
                    />
                  </div>
                </div>
                <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#C96200', lineHeight: 1.2 }}>
                  {totals.overallPhysicalProgressPct || '0%'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748B', marginTop: '0.25rem' }}>
                  <span>Cumulative target (Q1-Q4)</span>
                  {activeTileFilter === 'in_progress' ? (
                    <span style={{ fontSize: '0.64rem', fontWeight: 700, color: '#C96200', background: 'rgba(235, 116, 0, 0.12)', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>
                      In Progress ✓
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.65rem', color: '#94A3B8' }}>Filter Active ↓</span>
                  )}
                </div>
              </div>

              {/* Tile 4: Financial Phasing & Disbursement */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => handleTileClick('high_budget')}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleTileClick('high_budget'); }}
                title="Click to filter major activities (>= Rs. 5 Mn)"
                className="card"
                style={{
                  padding: '0.85rem 1rem',
                  border: activeTileFilter === 'high_budget' ? '2px solid #0284C7' : '1px solid #E2E8F0',
                  borderLeft: '4.5px solid #0284C7',
                  borderRadius: '10px',
                  boxShadow: activeTileFilter === 'high_budget' ? '0 0 0 2px rgba(2, 132, 199, 0.2), 0 4px 12px rgba(2, 132, 199, 0.12)' : '0 2px 6px rgba(0,0,0,0.03)',
                  background: activeTileFilter === 'high_budget' ? '#F0F9FF' : '#FFFFFF',
                  cursor: 'pointer',
                  transition: 'all 0.18s ease-in-out',
                  userSelect: 'none',
                  position: 'relative',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ fontSize: '1.1rem' }}>📊</span>
                    <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Disbursement Phasing
                    </span>
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <TileActionMenu
                      tileTitle="Financial Phasing & Disbursement"
                      exportData={disbursementTileExportData}
                      onRefresh={() => loadPlanData(selectedBranchId, selectedAmendmentNumber)}
                      position="right"
                    />
                  </div>
                </div>
                <div
                  title={`Exact Disbursed: ${formatMillion(totals.totalFinancialProgress, { minDecimals: 6, maxDecimals: 6 })} Mn (${formatRupees(totals.totalFinancialProgress, true)})`}
                  style={{ cursor: 'help' }}
                >
                  <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0369A1', lineHeight: 1.2 }}>
                    Rs. {displayMn(totals.totalFinancialProgress)} Mn
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600, fontFamily: 'monospace', marginTop: '2px' }}>
                    {formatMillion(totals.totalFinancialProgress, { minDecimals: 6, maxDecimals: 6 })} Mn
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748B', marginTop: '0.25rem' }}>
                  <span title={`Exact disbursed: ${formatRupees(totals.totalFinancialProgress, true)} of ${formatRupees(totals.totalEstimatedCost, true)}`}>
                    Exact: {formatRupees(totals.totalFinancialProgress, true)} ({totals.overallFinancialProgressPct || '0%'})
                  </span>
                  {activeTileFilter === 'high_budget' ? (
                    <span style={{ fontSize: '0.64rem', fontWeight: 700, color: '#0369A1', background: 'rgba(2, 132, 199, 0.12)', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>
                      {"Major ≥5Mn ✓"}
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.65rem', color: '#94A3B8' }}>{"Filter ≥5Mn ↓"}</span>
                  )}
                </div>
              </div>

              {/* Tile 5: Planning Approval & Baseline Status */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => handleTileClick('scheduled')}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleTileClick('scheduled'); }}
                title="Click to filter scheduled/pending activities"
                className="card"
                style={{
                  padding: '0.85rem 1rem',
                  border: activeTileFilter === 'scheduled' ? '2px solid #166534' : '1px solid #E2E8F0',
                  borderLeft: '4.5px solid #166534',
                  borderRadius: '10px',
                  boxShadow: activeTileFilter === 'scheduled' ? '0 0 0 2px rgba(22, 101, 52, 0.2), 0 4px 12px rgba(22, 101, 52, 0.12)' : '0 2px 6px rgba(0,0,0,0.03)',
                  background: activeTileFilter === 'scheduled' ? '#F0FDF4' : '#FFFFFF',
                  cursor: 'pointer',
                  transition: 'all 0.18s ease-in-out',
                  userSelect: 'none',
                  position: 'relative',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ fontSize: '1.1rem' }}>⚖️</span>
                    <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Baseline & Approval
                    </span>
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <TileActionMenu
                      tileTitle="Plan Status & Baseline Record"
                      exportData={statusTileExportData}
                      onRefresh={() => loadPlanData(selectedBranchId, selectedAmendmentNumber)}
                      position="right"
                    />
                  </div>
                </div>
                <div style={{ fontSize: '1.45rem', fontWeight: 800, color: plan?.status === 'Approved' ? '#166534' : plan?.status === 'Submitted' ? '#854D0E' : '#334155', lineHeight: 1.2 }}>
                  {plan?.status === 'Approved' ? 'PPB Approved' : plan?.status === 'Submitted' ? 'Submitted' : 'Draft'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748B', marginTop: '0.25rem' }}>
                  <span>{selectedAmendmentNumber === 0 ? 'Original Baseline' : `Amendment 0${selectedAmendmentNumber}`}</span>
                  {activeTileFilter === 'scheduled' ? (
                    <span style={{ fontSize: '0.64rem', fontWeight: 700, color: '#166534', background: 'rgba(22, 101, 52, 0.12)', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>
                      Scheduled ✓
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.65rem', color: '#94A3B8' }}>Filter Sched ↓</span>
                  )}
                </div>
              </div>
            </div>
            {/* ── APPROVED AIP IMPLEMENTATION & MONTHLY PROGRESS REPORTING CONTROL STRIP ── */}
            {plan?.status === 'Approved' && (
              <div
                className="no-print"
                style={{
                  background: 'linear-gradient(135deg, #f0fdf4 0%, #e6f7ec 100%)',
                  border: '1.5px solid #86efac',
                  borderRadius: '8px',
                  padding: '1rem 1.25rem',
                  marginBottom: '1.25rem',
                  boxShadow: '0 2px 6px rgba(22, 101, 52, 0.08)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.85rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '1.25rem' }}>🚀</span>
                      <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#166534' }}>
                        Implementation Phase & Monthly Progress Reporting
                      </h3>
                      <span style={{ fontSize: '0.72rem', background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '12px', fontWeight: 700, border: '1px solid #86efac' }}>
                        Active Baseline FY {selectedYear}
                      </span>
                    </div>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.82rem', color: '#14532d' }}>
                      Track monthly milestone delivery and actual Treasury disbursements. Progress returns flow directly to <strong>{relevantMonitoringBranch?.monitoringOrgName || 'Ministry Monitoring & Performance Branch'}</strong> for independent verification.
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => handleOpenMonthlyReturnModal(selectedReportingMonth)}
                      style={{
                        background: '#00534E',
                        color: '#ffffff',
                        border: 'none',
                        padding: '0.55rem 1.25rem',
                        borderRadius: '6px',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        boxShadow: '0 2px 4px rgba(0, 83, 78, 0.25)',
                      }}
                    >
                      <span>📤</span>
                      <span>Report & Submit Month {selectedReportingMonth} Progress to M&E</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowMonthlyProgress(!showMonthlyProgress)}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #86efac',
                        color: '#166534',
                        padding: '0.55rem 0.85rem',
                        borderRadius: '6px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {showMonthlyProgress ? '▲ Hide Month Tabs' : '▼ View 12 Months'}
                    </button>
                  </div>
                </div>

                {/* Month Selector Pills (Jan to Dec) */}
                {showMonthlyProgress && (
                <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: '0.45rem' }}>
                  {[
                    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
                  ].map((mName, idx) => {
                    const mNum = idx + 1;
                    const ret = monthlyReturns.find((r) => r.month === mNum);
                    const isSelected = selectedReportingMonth === mNum;
                    const isVerified = ret?.status === 'Verified';
                    const isSubmitted = ret?.status === 'Submitted';
                    const isActionReq = ret?.status === 'Action Required';

                    return (
                      <button
                        key={mNum}
                        type="button"
                        onClick={() => setSelectedReportingMonth(mNum)}
                        style={{
                          background: isSelected ? '#00534E' : '#ffffff',
                          color: isSelected ? '#ffffff' : '#334155',
                          border: isSelected ? '2px solid #00534E' : `1px solid ${ret ? '#86efac' : '#cbd5e1'}`,
                          borderRadius: '6px',
                          padding: '0.45rem 0.25rem',
                          textAlign: 'center',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div style={{ fontWeight: 800, fontSize: '0.82rem' }}>{mName}</div>
                        <div style={{ fontSize: '0.67rem', marginTop: '2px', fontWeight: 600 }}>
                          {isVerified ? (
                            <span style={{ color: isSelected ? '#86efac' : '#166534' }}>✓ Verified</span>
                          ) : isSubmitted ? (
                            <span style={{ color: isSelected ? '#fde047' : '#d97706' }}>⏳ In Review</span>
                          ) : isActionReq ? (
                            <span style={{ color: isSelected ? '#fca5a5' : '#dc2626' }}>⚠️ Action</span>
                          ) : (
                            <span style={{ color: isSelected ? '#e2e8f0' : '#94a3b8' }}>Due</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Quick Info Bar for Selected Month */}
                {(() => {
                  const currentMonthReturn = monthlyReturns.find((r) => r.month === selectedReportingMonth);
                  const monthNamesLong = [
                    'January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'
                  ];
                  const mName = monthNamesLong[selectedReportingMonth - 1];

                  return (
                    <div style={{ marginTop: '0.75rem', background: '#ffffff', borderRadius: '6px', padding: '0.65rem 0.85rem', border: '1px solid #bbf7d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.8rem' }}>
                      <div>
                        <strong>{mName} Status: </strong>
                        {currentMonthReturn ? (
                          <span>
                            Submitted on {new Date(currentMonthReturn.submissionDate).toLocaleDateString()} by {currentMonthReturn.submittedByName} —{' '}
                            <strong style={{ color: currentMonthReturn.status === 'Verified' ? '#166534' : '#d97706' }}>
                              {currentMonthReturn.status === 'Verified' ? '✓ Verified by M&E' : '⏳ Under M&E Review'}
                            </strong>
                            {' | '}Actual Expenditure: <strong>Rs. {formatMillion(currentMonthReturn.totalMonthlyExpenditure)} Mn</strong> ({formatRupees(currentMonthReturn.totalMonthlyExpenditure, true)})
                          </span>
                        ) : (
                          <span style={{ color: '#64748b' }}>
                            No monthly return submitted yet for {mName}. Click &quot;Report & Submit Month {selectedReportingMonth} Progress to M&E&quot; to report milestone deliverables.
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenMonthlyReturnModal(selectedReportingMonth)}
                        style={{
                          background: currentMonthReturn ? '#f1f5f9' : '#166534',
                          color: currentMonthReturn ? '#00534E' : '#ffffff',
                          border: currentMonthReturn ? '1px solid #cbd5e1' : 'none',
                          padding: '0.3rem 0.75rem',
                          borderRadius: '4px',
                          fontWeight: 700,
                          fontSize: '0.76rem',
                          cursor: 'pointer',
                        }}
                      >
                        {currentMonthReturn ? '✏️ Edit / Re-submit Return' : '📝 Enter Month Progress'}
                      </button>
                    </div>
                  );
                })()}
                </>
                )}
              </div>
            )}

        {/* Active Filter Notification Bar */}
        {activeTileFilter !== 'all' && (
          <div
            className="no-print"
            style={{
              background: '#F8FAFC',
              border: '1px solid #CBD5E1',
              borderRadius: '8px',
              padding: '0.5rem 1rem',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.82rem',
              color: '#334155',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>🔍</span>
              <span>
                Filtered by: <strong>{activeTileFilter.replace('_', ' ').toUpperCase()}</strong> — Showing <strong>{displayedActivities.length}</strong> of <strong>{activities.length}</strong> activities
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActiveTileFilter('all')}
              style={{
                background: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                padding: '2px 8px',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#8D153A',
                cursor: 'pointer',
              }}
            >
              ✕ Clear Filter (Show All)
            </button>
          </div>
        )}

        {/* ── Official AIP Sheet ── */}
        <div className="aip-sheet-card">

            {/* Document Header & Responsibility Card (Collapsible) */}
            <div style={{
              background: '#ffffff',
              borderBottom: '1px solid #e2e8f0',
              padding: '0.65rem 1.25rem',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                  <span style={{
                    background: '#7a1c2d',
                    color: '#ffffff',
                    padding: '3px 10px',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    letterSpacing: '0.02em',
                  }}>
                    {formPhaseTitle || '3. Implementation Phase'}
                  </span>
                  <div style={{ fontSize: '0.8rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <span>Main: <strong>{mainResp || 'Not set'}</strong>{mainContact ? ` (${mainContact})` : ''}</span>
                    <span style={{ color: '#cbd5e1' }}>|</span>
                    <span>Overall: <strong>{overallResp || 'Not set'}</strong>{overallContact ? ` (${overallContact})` : ''}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {headerSavedSuccess && (
                    <span style={{ fontSize: '0.75rem', color: '#166534', fontWeight: 600 }}>
                      ✅ Saved
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleOpenAddModal}
                    style={{
                      background: '#7a1c2d',
                      color: '#ffffff',
                      border: 'none',
                      padding: '4px 12px',
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      boxShadow: '0 2px 4px rgba(122, 28, 45, 0.25)',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <span style={{ fontWeight: 800, fontSize: '0.95rem', lineHeight: 1 }}>+</span> Add Activity
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowResponsibilityCard(!showResponsibilityCard)}
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      color: '#475569',
                      padding: '3px 10px',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {showResponsibilityCard ? '▲ Close Details' : '✏️ Edit Responsibility Info'}
                  </button>
                </div>
              </div>

              {/* Collapsible Edit Form */}
              {showResponsibilityCard && (
                <div style={{ marginTop: '0.85rem', paddingTop: '0.85rem', borderTop: '1px dashed #cbd5e1' }}>
                  <div style={{ marginBottom: '0.65rem' }}>
                    <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#7a1c2d', textTransform: 'uppercase' }}>
                      Phase / Section Title
                    </label>
                    <input
                      value={formPhaseTitle}
                      onChange={(e) => setFormPhaseTitle(e.target.value)}
                      placeholder="3. Implementation Phase"
                      style={{
                        width: '100%',
                        padding: '0.35rem 0.5rem',
                        fontSize: '0.85rem',
                        border: '1px solid #cbd5e1',
                        borderRadius: '4px',
                        color: '#1f2937',
                        marginTop: '2px',
                      }}
                    />
                  </div>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '0.75rem',
                  }}>
                    {/* Main Responsibility */}
                    <div style={{ background: '#f8fafc', padding: '0.6rem 0.8rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                      <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#7a1c2d', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                        Main Responsibility Officer
                      </label>
                      <input
                        type="text"
                        disabled={selectedAmendmentNumber > 0 && !isPrivileged}
                        value={mainResp}
                        onChange={(e) => setMainResp(e.target.value)}
                        placeholder="Enter main responsibility officer..."
                        style={{ width: '100%', padding: '0.35rem 0.5rem', fontSize: '0.82rem', border: '1px solid #cbd5e1', borderRadius: '4px', marginBottom: '0.35rem' }}
                      />
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.72rem', color: '#6b7280', fontWeight: 600 }}>Contact No:</span>
                        <input
                          type="text"
                          disabled={selectedAmendmentNumber > 0 && !isPrivileged}
                          value={mainContact}
                          onChange={(e) => setMainContact(e.target.value)}
                          placeholder="e.g. 714929279"
                          style={{ flex: 1, padding: '0.25rem 0.4rem', fontSize: '0.82rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                        />
                      </div>
                    </div>

                    {/* Overall Responsibility */}
                    <div style={{ background: '#f8fafc', padding: '0.6rem 0.8rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                      <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#7a1c2d', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                        Overall Responsibility Director
                      </label>
                      <input
                        type="text"
                        disabled={selectedAmendmentNumber > 0 && !isPrivileged}
                        value={overallResp}
                        onChange={(e) => setOverallResp(e.target.value)}
                        placeholder="Enter overall responsibility director..."
                        style={{ width: '100%', padding: '0.35rem 0.5rem', fontSize: '0.82rem', border: '1px solid #cbd5e1', borderRadius: '4px', marginBottom: '0.35rem' }}
                      />
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.72rem', color: '#6b7280', fontWeight: 600 }}>Contact No:</span>
                        <input
                          type="text"
                          disabled={selectedAmendmentNumber > 0 && !isPrivileged}
                          value={overallContact}
                          onChange={(e) => setOverallContact(e.target.value)}
                          placeholder="e.g. 714325568"
                          style={{ flex: 1, padding: '0.25rem 0.4rem', fontSize: '0.82rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                        />
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.6rem' }}>
                    <button
                      type="button"
                      onClick={handleSaveHeaderFields}
                      disabled={isSavingHeader}
                      style={{
                        background: '#7a1c2d',
                        color: '#ffffff',
                        border: 'none',
                        padding: '0.35rem 0.85rem',
                        borderRadius: '6px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {isSavingHeader ? 'Saving...' : '💾 Save Responsibility Details'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Origin & Activity Category Filter Chips + View Mode Toolbar */}
            <div className="no-print" style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.65rem 1.25rem',
              background: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              flexWrap: 'wrap',
              gap: '0.6rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>Activity Origin:</span>
                <button
                  type="button"
                  onClick={() => setOriginFilter('all')}
                  style={{
                    padding: '0.2rem 0.6rem',
                    borderRadius: '16px',
                    fontSize: '0.72rem',
                    fontWeight: originFilter === 'all' ? 800 : 600,
                    border: originFilter === 'all' ? '1.5px solid #00534E' : '1px solid #cbd5e1',
                    background: originFilter === 'all' ? '#00534E' : '#ffffff',
                    color: originFilter === 'all' ? '#ffffff' : '#334155',
                    cursor: 'pointer',
                  }}
                >
                  All ({activities.length})
                </button>
                <button
                  type="button"
                  onClick={() => setOriginFilter('proposed')}
                  style={{
                    padding: '0.2rem 0.6rem',
                    borderRadius: '16px',
                    fontSize: '0.72rem',
                    fontWeight: originFilter === 'proposed' ? 800 : 600,
                    border: originFilter === 'proposed' ? '1.5px solid #0284c7' : '1px solid #cbd5e1',
                    background: originFilter === 'proposed' ? '#0284c7' : '#ffffff',
                    color: originFilter === 'proposed' ? '#ffffff' : '#0369a1',
                    cursor: 'pointer',
                  }}
                >
                  Branch Proposed ({branchProposedCount})
                </button>
                {planningAddedCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setOriginFilter('planning_added')}
                    style={{
                      padding: '0.2rem 0.6rem',
                      borderRadius: '16px',
                      fontSize: '0.72rem',
                      fontWeight: originFilter === 'planning_added' ? 800 : 600,
                      border: originFilter === 'planning_added' ? '1.5px solid #7c3aed' : '1px solid #cbd5e1',
                      background: originFilter === 'planning_added' ? '#7c3aed' : '#ffffff',
                      color: originFilter === 'planning_added' ? '#ffffff' : '#6d28d9',
                      cursor: 'pointer',
                    }}
                  >
                    Added by Planning ({planningAddedCount})
                  </button>
                )}
                {planningAdjustedCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setOriginFilter('adjusted')}
                    style={{
                      padding: '0.2rem 0.6rem',
                      borderRadius: '16px',
                      fontSize: '0.72rem',
                      fontWeight: originFilter === 'adjusted' ? 800 : 600,
                      border: originFilter === 'adjusted' ? '1.5px solid #d97706' : '1px solid #cbd5e1',
                      background: originFilter === 'adjusted' ? '#d97706' : '#ffffff',
                      color: originFilter === 'adjusted' ? '#ffffff' : '#b45309',
                      cursor: 'pointer',
                    }}
                  >
                    Adjusted by Planning ({planningAdjustedCount})
                  </button>
                )}
              </div>

              {/* Right: View Mode Switches & Status */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                {/* View Mode Toggle: Monthly vs Quarterly */}
                <div style={{
                  display: 'inline-flex',
                  background: '#e2e8f0',
                  padding: '2px',
                  borderRadius: '6px',
                }}>
                  <button
                    type="button"
                    onClick={() => setViewMode('monthly')}
                    style={{
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      border: 'none',
                      background: viewMode === 'monthly' ? '#ffffff' : 'transparent',
                      color: viewMode === 'monthly' ? '#7a1c2d' : '#64748b',
                      cursor: 'pointer',
                      boxShadow: viewMode === 'monthly' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    }}
                    title="View all 12 monthly columns (Jan - Dec)"
                  >
                    📅 12 Months
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('quarterly')}
                    style={{
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      border: 'none',
                      background: viewMode === 'quarterly' ? '#ffffff' : 'transparent',
                      color: viewMode === 'quarterly' ? '#7a1c2d' : '#64748b',
                      cursor: 'pointer',
                      boxShadow: viewMode === 'quarterly' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    }}
                    title="View clean Quarterly summary (Q1 - Q4)"
                  >
                    📊 Quarterly Summary
                  </button>
                </div>

                {/* Number Format Precision: Dual (2 Dec + Subtext) vs Clean 2 Dec vs Full 6 Dec */}
                <div style={{
                  display: 'inline-flex',
                  background: '#e2e8f0',
                  padding: '2px',
                  borderRadius: '6px',
                }}>
                  <button
                    type="button"
                    onClick={() => setDecimalMode('dual')}
                    style={{
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      border: 'none',
                      background: decimalMode === 'dual' ? '#ffffff' : 'transparent',
                      color: decimalMode === 'dual' ? '#00534E' : '#64748b',
                      cursor: 'pointer',
                      boxShadow: decimalMode === 'dual' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    }}
                    title="2 Decimal places with exact value shown in smaller font below and on mouse hover"
                  >
                    🔢 2 Dec + Subtext
                  </button>
                  <button
                    type="button"
                    onClick={() => setDecimalMode('standard')}
                    style={{
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      border: 'none',
                      background: decimalMode === 'standard' ? '#ffffff' : 'transparent',
                      color: decimalMode === 'standard' ? '#00534E' : '#64748b',
                      cursor: 'pointer',
                      boxShadow: decimalMode === 'standard' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    }}
                    title="Clean 2 Decimal places (exact value shown on mouse hover)"
                  >
                    ✨ 2 Dec Only
                  </button>
                  <button
                    type="button"
                    onClick={() => setDecimalMode('full')}
                    style={{
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      border: 'none',
                      background: decimalMode === 'full' ? '#ffffff' : 'transparent',
                      color: decimalMode === 'full' ? '#92400e' : '#64748b',
                      cursor: 'pointer',
                      boxShadow: decimalMode === 'full' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    }}
                    title="Exact 6 Decimal precision across entire table"
                  >
                    🔬 6 Dec Full
                  </button>
                </div>

                {/* Status pill on the right */}
                <div style={{ fontSize: '0.74rem' }}>
                  {plan?.isDispatchedToBranch ? (
                    <span style={{ color: '#166534', fontWeight: 700, background: '#dcfce7', padding: '2px 8px', borderRadius: '10px' }}>
                      ✓ Plan Dispatched
                    </span>
                  ) : (
                    <span style={{ color: '#92400e', fontWeight: 600, background: '#fef3c7', padding: '2px 8px', borderRadius: '10px' }}>
                      ⏳ Awaiting Dispatch
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Official AIP Matrix Table */}
            <div className="aip-table-wrapper">
              <table className="aip-table">
                <thead>
                  {/* Row 1: Super Header Row */}
                  <tr>
                    {isConsolidated && (
                      <th rowSpan={3} style={{ width: '130px', background: '#00534E', color: '#ffffff', verticalAlign: 'middle', textAlign: 'center' }}>
                        Executing Branch
                      </th>
                    )}
                    <th rowSpan={3} style={{ width: '60px' }}>Outcome / Output No</th>
                    <th rowSpan={3} style={{ width: '55px' }}>Activity No</th>
                    <th rowSpan={3} style={{ minWidth: '260px', maxWidth: '360px' }}>Main Activities</th>
                    <th rowSpan={3} style={{ width: '130px' }}>Vote Number</th>
                    <th rowSpan={3} style={{ width: '90px' }}>Allocation / Estimated Cost (Mn)</th>
                    <th rowSpan={3} style={{ width: '75px' }}>Remark</th>
                    <th rowSpan={3} style={{ width: '115px' }}>Indicator</th>
                    <th
                      colSpan={viewMode === 'monthly' ? 16 : 4}
                      style={{
                        background: '#7a1c2d',
                        color: '#ffffff',
                        padding: '6px 10px',
                        textAlign: 'center',
                        fontWeight: 700,
                        fontSize: '0.875rem',
                        letterSpacing: '0.02em',
                        border: '1px solid #5a101e',
                      }}
                    >
                      <input
                        value={formTargetTitle !== undefined && formTargetTitle !== '' ? formTargetTitle : `Overall Physical and Financial Targets: ${selectedYear}`}
                        onChange={(e) => setFormTargetTitle(e.target.value)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          borderBottom: '1px dashed rgba(255,255,255,0.4)',
                          color: '#ffffff',
                          fontSize: '0.875rem',
                          fontWeight: 700,
                          textAlign: 'center',
                          outline: 'none',
                          width: '100%',
                          cursor: 'text',
                        }}
                        title="Click to edit target heading"
                      />
                    </th>
                    <th rowSpan={3} style={{ minWidth: '160px' }}>Responsibility</th>
                    {customColumns.map((col: any) => (
                      <th
                        key={col.id}
                        rowSpan={3}
                        style={{
                          width: col.width || '130px',
                          minWidth: col.width || '110px',
                          textAlign: col.textAlign || 'left',
                          background: '#F0FDFA',
                          color: '#00534E',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          border: '1px solid #CCFBF1',
                        }}
                      >
                        {col.label}
                      </th>
                    ))}
                    {selectedAmendmentNumber > 0 && (
                      <th
                        colSpan={4}
                        style={{
                          background: '#274e13',
                          color: '#ffffff',
                          padding: '6px 10px',
                          textAlign: 'center',
                          fontWeight: 700,
                          fontSize: '0.82rem',
                          border: '1px solid #1e3f10',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                          <span>Progress from</span>
                          <input
                            value={progressRangeStart}
                            onChange={(e) => setProgressRangeStart(e.target.value)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              borderBottom: '1px dashed rgba(255,255,255,0.7)',
                              color: '#ffffff',
                              fontWeight: 700,
                              fontSize: '0.82rem',
                              textAlign: 'center',
                              width: '85px',
                              outline: 'none',
                            }}
                            title="Click to edit progress start date"
                          />
                          <span>to</span>
                          <input
                            value={progressRangeEnd}
                            onChange={(e) => setProgressRangeEnd(e.target.value)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              borderBottom: '1px dashed rgba(255,255,255,0.7)',
                              color: '#ffffff',
                              fontWeight: 700,
                              fontSize: '0.82rem',
                              textAlign: 'center',
                              width: '85px',
                              outline: 'none',
                            }}
                            title="Click to edit progress end date"
                          />
                        </div>
                      </th>
                    )}
                    <th rowSpan={3} className="no-print" style={{ width: '75px' }}>Actions</th>
                  </tr>

                  {/* Row 2: Monthly & Quarterly Group Headers */}
                  <tr>
                    {viewMode === 'monthly' && (
                      <th colSpan={12} className="header-sub-group">
                        January to December - Monthly basis (Non-Cumulative)
                      </th>
                    )}
                    <th colSpan={4} className="header-sub-group" style={{ background: '#fef3c7', color: '#92400e' }}>
                      Q1 to Q4 - Quarterly basis (Cumulative)
                    </th>
                  </tr>

                  {/* Row 3: Sub Header Months & Quarters & 4 Progress Columns */}
                  <tr>
                    {viewMode === 'monthly' && MONTH_NAMES_SHORT.map((m, i) => (
                      <th key={`m-${i}`} style={{ width: '38px', fontSize: '0.75rem' }}>
                        {m}
                      </th>
                    ))}
                    <th style={{ width: '45px', background: '#fef3c7', color: '#92400e' }}>Q1</th>
                    <th style={{ width: '45px', background: '#fef3c7', color: '#92400e' }}>Q2</th>
                    <th style={{ width: '45px', background: '#fef3c7', color: '#92400e' }}>Q3</th>
                    <th style={{ width: '45px', background: '#fef3c7', color: '#92400e' }}>Q4</th>

                    {selectedAmendmentNumber > 0 && (
                      <>
                        <th style={{ background: '#00b0f0', color: '#000000', fontWeight: 700, fontSize: '0.72rem', minWidth: '85px', textAlign: 'center', border: '1px solid #0284c7' }}>
                          Physical Progress
                        </th>
                        <th style={{ background: '#00b0f0', color: '#000000', fontWeight: 700, fontSize: '0.72rem', minWidth: '95px', textAlign: 'center', border: '1px solid #0284c7' }}>
                          Physical Progress - %
                        </th>
                        <th style={{ background: '#00b0f0', color: '#000000', fontWeight: 700, fontSize: '0.72rem', minWidth: '85px', textAlign: 'center', border: '1px solid #0284c7' }}>
                          Financial Progress
                        </th>
                        <th style={{ background: '#00b0f0', color: '#000000', fontWeight: 700, fontSize: '0.72rem', minWidth: '95px', textAlign: 'center', border: '1px solid #0284c7' }}>
                          Financial Progress - %
                        </th>
                      </>
                    )}
                  </tr>
                </thead>

                <tbody>
                  {activities.length === 0 ? (
                    <tr>
                      <td colSpan={(viewMode === 'monthly' ? (selectedAmendmentNumber > 0 ? 29 : 25) : (selectedAmendmentNumber > 0 ? 17 : 13)) + (isConsolidated ? 1 : 0)} style={{ padding: '3.5rem 1rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '2.2rem', marginBottom: '0.5rem' }}>📋</div>
                        <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#1e293b', marginBottom: '0.35rem' }}>
                          No activities in this AIP draft yet
                        </div>
                        {approvedProposalsCount > 0 ? (
                          <>
                            <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.25rem' }}>
                              You have <strong style={{ color: '#00534E' }}>{approvedProposalsCount} activities approved by PPB</strong> with assigned activity numbers, vote numbers, and allocations ready to import into your AIP.
                            </div>
                            <button
                              type="button"
                              onClick={handleImportPpbActivities}
                              disabled={isImportingPpb}
                              style={{
                                background: '#00534E',
                                color: '#ffffff',
                                border: 'none',
                                padding: '0.65rem 1.4rem',
                                borderRadius: '8px',
                                fontWeight: 700,
                                fontSize: '0.88rem',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                boxShadow: '0 4px 12px rgba(0, 83, 78, 0.3)',
                              }}
                            >
                              <span>📥</span>
                              <span>{isImportingPpb ? 'Importing Activities...' : `Import ${approvedProposalsCount} PPB Approved Activities Now`}</span>
                            </button>
                          </>
                        ) : (
                          <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                            Click <strong>&quot;➕ Add Activity&quot;</strong> above to insert your first activity.
                          </div>
                        )}
                      </td>
                    </tr>
                  ) : (
                    displayedActivities.map((act) => {
                      const finMonths = act.financialMonths || Array(12).fill(0);
                      const physMonths = act.physicalMonths || Array(12).fill('-');

                      return (
                        <React.Fragment key={act.id}>
                          {/* Sub-row 1: Financial */}
                          <tr>
                            {isConsolidated && (
                              <td rowSpan={2} style={{ padding: '6px 8px', verticalAlign: 'middle', textAlign: 'center', background: '#f8fafc', borderRight: '1px solid #cbd5e1' }}>
                                <BranchBadge name={act.branchName || 'Operational Branch'} size="xs" />
                              </td>
                            )}
                            <td rowSpan={2} style={{ fontWeight: 700 }}>{act.outputNo || '-'}</td>
                            <td rowSpan={2} style={{ fontWeight: 700 }}>{act.activityCode}</td>
                            <td rowSpan={2} className="text-left" style={{ lineHeight: '1.4' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap', marginBottom: '2px' }}>
                                {act.isAddedByPlanning && (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: '#F3E8FF', color: '#6B21A8', border: '1px solid #D8B4FE', padding: '1px 6px', borderRadius: '4px', fontSize: '0.67rem', fontWeight: 800 }}>
                                    🏛️ Added by Planning Division
                                  </span>
                                )}
                                {act.isAdjustedByPlanning && (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: '#FEF3C7', color: '#92400E', border: '1px solid #FCD34D', padding: '1px 6px', borderRadius: '4px', fontSize: '0.67rem', fontWeight: 800 }}>
                                    ⚙️ Adjusted by Planning
                                  </span>
                                )}
                                {!act.isAddedByPlanning && act.proposalId && (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: '#E0F2FE', color: '#0369A1', border: '1px solid #BAE6FD', padding: '1px 6px', borderRadius: '4px', fontSize: '0.67rem', fontWeight: 700 }}>
                                    📋 Branch Proposed
                                  </span>
                                )}
                              </div>
                              <div style={{ fontWeight: 600, color: '#1E293B' }}>{act.activity}</div>
                              {act.isAdjustedByPlanning && act.originalProposedCost !== undefined && act.originalProposedCost !== act.estimatedCost && (
                                <div style={{ fontSize: '0.68rem', color: '#92400E', marginTop: '2px' }}>
                                  Voted:{' '}
                                  <strong
                                    title={`Exact Voted: ${formatMillion(act.estimatedCost, { minDecimals: 6, maxDecimals: 6 })} Mn (${formatRupees(act.estimatedCost, true)})`}
                                    style={{ cursor: 'help' }}
                                  >
                                    Rs. {displayMn(act.estimatedCost)} Mn
                                  </strong>{' '}
                                  (Branch Demand:{' '}
                                  <strong
                                    title={`Exact Proposed: ${formatMillion(act.originalProposedCost, { minDecimals: 6, maxDecimals: 6 })} Mn (${formatRupees(act.originalProposedCost, true)})`}
                                    style={{ cursor: 'help' }}
                                  >
                                    Rs. {displayMn(act.originalProposedCost)} Mn
                                  </strong>)
                                </div>
                              )}
                              {act.planningNotes && (
                                <div style={{ fontSize: '0.7rem', color: '#581C87', background: '#FAF5FF', padding: '2px 6px', borderRadius: '4px', marginTop: '3px', borderLeft: '2.5px solid #A855F7' }}>
                                  <strong>PPB Directive:</strong> {act.planningNotes}
                                </div>
                              )}
                            </td>
                            <td rowSpan={2} style={{ fontSize: '0.75rem', textAlign: 'center' }}>
                              <div
                                style={{
                                  fontFamily: 'monospace',
                                  fontWeight: 700,
                                  color: '#00534E',
                                  background: '#E6FFFA',
                                  border: '1px solid #B2F5EA',
                                  borderRadius: '4px',
                                  padding: '2px 5px',
                                  display: 'inline-block',
                                }}
                                title={`${getVoteDetails(act.voteNumber).projectName} • ${getVoteDetails(act.voteNumber).objectDescription}`}
                              >
                                {act.voteNumber || '-'}
                              </div>
                              {isPrivileged && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setQuickVoteActivity(act);
                                    setQuickVoteSelected(act.voteNumber && act.voteNumber !== '-' ? act.voteNumber : MOE_STANDARD_VOTE_NUMBERS[0].voteNumber);
                                  }}
                                  style={{
                                    display: 'block',
                                    margin: '3px auto 0',
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#0284C7',
                                    fontSize: '0.68rem',
                                    cursor: 'pointer',
                                    fontWeight: 700,
                                    textDecoration: 'underline',
                                  }}
                                  title="Click to assign or change Vote Number"
                                >
                                  ✏️ Give Vote
                                </button>
                              )}
                            </td>
                            <td rowSpan={2} className="text-right" style={{ padding: '4px 6px' }}>
                              {act.estimatedCost !== undefined && act.estimatedCost !== 0
                                ? renderMnCell(act.estimatedCost, { align: 'right', bold: true })
                                : '-'}
                            </td>
                            {/* Column 6: Remark (e.g. CF) */}
                            <td rowSpan={2} style={{ fontSize: '0.78rem', fontWeight: 700, color: '#374151', textAlign: 'center', background: '#fafafa' }}>
                              {act.remarks || '-'}
                            </td>

                            {/* Sub-row 1 Indicator: Financial */}
                            <td className="type-financial" style={{ fontWeight: 600, fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                              Financial (Rs. Mn)
                            </td>

                            {/* 12 Months Financial */}
                            {viewMode === 'monthly' && finMonths.map((val, mIdx) => (
                              <td key={`fin-${act.id}-${mIdx}`} style={{ padding: '3px 4px' }}>
                                {renderMnCell(val, { align: 'center', bold: Number(val) !== 0 })}
                              </td>
                            ))}

                            {/* Cumulative Quarters Financial */}
                            <td style={{ background: '#fef9c3', padding: '3px 4px' }}>{renderMnCell(act.financialQ1, { align: 'center', bold: true })}</td>
                            <td style={{ background: '#fef9c3', padding: '3px 4px' }}>{renderMnCell(act.financialQ2, { align: 'center', bold: true })}</td>
                            <td style={{ background: '#fef9c3', padding: '3px 4px' }}>{renderMnCell(act.financialQ3, { align: 'center', bold: true })}</td>
                            <td style={{ background: '#fef9c3', padding: '3px 4px' }}>{renderMnCell(act.financialQ4, { align: 'center', bold: true, color: '#7a1c2d' })}</td>

                            {/* Responsibility */}
                            <td rowSpan={2} className="text-left" style={{ fontSize: '0.78rem', lineHeight: '1.3' }}>
                              {act.responsibleOfficer || '-'}
                            </td>

                            {/* Dynamic Custom Template Columns */}
                            {customColumns.map((col: any) => {
                              const val = act.customFields?.[col.key] || (act as any)[col.key];
                              return (
                                <td
                                  key={`custom-${col.id}-${act.id}`}
                                  rowSpan={2}
                                  style={{
                                    fontSize: '0.78rem',
                                    textAlign: col.textAlign || 'left',
                                    padding: '4px 8px',
                                    verticalAlign: 'middle',
                                    background: '#FAFAFA',
                                    borderRight: '1px solid #E2E8F0',
                                  }}
                                >
                                  {val !== undefined && val !== null && val !== '' ? String(val) : '-'}
                                </td>
                              );
                            })}

                            {/* 4 Progress Columns (Sub-row 1: Financial) - Directly Editable in Amendments */}
                            {selectedAmendmentNumber > 0 && (
                              <>
                                <td style={{ background: '#b6d7a8', textAlign: 'center', fontSize: '0.75rem', border: '1px solid #8cb37d', color: '#6b7280' }}>-</td>
                                <td style={{ background: '#fce5cd', textAlign: 'center', fontSize: '0.75rem', border: '1px solid #e6b8af', color: '#6b7280' }}>-</td>
                                <td style={{ background: '#b6d7a8', padding: '2px 3px', border: '1px solid #8cb37d' }}>
                                  <input
                                    type="number"
                                    step="any"
                                    disabled={plan?.status === 'Submitted'}
                                    value={act.financialProgress !== undefined && act.financialProgress !== null ? act.financialProgress : ''}
                                    onChange={(e) => handleProgressChange(act.id, 'financialProgress', e.target.value === '' ? '' : parseFloat(e.target.value))}
                                    placeholder="0.0"
                                    style={{
                                      width: '100%',
                                      background: 'transparent',
                                      border: 'none',
                                      borderBottom: plan?.status === 'Submitted' ? 'none' : '1px dashed rgba(20, 83, 45, 0.5)',
                                      textAlign: 'center',
                                      fontWeight: 700,
                                      fontSize: '0.78rem',
                                      color: '#14532d',
                                      outline: 'none',
                                      padding: '2px 0',
                                    }}
                                    title="Enter actual Financial Progress (Rs. Mn)"
                                  />
                                </td>
                                <td style={{ background: '#fce5cd', padding: '2px 3px', border: '1px solid #e6b8af' }}>
                                  <input
                                    type="text"
                                    disabled={plan?.status === 'Submitted'}
                                    value={act.financialProgressPct || ''}
                                    onChange={(e) => handleProgressChange(act.id, 'financialProgressPct', e.target.value)}
                                    placeholder="0%"
                                    style={{
                                      width: '100%',
                                      background: 'transparent',
                                      border: 'none',
                                      borderBottom: plan?.status === 'Submitted' ? 'none' : '1px dashed rgba(124, 45, 18, 0.5)',
                                      textAlign: 'center',
                                      fontWeight: 700,
                                      fontSize: '0.78rem',
                                      color: '#7c2d12',
                                      outline: 'none',
                                      padding: '2px 0',
                                    }}
                                    title="Enter actual Financial Progress %"
                                  />
                                </td>
                              </>
                            )}

                            {/* Action Buttons */}
                            <td rowSpan={2} className="no-print">
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {selectedAmendmentNumber === 0 ? (
                                  (plan?.status !== 'Approved' || isPrivileged) ? (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => handleOpenEditModal(act)}
                                        style={{
                                          background: '#f1f5f9',
                                          border: '1px solid #cbd5e1',
                                          color: '#1e293b',
                                          padding: '3px 6px',
                                          borderRadius: '4px',
                                          fontSize: '0.7rem',
                                          cursor: 'pointer',
                                          fontWeight: 600,
                                        }}
                                      >
                                        ✏️ Edit
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteActivity(act.id, act.activityCode)}
                                        style={{
                                          background: '#fef2f2',
                                          border: '1px solid #fecaca',
                                          color: '#b91c1c',
                                          padding: '3px 6px',
                                          borderRadius: '4px',
                                          fontSize: '0.7rem',
                                          cursor: 'pointer',
                                          fontWeight: 600,
                                        }}
                                      >
                                        🗑️ Del
                                      </button>
                                    </>
                                  ) : (
                                    <span style={{ fontSize: '0.7rem', color: '#166534', textAlign: 'center', fontWeight: 600 }}>
                                      🔒 Approved Baseline
                                    </span>
                                  )
                                ) : (
                                  isPrivileged ? (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => handleOpenEditModal(act)}
                                        style={{
                                          background: '#f1f5f9',
                                          border: '1px solid #cbd5e1',
                                          color: '#1e293b',
                                          padding: '3px 6px',
                                          borderRadius: '4px',
                                          fontSize: '0.7rem',
                                          cursor: 'pointer',
                                          fontWeight: 600,
                                        }}
                                      >
                                        ✏️ Edit
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteActivity(act.id, act.activityCode)}
                                        style={{
                                          background: '#fef2f2',
                                          border: '1px solid #fecaca',
                                          color: '#b91c1c',
                                          padding: '3px 6px',
                                          borderRadius: '4px',
                                          fontSize: '0.7rem',
                                          cursor: 'pointer',
                                          fontWeight: 600,
                                        }}
                                      >
                                        🗑️ Del
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      type="button"
                                      disabled={plan?.status === 'Submitted'}
                                      onClick={() => handleOpenEditModal(act)}
                                      style={{
                                        background: plan?.status === 'Submitted' ? '#f1f5f9' : '#f0fdf4',
                                        border: `1px solid ${plan?.status === 'Submitted' ? '#cbd5e1' : '#86efac'}`,
                                        color: plan?.status === 'Submitted' ? '#94a3b8' : '#166534',
                                        padding: '4px 6px',
                                        borderRadius: '4px',
                                        fontSize: '0.7rem',
                                        cursor: plan?.status === 'Submitted' ? 'not-allowed' : 'pointer',
                                        fontWeight: 700,
                                      }}
                                      title="Enter actual progress numbers for this activity"
                                    >
                                      📊 Progress
                                    </button>
                                  )
                                )}
                              </div>
                            </td>
                          </tr>

                          {/* Sub-row 2: Physical */}
                          <tr>
                            <td className="type-physical" style={{ fontWeight: 600, fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                              Physical (%)
                            </td>

                            {/* 12 Months Physical */}
                            {viewMode === 'monthly' && physMonths.map((val, mIdx) => (
                              <td key={`phys-${act.id}-${mIdx}`} style={{ fontSize: '0.75rem' }}>
                                {val || '-'}
                              </td>
                            ))}

                            {/* Cumulative Quarters Physical */}
                            <td style={{ background: '#f0fdf4', fontWeight: 600 }}>{act.targetQ1 || '-'}</td>
                            <td style={{ background: '#f0fdf4', fontWeight: 600 }}>{act.targetQ2 || '-'}</td>
                            <td style={{ background: '#f0fdf4', fontWeight: 600 }}>{act.targetQ3 || '-'}</td>
                            <td style={{ background: '#f0fdf4', fontWeight: 700, color: '#166534' }}>{act.targetQ4 || '100%'}</td>

                            {/* 4 Progress Columns (Sub-row 2: Physical) - Directly Editable in Amendments */}
                            {selectedAmendmentNumber > 0 && (
                              <>
                                <td style={{ background: '#b6d7a8', padding: '2px 3px', border: '1px solid #8cb37d' }}>
                                  <input
                                    type="text"
                                    disabled={plan?.status === 'Submitted'}
                                    value={act.physicalProgress || ''}
                                    onChange={(e) => handleProgressChange(act.id, 'physicalProgress', e.target.value)}
                                    placeholder="Units / Note"
                                    style={{
                                      width: '100%',
                                      background: 'transparent',
                                      border: 'none',
                                      borderBottom: plan?.status === 'Submitted' ? 'none' : '1px dashed rgba(20, 83, 45, 0.5)',
                                      textAlign: 'center',
                                      fontWeight: 700,
                                      fontSize: '0.78rem',
                                      color: '#14532d',
                                      outline: 'none',
                                      padding: '2px 0',
                                    }}
                                    title="Enter actual Physical Progress (Quantity / description)"
                                  />
                                </td>
                                <td style={{ background: '#fce5cd', padding: '2px 3px', border: '1px solid #e6b8af' }}>
                                  <input
                                    type="text"
                                    disabled={plan?.status === 'Submitted'}
                                    value={act.physicalProgressPct || ''}
                                    onChange={(e) => handleProgressChange(act.id, 'physicalProgressPct', e.target.value)}
                                    placeholder="0%"
                                    style={{
                                      width: '100%',
                                      background: 'transparent',
                                      border: 'none',
                                      borderBottom: plan?.status === 'Submitted' ? 'none' : '1px dashed rgba(124, 45, 18, 0.5)',
                                      textAlign: 'center',
                                      fontWeight: 700,
                                      fontSize: '0.78rem',
                                      color: '#7c2d12',
                                      outline: 'none',
                                      padding: '2px 0',
                                    }}
                                    title="Enter actual Physical Progress %"
                                  />
                                </td>
                                <td style={{ background: '#b6d7a8', textAlign: 'center', fontSize: '0.75rem', border: '1px solid #8cb37d', color: '#6b7280' }}>-</td>
                                <td style={{ background: '#fce5cd', textAlign: 'center', fontSize: '0.75rem', border: '1px solid #e6b8af', color: '#6b7280' }}>-</td>
                              </>
                            )}
                          </tr>
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>

                {/* ── Total Rows ── */}
                {activities.length > 0 && (
                  <tfoot>
                    {/* Financial Cumulative Total Row */}
                    <tr className="total-row-fin">
                      <td colSpan={isConsolidated ? 5 : 4} rowSpan={2} style={{ textAlign: 'center', fontWeight: 800, fontSize: '1rem', background: '#f8fafc', verticalAlign: 'middle', borderRight: '1px solid #cbd5e1' }}>
                        Total
                      </td>
                      <td rowSpan={2} className="text-right" style={{ background: '#f8fafc', verticalAlign: 'middle', borderRight: '1px solid #cbd5e1', padding: '4px 6px' }}>
                        {renderMnCell(totals.totalEstimatedCost, { align: 'right', bold: true })}
                      </td>
                      <td rowSpan={2} style={{ background: '#f8fafc', borderRight: '1px solid #cbd5e1' }}></td>
                      <td style={{ fontWeight: 700, fontSize: '0.75rem', whiteSpace: 'nowrap' }}>Financial (Rs. Mn)</td>

                      {/* Monthly financial totals */}
                      {viewMode === 'monthly' && totals.monthlyFinancial.map((mVal, idx) => (
                        <td key={`tot-fin-${idx}`} style={{ padding: '3px 4px' }}>
                          {renderMnCell(mVal, { align: 'center', bold: true })}
                        </td>
                      ))}

                      {/* Cumulative quarterly financial totals */}
                      {totals.quarterlyFinancial.map((qVal, idx) => (
                        <td key={`tot-qfin-${idx}`} style={{ background: '#fee2e2', padding: '3px 4px' }}>
                          {renderMnCell(qVal, { align: 'center', bold: true, color: '#991b1b' })}
                        </td>
                      ))}

                      <td rowSpan={2} style={{ background: '#f8fafc', borderRight: '1px solid #cbd5e1' }}></td>

                      {/* Progress Financial Totals - Only in Amendments */}
                      {selectedAmendmentNumber > 0 && (
                        <>
                          <td style={{ background: '#b6d7a8', border: '1px solid #8cb37d' }}></td>
                          <td style={{ background: '#fce5cd', border: '1px solid #e6b8af' }}></td>
                          <td style={{ background: '#b6d7a8', textAlign: 'center', border: '1px solid #8cb37d', padding: '3px 4px' }}>
                            {totals.totalFinancialProgress > 0 ? renderMnCell(totals.totalFinancialProgress, { align: 'center', bold: true, color: '#14532d' }) : ''}
                          </td>
                          <td style={{ background: '#fce5cd', textAlign: 'center', fontWeight: 800, fontSize: '0.8rem', color: '#7c2d12', border: '1px solid #e6b8af' }}>
                            {totals.overallFinancialProgressPct || ''}
                          </td>
                        </>
                      )}

                      <td rowSpan={2} className="no-print" style={{ background: '#f8fafc' }}></td>
                    </tr>

                    {/* Physical Cumulative Total Row */}
                    <tr className="total-row-phys">
                      <td style={{ fontWeight: 700, fontSize: '0.75rem', whiteSpace: 'nowrap' }}>Physical (%) Cumulative</td>

                      {/* Monthly physical average contribution */}
                      {viewMode === 'monthly' && totals.monthlyPhysical.map((pVal, idx) => (
                        <td key={`tot-phys-${idx}`} style={{ fontWeight: 700 }}>
                          {pVal}%
                        </td>
                      ))}

                      {/* Cumulative quarterly physical totals */}
                      {totals.quarterlyPhysical.map((qVal, idx) => (
                        <td key={`tot-qphys-${idx}`} style={{ fontWeight: 800, background: '#dcfce7' }}>
                          {qVal}%
                        </td>
                      ))}

                      {/* Progress Physical Totals - Only in Amendments */}
                      {selectedAmendmentNumber > 0 && (
                        <>
                          <td style={{ background: '#b6d7a8', textAlign: 'center', fontWeight: 800, fontSize: '0.8rem', color: '#14532d', border: '1px solid #8cb37d' }}>
                            {totals.totalPhysicalProgress || ''}
                          </td>
                          <td style={{ background: '#fce5cd', textAlign: 'center', fontWeight: 800, fontSize: '0.8rem', color: '#7c2d12', border: '1px solid #e6b8af' }}>
                            {totals.overallPhysicalProgressPct || ''}
                          </td>
                          <td style={{ background: '#b6d7a8', border: '1px solid #8cb37d' }}></td>
                          <td style={{ background: '#fce5cd', border: '1px solid #e6b8af' }}></td>
                        </>
                      )}
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* Official Institutional Hard Copy Filing Section (Landscape Print & Filing Dossier) */}
            <div
              style={{
                background: '#fafafa',
                borderTop: '2px dashed #cbd5e1',
                padding: '1.25rem 1.5rem',
                marginTop: '0.5rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Institutional Hard Copy Filing & Certification — Ministry of Education Sri Lanka
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Document Telemetry: IPMIS-AIP-${selectedYear}-${(branchInfo?.code || 'MOE').toUpperCase()}
                </div>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '1.5rem',
                  fontSize: '0.8rem',
                  color: '#334155',
                }}
              >
                <div style={{ borderTop: '1px solid #94a3b8', paddingTop: '6px' }}>
                  <div style={{ fontWeight: 800, color: '#0f172a' }}>Prepared By (Subject Officer):</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>{mainResp || 'Subject Officer'} • {mainContact || 'Ext. Contact'}</div>
                  <div style={{ marginTop: '16px', fontSize: '0.72rem', color: '#94a3b8' }}>Signature: _______________________</div>
                </div>

                <div style={{ borderTop: '1px solid #94a3b8', paddingTop: '6px' }}>
                  <div style={{ fontWeight: 800, color: '#0f172a' }}>Checked & Verified:</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>Assistant Director / Planning Officer</div>
                  <div style={{ marginTop: '16px', fontSize: '0.72rem', color: '#94a3b8' }}>Signature: _______________________</div>
                </div>

                <div style={{ borderTop: '1px solid #94a3b8', paddingTop: '6px' }}>
                  <div style={{ fontWeight: 800, color: '#0f172a' }}>Approved (Head of Branch):</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>{overallResp || 'Director of Education'} • {overallContact || 'Office Phone'}</div>
                  <div style={{ marginTop: '16px', fontSize: '0.72rem', color: '#94a3b8' }}>Signature: _______________________</div>
                </div>

                <div style={{ borderTop: '1px solid #94a3b8', paddingTop: '6px' }}>
                  <div style={{ fontWeight: 800, color: '#0f172a' }}>Official Stamp & Filing Date:</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>Date: ____ / ____ / {selectedYear}</div>
                  <div style={{ marginTop: '16px', fontSize: '0.72rem', color: '#94a3b8' }}>Branch Official Seal: [ Stamp ]</div>
                </div>
              </div>
            </div>
          </div>
          </>
        )}

      </div>

      {/* ── Add / Edit Activity Modal Form ── */}
      {/* Modal: Call for Amendment (Planning Branch) */}
      {isCallModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.55)',
          backdropFilter: 'blur(3px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            maxWidth: '560px',
            width: '100%',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
            overflow: 'hidden',
          }}>
            <div style={{
              background: '#8D153A',
              color: '#ffffff',
              padding: '1.1rem 1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
                📢 Call for Amendment ({selectedYear})
              </h3>
              <button
                onClick={() => setIsCallModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAmendmentCall} style={{ padding: '1.5rem' }}>
              {callSuccessMsg && (
                <div style={{ background: '#f0fdf4', border: '1px solid #86efac', color: '#166534', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.85rem' }}>
                  {callSuccessMsg}
                </div>
              )}

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.3rem' }}>
                  Amendment Title <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  value={callTitle}
                  onChange={(e) => setCallTitle(e.target.value)}
                  placeholder="e.g. Amendment 01 - Q1 Budget & Target Revision"
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.875rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.3rem' }}>
                    Circular / Reference No
                  </label>
                  <input
                    type="text"
                    value={callCircular}
                    onChange={(e) => setCallCircular(e.target.value)}
                    placeholder="e.g. ED/04/2027"
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.85rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.3rem' }}>
                    Submission Deadline
                  </label>
                  <input
                    type="date"
                    value={callDeadline}
                    onChange={(e) => setCallDeadline(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem', background: '#f0fdf4', padding: '0.75rem', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#166534', marginBottom: '0.25rem' }}>
                    Progress Period: Start Date (YYYY.MM.DD)
                  </label>
                  <input
                    type="text"
                    value={callProgressStart}
                    onChange={(e) => setCallProgressStart(e.target.value)}
                    placeholder="2027.01.01"
                    style={{ width: '100%', padding: '0.4rem', border: '1px solid #86efac', borderRadius: '4px', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#166534', marginBottom: '0.25rem' }}>
                    Progress Period: End Date (YYYY.MM.DD)
                  </label>
                  <input
                    type="text"
                    value={callProgressEnd}
                    onChange={(e) => setCallProgressEnd(e.target.value)}
                    placeholder="2027.10.31"
                    style={{ width: '100%', padding: '0.4rem', border: '1px solid #86efac', borderRadius: '4px', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              {/* Branch Target Selector: Send to All or One by One */}
              <div style={{ marginBottom: '1.25rem', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.85rem 1rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.4rem' }}>
                  🏢 Target Branches (Recipients)
                </label>
                <div style={{ display: 'flex', gap: '1.25rem', marginBottom: '0.75rem', fontSize: '0.85rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontWeight: callSendMode === 'all' ? 700 : 500 }}>
                    <input
                      type="radio"
                      name="callSendMode"
                      checked={callSendMode === 'all'}
                      onChange={() => setCallSendMode('all')}
                    />
                    <span>📢 All Branches ({moeBranches.length})</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontWeight: callSendMode === 'selected' ? 700 : 500 }}>
                    <input
                      type="radio"
                      name="callSendMode"
                      checked={callSendMode === 'selected'}
                      onChange={() => setCallSendMode('selected')}
                    />
                    <span>🎯 Selected Branch(es) only</span>
                  </label>
                </div>

                {callSendMode === 'selected' && (
                  <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.6rem 0.75rem', maxHeight: '160px', overflowY: 'auto' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.4rem' }}>
                      {moeBranches.map((br) => {
                        const isChecked = callTargetBranchIds.includes(br.id);
                        return (
                          <label key={br.id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', cursor: 'pointer', padding: '2px 0' }}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setCallTargetBranchIds([...callTargetBranchIds, br.id]);
                                } else {
                                  setCallTargetBranchIds(callTargetBranchIds.filter((id) => id !== br.id));
                                }
                              }}
                            />
                            <span>{br.name.replace(/^MOE\s+/i, '')}</span>
                          </label>
                        );
                      })}
                    </div>
                    {callTargetBranchIds.length === 0 && (
                      <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.75rem', color: '#dc2626', fontWeight: 600 }}>
                        ⚠️ Please select at least one branch to send this amendment to.
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.3rem' }}>
                  Guidance Notes / Instructions to Branches
                </label>
                <textarea
                  rows={3}
                  value={callNotes}
                  onChange={(e) => setCallNotes(e.target.value)}
                  placeholder="e.g. Please revise vote numbers according to Circular 04 and update Q2 expenditure forecasts."
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '6px', fontSize: '0.78rem', color: '#64748b', marginBottom: '1.25rem' }}>
                ℹ️ <strong>Amendment Setup:</strong> Creating this amendment opens the amendment workbook tabs for Planning Branch to pre-populate targets. No notifications will be sent to branches at this stage. Notifications are only sent when you click <strong>"Send Amendment to Branch"</strong> on each branch sheet.
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setIsCallModalOpen(false)}
                  style={{ padding: '0.5rem 1rem', border: '1px solid #d1d5db', background: '#fff', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCalling || (callSendMode === 'selected' && callTargetBranchIds.length === 0)}
                  style={{
                    padding: '0.5rem 1.25rem',
                    background: callSendMode === 'selected' && callTargetBranchIds.length === 0 ? '#9ca3af' : '#8D153A',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 700,
                    cursor: callSendMode === 'selected' && callTargetBranchIds.length === 0 ? 'not-allowed' : 'pointer',
                    fontSize: '0.85rem',
                  }}
                >
                  {isCalling ? 'Creating...' : callSendMode === 'selected' ? `Create Amendment for ${callTargetBranchIds.length} Branch(es)` : '✨ Create Amendment Revision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Submissions Tracker (Planning Branch / Admin) */}
      {isTrackerModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.55)',
          backdropFilter: 'blur(3px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            maxWidth: '820px',
            width: '100%',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
            overflow: 'hidden',
          }}>
            <div style={{
              background: '#7a1c2d',
              color: '#ffffff',
              padding: '1.1rem 1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>
                  📊 Branch Implementation Submissions & Review Queue ({selectedYear})
                </h3>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', opacity: 0.9 }}>
                  Tracking live AIP submissions for {relevantPlanningBranch?.departmentName || 'Operational Branches'}
                </p>
              </div>
              <button
                onClick={() => setIsTrackerModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '1.25rem', overflowY: 'auto', flex: 1 }}>
              {/* Original Plan Submissions Block */}
              <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', marginBottom: '1.5rem', overflow: 'hidden' }}>
                <div style={{
                  background: '#f8fafc',
                  padding: '0.75rem 1rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: '1px solid #cbd5e1',
                }}>
                  <div>
                    <strong style={{ color: '#1e293b', fontSize: '0.95rem' }}>
                      📋 Original Implementation Plans ({selectedYear} Baseline)
                    </strong>
                    <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem', color: '#64748b' }}>
                      Initial branch draft plans submitted for Planning approval
                    </span>
                  </div>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, padding: '2px 8px', borderRadius: '12px', background: '#e0f2fe', color: '#0369a1' }}>
                    {(originalPlanSubmissions || []).filter((b: any) => b.status === 'Submitted' || b.status === 'Approved').length} / {moeBranches.length} Branches Submitted
                  </span>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9', color: '#475569', textAlign: 'left' }}>
                      <th style={{ padding: '6px 10px' }}>Branch Name</th>
                      <th style={{ padding: '6px 10px' }}>Status</th>
                      <th style={{ padding: '6px 10px' }}>Activities</th>
                      <th style={{ padding: '6px 10px' }}>Total Cost (Mn)</th>
                      <th style={{ padding: '6px 10px' }}>Submitted On</th>
                      <th style={{ padding: '6px 10px', textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(originalPlanSubmissions || []).map((b: any) => (
                      <tr key={b.branchId} style={{ borderTop: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '6px 10px', fontWeight: 600 }}>
                          <BranchBadge name={b.branchName} size="xs" />
                        </td>
                        <td style={{ padding: '6px 10px' }}>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            background: b.status === 'Approved' ? '#dcfce7' : b.status === 'Submitted' ? '#fef3c7' : '#f1f5f9',
                            color: b.status === 'Approved' ? '#166534' : b.status === 'Submitted' ? '#92400e' : '#64748b',
                          }}>
                            {b.status}
                          </span>
                        </td>
                        <td style={{ padding: '6px 10px' }}>{b.activityCount} activities</td>
                        <td style={{ padding: '6px 10px', fontWeight: 700 }}>
                          {b.totalCost > 0 ? `Rs. ${b.totalCost} Mn` : '-'}
                        </td>
                        <td style={{ padding: '6px 10px', color: '#64748b' }}>
                          {b.submittedAt ? new Date(b.submittedAt).toLocaleDateString() : '—'}
                        </td>
                        <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedAmendmentNumber(0);
                              handleBranchChange(b.branchId);
                              setIsTrackerModalOpen(false);
                            }}
                            style={{
                              padding: '4px 10px',
                              background: '#1e293b',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '5px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                            title={`Open Original Plan for ${b.branchName}`}
                          >
                            <span>📄</span> Open Plan
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Amendments Block */}
              <div style={{ marginBottom: '0.5rem', fontWeight: 700, color: '#7a1c2d', fontSize: '0.9rem' }}>
                🔄 Amendment Revision Cycles
              </div>
              {amendments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#6b7280', border: '1px dashed #cbd5e1', borderRadius: '8px' }}>
                  No amendments called yet for year {selectedYear}. Click "Call for Amendment" to initiate the first amendment cycle.
                </div>
              ) : (
                amendments.map((amend) => (
                  <div key={amend.id} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '1.25rem', overflow: 'hidden' }}>
                    <div style={{
                      background: '#f8fafc',
                      padding: '0.75rem 1rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderBottom: '1px solid #e2e8f0',
                    }}>
                      <div>
                        <strong style={{ color: '#7a1c2d', fontSize: '0.95rem' }}>
                          Amendment 0{amend.amendmentNumber}: {amend.title}
                        </strong>
                        {amend.deadline && (
                          <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem', color: '#64748b' }}>
                            (Deadline: {amend.deadline})
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, padding: '2px 8px', borderRadius: '12px', background: '#dcfce7', color: '#166534' }}>
                          {amend.submittedBranchesCount || 0} / {amend.totalBranches || moeBranches.length} Branches Submitted
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteAmendment(amend.amendmentNumber, amend.title)}
                          disabled={isDeletingAmendment}
                          style={{
                            background: '#fee2e2',
                            color: '#991b1b',
                            border: '1px solid #fca5a5',
                            padding: '3px 8px',
                            borderRadius: '5px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: isDeletingAmendment ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                          }}
                          title={`Permanently remove Amendment 0${amend.amendmentNumber}`}
                        >
                          <span>🗑️</span> Remove
                        </button>
                      </div>
                    </div>

                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                      <thead>
                        <tr style={{ background: '#f1f5f9', color: '#475569', textAlign: 'left' }}>
                          <th style={{ padding: '6px 10px' }}>Branch Name</th>
                          <th style={{ padding: '6px 10px' }}>Status</th>
                          <th style={{ padding: '6px 10px' }}>Activities</th>
                          <th style={{ padding: '6px 10px' }}>Total Cost (Mn)</th>
                          <th style={{ padding: '6px 10px' }}>Submitted On</th>
                          <th style={{ padding: '6px 10px', textAlign: 'center' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(amend.branchSubmissions || []).map((b) => (
                          <tr key={b.branchId} style={{ borderTop: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '6px 10px', fontWeight: 600 }}>
                              <BranchBadge name={b.branchName} size="xs" />
                            </td>
                            <td style={{ padding: '6px 10px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-start' }}>
                                <span style={{
                                  padding: '2px 8px',
                                  borderRadius: '12px',
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  background: b.status === 'Submitted' ? '#dcfce7' : b.status === 'Approved' ? '#e0f2fe' : '#fef3c7',
                                  color: b.status === 'Submitted' ? '#166534' : b.status === 'Approved' ? '#0369a1' : '#92400e',
                                }}>
                                  {b.status}
                                </span>
                                {b.isDispatchedToBranch && (
                                  <span style={{ fontSize: '0.68rem', color: '#0369a1', fontWeight: 600 }}>
                                    📨 Sent to Branch
                                  </span>
                                )}
                              </div>
                            </td>
                            <td style={{ padding: '6px 10px' }}>{b.activityCount} activities</td>
                            <td style={{ padding: '6px 10px', fontWeight: 700 }}>
                              {b.totalCost > 0 ? `Rs. ${b.totalCost} Mn` : '-'}
                            </td>
                            <td style={{ padding: '6px 10px', color: '#64748b' }}>
                              {b.submittedAt ? new Date(b.submittedAt).toLocaleDateString() : '—'}
                            </td>
                            <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                              <button
                                type="button"
                                onClick={() => {
                                  handleBranchChange(b.branchId);
                                  setIsTrackerModalOpen(false);
                                }}
                                style={{
                                  padding: '4px 10px',
                                  background: '#7a1c2d',
                                  color: '#ffffff',
                                  border: 'none',
                                  borderRadius: '5px',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                                title={`Open and review sheet for ${b.branchName}`}
                              >
                                <span>📄</span> Open Sheet
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Submit Amendment to Planning Branch */}
      {isSubmitModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.55)',
          backdropFilter: 'blur(3px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            maxWidth: '520px',
            width: '100%',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
            overflow: 'hidden',
          }}>
            <div style={{
              background: '#166534',
              color: '#ffffff',
              padding: '1.1rem 1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
                📤 {selectedAmendmentNumber === 0 ? 'Submit Original Implementation Plan to Planning Branch' : `Submit Amendment 0${selectedAmendmentNumber} to Planning Branch`}
              </h3>
              <button
                onClick={() => setIsSubmitModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '1.5rem' }}>
              {submitSuccessMsg ? (
                <div style={{ background: '#f0fdf4', border: '1px solid #86efac', color: '#166534', padding: '1rem', borderRadius: '6px', textAlign: 'center', fontWeight: 700 }}>
                  {submitSuccessMsg}
                </div>
              ) : (
                <>
                  <div style={{ background: '#F0FDFA', border: '1.5px solid #99F6E4', borderRadius: '8px', padding: '0.85rem 1rem', marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.72rem', color: '#0F766E', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.2rem' }}>
                      Designated Review Authority
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: '#115E59' }}>
                      🏛️ {relevantPlanningBranch?.planningAuthorityLabel || 'Planning Branch'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#0F766E', marginTop: '0.25rem' }}>
                      {relevantPlanningBranch?.submissionInstructions || 'Your Annual Implementation Plan will be officially routed to your designated Planning Branch for appraisal.'}
                    </div>
                  </div>

                  <p style={{ fontSize: '0.875rem', color: '#374151', margin: '0 0 1rem 0', lineHeight: 1.5 }}>
                    You are executing <strong>Stage 1: Submission of AIP Proposals by Branches</strong>. You are about to officially submit <strong>{selectedAmendmentNumber === 0 ? 'Original Implementation Plan' : `Amendment 0${selectedAmendmentNumber}`}</strong> for <strong>{branchInfo?.name || user?.organizationName}</strong> to <strong>{relevantPlanningBranch?.planningAuthorityLabel || 'Planning Branch'}</strong> for review & consolidation.
                  </p>

                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0.75rem', marginBottom: '1rem', fontSize: '0.8rem', color: '#475569' }}>
                    <div>📋 Total Activities: <strong>{activities.length}</strong></div>
                    <div>💰 Total Estimated Cost: <strong>Rs. {totals.totalEstimatedCost} Mn</strong></div>
                    <div>🏛️ Target Year: <strong>{selectedYear}</strong></div>
                    {aipDeadline && (
                      <div style={{ marginTop: '0.35rem', paddingTop: '0.35rem', borderTop: '1px dashed #cbd5e1', color: '#92400e', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span>⏰</span> Official PPB Submission Deadline: <strong>{aipDeadline.dueDate || '15 Dec 2026'}</strong>
                      </div>
                    )}
                  </div>

                  <div style={{ marginBottom: '1.25rem' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.3rem' }}>
                      Submission Notes / Remarks for Planning Branch (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={submitNotes}
                      onChange={(e) => setSubmitNotes(e.target.value)}
                      placeholder="e.g. Revised laptop procurement timeline and added teacher training vote."
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.85rem' }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                    <button
                      type="button"
                      onClick={() => setIsSubmitModalOpen(false)}
                      style={{ padding: '0.5rem 1rem', border: '1px solid #d1d5db', background: '#fff', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmitPlanToPlanning}
                      disabled={isSubmittingAmendment}
                      style={{ padding: '0.5rem 1.25rem', background: '#166534', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}
                    >
                      {isSubmittingAmendment ? 'Submitting...' : `Confirm & Submit to ${relevantPlanningBranch?.planningAuthorityLabel || 'Planning'}`}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Report & Submit Monthly Progress Return to M&E */}
      {isMonthlyReturnModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(3px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            maxWidth: '1080px',
            width: '100%',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3)',
            overflow: 'hidden',
          }}>
            {/* Header */}
            <div style={{
              background: '#00534E',
              color: '#ffffff',
              padding: '1rem 1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                  📤 Submit Month {selectedReportingMonth} Progress Return to M&E Branch
                </h3>
                <div style={{ fontSize: '0.8rem', opacity: 0.9, marginTop: '2px' }}>
                  {branchInfo?.name || 'Implementing Branch'} — FY {selectedYear} ({[
                    'January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'
                  ][selectedReportingMonth - 1]})
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMonthlyReturnModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#ffffff', fontSize: '1.4rem', cursor: 'pointer', lineHeight: 1 }}
              >
                ✕
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', flex: 1 }}>
              {/* Destination Banner */}
              <div style={{
                background: '#F0FDF4',
                border: '1.5px solid #86EFAC',
                borderRadius: '8px',
                padding: '0.85rem 1rem',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
              }}>
                <span style={{ fontSize: '1.75rem' }}>🎯</span>
                <div>
                  <div style={{ fontWeight: 800, color: '#166534', fontSize: '0.9rem' }}>
                    Target Monitoring Body: {relevantMonitoringBranch?.monitoringAuthorityLabel || 'Ministry of Education Monitoring & Evaluation Branch'}
                  </div>
                  <div style={{ color: '#14532D', fontSize: '0.78rem', marginTop: '2px' }}>
                    {relevantMonitoringBranch?.description || 'Official monthly progress return submitted for performance tracking, milestone audit, and expenditure verification.'}
                  </div>
                </div>
              </div>

              {/* Activities Table */}
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.92rem', color: '#1E293B', fontWeight: 700 }}>
                Activity Milestones & Actual Treasury Disbursements (Month {selectedReportingMonth})
              </h4>

              <div style={{ overflowX: 'auto', border: '1px solid #E2E8F0', borderRadius: '8px', marginBottom: '1rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #CBD5E1', color: '#334155' }}>
                      <th style={{ padding: '0.6rem 0.65rem', width: '70px' }}>Code</th>
                      <th style={{ padding: '0.6rem 0.65rem' }}>Activity Title</th>
                      <th style={{ padding: '0.6rem 0.65rem', width: '130px' }}>Vote Number</th>
                      <th style={{ padding: '0.6rem 0.65rem', width: '70px', textAlign: 'center' }}>Plan Tgt</th>
                      <th style={{ padding: '0.6rem 0.65rem', width: '90px', textAlign: 'center' }}>Actual %</th>
                      <th style={{ padding: '0.6rem 0.65rem', width: '130px', textAlign: 'right' }}>Actual Spent (Mn)</th>
                      <th style={{ padding: '0.6rem 0.65rem', width: '120px' }}>Milestone Status</th>
                      <th style={{ padding: '0.6rem 0.65rem' }}>Deliverables / Output Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyReturnItems.map((item, idx) => (
                      <tr key={item.activityId || idx} style={{ borderBottom: '1px solid #F1F5F9', background: idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA' }}>
                        <td style={{ padding: '0.55rem 0.65rem', fontWeight: 700, color: '#00534E' }}>
                          {item.activityCode}
                        </td>
                        <td style={{ padding: '0.55rem 0.65rem', fontWeight: 600, color: '#1E293B' }}>
                          {item.activityTitle}
                        </td>
                        <td style={{ padding: '0.55rem 0.65rem', fontFamily: 'monospace', fontSize: '0.74rem', color: '#0369A1' }}>
                          {item.voteNumber || '-'}
                        </td>
                        <td style={{ padding: '0.55rem 0.65rem', textAlign: 'center', color: '#64748B' }}>
                          {item.plannedTargetMonth || '-'}
                        </td>
                        <td style={{ padding: '0.45rem 0.5rem', textAlign: 'center' }}>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={item.actualPhysicalPct}
                            onChange={(e) => {
                              const val = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0));
                              const updated = [...monthlyReturnItems];
                              updated[idx].actualPhysicalPct = val;
                              if (val >= 100) updated[idx].status = 'Completed';
                              setMonthlyReturnItems(updated);
                            }}
                            style={{
                              width: '65px',
                              padding: '0.3rem',
                              textAlign: 'center',
                              borderRadius: '4px',
                              border: '1px solid #CBD5E1',
                              fontWeight: 700,
                              color: '#00534E',
                              fontSize: '0.8rem',
                            }}
                          />
                        </td>
                        <td style={{ padding: '0.45rem 0.5rem', textAlign: 'right' }}>
                          <input
                            type="number"
                            step="0.000001"
                            min="0"
                            value={item.actualFinancialMonth}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              const updated = [...monthlyReturnItems];
                              updated[idx].actualFinancialMonth = val;
                              setMonthlyReturnItems(updated);
                            }}
                            style={{
                              width: '110px',
                              padding: '0.3rem',
                              textAlign: 'right',
                              borderRadius: '4px',
                              border: '1px solid #CBD5E1',
                              fontWeight: 700,
                              fontSize: '0.8rem',
                              fontFamily: 'monospace',
                            }}
                          />
                          <div style={{ fontSize: '0.67rem', color: '#64748B', marginTop: '2px' }}>
                            {formatRupees(item.actualFinancialMonth, true)}
                          </div>
                        </td>
                        <td style={{ padding: '0.45rem 0.5rem' }}>
                          <select
                            value={item.status}
                            onChange={(e) => {
                              const updated = [...monthlyReturnItems];
                              updated[idx].status = e.target.value as any;
                              setMonthlyReturnItems(updated);
                            }}
                            style={{
                              width: '100%',
                              padding: '0.3rem',
                              borderRadius: '4px',
                              border: '1px solid #CBD5E1',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                            }}
                          >
                            <option value="On Track">🟢 On Track</option>
                            <option value="Completed">✅ Completed</option>
                            <option value="Delayed">🟡 Delayed</option>
                            <option value="Critical">🔴 Critical</option>
                          </select>
                        </td>
                        <td style={{ padding: '0.45rem 0.5rem' }}>
                          <input
                            type="text"
                            value={item.implementationNotes}
                            onChange={(e) => {
                              const updated = [...monthlyReturnItems];
                              updated[idx].implementationNotes = e.target.value;
                              setMonthlyReturnItems(updated);
                            }}
                            placeholder="Enter deliverable output details..."
                            style={{
                              width: '100%',
                              padding: '0.3rem 0.5rem',
                              borderRadius: '4px',
                              border: '1px solid #CBD5E1',
                              fontSize: '0.78rem',
                            }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Overall Remarks */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Overall Monthly Implementation Remarks & Output Accomplishments
                </label>
                <textarea
                  rows={2}
                  value={monthlyReturnRemarks}
                  onChange={(e) => setMonthlyReturnRemarks(e.target.value)}
                  placeholder="Summarize key outputs completed this month, vendor status, field coordination, and issues for M&E attention..."
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.82rem' }}
                />
              </div>

              {/* Live Totals Card */}
              {(() => {
                const totalSpent = monthlyReturnItems.reduce((s, it) => s + (Number(it.actualFinancialMonth) || 0), 0);
                const avgPct = monthlyReturnItems.length > 0
                  ? Math.round(monthlyReturnItems.reduce((s, it) => s + (Number(it.actualPhysicalPct) || 0), 0) / monthlyReturnItems.length)
                  : 0;

                return (
                  <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Total Actual Monthly Disbursement</div>
                      <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#00534E', marginTop: '2px' }}>
                        Rs. {formatMillion(totalSpent)} Mn
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748B', fontFamily: 'monospace' }}>
                        {formatRupees(totalSpent, true)}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Average Milestone Delivery</div>
                      <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#10B981', marginTop: '2px' }}>
                        {avgPct}% Completed
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <button
                        type="button"
                        onClick={() => setIsMonthlyReturnModalOpen(false)}
                        style={{ padding: '0.55rem 1.1rem', background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: '6px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleMonthlyReturnSubmit}
                        disabled={isSubmittingMonthlyReturn}
                        style={{
                          padding: '0.55rem 1.4rem',
                          background: '#00534E',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '6px',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          cursor: isSubmittingMonthlyReturn ? 'not-allowed' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          boxShadow: '0 2px 6px rgba(0, 83, 78, 0.25)',
                        }}
                      >
                        {isSubmittingMonthlyReturn ? '⏳ Transmitting to M&E...' : '🚀 Submit Progress Return to M&E'}
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (() => {
        const isBaselineLocked = (selectedAmendmentNumber > 0 && !isPrivileged) || (selectedAmendmentNumber === 0 && plan?.status === 'Approved' && !isPrivileged);
        return (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem',
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '920px',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.25)',
            overflow: 'hidden',
          }}>
            {/* Modal Header */}
            <div style={{
              background: '#7a1c2d',
              color: '#ffffff',
              padding: '1rem 1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>
                  {editingActivity ? (isBaselineLocked ? `📊 Enter Progress Updates (Activity ${editingActivity.activityCode})` : `✏️ Edit Activity (Code: ${editingActivity.activityCode})`) : '➕ Add Activity'}
                </h3>
                <span style={{ fontSize: '0.75rem', opacity: 0.85 }}>
                  {selectedYear} Annual Implementation Plan • {branchInfo?.name || 'MOE Branch'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  padding: '0.2rem 0.5rem',
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveActivity} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
              <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', flex: 1 }}>

                {formError && (
                  <div style={{ background: '#fef2f2', borderLeft: '4px solid #ef4444', padding: '0.75rem', marginBottom: '1rem', borderRadius: '4px', color: '#991b1b', fontSize: '0.85rem' }}>
                    {formError}
                  </div>
                )}

                {isBaselineLocked && (
                  <div style={{
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '0.85rem 1rem',
                    marginBottom: '1.25rem',
                    fontSize: '0.85rem',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1e293b', fontWeight: 700, marginBottom: '0.35rem' }}>
                      <span>🔒</span>
                      <span>Baseline Activity (Filled by Planning Branch):</span>
                    </div>
                    <div style={{ color: '#334155', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                      {formOutputNo ? `[Output ${formOutputNo}] ` : ''}{formActivity || 'Activity Details'}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                      <span>Vote: <strong>{formVoteNumber || '-'}</strong></span>
                      <span>Allocation: <strong>Rs. {formEstimatedCost || 0} Mn</strong></span>
                      <span>Responsibility: <strong>{formResponsibleOfficer || '-'}</strong></span>
                    </div>
                  </div>
                )}

                {!isBaselineLocked && (
                  <>
{/* Section 1: Identification & Basic Info */}
                <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', color: '#7a1c2d', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  1. Activity Details
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.2rem' }}>
                      Outcome / Output No
                    </label>
                    <input
                      type="text"
                      disabled={isBaselineLocked}
                      value={formOutputNo}
                      onChange={(e) => setFormOutputNo(e.target.value)}
                      placeholder="e.g. 1"
                      style={{ width: '100%', padding: '0.45rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.85rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.2rem' }}>
                      Activity No <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      disabled={isBaselineLocked}
                      value={formActivityCode}
                      onChange={(e) => setFormActivityCode(e.target.value)}
                      placeholder="e.g. 1"
                      style={{ width: '100%', padding: '0.45rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.85rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.2rem' }}>
                      Official Treasury Vote Number <span style={{ color: '#00534E' }}>*</span>
                    </label>
                    <SearchableSelect
                      disabled={isBaselineLocked}
                      value={formVoteNumber}
                      onChange={(e) => setFormVoteNumber(e.target.value)}
                      style={{ width: '100%' }}
                    >
                      <option value="">-- Pick Standard Vote (Searchable) --</option>
                      {MOE_STANDARD_VOTE_NUMBERS.map((v) => (
                        <option key={v.voteNumber} value={v.voteNumber}>
                          {v.voteNumber} • {v.projectName.slice(0, 30)} ({v.category})
                        </option>
                      ))}
                    </SearchableSelect>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.2rem' }}>
                      Allocation / Cost (Rs. Mn)
                    </label>
                    <input
                      type="number"
                      step="any"
                      disabled={isBaselineLocked}
                      value={formEstimatedCost}
                      onChange={(e) => setFormEstimatedCost(e.target.value)}
                      placeholder="e.g. 80.0 or 0.2"
                      style={{ width: '100%', padding: '0.45rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.85rem' }}
                    />
                    <div style={{ fontSize: '0.72rem', color: '#00534E', fontWeight: 600, marginTop: '2px' }}>
                      Exact: {formatRupees(formEstimatedCost, true)}
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.2rem' }}>
                    Main Activities Description <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <textarea
                    required
                    rows={2}
                    disabled={isBaselineLocked}
                    value={formActivity}
                    onChange={(e) => setFormActivity(e.target.value)}
                    placeholder="Enter detailed activity description..."
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.85rem' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.2rem' }}>
                      Responsibility per Activity
                    </label>
                    <input
                      type="text"
                      disabled={isBaselineLocked}
                      value={formResponsibleOfficer}
                      onChange={(e) => setFormResponsibleOfficer(e.target.value)}
                      placeholder="e.g. Mrs. H.A.S.P. Senarathne (DDE) or Mrs. E.T.W. Silva (AD-ICT)"
                      style={{ width: '100%', padding: '0.45rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.2rem' }}>
                      Remarks
                    </label>
                    <input
                      type="text"
                      disabled={isBaselineLocked}
                      value={formRemarks}
                      onChange={(e) => setFormRemarks(e.target.value)}
                      placeholder="e.g. Procurement notes, vote details, or special remarks"
                      style={{ width: '100%', padding: '0.45rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>

                {/* Planning Division Appraisal Directives (Planning Officers & Admins) */}
                {isPrivileged && (
                  <div style={{ background: '#FAF5FF', border: '1px solid #E9D5FF', borderRadius: '8px', padding: '0.85rem 1rem', marginBottom: '1.25rem' }}>
                    <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: '#6B21A8', fontWeight: 800 }}>
                      🏛️ Planning Division (PPB) Appraisal & Directives
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem', marginBottom: '0.65rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.8rem', fontWeight: 600, color: '#6B21A8', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={formIsAddedByPlanning}
                          onChange={(e) => setFormIsAddedByPlanning(e.target.checked)}
                        />
                        <span>Top-Down Initiative (Added by Planning)</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.8rem', fontWeight: 600, color: '#92400E', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={formIsAdjustedByPlanning}
                          onChange={(e) => setFormIsAdjustedByPlanning(e.target.checked)}
                        />
                        <span>Cost or Scope Adjusted by Planning</span>
                      </label>
                    </div>
                    {formIsAdjustedByPlanning && (
                      <div style={{ marginBottom: '0.5rem' }}>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#78350F', marginBottom: '0.2rem' }}>
                          Original Branch Proposed Demand (Rs. Mn)
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={formOriginalProposedCost}
                          onChange={(e) => setFormOriginalProposedCost(e.target.value)}
                          placeholder="Original demand before adjustment"
                          style={{ width: '200px', padding: '0.35rem 0.5rem', border: '1px solid #FCD34D', borderRadius: '4px', fontSize: '0.8rem' }}
                        />
                      </div>
                    )}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#4C1D95', marginBottom: '0.2rem' }}>
                        Planning Directive / Policy Rationale
                      </label>
                      <textarea
                        rows={2}
                        value={formPlanningNotes}
                        onChange={(e) => setFormPlanningNotes(e.target.value)}
                        placeholder="e.g. Allocation adjusted in line with National Treasury ceilings; laptop procurement consolidated under GEMP."
                        style={{ width: '100%', padding: '0.45rem', border: '1px solid #D8B4FE', borderRadius: '6px', fontSize: '0.82rem', background: '#ffffff' }}
                      />
                    </div>
                  </div>
                )}

                {/* Custom Template Columns Section */}
                {customColumns.length > 0 && (
                  <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderLeft: '4px solid #00534E', borderRadius: '8px', padding: '0.85rem 1rem', marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.65rem' }}>
                      <span style={{ fontSize: '1rem' }}>📑</span>
                      <h4 style={{ margin: 0, fontSize: '0.84rem', fontWeight: 800, color: '#00534E', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Template Custom Fields ({aipTemplate?.name || 'AIP Template'})
                      </h4>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
                      {customColumns.map((col: any) => (
                        <div key={col.id}>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#1E293B', marginBottom: '0.25rem' }}>
                            {col.label} {col.required && <span style={{ color: '#E11D48' }}>*</span>}
                          </label>

                          {col.dataType === 'dropdown' ? (
                            <select
                              disabled={isBaselineLocked}
                              value={formCustomFields[col.key] || ''}
                              onChange={(e) => setFormCustomFields({ ...formCustomFields, [col.key]: e.target.value })}
                              style={{ width: '100%', padding: '0.45rem 0.6rem', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.82rem', background: '#FFFFFF' }}
                              required={col.required}
                            >
                              <option value="">Select an option...</option>
                              {(col.options || []).map((opt: string) => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          ) : col.dataType === 'textarea' ? (
                            <textarea
                              rows={2}
                              disabled={isBaselineLocked}
                              value={formCustomFields[col.key] || ''}
                              onChange={(e) => setFormCustomFields({ ...formCustomFields, [col.key]: e.target.value })}
                              placeholder={col.description || col.label}
                              style={{ width: '100%', padding: '0.45rem 0.6rem', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.82rem' }}
                              required={col.required}
                            />
                          ) : (
                            <input
                              type={col.dataType === 'number' || col.dataType === 'currency' ? 'number' : col.dataType === 'date' ? 'date' : 'text'}
                              step={col.dataType === 'currency' ? 'any' : undefined}
                              disabled={isBaselineLocked}
                              value={formCustomFields[col.key] || ''}
                              onChange={(e) => setFormCustomFields({ ...formCustomFields, [col.key]: e.target.value })}
                              placeholder={col.description || col.label}
                              style={{ width: '100%', padding: '0.45rem 0.6rem', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.82rem' }}
                              required={col.required}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Section 2: Monthly Financial & Physical Targets */}
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#7a1c2d', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  2. Monthly Targets (January – December)
                </h4>
                <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.75rem', color: '#6b7280' }}>
                  Enter monthly non-cumulative financial and physical targets. Quarters are calculated cumulatively automatically.
                </p>

                <div style={{ overflowX: 'auto', marginBottom: '1.25rem' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', border: '1px solid #cbd5e1' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc' }}>
                        <th style={{ padding: '6px 8px', border: '1px solid #cbd5e1', textAlign: 'left', width: '140px' }}>Remarks</th>
                        {MONTH_NAMES_SHORT.map((m, idx) => (
                          <th key={`hd-${idx}`} style={{ padding: '6px 4px', border: '1px solid #cbd5e1', textAlign: 'center', width: '60px' }}>
                            {m} ({idx + 1})
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {/* Financial Months Input */}
                      <tr>
                        <td style={{ padding: '6px 8px', border: '1px solid #cbd5e1', fontWeight: 600, background: '#fdf2f4', color: '#7a1c2d' }}>
                          Financial (Rs. Mn)
                        </td>
                        {formFinancialMonths.map((val, idx) => (
                          <td key={`inp-fin-${idx}`} style={{ padding: '3px', border: '1px solid #cbd5e1' }}>
                            <input
                              type="number"
                              step="any"
                              disabled={isBaselineLocked}
                              value={val === 0 ? '' : val}
                              placeholder="0"
                              onChange={(e) => handleFinancialMonthChange(idx, e.target.value)}
                              style={{ width: '100%', padding: '3px', border: '1px solid #e2e8f0', borderRadius: '4px', textAlign: 'center', fontSize: '0.75rem', background: isBaselineLocked ? '#f1f5f9' : '#fff' }}
                            />
                          </td>
                        ))}
                      </tr>

                      {/* Physical Months Input */}
                      <tr>
                        <td style={{ padding: '6px 8px', border: '1px solid #cbd5e1', fontWeight: 600, background: '#f0fdf4', color: '#166534' }}>
                          Physical (%)
                        </td>
                        {formPhysicalMonths.map((val, idx) => (
                          <td key={`inp-phys-${idx}`} style={{ padding: '3px', border: '1px solid #cbd5e1' }}>
                            <input
                              type="text"
                              disabled={isBaselineLocked}
                              value={val === '-' ? '' : val}
                              placeholder="-"
                              onChange={(e) => handlePhysicalMonthChange(idx, e.target.value)}
                              style={{ width: '100%', padding: '3px', border: '1px solid #e2e8f0', borderRadius: '4px', textAlign: 'center', fontSize: '0.75rem', background: isBaselineLocked ? '#f1f5f9' : '#fff' }}
                            />
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Section 3: Cumulative Quarterly Targets */}
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#7a1c2d', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  3. Quarterly Cumulative Targets (Q1 – Q4)
                </h4>
                <div style={{
                  background: '#fef3c7',
                  border: '1px solid #fde68a',
                  borderRadius: '8px',
                  padding: '0.75rem 1rem',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '1rem',
                }}>
                  <div>
                    <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#92400e', marginBottom: '0.25rem' }}>
                      Financial Quarters (Cumulative)
                    </span>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
                      <div>
                        <span style={{ fontSize: '0.7rem', color: '#6b7280' }}>Q1</span>
                        <input
                          type="number"
                          step="any"
                          disabled={isBaselineLocked}
                          value={formFinancialQ1}
                          onChange={(e) => setFormFinancialQ1(parseFloat(e.target.value) || 0)}
                          style={{ width: '100%', padding: '3px', fontSize: '0.75rem', border: '1px solid #d1d5db', borderRadius: '4px', textAlign: 'center', background: isBaselineLocked ? '#f1f5f9' : '#fff' }}
                        />
                      </div>
                      <div>
                        <span style={{ fontSize: '0.7rem', color: '#6b7280' }}>Q2</span>
                        <input
                          type="number"
                          step="any"
                          disabled={isBaselineLocked}
                          value={formFinancialQ2}
                          onChange={(e) => setFormFinancialQ2(parseFloat(e.target.value) || 0)}
                          style={{ width: '100%', padding: '3px', fontSize: '0.75rem', border: '1px solid #d1d5db', borderRadius: '4px', textAlign: 'center', background: isBaselineLocked ? '#f1f5f9' : '#fff' }}
                        />
                      </div>
                      <div>
                        <span style={{ fontSize: '0.7rem', color: '#6b7280' }}>Q3</span>
                        <input
                          type="number"
                          step="any"
                          disabled={isBaselineLocked}
                          value={formFinancialQ3}
                          onChange={(e) => setFormFinancialQ3(parseFloat(e.target.value) || 0)}
                          style={{ width: '100%', padding: '3px', fontSize: '0.75rem', border: '1px solid #d1d5db', borderRadius: '4px', textAlign: 'center', background: isBaselineLocked ? '#f1f5f9' : '#fff' }}
                        />
                      </div>
                      <div>
                        <span style={{ fontSize: '0.7rem', color: '#6b7280' }}>Q4</span>
                        <input
                          type="number"
                          step="any"
                          disabled={isBaselineLocked}
                          value={formFinancialQ4}
                          onChange={(e) => setFormFinancialQ4(parseFloat(e.target.value) || 0)}
                          style={{ width: '100%', padding: '3px', fontSize: '0.75rem', border: '1px solid #d1d5db', borderRadius: '4px', textAlign: 'center', background: isBaselineLocked ? '#f1f5f9' : '#fff' }}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#92400e', marginBottom: '0.25rem' }}>
                      Physical Quarters (Cumulative %)
                    </span>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
                      <div>
                        <span style={{ fontSize: '0.7rem', color: '#6b7280' }}>Q1</span>
                        <input
                          type="text"
                          disabled={isBaselineLocked}
                          value={formTargetQ1}
                          onChange={(e) => setFormTargetQ1(e.target.value)}
                          style={{ width: '100%', padding: '3px', fontSize: '0.75rem', border: '1px solid #d1d5db', borderRadius: '4px', textAlign: 'center', background: isBaselineLocked ? '#f1f5f9' : '#fff' }}
                        />
                      </div>
                      <div>
                        <span style={{ fontSize: '0.7rem', color: '#6b7280' }}>Q2</span>
                        <input
                          type="text"
                          disabled={isBaselineLocked}
                          value={formTargetQ2}
                          onChange={(e) => setFormTargetQ2(e.target.value)}
                          style={{ width: '100%', padding: '3px', fontSize: '0.75rem', border: '1px solid #d1d5db', borderRadius: '4px', textAlign: 'center', background: isBaselineLocked ? '#f1f5f9' : '#fff' }}
                        />
                      </div>
                      <div>
                        <span style={{ fontSize: '0.7rem', color: '#6b7280' }}>Q3</span>
                        <input
                          type="text"
                          disabled={isBaselineLocked}
                          value={formTargetQ3}
                          onChange={(e) => setFormTargetQ3(e.target.value)}
                          style={{ width: '100%', padding: '3px', fontSize: '0.75rem', border: '1px solid #d1d5db', borderRadius: '4px', textAlign: 'center', background: isBaselineLocked ? '#f1f5f9' : '#fff' }}
                        />
                      </div>
                      <div>
                        <span style={{ fontSize: '0.7rem', color: '#6b7280' }}>Q4</span>
                        <input
                          type="text"
                          disabled={isBaselineLocked}
                          value={formTargetQ4}
                          onChange={(e) => setFormTargetQ4(e.target.value)}
                          style={{ width: '100%', padding: '3px', fontSize: '0.75rem', border: '1px solid #d1d5db', borderRadius: '4px', textAlign: 'center', background: isBaselineLocked ? '#f1f5f9' : '#fff' }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                                  </>
                )}
{/* Section 4: Progress Tracking (Actual Progress) - Only for Amendments */}
                {selectedAmendmentNumber > 0 && (
                  <>
                    <h4 style={{ margin: '1.25rem 0 0.5rem 0', fontSize: '0.9rem', color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      4. Progress Tracking (Actual Progress for Amendment 0{selectedAmendmentNumber})
                    </h4>
                    <div style={{
                      background: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                      borderRadius: '8px',
                      padding: '0.85rem 1rem',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '1rem',
                    }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#166534', marginBottom: '0.25rem' }}>
                          Physical Progress (Quantity / Details)
                        </label>
                        <input
                          type="text"
                          value={formPhysicalProgress}
                          onChange={(e) => setFormPhysicalProgress(e.target.value)}
                          placeholder="e.g. Phase 1 Done or 50"
                          style={{ width: '100%', padding: '0.45rem', fontSize: '0.85rem', border: '1px solid #86efac', borderRadius: '4px', background: '#ffffff' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#166534', marginBottom: '0.25rem' }}>
                          Physical Progress - %
                        </label>
                        <input
                          type="text"
                          value={formPhysicalProgressPct}
                          onChange={(e) => setFormPhysicalProgressPct(e.target.value)}
                          placeholder="e.g. 84%"
                          style={{ width: '100%', padding: '0.45rem', fontSize: '0.85rem', border: '1px solid #fca5a5', borderRadius: '4px', background: '#ffffff' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#166534', marginBottom: '0.25rem' }}>
                          Financial Progress (Rs. Mn)
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={formFinancialProgress}
                          onChange={(e) => setFormFinancialProgress(e.target.value)}
                          placeholder="e.g. 42.0"
                          style={{ width: '100%', padding: '0.45rem', fontSize: '0.85rem', border: '1px solid #86efac', borderRadius: '4px', background: '#ffffff' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#166534', marginBottom: '0.25rem' }}>
                          Financial Progress - %
                        </label>
                        <input
                          type="text"
                          value={formFinancialProgressPct}
                          onChange={(e) => setFormFinancialProgressPct(e.target.value)}
                          placeholder="e.g. 50%"
                          style={{ width: '100%', padding: '0.45rem', fontSize: '0.85rem', border: '1px solid #fca5a5', borderRadius: '4px', background: '#ffffff' }}
                        />
                      </div>
                    </div>
                  </>
                )}

              </div>

              {/* Modal Footer */}
              <div style={{
                background: '#f8fafc',
                padding: '0.85rem 1.5rem',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '0.75rem',
              }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    color: '#4b5563',
                    padding: '0.5rem 1.25rem',
                    borderRadius: '6px',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  style={{
                    background: '#7a1c2d',
                    border: 'none',
                    color: '#ffffff',
                    padding: '0.5rem 1.5rem',
                    borderRadius: '6px',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  {formSubmitting ? 'Saving...' : editingActivity ? 'Update Activity' : 'Save Activity'}
                </button>
              </div>
            </form>
          </div>
        </div>
        );
      })()}

      {/* ── Planning Division: Dispatch Official Voted Annual Plan Modal ── */}
      {isDispatchModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem',
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '650px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.25)',
            overflow: 'hidden',
          }}>
            <div style={{
              background: '#00534E',
              color: '#ffffff',
              padding: '1rem 1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                  📤 Dispatch Official Voted Annual Plan to Branch
                </h3>
                <span style={{ fontSize: '0.75rem', opacity: 0.9 }}>
                  Ministry Planning Division (PPB) • FY {selectedYear}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsDispatchModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '1.4rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '1.25rem 1.5rem' }}>
              <div style={{ background: '#F0FDFA', border: '1px solid #CCFBF1', borderRadius: '8px', padding: '0.85rem 1rem', marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.75rem', color: '#0F766E', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                  Target Operational Branch
                </div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#134E4A' }}>
                  {branchInfo?.name || 'Selected Branch'}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.5rem', fontSize: '0.82rem' }}>
                  <div>
                    <span style={{ color: '#64748B' }}>Total Approved Activities:</span>{' '}
                    <strong style={{ color: '#0F172A' }}>{activities.length}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748B' }}>Total Voted Budget:</span>{' '}
                    <strong style={{ color: '#00534E' }}>Rs. {formatMillion(totals.totalEstimatedCost)} Mn</strong>
                  </div>
                </div>
                <div style={{ fontSize: '0.74rem', color: '#0F766E', marginTop: '0.25rem' }}>
                  Exact Rupee Cent Allocation: <strong>{formatRupees(totals.totalEstimatedCost, true)}</strong>
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  Official Treasury & PPB Dispatch Directives
                </label>
                <textarea
                  rows={3}
                  value={dispatchNotes}
                  onChange={(e) => setDispatchNotes(e.target.value)}
                  placeholder="Enter directives regarding Vote Numbers, spending ceilings, and quarterly deliverables..."
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.82rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setIsDispatchModalOpen(false)}
                  style={{ padding: '0.5rem 1rem', border: '1px solid #cbd5e1', background: '#fff', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDispatchVotedPlan}
                  disabled={isDispatchingPlan}
                  style={{
                    padding: '0.55rem 1.4rem',
                    background: '#00534E',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    boxShadow: '0 2px 6px rgba(0, 83, 78, 0.3)',
                  }}
                >
                  {isDispatchingPlan ? 'Dispatching...' : 'Confirm & Dispatch Voted Plan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Top-Down Government Vision / Planning Directive Activity Addition Modal ── */}
      {isPlanningAddModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem',
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '750px',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.25)',
            overflow: 'hidden',
          }}>
            <div style={{
              background: '#6B21A8',
              color: '#ffffff',
              padding: '1rem 1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                  🏛️ Add Planning Initiative (Top-Down Policy Directive)
                </h3>
                <span style={{ fontSize: '0.75rem', opacity: 0.9 }}>
                  Planning Division (PPB) Direct Allocation • FY {selectedYear}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsPlanningAddModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '1.4rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePlanningAdd} style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', flex: 1 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>
                    Assign to Target Branch *
                  </label>
                  <SearchableSelect
                    value={planningAddBranchId}
                    onChange={(e) => setPlanningAddBranchId(e.target.value)}
                    style={{ width: '100%' }}
                    placeholder="-- Search & Choose Branch --"
                    required
                  >
                    <option value="">-- Choose Branch --</option>
                    {moeBranches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name.replace(/^MOE\s+/i, '')} ({b.code})
                      </option>
                    ))}
                  </SearchableSelect>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>
                    Implementation Period *
                  </label>
                  <SearchableSelect
                    value={planningAddPeriod}
                    onChange={(e) => setPlanningAddPeriod(e.target.value as any)}
                    style={{ width: '100%' }}
                  >
                    <option value="Annual">Annual (Spread Across 12 Months)</option>
                    <option value="Q1">Q1 (January – March)</option>
                    <option value="Q2">Q2 (April – June)</option>
                    <option value="Q3">Q3 (July – September)</option>
                    <option value="Q4">Q4 (October – December)</option>
                  </SearchableSelect>
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>
                  Planning Initiative Title & Mandate *
                </label>
                <input
                  type="text"
                  required
                  value={planningAddTitle}
                  onChange={(e) => setPlanningAddTitle(e.target.value)}
                  placeholder="e.g. National Digital Literacy & Smart Classroom Expansion Phase 3"
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>
                    Official Treasury Vote Number *
                  </label>
                  <SearchableSelect
                    value={planningAddVoteNumber}
                    onChange={(e) => setPlanningAddVoteNumber(e.target.value)}
                    style={{ width: '100%' }}
                    placeholder="-- Search Vote Number --"
                  >
                    {MOE_STANDARD_VOTE_NUMBERS.map((v) => (
                      <option key={v.voteNumber} value={v.voteNumber}>
                        {v.voteNumber} • {v.projectName.slice(0, 30)} ({v.category})
                      </option>
                    ))}
                  </SearchableSelect>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>
                    Voted Allocation (Rs. Mn) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={planningAddCost}
                    onChange={(e) => setPlanningAddCost(e.target.value)}
                    placeholder="e.g. 25.5"
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem' }}
                  />
                  <div style={{ fontSize: '0.72rem', color: '#6B21A8', fontWeight: 700, marginTop: '2px' }}>
                    Exact: {formatRupees(planningAddCost, true)}
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>
                  Policy Directive / Cabinet Decision Rationale
                </label>
                <textarea
                  rows={2}
                  value={planningAddNotes}
                  onChange={(e) => setPlanningAddNotes(e.target.value)}
                  placeholder="Policy directive mandate, cabinet paper reference, or national priority explanation..."
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.82rem' }}
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>
                  Assigned Branch Responsibility / Lead Officer
                </label>
                <input
                  type="text"
                  value={planningAddOfficer}
                  onChange={(e) => setPlanningAddOfficer(e.target.value)}
                  placeholder="e.g. Director (ICT) / Assistant Director"
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setIsPlanningAddModalOpen(false)}
                  style={{ padding: '0.5rem 1rem', border: '1px solid #cbd5e1', background: '#fff', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPlanningAdd}
                  style={{
                    padding: '0.55rem 1.4rem',
                    background: '#6B21A8',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    boxShadow: '0 2px 6px rgba(107, 33, 168, 0.3)',
                  }}
                >
                  {isSubmittingPlanningAdd ? 'Adding Initiative...' : 'Add Initiative to Annual Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Quick Vote Number Giving Modal ── */}
      {quickVoteActivity && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem',
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '560px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.25)',
            overflow: 'hidden',
          }}>
            <div style={{
              background: '#0F766E',
              color: '#ffffff',
              padding: '0.85rem 1.25rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>
                  🏷️ Assign Treasury Vote Number
                </h3>
                <span style={{ fontSize: '0.72rem', opacity: 0.9 }}>
                  Activity {quickVoteActivity.activityCode} • {quickVoteActivity.activity.slice(0, 45)}...
                </span>
              </div>
              <button
                type="button"
                onClick={() => setQuickVoteActivity(null)}
                style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '1.3rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '1.25rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  Select Standard MOE Treasury Vote
                </label>
                <select
                  value={quickVoteSelected}
                  onChange={(e) => setQuickVoteSelected(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', border: '1.5px solid #0F766E', borderRadius: '6px', fontSize: '0.82rem', fontWeight: 700, color: '#0F766E', background: '#F0FDFA', marginBottom: '0.5rem' }}
                >
                  {MOE_STANDARD_VOTE_NUMBERS.map((v) => (
                    <option key={v.voteNumber} value={v.voteNumber}>
                      {v.voteNumber} • {v.projectName} ({v.objectCode})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '0.65rem 0.85rem', marginBottom: '1rem', fontSize: '0.78rem' }}>
                <div><strong>Vote Head:</strong> {getVoteDetails(quickVoteSelected).description}</div>
                <div style={{ marginTop: '2px' }}><strong>Object Code:</strong> {getVoteDetails(quickVoteSelected).objectCode} — {getVoteDetails(quickVoteSelected).objectDescription}</div>
                <div style={{ marginTop: '2px' }}><strong>Category:</strong> {getVoteDetails(quickVoteSelected).category} | <strong>Source:</strong> {getVoteDetails(quickVoteSelected).fundingSource}</div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
                <button
                  type="button"
                  onClick={() => setQuickVoteActivity(null)}
                  style={{ padding: '0.45rem 0.9rem', border: '1px solid #cbd5e1', background: '#fff', borderRadius: '6px', cursor: 'pointer', fontSize: '0.82rem' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveQuickVote(quickVoteActivity, quickVoteSelected)}
                  disabled={isSavingQuickVote}
                  style={{
                    padding: '0.45rem 1.25rem',
                    background: '#0F766E',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                  }}
                >
                  {isSavingQuickVote ? 'Saving...' : 'Save Vote Number'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </AppShell>
  );
}
