import fs from 'fs';
import path from 'path';
import { isPostgresConfigured, query } from './pg';
import {
  loadFullSchemaFromPostgres,
  pgInsertWorkshop,
  pgInsertTrainee,
  pgInsertResourcePerson,
  pgInsertReschedule,
  pgInsertNotification,
  pgSetMeta,
  pgInsertAipPlan,
  pgInsertAipActivity,
} from './postgres';
import {
  MONITORING_ORGANIZATION,
  MONITORING_ROLE,
  MONITORING_USER,
  ADDITIONAL_SECRETARY_ROLE,
  DIRECTOR_ROLE,
  SUPERADMIN_ROLE,
  SUPERADMIN_USER,
  DEFAULT_STRATEGIC_OBJECTIVES,
  DEFAULT_PROGRAMMES,
  DEFAULT_PROJECTS,
  DEFAULT_OBJECT_CODES,
  DEFAULT_FUNDING_SOURCES,
  DEFAULT_BUDGET_CEILINGS,
  DEFAULT_BUDGET_ALLOCATIONS,
  DEFAULT_BUDGET_REVISIONS,
  DEFAULT_MONITORING_OBSERVATIONS,
  DEFAULT_VERIFICATION_RECORDS,
  DEFAULT_CORRECTIVE_ACTIONS,
  DEFAULT_EVIDENCE_FILES,
  DEFAULT_FINANCIAL_YEARS,
  DEFAULT_DEADLINES,
  DEFAULT_ANNOUNCEMENTS,
  DEFAULT_BUDGET_PROPOSALS,
  DEFAULT_GOVERNMENT_VOTES,
  DEFAULT_AIP_TEMPLATES,
  AipColumn,
  AipTemplate,
  LEVEL_ADMIN_ROLES,
  LEVEL_ADMIN_USERS,
} from './frsSeedData';
import {
  OFFICIAL_ORGANIZATION_TYPES,
  ALL_OFFICIAL_ORGANIZATIONS,
} from './hierarchyData';

const IS_VERCEL = process.env.VERCEL === '1' || !!process.env.AWS_LAMBDA_FUNCTION_NAME;
const SOURCE_DB_FILE = path.join(process.cwd(), 'data', 'database.json');
const DB_FILE = IS_VERCEL ? path.join('/tmp', 'database.json') : SOURCE_DB_FILE;

export interface DbSchema {
  organizationTypes: OrganizationType[];
  organizations: Organization[];
  userRoles: UserRole[];
  users: User[];
  userOrgPermissions: UserOrgPermission[];
  workshopCategories: WorkshopCategory[];
  workshopStatuses: WorkshopStatus[];
  workshops: Workshop[];
  trainees: Trainee[];
  resourcePersons: ResourcePerson[];
  workshopApprovals: WorkshopApproval[];
  attachments: Attachment[];
  notifications: Notification[];
  workshopReschedules: WorkshopReschedule[];
  meta: {
    lastWorkshopNumber: number;
    showDashboardProgressMeter?: boolean;
    enableBranchApprovalChain?: boolean;
    [key: string]: any;
  };
  aipAmendments: AipAmendment[];
  aipPlans: AipPlan[];
  aipActivities: AipActivity[];

  // FRS Extended Entities
  strategicObjectives: StrategicObjective[];
  programmes: Programme[];
  projects: Project[];
  expenditureObjectCodes: ExpenditureObjectCode[];
  fundingSources: FundingSource[];
  budgetCeilings: BudgetCeiling[];
  budgetAllocations: BudgetAllocation[];
  budgetRevisions: BudgetRevision[];
  budgetProposalActivities: BudgetProposalActivity[];
  monitoringObservations: MonitoringObservation[];
  verificationRecords: VerificationRecord[];
  correctiveActions: CorrectiveAction[];
  evidenceFiles: EvidenceFile[];
  monthlyProgressReturns?: MonthlyProgressReturn[];

  // Super Admin Management Entities
  financialYears: FinancialYear[];
  deadlines: SystemDeadline[];
  announcements: Announcement[];
  calendarSubscribers?: CalendarSubscriber[];
  auditLogs?: SystemAuditLog[];
  votes?: GovernmentVote[];
  aipTemplates?: AipTemplate[];
}

export type { AipColumn, AipTemplate };
export { DEFAULT_AIP_TEMPLATES };

export interface SystemAuditLog {
  id: string;
  timestamp: string;
  userId: string;
  username: string;
  userFullName: string;
  organizationId: string;
  organizationName: string;
  category: 'Governance' | 'Financial' | 'Operational' | 'Security';
  action: string;
  entityType:
    | 'AIP_PLAN'
    | 'AIP_AMENDMENT'
    | 'AIP_MONTHLY_RETURN'
    | 'BUDGET_PROPOSAL'
    | 'BUDGET_ALLOCATION'
    | 'BUDGET_CEILING'
    | 'WORKSHOP'
    | 'QA_VERIFICATION'
    | 'QA_OBSERVATION'
    | 'USER_ROLE'
    | 'ORGANIZATION'
    | 'RESOURCE_PERSON'
    | 'AUTH'
    | 'SYSTEM_SETTINGS'
    | 'REPORT_EXPORT'
    | 'CORRECTIVE_ACTION'
    | 'USER_MANAGEMENT'
    | string;
  entityId: string;
  summary: string;
  details?: Record<string, any>;
  severity: 'Info' | 'Warning' | 'Critical';
  ipAddress?: string;
  userAgent?: string;
}

export interface CalendarSubscriber {
  id: string;
  branchId: string;
  branchName: string;
  officerName: string;
  email: string;
  platform: 'Google Calendar' | 'Apple Calendar' | 'Outlook';
  role: string;
  status: 'Active' | 'Paused';
  lastSyncedAt: string;
  notificationOnChanges: boolean;
  createdAt: string;
}

export const DEFAULT_CALENDAR_SUBSCRIBERS: CalendarSubscriber[] = [
  {
    id: 'sub-1',
    branchId: 'org-moe-ict',
    branchName: 'MOE ICT Branch',
    officerName: 'Dr. S.K. Senanayake',
    email: 'sk.senanayake@moe.gov.lk',
    platform: 'Google Calendar',
    role: 'Director (Planning & Monitoring)',
    status: 'Active',
    lastSyncedAt: '12 mins ago',
    notificationOnChanges: true,
    createdAt: '2026-11-01T08:00:00Z',
  },
  {
    id: 'sub-2',
    branchId: 'org-moe-ict',
    branchName: 'MOE ICT Branch',
    officerName: 'P.W. Ranasinghe',
    email: 'pw.ranasinghe@moe.gov.lk',
    platform: 'Apple Calendar',
    role: 'Assistant Director (IT & Digital Systems)',
    status: 'Active',
    lastSyncedAt: '25 mins ago',
    notificationOnChanges: true,
    createdAt: '2026-11-02T09:30:00Z',
  },
  {
    id: 'sub-3',
    branchId: 'org-moe-ict',
    branchName: 'MOE ICT Branch',
    officerName: 'M.I. Farook',
    email: 'mi.farook@gmail.com',
    platform: 'Google Calendar',
    role: 'Provincial Coordinating Officer (WP)',
    status: 'Active',
    lastSyncedAt: '1 hour ago',
    notificationOnChanges: true,
    createdAt: '2026-11-05T10:15:00Z',
  },
  {
    id: 'sub-4',
    branchId: 'org-moe-ict',
    branchName: 'MOE ICT Branch',
    officerName: 'H.M. Bandara',
    email: 'hm.bandara@icloud.com',
    platform: 'Apple Calendar',
    role: 'Curriculum & In-Service Training Officer',
    status: 'Active',
    lastSyncedAt: '2 hours ago',
    notificationOnChanges: true,
    createdAt: '2026-11-06T11:40:00Z',
  },
  {
    id: 'sub-5',
    branchId: 'org-moe-ict',
    branchName: 'MOE ICT Branch',
    officerName: 'K.T. Jayawardena',
    email: 'kt.jayawardena@moe.gov.lk',
    platform: 'Outlook',
    role: 'Senior Management Assistant',
    status: 'Active',
    lastSyncedAt: '3 hours ago',
    notificationOnChanges: true,
    createdAt: '2026-11-08T14:20:00Z',
  },
  {
    id: 'sub-6',
    branchId: 'org-moe-ict',
    branchName: 'MOE ICT Branch',
    officerName: 'T. Dharshani',
    email: 't.dharshani@moe.gov.lk',
    platform: 'Google Calendar',
    role: 'Field Monitoring & Verification Officer',
    status: 'Active',
    lastSyncedAt: '4 hours ago',
    notificationOnChanges: true,
    createdAt: '2026-11-09T16:00:00Z',
  },
];

