/**
 * Planning Branch & Review Authority Hierarchy
 * Governs which Planning Branch reviews and approves Annual Implementation Plans (AIP)
 * for each operational branch in the Sri Lankan Ministry of Education & Department hierarchy.
 *
 * Rules:
 *  - MOE Branches (ICT, EQD, Curriculum, Admin, Infrastructure, etc.) -> MOE Planning Branch (PPB)
 *  - DOE Branches (Evaluation, Confidential, Systems, Admin, etc.) -> DOE Planning Branch
 *  - Provincial Branches -> Provincial Planning Branch
 *  - Zonal Branches -> Zonal Planning Branch
 */

export interface PlanningReviewAuthority {
  planningOrgId: string;
  planningOrgName: string;
  planningAuthorityLabel: string;
  departmentCode: 'MOE' | 'DOE' | 'PROV' | 'ZONE' | 'OTHER';
  departmentName: string;
  submissionInstructions: string;
}

export interface MonitoringDestination {
  monitoringOrgId: string;
  monitoringOrgName: string;
  monitoringAuthorityLabel: string;
  description: string;
}

/**
 * Determine the relevant Monitoring & Evaluation Branch where monthly progress reports are sent.
 */
export function getRelevantMonitoringBranch(branchId: string): MonitoringDestination {
  const cleanId = (branchId || '').trim().toLowerCase();
  if (cleanId.startsWith('org-doe')) {
    return {
      monitoringOrgId: 'org-doe-planning',
      monitoringOrgName: 'Department of Examinations Planning & Monitoring Division',
      monitoringAuthorityLabel: 'Department of Examinations Monitoring & Evaluation Unit',
      description: 'Official monthly progress return submitted to DoE Examination Quality & Performance Monitoring Division.',
    };
  }

  // Default: MOE Central Monitoring & Performance Branch (Headquarters)
  return {
    monitoringOrgId: 'org-moe-monitoring',
    monitoringOrgName: 'MOE Monitoring & Performance Branch',
    monitoringAuthorityLabel: 'Ministry of Education Monitoring & Evaluation Branch',
    description: 'Official monthly progress return submitted to Ministry Monitoring & Performance Branch (MPB) for tracking and independent verification.',
  };
}

export interface BranchOption {
  id: string;
  name: string;
  code?: string;
  departmentCode: string;
  departmentName: string;
  level?: number;
}

/**
 * Determine the relevant Planning Branch for any operational branch ID.
 */
export function getRelevantPlanningBranch(
  branchId: string,
  organizations: Array<{ id: string; name?: string; parentId?: string | null; typeId?: string }> = []
): PlanningReviewAuthority {
  const cleanId = (branchId || '').trim().toLowerCase();

  // 1. Department of Examinations (DoE)
  if (cleanId.startsWith('org-doe') || isChildOf(cleanId, 'org-doe', organizations)) {
    return {
      planningOrgId: 'org-doe-planning',
      planningOrgName: 'Department of Examinations Planning & Research Branch',
      planningAuthorityLabel: 'Department of Examinations Planning Branch',
      departmentCode: 'DOE',
      departmentName: 'Department of Examinations (DoE)',
      submissionInstructions:
        'Your Annual Implementation Plan (AIP) will be officially submitted to the Department of Examinations Planning Branch for institutional evaluation and review.',
    };
  }

  // 2. Provincial Education Department Branches
  const provMatch = cleanId.match(/^org-prov-([a-z]+)/);
  if (provMatch && !cleanId.endsWith('-plan')) {
    const provCode = provMatch[1];
    const provOrg = organizations.find((o) => o.id === `org-prov-${provCode}` || o.id === `org-prov-${provCode}-plan`);
    const provName = provOrg?.name?.replace(/Planning Branch/i, '').trim() || provCode.toUpperCase();
    return {
      planningOrgId: `org-prov-${provCode}-plan`,
      planningOrgName: `${provName} Provincial Planning Branch`,
      planningAuthorityLabel: `${provName} Provincial Planning Branch`,
      departmentCode: 'PROV',
      departmentName: `${provName} Provincial Education Department`,
      submissionInstructions: `Your AIP will be submitted to the ${provName} Provincial Planning Branch for provincial review and sanction.`,
    };
  }

  // 3. Zonal Education Branches
  const zoneMatch = cleanId.match(/^org-zone-([a-z0-9]+)/);
  if (zoneMatch && !cleanId.endsWith('-plan')) {
    const zoneCode = zoneMatch[1];
    return {
      planningOrgId: `org-zone-${zoneCode}-plan`,
      planningOrgName: `Zonal Planning Branch (${zoneCode.toUpperCase()})`,
      planningAuthorityLabel: `Zonal Planning Branch (${zoneCode.toUpperCase()})`,
      departmentCode: 'ZONE',
      departmentName: 'Zonal Education Office',
      submissionInstructions: `Your AIP will be submitted to your Zonal Planning Branch for zonal appraisal.`,
    };
  }

  // 4. Default: Ministry of Education (MOE) Central Ministry Branches
  return {
    planningOrgId: 'org-moe-planning',
    planningOrgName: 'Policy, Planning & Performance Review Division (PPB)',
    planningAuthorityLabel: 'Ministry of Education Planning Branch (PPB)',
    departmentCode: 'MOE',
    departmentName: 'Ministry of Education (Headquarters)',
    submissionInstructions:
      'Your Annual Implementation Plan (AIP) will be officially submitted to the Ministry of Education Planning Branch (PPB) for appraisal and approval.',
  };
}

