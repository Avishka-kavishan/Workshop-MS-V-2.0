import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb, updateDb } from '@/lib/db';
import { AipLifecycleStage } from '@/components/monitoring/AipTrackerTab';

export const dynamic = 'force-dynamic';

const STAGE_DEFINITIONS: Omit<AipLifecycleStage, 'status' | 'metrics'>[] = [
  {
    stageNumber: 1,
    name: 'Budget planning preparation',
    shortName: 'Budget Proposals',
    actor: 'All Branches (All)',
    actorShort: '(All)',
    description: 'Initial activity formulation across all line branches: identifying operational priorities, beneficiary counts, and estimated cost requirements prior to official vote classification.',
    deliverables: [
      'Branch activity proposals submitted',
      'Unvoted estimated budget demands',
      'Preliminary category & objective classification',
    ],
    link: '/budget-forecasting',
    linkLabel: 'Branch Budgeting Workspace',
  },
  {
    stageNumber: 2,
    name: 'Annual Budget Preparation',
    shortName: 'National Budget Compilation',
    actor: 'Planning Branch (P)',
    actorShort: '(P)',
    description: 'Planning Division aggregates branch submissions, rationalizes costs, injects Government Vision strategic initiatives, and prepares the Annual Budget Speech & Estimates dossier.',
    deliverables: [
      'Cost-rationalized activity proposals',
      'Government Vision strategic policy injections',
      'Consolidated Annual Budget Speech & Estimates',
    ],
    link: '/budget-forecasting',
    linkLabel: 'Ministry Formulation Desk',
  },
  {
    stageNumber: 3,
    name: 'Approved Annual Budget',
    shortName: 'Parliamentary Appropriation',
    actor: 'Planning & Treasury (P)',
    actorShort: '(P)',
    description: 'National budget passed by Parliament and Treasury. Official Government Vote Numbers (e.g. 126, 127, 128) and Object Codes gazetted for the financial year.',
    deliverables: [
      'Treasury Appropriation Act & Gazette',
      'Official Government Vote Numbers (126–131)',
      'Macro ministerial budget allocations',
    ],
    link: '/monitoring?tab=vote_management',
    linkLabel: 'Vote Management',
  },
  {
    stageNumber: 4,
    name: 'Branch wise Budget passing',
    shortName: 'Ceiling & Vote Dispatch',
    actor: 'Planning Branch (P)',
    actorShort: '(P)',
    description: 'Planning Division passes authorized expenditure ceilings, approved vote codes, and financial spending limits down to executing line branches and provincial directorates.',
    deliverables: [
      'Branch-wise allocated expenditure ceilings',
      'Vote head assignments per operational division',
      'Authorized spending limits and financial authorizations',
    ],
    link: '/monitoring?tab=vote_expenditure',
    linkLabel: 'Vote Financial Expenditure',
  },
  {
    stageNumber: 5,
    name: 'AIP Prep by branch',
    shortName: 'Branch AIP Formulation',
    actor: 'All Branches (All)',
    actorShort: '(All)',
    description: 'All executing branches construct their official Annual Implementation Plan (AIP) matrix, mapping planned workshops & activities to official vote heads with monthly/quarterly targets.',
    deliverables: [
      'Annual Implementation Plan (AIP) Matrix',
      'Monthly/quarterly physical & financial targets',
      'Results indicators and responsible desk officers',
    ],
    link: '/annual-plan',
    linkLabel: 'Annual Plan Matrix (AIP)',
  },
  {
    stageNumber: 6,
    name: 'AIP Approved PPB',
    shortName: 'PPB Approval & Gazetting',
    actor: 'Policy Planning Branch (P)',
    actorShort: '(P)',
    description: 'Policy Planning Branch (PPB) reviews line branch AIP matrices, conducts quality assurance against ministerial standards, and grants formal executive approval.',
    deliverables: [
      'Approved National Education AIP Document',
      'Formal PPB dispatch circular & approval notice',
      'Locked baseline targets for monitoring oversight',
    ],
    link: '/annual-plan',
    linkLabel: 'AIP Plan Approval Dossier',
  },
  {
    stageNumber: 7,
    name: 'Budget / AIP implementation & Monitoring',
    shortName: 'Implementation & M&E Oversight',
    actor: 'All Branches & Monitoring (All)',
    actorShort: '(All)',
    description: 'Nationwide execution of planned activities, monthly physical and financial progress returns, field verification by Monitoring Officers, and mid-year budget/AIP amendments.',
    deliverables: [
      'Nationwide workshop & activity implementation',
      'Monthly progress returns submitted by branches (MON-004)',
      'Independent field verification & corrective actions (MON-008)',
      'Mid-year AIP amendments & vote virement tracking',
    ],
    link: '/monitoring?tab=results_framework',
    linkLabel: 'Monitoring & Verification Matrix',
  },
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const selectedYear = searchParams.get('year') || '2027';

    const db = await getDb();
    const financialYears = db.financialYears || [];
    const fyRecord = financialYears.find((f) => f.year === selectedYear);

    // Dynamic metrics computation for selected year
    const proposals = ((db.budgetProposalActivities || []) as any[]).filter(
      (p: any) => !p.financialYear && !p.year || p.financialYear === selectedYear || p.year === selectedYear
    );
    const votes = ((db.votes || []) as any[]).filter(
      (v: any) => !v.financialYear && !v.year || v.financialYear === selectedYear || v.year === selectedYear
    );
    const aipActivities = ((db.aipActivities || []) as any[]).filter(
      (a: any) => !a.financialYear && !a.year || a.financialYear === selectedYear || a.year === selectedYear
    );
    const monthlyReturns = (((db as any).monthlyReturns || []) as any[]).filter(
      (r: any) => !r.financialYear && !r.year || r.financialYear === selectedYear || r.year === selectedYear
    );
    const verifications = (((db as any).verifications || []) as any[]).filter(
      (v: any) => !v.financialYear && !v.year || v.financialYear === selectedYear || v.year === selectedYear
    );

    // Calculate Stage Metrics
    const totalProposalCostMn = proposals.reduce(
      (sum: number, p: any) => sum + (Number(p.estimatedCostMn) || 0),
      0
    );
    const acceptedProposals = proposals.filter((p: any) => p.status === 'Accepted' || p.status === 'Adjusted');
    const speechProposals = proposals.filter((p: any) => p.includedInBudgetSpeech);
    const verifiedReturns = monthlyReturns.filter((r: any) => r.status === 'Verified' || r.status === 'Approved');

    // Determine default current stage if not explicitly set
    let currentStage = fyRecord?.currentAipStage;
    if (!currentStage) {
      if (selectedYear === '2025' || fyRecord?.status === 'Closed') {
        currentStage = 7;
      } else if (selectedYear === '2026' || fyRecord?.isCurrent) {
        currentStage = 7;
      } else if (selectedYear === '2027') {
        currentStage = 5; // Default: AIP Preparation by Branches
      } else {
        currentStage = 1;
      }
    }

    // Assemble stages with active/completed/upcoming statuses
    const stages: AipLifecycleStage[] = STAGE_DEFINITIONS.map((def) => {
      let status: 'completed' | 'active' | 'upcoming' = 'upcoming';
      if (def.stageNumber < currentStage) {
        status = 'completed';
      } else if (def.stageNumber === currentStage) {
        status = 'active';
      } else {
        status = 'upcoming';
      }

      let stageMetrics: Record<string, any> = {};
      switch (def.stageNumber) {
        case 1:
          stageMetrics = {
            proposalsCount: proposals.length,
            totalDemandMn: Math.round(totalProposalCostMn * 100) / 100,
            draftsCount: proposals.filter((p) => p.status === 'Draft').length,
            submittedCount: proposals.filter((p) => p.status === 'Submitted' || p.status === 'Accepted').length,
          };
          break;
        case 2:
          stageMetrics = {
            reviewedCount: proposals.filter((p) => p.status !== 'Draft').length,
            acceptedCount: acceptedProposals.length,
            budgetSpeechCount: speechProposals.length,
          };
          break;
        case 3:
          stageMetrics = {
            registeredVotesCount: votes.length,
            activeVotesCount: votes.filter((v) => v.status !== 'Inactive').length,
          };
          break;
        case 4:
          stageMetrics = {
            ceilingsDispatched: (db.budgetCeilings || []).filter((c) => !c.financialYear || c.financialYear === selectedYear).length,
            branchAllocationsCount: (db.budgetAllocations || []).filter((a) => !a.financialYear || a.financialYear === selectedYear).length,
          };
          break;
        case 5:
          stageMetrics = {
            totalAipActivities: aipActivities.length,
            allocatedBudgetMn: Math.round(aipActivities.reduce((s: number, a: any) => s + (Number(a.allocationAmount || a.estimatedCost) || 0), 0) * 100) / 100,
          };
          break;
        case 6:
          stageMetrics = {
            approvedAipActivities: aipActivities.filter((a: any) => a.status === 'Approved').length,
            isAipGazetted: currentStage >= 6,
          };
          break;
        case 7:
          stageMetrics = {
            monthlyReturnsCount: monthlyReturns.length,
            verifiedCount: verifiedReturns.length,
            fieldVerificationsCount: verifications.length,
            correctiveActionsCount: ((db as any).correctiveActions || []).length,
          };
          break;
      }

      return {
        ...def,
        status,
        metrics: stageMetrics,
      };
    });

    const activeStage = stages.find((s) => s.stageNumber === currentStage) || stages[0];

    return NextResponse.json({
      success: true,
      selectedYear,
      financialYear: fyRecord || {
        year: selectedYear,
        status: selectedYear === '2026' ? 'Active' : selectedYear === '2025' ? 'Closed' : 'Planning',
        isCurrent: selectedYear === '2026',
        currentAipStage: currentStage,
      },
      currentStageNumber: currentStage,
      activeStage,
      stages,
      availableYears: (financialYears.length > 0 ? financialYears : [
        { year: '2027', status: 'Planning', isCurrent: false, currentAipStage: 5 },
        { year: '2026', status: 'Active', isCurrent: true, currentAipStage: 7 },
        { year: '2025', status: 'Closed', isCurrent: false, currentAipStage: 7 },
        { year: '2028', status: 'Planning', isCurrent: false, currentAipStage: 1 },
      ]).map((f: any) => ({
        year: f.year,
        status: f.status,
        isCurrent: f.isCurrent,
        currentStage: f.currentAipStage || (f.year === '2025' || f.year === '2026' ? 7 : f.year === '2027' ? 5 : 1),
      })),
    });
  } catch (error: any) {
    console.error('Error fetching AIP tracker data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch AIP tracker data', details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: Authentication required.' }, { status: 401 });
    }

    const body = await req.json();
    const { year, stageNumber, notes } = body;

    const stageNum = Number(stageNumber);
    if (!year || isNaN(stageNum) || stageNum < 1 || stageNum > 7) {
      return NextResponse.json(
        { error: 'Valid year and stageNumber (1 to 7) are required.' },
        { status: 400 }
      );
    }

    let updatedRecord: any = null;

    await updateDb((draft) => {
      if (!draft.financialYears) draft.financialYears = [];
      let fy = draft.financialYears.find((f) => f.year === String(year).trim());
      if (!fy) {
        fy = {
          id: `fy-${String(year).trim()}`,
          year: String(year).trim(),
          startDate: `${year}-01-01`,
          endDate: `${year}-12-31`,
          status: year === '2026' ? 'Active' : year === '2025' ? 'Closed' : 'Planning',
          isCurrent: year === '2026',
          createdAt: new Date().toISOString(),
          createdBy: user.id || 'user-superadmin',
        };
        draft.financialYears.push(fy);
      }

      fy.currentAipStage = stageNum;
      if (notes !== undefined) fy.aipStageNotes = notes;
      fy.aipStageUpdatedAt = new Date().toISOString();
      fy.aipStageUpdatedBy = user.name || user.username || 'System User';

      updatedRecord = fy;
    });

    return NextResponse.json({
      success: true,
      message: `AIP Tracker current stage for FY ${year} successfully updated to Stage ${stageNum}.`,
      financialYear: updatedRecord,
    });
  } catch (error: any) {
    console.error('Error updating AIP tracker stage:', error);
    return NextResponse.json(
      { error: 'Failed to update AIP tracker stage', details: error.message },
      { status: 500 }
    );
  }
}
