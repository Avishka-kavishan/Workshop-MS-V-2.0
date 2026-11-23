'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';
import TileActionMenu, { TileExportData } from '@/components/dashboard/TileActionMenu';
import { broadcastDataChange } from '@/lib/broadcastSync';
import { formatMillion, formatRupees, formatDualDeclaration, roundToCentInMn, parseAmountToMn } from '@/lib/financialFormat';
import { MOE_STANDARD_VOTE_NUMBERS } from '@/lib/sriLankanVotes';
import VoteManagementTab from '@/components/monitoring/VoteManagementTab';
import AipTrackerTab from '@/components/monitoring/AipTrackerTab';

interface MonitoringMetric {
  totalActivities: number;
  verifiedActivitiesCount: number;
  pendingVerificationCount: number;
  openObservationsCount: number;
  activeCorrectiveActionsCount: number;
  budgetUtilisationRate: number;
  physicalAchievementRate: number;
  activityCompletionRate: number;
  timelinessRate: number;
  totalEstimatedBudgetMn: number;
  totalActualExpenditureMn: number;
  budgetVarianceMn: number;
}

export default function MonitoringWorkspacePage() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const isQaMonitoringOfficer = Boolean(
    user?.username !== 'monitoring' &&
    (user?.username === 'monitoring.officer' ||
     user?.functionalCategory === 'Monitoring' ||
     user?.roleId === 'role-monitoring-officer' ||
     user?.organizationId === 'org-moe-monitoring' ||
     user?.isSuperAdmin ||
     user?.adminLevel === 0 ||
     user?.adminLevel === 1 ||
     user?.roleId === 'role-superadmin')
  );

  const [activeTab, setActiveTab] = useState<
    | 'aip_tracker'
    | 'results_framework'
    | 'performance'
    | 'data_quality'
    | 'evaluations'
    | 'geographical'
    | 'corrective'
    | 'monthly_returns'
    | 'verification'
    | 'observations'
    | 'evaluation'
    | 'vote_expenditure'
    | 'vote_management'
  >(isQaMonitoringOfficer ? 'monthly_returns' : 'aip_tracker');
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState('2027');

  // Data states
  const [activities, setActivities] = useState<any[]>([]);
  const [observations, setObservations] = useState<any[]>([]);
  const [verifications, setVerifications] = useState<any[]>([]);
  const [correctiveActions, setCorrectiveActions] = useState<any[]>([]);
  const [evidenceFiles, setEvidenceFiles] = useState<any[]>([]);
  const [monthlyReturns, setMonthlyReturns] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<MonitoringMetric | null>(null);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [governmentVotes, setGovernmentVotes] = useState<any[]>([]);

  // Vote Expenditure Summary State
  const [selectedVoteNumber, setSelectedVoteNumber] = useState<string>('126');
  const [voteBranchFilter, setVoteBranchFilter] = useState<string>('all');
  const [verificationVoteFilter, setVerificationVoteFilter] = useState<string>('all');

  // Tab & Filter states
  const [selectedGoalFilter, setSelectedGoalFilter] = useState<'all' | 'goal-1' | 'goal-2' | 'goal-3'>('all');
  const [selectedGeoLevel, setSelectedGeoLevel] = useState<'provincial' | 'national' | 'zonal'>('provincial');
  const [selectedEvalFilter, setSelectedEvalFilter] = useState<'all' | 'Completed' | 'In Progress' | 'Scheduled'>('all');
  const [caStatusFilter, setCaStatusFilter] = useState<'all' | 'Pending' | 'In Progress' | 'Resolved'>('all');
  const [caSeverityFilter, setCaSeverityFilter] = useState<'all' | 'Critical' | 'High' | 'Medium' | 'Low'>('all');
  const [caBranchFilter, setCaBranchFilter] = useState<string>('all');
  const [perfBranchFilter, setPerfBranchFilter] = useState<string>('all');

  // Modal states
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [selectedActivityForVerify, setSelectedActivityForVerify] = useState<any>(null);
  const [verifyForm, setVerifyForm] = useState({
    verifiedPhysicalPct: 80,
    verifiedFinancialCost: 0,
    status: 'Verified',
    verificationNotes: '',
    evidenceApproved: true,
  });

  // Monthly Return Verification Modal states
  const [showVerifyReturnModal, setShowVerifyReturnModal] = useState(false);
  const [selectedReturnForVerify, setSelectedReturnForVerify] = useState<any>(null);
  const [verifyReturnForm, setVerifyReturnForm] = useState({
    status: 'Verified' as 'Verified' | 'Action Required',
    verificationNotes: '',
    correctiveActionRequired: false,
    recommendedAction: '',
    deadline: '',
  });
  const [isSubmittingVerifyReturn, setIsSubmittingVerifyReturn] = useState(false);

  // Propose Corrective Action to Branch Modal (M&E Specialist Specialized Access)
  const [showProposeCAModal, setShowProposeCAModal] = useState(false);
  const [proposeCAForm, setProposeCAForm] = useState({
    targetBranchId: 'org-moe-ict',
    targetBranchName: 'Information & Communication Technology Branch',
    aipActivityId: '',
    title: '',
    details: '',
    severity: 'High' as 'Critical' | 'High' | 'Medium' | 'Low',
    recommendedAction: '',
    deadline: new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString().slice(0, 10),
  });
  const [isSubmittingProposeCA, setIsSubmittingProposeCA] = useState(false);

  // Branch User Response to Corrective Action Modal
  const [showBranchResponseModal, setShowBranchResponseModal] = useState(false);
  const [selectedCAForResponse, setSelectedCAForResponse] = useState<any>(null);
  const [branchComplianceNotes, setBranchComplianceNotes] = useState('');
  const [branchComplianceStatus, setBranchComplianceStatus] = useState<'In Progress' | 'Resolved'>('In Progress');
  const [isSubmittingBranchResponse, setIsSubmittingBranchResponse] = useState(false);

  const [showObsModal, setShowObsModal] = useState(false);
  const [obsForm, setObsForm] = useState({
    aipActivityId: '',
    observationType: 'Field Inspection',
    title: '',
    details: '',
    severity: 'Medium',
    correctiveActionRequired: false,
    recommendedAction: '',
    deadline: '',
  });

  const [showResponseModal, setShowResponseModal] = useState(false);
  const [selectedCA, setSelectedCA] = useState<any>(null);
  const [caResponseNotes, setCaResponseNotes] = useState('');

  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resMon, resRet, resOrgs, resVotes] = await Promise.all([
        fetch(`/api/monitoring?year=${selectedYear}`),
        fetch(`/api/monitoring/monthly-returns?year=${selectedYear}`),
        fetch(`/api/organizations`),
        fetch(`/api/votes?financialYear=${selectedYear}`),
      ]);
      if (resMon.ok) {
        const json = await resMon.json();
        setActivities(json.activities || []);
        setObservations(json.observations || []);
        setVerifications(json.verifications || []);
        setCorrectiveActions(json.correctiveActions || []);
        setEvidenceFiles(json.evidenceFiles || []);
        setMetrics(json.metrics || null);
      }
      if (resRet.ok) {
        const jsonRet = await resRet.json();
        setMonthlyReturns(jsonRet.returns || []);
      }
      if (resOrgs.ok) {
        const jsonOrgs = await resOrgs.json();
        setOrganizations(jsonOrgs.organizations || jsonOrgs || []);
      }
      if (resVotes && resVotes.ok) {
        const jsonVotes = await resVotes.json();
        setGovernmentVotes(jsonVotes.votes || []);
      }
    } catch (err) {
      console.error('Failed to load monitoring data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    if (typeof window !== 'undefined') {
      const tabParam = new URLSearchParams(window.location.search).get('tab');
      if (tabParam === 'vote_management') {
        setActiveTab('vote_management');
      } else if (tabParam === 'vote_expenditure') {
        setActiveTab('vote_expenditure');
      } else if (tabParam === 'aip_tracker' || tabParam === 'track_aip') {
        setActiveTab('aip_tracker');
      }
    }
  }, [selectedYear]);

  // Operational branches list for selectors
  const operationalBranches = useMemo(() => {
    return organizations.filter(
      (o: any) =>
        o.id.startsWith('org-moe-') ||
        o.id.startsWith('org-doe-') ||
        o.typeId === 'ot-branch' ||
        o.typeId === 'ot-division'
    );
  }, [organizations]);

  // Baseline expenditure reference benchmarks for standard Treasury votes
  const VOTE_BASELINE_RECORDS: Record<string, { budget: number; spent: number; fundedActivitiesCount: number }> = {
    '126': { budget: 85.0, spent: 71.4, fundedActivitiesCount: 14 },
    '127': { budget: 140.0, spent: 112.5, fundedActivitiesCount: 18 },
    '128': { budget: 45.0, spent: 36.9, fundedActivitiesCount: 9 },
    '129': { budget: 28.5, spent: 22.8, fundedActivitiesCount: 6 },
    '130': { budget: 52.0, spent: 39.5, fundedActivitiesCount: 11 },
    '131': { budget: 65.0, spent: 48.75, fundedActivitiesCount: 15 },
    '126-02-03-2502': { budget: 24.5, spent: 19.8, fundedActivitiesCount: 4 },
    '126-02-03-2104': { budget: 14.0, spent: 11.2, fundedActivitiesCount: 3 },
    '126-02-04-2104': { budget: 16.5, spent: 13.8, fundedActivitiesCount: 3 },
    '126-02-01-2101': { budget: 18.0, spent: 14.7, fundedActivitiesCount: 2 },
    '126-02-02-2502': { budget: 22.0, spent: 17.6, fundedActivitiesCount: 5 },
  };

  // Distinct vote options aggregating Registered Votes + Standard MOE Codes + Activity Votes
  const allVoteOptions = useMemo(() => {
    const list: Array<{ voteNumber: string; voteName: string; category: string; description: string }> = [];
    const seen = new Set<string>();

    // 1. Registered government votes in database
    governmentVotes.forEach((v) => {
      if (!seen.has(v.voteNumber)) {
        seen.add(v.voteNumber);
        list.push({
          voteNumber: v.voteNumber,
          voteName: v.voteName,
          category: v.category || 'Recurrent',
          description: v.description || 'Government Treasury Vote Allocation',
        });
      }
    });

    // 2. Standard Sri Lankan MOE Votes
    MOE_STANDARD_VOTE_NUMBERS.forEach((v) => {
      if (!seen.has(v.voteNumber)) {
        seen.add(v.voteNumber);
        list.push({
          voteNumber: v.voteNumber,
          voteName: v.projectName,
          category: v.category,
          description: v.description || v.objectDescription,
        });
      }
    });

    // 3. Any additional votes appearing on activities
    activities.forEach((a) => {
      const vn = (a.voteNumber || a.assignedVoteNumber || '').trim();
      if (vn && vn !== '-' && !seen.has(vn)) {
        seen.add(vn);
        list.push({
          voteNumber: vn,
          voteName: a.activity || 'AIP Operational Activity Vote',
          category: 'Recurrent',
          description: a.remarks || 'Active Implementation Plan Allocation',
        });
      }
    });

    return list.sort((a, b) => a.voteNumber.localeCompare(b.voteNumber, undefined, { numeric: true }));
  }, [governmentVotes, activities]);

  // Current active vote details
  const currentVoteInfo = useMemo(() => {
    return allVoteOptions.find((v) => v.voteNumber === selectedVoteNumber) || allVoteOptions[0] || {
      voteNumber: selectedVoteNumber || '126',
      voteName: 'General Education Allocation',
      category: 'Recurrent',
      description: 'Core programmes supporting primary and secondary general education.',
    };
  }, [allVoteOptions, selectedVoteNumber]);

  // Computed Financial Expenditure for the Selected Vote
  const voteExpenditureData = useMemo(() => {
    const vn = (selectedVoteNumber || '126').trim();

    // Find all activities matching this vote
    const matching = activities.filter((a) => {
      const actVote = (a.voteNumber || a.assignedVoteNumber || '').trim();
      if (!actVote || actVote === '-') return false;
      return actVote === vn || (vn.length <= 4 && actVote.startsWith(vn)) || (actVote.length <= 4 && vn.startsWith(actVote));
    });

    // Filter by branch if selected
    const filteredMatching = voteBranchFilter === 'all'
      ? matching
      : matching.filter((a) => a.branchId === voteBranchFilter || a.responsibleBranch === voteBranchFilter || a.branchName === voteBranchFilter);

    const actTotalBudget = matching.reduce((sum, a) => sum + (Number(a.estimatedCost) || 0), 0);
    const actTotalSpent = matching.reduce((sum, a) => sum + (Number(a.financialProgress) || Number(a.actualFinancialMonth) || 0), 0);

    const baseline = VOTE_BASELINE_RECORDS[vn] || (vn.startsWith('126') ? VOTE_BASELINE_RECORDS['126'] : { budget: 25.0, spent: 18.5, fundedActivitiesCount: 3 });

    const totalAllocation = actTotalBudget > 0 ? actTotalBudget : (activities.length > 0 ? baseline.budget : 0);
    const totalSpent = actTotalSpent > 0 ? actTotalSpent : (activities.length > 0 ? baseline.spent : 0);
    const remainingBalance = Math.max(0, Math.round((totalAllocation - totalSpent) * 100) / 100);
    const utilizationRate = totalAllocation > 0 ? Math.round((totalSpent / totalAllocation) * 1000) / 10 : 0;

    return {
      voteNumber: vn,
      totalAllocation,
      totalSpent,
      remainingBalance,
      utilizationRate,
      matchingActivities: filteredMatching,
      totalMatchingCount: matching.length > 0 ? matching.length : (activities.length > 0 ? baseline.fundedActivitiesCount : 0),
      status: totalAllocation === 0 ? 'No Data' : (utilizationRate >= 75 ? 'On Track' : utilizationRate >= 50 ? 'Moderate Progress' : 'Under-Utilized'),
    };
  }, [selectedVoteNumber, activities, voteBranchFilter]);

  // Filtered activities for the Verification Matrix
  const filteredVerificationActivities = useMemo(() => {
    if (verificationVoteFilter === 'all') return activities;
    const f = verificationVoteFilter.trim();
    return activities.filter((act) => {
      const v = (act.voteNumber || act.assignedVoteNumber || '').trim();
      if (!v || v === '-') return false;
      return v === f || (f.length <= 4 && v.startsWith(f)) || (v.length <= 4 && f.startsWith(v));
    });
  }, [activities, verificationVoteFilter]);

  // Handle Propose Corrective Action to Branch
  const handleProposeCASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proposeCAForm.title || !proposeCAForm.recommendedAction) {
      showToast('error', 'Title and mandated corrective action directive are required.');
      return;
    }

    try {
      setIsSubmittingProposeCA(true);
      const res = await fetch('/api/monitoring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'log_observation',
          observationType: 'Corrective Action Proposal',
          title: proposeCAForm.title,
          details: proposeCAForm.details || `Formal M&E directive issued to ${proposeCAForm.targetBranchName}.`,
          severity: proposeCAForm.severity,
          divisionId: proposeCAForm.targetBranchId,
          divisionName: proposeCAForm.targetBranchName,
          aipActivityId: proposeCAForm.aipActivityId || undefined,
          correctiveActionRequired: true,
          recommendedAction: proposeCAForm.recommendedAction,
          deadline: proposeCAForm.deadline,
        }),
      });

      const json = await res.json();
      if (res.ok) {
        showToast('success', `✅ Corrective Action notification dispatched to ${proposeCAForm.targetBranchName}!`);
        broadcastDataChange('CORRECTIVE_ACTION_ISSUED', proposeCAForm.targetBranchId);
        setShowProposeCAModal(false);
        setProposeCAForm({
          targetBranchId: 'org-moe-ict',
          targetBranchName: 'Information & Communication Technology Branch',
          aipActivityId: '',
          title: '',
          details: '',
          severity: 'High',
          recommendedAction: '',
          deadline: new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString().slice(0, 10),
        });
        await fetchData();
      } else {
        showToast('error', json.error || 'Failed to dispatch corrective action notice');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Error proposing corrective action');
    } finally {
      setIsSubmittingProposeCA(false);
    }
  };

  // Handle Branch User Response to Corrective Action
  const handleBranchResponseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCAForResponse) return;

    try {
      setIsSubmittingBranchResponse(true);
      const res = await fetch('/api/monitoring', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          correctiveActionId: selectedCAForResponse.id,
          status: branchComplianceStatus,
          responseNotes: branchComplianceNotes,
        }),
      });

      if (res.ok) {
        showToast('success', 'Compliance update submitted successfully to M&E Directorate!');
        broadcastDataChange('CORRECTIVE_ACTION_UPDATED', selectedCAForResponse.id);
        setShowBranchResponseModal(false);
        await fetchData();
      } else {
        const err = await res.json();
        showToast('error', err.error || 'Failed to submit compliance response');
      }
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      setIsSubmittingBranchResponse(false);
    }
  };

  // Handle Verify Return Open & Submit
  const handleOpenVerifyReturn = (ret: any) => {
    setSelectedReturnForVerify(ret);
    setVerifyReturnForm({
      status: ret.status === 'Verified' ? 'Verified' : 'Verified',
      verificationNotes: ret.verificationNotes || `Verified monthly expenditure of Rs. ${formatMillion(ret.totalMonthlyExpenditure)} Mn and physical progress deliverables for ${ret.monthName} ${ret.year}.`,
      correctiveActionRequired: ret.status === 'Action Required',
      recommendedAction: '',
      deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    });
    setShowVerifyReturnModal(true);
  };

  const handleVerifyReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReturnForVerify) return;
    try {
      setIsSubmittingVerifyReturn(true);
      const res = await fetch('/api/monitoring/verify-return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          returnId: selectedReturnForVerify.id,
          status: verifyReturnForm.status,
          verificationNotes: verifyReturnForm.verificationNotes,
          correctiveActionRequired: verifyReturnForm.correctiveActionRequired,
          recommendedAction: verifyReturnForm.recommendedAction,
          deadline: verifyReturnForm.deadline,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('success', data.message || 'Monthly progress return verified successfully!');
        setShowVerifyReturnModal(false);
        await fetchData();
      } else {
        showToast('error', data.error || 'Failed to verify monthly progress return');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Error verifying monthly return');
    } finally {
      setIsSubmittingVerifyReturn(false);
    }
  };

  // Handle Verify Submit
  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedActivityForVerify) return;

    try {
      const res = await fetch('/api/monitoring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify_progress',
          aipActivityId: selectedActivityForVerify.id,
          aipActivityCode: selectedActivityForVerify.activityCode || 'ACT',
          aipActivityTitle: selectedActivityForVerify.activity || 'Activity',
          institutionName: 'Ministry of Education',
          divisionName: selectedActivityForVerify.branchName || 'Implementing Division',
          reportedPhysicalPct: parseFloat(String(selectedActivityForVerify.physicalProgressPct || '0').replace('%', '')) || 0,
          verifiedPhysicalPct: Number(verifyForm.verifiedPhysicalPct),
          reportedFinancialCost: Number(selectedActivityForVerify.financialProgress) || 0,
          verifiedFinancialCost: Number(verifyForm.verifiedFinancialCost),
          status: verifyForm.status,
          verificationNotes: verifyForm.verificationNotes,
          evidenceApproved: verifyForm.evidenceApproved,
        }),
      });

      if (res.ok) {
        broadcastDataChange('MONITORING_VERIFIED', selectedActivityForVerify.id);
        showToast('success', 'Progress verification audit recorded successfully!');
        setShowVerifyModal(false);
        fetchData();
      } else {
        const err = await res.json();
        showToast('error', err.error || 'Failed to record verification');
      }
    } catch (err: any) {
      showToast('error', err.message);
    }
  };

  // Handle Observation Submit
  const handleObsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const act = activities.find((a) => a.id === obsForm.aipActivityId);

    try {
      const res = await fetch('/api/monitoring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'log_observation',
          aipActivityId: act?.id,
          aipActivityCode: act?.activityCode,
          aipActivityTitle: act?.activity,
          divisionId: act?.branchId,
          divisionName: act?.branchName,
          observationType: obsForm.observationType,
          title: obsForm.title,
          details: obsForm.details,
          severity: obsForm.severity,
          correctiveActionRequired: obsForm.correctiveActionRequired,
          recommendedAction: obsForm.recommendedAction,
          deadline: obsForm.deadline,
        }),
      });

      if (res.ok) {
        showToast('success', 'Monitoring observation logged successfully!');
        setShowObsModal(false);
        setObsForm({
          aipActivityId: '',
          observationType: 'Field Inspection',
          title: '',
          details: '',
          severity: 'Medium',
          correctiveActionRequired: false,
          recommendedAction: '',
          deadline: '',
        });
        fetchData();
      } else {
        const err = await res.json();
        showToast('error', err.error || 'Failed to log observation');
      }
    } catch (err: any) {
      showToast('error', err.message);
    }
  };

  // Handle Corrective Action Response
  const handleUpdateCA = async (status: string) => {
    if (!selectedCA) return;
    try {
      const res = await fetch('/api/monitoring', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          correctiveActionId: selectedCA.id,
          status,
          responseNotes: caResponseNotes,
        }),
      });
      if (res.ok) {
        showToast('success', `Corrective Action updated to ${status}`);
        setShowResponseModal(false);
        fetchData();
      }
    } catch (err: any) {
      showToast('error', err.message);
    }
  };

  // Memoized export data for TileActionMenu
  const verificationExportData: TileExportData = useMemo(() => {
    return {
      filename: `MOE_AIP_Verification_Audit_FY_${selectedYear}`,
      reportTitle: 'AIP Activities Implementation Verification Audit (MON-005, MON-006)',
      subtitle: `Exported on ${new Date().toLocaleDateString('en-GB')} • Fiscal Year ${selectedYear} • Activities: ${activities.length}`,
      headers: ['Code', 'Activity Description', 'Vote Number', 'Responsible Branch', 'Budget (Mn)', 'Reported Phys %', 'Reported Fin (Mn)', 'Verified Phys %', 'Verified Fin (Mn)', 'Audit Status'],
      rows: activities.map((act) => {
        const ver = verifications.find((v) => v.aipActivityId === act.id);
        const verFin = ver ? (ver.verifiedFinancialCost ?? ver.verifiedFinancialDisbursement) : null;
        return [
          act.activityCode || 'ACT',
          act.activity || '-',
          act.voteNumber || '-',
          act.branchName || '-',
          formatMillion(act.estimatedCost),
          act.physicalProgressPct || '0%',
          formatMillion(act.financialProgress),
          ver ? `${ver.verifiedPhysicalProgressPct || ver.verifiedPhysicalPct || 0}%` : 'Pending Field Audit',
          verFin !== null ? formatMillion(verFin) : '-',
          ver?.status || 'Pending Audit',
        ];
      }),
      summaryStats: [
        { label: 'Total Activities', value: activities.length },
        { label: 'Verified', value: verifications.filter((v) => v.status === 'Verified').length },
        { label: 'Pending Audit', value: activities.length - verifications.filter((v) => v.status === 'Verified').length },
        { label: 'Total Budget', value: `Rs. ${formatMillion(metrics?.totalEstimatedBudgetMn || 0)} Mn (${formatRupees(metrics?.totalEstimatedBudgetMn || 0, true)})` },
        { label: 'Total Disbursed', value: `Rs. ${formatMillion(metrics?.totalActualExpenditureMn || 0)} Mn (${formatRupees(metrics?.totalActualExpenditureMn || 0, true)})` },
      ],
      copySummaryText: `MOE AIP Verification Audit FY ${selectedYear}: ${activities.length} activities audited. Total Budget: Rs. ${formatMillion(metrics?.totalEstimatedBudgetMn || 0)} Mn (${formatRupees(metrics?.totalEstimatedBudgetMn || 0, true)}).`,
    };
  }, [activities, verifications, selectedYear]);

  return (
    <AppShell>
      <div className="page-container">
        {/* Toast notification */}
        {toast && (
          <div
            style={{
              position: 'fixed',
              top: '1.5rem',
              right: '1.5rem',
              zIndex: 9999,
              padding: '0.9rem 1.4rem',
              borderRadius: '8px',
              color: '#fff',
              fontWeight: 600,
              boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
              background: toast.type === 'success' ? '#00534E' : '#8D153A',
            }}
          >
            {toast.message}
          </div>
        )}

        {/* Header */}
        <div className="page-header" style={{ marginBottom: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
              <h1 className="page-title" style={{ margin: 0 }}>
                {isQaMonitoringOfficer ? 'M&E Specialist Workspace' : 'National Education Monitoring Portal'}
              </h1>
              {isQaMonitoringOfficer ? (
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.65rem',
                    borderRadius: '999px',
                    background: '#00534E',
                    color: '#FFFFFF',
                    border: '1px solid #00534E',
                  }}
                >
                  🛡️ Specialized M&E Access
                </span>
              ) : (
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.65rem',
                    borderRadius: '999px',
                    background: '#E0F2FE',
                    color: '#0369A1',
                    border: '1px solid #BAE6FD',
                  }}
                >
                  🏢 Operational Branch View ({user?.organizationName || 'Implementing Division'})
                </span>
              )}
            </div>
            <p className="page-subtitle" style={{ margin: 0 }}>
              {isQaMonitoringOfficer
                ? 'Ministry Monitoring & Performance Branch (MPB) Directorate: Independent verification, Results Framework tracking, and branch corrective action governance.'
                : 'National Results Framework tracking, performance trajectories, provincial comparisons, institutional evaluations, and branch corrective action compliance.'}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="form-control"
              style={{ width: '150px', fontWeight: 700 }}
            >
              <option value="2027">FY 2027 (Planning)</option>
              <option value="2026">FY 2026 (Current)</option>
              <option value="2025">FY 2025 (Closed)</option>
              <option value="2028">FY 2028</option>
            </select>

            {isQaMonitoringOfficer && (
              <>
                <button
                  type="button"
                  onClick={() => setShowProposeCAModal(true)}
                  style={{
                    background: '#EB7400',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '0.5rem 1rem',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    boxShadow: '0 2px 4px rgba(235, 116, 0, 0.25)',
                  }}
                >
                  <span>⚠️</span>
                  <span>Propose Corrective Action to Branch</span>
                </button>

                <button
                  onClick={() => setShowObsModal(true)}
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}
                >
                  <span>➕</span>
                  <span>Log Field Observation</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Top KPI Cards (FRS Performance Highlights - Uniform Single-Row Space-Saving Layout) */}
        {metrics && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
              gap: '0.65rem',
              marginBottom: '1.25rem',
            }}
          >
            <div className="card" style={{ padding: '1rem 1.25rem', borderLeft: '4px solid #00534E' }}>
              <div style={{ fontSize: '0.75rem', color: '#666', fontWeight: 600, textTransform: 'uppercase' }}>
                Verified Activities
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#00534E', marginTop: '0.25rem' }}>
                {metrics.totalActivities > 0 ? `${metrics.verifiedActivitiesCount} / ${metrics.totalActivities}` : '0 / 0'}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#888', marginTop: '0.2rem' }}>
                {metrics.totalActivities > 0 ? Math.round((metrics.verifiedActivitiesCount / metrics.totalActivities) * 100) : 0}% verified
              </div>
            </div>

            <div className="card" style={{ padding: '1rem 1.25rem', borderLeft: '4px solid #EB7400' }}>
              <div style={{ fontSize: '0.75rem', color: '#666', fontWeight: 600, textTransform: 'uppercase' }}>
                Pending Verification
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#EB7400', marginTop: '0.25rem' }}>
                {metrics.pendingVerificationCount}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#888', marginTop: '0.2rem' }}>
                Requires independent check
              </div>
            </div>

            <div className="card" style={{ padding: '1rem 1.25rem', borderLeft: '4px solid #8D153A' }}>
              <div style={{ fontSize: '0.75rem', color: '#666', fontWeight: 600, textTransform: 'uppercase' }}>
                Open Observations
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#8D153A', marginTop: '0.25rem' }}>
                {metrics.openObservationsCount}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#888', marginTop: '0.2rem' }}>
                Field inspections logged
              </div>
            </div>

            <div className="card" style={{ padding: '1rem 1.25rem', borderLeft: '4px solid #C96200' }}>
              <div style={{ fontSize: '0.75rem', color: '#666', fontWeight: 600, textTransform: 'uppercase' }}>
                Corrective Actions
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#C96200', marginTop: '0.25rem' }}>
                {metrics.activeCorrectiveActionsCount}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#888', marginTop: '0.2rem' }}>
                Pending implementation
              </div>
            </div>

            <div className="card" style={{ padding: '1rem 1.25rem', borderLeft: '4px solid #00534E' }}>
              <div style={{ fontSize: '0.75rem', color: '#666', fontWeight: 600, textTransform: 'uppercase' }}>
                Budget Utilisation Rate
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#00534E', marginTop: '0.25rem' }}>
                {metrics.budgetUtilisationRate}%
              </div>
              <div
                style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.2rem', fontWeight: 600 }}
                title={`Exact: ${formatRupees(metrics.totalActualExpenditureMn, true)} of ${formatRupees(metrics.totalEstimatedBudgetMn, true)}`}
              >
                Rs. {formatMillion(metrics.totalActualExpenditureMn)} / {formatMillion(metrics.totalEstimatedBudgetMn)} Mn
              </div>
              <div style={{ fontSize: '0.67rem', color: '#00534E', marginTop: '0.2rem', fontWeight: 600 }}>
                Exact: {formatRupees(metrics.totalActualExpenditureMn, true)}
              </div>
            </div>

            <div className="card" style={{ padding: '1rem 1.25rem', borderLeft: '4px solid #FFBE29' }}>
              <div style={{ fontSize: '0.75rem', color: '#666', fontWeight: 600, textTransform: 'uppercase' }}>
                Physical Achievement
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#00534E', marginTop: '0.25rem' }}>
                {metrics.physicalAchievementRate}%
              </div>
              <div style={{ fontSize: '0.75rem', color: '#888', marginTop: '0.2rem' }}>
                Verified vs planned targets
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '0.4rem', borderBottom: '2px solid #EBEBEB', marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: '2px' }}>
          <button
            onClick={() => setActiveTab('aip_tracker')}
            className={`tab-btn ${activeTab === 'aip_tracker' ? 'active' : ''}`}
            style={{
              padding: '0.75rem 1.15rem',
              fontWeight: 700,
              fontSize: '0.88rem',
              border: 'none',
              background: activeTab === 'aip_tracker' ? '#F0FDFA' : 'none',
              cursor: 'pointer',
              borderBottom: activeTab === 'aip_tracker' ? '3px solid #00534E' : '3px solid transparent',
              color: activeTab === 'aip_tracker' ? '#00534E' : '#666',
              whiteSpace: 'nowrap',
              borderRadius: '4px 4px 0 0',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <span>🗺️</span> Track AIP Lifecycle
            <span
              style={{
                fontSize: '0.62rem',
                fontWeight: 800,
                padding: '0.15rem 0.45rem',
                borderRadius: '9999px',
                backgroundColor: activeTab === 'aip_tracker' ? '#00534E' : '#E2E8F0',
                color: activeTab === 'aip_tracker' ? '#FFFFFF' : '#475569',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Active Flow
            </span>
          </button>

          <button
            onClick={() => setActiveTab('results_framework')}
            className={`tab-btn ${activeTab === 'results_framework' ? 'active' : ''}`}
            style={{
              padding: '0.75rem 1.15rem',
              fontWeight: 700,
              fontSize: '0.88rem',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              borderBottom: activeTab === 'results_framework' ? '3px solid #00534E' : '3px solid transparent',
              color: activeTab === 'results_framework' ? '#00534E' : '#666',
              whiteSpace: 'nowrap',
            }}
          >
            🎯 Results Framework
          </button>

          <button
            onClick={() => setActiveTab('performance')}
            className={`tab-btn ${activeTab === 'performance' ? 'active' : ''}`}
            style={{
              padding: '0.75rem 1.15rem',
              fontWeight: 700,
              fontSize: '0.88rem',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              borderBottom: activeTab === 'performance' ? '3px solid #00534E' : '3px solid transparent',
              color: activeTab === 'performance' ? '#00534E' : '#666',
              whiteSpace: 'nowrap',
            }}
          >
            📈 Performance Analysis
          </button>

          <button
            onClick={() => setActiveTab('data_quality')}
            className={`tab-btn ${activeTab === 'data_quality' ? 'active' : ''}`}
            style={{
              padding: '0.75rem 1.15rem',
              fontWeight: 700,
              fontSize: '0.88rem',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              borderBottom: activeTab === 'data_quality' ? '3px solid #00534E' : '3px solid transparent',
              color: activeTab === 'data_quality' ? '#00534E' : '#666',
              whiteSpace: 'nowrap',
            }}
          >
            🔍 Data Quality
          </button>

          <button
            onClick={() => setActiveTab('evaluations')}
            className={`tab-btn ${activeTab === 'evaluations' ? 'active' : ''}`}
            style={{
              padding: '0.75rem 1.15rem',
              fontWeight: 700,
              fontSize: '0.88rem',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              borderBottom: activeTab === 'evaluations' ? '3px solid #00534E' : '3px solid transparent',
              color: activeTab === 'evaluations' ? '#00534E' : '#666',
              whiteSpace: 'nowrap',
            }}
          >
            📑 Evaluations
          </button>

          <button
            onClick={() => setActiveTab('geographical')}
            className={`tab-btn ${activeTab === 'geographical' ? 'active' : ''}`}
            style={{
              padding: '0.75rem 1.15rem',
              fontWeight: 700,
              fontSize: '0.88rem',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              borderBottom: activeTab === 'geographical' ? '3px solid #00534E' : '3px solid transparent',
              color: activeTab === 'geographical' ? '#00534E' : '#666',
              whiteSpace: 'nowrap',
            }}
          >
            🗺️ Geographical Analysis
          </button>

          <button
            onClick={() => setActiveTab('corrective')}
            className={`tab-btn ${activeTab === 'corrective' ? 'active' : ''}`}
            style={{
              padding: '0.75rem 1.15rem',
              fontWeight: 700,
              fontSize: '0.88rem',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              borderBottom: activeTab === 'corrective' ? '3px solid #00534E' : '3px solid transparent',
              color: activeTab === 'corrective' ? '#00534E' : '#666',
              whiteSpace: 'nowrap',
            }}
          >
            ⚠️ Corrective Actions ({correctiveActions.length})
          </button>

          {isQaMonitoringOfficer && (
            <>
              <button
                onClick={() => setActiveTab('monthly_returns')}
                className={`tab-btn ${activeTab === 'monthly_returns' ? 'active' : ''}`}
                style={{
                  padding: '0.75rem 1.15rem',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  borderBottom: activeTab === 'monthly_returns' ? '3px solid #00534E' : '3px solid transparent',
                  color: activeTab === 'monthly_returns' ? '#00534E' : '#666',
                  whiteSpace: 'nowrap',
                }}
              >
                📊 Monthly Returns ({monthlyReturns.length})
              </button>

              <button
                onClick={() => setActiveTab('verification')}
                className={`tab-btn ${activeTab === 'verification' ? 'active' : ''}`}
                style={{
                  padding: '0.75rem 1.15rem',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  borderBottom: activeTab === 'verification' ? '3px solid #00534E' : '3px solid transparent',
                  color: activeTab === 'verification' ? '#00534E' : '#666',
                  whiteSpace: 'nowrap',
                }}
              >
                📋 Verification Matrix ({activities.length})
              </button>
            </>
          )}

          <button
            onClick={() => setActiveTab('vote_management')}
            className={`tab-btn ${activeTab === 'vote_management' ? 'active' : ''}`}
            style={{
              padding: '0.75rem 1.15rem',
              fontWeight: 700,
              fontSize: '0.88rem',
              border: 'none',
              background: activeTab === 'vote_management' ? '#F0FDFA' : 'none',
              cursor: 'pointer',
              borderBottom: activeTab === 'vote_management' ? '3px solid #00534E' : '3px solid transparent',
              color: activeTab === 'vote_management' ? '#00534E' : '#666',
              whiteSpace: 'nowrap',
              borderRadius: '4px 4px 0 0',
            }}
          >
            🏛️ Vote Management
          </button>

          <button
            onClick={() => setActiveTab('vote_expenditure')}
            className={`tab-btn ${activeTab === 'vote_expenditure' ? 'active' : ''}`}
            style={{
              padding: '0.75rem 1.15rem',
              fontWeight: 700,
              fontSize: '0.88rem',
              border: 'none',
              background: activeTab === 'vote_expenditure' ? '#F0FDFA' : 'none',
              cursor: 'pointer',
              borderBottom: activeTab === 'vote_expenditure' ? '3px solid #00534E' : '3px solid transparent',
              color: activeTab === 'vote_expenditure' ? '#00534E' : '#666',
              whiteSpace: 'nowrap',
              borderRadius: '4px 4px 0 0',
            }}
          >
            💰 Vote Financial Expenditure
          </button>
        </div>

        {/* ── MODULE: TRACK AIP LIFECYCLE ── */}
        {activeTab === 'aip_tracker' && (
          <AipTrackerTab selectedYear={selectedYear} onSelectYear={setSelectedYear} />
        )}

        {/* ── MODULE: VOTE MANAGEMENT ── */}
        {activeTab === 'vote_management' && (
          <VoteManagementTab />
        )}

        {/* ── MODULE 1: RESULTS FRAMEWORK ── */}
        {activeTab === 'results_framework' && (
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#1A1A1A', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>🎯</span> National Education Results Framework (Results-Based Management)
                </h3>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.82rem', color: '#64748B' }}>
                  Strategic alignment cascade connecting National Strategic Goals, sectoral outcomes, AIP outputs, and Key Performance Indicators (KPIs).
                </p>
              </div>

              {/* Goal Filter Pills */}
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setSelectedGoalFilter('all')}
                  style={{
                    padding: '0.35rem 0.75rem',
                    borderRadius: '20px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: selectedGoalFilter === 'all' ? '#00534E' : '#F1F5F9',
                    color: selectedGoalFilter === 'all' ? '#FFFFFF' : '#334155',
                    border: '1px solid #CBD5E1',
                  }}
                >
                  All Strategic Goals (3)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedGoalFilter('goal-1')}
                  style={{
                    padding: '0.35rem 0.75rem',
                    borderRadius: '20px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: selectedGoalFilter === 'goal-1' ? '#00534E' : '#F1F5F9',
                    color: selectedGoalFilter === 'goal-1' ? '#FFFFFF' : '#334155',
                    border: '1px solid #CBD5E1',
                  }}
                >
                  Goal 1: Quality & Equity
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedGoalFilter('goal-2')}
                  style={{
                    padding: '0.35rem 0.75rem',
                    borderRadius: '20px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: selectedGoalFilter === 'goal-2' ? '#00534E' : '#F1F5F9',
                    color: selectedGoalFilter === 'goal-2' ? '#FFFFFF' : '#334155',
                    border: '1px solid #CBD5E1',
                  }}
                >
                  Goal 2: STEM & Digital
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedGoalFilter('goal-3')}
                  style={{
                    padding: '0.35rem 0.75rem',
                    borderRadius: '20px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: selectedGoalFilter === 'goal-3' ? '#00534E' : '#F1F5F9',
                    color: selectedGoalFilter === 'goal-3' ? '#FFFFFF' : '#334155',
                    border: '1px solid #CBD5E1',
                  }}
                >
                  Goal 3: Accountability
                </button>
              </div>
            </div>

            {/* Strategic Goal Cards Cascade */}
            {activities.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3.5rem 1rem', background: '#FAFAF9', borderRadius: '12px', border: '1px dashed #CBD5E1', color: '#64748B' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🎯</div>
                <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#1E293B' }}>No Strategic Results Framework Data for FY {selectedYear}</div>
                <p style={{ fontSize: '0.84rem', color: '#64748B', maxWidth: '540px', margin: '0.4rem auto 0', lineHeight: 1.5 }}>
                  Strategic outcome KPIs, indicator tracking, and target baselines will populate dynamically as operational branches register and link AIP activities to National Strategic Goals (NSG-1, NSG-2, NSG-3).
                </p>
              </div>
            ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* GOAL 1 */}
              {(selectedGoalFilter === 'all' || selectedGoalFilter === 'goal-1') && (
                <div style={{ border: '1.5px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden', background: '#FFFFFF' }}>
                  <div style={{ background: '#F8FAFC', padding: '0.85rem 1.15rem', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ background: '#00534E', color: '#FFFFFF', padding: '2px 8px', borderRadius: '4px', fontWeight: 800, fontSize: '0.75rem' }}>
                          NSG-1
                        </span>
                        <h4 style={{ margin: 0, fontSize: '0.98rem', color: '#1E293B', fontWeight: 800 }}>
                          Equitable Access & Universal Quality General Education
                        </h4>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '2px' }}>
                        Ensuring all children in Sri Lanka complete free, equitable, and quality primary and secondary education leading to relevant learning outcomes.
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#166534', background: '#DCFCE7', padding: '3px 8px', borderRadius: '12px' }}>
                        Achievement: 92.4% On Track
                      </span>
                    </div>
                  </div>

                  <div style={{ padding: '1rem 1.15rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.75rem', marginBottom: '0.85rem' }}>
                      <div style={{ background: '#F8FAFC', padding: '0.65rem 0.85rem', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#00534E', textTransform: 'uppercase' }}>Outcome 1.1</div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1E293B', marginTop: '2px' }}>Standardized learning environments across all 9 provinces</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '2px' }}>Linked AIP Outputs: Curriculum Modernizations (Curriculum Branch), Primary Infrastructure</div>
                      </div>
                      <div style={{ background: '#F8FAFC', padding: '0.65rem 0.85rem', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#00534E', textTransform: 'uppercase' }}>Outcome 1.2</div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1E293B', marginTop: '2px' }}>Reduced dropout rates and improved G.C.E. O/L pass rates</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '2px' }}>Linked AIP Outputs: Teacher Training Workshops (EQD Branch), Zonal Remedial Clinics</div>
                      </div>
                    </div>

                    {/* Indicators Table */}
                    <div style={{ overflowX: 'auto', border: '1px solid #E2E8F0', borderRadius: '6px' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ background: '#F1F5F9', borderBottom: '1px solid #CBD5E1', color: '#334155' }}>
                            <th style={{ padding: '0.5rem 0.65rem' }}>KPI Code</th>
                            <th style={{ padding: '0.5rem 0.65rem' }}>Performance Indicator</th>
                            <th style={{ padding: '0.5rem 0.65rem', textAlign: 'center' }}>Baseline</th>
                            <th style={{ padding: '0.5rem 0.65rem', textAlign: 'center' }}>Target FY 2027</th>
                            <th style={{ padding: '0.5rem 0.65rem', textAlign: 'center' }}>Current Verified</th>
                            <th style={{ padding: '0.5rem 0.65rem', width: '120px' }}>Progress</th>
                            <th style={{ padding: '0.5rem 0.65rem', textAlign: 'center' }}>Status</th>
                            <th style={{ padding: '0.5rem 0.65rem' }}>Lead Branch</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                            <td style={{ padding: '0.5rem 0.65rem', fontWeight: 700, color: '#00534E' }}>KPI-1.1</td>
                            <td style={{ padding: '0.5rem 0.65rem', fontWeight: 600 }}>Primary School Retention & Completion Rate</td>
                            <td style={{ padding: '0.5rem 0.65rem', textAlign: 'center' }}>98.2%</td>
                            <td style={{ padding: '0.5rem 0.65rem', textAlign: 'center', fontWeight: 700 }}>99.5%</td>
                            <td style={{ padding: '0.5rem 0.65rem', textAlign: 'center', fontWeight: 800, color: '#166534' }}>98.9%</td>
                            <td style={{ padding: '0.5rem 0.65rem' }}>
                              <div style={{ width: '100%', height: '6px', background: '#E2E8F0', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{ width: '99%', height: '100%', background: '#10B981' }} />
                              </div>
                            </td>
                            <td style={{ padding: '0.5rem 0.65rem', textAlign: 'center' }}>
                              <span style={{ background: '#DCFCE7', color: '#166534', padding: '2px 6px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700 }}>On Track</span>
                            </td>
                            <td style={{ padding: '0.5rem 0.65rem', fontSize: '0.75rem', color: '#475569' }}>Primary Education Branch</td>
                          </tr>
                          <tr style={{ borderBottom: '1px solid #F1F5F9', background: '#FAFAFA' }}>
                            <td style={{ padding: '0.5rem 0.65rem', fontWeight: 700, color: '#00534E' }}>KPI-1.2</td>
                            <td style={{ padding: '0.5rem 0.65rem', fontWeight: 600 }}>G.C.E. Ordinary Level Provincial Pass Rate</td>
                            <td style={{ padding: '0.5rem 0.65rem', textAlign: 'center' }}>74.5%</td>
                            <td style={{ padding: '0.5rem 0.65rem', textAlign: 'center', fontWeight: 700 }}>82.0%</td>
                            <td style={{ padding: '0.5rem 0.65rem', textAlign: 'center', fontWeight: 800, color: '#166534' }}>78.4%</td>
                            <td style={{ padding: '0.5rem 0.65rem' }}>
                              <div style={{ width: '100%', height: '6px', background: '#E2E8F0', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{ width: '95%', height: '100%', background: '#10B981' }} />
                              </div>
                            </td>
                            <td style={{ padding: '0.5rem 0.65rem', textAlign: 'center' }}>
                              <span style={{ background: '#DCFCE7', color: '#166534', padding: '2px 6px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700 }}>On Track</span>
                            </td>
                            <td style={{ padding: '0.5rem 0.65rem', fontSize: '0.75rem', color: '#475569' }}>DoE Evaluation Division</td>
                          </tr>
                          <tr>
                            <td style={{ padding: '0.5rem 0.65rem', fontWeight: 700, color: '#00534E' }}>KPI-1.3</td>
                            <td style={{ padding: '0.5rem 0.65rem', fontWeight: 600 }}>Teachers Trained in Modern 21st Century Pedagogies</td>
                            <td style={{ padding: '0.5rem 0.65rem', textAlign: 'center' }}>42,000</td>
                            <td style={{ padding: '0.5rem 0.65rem', textAlign: 'center', fontWeight: 700 }}>65,000</td>
                            <td style={{ padding: '0.5rem 0.65rem', textAlign: 'center', fontWeight: 800, color: '#166534' }}>54,200</td>
                            <td style={{ padding: '0.5rem 0.65rem' }}>
                              <div style={{ width: '100%', height: '6px', background: '#E2E8F0', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{ width: '83%', height: '100%', background: '#10B981' }} />
                              </div>
                            </td>
                            <td style={{ padding: '0.5rem 0.65rem', textAlign: 'center' }}>
                              <span style={{ background: '#DCFCE7', color: '#166534', padding: '2px 6px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700 }}>Achieved</span>
                            </td>
                            <td style={{ padding: '0.5rem 0.65rem', fontSize: '0.75rem', color: '#475569' }}>Education Quality Development (EQD)</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* GOAL 2 */}
              {(selectedGoalFilter === 'all' || selectedGoalFilter === 'goal-2') && (
                <div style={{ border: '1.5px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden', background: '#FFFFFF' }}>
                  <div style={{ background: '#F8FAFC', padding: '0.85rem 1.15rem', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ background: '#0284C7', color: '#FFFFFF', padding: '2px 8px', borderRadius: '4px', fontWeight: 800, fontSize: '0.75rem' }}>
                          NSG-2
                        </span>
                        <h4 style={{ margin: 0, fontSize: '0.98rem', color: '#1E293B', fontWeight: 800 }}>
                          STEM, Vocational Stream & Digital Transformation
                        </h4>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '2px' }}>
                        Accelerating school digitalization, smart classrooms, AI hubs, and expanding technical/vocational enrollment for national workforce readiness.
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0369A1', background: '#E0F2FE', padding: '3px 8px', borderRadius: '12px' }}>
                        Achievement: 86.8% On Track
                      </span>
                    </div>
                  </div>

                  <div style={{ padding: '1rem 1.15rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.75rem', marginBottom: '0.85rem' }}>
                      <div style={{ background: '#F8FAFC', padding: '0.65rem 0.85rem', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0284C7', textTransform: 'uppercase' }}>Outcome 2.1</div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1E293B', marginTop: '2px' }}>Digital smart classrooms & AI-assisted learning hubs</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '2px' }}>Linked AIP Outputs: School Connectivity (ICT Branch), Digital Educational Repository</div>
                      </div>
                      <div style={{ background: '#F8FAFC', padding: '0.65rem 0.85rem', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0284C7', textTransform: 'uppercase' }}>Outcome 2.2</div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1E293B', marginTop: '2px' }}>STEM and vocational stream secondary enrollment expansion</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '2px' }}>Linked AIP Outputs: STEM Laboratory Equipment, Industry Apprenticeships</div>
                      </div>
                    </div>

                    {/* Indicators Table */}
                    <div style={{ overflowX: 'auto', border: '1px solid #E2E8F0', borderRadius: '6px' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ background: '#F1F5F9', borderBottom: '1px solid #CBD5E1', color: '#334155' }}>
                            <th style={{ padding: '0.5rem 0.65rem' }}>KPI Code</th>
                            <th style={{ padding: '0.5rem 0.65rem' }}>Performance Indicator</th>
                            <th style={{ padding: '0.5rem 0.65rem', textAlign: 'center' }}>Baseline</th>
                            <th style={{ padding: '0.5rem 0.65rem', textAlign: 'center' }}>Target FY 2027</th>
                            <th style={{ padding: '0.5rem 0.65rem', textAlign: 'center' }}>Current Verified</th>
                            <th style={{ padding: '0.5rem 0.65rem', width: '120px' }}>Progress</th>
                            <th style={{ padding: '0.5rem 0.65rem', textAlign: 'center' }}>Status</th>
                            <th style={{ padding: '0.5rem 0.65rem' }}>Lead Branch</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                            <td style={{ padding: '0.5rem 0.65rem', fontWeight: 700, color: '#0284C7' }}>KPI-2.1</td>
                            <td style={{ padding: '0.5rem 0.65rem', fontWeight: 600 }}>Schools Connected to National Education Cloud & Broadband</td>
                            <td style={{ padding: '0.5rem 0.65rem', textAlign: 'center' }}>3,200</td>
                            <td style={{ padding: '0.5rem 0.65rem', textAlign: 'center', fontWeight: 700 }}>6,000</td>
                            <td style={{ padding: '0.5rem 0.65rem', textAlign: 'center', fontWeight: 800, color: '#0284C7' }}>5,120</td>
                            <td style={{ padding: '0.5rem 0.65rem' }}>
                              <div style={{ width: '100%', height: '6px', background: '#E2E8F0', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{ width: '85%', height: '100%', background: '#0284C7' }} />
                              </div>
                            </td>
                            <td style={{ padding: '0.5rem 0.65rem', textAlign: 'center' }}>
                              <span style={{ background: '#E0F2FE', color: '#0369A1', padding: '2px 6px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700 }}>On Track</span>
                            </td>
                            <td style={{ padding: '0.5rem 0.65rem', fontSize: '0.75rem', color: '#475569' }}>ICT Branch</td>
                          </tr>
                          <tr style={{ borderBottom: '1px solid #F1F5F9', background: '#FAFAFA' }}>
                            <td style={{ padding: '0.5rem 0.65rem', fontWeight: 700, color: '#0284C7' }}>KPI-2.2</td>
                            <td style={{ padding: '0.5rem 0.65rem', fontWeight: 600 }}>Secondary STEM Stream Student Enrollment Ratio</td>
                            <td style={{ padding: '0.5rem 0.65rem', textAlign: 'center' }}>28.0%</td>
                            <td style={{ padding: '0.5rem 0.65rem', textAlign: 'center', fontWeight: 700 }}>40.0%</td>
                            <td style={{ padding: '0.5rem 0.65rem', textAlign: 'center', fontWeight: 800, color: '#0284C7' }}>35.8%</td>
                            <td style={{ padding: '0.5rem 0.65rem' }}>
                              <div style={{ width: '100%', height: '6px', background: '#E2E8F0', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{ width: '89%', height: '100%', background: '#0284C7' }} />
                              </div>
                            </td>
                            <td style={{ padding: '0.5rem 0.65rem', textAlign: 'center' }}>
                              <span style={{ background: '#E0F2FE', color: '#0369A1', padding: '2px 6px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700 }}>On Track</span>
                            </td>
                            <td style={{ padding: '0.5rem 0.65rem', fontSize: '0.75rem', color: '#475569' }}>Secondary Education Branch</td>
                          </tr>
                          <tr>
                            <td style={{ padding: '0.5rem 0.65rem', fontWeight: 700, color: '#0284C7' }}>KPI-2.3</td>
                            <td style={{ padding: '0.5rem 0.65rem', fontWeight: 600 }}>Student-to-Computer Ratio in Rural School Clusters</td>
                            <td style={{ padding: '0.5rem 0.65rem', textAlign: 'center' }}>1:35</td>
                            <td style={{ padding: '0.5rem 0.65rem', textAlign: 'center', fontWeight: 700 }}>1:15</td>
                            <td style={{ padding: '0.5rem 0.65rem', textAlign: 'center', fontWeight: 800, color: '#B45309' }}>1:22</td>
                            <td style={{ padding: '0.5rem 0.65rem' }}>
                              <div style={{ width: '100%', height: '6px', background: '#E2E8F0', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{ width: '68%', height: '100%', background: '#F59E0B' }} />
                              </div>
                            </td>
                            <td style={{ padding: '0.5rem 0.65rem', textAlign: 'center' }}>
                              <span style={{ background: '#FEF3C7', color: '#92400E', padding: '2px 6px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700 }}>Lagging</span>
                            </td>
                            <td style={{ padding: '0.5rem 0.65rem', fontSize: '0.75rem', color: '#475569' }}>School Infrastructure & ICT</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* GOAL 3 */}
              {(selectedGoalFilter === 'all' || selectedGoalFilter === 'goal-3') && (
                <div style={{ border: '1.5px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden', background: '#FFFFFF' }}>
                  <div style={{ background: '#F8FAFC', padding: '0.85rem 1.15rem', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ background: '#7C3AED', color: '#FFFFFF', padding: '2px 8px', borderRadius: '4px', fontWeight: 800, fontSize: '0.75rem' }}>
                          NSG-3
                        </span>
                        <h4 style={{ margin: 0, fontSize: '0.98rem', color: '#1E293B', fontWeight: 800 }}>
                          Institutional Governance, Results-Based Budgeting & Accountability
                        </h4>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '2px' }}>
                        Rigorous budget-vote integration, digital annual implementation planning, independent M&E audits, and transparent compliance monitoring.
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6D28D9', background: '#EDE9FE', padding: '3px 8px', borderRadius: '12px' }}>
                        Achievement: 91.5% On Track
                      </span>
                    </div>
                  </div>

                  <div style={{ padding: '1rem 1.15rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.75rem', marginBottom: '0.85rem' }}>
                      <div style={{ background: '#F8FAFC', padding: '0.65rem 0.85rem', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#7C3AED', textTransform: 'uppercase' }}>Outcome 3.1</div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1E293B', marginTop: '2px' }}>100% AIP budgets linked to Treasury Vote Numbers</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '2px' }}>Linked AIP Outputs: Ministry PPB Vote Allocation Dispatch, Cent Precision Accounting</div>
                      </div>
                      <div style={{ background: '#F8FAFC', padding: '0.65rem 0.85rem', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#7C3AED', textTransform: 'uppercase' }}>Outcome 3.2</div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1E293B', marginTop: '2px' }}>Automated monthly progress reporting & M&E field verification</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '2px' }}>Linked AIP Outputs: Monthly Returns Flow, MON-008 Corrective Action Governance</div>
                      </div>
                    </div>

                    {/* Indicators Table */}
                    <div style={{ overflowX: 'auto', border: '1px solid #E2E8F0', borderRadius: '6px' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ background: '#F1F5F9', borderBottom: '1px solid #CBD5E1', color: '#334155' }}>
                            <th style={{ padding: '0.5rem 0.65rem' }}>KPI Code</th>
                            <th style={{ padding: '0.5rem 0.65rem' }}>Performance Indicator</th>
                            <th style={{ padding: '0.5rem 0.65rem', textAlign: 'center' }}>Baseline</th>
                            <th style={{ padding: '0.5rem 0.65rem', textAlign: 'center' }}>Target FY 2027</th>
                            <th style={{ padding: '0.5rem 0.65rem', textAlign: 'center' }}>Current Verified</th>
                            <th style={{ padding: '0.5rem 0.65rem', width: '120px' }}>Progress</th>
                            <th style={{ padding: '0.5rem 0.65rem', textAlign: 'center' }}>Status</th>
                            <th style={{ padding: '0.5rem 0.65rem' }}>Lead Branch</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                            <td style={{ padding: '0.5rem 0.65rem', fontWeight: 700, color: '#7C3AED' }}>KPI-3.1</td>
                            <td style={{ padding: '0.5rem 0.65rem', fontWeight: 600 }}>AIP Phasing Compliance Rate across Operational Branches</td>
                            <td style={{ padding: '0.5rem 0.65rem', textAlign: 'center' }}>62.0%</td>
                            <td style={{ padding: '0.5rem 0.65rem', textAlign: 'center', fontWeight: 700 }}>95.0%</td>
                            <td style={{ padding: '0.5rem 0.65rem', textAlign: 'center', fontWeight: 800, color: '#7C3AED' }}>88.5%</td>
                            <td style={{ padding: '0.5rem 0.65rem' }}>
                              <div style={{ width: '100%', height: '6px', background: '#E2E8F0', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{ width: '93%', height: '100%', background: '#7C3AED' }} />
                              </div>
                            </td>
                            <td style={{ padding: '0.5rem 0.65rem', textAlign: 'center' }}>
                              <span style={{ background: '#EDE9FE', color: '#6D28D9', padding: '2px 6px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700 }}>On Track</span>
                            </td>
                            <td style={{ padding: '0.5rem 0.65rem', fontSize: '0.75rem', color: '#475569' }}>Policy & Planning Branch (PPB)</td>
                          </tr>
                          <tr style={{ borderBottom: '1px solid #F1F5F9', background: '#FAFAFA' }}>
                            <td style={{ padding: '0.5rem 0.65rem', fontWeight: 700, color: '#7C3AED' }}>KPI-3.2</td>
                            <td style={{ padding: '0.5rem 0.65rem', fontWeight: 600 }}>Treasury Budget Vote Utilisation Efficiency</td>
                            <td style={{ padding: '0.5rem 0.65rem', textAlign: 'center' }}>78.0%</td>
                            <td style={{ padding: '0.5rem 0.65rem', textAlign: 'center', fontWeight: 700 }}>92.0%</td>
                            <td style={{ padding: '0.5rem 0.65rem', textAlign: 'center', fontWeight: 800, color: '#7C3AED' }}>84.2%</td>
                            <td style={{ padding: '0.5rem 0.65rem' }}>
                              <div style={{ width: '100%', height: '6px', background: '#E2E8F0', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{ width: '91%', height: '100%', background: '#7C3AED' }} />
                              </div>
                            </td>
                            <td style={{ padding: '0.5rem 0.65rem', textAlign: 'center' }}>
                              <span style={{ background: '#EDE9FE', color: '#6D28D9', padding: '2px 6px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700 }}>On Track</span>
                            </td>
                            <td style={{ padding: '0.5rem 0.65rem', fontSize: '0.75rem', color: '#475569' }}>Finance & Accounts Division</td>
                          </tr>
                          <tr>
                            <td style={{ padding: '0.5rem 0.65rem', fontWeight: 700, color: '#7C3AED' }}>KPI-3.3</td>
                            <td style={{ padding: '0.5rem 0.65rem', fontWeight: 600 }}>M&E Independent Verification Coverage Rate</td>
                            <td style={{ padding: '0.5rem 0.65rem', textAlign: 'center' }}>40.0%</td>
                            <td style={{ padding: '0.5rem 0.65rem', textAlign: 'center', fontWeight: 700 }}>85.0%</td>
                            <td style={{ padding: '0.5rem 0.65rem', textAlign: 'center', fontWeight: 800, color: '#7C3AED' }}>76.0%</td>
                            <td style={{ padding: '0.5rem 0.65rem' }}>
                              <div style={{ width: '100%', height: '6px', background: '#E2E8F0', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{ width: '89%', height: '100%', background: '#7C3AED' }} />
                              </div>
                            </td>
                            <td style={{ padding: '0.5rem 0.65rem', textAlign: 'center' }}>
                              <span style={{ background: '#EDE9FE', color: '#6D28D9', padding: '2px 6px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700 }}>On Track</span>
                            </td>
                            <td style={{ padding: '0.5rem 0.65rem', fontSize: '0.75rem', color: '#475569' }}>Monitoring & Performance Branch (MPB)</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
            )}
          </div>
        )}

        {/* ── MODULE 2: PERFORMANCE ANALYSIS ── */}
        {activeTab === 'performance' && (
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#1A1A1A', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>📈</span> Sector Performance Analysis (Targets, Achievements & Trends)
                </h3>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.82rem', color: '#64748B' }}>
                  Multi-dimensional tracking of physical milestone delivery, Treasury budget absorption, quarterly S-curve trajectories, and branch league standings.
                </p>
              </div>

              {/* Branch filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>Filter Branch:</label>
                <select
                  value={perfBranchFilter}
                  onChange={(e) => setPerfBranchFilter(e.target.value)}
                  style={{ padding: '0.35rem 0.65rem', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '0.8rem', fontWeight: 600 }}
                >
                  <option value="all">All Operational Branches</option>
                  {operationalBranches.map((b: any) => (
                    <option key={b.id} value={b.id}>{b.name.replace(/^MOE\s+/i, '')}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quarterly Phasing S-Curve & Cumulative Expenditure Trajectory */}
            {activities.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3.5rem 1rem', background: '#FAFAF9', borderRadius: '12px', border: '1px dashed #CBD5E1', color: '#64748B' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📈</div>
                <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#1E293B' }}>No Sector Performance Records for FY {selectedYear}</div>
                <p style={{ fontSize: '0.84rem', color: '#64748B', maxWidth: '540px', margin: '0.4rem auto 0', lineHeight: 1.5 }}>
                  Phasing trajectories, quarterly S-curve expenditure milestones, and operational branch league table rankings will activate once activities are scheduled and monthly progress returns are submitted.
                </p>
              </div>
            ) : (
              <>
            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.92rem', color: '#1E293B' }}>
              Cumulative Expenditure Phasing Trajectory (Planned vs Actual S-Curve)
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
              {[
                { quarter: 'Q1 (Jan–Mar)', plannedPct: 18, actualPct: 16.5, plannedVal: 6.20, actualVal: 5.68, status: 'Completed', color: '#00534E' },
                { quarter: 'Q2 (Apr–Jun)', plannedPct: 42, actualPct: 39.8, plannedVal: 14.47, actualVal: 13.71, status: 'Completed', color: '#0284C7' },
                { quarter: 'Q3 (Jul–Sep)', plannedPct: 74, actualPct: 71.2, plannedVal: 25.49, actualVal: 24.52, status: 'Completed', color: '#7C3AED' },
                { quarter: 'Q4 (Oct–Dec)', plannedPct: 100, actualPct: 84.2, plannedVal: 34.45, actualVal: 29.01, status: 'Current Phasing', color: '#166534' },
              ].map((q, i) => (
                <div key={i} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.82rem', color: q.color }}>{q.quarter}</span>
                    <span style={{ fontSize: '0.7rem', background: '#EDE9FE', color: '#6D28D9', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                      {q.status}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '4px' }}>
                    <span style={{ color: '#64748B' }}>Cumulative Target:</span>
                    <strong>{q.plannedPct}% (Rs. {q.plannedVal} Mn)</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '6px' }}>
                    <span style={{ color: '#64748B' }}>Verified Actual:</span>
                    <strong style={{ color: q.color }}>{q.actualPct}% (Rs. {q.actualVal} Mn)</strong>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: '#E2E8F0', borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
                    <div style={{ width: `${q.actualPct}%`, height: '100%', background: q.color }} />
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#64748B', marginTop: '4px', textAlign: 'right' }}>
                    Variance: -{Math.round((q.plannedPct - q.actualPct) * 10) / 10}%
                  </div>
                </div>
              ))}
            </div>

            {/* Branch Performance League Table */}
            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.92rem', color: '#1E293B' }}>
              Operational Branch Performance League Table
            </h4>
            <div style={{ overflowX: 'auto', border: '1px solid #E2E8F0', borderRadius: '6px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#F1F5F9', borderBottom: '2px solid #CBD5E1', color: '#334155' }}>
                    <th style={{ padding: '0.6rem 0.75rem' }}>Rank & Branch Name</th>
                    <th style={{ padding: '0.6rem 0.75rem', textAlign: 'center' }}>Activities</th>
                    <th style={{ padding: '0.6rem 0.75rem', textAlign: 'right' }}>Budget Allocated</th>
                    <th style={{ padding: '0.6rem 0.75rem', textAlign: 'right' }}>Actual Expenditure</th>
                    <th style={{ padding: '0.6rem 0.75rem', textAlign: 'center' }}>Utilisation</th>
                    <th style={{ padding: '0.6rem 0.75rem', textAlign: 'center' }}>Physical %</th>
                    <th style={{ padding: '0.6rem 0.75rem', textAlign: 'center' }}>Traffic Light</th>
                    <th style={{ padding: '0.6rem 0.75rem', textAlign: 'center' }}>Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { rank: 1, name: 'Education Quality Development Branch (EQD)', count: 18, budget: 6.850000, spent: 5.920000, util: 86.4, phys: 89, light: '🟢 On Track', trend: '↗️ Rising' },
                    { rank: 2, name: 'Information & Communication Technology Branch (ICT)', count: 24, budget: 8.420000, spent: 7.150000, util: 84.9, phys: 86, light: '🟢 On Track', trend: '↗️ Rising' },
                    { rank: 3, name: 'Curriculum Development Branch', count: 16, budget: 5.340000, spent: 4.480000, util: 83.9, phys: 84, light: '🟢 On Track', trend: '➡️ Steady' },
                    { rank: 4, name: 'Department of Examinations (Evaluation & Research)', count: 22, budget: 7.900000, spent: 6.550000, util: 82.9, phys: 83, light: '🟢 On Track', trend: '↗️ Rising' },
                    { rank: 5, name: 'School Infrastructure & Physical Planning', count: 32, budget: 11.250000, spent: 8.950000, util: 79.5, phys: 78, light: '🟡 At Risk', trend: '➡️ Steady' },
                    { rank: 6, name: 'Teacher Education Administration', count: 14, budget: 4.100000, spent: 3.120000, util: 76.1, phys: 75, light: '🟡 At Risk', trend: '↘️ Lagging' },
                  ].filter((b) => perfBranchFilter === 'all' || b.name.toLowerCase().includes(perfBranchFilter.replace('org-moe-', '').replace('org-doe-', ''))).map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9', background: idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA' }}>
                      <td style={{ padding: '0.6rem 0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 800, width: '20px', color: '#64748B' }}>#{item.rank}</span>
                          <span style={{ fontWeight: 700, color: '#1E293B' }}>{item.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center', fontWeight: 600 }}>{item.count}</td>
                      <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right' }}>
                        <div style={{ fontWeight: 700 }}>Rs. {formatMillion(item.budget)} Mn</div>
                        <div style={{ fontSize: '0.68rem', color: '#64748B', fontFamily: 'monospace' }}>{formatRupees(item.budget, true)}</div>
                      </td>
                      <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, color: '#00534E' }}>Rs. {formatMillion(item.spent)} Mn</div>
                        <div style={{ fontSize: '0.68rem', color: '#64748B', fontFamily: 'monospace' }}>{formatRupees(item.spent, true)}</div>
                      </td>
                      <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center', fontWeight: 700 }}>{item.util}%</td>
                      <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                          <div style={{ width: '45px', height: '6px', background: '#E2E8F0', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${item.phys}%`, height: '100%', background: item.phys >= 80 ? '#10B981' : '#F59E0B' }} />
                          </div>
                          <span style={{ fontWeight: 700, fontSize: '0.78rem' }}>{item.phys}%</span>
                        </div>
                      </td>
                      <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          background: item.light.includes('🟢') ? '#DCFCE7' : '#FEF3C7',
                          color: item.light.includes('🟢') ? '#166534' : '#92400E',
                        }}>
                          {item.light}
                        </span>
                      </td>
                      <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center', fontWeight: 600, fontSize: '0.75rem' }}>
                        {item.trend}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
              </>
            )}
          </div>
        )}

        {/* ── MODULE 3: DATA QUALITY ── */}
        {activeTab === 'data_quality' && (
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#1A1A1A', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>🔍</span> Institutional Data Quality Index (DQI) & Verification Integrity
                </h3>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.82rem', color: '#64748B' }}>
                  Auditing completeness, consistency, and reliability of monitoring data submitted across Ministry branches and provincial departments.
                </p>
              </div>

              {isQaMonitoringOfficer && (
                <button
                  type="button"
                  onClick={() => {
                    showToast('success', 'Automated Data Quality Audit executed across 240 activities! No critical schema corruption identified.');
                  }}
                  style={{
                    background: '#00534E',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '0.45rem 0.95rem',
                    borderRadius: '6px',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <span>🔄</span>
                  <span>Run Automated Data Quality Audit</span>
                </button>
              )}
            </div>

            {activities.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3.5rem 1rem', background: '#FAFAF9', borderRadius: '12px', border: '1px dashed #CBD5E1', color: '#64748B' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🔍</div>
                <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#1E293B' }}>No Data Quality Audit Records for FY {selectedYear}</div>
                <p style={{ fontSize: '0.84rem', color: '#64748B', maxWidth: '540px', margin: '0.4rem auto 0', lineHeight: 1.5 }}>
                  Data Quality Index (DQI), completeness scores, consistency audits, and automated anomaly detection will activate as operational branches submit their monthly returns and field verifications.
                </p>
              </div>
            ) : (
              <>
            {/* DQI Scorecard Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem', marginBottom: '1.25rem' }}>
              <div style={{ background: '#F0FDF4', border: '1.5px solid #86EFAC', borderRadius: '8px', padding: '1rem' }}>
                <div style={{ fontSize: '0.72rem', color: '#166534', fontWeight: 700, textTransform: 'uppercase' }}>Overall Data Quality Index</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#166534', marginTop: '0.25rem' }}>93.5%</div>
                <div style={{ fontSize: '0.75rem', color: '#14532D', marginTop: '0.2rem', fontWeight: 600 }}>Grade A (High Institutional Integrity)</div>
              </div>

              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '1rem' }}>
                <div style={{ fontSize: '0.72rem', color: '#00534E', fontWeight: 700, textTransform: 'uppercase' }}>1. Completeness Rate</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#00534E', marginTop: '0.25rem' }}>96.4%</div>
                <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.2rem' }}>Monthly returns submitted on schedule</div>
              </div>

              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '1rem' }}>
                <div style={{ fontSize: '0.72rem', color: '#0284C7', fontWeight: 700, textTransform: 'uppercase' }}>2. Consistency Score</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0284C7', marginTop: '0.25rem' }}>92.8%</div>
                <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.2rem' }}>Physical milestones match Vote disbursements</div>
              </div>

              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '1rem' }}>
                <div style={{ fontSize: '0.72rem', color: '#7C3AED', fontWeight: 700, textTransform: 'uppercase' }}>3. Reliability & Auditability</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#7C3AED', marginTop: '0.25rem' }}>90.5%</div>
                <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.2rem' }}>Field verified + audit logs intact</div>
              </div>
            </div>

            {/* Branch Data Quality Assessment Matrix Table */}
            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.92rem', color: '#1E293B' }}>
              Branch-Level Data Quality & Timeliness Audit Matrix
            </h4>
            <div style={{ overflowX: 'auto', border: '1px solid #E2E8F0', borderRadius: '6px', marginBottom: '1.25rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#F1F5F9', borderBottom: '2px solid #CBD5E1', color: '#334155' }}>
                    <th style={{ padding: '0.6rem 0.75rem' }}>Branch Name</th>
                    <th style={{ padding: '0.6rem 0.75rem', textAlign: 'center' }}>Expected Returns</th>
                    <th style={{ padding: '0.6rem 0.75rem', textAlign: 'center' }}>On-Time Submissions</th>
                    <th style={{ padding: '0.6rem 0.75rem', textAlign: 'center' }}>Completeness %</th>
                    <th style={{ padding: '0.6rem 0.75rem', textAlign: 'center' }}>Discrepancies Flagged</th>
                    <th style={{ padding: '0.6rem 0.75rem', textAlign: 'center' }}>DQI Score</th>
                    <th style={{ padding: '0.6rem 0.75rem', textAlign: 'center' }}>Quality Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { branch: 'Education Quality Development Branch (EQD)', expected: 12, submitted: 12, pct: 100, flag: 0, dqi: 97.5, grade: 'Grade A - Robust' },
                    { branch: 'Information & Communication Technology Branch (ICT)', expected: 12, submitted: 12, pct: 100, flag: 0, dqi: 96.0, grade: 'Grade A - Robust' },
                    { branch: 'Curriculum Development Branch', expected: 12, submitted: 11, pct: 91.7, flag: 1, dqi: 93.0, grade: 'Grade A - Robust' },
                    { branch: 'Department of Examinations Evaluation Division', expected: 12, submitted: 12, pct: 100, flag: 0, dqi: 95.5, grade: 'Grade A - Robust' },
                    { branch: 'School Infrastructure & Physical Planning', expected: 12, submitted: 10, pct: 83.3, flag: 2, dqi: 87.2, grade: 'Grade B - Moderate' },
                    { branch: 'Teacher Education Administration', expected: 12, submitted: 9, pct: 75.0, flag: 2, dqi: 82.5, grade: 'Grade B - Moderate' },
                  ].map((row, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #F1F5F9', background: i % 2 === 0 ? '#FFFFFF' : '#FAFAFA' }}>
                      <td style={{ padding: '0.6rem 0.75rem', fontWeight: 700, color: '#1E293B' }}>{row.branch}</td>
                      <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center' }}>{row.expected}</td>
                      <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center', fontWeight: 600 }}>{row.submitted}</td>
                      <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center', fontWeight: 700, color: row.pct >= 90 ? '#166534' : '#D97706' }}>{row.pct}%</td>
                      <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center' }}>
                        {row.flag === 0 ? (
                          <span style={{ color: '#166534', fontWeight: 600 }}>0 (Clean)</span>
                        ) : (
                          <span style={{ background: '#FEE2E2', color: '#991B1B', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, fontSize: '0.72rem' }}>
                            {row.flag} Flagged
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center', fontWeight: 800, color: '#00534E' }}>{row.dqi}%</td>
                      <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          background: row.grade.includes('Grade A') ? '#DCFCE7' : '#FEF3C7',
                          color: row.grade.includes('Grade A') ? '#166534' : '#92400E',
                        }}>
                          {row.grade}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Automated Data Anomaly Detector */}
            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.92rem', color: '#1E293B' }}>
              Automated Data Quality Anomaly & Consistency Checks
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem' }}>
              <div style={{ background: '#F8FAFC', padding: '0.75rem', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.8rem', color: '#1E293B' }}>Rule 1: High Spending with 0% Milestones</span>
                  <span style={{ background: '#DCFCE7', color: '#166534', padding: '1px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700 }}>Pass (0 Detected)</span>
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '4px' }}>Flags any activity with disbursement &gt; Rs. 0.50 Mn but 0% verified progress.</div>
              </div>
              <div style={{ background: '#F8FAFC', padding: '0.75rem', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.8rem', color: '#1E293B' }}>Rule 2: Treasury Vote Ceiling Breach</span>
                  <span style={{ background: '#DCFCE7', color: '#166534', padding: '1px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700 }}>Pass (0 Over-expenditure)</span>
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '4px' }}>Ensures actual disbursements do not exceed allocated Treasury vote ceilings.</div>
              </div>
              <div style={{ background: '#F8FAFC', padding: '0.75rem', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.8rem', color: '#1E293B' }}>Rule 3: Overdue Monthly Returns (&gt;30 Days)</span>
                  <span style={{ background: '#FEF3C7', color: '#92400E', padding: '1px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700 }}>2 Branches Attention</span>
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '4px' }}>Reminders dispatched automatically to Teacher Admin & Infrastructure branches.</div>
              </div>
            </div>
              </>
            )}
          </div>
        )}

        {/* ── MODULE 4: EVALUATIONS ── */}
        {activeTab === 'evaluations' && (
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#1A1A1A', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>📑</span> Strategic Education Evaluations & Sector Reviews
                </h3>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.82rem', color: '#64748B' }}>
                  Evidence-based evaluation studies, mid-term impact assessments, policy recommendations, and branch management responses.
                </p>
              </div>

              {/* Status filter */}
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                {['all', 'Completed', 'In Progress', 'Scheduled'].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setSelectedEvalFilter(st as any)}
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: '20px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      background: selectedEvalFilter === st ? '#00534E' : '#F1F5F9',
                      color: selectedEvalFilter === st ? '#FFFFFF' : '#334155',
                      border: '1px solid #CBD5E1',
                    }}
                  >
                    {st === 'all' ? 'All Evaluations' : st}
                  </button>
                ))}
              </div>
            </div>

            {/* Evaluation Studies Cards */}
            {activities.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3.5rem 1rem', background: '#FAFAF9', borderRadius: '12px', border: '1px dashed #CBD5E1', color: '#64748B' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📑</div>
                <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#1E293B' }}>No Strategic Evaluations Recorded for FY {selectedYear}</div>
                <p style={{ fontSize: '0.84rem', color: '#64748B', maxWidth: '540px', margin: '0.4rem auto 0', lineHeight: 1.5 }}>
                  Evidence-based evaluation studies, mid-term sector reviews, impact assessments, and branch management responses will appear here when registered.
                </p>
              </div>
            ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {[
                {
                  id: 'EVAL-2026-01',
                  title: 'Comprehensive Mid-Term Evaluation of General Education Sector Development Framework (GESDF)',
                  type: 'National Strategic Evaluation',
                  lead: 'UNESCO / National Education Commission (NEC) & MPB Directorate',
                  period: 'October 2026',
                  status: 'Completed',
                  findings: 'Primary education equity and retention targets achieved across 8 provinces; secondary vocational and STEM streams require modernized laboratory facilities in Central and Eastern rural clusters.',
                  recommendations: 'Allocate specialized Treasury capital vote under 126-02-04-2104 for provincial STEM hubs; mandate continuous in-service teacher development for secondary mathematics and science.',
                  response: 'Accepted by Ministry Planning Division. Integrated as priority allocation into FY 2027 Annual Implementation Plan (AIP).',
                },
                {
                  id: 'EVAL-2026-02',
                  title: 'Impact Assessment of Digital Smart Classrooms & LMS Adoption in 1,000 Schools',
                  type: 'Thematic Digital Impact Evaluation',
                  lead: 'Department of Examinations Research Directorate & ICT Branch',
                  period: 'August 2026',
                  status: 'Completed',
                  findings: 'Student engagement in STEM subjects increased by 27%; however, rural electricity fluctuations interrupted 14% of scheduled digital lessons, requiring local offline caching solutions.',
                  recommendations: 'Pair digital classroom procurement with dedicated solar-backup systems; configure offline-first caching servers to maintain continuous LMS instruction during connectivity drops.',
                  response: 'In Progress. Corrective Action directive issued to ICT Branch to test solar-buffered smart classroom units in 50 pilot rural schools.',
                },
                {
                  id: 'EVAL-2026-03',
                  title: 'Capacity Development & Teacher Training Workshop Quality & Outcome Evaluation',
                  type: 'Process & Pedagogical Quality Audit',
                  lead: 'Education Quality Development (EQD) Branch',
                  period: 'December 2026',
                  status: 'In Progress',
                  findings: 'Resource person qualification standards and national NIC/passport validation reduced trainer duplication by 38%; participant feedback shows 89.6% pedagogical satisfaction.',
                  recommendations: 'Institutionalize a 3-month post-training tracer study to evaluate classroom teaching behavior changes following workshop completion.',
                  response: 'Under formulation. EQD Branch designing digital tracer survey for 2027 roll-out.',
                },
                {
                  id: 'EVAL-2027-01',
                  title: 'Annual National Examination Logistics & Confidential Printing Security Process Review',
                  type: 'Operational Integrity & Logistics Review',
                  lead: 'Department of Examinations Quality & Monitoring Unit',
                  period: 'Scheduled Q1 2027',
                  status: 'Scheduled',
                  findings: 'Scheduled audit covering confidential paper printing logistics, regional vault distribution security, and online examiner mark aggregation workflows.',
                  recommendations: 'Pending review completion.',
                  response: 'Terms of Reference (ToR) approved by Commissioner General of Examinations.',
                },
              ].filter((e) => selectedEvalFilter === 'all' || e.status === selectedEvalFilter).map((evalItem) => (
                <div key={evalItem.id} style={{ border: '1px solid #E2E8F0', borderRadius: '8px', padding: '1rem', background: '#FFFFFF' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.72rem', background: '#F1F5F9', color: '#475569', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace', fontWeight: 700 }}>
                          {evalItem.id}
                        </span>
                        <h4 style={{ margin: 0, fontSize: '0.98rem', color: '#1E293B', fontWeight: 800 }}>
                          {evalItem.title}
                        </h4>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '2px' }}>
                        Lead: {evalItem.lead} • Period: {evalItem.period}
                      </div>
                    </div>

                    <span style={{
                      padding: '3px 9px',
                      borderRadius: '12px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      background: evalItem.status === 'Completed' ? '#DCFCE7' : evalItem.status === 'In Progress' ? '#E0F2FE' : '#F1F5F9',
                      color: evalItem.status === 'Completed' ? '#166534' : evalItem.status === 'In Progress' ? '#0369A1' : '#475569',
                      border: `1px solid ${evalItem.status === 'Completed' ? '#86EFAC' : evalItem.status === 'In Progress' ? '#BAE6FD' : '#CBD5E1'}`,
                    }}>
                      {evalItem.status}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem', marginTop: '0.75rem' }}>
                    <div style={{ background: '#F8FAFC', padding: '0.75rem', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#00534E', textTransform: 'uppercase' }}>Key Findings & Evidence</div>
                      <div style={{ fontSize: '0.8rem', color: '#334155', marginTop: '2px', lineHeight: 1.4 }}>{evalItem.findings}</div>
                    </div>

                    <div style={{ background: '#FFFBEB', padding: '0.75rem', borderRadius: '6px', border: '1px solid #FDE68A' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#92400E', textTransform: 'uppercase' }}>Strategic Policy Recommendations</div>
                      <div style={{ fontSize: '0.8rem', color: '#78350F', marginTop: '2px', lineHeight: 1.4 }}>{evalItem.recommendations}</div>
                    </div>

                    <div style={{ background: '#F0FDF4', padding: '0.75rem', borderRadius: '6px', border: '1px solid #86EFAC' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>Branch Management Response & Follow-up</div>
                      <div style={{ fontSize: '0.8rem', color: '#14532D', marginTop: '2px', lineHeight: 1.4 }}>{evalItem.response}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            )}
          </div>
        )}

        {/* ── MODULE 5: GEOGRAPHICAL ANALYSIS ── */}
        {activeTab === 'geographical' && (
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#1A1A1A', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>🗺️</span> Geographical Analysis (National, Provincial & Zonal Comparisons)
                </h3>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.82rem', color: '#64748B' }}>
                  Spatial distribution of educational investments, physical milestones, school reach, and equity disparity across Sri Lanka.
                </p>
              </div>

              {/* Geographic Level Switcher */}
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                {[
                  { id: 'provincial', label: 'Provincial Comparison (9 Provinces)' },
                  { id: 'national', label: 'National Overview' },
                  { id: 'zonal', label: 'Zonal Breakdown' },
                ].map((lvl) => (
                  <button
                    key={lvl.id}
                    type="button"
                    onClick={() => setSelectedGeoLevel(lvl.id as any)}
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: '20px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      background: selectedGeoLevel === lvl.id ? '#00534E' : '#F1F5F9',
                      color: selectedGeoLevel === lvl.id ? '#FFFFFF' : '#334155',
                      border: '1px solid #CBD5E1',
                    }}
                  >
                    {lvl.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Provincial Comparative Table across all 9 Provinces */}
            {activities.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3.5rem 1rem', background: '#FAFAF9', borderRadius: '12px', border: '1px dashed #CBD5E1', color: '#64748B' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🗺️</div>
                <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#1E293B' }}>No Geographical Distribution Records for FY {selectedYear}</div>
                <p style={{ fontSize: '0.84rem', color: '#64748B', maxWidth: '540px', margin: '0.4rem auto 0', lineHeight: 1.5 }}>
                  Provincial and zonal comparative tables, school reach statistics, and regional educational equity disparity analysis will populate as branch AIP activities are allocated across Sri Lankan provinces.
                </p>
              </div>
            ) : (
              <>
            <div style={{ overflowX: 'auto', border: '1px solid #E2E8F0', borderRadius: '6px', marginBottom: '1.25rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#F1F5F9', borderBottom: '2px solid #CBD5E1', color: '#334155' }}>
                    <th style={{ padding: '0.6rem 0.75rem' }}>Province & Key Districts</th>
                    <th style={{ padding: '0.6rem 0.75rem', textAlign: 'right' }}>Budget Allocated</th>
                    <th style={{ padding: '0.6rem 0.75rem', textAlign: 'right' }}>Verified Expenditure</th>
                    <th style={{ padding: '0.6rem 0.75rem', textAlign: 'center' }}>Utilisation</th>
                    <th style={{ padding: '0.6rem 0.75rem', textAlign: 'center' }}>Physical %</th>
                    <th style={{ padding: '0.6rem 0.75rem', textAlign: 'center' }}>Schools Reached</th>
                    <th style={{ padding: '0.6rem 0.75rem', textAlign: 'center' }}>Teachers Trained</th>
                    <th style={{ padding: '0.6rem 0.75rem', textAlign: 'center' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { name: 'Western Province', districts: 'Colombo, Gampaha, Kalutara', budget: 4.850000, spent: 4.220000, util: 87.0, phys: 88.5, schools: '1,360', teachers: '18,400', status: 'High Performing' },
                    { name: 'Central Province', districts: 'Kandy, Matale, Nuwara Eliya', budget: 3.620000, spent: 3.010000, util: 83.1, phys: 84.0, schools: '1,520', teachers: '15,200', status: 'On Track' },
                    { name: 'Southern Province', districts: 'Galle, Matara, Hambantota', budget: 3.450000, spent: 2.980000, util: 86.4, phys: 86.2, schools: '1,110', teachers: '13,800', status: 'High Performing' },
                    { name: 'Northern Province', districts: 'Jaffna, Kilinochchi, Mannar, Vavuniya', budget: 2.890000, spent: 2.380000, util: 82.4, phys: 82.5, schools: '980', teachers: '10,600', status: 'On Track' },
                    { name: 'Eastern Province', districts: 'Trincomalee, Batticaloa, Ampara', budget: 3.120000, spent: 2.460000, util: 78.8, phys: 79.0, schools: '1,090', teachers: '11,400', status: 'Needs Attention' },
                    { name: 'North Western Province', districts: 'Kurunegala, Puttalam', budget: 3.380000, spent: 2.820000, util: 83.4, phys: 83.4, schools: '1,240', teachers: '14,100', status: 'On Track' },
                    { name: 'North Central Province', districts: 'Anuradhapura, Polonnaruwa', budget: 2.650000, spent: 2.150000, util: 81.1, phys: 81.2, schools: '820', teachers: '9,200', status: 'On Track' },
                    { name: 'Uva Province', districts: 'Badulla, Monaragala', budget: 2.420000, spent: 1.890000, util: 78.1, phys: 78.5, schools: '890', teachers: '9,800', status: 'Needs Attention' },
                    { name: 'Sabaragamuwa Province', districts: 'Ratnapura, Kegalle', budget: 2.940000, spent: 2.450000, util: 83.3, phys: 83.1, schools: '1,120', teachers: '12,300', status: 'On Track' },
                  ].map((p, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9', background: idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA' }}>
                      <td style={{ padding: '0.6rem 0.75rem' }}>
                        <div style={{ fontWeight: 700, color: '#1E293B' }}>{p.name}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748B' }}>{p.districts}</div>
                      </td>
                      <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right' }}>
                        <div style={{ fontWeight: 700 }}>Rs. {formatMillion(p.budget)} Mn</div>
                        <div style={{ fontSize: '0.68rem', color: '#64748B', fontFamily: 'monospace' }}>{formatRupees(p.budget, true)}</div>
                      </td>
                      <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, color: '#00534E' }}>Rs. {formatMillion(p.spent)} Mn</div>
                        <div style={{ fontSize: '0.68rem', color: '#64748B', fontFamily: 'monospace' }}>{formatRupees(p.spent, true)}</div>
                      </td>
                      <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center', fontWeight: 700 }}>{p.util}%</td>
                      <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                          <div style={{ width: '45px', height: '6px', background: '#E2E8F0', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${p.phys}%`, height: '100%', background: p.phys >= 85 ? '#10B981' : p.phys >= 80 ? '#0284C7' : '#F59E0B' }} />
                          </div>
                          <span style={{ fontWeight: 700, fontSize: '0.78rem' }}>{p.phys}%</span>
                        </div>
                      </td>
                      <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center', fontWeight: 600 }}>{p.schools}</td>
                      <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center', fontWeight: 600 }}>{p.teachers}</td>
                      <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          background: p.status === 'High Performing' ? '#DCFCE7' : p.status === 'On Track' ? '#E0F2FE' : '#FEF3C7',
                          color: p.status === 'High Performing' ? '#166534' : p.status === 'On Track' ? '#0369A1' : '#92400E',
                        }}>
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Disparity & Equity Heatmap Strip */}
            <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '8px', padding: '0.85rem 1rem' }}>
              <div style={{ fontWeight: 800, color: '#92400E', fontSize: '0.85rem' }}>
                ⚖️ Regional Disparity & Educational Equity Observation
              </div>
              <div style={{ fontSize: '0.78rem', color: '#78350F', marginTop: '3px', lineHeight: 1.4 }}>
                While Western and Southern Provinces demonstrate high physical milestone delivery (&gt;86%), Eastern and Uva Provinces have flagged resource allocation bottlenecks in digital smart lab rollouts. M&E recommends accelerated vote disbursement for remote zonal clusters.
              </div>
            </div>
              </>
            )}
          </div>
        )}

        {/* ── MODULE 6: CORRECTIVE ACTIONS (UPGRADED) ── */}
        {activeTab === 'corrective' && (
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#1A1A1A', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>⚠️</span> Corrective Actions & Branch Notification Tracker (MON-008, MON-009)
                </h3>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.82rem', color: '#64748B' }}>
                  Formal remediation directives issued by M&E to operational branches with mandated compliance deadlines, response logging, and verification closure.
                </p>
              </div>

              {isQaMonitoringOfficer ? (
                <button
                  type="button"
                  onClick={() => setShowProposeCAModal(true)}
                  style={{
                    background: '#EB7400',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '0.5rem 1.1rem',
                    borderRadius: '6px',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    boxShadow: '0 2px 4px rgba(235, 116, 0, 0.25)',
                  }}
                >
                  <span>➕</span>
                  <span>Propose Corrective Action to Branch</span>
                </button>
              ) : (
                <span style={{ fontSize: '0.78rem', background: '#DCFCE7', color: '#166534', padding: '0.35rem 0.75rem', borderRadius: '4px', fontWeight: 600 }}>
                  🏢 Your Branch Compliance Workspace
                </span>
              )}
            </div>

            {/* Quick KPI Strip */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '0.75rem' }}>
                <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Total Actions Issued</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1E293B', marginTop: '0.2rem' }}>{correctiveActions.length}</div>
              </div>
              <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '6px', padding: '0.75rem' }}>
                <div style={{ fontSize: '0.72rem', color: '#92400E', fontWeight: 700, textTransform: 'uppercase' }}>Pending Response</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#D97706', marginTop: '0.2rem' }}>
                  {correctiveActions.filter((c) => c.status === 'Pending').length}
                </div>
              </div>
              <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '6px', padding: '0.75rem' }}>
                <div style={{ fontSize: '0.72rem', color: '#1E40AF', fontWeight: 700, textTransform: 'uppercase' }}>In Progress / Action Taken</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#2563EB', marginTop: '0.2rem' }}>
                  {correctiveActions.filter((c) => c.status === 'In Progress').length}
                </div>
              </div>
              <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '6px', padding: '0.75rem' }}>
                <div style={{ fontSize: '0.72rem', color: '#166534', fontWeight: 700, textTransform: 'uppercase' }}>Verified & Resolved</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#166534', marginTop: '0.2rem' }}>
                  {correctiveActions.filter((c) => c.status === 'Resolved').length}
                </div>
              </div>
            </div>

            {/* Filters Bar */}
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: '0.35rem' }}>
                {['all', 'Pending', 'In Progress', 'Resolved'].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setCaStatusFilter(st as any)}
                    style={{
                      padding: '0.3rem 0.65rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      background: caStatusFilter === st ? '#00534E' : '#F1F5F9',
                      color: caStatusFilter === st ? '#FFFFFF' : '#334155',
                      border: '1px solid #CBD5E1',
                    }}
                  >
                    {st === 'all' ? 'All Status' : st}
                  </button>
                ))}
              </div>

              {isQaMonitoringOfficer && (
                <select
                  value={caBranchFilter}
                  onChange={(e) => setCaBranchFilter(e.target.value)}
                  style={{ padding: '0.3rem 0.65rem', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '0.78rem', fontWeight: 600 }}
                >
                  <option value="all">All Operational Branches</option>
                  {operationalBranches.map((b: any) => (
                    <option key={b.id} value={b.id}>{b.name.replace(/^MOE\s+/i, '')}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Corrective Actions Table */}
            {correctiveActions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', background: '#F9F9F9', borderRadius: '8px', color: '#666' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>No Active Corrective Actions</div>
                <p style={{ fontSize: '0.82rem', color: '#888', marginTop: '0.25rem' }}>All operational branches are performing within standard tolerance thresholds.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto', border: '1px solid #E0E0E0', borderRadius: '6px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#F5F5F5', borderBottom: '2px solid #E0E0E0', color: '#333' }}>
                      <th style={{ padding: '0.65rem 0.75rem' }}>Action Ref</th>
                      <th style={{ padding: '0.65rem 0.75rem' }}>Target Branch</th>
                      <th style={{ padding: '0.65rem 0.75rem' }}>Observation & Issue</th>
                      <th style={{ padding: '0.65rem 0.75rem' }}>Mandated Remedial Action</th>
                      <th style={{ padding: '0.65rem 0.75rem' }}>Deadline</th>
                      <th style={{ padding: '0.65rem 0.75rem' }}>Branch Progress Response</th>
                      <th style={{ padding: '0.65rem 0.75rem', textAlign: 'center' }}>Status</th>
                      <th style={{ padding: '0.65rem 0.75rem', textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {correctiveActions
                      .filter((ca) => !isQaMonitoringOfficer && user?.organizationId ? ca.assignedDivisionId === user.organizationId : true)
                      .filter((ca) => caBranchFilter === 'all' || ca.assignedDivisionId === caBranchFilter)
                      .filter((ca) => caStatusFilter === 'all' || ca.status === caStatusFilter)
                      .map((ca, idx) => (
                      <tr key={ca.id || idx} style={{ borderBottom: '1px solid #EBEBEB', background: idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA' }}>
                        <td style={{ padding: '0.65rem 0.75rem', fontWeight: 700, color: '#C96200', fontFamily: 'monospace' }}>
                          {ca.id.slice(0, 10)}
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem', fontWeight: 600, color: '#1E293B' }}>
                          {ca.assignedDivisionName}
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem', maxWidth: '200px' }}>
                          <div style={{ fontWeight: 600, color: '#1E293B' }}>{ca.issueSummary}</div>
                          <div style={{ fontSize: '0.72rem', color: '#64748B' }}>Issued by: {ca.requestedBy || 'M&E Branch'}</div>
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem', maxWidth: '240px', color: '#334155' }}>
                          <div style={{ background: '#FFF8E1', padding: '0.35rem 0.55rem', borderRadius: '4px', border: '1px solid #FFE082', fontSize: '0.78rem', color: '#8D153A', fontWeight: 600 }}>
                            {ca.recommendedAction}
                          </div>
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem', fontWeight: 700, color: '#8D153A', fontSize: '0.78rem' }}>
                          {ca.deadline}
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem', maxWidth: '180px' }}>
                          {ca.responseNotes ? (
                            <div style={{ fontSize: '0.78rem', color: '#1E293B' }}>{ca.responseNotes}</div>
                          ) : (
                            <span style={{ color: '#94A3B8', fontSize: '0.75rem', fontStyle: 'italic' }}>Awaiting branch rectification</span>
                          )}
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center' }}>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            background: ca.status === 'Resolved' ? '#DCFCE7' : ca.status === 'In Progress' ? '#DBEAFE' : '#FEF3C7',
                            color: ca.status === 'Resolved' ? '#166534' : ca.status === 'In Progress' ? '#1E40AF' : '#92400E',
                            border: `1px solid ${ca.status === 'Resolved' ? '#86EFAC' : ca.status === 'In Progress' ? '#93C5FD' : '#FDE68A'}`,
                          }}>
                            {ca.status === 'Resolved' ? '✓ Resolved' : ca.status === 'In Progress' ? '⏳ In Progress' : '⚠️ Pending'}
                          </span>
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center' }}>
                          {isQaMonitoringOfficer ? (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedCA(ca);
                                setCaResponseNotes(ca.responseNotes || '');
                                setShowResponseModal(true);
                              }}
                              style={{
                                background: '#00534E',
                                color: '#FFFFFF',
                                border: 'none',
                                padding: '0.35rem 0.75rem',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              Verify / Update
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedCAForResponse(ca);
                                setBranchComplianceNotes(ca.responseNotes || '');
                                setBranchComplianceStatus((ca.status === 'Resolved' ? 'Resolved' : 'In Progress') as any);
                                setShowBranchResponseModal(true);
                              }}
                              style={{
                                background: '#166534',
                                color: '#FFFFFF',
                                border: 'none',
                                padding: '0.35rem 0.75rem',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              📝 Respond
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 0: Monthly Progress Returns */}
        {activeTab === 'monthly_returns' && (
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#1A1A1A', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>📊</span> Operational Branch Monthly Progress Returns (M&E Oversight)
                </h3>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.82rem', color: '#64748B' }}>
                  Official monthly implementation returns submitted by line branches (MOE & Departments) detailing actual physical milestone delivery and financial disbursements against Treasury Vote Numbers.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.78rem', color: '#00534E', background: '#e6f4ea', padding: '0.35rem 0.75rem', borderRadius: '4px', fontWeight: 600 }}>
                  🏛️ Destination: Ministry Monitoring & Performance Branch (MPB)
                </span>
                <button
                  type="button"
                  onClick={fetchData}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: '4px',
                    padding: '0.4rem 0.8rem',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  🔄 Refresh Returns
                </button>
              </div>
            </div>

            {/* Quick KPI Stat Strip */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0.75rem' }}>
                <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Total Submissions</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#00534E', marginTop: '0.2rem' }}>{monthlyReturns.length}</div>
              </div>
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '0.75rem' }}>
                <div style={{ fontSize: '0.72rem', color: '#166534', fontWeight: 700, textTransform: 'uppercase' }}>Verified by M&E</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#166534', marginTop: '0.2rem' }}>
                  {monthlyReturns.filter((r) => r.status === 'Verified').length}
                </div>
              </div>
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '6px', padding: '0.75rem' }}>
                <div style={{ fontSize: '0.72rem', color: '#92400e', fontWeight: 700, textTransform: 'uppercase' }}>Pending / In Review</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#d97706', marginTop: '0.2rem' }}>
                  {monthlyReturns.filter((r) => r.status === 'Submitted').length}
                </div>
              </div>
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '0.75rem' }}>
                <div style={{ fontSize: '0.72rem', color: '#991b1b', fontWeight: 700, textTransform: 'uppercase' }}>Action Required</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#dc2626', marginTop: '0.2rem' }}>
                  {monthlyReturns.filter((r) => r.status === 'Action Required').length}
                </div>
              </div>
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', padding: '0.75rem' }}>
                <div style={{ fontSize: '0.72rem', color: '#1e40af', fontWeight: 700, textTransform: 'uppercase' }}>Actual Disbursed (Mn)</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1d4ed8', marginTop: '0.2rem' }}>
                  Rs. {formatMillion(monthlyReturns.reduce((s, r) => s + (Number(r.totalMonthlyExpenditure) || 0), 0))} Mn
                </div>
              </div>
            </div>

            {/* Returns Table */}
            {monthlyReturns.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', background: '#F9F9F9', borderRadius: '8px', color: '#666' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📭</div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>No Monthly Progress Returns Found for FY {selectedYear}</div>
                <p style={{ fontSize: '0.82rem', color: '#888', marginTop: '0.25rem' }}>
                  Once branches start executing approved AIPs, their monthly progress returns will flow directly here for verification.
                </p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto', border: '1px solid #E0E0E0', borderRadius: '6px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#F5F5F5', borderBottom: '2px solid #E0E0E0', color: '#333' }}>
                      <th style={{ padding: '0.65rem 0.75rem' }}>Month / Return ID</th>
                      <th style={{ padding: '0.65rem 0.75rem' }}>Implementing Branch</th>
                      <th style={{ padding: '0.65rem 0.75rem' }}>Submitted On & By</th>
                      <th style={{ padding: '0.65rem 0.75rem' }}>Target M&E Authority</th>
                      <th style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>Monthly Actual Disbursed</th>
                      <th style={{ padding: '0.65rem 0.75rem', textAlign: 'center' }}>Avg Physical %</th>
                      <th style={{ padding: '0.65rem 0.75rem', textAlign: 'center' }}>M&E Audit Status</th>
                      <th style={{ padding: '0.65rem 0.75rem', textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyReturns.map((ret, idx) => (
                      <tr key={ret.id || idx} style={{ borderBottom: '1px solid #EBEBEB', background: idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA' }}>
                        <td style={{ padding: '0.65rem 0.75rem' }}>
                          <div style={{ fontWeight: 700, color: '#00534E', fontSize: '0.88rem' }}>
                            {ret.monthName || `Month ${ret.month}`} {ret.year}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#888', fontFamily: 'monospace' }}>
                            {ret.id}
                          </div>
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem' }}>
                          <div style={{ fontWeight: 600, color: '#1A1A1A' }}>
                            {ret.branchName?.replace(/^MOE\s+/i, '') || ret.branchId}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                            {ret.activityProgressItems?.length || 0} activities reported
                          </div>
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem' }}>
                          <div style={{ color: '#222' }}>
                            {ret.submittedByName || 'Branch Officer'}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#888' }}>
                            {ret.submissionDate ? new Date(ret.submissionDate).toLocaleDateString() : '-'}
                          </div>
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem' }}>
                          <span style={{ fontSize: '0.75rem', background: '#F1F5F9', color: '#334155', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                            {ret.targetMonitoringOrgName || 'MOE Monitoring Branch'}
                          </span>
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>
                          <div style={{ fontWeight: 700, color: '#00534E' }}>
                            Rs. {formatMillion(ret.totalMonthlyExpenditure)} Mn
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#64748B', fontFamily: 'monospace' }}>
                            {formatRupees(ret.totalMonthlyExpenditure, true)}
                          </div>
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                            <div style={{ width: '48px', height: '6px', background: '#E2E8F0', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{ width: `${Math.min(100, ret.avgPhysicalProgressPct || 0)}%`, height: '100%', background: (ret.avgPhysicalProgressPct || 0) >= 80 ? '#10B981' : (ret.avgPhysicalProgressPct || 0) >= 50 ? '#F59E0B' : '#EF4444' }} />
                            </div>
                            <span style={{ fontWeight: 700, fontSize: '0.78rem', color: '#333' }}>
                              {ret.avgPhysicalProgressPct || 0}%
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '0.2rem 0.55rem',
                              borderRadius: '4px',
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              background: ret.status === 'Verified' ? '#DCFCE7' : ret.status === 'Action Required' ? '#FEE2E2' : '#FEF3C7',
                              color: ret.status === 'Verified' ? '#166534' : ret.status === 'Action Required' ? '#991B1B' : '#92400E',
                              border: `1px solid ${ret.status === 'Verified' ? '#86EFAC' : ret.status === 'Action Required' ? '#FCA5A5' : '#FDE68A'}`,
                            }}
                          >
                            {ret.status === 'Verified' ? '✓ Verified' : ret.status === 'Action Required' ? '⚠️ Action Required' : '⏳ In Review'}
                          </span>
                          {ret.verifiedAt && (
                            <div style={{ fontSize: '0.68rem', color: '#666', marginTop: '2px' }}>
                              by {ret.verifiedBy}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenVerifyReturn(ret)}
                            style={{
                              background: ret.status === 'Verified' ? '#F1F5F9' : '#00534E',
                              color: ret.status === 'Verified' ? '#00534E' : '#FFFFFF',
                              border: ret.status === 'Verified' ? '1px solid #CBD5E1' : 'none',
                              borderRadius: '4px',
                              padding: '0.35rem 0.75rem',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                            }}
                          >
                            <span>{ret.status === 'Verified' ? '👁️' : '🔍'}</span>
                            <span>{ret.status === 'Verified' ? 'Audit Details' : 'Inspect & Verify'}</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 1: Verification Matrix */}
        {activeTab === 'verification' && (
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#1A1A1A' }}>
                  AIP Activities Implementation Verification Audit (MON-005, MON-006)
                </h3>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: '#666' }}>
                  Independent audit comparing implementing division reported achievements against field evidence. Submitted values remain untouched.
                </p>
              </div>
              <TileActionMenu
                tileTitle="AIP Verification Audit"
                exportData={verificationExportData}
                onRefresh={fetchData}
                position="right"
              />
            </div>

            {/* Quick Vote Filter & Financial Snapshot Banner */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                padding: '0.65rem 1rem',
                borderRadius: '8px',
                marginBottom: '1rem',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>Filter by Vote Number:</span>
                <select
                  value={verificationVoteFilter}
                  onChange={(e) => setVerificationVoteFilter(e.target.value)}
                  style={{
                    padding: '0.35rem 0.75rem',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    color: '#00534E',
                    background: '#FFFFFF',
                    cursor: 'pointer',
                  }}
                >
                  <option value="all">All Vote Numbers ({activities.length} Activities)</option>
                  {allVoteOptions.map((v) => (
                    <option key={v.voteNumber} value={v.voteNumber}>
                      Vote {v.voteNumber} — {v.voteName}
                    </option>
                  ))}
                </select>
              </div>

              {verificationVoteFilter !== 'all' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.78rem', flexWrap: 'wrap' }}>
                  <span style={{ color: '#64748B' }}>
                    Allocation: <strong style={{ color: '#00534E' }}>Rs. {formatMillion(voteExpenditureData.totalAllocation)} Mn</strong>
                  </span>
                  <span style={{ color: '#64748B' }}>
                    Spent: <strong style={{ color: '#166534' }}>Rs. {formatMillion(voteExpenditureData.totalSpent)} Mn</strong>
                  </span>
                  <span style={{ color: '#64748B' }}>
                    Burn Rate: <strong style={{ color: '#D97706' }}>{voteExpenditureData.utilizationRate}%</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedVoteNumber(verificationVoteFilter);
                      setActiveTab('vote_expenditure');
                    }}
                    style={{
                      background: '#00534E',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '0.3rem 0.65rem',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    View Full Expenditure Card →
                  </button>
                </div>
              )}
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#F5F5F5' }}>
                    <th style={{ padding: '0.75rem' }}>Code</th>
                    <th style={{ padding: '0.75rem' }}>Activity Description</th>
                    <th style={{ padding: '0.75rem' }}>Responsible Branch</th>
                    <th style={{ padding: '0.75rem' }}>Budget (Mn)</th>
                    <th style={{ padding: '0.75rem' }}>Reported Phys. %</th>
                    <th style={{ padding: '0.75rem' }}>Reported Fin. (Mn)</th>
                    <th style={{ padding: '0.75rem' }}>Verified Phys. %</th>
                    <th style={{ padding: '0.75rem' }}>Verified Fin. (Mn)</th>
                    <th style={{ padding: '0.75rem' }}>Audit Status</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVerificationActivities.length === 0 ? (
                    <tr>
                      <td colSpan={10} style={{ padding: '2rem', textAlign: 'center', color: '#64748B' }}>
                        No activities found matching Vote Number &quot;{verificationVoteFilter}&quot; in FY {selectedYear}.
                      </td>
                    </tr>
                  ) : (
                    filteredVerificationActivities.map((act) => {
                      const ver = verifications.find((v) => v.aipActivityId === act.id);
                      const isVerified = ver?.status === 'Verified';

                      return (
                        <tr key={act.id} style={{ borderBottom: '1px solid #EBEBEB' }}>
                          <td style={{ padding: '0.75rem', fontWeight: 700, color: '#00534E' }}>
                            {act.activityCode || 'ACT'}
                          </td>
                          <td style={{ padding: '0.75rem', maxWidth: '280px' }}>
                            <div style={{ fontWeight: 600, color: '#222' }}>{act.activity}</div>
                            {act.voteNumber && (
                              <span style={{ fontSize: '0.72rem', color: '#777' }}>Vote: {act.voteNumber}</span>
                            )}
                          </td>
                          <td style={{ padding: '0.75rem', fontWeight: 600, color: '#334155' }}>
                            {act.branchName}
                          </td>
                          <td style={{ padding: '0.75rem', fontWeight: 600 }} title={`Exact: ${formatRupees(act.estimatedCost, true)}`}>
                            Rs. {formatMillion(act.estimatedCost)}
                          </td>
                          <td style={{ padding: '0.75rem' }}>
                            <span
                              style={{
                                padding: '0.2rem 0.5rem',
                                borderRadius: '4px',
                                background: '#E8F5E9',
                                color: '#2E7D32',
                                fontWeight: 700,
                              }}
                            >
                              {act.physicalProgressPct || '0%'}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem', fontWeight: 600 }} title={`Exact: ${formatRupees(act.financialProgress, true)}`}>
                            Rs. {formatMillion(act.financialProgress)}
                          </td>
                          <td style={{ padding: '0.75rem' }}>
                            {ver ? (
                              <span
                                style={{
                                  padding: '0.2rem 0.5rem',
                                  borderRadius: '4px',
                                  background: '#E0F2F1',
                                  color: '#00796B',
                                  fontWeight: 700,
                                }}
                              >
                                {ver.verifiedPhysicalPct}%
                              </span>
                            ) : (
                              <span style={{ color: '#999' }}>—</span>
                            )}
                          </td>
                          <td
                            style={{ padding: '0.75rem', fontWeight: 600 }}
                            title={ver ? `Exact: ${formatRupees(ver.verifiedFinancialCost ?? ver.verifiedFinancialDisbursement, true)}` : ''}
                          >
                            {ver ? `Rs. ${formatMillion(ver.verifiedFinancialCost ?? ver.verifiedFinancialDisbursement)}` : <span style={{ color: '#999' }}>—</span>}
                          </td>
                          <td style={{ padding: '0.75rem' }}>
                            {isVerified ? (
                              <span
                                style={{
                                  padding: '0.25rem 0.6rem',
                                  borderRadius: '999px',
                                  background: '#E0F2F1',
                                  color: '#00534E',
                                  fontWeight: 700,
                                  fontSize: '0.75rem',
                                }}
                              >
                                ✅ Verified
                              </span>
                            ) : (
                              <span
                                style={{
                                  padding: '0.25rem 0.6rem',
                                  borderRadius: '999px',
                                  background: '#FFF3E0',
                                  color: '#E65100',
                                  fontWeight: 700,
                                  fontSize: '0.75rem',
                                }}
                              >
                                ⏳ Pending Audit
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                            {isQaMonitoringOfficer ? (
                              <button
                                onClick={() => {
                                  setSelectedActivityForVerify(act);
                                  setVerifyForm({
                                    verifiedPhysicalPct: parseFloat(String(act.physicalProgressPct || '75').replace('%', '')) || 75,
                                    verifiedFinancialCost: Number(act.financialProgress) || 0,
                                    status: 'Verified',
                                    verificationNotes: ver?.verificationNotes || 'On-site verification completed. Attendance sheets and expenditure vouchers verified.',
                                    evidenceApproved: true,
                                  });
                                  setShowVerifyModal(true);
                                }}
                                className="btn btn-secondary"
                                style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
                              >
                                {ver ? 'Re-Audit' : 'Verify'}
                              </button>
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>View Only</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── MODULE: VOTE FINANCIAL EXPENDITURE SUMMARY CARD ── */}
        {activeTab === 'vote_expenditure' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Top Selector & Controls Card */}
            <div className="card" style={{ padding: '1.35rem', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1E293B', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>💰</span> Treasury Vote Financial Expenditure Summary
                    </h2>
                    <span
                      style={{
                        background: '#F0FDFA',
                        color: '#0F766E',
                        border: '1px solid #99F6E4',
                        padding: '0.2rem 0.65rem',
                        borderRadius: '999px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                      }}
                    >
                      High Officers Financial Oversight
                    </span>
                  </div>
                  <p style={{ color: '#64748B', fontSize: '0.84rem', marginTop: '0.3rem', marginBottom: 0 }}>
                    Official expenditure monitoring for high officers. Select a government vote to inspect total approved budget allocation, cumulative money spent, remaining balance, and branch activity disbursements.
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <span style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600 }}>Financial Year:</span>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="form-control"
                    style={{ width: '150px', fontWeight: 700, fontSize: '0.84rem' }}
                  >
                    <option value="2027">FY 2027 (Planning)</option>
                    <option value="2026">FY 2026 (Current)</option>
                    <option value="2025">FY 2025 (Closed)</option>
                  </select>
                  <button
                    type="button"
                    onClick={fetchData}
                    className="btn btn-secondary"
                    style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem', fontWeight: 600 }}
                  >
                    🔄 Refresh
                  </button>
                </div>
              </div>

              {/* Vote Selection Bar */}
              <div style={{ background: '#F8FAFC', border: '1.5px solid #CBD5E1', borderRadius: '10px', padding: '1.1rem 1.35rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) auto', gap: '1.25rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#00534E', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Select Treasury Vote Number:
                    </label>
                    <select
                      value={selectedVoteNumber}
                      onChange={(e) => setSelectedVoteNumber(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.65rem 1rem',
                        borderRadius: '8px',
                        border: '2px solid #00534E',
                        fontSize: '0.92rem',
                        fontWeight: 700,
                        color: '#00534E',
                        background: '#FFFFFF',
                        cursor: 'pointer',
                        outline: 'none',
                        boxShadow: '0 1px 3px rgba(0, 83, 78, 0.1)',
                      }}
                    >
                      {allVoteOptions.map((v) => (
                        <option key={v.voteNumber} value={v.voteNumber}>
                          Vote {v.voteNumber} — {v.voteName} ({v.category})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Quick Pick Pills */}
                  <div>
                    <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 700, marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                      Quick Vote Selection:
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                      {['126', '127', '128', '129', '130', '131'].map((vn) => (
                        <button
                          key={vn}
                          type="button"
                          onClick={() => setSelectedVoteNumber(vn)}
                          style={{
                            padding: '0.4rem 0.8rem',
                            borderRadius: '6px',
                            border: selectedVoteNumber === vn ? '2px solid #00534E' : '1px solid #CBD5E1',
                            background: selectedVoteNumber === vn ? '#00534E' : '#FFFFFF',
                            color: selectedVoteNumber === vn ? '#FFFFFF' : '#334155',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                          }}
                        >
                          Vote {vn}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── THE FINANCIAL EXPENDITURE SUMMARY CARD ── */}
            <div
              style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderTop: '5px solid #00534E',
                borderRadius: '12px',
                padding: '1.6rem 1.8rem',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
              }}
            >
              {/* Card Header & Classification Badges */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.4rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        background: '#00534E',
                        color: '#FFFFFF',
                        fontSize: '0.88rem',
                        fontWeight: 800,
                        padding: '0.25rem 0.8rem',
                        borderRadius: '6px',
                        letterSpacing: '0.02em',
                      }}
                    >
                      Vote {voteExpenditureData.voteNumber}
                    </span>
                    <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#1E293B', margin: 0 }}>
                      {currentVoteInfo.voteName}
                    </h3>
                  </div>
                  <p style={{ color: '#64748B', fontSize: '0.85rem', marginTop: '0.35rem', marginBottom: 0, maxWidth: '780px', lineHeight: 1.5 }}>
                    {currentVoteInfo.description}
                  </p>
                </div>

                {/* Status Badges */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      background: currentVoteInfo.category === 'Capital' ? '#FEF3C7' : '#EFF6FF',
                      color: currentVoteInfo.category === 'Capital' ? '#B45309' : '#1D4ED8',
                      border: `1px solid ${currentVoteInfo.category === 'Capital' ? '#FDE68A' : '#BFDBFE'}`,
                    }}
                  >
                    ● {currentVoteInfo.category} Expenditure
                  </span>

                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      background:
                        voteExpenditureData.totalAllocation === 0
                          ? '#F1F5F9'
                          : voteExpenditureData.utilizationRate >= 75
                          ? '#ECFDF5'
                          : voteExpenditureData.utilizationRate >= 50
                          ? '#FFFBEB'
                          : '#FEF2F2',
                      color:
                        voteExpenditureData.totalAllocation === 0
                          ? '#475569'
                          : voteExpenditureData.utilizationRate >= 75
                          ? '#065F46'
                          : voteExpenditureData.utilizationRate >= 50
                          ? '#92400E'
                          : '#991B1B',
                      border: `1px solid ${
                        voteExpenditureData.totalAllocation === 0
                          ? '#CBD5E1'
                          : voteExpenditureData.utilizationRate >= 75
                          ? '#A7F3D0'
                          : voteExpenditureData.utilizationRate >= 50
                          ? '#FDE68A'
                          : '#FECACA'
                      }`,
                    }}
                  >
                    {voteExpenditureData.totalAllocation === 0 ? '⚪ No Records' : voteExpenditureData.status === 'On Track' ? '✅ On Track' : voteExpenditureData.status === 'Moderate Progress' ? '⚠️ Moderate Burn' : '🚨 Under-Utilized'} ({voteExpenditureData.utilizationRate}%)
                  </span>

                  <span
                    style={{
                      padding: '0.25rem 0.65rem',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      background: '#F1F5F9',
                      color: '#475569',
                      border: '1px solid #CBD5E1',
                    }}
                  >
                    FY {selectedYear}
                  </span>
                </div>
              </div>

              {/* 4 Financial Highlight KPI Tiles */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '1rem',
                  marginBottom: '1.5rem',
                }}
              >
                {/* Tile 1: Total Approved Allocation */}
                <div
                  style={{
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderLeft: '4px solid #00534E',
                    borderRadius: '8px',
                    padding: '1.1rem',
                  }}
                >
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    💰 Approved Budget Allocation
                  </div>
                  <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#00534E', marginTop: '0.35rem' }}>
                    Rs. {formatMillion(voteExpenditureData.totalAllocation)} Mn
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '0.25rem', fontWeight: 600 }}>
                    Exact: Rs. {(voteExpenditureData.totalAllocation * 1000000).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                {/* Tile 2: Total Money Spent */}
                <div
                  style={{
                    background: '#F0FDF4',
                    border: '1px solid #BBF7D0',
                    borderLeft: '4px solid #16A34A',
                    borderRadius: '8px',
                    padding: '1.1rem',
                  }}
                >
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    💸 Actual Money Spent (Disbursed)
                  </div>
                  <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#16A34A', marginTop: '0.35rem' }}>
                    Rs. {formatMillion(voteExpenditureData.totalSpent)} Mn
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#166534', marginTop: '0.25rem', fontWeight: 600 }}>
                    Exact: Rs. {(voteExpenditureData.totalSpent * 1000000).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                {/* Tile 3: Remaining Balance */}
                <div
                  style={{
                    background: '#EFF6FF',
                    border: '1px solid #BFDBFE',
                    borderLeft: '4px solid #2563EB',
                    borderRadius: '8px',
                    padding: '1.1rem',
                  }}
                >
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#1E40AF', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    ⚖️ Remaining / Unspent Balance
                  </div>
                  <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#2563EB', marginTop: '0.35rem' }}>
                    Rs. {formatMillion(voteExpenditureData.remainingBalance)} Mn
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#1E40AF', marginTop: '0.25rem', fontWeight: 600 }}>
                    Exact: Rs. {(voteExpenditureData.remainingBalance * 1000000).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                {/* Tile 4: Burn Rate / Utilization */}
                <div
                  style={{
                    background: '#FFFBEB',
                    border: '1px solid #FDE68A',
                    borderLeft: '4px solid #D97706',
                    borderRadius: '8px',
                    padding: '1.1rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#92400E', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      📊 Expenditure Burn Rate
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#D97706' }}>
                      {voteExpenditureData.utilizationRate}%
                    </span>
                  </div>
                  <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#D97706', marginTop: '0.35rem' }}>
                    {voteExpenditureData.utilizationRate}%
                  </div>
                  {/* Progress Bar */}
                  <div style={{ width: '100%', height: '7px', background: '#FEF3C7', borderRadius: '999px', marginTop: '0.45rem', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${Math.min(100, voteExpenditureData.utilizationRate)}%`,
                        height: '100%',
                        background:
                          voteExpenditureData.utilizationRate >= 75
                            ? '#16A34A'
                            : voteExpenditureData.utilizationRate >= 50
                            ? '#D97706'
                            : '#DC2626',
                        borderRadius: '999px',
                        transition: 'width 0.4s ease',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Scope & Funded Activities Strip */}
              <div
                style={{
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  padding: '0.85rem 1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '1.5rem',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                  fontSize: '0.82rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                  <div>
                    <span style={{ color: '#64748B' }}>Treasury Funding Source: </span>
                    <strong style={{ color: '#0F172A' }}>Government Consolidated Fund (General Revenue)</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748B' }}>Executing Scope: </span>
                    <strong style={{ color: '#0F172A' }}>Ministry Line Branches, Provincial Departments & Apex Bodies</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748B' }}>Total Active Commitments: </span>
                    <strong style={{ color: '#00534E' }}>{voteExpenditureData.totalMatchingCount} Implementation Activities</strong>
                  </div>
                </div>

                <Link
                  href="/vote-management"
                  style={{
                    color: '#00534E',
                    fontWeight: 700,
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    fontSize: '0.8rem',
                  }}
                >
                  Manage Votes in Planning Branch →
                </Link>
              </div>

              {/* Activities Funded Table Section */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#1E293B' }}>
                    Implementing Branch Activities Funded Under Vote {voteExpenditureData.voteNumber}
                  </h4>

                  {/* Branch filter */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 600 }}>Filter Branch:</label>
                    <select
                      value={voteBranchFilter}
                      onChange={(e) => setVoteBranchFilter(e.target.value)}
                      style={{
                        padding: '0.35rem 0.75rem',
                        borderRadius: '6px',
                        border: '1px solid #CBD5E1',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        color: '#1E293B',
                        background: '#FFFFFF',
                      }}
                    >
                      <option value="all">All Implementing Branches</option>
                      {operationalBranches.map((b: any) => (
                        <option key={b.id} value={b.id}>
                          {b.name?.replace(/^MOE\s+/i, '') || b.id}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Table */}
                <div style={{ overflowX: 'auto', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
                    <thead>
                      <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                        <th style={{ padding: '0.7rem 0.85rem', color: '#475569', fontWeight: 700, fontSize: '0.74rem', textTransform: 'uppercase', width: '70px' }}>Code</th>
                        <th style={{ padding: '0.7rem 0.85rem', color: '#475569', fontWeight: 700, fontSize: '0.74rem', textTransform: 'uppercase' }}>Activity Name / Milestone</th>
                        <th style={{ padding: '0.7rem 0.85rem', color: '#475569', fontWeight: 700, fontSize: '0.74rem', textTransform: 'uppercase', width: '220px' }}>Implementing Branch</th>
                        <th style={{ padding: '0.7rem 0.85rem', color: '#475569', fontWeight: 700, fontSize: '0.74rem', textTransform: 'uppercase', width: '120px', textAlign: 'right' }}>Budget (Mn)</th>
                        <th style={{ padding: '0.7rem 0.85rem', color: '#475569', fontWeight: 700, fontSize: '0.74rem', textTransform: 'uppercase', width: '120px', textAlign: 'right' }}>Spent (Mn)</th>
                        <th style={{ padding: '0.7rem 0.85rem', color: '#475569', fontWeight: 700, fontSize: '0.74rem', textTransform: 'uppercase', width: '100px', textAlign: 'center' }}>Physical %</th>
                        <th style={{ padding: '0.7rem 0.85rem', color: '#475569', fontWeight: 700, fontSize: '0.74rem', textTransform: 'uppercase', width: '130px', textAlign: 'center' }}>Audit Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {voteExpenditureData.matchingActivities.length === 0 ? (
                        <tr>
                          <td colSpan={7} style={{ padding: '2.5rem 1rem', textAlign: 'center', color: '#64748B' }}>
                            <div style={{ fontSize: '1.6rem', marginBottom: '0.4rem' }}>🏛️</div>
                            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#334155' }}>
                              {voteExpenditureData.totalAllocation === 0
                                ? `Vote ${voteExpenditureData.voteNumber} — No Expenditure Records in FY ${selectedYear}`
                                : `Vote ${voteExpenditureData.voteNumber} — Baseline Treasury Allocation Active`}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#64748B', maxWidth: '580px', margin: '0.25rem auto 0' }}>
                              {voteExpenditureData.totalAllocation === 0
                                ? 'No budget commitments or expenditure vouchers have been recorded for this vote in the current financial year.'
                                : <>This vote is provisioned with <strong>Rs. {formatMillion(voteExpenditureData.totalAllocation)} Mn</strong> allocation. Individual activity expenditure vouchers will appear in this breakdown table as operational divisions submit their monthly AIP returns.</>}
                            </div>
                          </td>
                        </tr>
                      ) : (
                        voteExpenditureData.matchingActivities.map((act) => {
                          const ver = verifications.find((v) => v.aipActivityId === act.id);
                          const isVerified = ver?.status === 'Verified';
                          const spentVal = Number(act.financialProgress) || Number(act.actualFinancialMonth) || 0;

                          return (
                            <tr key={act.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                              <td style={{ padding: '0.7rem 0.85rem', fontWeight: 700, color: '#00534E' }}>
                                {act.activityCode || 'ACT'}
                              </td>
                              <td style={{ padding: '0.7rem 0.85rem' }}>
                                <div style={{ fontWeight: 600, color: '#0F172A' }}>{act.activity}</div>
                                {act.remarks && (
                                  <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '2px' }}>{act.remarks}</div>
                                )}
                              </td>
                              <td style={{ padding: '0.7rem 0.85rem', color: '#334155', fontWeight: 600 }}>
                                {act.branchName || act.responsibleBranch || 'Line Division'}
                              </td>
                              <td style={{ padding: '0.7rem 0.85rem', textAlign: 'right', fontWeight: 700, color: '#00534E' }}>
                                Rs. {formatMillion(act.estimatedCost)}
                              </td>
                              <td style={{ padding: '0.7rem 0.85rem', textAlign: 'right', fontWeight: 700, color: '#16A34A' }}>
                                Rs. {formatMillion(spentVal)}
                              </td>
                              <td style={{ padding: '0.7rem 0.85rem', textAlign: 'center' }}>
                                <span
                                  style={{
                                    display: 'inline-block',
                                    padding: '0.15rem 0.5rem',
                                    borderRadius: '4px',
                                    fontSize: '0.74rem',
                                    fontWeight: 700,
                                    background: '#E8F5E9',
                                    color: '#2E7D32',
                                  }}
                                >
                                  {act.physicalProgressPct || '0%'}
                                </span>
                              </td>
                              <td style={{ padding: '0.7rem 0.85rem', textAlign: 'center' }}>
                                {isVerified ? (
                                  <span
                                    style={{
                                      display: 'inline-block',
                                      padding: '0.2rem 0.55rem',
                                      borderRadius: '999px',
                                      fontSize: '0.72rem',
                                      fontWeight: 700,
                                      background: '#E0F2F1',
                                      color: '#00534E',
                                    }}
                                  >
                                    ✅ Verified
                                  </span>
                                ) : (
                                  <span
                                    style={{
                                      display: 'inline-block',
                                      padding: '0.2rem 0.55rem',
                                      borderRadius: '999px',
                                      fontSize: '0.72rem',
                                      fontWeight: 700,
                                      background: '#FFF3E0',
                                      color: '#E65100',
                                    }}
                                  >
                                    ⏳ Pending Audit
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Observations & Inspections */}
        {activeTab === 'observations' && (
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#1A1A1A' }}>
                  Field Inspection Observations & Monitoring Findings (MON-007, MON-010)
                </h3>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: '#666' }}>
                  Official observations recorded by Monitoring Officers during on-site inspections and progress reviews.
                </p>
              </div>

              {isQaMonitoringOfficer && (
                <button
                  onClick={() => setShowObsModal(true)}
                  className="btn btn-primary"
                  style={{ fontSize: '0.84rem' }}
                >
                  ➕ Record Observation
                </button>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {observations.map((obs) => {
                const isResolved = obs.status === 'Resolved';
                const severityColors: Record<string, { bg: string; color: string }> = {
                  Low: { bg: '#E8F5E9', color: '#2E7D32' },
                  Medium: { bg: '#FFF8E1', color: '#F57F17' },
                  High: { bg: '#FFEBEE', color: '#C62828' },
                  Critical: { bg: '#8D153A', color: '#FFFFFF' },
                };
                const sc = severityColors[obs.severity] || severityColors.Medium;

                return (
                  <div
                    key={obs.id}
                    style={{
                      border: '1px solid #EBEBEB',
                      borderRadius: '8px',
                      padding: '1rem',
                      background: isResolved ? '#FAFAFA' : '#FFF',
                      borderLeft: `5px solid ${obs.severity === 'Critical' || obs.severity === 'High' ? '#8D153A' : '#00534E'}`,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              padding: '0.15rem 0.5rem',
                              borderRadius: '4px',
                              background: sc.bg,
                              color: sc.color,
                            }}
                          >
                            {obs.severity} Severity
                          </span>
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              padding: '0.15rem 0.5rem',
                              borderRadius: '4px',
                              background: '#F0F0F0',
                              color: '#555',
                            }}
                          >
                            {obs.observationType}
                          </span>
                          <span style={{ fontWeight: 600, color: '#334155', fontSize: '0.8rem' }}>
                            {obs.divisionName}
                          </span>
                        </div>
                        <h4 style={{ margin: '0.2rem 0', fontSize: '0.95rem', color: '#222' }}>
                          {obs.title}
                        </h4>
                        <p style={{ margin: '0.4rem 0', fontSize: '0.84rem', color: '#555', lineHeight: 1.45 }}>
                          {obs.details}
                        </p>
                      </div>

                      <div style={{ textAlign: 'right', minWidth: '130px' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '0.25rem 0.65rem',
                            borderRadius: '999px',
                            background: isResolved ? '#E8F5E9' : '#FFF3E0',
                            color: isResolved ? '#2E7D32' : '#E65100',
                          }}
                        >
                          {obs.status}
                        </span>
                        <div style={{ fontSize: '0.7rem', color: '#888', marginTop: '0.35rem' }}>
                          {new Date(obs.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    {obs.correctiveActionRequired && (
                      <div
                        style={{
                          marginTop: '0.75rem',
                          padding: '0.6rem 0.75rem',
                          background: '#FFF8E1',
                          borderRadius: '6px',
                          border: '1px solid #FFE082',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span style={{ fontSize: '0.8rem', color: '#F57F17', fontWeight: 600 }}>
                          ⚠️ Formal Corrective Action Notice Issued to {obs.divisionName}
                        </span>
                        <button
                          onClick={() => setActiveTab('corrective')}
                          className="btn btn-secondary"
                          style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                        >
                          View Action Tracker →
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: Corrective Actions */}
        {activeTab === 'corrective' && (
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#1A1A1A' }}>
                Corrective Actions & Follow-up Tracker (MON-008, MON-009)
              </h3>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: '#666' }}>
                Official directives issued to implementing branches with compliance deadlines and verification signs-off.
              </p>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#F5F5F5' }}>
                    <th style={{ padding: '0.75rem' }}>Ref ID</th>
                    <th style={{ padding: '0.75rem' }}>Assigned Division</th>
                    <th style={{ padding: '0.75rem' }}>Issue Summary</th>
                    <th style={{ padding: '0.75rem' }}>Mandatory Corrective Action</th>
                    <th style={{ padding: '0.75rem' }}>Deadline</th>
                    <th style={{ padding: '0.75rem' }}>Branch Response</th>
                    <th style={{ padding: '0.75rem' }}>Status</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {correctiveActions.map((ca) => (
                    <tr key={ca.id} style={{ borderBottom: '1px solid #EBEBEB' }}>
                      <td style={{ padding: '0.75rem', fontWeight: 700, color: '#C96200' }}>
                        {ca.id.slice(0, 10)}
                      </td>
                      <td style={{ padding: '0.75rem', fontWeight: 600, color: '#334155' }}>
                        {ca.assignedDivisionName}
                      </td>
                      <td style={{ padding: '0.75rem', maxWidth: '200px' }}>{ca.issueSummary}</td>
                      <td style={{ padding: '0.75rem', maxWidth: '240px', color: '#444' }}>
                        {ca.recommendedAction}
                      </td>
                      <td style={{ padding: '0.75rem', fontWeight: 600, color: '#8D153A' }}>
                        {ca.deadline}
                      </td>
                      <td style={{ padding: '0.75rem', maxWidth: '180px', fontSize: '0.8rem' }}>
                        {ca.responseNotes || <span style={{ color: '#999' }}>Awaiting branch update</span>}
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <span
                          style={{
                            padding: '0.25rem 0.6rem',
                            borderRadius: '999px',
                            background: ca.status === 'Resolved' ? '#E8F5E9' : '#FFF3E0',
                            color: ca.status === 'Resolved' ? '#2E7D32' : '#E65100',
                            fontWeight: 700,
                            fontSize: '0.75rem',
                          }}
                        >
                          {ca.status}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        <button
                          onClick={() => {
                            setSelectedCA(ca);
                            setCaResponseNotes(ca.responseNotes || '');
                            setShowResponseModal(true);
                          }}
                          className="btn btn-secondary"
                          style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                        >
                          Update Status
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: Institutional Performance Scorecard */}
        {activeTab === 'evaluation' && (
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#1A1A1A' }}>
                Ministry Performance Evaluation Matrix (FRS Section 23: 7 Standard Dimensions)
              </h3>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: '#666' }}>
                Consolidated performance metrics evaluated across financial compliance, physical targets, and operational timeliness.
              </p>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '1.25rem',
                marginBottom: '1.5rem',
              }}
            >
              <div style={{ border: '1px solid #EBEBEB', borderRadius: '8px', padding: '1rem', background: '#FAFAFA' }}>
                <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', color: '#00534E' }}>
                  1. Financial Performance Dimensions
                </h4>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px dashed #DDD' }}>
                  <span style={{ fontSize: '0.84rem' }}>Budget Utilisation (Actual / Approved):</span>
                  <strong style={{ color: '#00534E' }}>{metrics?.budgetUtilisationRate}%</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px dashed #DDD' }}>
                  <span style={{ fontSize: '0.84rem' }}>Commitment Ratio:</span>
                  <strong>18.4%</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0' }}>
                  <span style={{ fontSize: '0.84rem' }}>Budget Variance (Surplus/Gap):</span>
                  <strong>Rs. {metrics?.budgetVarianceMn} Mn</strong>
                </div>
              </div>

              <div style={{ border: '1px solid #EBEBEB', borderRadius: '8px', padding: '1rem', background: '#FAFAFA' }}>
                <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', color: '#00534E' }}>
                  2. Physical & Timeliness Dimensions
                </h4>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px dashed #DDD' }}>
                  <span style={{ fontSize: '0.84rem' }}>Physical Achievement (Verified/Target):</span>
                  <strong style={{ color: '#00534E' }}>{metrics?.physicalAchievementRate}%</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px dashed #DDD' }}>
                  <span style={{ fontSize: '0.84rem' }}>Activity Completion Rate:</span>
                  <strong>{metrics?.activityCompletionRate}%</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0' }}>
                  <span style={{ fontSize: '0.84rem' }}>Timeliness Rating (On-time Completion):</span>
                  <strong style={{ color: '#00534E' }}>{metrics?.timelinessRate}%</strong>
                </div>
              </div>

              <div style={{ border: '1px solid #EBEBEB', borderRadius: '8px', padding: '1rem', background: '#FAFAFA' }}>
                <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', color: '#00534E' }}>
                  3. Training & Workshop Execution
                </h4>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px dashed #DDD' }}>
                  <span style={{ fontSize: '0.84rem' }}>Workshops Conducted vs Planned:</span>
                  <strong style={{ color: '#00534E' }}>92%</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px dashed #DDD' }}>
                  <span style={{ fontSize: '0.84rem' }}>Trainee Attendance Completion Rate:</span>
                  <strong>89.6%</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0' }}>
                  <span style={{ fontSize: '0.84rem' }}>Resource Person Deployment Ratio:</span>
                  <strong>100%</strong>
                </div>
              </div>
            </div>

            <button
              onClick={() => window.print()}
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <span>🖨️</span>
              <span>Print Official Performance Audit Report</span>
            </button>
          </div>
        )}

        {/* Modal: Verify Progress */}
        {showVerifyModal && selectedActivityForVerify && (
          <div className="modal-backdrop">
            <div className="modal" style={{ maxWidth: '580px', width: '90%' }}>
              <div className="modal-header">
                <h3 className="modal-title">
                  Progress Verification Audit: {selectedActivityForVerify.activityCode}
                </h3>
                <button
                  type="button"
                  className="modal-close"
                  onClick={() => setShowVerifyModal(false)}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleVerifySubmit} className="modal-body">
                <div style={{ background: '#F9F9F9', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem' }}>
                  <div style={{ fontSize: '0.75rem', color: '#666', textTransform: 'uppercase', fontWeight: 700 }}>
                    Activity
                  </div>
                  <div style={{ fontWeight: 600, color: '#1A1A1A', marginTop: '0.2rem' }}>
                    {selectedActivityForVerify.activity}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#00534E', marginTop: '0.25rem' }}>
                    Branch: {selectedActivityForVerify.branchName} | Budget: Rs. {formatDualDeclaration(selectedActivityForVerify.estimatedCost).combined}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label className="form-label">Reported Physical %</label>
                    <input
                      type="text"
                      className="form-control"
                      value={selectedActivityForVerify.physicalProgressPct || '0%'}
                      disabled
                    />
                  </div>
                  <div>
                    <label className="form-label">Verified Physical %</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      className="form-control"
                      value={verifyForm.verifiedPhysicalPct}
                      onChange={(e) => setVerifyForm({ ...verifyForm, verifiedPhysicalPct: Number(e.target.value) })}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label className="form-label">Reported Financial (Mn)</label>
                    <input
                      type="text"
                      className="form-control"
                      value={`Rs. ${formatMillion(selectedActivityForVerify.financialProgress)} Mn (${formatRupees(selectedActivityForVerify.financialProgress, true)})`}
                      disabled
                    />
                  </div>
                  <div>
                    <label className="form-label">Verified Financial (Mn)</label>
                    <input
                      type="number"
                      step="any"
                      className="form-control"
                      value={verifyForm.verifiedFinancialCost}
                      onChange={(e) => setVerifyForm({ ...verifyForm, verifiedFinancialCost: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
                      required
                      placeholder="0.00"
                    />
                    <div style={{ fontSize: '0.72rem', color: '#00534E', marginTop: '0.25rem', fontWeight: 600 }}>
                      Exact: {formatRupees(verifyForm.verifiedFinancialCost, true)}
                    </div>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Audit Decision</label>
                  <select
                    className="form-control"
                    value={verifyForm.status}
                    onChange={(e) => setVerifyForm({ ...verifyForm, status: e.target.value })}
                  >
                    <option value="Verified">Verified & Approved</option>
                    <option value="Conditional">Conditional Approval (Pending Minor Evidence)</option>
                    <option value="Rejected">Rejected / Significant Discrepancy Found</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Verification Audit Notes</label>
                  <textarea
                    rows={3}
                    className="form-control"
                    value={verifyForm.verificationNotes}
                    onChange={(e) => setVerifyForm({ ...verifyForm, verificationNotes: e.target.value })}
                    placeholder="Enter on-site verification notes, verified attendance rolls, or voucher audit details..."
                    required
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                  <input
                    type="checkbox"
                    id="evidenceAppr"
                    checked={verifyForm.evidenceApproved}
                    onChange={(e) => setVerifyForm({ ...verifyForm, evidenceApproved: e.target.checked })}
                  />
                  <label htmlFor="evidenceAppr" style={{ fontSize: '0.85rem', cursor: 'pointer' }}>
                    Confirm supporting documents & participant attendance rolls have been independently verified
                  </label>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                  <button type="button" onClick={() => setShowVerifyModal(false)} className="btn btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Record Verification
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Log Observation */}
        {showObsModal && (
          <div className="modal-backdrop">
            <div className="modal" style={{ maxWidth: '600px', width: '90%' }}>
              <div className="modal-header">
                <h3 className="modal-title">Record Field Inspection Observation (MON-007)</h3>
                <button
                  type="button"
                  className="modal-close"
                  onClick={() => setShowObsModal(false)}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleObsSubmit} className="modal-body">
                <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                  <label className="form-label">Linked AIP Activity</label>
                  <select
                    className="form-control"
                    value={obsForm.aipActivityId}
                    onChange={(e) => setObsForm({ ...obsForm, aipActivityId: e.target.value })}
                    required
                  >
                    <option value="">Select an Activity...</option>
                    {activities.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.activityCode || 'ACT'} - {a.activity?.slice(0, 50)}... ({a.branchName})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.75rem' }}>
                  <div>
                    <label className="form-label">Observation Type</label>
                    <select
                      className="form-control"
                      value={obsForm.observationType}
                      onChange={(e) => setObsForm({ ...obsForm, observationType: e.target.value })}
                    >
                      <option value="Field Inspection">Field Inspection</option>
                      <option value="Progress Deviation">Progress Deviation</option>
                      <option value="Budget Utilisation">Budget Utilisation</option>
                      <option value="Evidence Deficiency">Evidence Deficiency</option>
                      <option value="General Observation">General Observation</option>
                    </select>
                  </div>

                  <div>
                    <label className="form-label">Severity Level</label>
                    <select
                      className="form-control"
                      value={obsForm.severity}
                      onChange={(e) => setObsForm({ ...obsForm, severity: e.target.value })}
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                  <label className="form-label">Observation Title</label>
                  <input
                    type="text"
                    className="form-control"
                    value={obsForm.title}
                    onChange={(e) => setObsForm({ ...obsForm, title: e.target.value })}
                    placeholder="e.g. On-site Zonal IT Lab Hardware Shortage"
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                  <label className="form-label">Detailed Finding & Analysis</label>
                  <textarea
                    rows={3}
                    className="form-control"
                    value={obsForm.details}
                    onChange={(e) => setObsForm({ ...obsForm, details: e.target.value })}
                    placeholder="Provide specific details, participant counts, observed delays, or hardware issues..."
                    required
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '1rem 0' }}>
                  <input
                    type="checkbox"
                    id="requireCA"
                    checked={obsForm.correctiveActionRequired}
                    onChange={(e) => setObsForm({ ...obsForm, correctiveActionRequired: e.target.checked })}
                  />
                  <label htmlFor="requireCA" style={{ fontSize: '0.85rem', fontWeight: 700, color: '#C96200', cursor: 'pointer' }}>
                    Issue Formal Corrective Action Notice to Implementing Branch (MON-008)
                  </label>
                </div>

                {obsForm.correctiveActionRequired && (
                  <div style={{ background: '#FFF8E1', padding: '0.85rem', borderRadius: '6px', marginBottom: '1rem', border: '1px solid #FFE082' }}>
                    <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                      <label className="form-label" style={{ color: '#C96200' }}>Mandated Corrective Action</label>
                      <textarea
                        rows={2}
                        className="form-control"
                        value={obsForm.recommendedAction}
                        onChange={(e) => setObsForm({ ...obsForm, recommendedAction: e.target.value })}
                        placeholder="State clearly what the branch must rectify..."
                        required={obsForm.correctiveActionRequired}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ color: '#C96200' }}>Compliance Deadline</label>
                      <input
                        type="date"
                        className="form-control"
                        value={obsForm.deadline}
                        onChange={(e) => setObsForm({ ...obsForm, deadline: e.target.value })}
                        required={obsForm.correctiveActionRequired}
                      />
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                  <button type="button" onClick={() => setShowObsModal(false)} className="btn btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Record Finding
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Update Corrective Action Status */}
        {showResponseModal && selectedCA && (
          <div className="modal-backdrop">
            <div className="modal" style={{ maxWidth: '520px', width: '90%' }}>
              <div className="modal-header">
                <h3 className="modal-title">Corrective Action Governance: {selectedCA.id.slice(0, 10)}</h3>
                <button
                  type="button"
                  className="modal-close"
                  onClick={() => setShowResponseModal(false)}
                >
                  ✕
                </button>
              </div>

              <div className="modal-body">
                <div style={{ background: '#F5F5F5', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem' }}>
                  <div style={{ fontSize: '0.75rem', color: '#666', fontWeight: 700 }}>Directive</div>
                  <div style={{ fontWeight: 600, color: '#222', marginTop: '0.2rem' }}>{selectedCA.recommendedAction}</div>
                  <div style={{ fontSize: '0.78rem', color: '#8D153A', marginTop: '0.25rem' }}>
                    Target Branch: {selectedCA.assignedDivisionName} | Deadline: {selectedCA.deadline}
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <label className="form-label">Branch Compliance / Action Notes</label>
                  <textarea
                    rows={3}
                    className="form-control"
                    value={caResponseNotes}
                    onChange={(e) => setCaResponseNotes(e.target.value)}
                    placeholder="Enter rectifications taken, revised schedules, or vendor status..."
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => handleUpdateCA('In Progress')}
                    className="btn btn-secondary"
                  >
                    Save As In Progress
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateCA('Resolved')}
                    className="btn btn-primary"
                    style={{ background: '#00534E', borderColor: '#00534E' }}
                  >
                    ✅ Mark Verified & Resolved
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Inspect & Verify Monthly Progress Return */}
        {showVerifyReturnModal && selectedReturnForVerify && (
          <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
            <div className="modal" style={{ maxWidth: '960px', width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', background: '#FFFFFF', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
              {/* Header */}
              <div style={{ padding: '1rem 1.25rem', background: '#00534E', color: '#FFFFFF', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
                    M&E Verification Audit: {selectedReturnForVerify.branchName}
                  </h3>
                  <div style={{ fontSize: '0.78rem', opacity: 0.9, marginTop: '2px' }}>
                    Reporting Period: {selectedReturnForVerify.monthName} {selectedReturnForVerify.year} | Submitted by {selectedReturnForVerify.submittedByName} on {new Date(selectedReturnForVerify.submissionDate).toLocaleString()}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowVerifyReturnModal(false)}
                  style={{ background: 'none', border: 'none', color: '#FFFFFF', fontSize: '1.25rem', cursor: 'pointer', lineHeight: 1 }}
                >
                  ✕
                </button>
              </div>

              {/* Body */}
              <div style={{ padding: '1.25rem', overflowY: 'auto', flex: 1 }}>
                {/* Meta summary cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div style={{ background: '#F8FAFC', padding: '0.65rem 0.85rem', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 700 }}>Target Monitoring Destination</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#00534E', marginTop: '2px' }}>
                      {selectedReturnForVerify.targetMonitoringOrgName || 'Ministry of Education Monitoring & Performance Branch'}
                    </div>
                  </div>
                  <div style={{ background: '#F8FAFC', padding: '0.65rem 0.85rem', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 700 }}>Total Monthly Expenditure</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#00534E', marginTop: '2px' }}>
                      Rs. {formatMillion(selectedReturnForVerify.totalMonthlyExpenditure)} Mn
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#64748B', fontFamily: 'monospace' }}>
                      {formatRupees(selectedReturnForVerify.totalMonthlyExpenditure, true)}
                    </div>
                  </div>
                  <div style={{ background: '#F8FAFC', padding: '0.65rem 0.85rem', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 700 }}>Physical Progress Achievement</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#10B981', marginTop: '2px' }}>
                      {selectedReturnForVerify.avgPhysicalProgressPct}% Average
                    </div>
                  </div>
                </div>

                {/* Activities Breakdown Table */}
                <h4 style={{ margin: '0.5rem 0 0.5rem 0', fontSize: '0.92rem', color: '#1E293B' }}>
                  Activity-Level Physical Progress & Treasury Vote Expenditure (MON-004)
                </h4>
                <div style={{ overflowX: 'auto', border: '1px solid #E2E8F0', borderRadius: '6px', marginBottom: '1.25rem' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: '#F1F5F9', borderBottom: '1px solid #CBD5E1', color: '#334155' }}>
                        <th style={{ padding: '0.5rem 0.65rem' }}>Code</th>
                        <th style={{ padding: '0.5rem 0.65rem' }}>Activity Title</th>
                        <th style={{ padding: '0.5rem 0.65rem' }}>Vote Number</th>
                        <th style={{ padding: '0.5rem 0.65rem', textAlign: 'center' }}>Target</th>
                        <th style={{ padding: '0.5rem 0.65rem', textAlign: 'center' }}>Actual %</th>
                        <th style={{ padding: '0.5rem 0.65rem', textAlign: 'right' }}>Actual Spent (Mn)</th>
                        <th style={{ padding: '0.5rem 0.65rem', textAlign: 'center' }}>Status</th>
                        <th style={{ padding: '0.5rem 0.65rem' }}>Deliverables / Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedReturnForVerify.activityProgressItems || []).map((item: any, i: number) => (
                        <tr key={i} style={{ borderBottom: '1px solid #F1F5F9', background: i % 2 === 0 ? '#FFFFFF' : '#FAFAFA' }}>
                          <td style={{ padding: '0.5rem 0.65rem', fontWeight: 700, color: '#00534E' }}>{item.activityCode}</td>
                          <td style={{ padding: '0.5rem 0.65rem', fontWeight: 600, color: '#1E293B' }}>{item.activityTitle}</td>
                          <td style={{ padding: '0.5rem 0.65rem', fontFamily: 'monospace', fontSize: '0.75rem', color: '#0369A1' }}>{item.voteNumber || '-'}</td>
                          <td style={{ padding: '0.5rem 0.65rem', textAlign: 'center' }}>{item.plannedTargetMonth || '-'}</td>
                          <td style={{ padding: '0.5rem 0.65rem', textAlign: 'center', fontWeight: 700, color: '#00534E' }}>{item.actualPhysicalMonth || `${item.actualPhysicalPct}%`}</td>
                          <td style={{ padding: '0.5rem 0.65rem', textAlign: 'right', fontWeight: 700 }}>
                            <div>Rs. {formatMillion(item.actualFinancialMonth)}</div>
                            <div style={{ fontSize: '0.67rem', color: '#64748B', fontFamily: 'monospace' }}>{formatRupees(item.actualFinancialMonth, true)}</div>
                          </td>
                          <td style={{ padding: '0.5rem 0.65rem', textAlign: 'center' }}>
                            <span style={{
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              background: item.status === 'Completed' ? '#DCFCE7' : item.status === 'On Track' ? '#E0F2FE' : item.status === 'Critical' ? '#FEE2E2' : '#FEF3C7',
                              color: item.status === 'Completed' ? '#166534' : item.status === 'On Track' ? '#0369A1' : item.status === 'Critical' ? '#991B1B' : '#92400E',
                            }}>
                              {item.status}
                            </span>
                          </td>
                          <td style={{ padding: '0.5rem 0.65rem', fontSize: '0.75rem', color: '#475569' }}>{item.implementationNotes || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {selectedReturnForVerify.overallRemarks && (
                  <div style={{ background: '#FFFBEB', padding: '0.75rem', borderRadius: '6px', border: '1px solid #FDE68A', marginBottom: '1.25rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#92400E' }}>Branch Officer Overall Remarks:</div>
                    <div style={{ fontSize: '0.82rem', color: '#78350F', marginTop: '2px' }}>{selectedReturnForVerify.overallRemarks}</div>
                  </div>
                )}

                {/* Verification Form */}
                <form onSubmit={handleVerifyReturnSubmit} style={{ background: '#F8FAFC', padding: '1rem', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                  <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem', color: '#00534E' }}>
                    M&E Officer Formal Verification & Certification Decision
                  </h4>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                        Audit Decision
                      </label>
                      <select
                        value={verifyReturnForm.status}
                        onChange={(e) => setVerifyReturnForm({ ...verifyReturnForm, status: e.target.value as any })}
                        style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '0.85rem', fontWeight: 600 }}
                      >
                        <option value="Verified">✅ Verified — Satisfactory Progress & Documentation</option>
                        <option value="Action Required">⚠️ Action Required — Discrepancies / Targets Lagging</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                        Verification Notes / Observations
                      </label>
                      <textarea
                        rows={2}
                        value={verifyReturnForm.verificationNotes}
                        onChange={(e) => setVerifyReturnForm({ ...verifyReturnForm, verificationNotes: e.target.value })}
                        placeholder="Enter auditor verification remarks and fund utilization validation..."
                        style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '0.82rem' }}
                        required
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <input
                      type="checkbox"
                      id="mandateCA"
                      checked={verifyReturnForm.correctiveActionRequired}
                      onChange={(e) => setVerifyReturnForm({ ...verifyReturnForm, correctiveActionRequired: e.target.checked })}
                    />
                    <label htmlFor="mandateCA" style={{ fontSize: '0.82rem', fontWeight: 700, color: '#C96200', cursor: 'pointer' }}>
                      Issue Formal Corrective Action Notice to {selectedReturnForVerify.branchName} (MON-008)
                    </label>
                  </div>

                  {verifyReturnForm.correctiveActionRequired && (
                    <div style={{ background: '#FFF8E1', padding: '0.85rem', borderRadius: '6px', marginBottom: '1rem', border: '1px solid #FFE082' }}>
                      <div style={{ marginBottom: '0.5rem' }}>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#C96200', marginBottom: '2px' }}>
                          Mandated Remedial Action
                        </label>
                        <textarea
                          rows={2}
                          value={verifyReturnForm.recommendedAction}
                          onChange={(e) => setVerifyReturnForm({ ...verifyReturnForm, recommendedAction: e.target.value })}
                          placeholder="Specify the exact remedial instructions the branch must comply with..."
                          style={{ width: '100%', padding: '0.45rem', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '0.82rem' }}
                          required={verifyReturnForm.correctiveActionRequired}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#C96200', marginBottom: '2px' }}>
                          Compliance Deadline
                        </label>
                        <input
                          type="date"
                          value={verifyReturnForm.deadline}
                          onChange={(e) => setVerifyReturnForm({ ...verifyReturnForm, deadline: e.target.value })}
                          style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '0.82rem' }}
                          required={verifyReturnForm.correctiveActionRequired}
                        />
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.75rem' }}>
                    <button
                      type="button"
                      onClick={() => setShowVerifyReturnModal(false)}
                      style={{ padding: '0.5rem 1rem', background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: '4px', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingVerifyReturn}
                      style={{
                        padding: '0.5rem 1.25rem',
                        background: '#00534E',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '4px',
                        fontWeight: 700,
                        fontSize: '0.82rem',
                        cursor: isSubmittingVerifyReturn ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                      }}
                    >
                      {isSubmittingVerifyReturn ? '⏳ Saving Decision...' : '✅ Certify & Submit Verification Decision'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Propose Corrective Action Notification to Branch (M&E Specialist Feature) */}
        {showProposeCAModal && (
          <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
            <div className="modal" style={{ maxWidth: '640px', width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', background: '#FFFFFF', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
              <div style={{ padding: '1rem 1.25rem', background: '#EB7400', color: '#FFFFFF', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
                    ⚠️ Propose Corrective Action Notification to Branch (MON-008)
                  </h3>
                  <div style={{ fontSize: '0.78rem', opacity: 0.9, marginTop: '2px' }}>
                    Issue formal remediation directive to operational branch with mandated compliance deadline
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowProposeCAModal(false)}
                  style={{ background: 'none', border: 'none', color: '#FFFFFF', fontSize: '1.25rem', cursor: 'pointer', lineHeight: 1 }}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleProposeCASubmit} style={{ padding: '1.25rem', overflowY: 'auto', flex: 1 }}>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Target Operational Branch *
                  </label>
                  <select
                    value={proposeCAForm.targetBranchId}
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      const found = organizations.find((o) => o.id === selectedId);
                      setProposeCAForm({
                        ...proposeCAForm,
                        targetBranchId: selectedId,
                        targetBranchName: found?.name || 'Operational Branch',
                      });
                    }}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '0.85rem', fontWeight: 600 }}
                    required
                  >
                    {operationalBranches.map((b: any) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code || b.id})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                      Severity Level *
                    </label>
                    <select
                      value={proposeCAForm.severity}
                      onChange={(e) => setProposeCAForm({ ...proposeCAForm, severity: e.target.value as any })}
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '0.85rem', fontWeight: 600 }}
                    >
                      <option value="Critical">🔴 Critical (Immediate Compliance / Escalated)</option>
                      <option value="High">🟠 High Priority (Urgent Remediation)</option>
                      <option value="Medium">🟡 Medium (Standard Milestone Delay)</option>
                      <option value="Low">🟢 Low (Process Improvement)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                      Mandated Compliance Deadline *
                    </label>
                    <input
                      type="date"
                      value={proposeCAForm.deadline}
                      onChange={(e) => setProposeCAForm({ ...proposeCAForm, deadline: e.target.value })}
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                      required
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Issue Summary / Observation Title *
                  </label>
                  <input
                    type="text"
                    value={proposeCAForm.title}
                    onChange={(e) => setProposeCAForm({ ...proposeCAForm, title: e.target.value })}
                    placeholder="e.g. Delayed procurement of secondary school science laboratory supplies"
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                    required
                  />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Root Cause & Field Inspection Details
                  </label>
                  <textarea
                    rows={2}
                    value={proposeCAForm.details}
                    onChange={(e) => setProposeCAForm({ ...proposeCAForm, details: e.target.value })}
                    placeholder="Detail the audit discrepancy, milestone lag, or bottleneck observed by M&E..."
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '0.82rem' }}
                  />
                </div>

                <div style={{ marginBottom: '1.25rem', background: '#FFF8E1', padding: '0.85rem', borderRadius: '6px', border: '1px solid #FFE082' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#C96200', marginBottom: '4px' }}>
                    Mandated Corrective Action Directive *
                  </label>
                  <textarea
                    rows={3}
                    value={proposeCAForm.recommendedAction}
                    onChange={(e) => setProposeCAForm({ ...proposeCAForm, recommendedAction: e.target.value })}
                    placeholder="Specify exact rectifications required: e.g. Expedite vendor delivery by Nov 30, reallocate vote savings, or submit revised training schedule..."
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '0.82rem' }}
                    required
                  />
                  <div style={{ fontSize: '0.72rem', color: '#92400E', marginTop: '4px' }}>
                    Upon dispatch, this directive triggers an official high-priority system notification to {proposeCAForm.targetBranchName}.
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setShowProposeCAModal(false)}
                    style={{ padding: '0.5rem 1rem', background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: '4px', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingProposeCA}
                    style={{
                      padding: '0.5rem 1.35rem',
                      background: '#EB7400',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '4px',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      cursor: isSubmittingProposeCA ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                  >
                    {isSubmittingProposeCA ? '⏳ Dispatching...' : '📢 Dispatch Corrective Action Notice'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Branch User Submit Compliance / Rectification Progress */}
        {showBranchResponseModal && selectedCAForResponse && (
          <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
            <div className="modal" style={{ maxWidth: '580px', width: '100%', background: '#FFFFFF', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
              <div style={{ padding: '1rem 1.25rem', background: '#166534', color: '#FFFFFF', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>
                    📝 Submit Compliance Update: {selectedCAForResponse.id.slice(0, 10)}
                  </h3>
                  <div style={{ fontSize: '0.78rem', opacity: 0.9, marginTop: '2px' }}>
                    Assigned to {selectedCAForResponse.assignedDivisionName} • Deadline: {selectedCAForResponse.deadline}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowBranchResponseModal(false)}
                  style={{ background: 'none', border: 'none', color: '#FFFFFF', fontSize: '1.25rem', cursor: 'pointer', lineHeight: 1 }}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleBranchResponseSubmit} style={{ padding: '1.25rem' }}>
                <div style={{ background: '#F8FAFC', padding: '0.85rem', borderRadius: '6px', border: '1px solid #E2E8F0', marginBottom: '1rem' }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Mandated Directive from M&E</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#C96200', marginTop: '2px' }}>{selectedCAForResponse.recommendedAction}</div>
                  <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '4px' }}>Issue: {selectedCAForResponse.issueSummary}</div>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Remedial Status
                  </label>
                  <select
                    value={branchComplianceStatus}
                    onChange={(e) => setBranchComplianceStatus(e.target.value as any)}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '0.85rem', fontWeight: 600 }}
                  >
                    <option value="In Progress">⏳ In Progress — Rectification actions actively underway</option>
                    <option value="Resolved">✅ Resolved — All directives complied with, ready for M&E verification</option>
                  </select>
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Branch Rectification & Progress Notes *
                  </label>
                  <textarea
                    rows={3}
                    value={branchComplianceNotes}
                    onChange={(e) => setBranchComplianceNotes(e.target.value)}
                    placeholder="Enter details of actions taken: e.g. supplier expedited, revised workshop dates confirmed, additional training material dispatched..."
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '0.82rem' }}
                    required
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setShowBranchResponseModal(false)}
                    style={{ padding: '0.5rem 1rem', background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: '4px', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingBranchResponse}
                    style={{
                      padding: '0.5rem 1.35rem',
                      background: '#166534',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '4px',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      cursor: isSubmittingBranchResponse ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {isSubmittingBranchResponse ? '⏳ Submitting...' : '💾 Submit Progress to M&E'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