export interface StrategicObjective {
  id: string;
  code: string;
  title: string;
  description?: string;
  financialYear: string;
}

export interface Programme {
  id: string;
  strategicObjectiveId: string;
  code: string;
  name: string;
  description?: string;
}

export interface Project {
  id: string;
  programmeId: string;
  code: string;
  name: string;
  description?: string;
}

export interface ExpenditureObjectCode {
  id: string;
  code: string;
  name: string;
  category: string;
  description?: string;
}

export interface FundingSource {
  id: string;
  code: string;
  name: string;
  type: 'Domestic' | 'Foreign Aid' | 'Loan';
}

export interface BudgetCeiling {
  id: string;
  financialYear: string;
  institutionId: string;
  institutionName: string;
  totalCeiling: number;
  allocatedAmount: number;
  remainingBalance: number;
  issuedBy: string;
  issuedAt: string;
}

export interface BudgetAllocation {
  id: string;
  financialYear: string;
  institutionId: string;
  institutionName: string;
  divisionId: string;
  divisionName: string;
  aipActivityId?: string;
  activityName?: string;
  objectCode: string;
  objectCodeName: string;
  fundingSource: string;
  approvedBudget: number;
  allocationAmount: number;
  commitmentAmount: number;
  expenditureAmount: number;
  paymentAmount: number;
  balanceAmount: number;
  status: 'Draft' | 'Approved' | 'Revised';
  version: number;
  allocatedBy: string;
  approvedBy?: string;
  updatedAt: string;
}

export interface BudgetRevision {
  id: string;
  allocationId: string;
  revisionNumber: number;
  financialYear: string;
  institutionName: string;
  divisionName: string;
  activityName: string;
  objectCode: string;
  previousAmount: number;
  revisedAmount: number;
  changeDifference: number;
  reason: string;
  requestedBy: string;
  requestedAt: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  reviewedBy?: string;
  approvedBy?: string;
  approvedAt?: string;
  notes?: string;
}

export interface PreviousAcceptedVersion {
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
}

export interface BudgetProposalActivity {
  id: string;
  financialYear: string;
  implementationYear?: string; // Proposed year of implementation
  institutionId: string;
  institutionName: string;
  divisionId: string;
  divisionName: string;
  activityTitle: string;
  category: 'Workshop & Training' | 'Curriculum Development' | 'Infrastructure & ICT' | 'Student Programme' | 'Monitoring & Evaluation' | 'Other' | string;
  categoryDetail?: string; // Detailed custom category when 'Other'
  expenditureNature?: 'Recurrent' | 'Capital'; // Recurrent or capital activity
  proposedExecutingAgencyType?: 'Self (Branch)' | 'Level 1 – Ministry Division' | 'Level 2 – National Apex (NIE/EPD/DoE)' | 'Level 3 – Provincial Education Department' | 'Level 4 – Zonal Education Office' | 'Level 5 – Divisional Education Office' | 'Level 6 – School / Implementing Unit' | 'Other Agency' | string;
  executingAgencyName?: string;
  isExtensionOfPreviousAip?: boolean;
  linkedPreviousAipActivityId?: string;
  linkedPreviousAipActivityCode?: string;
  linkedPreviousAipActivityTitle?: string;
  linkedOtherActivityTitle?: string; // Linking with any other activity (if any)
  description: string;
  purpose?: string;
  justification: string;
  expectedOutputs: string;
  keyDeliverables?: string;
  implementationPeriod: 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'Annual' | string;
  targetBeneficiaries: string;
  beneficiaryCount: number;
  estimatedCostMn: number;
  noBudgetRequired?: boolean; // When activity requires zero budget
  // Stage 1 Status:
  status: 'Draft' | 'Pending Director Approval' | 'Pending Additional Secretary Approval' | 'Submitted' | 'Under Review' | 'Accepted' | 'Adjusted' | 'Rejected' | 'Deferred' | 'Duplicate';
  submittedBy: string;
  submittedAt?: string;
  directorApprovedBy?: string;
  directorApprovedAt?: string;
  addSecApprovedBy?: string;
  addSecApprovedAt?: string;
  // Stage 2 (Planning Division / PPB attributes):
  activityNumber?: number;            // Automatically assigned by PPB upon acceptance (e.g. 1, 2, 3...)
  assignedActivityCode?: string;      // e.g. "ACT-01", "ACT-02"
  allocatedAmountMn?: number;         // Official PPB allocation (in Rs. Mn)
  ppbModificationsNote?: string;      // Directives and changes made by PPB
  isStrategicVisionAddition?: boolean; // true if added by Planning Division as Government Vision
  governmentPriorityTheme?: string;   // e.g. "Digital Education & STEM", "Educational Reforms", "Health & Nutrition", "Equity & Infrastructure"
  assignedVoteNumber?: string;        // Assigned by Planning Division in Stage 2 (e.g. "126-02-03-2502")
  assignedObjectCode?: string;        // Assigned by Planning Division (e.g. "2502", "1101")
  assignedFundingSource?: string;     // Treasury, ADB-ESDP, World Bank
  adjustedCostMn?: number;            // Cost approved/adjusted by Planning Division
  planningRemarks?: string;           // Review notes from Planning Division
  rejectionReasonCategory?: string;   // Structured rejection reason
  rejectionRemarks?: string;          // Specific rejection remarks
  rejectedBy?: string;
  rejectedAt?: string;
  includedInBudgetSpeech?: boolean;   // Flag for Budget Speech highlights
  budgetSpeechSummary?: string;       // Thematic summary for Budget Speech input
  reviewedBy?: string;
  reviewedAt?: string;
  // Revision tracking & reversal facility
  previousAcceptedVersion?: PreviousAcceptedVersion;
  isEditedFromAccepted?: boolean;
  editedAfterAcceptedAt?: string;
  editedAfterAcceptedBy?: string;
  editedByBranchOrRole?: string;
  updatedAt: string;
}