/**
 * Helper to check parent ancestry
 */
function isChildOf(
  childId: string,
  ancestorId: string,
  organizations: Array<{ id: string; parentId?: string | null }>
): boolean {
  let curr = organizations.find((o) => o.id === childId);
  let depth = 0;
  while (curr && curr.parentId && depth < 10) {
    if (curr.parentId === ancestorId) return true;
    curr = organizations.find((o) => o.id === curr?.parentId);
    depth++;
  }
  return false;
}

/**
 * Check if a logged-in user has permission to review / approve / dispatch plans for targetBranchId
 */
export function canUserReviewPlan(
  user: any,
  targetBranchId: string,
  organizations: Array<{ id: string; parentId?: string | null }> = []
): boolean {
  if (!user) return false;

  // Super Admin & Level 0 / 1 National Admins have universal authority
  if (
    user.isSuperAdmin ||
    user.adminLevel === 0 ||
    user.adminLevel === 1 ||
    user.roleId === 'role-superadmin' ||
    user.roleId === 'role-admin'
  ) {
    return true;
  }

  // MOE Planning Division Officer
  const isMoePlanning =
    user.username === 'planning.officer' ||
    (user.organizationId === 'org-moe-planning' && user.functionalCategory === 'Planning') ||
    (user.organizationId === 'org-moe-planning' && user.roleId === 'role-planning-officer');

  if (isMoePlanning) {
    // MOE Planning reviews MOE branches (anything not DOE-scoped)
    return !targetBranchId.startsWith('org-doe');
  }

  // DOE Planning Division Officer
  const isDoePlanning =
    user.username === 'doe.planning' ||
    (user.organizationId === 'org-doe-planning' && (user.functionalCategory === 'Planning' || user.roleId === 'role-planning-officer')) ||
    (user.adminLevel === 2 && user.organizationId === 'org-doe-planning');

  if (isDoePlanning) {
    // DOE Planning reviews DOE branches
    return targetBranchId.startsWith('org-doe') || isChildOf(targetBranchId, 'org-doe', organizations);
  }

  return false;
}

/**
 * Filter branch options for dropdown selectors based on user department scope
 */
export function getScopedBranchOptions(
  user: any,
  organizations: Array<{ id: string; name: string; code?: string; typeId?: string; parentId?: string | null; functionalCategory?: string }>
): BranchOption[] {
  const isDoeUser =
    user?.organizationId?.startsWith('org-doe') ||
    user?.username === 'doe.planning' ||
    user?.username?.startsWith('doe.');

  const isSuperAdmin =
    user?.isSuperAdmin ||
    user?.adminLevel === 0 ||
    user?.roleId === 'role-superadmin';

  if (isDoeUser && !isSuperAdmin) {
    // Return all DOE branches
    return organizations
      .filter((o) => o.id.startsWith('org-doe') && o.id !== 'org-doe')
      .map((o) => ({
        id: o.id,
        name: o.name,
        code: o.code || 'DOE',
        departmentCode: 'DOE',
        departmentName: 'Department of Examinations',
      }));
  }

  if (!isSuperAdmin) {
    // MOE user: return MOE branches
    return organizations
      .filter((o) => (o.typeId === 'ot-moe' || o.id.startsWith('org-moe-')) && o.id !== 'org-moe')
      .map((o) => ({
        id: o.id,
        name: o.name,
        code: o.code || 'MOE',
        departmentCode: 'MOE',
        departmentName: 'Ministry of Education',
      }));
  }

  // Super Admin: return both MOE and DOE branches
  return organizations
    .filter(
      (o) =>
        ((o.typeId === 'ot-moe' || o.id.startsWith('org-moe-')) && o.id !== 'org-moe') ||
        (o.id.startsWith('org-doe-') && o.id !== 'org-doe')
    )
    .map((o) => ({
      id: o.id,
      name: o.name,
      code: o.code,
      departmentCode: o.id.startsWith('org-doe') ? 'DOE' : 'MOE',
      departmentName: o.id.startsWith('org-doe') ? 'Department of Examinations' : 'Ministry of Education',
    }));
}
