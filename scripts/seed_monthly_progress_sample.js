const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'database.json');

function main() {
  const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  const now = new Date().toISOString();

  if (!db.monthlyProgressReturns) db.monthlyProgressReturns = [];

  // Find ICT branch plan
  const ictPlan = (db.aipPlans || []).find((p) => p.branchId === 'org-moe-ict' && p.year === '2027');
  const ictActs = (db.aipActivities || []).filter((a) => a.branchId === 'org-moe-ict' && (a.year === '2027' || !a.year));

  if (ictActs.length > 0) {
    const sampleReturnIct = {
      id: 'mpr-org-moe-ict-2027-01',
      planId: ictPlan?.id || 'plan-moe-itde-2027',
      branchId: 'org-moe-ict',
      branchName: 'Information Technology and Digital Education Branch',
      year: '2027',
      month: 1,
      monthName: 'January',
      submissionDate: '2027-01-31T14:30:00.000Z',
      submittedByUserId: 'user-ict-officer',
      submittedByName: 'P.W. Ranasinghe (Assistant Director - IT)',
      targetMonitoringOrgId: 'org-moe-monitoring',
      targetMonitoringOrgName: 'Ministry of Education Monitoring & Evaluation Branch',
      totalMonthlyExpenditure: 12.85,
      totalCumulativeExpenditure: 12.85,
      avgPhysicalProgressPct: 28,
      activityProgressItems: ictActs.slice(0, 4).map((a, idx) => ({
        activityId: a.id,
        activityCode: a.activityCode || String(idx + 1),
        activityTitle: a.activity,
        voteNumber: a.voteNumber || '126-02-03-2502',
        plannedTargetMonth: '25%',
        actualPhysicalMonth: `${20 + idx * 5}%`,
        actualPhysicalPct: 20 + idx * 5,
        plannedFinancialMonth: 5.0,
        actualFinancialMonth: 3.2,
        cumulativeFinancialCost: 3.2,
        status: idx === 1 ? 'Delayed' : 'On Track',
        implementationNotes: `Milestone 1 finalized. Procurement tender published under vote ${a.voteNumber}.`,
      })),
      overallRemarks: 'January baseline deliverables initiated on schedule. Server tender documents submitted to Procurement Division.',
      status: 'Verified',
      verificationRecordId: 'vr-mpr-sample-01',
      verifiedAt: '2027-02-05T10:15:00.000Z',
      verifiedBy: 'H.M. Bandara (Chief Monitoring Officer)',
      verificationNotes: 'Expenditures audited against Treasury Vote 126-02-03-2502. Physical progress verified on site.',
      createdAt: '2027-01-31T14:30:00.000Z',
      updatedAt: '2027-02-05T10:15:00.000Z',
    };

    const existingIdx = db.monthlyProgressReturns.findIndex((r) => r.id === sampleReturnIct.id);
    if (existingIdx !== -1) {
      db.monthlyProgressReturns[existingIdx] = sampleReturnIct;
    } else {
      db.monthlyProgressReturns.push(sampleReturnIct);
    }
    console.log('Seeded sample monthly progress return for org-moe-ict (January 2027)');
  }

  // Find DOE Evaluation branch plan
  const doePlan = (db.aipPlans || []).find((p) => p.branchId === 'org-doe-eval' && p.year === '2027');
  const doeActs = (db.aipActivities || []).filter((a) => a.branchId === 'org-doe-eval' && (a.year === '2027' || !a.year));

  if (doeActs.length > 0) {
    const sampleReturnDoe = {
      id: 'mpr-org-doe-eval-2027-01',
      planId: doePlan?.id || 'plan-doe-eval-2027',
      branchId: 'org-doe-eval',
      branchName: 'DOE School Examinations & Assessment Evaluation Branch',
      year: '2027',
      month: 1,
      monthName: 'January',
      submissionDate: '2027-01-31T16:00:00.000Z',
      submittedByUserId: 'user-doe-eval',
      submittedByName: 'S.M. Wickramasinghe (Assistant Commissioner)',
      targetMonitoringOrgId: 'org-moe-monitoring',
      targetMonitoringOrgName: 'Department of Examinations Quality & Monitoring Unit',
      totalMonthlyExpenditure: 8.5,
      totalCumulativeExpenditure: 8.5,
      avgPhysicalProgressPct: 30,
      activityProgressItems: doeActs.map((a, idx) => ({
        activityId: a.id,
        activityCode: a.activityCode || String(idx + 1),
        activityTitle: a.activity,
        voteNumber: a.voteNumber || '126-02-08-2104',
        plannedTargetMonth: '25%',
        actualPhysicalMonth: '30%',
        actualPhysicalPct: 30,
        plannedFinancialMonth: 4.0,
        actualFinancialMonth: 2.8,
        cumulativeFinancialCost: 2.8,
        status: 'On Track',
        implementationNotes: 'Chief Examiner panel selection completed across 14 subject boards.',
      })),
      overallRemarks: 'Evaluation panel briefings conducted on schedule. Marking center venue contracts drafted.',
      status: 'Submitted',
      createdAt: '2027-01-31T16:00:00.000Z',
      updatedAt: '2027-01-31T16:00:00.000Z',
    };

    const existingIdx = db.monthlyProgressReturns.findIndex((r) => r.id === sampleReturnDoe.id);
    if (existingIdx !== -1) {
      db.monthlyProgressReturns[existingIdx] = sampleReturnDoe;
    } else {
      db.monthlyProgressReturns.push(sampleReturnDoe);
    }
    console.log('Seeded sample monthly progress return for org-doe-eval (January 2027)');
  }

  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
  console.log('Finished seeding monthly progress returns!');
}

main();