export interface MonitoringObservation {
  id: string;
  aipActivityId?: string;
  aipActivityCode?: string;
  aipActivityTitle?: string;
  workshopId?: string;
  workshopTitle?: string;
  institutionId: string;
  institutionName: string;
  divisionId: string;
  divisionName: string;
  monitoringOfficerId: string;
  monitoringOfficerName: string;
  observationType: 'Field Inspection' | 'Progress Deviation' | 'Budget Utilisation' | 'Evidence Deficiency' | 'General Observation';
  title: string;
  details: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  correctiveActionRequired: boolean;
  correctiveActionId?: string;
  status: 'Open' | 'Under Review' | 'Resolved';
  createdAt: string;
  updatedAt: string;
}

export interface VerificationRecord {
  id: string;
  aipActivityId: string;
  aipActivityCode: string;
  aipActivityTitle: string;
  institutionName: string;
  divisionName: string;
  reportedPhysicalPct: number;
  verifiedPhysicalPct: number;
  reportedFinancialCost: number;
  verifiedFinancialCost: number;
  status: 'Verified' | 'Rejected' | 'Conditional';
  verificationNotes: string;
  evidenceApproved: boolean;
  verifiedByUserId: string;
  verifiedByName: string;
  createdAt: string;
}

export interface CorrectiveAction {
  id: string;
  observationId: string;
  aipActivityId?: string;
  assignedDivisionId: string;
  assignedDivisionName: string;
  issueSummary: string;
  recommendedAction: string;
  deadline: string;
  responseNotes?: string;
  status: 'Pending' | 'In Progress' | 'Resolved' | 'Escalated';
  requestedBy: string;
  requestedAt: string;
  resolvedAt?: string;
  verifiedBy?: string;
}

export interface EvidenceFile {
  id: string;
  aipActivityId?: string;
  workshopId?: string;
  title: string;
  fileName: string;
  fileType: string;
  fileSize?: string;
  uploadedBy: string;
  uploadedAt: string;
  status: 'Submitted' | 'Verified' | 'Rejected';
  notes?: string;
}

export interface MonthlyProgressReturn {
  id: string;
  planId: string;
  branchId: string;
  branchName: string;
  year: string;
  month: number; // 1 to 12
  monthName: string; // e.g. "January", "October"
  submissionDate: string;
  submittedByUserId: string;
  submittedByName: string;
  targetMonitoringOrgId: string;
  targetMonitoringOrgName: string;
  totalMonthlyExpenditure: number; // in Rs. Mn
  totalCumulativeExpenditure: number; // in Rs. Mn
  avgPhysicalProgressPct: number; // e.g. 75
  activityProgressItems: Array<{
    activityId: string;
    activityCode: string;
    activityTitle: string;
    voteNumber: string;
    plannedTargetMonth: string;
    actualPhysicalMonth: string;
    actualPhysicalPct: number;
    plannedFinancialMonth: number;
    actualFinancialMonth: number;
    cumulativeFinancialCost: number;
    status: 'On Track' | 'Delayed' | 'Critical' | 'Completed';
    implementationNotes?: string;
  }>;
  overallRemarks?: string;
  status: 'Submitted' | 'Verified' | 'Action Required';
  verificationRecordId?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  verificationNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FinancialYear {
  id: string;
  year: string;
  startDate: string;
  endDate: string;
  status: 'Planning' | 'Active' | 'Closed';
  isCurrent: boolean;
  description?: string;
  currentAipStage?: number; // 1 to 7 corresponding to AIP Lifecycle
  aipStageNotes?: string;
  aipStageUpdatedAt?: string;
  aipStageUpdatedBy?: string;
  createdAt: string;
  createdBy: string;
}

export interface GovernmentVote {
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

export interface SystemDeadline {
  id: string;
  title: string;
  financialYear: string;
  category: 'AIP Submission' | 'Budget Request' | 'Progress Return' | 'Workshop Scheduling' | 'Audit & Compliance' | 'General';
  targetLevel: number | 'All';
  targetBranchIds?: string[];
  dueDate: string;
  reminderDays?: number;
  description?: string;
  status: 'Active' | 'Extended' | 'Closed';
  createdAt: string;
  createdBy: string;
}

export interface Announcement {
  id: string;
  title: string;
  circularNumber?: string;
  content: string;
  priority: 'Urgent' | 'High' | 'Normal';
  targetLevel: number | 'All';
  targetBranchIds?: string[];
  publishDate: string;
  expiryDate?: string;
  isPublished: boolean;
  authorName: string;
  createdAt: string;
  createdBy: string;
}

export interface OrganizationType {
  id: string;
  name: string;
  level: number;
  description: string;
  createdAt: string;
}

export interface Organization {
  id: string;
  name: string;
  code: string;
  abbreviation?: string;
  typeId: string;
  parentId: string | null;
  unitType?: 'location' | 'branch';
  functionalCategory?: 'Normal' | 'Planning' | 'Monitoring';
  institutionId?: string;
  address?: string;
  phone?: string;
  email?: string;
  isActive: boolean;
  createdAt: string;
}

export interface UserRole {
  id: string;
  name: string;
  description: string;
  functionalScope?: 'Normal' | 'Planning' | 'Monitoring' | 'All';
  delegatedAuthority?: 'Standard' | 'Review' | 'Approval' | 'Verification';
  canCreateWorkshop: boolean;
  canApproveWorkshop: boolean;
  canManageUsers: boolean;
  canViewReports: boolean;
  canManageOrganizations: boolean;
  canView?: boolean;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canSubmit?: boolean;
  canReview?: boolean;
  canRecommend?: boolean;
  canApprove?: boolean;
  canVerify?: boolean;
  canMonitor?: boolean;
  canReallocate?: boolean;
  canRevise?: boolean;
  canExport?: boolean;
  isCustom?: boolean;
  createdAt?: string;
}

export interface UserRoleAssignment {
  id: string;
  userId: string;
  roleId: string;
  roleName: string;
  organizationId: string;
  organizationName: string;
  functionalCategory: 'Normal' | 'Planning' | 'Monitoring' | 'All';
  adminLevel?: number; // 0: SuperAdmin, 1: MoE, 2: Apex, 3: Prov, 4: Zone, 5: Div
  delegatedAuthority?: 'Standard' | 'Review' | 'Approval' | 'Verification';
  description?: string;
  isDefault?: boolean;
  isActive: boolean;
  assignedAt: string;
  assignedBy?: string;
}

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  fullName: string;
  email: string;
  phone?: string;
  designation: string;
  organizationId: string;
  roleId: string;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  aliases?: string[];
  assignedRoles?: UserRoleAssignment[];
  lastSelectedRoleId?: string;
  rememberLastRole?: boolean;
}

export interface UserOrgPermission {
  id: string;
  userId: string;
  organizationId: string;
  canCreate: boolean;
  canView: boolean;
  canApprove: boolean;
}

export interface WorkshopCategory {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
}

export interface WorkshopStatus {
  id: string;
  name: string;
  description: string;
  displayOrder: number;
  color: string;
}

export interface Workshop {
  id: string;
  workshopNumber: string;
  year: string;
  branch: string;
  subject: string;
  title: string;
  aim: string;
  expectedOutput?: string;
  placeId: string;
  placeName: string;
  targetLevel?: 'national' | 'province' | 'zone' | 'school';
  targetPath?: string[];
  daysHeld: number;
  workshopType?: string;
  startDate: string;
  endDate: string;
  venue?: string;
  organizingOrgId: string;
  targetOrgId: string;
  isSelfOrganized?: boolean;
  expectedTrainees: number;
  actualTrainees: number;
  status: 'Scheduled' | 'In Progress' | 'Completed' | 'Rescheduled' | 'Cancelled';
  confirmationStatus?: 'Confirmed' | 'Tentative';
  statusId?: string;
  statusName?: string;
  categoryId?: string;
  categoryName?: string;
  objective?: string;
  description?: string;
  originalStartDate?: string;
  originalEndDate?: string;
  originalVenue?: string;
  rescheduleCount?: number;
  lastRescheduledAt?: string;
  lastRescheduleReason?: string;
  // FRS Linkages & Financial Controls
  aipActivityId?: string;
  aipActivityCode?: string;
  aipActivityTitle?: string;
  objectCode?: string;
  fundingSource?: string;
  budgetBreakdown?: {
    venue: number;
    meals: number;
    transport: number;
    rpFees: number;
    allowances: number;
    materials: number;
    tech: number;
    contingencies: number;
    total: number;
  };
  expenditureBreakdown?: {
    venue: number;
    meals: number;
    transport: number;
    rpFees: number;
    allowances: number;
    materials: number;
    tech: number;
    contingencies: number;
    total: number;
  };
  commitments?: number;
  actualPaid?: number;
  costPerParticipant?: number;
  costPerDay?: number;
  createdBy: string;
  creatorName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkshopReschedule {
  id: string;
  workshopId: string;
  rescheduledByUserId: string;
  rescheduledByName: string;
  rescheduledByOrgName: string;
  rescheduledByBranchType: 'organizer' | 'host' | 'admin';
  oldStartDate: string;
  oldEndDate: string;
  oldDaysHeld: number;
  oldVenue?: string;
  newStartDate: string;
  newEndDate: string;
  newDaysHeld: number;
  newVenue?: string;
  reason: string;
  createdAt: string;
}

export interface Trainee {
  id: string;
  workshopId: string;
  serialNumber?: number;
  nicNumber?: string;
  name: string;
  position?: string;
  schoolInstitute?: string;
  region?: string;
  province?: string;
  phone?: string;
  designation?: string;
  organization?: string;
  email?: string;
  attendanceStatus: 'registered' | 'attended' | 'absent';
  dailyAttendance?: Record<string, 'present' | 'absent' | 'late'>;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ResourcePerson {
  id: string;
  workshopId?: string;
  serialNumber?: number;
  personType?: 'local' | 'foreign';
  nic?: string;
  passportNumber?: string;
  citizenship?: string;
  country?: string;
  name: string;
  position?: string;
  service?: string;
  grade?: string;
  workplace?: string;
  personalAddress?: string;
  educationalQualifications?: string;
  subjectQualifications?: string;
  phone?: string;
  specialNotes?: string;
  organization?: string;
  designation?: string;
  expertiseArea?: string;
  roleInWorkshop?: string;
  email?: string;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  recipientOrgId: string;
  recipientUserId?: string;
  workshopId: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface WorkshopApproval {
  id: string;
  workshopId: string;
  reviewerId: string;
  action: 'submit' | 'approve' | 'return' | 'reject' | 'cancel';
  comments?: string;
  previousStatusId: string;
  newStatusId: string;
  createdAt: string;
}

export interface Attachment {
  id: string;
  workshopId: string;
  fileName: string;
  fileType?: string;
  fileSize?: number;
  filePath?: string;
  uploadedBy: string;
  createdAt: string;
}


export interface AipAmendment {
  id: string;
  year: string;
  amendmentNumber: number;
  title: string;
  circularRef?: string;
  deadline?: string;
  notes?: string;
  progressStartDate?: string;
  progressEndDate?: string;
  createdBy: string;
  creatorName: string;
  status: 'Active' | 'Closed';
  targetBranchIds?: string[]; // If specified, amendment applies only to these branches. If empty/undefined, applies to all branches
  totalBranches?: number;
  submittedBranchesCount?: number;
  branchSubmissions?: Array<{
    branchId: string;
    branchName: string;
    status: string;
    submittedAt?: string | null;
    activityCount: number;
    totalCost: number;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface AipPlan {
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
  amendmentNumber?: number;
  amendmentId?: string;
  progressStartDate?: string;
  progressEndDate?: string;
  submittedAt?: string;
  submissionNotes?: string;
  approvedAt?: string;
  approvedBy?: string;
  approvalNotes?: string;
  dispatchedAt?: string;
  dispatchedBy?: string;
  isDispatchedToBranch?: boolean;
  dispatchNotes?: string;
  submittedToPlanningOrgId?: string;
  submittedToPlanningOrgName?: string;
  directorApprovedBy?: string;
  directorApprovedAt?: string;
  addSecApprovedBy?: string;
  addSecApprovedAt?: string;
  status: 'Draft' | 'Pending Director Approval' | 'Pending Additional Secretary Approval' | 'Submitted' | 'Approved';
  createdAt: string;
  updatedAt: string;
}

export interface AipActivity {
  id: string;
  planId?: string;
  branchId: string;
  branchName: string;
  year: string;
  amendmentNumber?: number;
  amendmentId?: string;
  outputNo: string;
  activityCode: string;
  activity: string;
  strategicObjectiveId?: string;
  programmeId?: string;
  projectId?: string;
  objectCode?: string;
  fundingSource?: string;
  approvedAllocation?: number;
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
  createdBy?: string;
  creatorName?: string;
  createdAt: string;
  updatedAt: string;
}

// ── JSON Local File Helpers ──────────────────────────────────────────

let memoryDb: DbSchema | null = null;

function ensureDataDir(): void {
  const dir = path.dirname(DB_FILE);
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (err) {
      console.error('Error creating database directory:', err);
    }
  }
}

export function invalidateDbCache(): void {
  memoryDb = null;
}

function readJsonFile(): DbSchema {
  if (memoryDb) {
    return memoryDb;
  }

  ensureDataDir();

  if (IS_VERCEL && !fs.existsSync(DB_FILE)) {
    if (fs.existsSync(SOURCE_DB_FILE)) {
      try {
        fs.copyFileSync(SOURCE_DB_FILE, DB_FILE);
      } catch (err) {
        console.error('Failed to copy seed database to /tmp:', err);
      }
    }
  }

  if (!fs.existsSync(DB_FILE)) {
    const emptyDb: DbSchema = {
      organizationTypes: [],
      organizations: [],
      userRoles: [],
      users: [],
      userOrgPermissions: [],
      workshopCategories: [],
      workshopStatuses: [],
      workshops: [],
      trainees: [],
      resourcePersons: [],
      workshopApprovals: [],
      attachments: [],
      notifications: [],
      workshopReschedules: [],
      meta: { lastWorkshopNumber: 0 },
      aipAmendments: [],
      aipPlans: [],
      aipActivities: [],
      strategicObjectives: [],
      programmes: [],
      projects: [],
      expenditureObjectCodes: [],
      fundingSources: [],
      budgetCeilings: [],
      budgetAllocations: [],
      budgetRevisions: [],
      monitoringObservations: [],
      verificationRecords: [],
      correctiveActions: [],
      evidenceFiles: [],
      financialYears: [...DEFAULT_FINANCIAL_YEARS],
      deadlines: [...DEFAULT_DEADLINES],
      announcements: [...DEFAULT_ANNOUNCEMENTS],
      budgetProposalActivities: [],
      votes: [...DEFAULT_GOVERNMENT_VOTES],
      aipTemplates: [...DEFAULT_AIP_TEMPLATES],
    };
    writeJsonFile(emptyDb);
    memoryDb = emptyDb;
    return emptyDb;
  }

  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!parsed.notifications) parsed.notifications = [];
    if (!parsed.workshopReschedules) parsed.workshopReschedules = [];
    if (!parsed.aipAmendments) parsed.aipAmendments = [];
    if (!parsed.aipPlans) parsed.aipPlans = [];
    if (!parsed.aipActivities) parsed.aipActivities = [];

    // FRS Entity Defaults
    if (!parsed.strategicObjectives || parsed.strategicObjectives.length === 0) {
      parsed.strategicObjectives = [...DEFAULT_STRATEGIC_OBJECTIVES];
    }
    if (!parsed.programmes || parsed.programmes.length === 0) {
      parsed.programmes = [...DEFAULT_PROGRAMMES];
    }
    if (!parsed.projects || parsed.projects.length === 0) {
      parsed.projects = [...DEFAULT_PROJECTS];
    }
    if (!parsed.expenditureObjectCodes || parsed.expenditureObjectCodes.length === 0) {
      parsed.expenditureObjectCodes = [...DEFAULT_OBJECT_CODES];
    }
    if (!parsed.fundingSources || parsed.fundingSources.length === 0) {
      parsed.fundingSources = [...DEFAULT_FUNDING_SOURCES];
    }
    if (!parsed.budgetCeilings) {
      parsed.budgetCeilings = [];
    }
    if (!parsed.budgetAllocations) {
      parsed.budgetAllocations = [];
    }
    if (!parsed.budgetRevisions) {
      parsed.budgetRevisions = [];
    }
    if (!parsed.monitoringObservations) {
      parsed.monitoringObservations = [];
    }
    if (!parsed.verificationRecords) {
      parsed.verificationRecords = [];
    }
    if (!parsed.correctiveActions) {
      parsed.correctiveActions = [];
    }
    if (!parsed.evidenceFiles) {
      parsed.evidenceFiles = [];
    }
    if (!parsed.financialYears || parsed.financialYears.length === 0) {
      parsed.financialYears = [...DEFAULT_FINANCIAL_YEARS];
    }
    if (!parsed.deadlines || parsed.deadlines.length === 0) {
      parsed.deadlines = [...DEFAULT_DEADLINES];
    }
    if (!parsed.announcements || parsed.announcements.length === 0) {
      parsed.announcements = [...DEFAULT_ANNOUNCEMENTS];
    }
    if (!parsed.budgetProposalActivities) {
      parsed.budgetProposalActivities = [];
    }
    if (!parsed.votes || parsed.votes.length === 0) {
      parsed.votes = [...DEFAULT_GOVERNMENT_VOTES];
    }
    if (!parsed.aipTemplates || parsed.aipTemplates.length === 0) {
      parsed.aipTemplates = [...DEFAULT_AIP_TEMPLATES];
    }

    // Ensure Monitoring Division, Role, and User exist in memory/db
    if (!parsed.organizations.some((o: any) => o.id === MONITORING_ORGANIZATION.id)) {
      parsed.organizations.push(MONITORING_ORGANIZATION);
    }
    if (!parsed.userRoles.some((r: any) => r.id === MONITORING_ROLE.id)) {
      parsed.userRoles.push(MONITORING_ROLE);
    }
    if (!parsed.userRoles.some((r: any) => r.id === ADDITIONAL_SECRETARY_ROLE.id)) {
      parsed.userRoles.push(ADDITIONAL_SECRETARY_ROLE);
    }
    if (!parsed.userRoles.some((r: any) => r.id === DIRECTOR_ROLE.id)) {
      parsed.userRoles.push(DIRECTOR_ROLE);
    }
    if (!parsed.userRoles.some((r: any) => r.id === SUPERADMIN_ROLE.id)) {
      parsed.userRoles.push(SUPERADMIN_ROLE);
    }
    if (!parsed.users.some((u: any) => u.username === MONITORING_USER.username)) {
      parsed.users.push(MONITORING_USER);
    }
    if (!parsed.users.some((u: any) => u.username === SUPERADMIN_USER.username)) {
      parsed.users.push(SUPERADMIN_USER);
    }
    if (!parsed.users.some((u: any) => u.username === 'curriculum' || u.id === 'user-curriculum')) {
      parsed.users.push({
        id: 'user-curriculum',
        username: 'curriculum',
        aliases: ['curriculum', 'curriculum.officer'],
        passwordHash: '$2b$10$./4O5YT/QD9uTYcc46P4ceeeEY7RSq165PIVDe9XgsKcuDE.Xxm/i',
        fullName: 'MOE Curriculum Development Branch',
        email: 'curriculum@moe.gov.lk',
        designation: 'Director (Curriculum Development)',
        organizationId: 'org-moe-curriculum',
        roleId: 'role-moe-officer',
        isActive: true,
        createdAt: '2026-10-29T04:26:17.180Z',
      });
    }

    // Merge Level 1 - 5 Administrators and Roles
    if (Array.isArray(LEVEL_ADMIN_ROLES)) {
      const existingRoleIds = new Set(parsed.userRoles.map((r: any) => r.id));
      LEVEL_ADMIN_ROLES.forEach((r) => {
        if (!existingRoleIds.has(r.id)) {
          parsed.userRoles.push(r);
        }
      });
    }
    if (Array.isArray(LEVEL_ADMIN_USERS)) {
      LEVEL_ADMIN_USERS.forEach((u) => {
        const existing = parsed.users.find((x: any) => x.id === u.id || x.username === u.username || u.aliases?.includes(x.username));
        if (!existing) {
          parsed.users.push(u);
        } else {
          existing.username = u.username;
          existing.aliases = u.aliases;
          existing.fullName = u.fullName;
          existing.email = u.email;
          existing.designation = u.designation;
        }
      });
    }

    // Merge Official Organization Types (Levels 1-6)
    if (Array.isArray(OFFICIAL_ORGANIZATION_TYPES)) {
      const existingTypeIds = new Set(parsed.organizationTypes.map((t: any) => t.id));
      OFFICIAL_ORGANIZATION_TYPES.forEach((ot) => {
        if (!existingTypeIds.has(ot.id)) {
          parsed.organizationTypes.push(ot);
        } else {
          const item = parsed.organizationTypes.find((t: any) => t.id === ot.id);
          if (item) {
            item.level = ot.level;
            item.description = ot.description;
          }
        }
      });
    }

    // Merge Official Organizations (Apex Level 2, 9 Provinces, 100 Zones, 312 Divisions)
    if (Array.isArray(ALL_OFFICIAL_ORGANIZATIONS)) {
      const existingOrgIds = new Set(parsed.organizations.map((o: any) => o.id));
      ALL_OFFICIAL_ORGANIZATIONS.forEach((officialOrg) => {
        if (!existingOrgIds.has(officialOrg.id)) {
          parsed.organizations.push(officialOrg);
        } else {
          const item = parsed.organizations.find((o: any) => o.id === officialOrg.id);
          if (item) {
            item.parentId = officialOrg.parentId;
            item.typeId = officialOrg.typeId;
            if (officialOrg.district) item.district = officialOrg.district;
          }
        }
      });
    }

    // Set functionalCategory on organizations
    parsed.organizations.forEach((o: any) => {
      if (o.id === 'org-moe-planning' || o.id === 'org-zone-galle-plan' || o.id === 'org-zone-amp-plan') {
        o.functionalCategory = 'Planning';
      } else if (o.id === 'org-moe-monitoring' || o.id.includes('monitor') || o.name?.toLowerCase().includes('monitoring')) {
        o.functionalCategory = 'Monitoring';
      } else if (!o.functionalCategory) {
        o.functionalCategory = 'Normal';
      }
    });

    // Enrich workshops with default AIP link and budget breakdown if missing
    parsed.workshops.forEach((ws: any) => {
      if (!ws.aipActivityId) {
        ws.aipActivityId = 'act-ict-01';
        ws.aipActivityCode = 'ACT-ICT-01';
        ws.aipActivityTitle = 'Capacity building on Digital Pedagogy & Smart Board Usage';
        ws.objectCode = '1101';
        ws.fundingSource = 'Government of Sri Lanka Consolidated Fund (Treasury)';
        ws.budgetBreakdown = {
          venue: 45000,
          meals: 60000,
          transport: 25000,
          rpFees: 36000,
          allowances: 40000,
          materials: 20000,
          tech: 15000,
          contingencies: 10000,
          total: 251000,
        };
        ws.expenditureBreakdown = {
          venue: 45000,
          meals: 58000,
          transport: 22000,
          rpFees: 36000,
          allowances: 38000,
          materials: 18500,
          tech: 15000,
          contingencies: 5000,
          total: 237500,
        };
        ws.commitments = 13500;
        ws.actualPaid = 237500;
      }
    });

    // ── Centralized Multi-Role & Single Login Architecture (AUTH-01 – AUTH-12) ──
    const orgMap = new Map<string, any>(parsed.organizations.map((o: any) => [o.id, o]));
    const roleMap = new Map<string, any>(parsed.userRoles.map((r: any) => [r.id, r]));

    // Multi-Role assignments definitions
    const PLANNING_ROLES: UserRoleAssignment[] = [
      {
        id: 'ura-planning-officer',
        userId: 'user-planning-officer',
        roleId: 'role-planning-officer',
        roleName: 'Planning Division Officer',
        organizationId: 'org-moe-planning',
        organizationName: 'MOE Planning Division',
        functionalCategory: 'Planning',
        delegatedAuthority: 'Review',
        description: 'National AIP review, vote numbers assignment, budget ceilings allocation & approval.',
        isDefault: true,
        isActive: true,
        assignedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'ura-planning-branch',
        userId: 'user-planning-officer',
        roleId: 'role-moe-officer',
        roleName: 'Planning Branch (Operational)',
        organizationId: 'org-moe-planning',
        organizationName: 'MOE Planning Division',
        functionalCategory: 'Normal',
        delegatedAuthority: 'Standard',
        description: 'Prepare internal branch proposals, manage branch operational AIP, and execute workshops.',
        isDefault: false,
        isActive: true,
        assignedAt: '2026-01-01T00:00:00.000Z',
      },
    ];

    const MONITORING_ROLES: UserRoleAssignment[] = [
      {
        id: 'ura-monitoring-specialist',
        userId: 'user-moe-monitoring',
        roleId: 'role-monitoring-officer',
        roleName: 'M&E Specialist / Quality Assurance Officer',
        organizationId: 'org-moe-monitoring',
        organizationName: 'MOE Quality Assurance & Monitoring Branch',
        functionalCategory: 'Monitoring',
        delegatedAuthority: 'Verification',
        description: 'Results framework, KPI performance trends, data quality evaluations & corrective actions.',
        isDefault: true,
        isActive: true,
        assignedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'ura-monitoring-branch',
        userId: 'user-moe-monitoring',
        roleId: 'role-moe-officer',
        roleName: 'Monitoring Branch (Operational)',
        organizationId: 'org-moe-monitoring',
        organizationName: 'MOE Quality Assurance & Monitoring Branch',
        functionalCategory: 'Normal',
        delegatedAuthority: 'Standard',
        description: 'Submit monthly progress returns, branch budget proposals, and internal operations.',
        isDefault: false,
        isActive: true,
        assignedAt: '2026-01-01T00:00:00.000Z',
      },
    ];

    const DATA_ADMIN_ROLES: UserRoleAssignment[] = [
      {
        id: 'ura-admin-data',
        userId: 'user-admin',
        roleId: 'role-moe-officer',
        roleName: 'MOE Data Management Branch (Operational)',
        organizationId: 'org-moe-data',
        organizationName: 'MOE Data Management Branch',
        functionalCategory: 'Normal',
        delegatedAuthority: 'Standard',
        description: 'EMIS cloud workshops, infrastructure proposals, and national statistics bulletins.',
        isDefault: true,
        isActive: true,
        assignedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'ura-admin-addsec',
        userId: 'user-admin',
        roleId: 'role-additional-secretary',
        roleName: 'Additional Secretary (Branch Executive Head)',
        organizationId: 'org-moe-data',
        organizationName: 'MOE Data Management Branch',
        functionalCategory: 'Normal',
        delegatedAuthority: 'Approval',
        description: 'Highest executive authority of the branch. Approves branch workshops, authorizes AIP activities and budget proposals.',
        isDefault: false,
        isActive: true,
        assignedAt: '2026-01-01T00:00:00.000Z',
      },
    ];

    const EQD_ROLES: UserRoleAssignment[] = [
      {
        id: 'ura-eqd-director',
        userId: 'user-eqd-officer',
        roleId: 'role-moe-officer',
        roleName: 'Director (Education Quality Development)',
        organizationId: 'org-moe-eqd',
        organizationName: 'Director (Education Quality Development)',
        functionalCategory: 'Normal',
        delegatedAuthority: 'Approval',
        description: 'Executive branch authorization, quality framework clearance, and high-level endorsement.',
        isDefault: true,
        isActive: true,
        assignedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'ura-eqd-branch',
        userId: 'user-eqd-officer',
        roleId: 'role-moe-officer',
        roleName: 'EQD Branch Officer (Operational)',
        organizationId: 'org-moe-eqd',
        organizationName: 'Director (Education Quality Development)',
        functionalCategory: 'Normal',
        delegatedAuthority: 'Standard',
        description: 'Quality development proposal submissions, teacher training schedules, and AIP drafting.',
        isDefault: false,
        isActive: true,
        assignedAt: '2026-01-01T00:00:00.000Z',
      },
    ];

    const SUPERADMIN_ROLES: UserRoleAssignment[] = [
      {
        id: 'ura-sa-apex',
        userId: 'user-superadmin',
        roleId: 'role-superadmin',
        roleName: 'Ministry Chief Super Administrator',
        organizationId: 'org-moe',
        organizationName: 'Ministry of Education National Headquarters',
        functionalCategory: 'All',
        adminLevel: 0,
        delegatedAuthority: 'Approval',
        description: 'Full Apex Master administrative access across all 6 levels, global audit, and role access control.',
        isDefault: true,
        isActive: true,
        assignedAt: '2026-01-01T00:00:00.000Z',
      },
    ];

    // Enrich all users with assignedRoles and single login mappings
    parsed.users.forEach((u: any) => {
      // 1. Planning Officer & Branch
      if (u.username === 'planning.officer' || u.username === 'planning') {
        u.aliases = ['planning.officer', 'planning'];
        if (!u.assignedRoles || u.assignedRoles.length === 0) {
          u.assignedRoles = JSON.parse(JSON.stringify(PLANNING_ROLES)).map((r: any) => ({ ...r, userId: u.id }));
        }
      }
      // 2. Monitoring Specialist & Branch
      else if (u.username === 'monitoring.officer' || u.username === 'monitoring') {
        u.aliases = ['monitoring.officer', 'monitoring'];
        if (!u.assignedRoles || u.assignedRoles.length === 0) {
          u.assignedRoles = JSON.parse(JSON.stringify(MONITORING_ROLES)).map((r: any) => ({ ...r, userId: u.id }));
        }
      }
      // 3. Data Management Branch (branch-level roles only — no System Administrator)
      else if (u.username === 'admin' || u.username === 'data.management' || u.username === 'data' || u.username === 'data.officer') {
        u.aliases = ['admin', 'data.management', 'data', 'data.officer'];
        if (!u.assignedRoles || u.assignedRoles.length === 0) {
          u.assignedRoles = JSON.parse(JSON.stringify(DATA_ADMIN_ROLES)).map((r: any) => ({ ...r, userId: u.id }));
        } else {
          u.assignedRoles = u.assignedRoles.filter((r: any) => r.id !== 'ura-admin-sys' && r.roleId !== 'role-admin');
          if (u.assignedRoles.length > 0 && !u.assignedRoles.some((r: any) => r.isDefault)) {
            u.assignedRoles[0].isDefault = true;
          }
        }
        if (u.roleId === 'role-admin') {
          u.roleId = 'role-moe-officer';
        }
        if (u.lastSelectedRoleId === 'ura-admin-sys') {
          u.lastSelectedRoleId = u.assignedRoles?.[0]?.id || 'ura-admin-data';
        }
      }
      // 4. EQD Director & Branch
      else if (u.username === 'eqd.officer' || u.username === 'eqd') {
        u.aliases = ['eqd.officer', 'eqd'];
        if (!u.assignedRoles || u.assignedRoles.length === 0) {
          u.assignedRoles = JSON.parse(JSON.stringify(EQD_ROLES)).map((r: any) => ({ ...r, userId: u.id }));
        }
      }
      // 5. Super Admin (single Apex role only — no multiple authorized roles)
      else if (u.username === 'superadmin') {
        u.aliases = ['superadmin'];
        u.assignedRoles = JSON.parse(JSON.stringify(SUPERADMIN_ROLES)).map((r: any) => ({ ...r, userId: u.id }));
        u.lastSelectedRoleId = 'ura-sa-apex';
      }
      // 5B. Normal MOE Operational Branches (Short Testing Usernames + Aliases)
      else if (u.username === 'ict' || u.username === 'ict.officer') {
        u.username = 'ict';
        u.aliases = ['ict', 'ict.officer'];
      }
      else if (u.username === 'digital.infra' || u.username === 'digital') {
        u.username = 'digital.infra';
        u.aliases = ['digital.infra', 'digital'];
      }
      else if (u.username === 'reforms' || u.username === 'reforms.officer') {
        u.username = 'reforms';
        u.aliases = ['reforms', 'reforms.officer'];
      }
      else if (u.username === 'ncoe' || u.username === 'ncoe.officer') {
        u.username = 'ncoe';
        u.aliases = ['ncoe', 'ncoe.officer'];
      }
      else if (u.username === 'piriven' || u.username === 'piriven.officer') {
        u.username = 'piriven';
        u.aliases = ['piriven', 'piriven.officer'];
      }
      else if (u.username === 'agri' || u.username === 'agri.officer') {
        u.username = 'agri';
        u.aliases = ['agri', 'agri.officer'];
      }
      else if (u.username === 'maths' || u.username === 'maths.officer') {
        u.username = 'maths';
        u.aliases = ['maths', 'maths.officer'];
      }
      else if (u.username === 'health' || u.username === 'health.officer') {
        u.username = 'health';
        u.aliases = ['health', 'health.officer'];
      }
      else if (u.username === 'curriculum' || u.username === 'curriculum.officer') {
        u.username = 'curriculum';
        u.aliases = ['curriculum', 'curriculum.officer'];
      }
      // 5C. Level 1 - 5 Administrators (Standardized Level.Province / Zone Naming)
      else if (u.username === 'moe' || u.username === 'moe.admin' || u.id === 'user-admin-level-1') {
        u.username = 'moe';
        u.aliases = ['moe', 'moe.admin'];
        if (u.assignedRoles && u.assignedRoles.length > 0) {
          u.assignedRoles.forEach((r: any) => { r.adminLevel = 1; });
        }
      }
      else if (u.username === 'nie.admin' || u.username === 'nie' || u.id === 'user-admin-level-2') {
        u.username = 'nie.admin';
        u.aliases = ['nie.admin', 'nie'];
        if (u.assignedRoles && u.assignedRoles.length > 0) {
          u.assignedRoles.forEach((r: any) => { r.adminLevel = 2; });
        }
      }
      else if (u.username === 'ped.sp' || u.username === 'provincial.admin' || u.username === 'sp.admin' || u.id === 'user-admin-level-3') {
        u.username = 'ped.sp';
        u.aliases = ['ped.sp', 'provincial.admin', 'sp.admin'];
        if (u.assignedRoles && u.assignedRoles.length > 0) {
          u.assignedRoles.forEach((r: any) => { r.adminLevel = 3; });
        }
      }
      else if (u.username === 'zeo.galle' || u.username === 'zonal.admin' || u.username === 'galle.admin' || u.id === 'user-admin-level-4') {
        u.username = 'zeo.galle';
        u.aliases = ['zeo.galle', 'zonal.admin', 'galle.admin'];
        if (u.assignedRoles && u.assignedRoles.length > 0) {
          u.assignedRoles.forEach((r: any) => { r.adminLevel = 4; });
        }
      }
      else if (u.username === 'deo.galle' || u.username === 'divisional.admin' || u.id === 'user-admin-level-5') {
        u.username = 'deo.galle';
        u.aliases = ['deo.galle', 'divisional.admin'];
        if (u.assignedRoles && u.assignedRoles.length > 0) {
          u.assignedRoles.forEach((r: any) => { r.adminLevel = 5; });
        }
      }
      // 6. All other users: initialize default role assignment
      else if (!u.assignedRoles || u.assignedRoles.length === 0) {
        const uRole = roleMap.get(u.roleId);
        const uOrg = orgMap.get(u.organizationId);
        let adminLvl: number | undefined = undefined;
        if (u.username === 'moe' || u.username === 'moe.admin') adminLvl = 1;
        else if (u.username === 'nie.admin' || u.username === 'nie') adminLvl = 2;
        else if (u.username === 'ped.sp' || u.username === 'provincial.admin') adminLvl = 3;
        else if (u.username === 'zeo.galle' || u.username === 'zonal.admin') adminLvl = 4;
        else if (u.username === 'deo.galle' || u.username === 'divisional.admin') adminLvl = 5;

        u.assignedRoles = [
          {
            id: `ura-${u.id}`,
            userId: u.id,
            roleId: u.roleId,
            roleName: uRole?.name || u.roleId,
            organizationId: u.organizationId,
            organizationName: uOrg?.name || u.organizationId,
            functionalCategory: (uOrg?.functionalCategory as any) || (uRole?.functionalScope as any) || 'Normal',
            adminLevel: adminLvl,
            delegatedAuthority: uRole?.delegatedAuthority || 'Standard',
            description: uRole?.description || 'Operational user access in designated education entity.',
            isDefault: true,
            isActive: true,
            assignedAt: u.createdAt || new Date().toISOString(),
          },
        ];
      }

      // Ensure lastSelectedRoleId default
      if (!u.lastSelectedRoleId && u.assignedRoles && u.assignedRoles.length > 0) {
        const def = u.assignedRoles.find((r: any) => r.isDefault && r.isActive) || u.assignedRoles[0];
        u.lastSelectedRoleId = def?.id;
      }
    });

    // Ensure every active branch with login users (excluding org-moe HQ) has a Director user
    const activeBranchIds = new Set<string>();
    parsed.users.forEach((u: any) => {
      if (u.isActive && u.organizationId && u.organizationId !== 'org-moe') {
        activeBranchIds.add(u.organizationId);
      }
    });

    activeBranchIds.forEach((branchId) => {
      const hasDirector = parsed.users.some(
        (u: any) =>
          u.isActive &&
          (u.organizationId === branchId && u.roleId === 'role-director') ||
          (u.assignedRoles || []).some((r: any) => r.isActive && r.organizationId === branchId && r.roleId === 'role-director')
      );
      if (!hasDirector) {
        const branchOrg = orgMap.get(branchId);
        if (!branchOrg || !branchOrg.isActive) return;
        const slug = branchId
          .replace(/^org-moe-/, '')
          .replace(/^org-/, '')
          .replace(/[^a-zA-Z0-9]+/g, '.')
          .replace(/^\.+|\.+$/g, '')
          .toLowerCase();
        const username = `${slug}.director`;
        if (parsed.users.some((u: any) => u.username === username)) return;

        const dirUserId = `user-director-${branchId}`;
        const dirAssignmentId = `ura-${dirUserId}`;
        const funcCat = (branchOrg.functionalCategory as any) || 'Normal';
        parsed.users.push({
          id: dirUserId,
          username,
          passwordHash: '$2b$10$./4O5YT/QD9uTYcc46P4ceeeEY7RSq165PIVDe9XgsKcuDE.Xxm/i',
          fullName: `Director — ${branchOrg.name}`,
          email: `${username}@moe.gov.lk`,
          designation: `Director (${branchOrg.name})`,
          organizationId: branchId,
          roleId: 'role-director',
          isActive: true,
          createdAt: '2026-10-01T08:00:00.000Z',
          assignedRoles: [
            {
              id: dirAssignmentId,
              userId: dirUserId,
              roleId: 'role-director',
              roleName: 'Director',
              organizationId: branchId,
              organizationName: branchOrg.name,
              functionalCategory: funcCat,
              delegatedAuthority: 'Approval',
              description: DIRECTOR_ROLE.description,
              isDefault: true,
              isActive: true,
              assignedAt: '2026-10-01T08:00:00.000Z',
            },
          ],
          lastSelectedRoleId: dirAssignmentId,
        });
      }
    });

    memoryDb = parsed as DbSchema;
    return memoryDb;
  } catch (err) {
    console.error('Error reading JSON database file:', err);
    throw err;
  }
}

function writeJsonFile(data: DbSchema): void {
  memoryDb = data;
  try {
    ensureDataDir();
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    // Non-fatal if read-only filesystem
    console.warn('Could not write JSON database file:', err);
  }
}

// ── Core Async Database Methods (PostgreSQL + JSON Fallback) ──────────

export async function getDb(): Promise<DbSchema> {
  if (isPostgresConfigured()) {
    try {
      return await loadFullSchemaFromPostgres();
    } catch (err: any) {
      console.error('[Database] Failed to query PostgreSQL, falling back to JSON:', err?.message);
      return readJsonFile();
    }
  }
  return readJsonFile();
}

export async function updateDb(
  updater: (data: DbSchema) => void | Promise<void>
): Promise<DbSchema> {
  const isPg = isPostgresConfigured();

  if (isPg) {
    try {
      const current = await loadFullSchemaFromPostgres();
      // Clone previous collections for diffing
      const prevWorkshopIds = new Set(current.workshops.map((w) => w.id));
      const prevTraineeIds = new Set(current.trainees.map((t) => t.id));
      const prevRpIds = new Set(current.resourcePersons.map((r) => r.id));

      await updater(current);

      // 1. Sync Workshops
      const currentWorkshopIds = new Set(current.workshops.map((w) => w.id));
      for (const oldId of Array.from(prevWorkshopIds)) {
        if (!currentWorkshopIds.has(oldId)) {
          await query('DELETE FROM workshops WHERE id = $1', [oldId]);
        }
      }
      for (const w of current.workshops) {
        await pgInsertWorkshop(w);
      }

      // 2. Sync Trainees
      const currentTraineeIds = new Set(current.trainees.map((t) => t.id));
      for (const oldId of Array.from(prevTraineeIds)) {
        if (!currentTraineeIds.has(oldId)) {
          await query('DELETE FROM trainees WHERE id = $1', [oldId]);
        }
      }
      for (const t of current.trainees) {
        await pgInsertTrainee(t);
      }

      // 3. Sync Resource Persons
      const currentRpIds = new Set(current.resourcePersons.map((r) => r.id));
      for (const oldId of Array.from(prevRpIds)) {
        if (!currentRpIds.has(oldId)) {
          await query('DELETE FROM resource_persons WHERE id = $1', [oldId]);
        }
      }
      for (const rp of current.resourcePersons) {
        await pgInsertResourcePerson(rp);
      }

      // 4. Sync Reschedules
      for (const r of current.workshopReschedules || []) {
        await pgInsertReschedule(r);
      }

      // 5. Sync Notifications
      for (const n of current.notifications || []) {
        await pgInsertNotification(n);
      }

      // 6. Sync Metadata
      if (current.meta?.lastWorkshopNumber !== undefined) {
        await pgSetMeta('lastWorkshopNumber', String(current.meta.lastWorkshopNumber));
      }

      // 7. Sync AIP Plans & Activities
      for (const p of current.aipPlans || []) {
        try { await pgInsertAipPlan(p); } catch (e) {}
      }
      for (const a of current.aipActivities || []) {
        try { await pgInsertAipActivity(a); } catch (e) {}
      }

      // Also update JSON file as a local backup if writable
      writeJsonFile(current);

      return current;
    } catch (err: any) {
      console.error('[Database] Failed to persist updates to PostgreSQL, falling back to JSON:', err?.message);
    }
  }

  // Fallback to JSON file storage
  const data = readJsonFile();
  await updater(data);
  writeJsonFile(data);
  return data;
}

// ── Backward-Compatible db Object ─────────────────────────────────────

class DatabaseFacade {
  read(): DbSchema {
    return readJsonFile();
  }

  write(data: DbSchema): void {
    writeJsonFile(data);
  }

  update(updater: (data: DbSchema) => void): DbSchema {
    const data = this.read();
    updater(data);
    this.write(data);
    // If PostgreSQL is configured, schedule async persistence in background
    if (isPostgresConfigured()) {
      updateDb((d) => {
        updater(d);
      }).catch((e) => console.error('[DatabaseFacade] Background PG update error:', e));
    }
    return data;
  }

  invalidate(): void {}
}

const db = new DatabaseFacade();
export default db;
