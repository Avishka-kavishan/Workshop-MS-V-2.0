import db, { Organization, Workshop } from '@/lib/db';

/**
 * Get all available places (Zonal IT Branches, Zonal offices, Institutes)
 * where workshops can be held.
 */
export function getAvailablePlaces(): Organization[] {
  const data = db.read();
  return data.organizations.filter((o) => o.isActive && o.id !== 'org-moe');
}

/**
 * Check which target organizations a user is allowed to select when planning a workshop.
 */
export function getPermittedTargetOrganizations(
  userId: string,
  userOrgId: string,
  roleName: string,
  organizations?: Organization[]
): Organization[] {
  const orgList = organizations || db.read().organizations;
  const allOrgs = orgList.filter((o) => o.isActive && o.id !== 'org-moe');
  return allOrgs;
}

/**
 * Check if user can view a workshop.
 *
 * Visibility rules:
 *  - Admin: sees ALL workshops
 *  - Creator: always sees their own workshop
 *  - Organizing branch member: sees workshops their org scheduled
 *  - Place/host branch member: sees workshops assigned to their branch as the venue
 *  - Parent org member (e.g. Zone level): sees workshops at their child branches
 */
export function canUserViewWorkshop(
  user: { id: string; organizationId: string; roleName: string; organizationName?: string; username?: string },
  workshop: Workshop,
  allowAdminAll = false,
  organizations?: Organization[]
): boolean {
  if (!user) return false;

  // System Administrator sees all workshops
  if (
    allowAdminAll ||
    user.roleName === 'System Administrator' ||
    user.roleName?.toLowerCase().includes('admin') ||
    user.username === 'admin'
  ) {
    return true;
  }

  // 1. Creator always sees their own workshop
  if (workshop.createdBy === user.id) {
    return true;
  }

  // Special EQD Division Supervisory Scope:
  // Director (EQD) can view workshops across all branches in the Education Quality Development Division
  if (user.username === 'eqd.officer') {
    const orgList = organizations || db.read().organizations;
    const eqdOrgIds = new Set(
      orgList
        .filter((o) => o.id === 'org-moe-div-eqd' || o.parentId === 'org-moe-div-eqd' || o.id === 'org-moe-eqd')
        .map((o) => o.id)
    );
    [
      'org-moe-div-eqd', 'org-moe-eqd', 'org-moe-eqd-dev', 'org-moe-lang-humanities',
      'org-moe-science', 'org-moe-maths', 'org-moe-english', 'org-moe-commerce',
      'org-moe-aesthetics', 'org-moe-religion', 'org-moe-bilingual', 'org-moe-qa',
      'org-moe-agri', 'org-moe-tech'
    ].forEach((id) => eqdOrgIds.add(id));

    if (
      (workshop.organizingOrgId && eqdOrgIds.has(workshop.organizingOrgId)) ||
      (workshop.placeId && eqdOrgIds.has(workshop.placeId)) ||
      (workshop.targetOrgId && eqdOrgIds.has(workshop.targetOrgId))
    ) {
      return true;
    }
  }

  // 2. Organizing branch — the branch that scheduled the workshop
  if (
    workshop.organizingOrgId === user.organizationId ||
    (workshop.branch && user.organizationName && workshop.branch.toLowerCase().includes(user.organizationName.toLowerCase())) ||
    (workshop.branch && user.organizationName && user.organizationName.toLowerCase().includes(workshop.branch.toLowerCase()))
  ) {
    return true;
  }

  // 3. Place / Host branch — the branch assigned to hold the workshop (e.g. Galle Zone IT Branch)
  if (
    workshop.placeId === user.organizationId ||
    workshop.targetOrgId === user.organizationId ||
    (workshop.placeName && user.organizationName && workshop.placeName.toLowerCase().includes(user.organizationName.toLowerCase())) ||
    (workshop.placeName && user.organizationName && user.organizationName.toLowerCase().includes(workshop.placeName.toLowerCase()))
  ) {
    return true;
  }

  // 4. Parent org check — e.g. if user is at Zone level and workshop is at a sub-branch of that zone
  const orgList = organizations || db.read().organizations;
  const placeOrg = orgList.find(
    (o) => o.id === (workshop.placeId || workshop.targetOrgId)
  );
  if (placeOrg?.parentId && placeOrg.parentId === user.organizationId) {
    return true;
  }

  return false;
}

/**
 * Check if user can add trainees / resource persons to a workshop.
 * Both the Organizing Branch and the Place (e.g. Galle Zone IT Branch) can manage.
 */
export function canUserManageParticipants(
  user: { id?: string; organizationId?: string; roleName?: string; organizationName?: string; username?: string },
  workshop: Workshop
): boolean {
  if (!user || !workshop) return false;

  if (
    user.roleName === 'System Administrator' ||
    user.roleName?.toLowerCase().includes('admin') ||
    user.username === 'admin'
  ) {
    return true;
  }

  // Creator can manage
  if (workshop.createdBy && workshop.createdBy === user.id) return true;

  // Special EQD Division Supervisory Scope: can manage participants & resource persons for division workshops
  if (user.username === 'eqd.officer') {
    const orgList = db.read().organizations;
    const eqdOrgIds = new Set(
      orgList
        .filter((o) => o.id === 'org-moe-div-eqd' || o.parentId === 'org-moe-div-eqd' || o.id === 'org-moe-eqd')
        .map((o) => o.id)
    );
    [
      'org-moe-div-eqd', 'org-moe-eqd', 'org-moe-eqd-dev', 'org-moe-lang-humanities',
      'org-moe-science', 'org-moe-maths', 'org-moe-english', 'org-moe-commerce',
      'org-moe-aesthetics', 'org-moe-religion', 'org-moe-bilingual', 'org-moe-qa',
      'org-moe-agri', 'org-moe-tech'
    ].forEach((id) => eqdOrgIds.add(id));

    if (
      (workshop.organizingOrgId && eqdOrgIds.has(workshop.organizingOrgId)) ||
      (workshop.placeId && eqdOrgIds.has(workshop.placeId)) ||
      (workshop.targetOrgId && eqdOrgIds.has(workshop.targetOrgId))
    ) {
      return true;
    }
  }

  // Organizing branch can manage
  if (
    (workshop.organizingOrgId && user.organizationId && workshop.organizingOrgId === user.organizationId) ||
    (workshop.branch && user.organizationName && workshop.branch.toLowerCase().includes(user.organizationName.toLowerCase())) ||
    (workshop.branch && user.organizationName && user.organizationName.toLowerCase().includes(workshop.branch.toLowerCase()))
  ) {
    return true;
  }

  // The Place / Host branch can manage (e.g. Galle Zone IT Branch)
  if (
    (workshop.placeId && user.organizationId && workshop.placeId === user.organizationId) ||
    (workshop.targetOrgId && user.organizationId && workshop.targetOrgId === user.organizationId) ||
    (workshop.placeName && user.organizationName && workshop.placeName.toLowerCase().includes(user.organizationName.toLowerCase())) ||
    (workshop.placeName && user.organizationName && user.organizationName.toLowerCase().includes(workshop.placeName.toLowerCase()))
  ) {
    return true;
  }

  return false;
}

/**
 * Check if a user can reschedule a workshop.
 */
export function canUserRescheduleWorkshop(
  user: { id?: string; organizationId?: string; roleName?: string; organizationName?: string; username?: string } | null | undefined,
  workshop: Workshop | null | undefined,
  organizations?: Organization[]
): boolean {
  if (!user || !workshop) return false;

  // 1. System Administrator
  if (
    user.roleName === 'System Administrator' ||
    user.roleName?.toLowerCase().includes('admin') ||
    user.username === 'admin'
  ) {
    return true;
  }

  // 2. Creator can always reschedule
  if (workshop.createdBy && workshop.createdBy === user.id) {
    return true;
  }

  // 3. Organizing Branch: can reschedule any workshop organized by their branch
  if (
    (workshop.organizingOrgId && user.organizationId && workshop.organizingOrgId === user.organizationId) ||
    (workshop.branch && user.organizationName && workshop.branch.toLowerCase().includes(user.organizationName.toLowerCase())) ||
    (workshop.branch && user.organizationName && user.organizationName.toLowerCase().includes(workshop.branch.toLowerCase()))
  ) {
    return true;
  }

  // 4. Host Branch / Place: can reschedule any workshop hosted at their branch
  if (
    (workshop.placeId && user.organizationId && workshop.placeId === user.organizationId) ||
    (workshop.targetOrgId && user.organizationId && workshop.targetOrgId === user.organizationId) ||
    (workshop.placeName && user.organizationName && workshop.placeName.toLowerCase().includes(user.organizationName.toLowerCase())) ||
    (workshop.placeName && user.organizationName && user.organizationName.toLowerCase().includes(workshop.placeName.toLowerCase()))
  ) {
    return true;
  }

  // 5. Parent org check
  try {
    const orgList = organizations || db.read().organizations;
    const placeOrg = orgList.find(
      (o) => o.id === (workshop.placeId || workshop.targetOrgId)
    );
    if (placeOrg?.parentId && placeOrg.parentId === user.organizationId) {
      return true;
    }
  } catch (e) {
    // Ignore
  }

  return false;
}

// ══════════════════════════════════════════════════════════════════════
// FRS PART A – 4-DIMENSIONAL ACCESS CONTROL & PERMISSION ENGINE
// Dimensions: 1. Level, 2. Institution, 3. Division Type, 4. Role/Delegation
// ══════════════════════════════════════════════════════════════════════

export type FunctionalDivisionCategory = 'Normal' | 'Planning' | 'Monitoring';

export interface UserSecurityContext {
  userId: string;
  username: string;
  fullName: string;
  roleId: string;
  roleName: string;
  organizationId: string;
  organizationName: string;
  administrativeLevel: number; // 1: Ministry, 2: Province, 3: Zone, 4: School/Center
  functionalCategory: FunctionalDivisionCategory;
  delegatedAuthority: 'Standard' | 'Review' | 'Approval' | 'Verification';
  isSuperAdmin: boolean;
  adminLevel?: number; // 0: SuperAdmin, 1: MoE, 2: Apex, 3: Prov, 4: Zone, 5: Div
  isLevelAdmin: boolean;
  isPlanningDivision: boolean;
  isMonitoringDivision: boolean;
  isNormalDivision: boolean;
  permissions: {
    canView: boolean;
    canCreate: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canSubmit: boolean;
    canReview: boolean;
    canRecommend: boolean;
    canApprove: boolean;
    canVerify: boolean;
    canMonitor: boolean;
    canReallocate: boolean;
    canRevise: boolean;
    canExport: boolean;
  };
}

/**
 * Derives the complete 4-Dimensional security context for an authenticated user.
 */
export function getUserSecurityContext(
  user: any,
  organizations?: Organization[]
): UserSecurityContext {
  const orgList = organizations || (typeof db.read === 'function' ? db.read().organizations : []);
  const org = orgList.find((o) => o.id === user?.organizationId);

  // Administrative Level: 1 = Ministry, 2 = National Apex (NIE/EPD/DoE), 3 = Province, 4 = Zone, 5 = Division, 6 = School
  let level = 1;
  if (org) {
    if (org.typeId === 'ot-moe' || org.id === 'org-moe' || (org.id.startsWith('org-moe-') && !['org-nie', 'org-epd', 'org-doe'].includes(org.id))) {
      level = 1;
    } else if (
      org.typeId === 'ot-national-apex' ||
      org.typeId === 'ot-nie' ||
      org.typeId === 'ot-epd' ||
      org.typeId === 'ot-doe' ||
      org.id === 'org-nie' ||
      org.id === 'org-epd' ||
      org.id === 'org-doe'
    ) {
      level = 2;
    } else if (org.typeId === 'ot-province' || org.id.startsWith('org-prov-')) {
      level = 3;
    } else if (org.typeId === 'ot-zone' || org.id.startsWith('org-zone-')) {
      level = 4;
    } else if (org.typeId === 'ot-division' || org.typeId === 'ot-branch' || org.id.startsWith('org-div-')) {
      level = 5;
    } else {
      level = 6;
    }
  }

  // Differentiate Normal Branch Accounts from Special Accounts
  const isNormalAccount = ['planning', 'monitoring', 'data.management', 'data', 'eqd'].includes(user?.username);
  const orgNameLower = (org?.name || user?.organizationName || '').toLowerCase();
  const orgIdLower = (user?.organizationId || '').toLowerCase();
  const roleNameLower = (user?.roleName || '').toLowerCase();
  const isPlaceCoordinator = user?.roleId === 'role-place-coordinator' || roleNameLower.includes('coordinator') || roleNameLower.includes('place');

  // Functional category: Planning, Monitoring, or Normal
  let functionalCategory: FunctionalDivisionCategory = 'Normal';

  if (isNormalAccount || user?.functionalCategory === 'Normal') {
    functionalCategory = 'Normal';
  } else if (user?.functionalCategory) {
    functionalCategory = user.functionalCategory;
  } else if (
    user?.username === 'planning.officer' ||
    roleNameLower.includes('planning') ||
    org?.functionalCategory === 'Planning' ||
    orgIdLower.includes('plan') ||
    orgNameLower.includes('planning')
  ) {
    functionalCategory = 'Planning';
  } else if (
    user?.username === 'monitoring.officer' ||
    roleNameLower.includes('monitoring') ||
    org?.functionalCategory === 'Monitoring' ||
    orgIdLower.includes('monitor') ||
    orgNameLower.includes('monitoring') ||
    orgNameLower.includes('quality assurance')
  ) {
    functionalCategory = 'Monitoring';
  } else {
    functionalCategory = org?.functionalCategory || 'Normal';
  }

  let adminLevel: number | undefined = undefined;
  if (user?.adminLevel !== undefined && user?.adminLevel !== null) {
    adminLevel = Number(user.adminLevel);
  } else if (user?.username === 'superadmin' || user?.roleName === 'Super Administrator') {
    adminLevel = 0;
  } else if (
    !isNormalAccount &&
    (user?.username === 'moe' || user?.username === 'moe.admin' || user?.roleName?.includes('Level 1 Admin') || user?.username === 'admin' || user?.username === 'data.officer' || user?.roleName === 'System Administrator')
  ) {
    adminLevel = 1;
  } else if (user?.username === 'nie.admin' || user?.username === 'nie' || user?.roleName?.includes('Level 2 Admin')) {
    adminLevel = 2;
  } else if (user?.username === 'ped.sp' || user?.username === 'provincial.admin' || user?.username === 'sp.admin' || user?.roleName?.includes('Level 3 Admin')) {
    adminLevel = 3;
  } else if (user?.username === 'zeo.galle' || user?.username === 'zonal.admin' || user?.username === 'galle.admin' || user?.roleName?.includes('Level 4 Admin')) {
    adminLevel = 4;
  } else if (user?.username === 'deo.galle' || user?.username === 'divisional.admin' || user?.roleName?.includes('Level 5 Admin')) {
    adminLevel = 5;
  }
  const isLevelAdmin = adminLevel !== undefined;
  const isSuperAdmin = adminLevel === 0;

  // National-level specialized division authorities (Level 1 MoE scope)
  const isNationalPlanningOfficer = !isNormalAccount && (user?.username === 'planning.officer' || (functionalCategory === 'Planning' && (level === 1 || user?.organizationId === 'org-moe-planning')));
  const isNationalMonitoringOfficer = !isNormalAccount && (user?.username === 'monitoring.officer' || (functionalCategory === 'Monitoring' && (level === 1 || user?.organizationId === 'org-moe-monitoring')));

  const isPlanningDivision = isSuperAdmin || isNationalPlanningOfficer || (!isNormalAccount && isLevelAdmin && adminLevel === 1 && user?.organizationId === 'org-moe-planning');
  const isMonitoringDivision = isSuperAdmin || isNationalMonitoringOfficer;
  const isNormalDivision = functionalCategory === 'Normal' && !isSuperAdmin && !isLevelAdmin;
  const isAdditionalSecretary =
    user?.roleId === 'role-additional-secretary' ||
    user?.roleName === 'Additional Secretary' ||
    user?.roleName?.includes('Additional Secretary') ||
    user?.designation?.toLowerCase().includes('additional secretary');

  return {
    userId: user?.id || '',
    username: user?.username || '',
    fullName: user?.name || user?.fullName || 'User',
    roleId: user?.roleId || '',
    roleName: user?.roleName || '',
    organizationId: user?.organizationId || '',
    organizationName: org?.name || user?.organizationName || 'Education Division',
    administrativeLevel: level,
    functionalCategory,
    delegatedAuthority: isSuperAdmin || adminLevel === 1 || isAdditionalSecretary ? 'Approval' : isNationalPlanningOfficer ? 'Review' : isNationalMonitoringOfficer ? 'Verification' : 'Standard',
    isSuperAdmin,
    adminLevel,
    isLevelAdmin,
    isPlanningDivision,
    isMonitoringDivision,
    isNormalDivision,
    permissions: {
      canView: true,
      canCreate: isSuperAdmin || (adminLevel !== undefined && adminLevel <= 3) || isNationalPlanningOfficer || (isNormalDivision && !isPlaceCoordinator) || isAdditionalSecretary,
      canEdit: isSuperAdmin || (adminLevel !== undefined && adminLevel <= 3) || isNationalPlanningOfficer || (isNormalDivision && !isPlaceCoordinator) || isAdditionalSecretary,
      canDelete: isSuperAdmin || (adminLevel === 1),
      canSubmit: !isPlaceCoordinator,
      canReview: isSuperAdmin || (level === 1 && (isNationalPlanningOfficer || isNationalMonitoringOfficer || adminLevel === 1)) || isAdditionalSecretary,
      canRecommend: isSuperAdmin || (level <= 3 && (isNationalPlanningOfficer || isNationalMonitoringOfficer || (adminLevel !== undefined && adminLevel <= 3))) || isAdditionalSecretary,
      canApprove: isSuperAdmin || (adminLevel === 1) || (level === 1 && isNationalPlanningOfficer) || isAdditionalSecretary,
      canVerify: isSuperAdmin || isNationalMonitoringOfficer,
      canMonitor: isSuperAdmin || isNationalMonitoringOfficer || isAdditionalSecretary,
      canReallocate: isSuperAdmin || (level === 1 && (adminLevel === 1 || isNationalPlanningOfficer)),
      canRevise: isSuperAdmin || (level === 1 && (adminLevel === 1 || isNationalPlanningOfficer)),
      canExport: true,
    },
  };
}

/**
 * Checks whether an administrator can manage (add, update, delete) a branch/unit
 * based on hierarchical administrative level delegation.
 */
export function canUserManageBranch(
  user: any,
  targetLevel: number,
  targetOrgId?: string,
  targetParentId?: string | null,
  organizations: Organization[] = []
): boolean {
  if (!user) return false;
  if (user.isSuperAdmin || user.username === 'superadmin' || user.roleName === 'Super Administrator' || user.adminLevel === 0) {
    return true;
  }

  const adminLevel = user.adminLevel !== undefined ? user.adminLevel : (
    user.username === 'moe' || user.username === 'moe.admin' || user.roleName?.includes('Level 1 Admin') ? 1 :
    user.username === 'nie.admin' || user.username === 'nie' || user.roleName?.includes('Level 2 Admin') ? 2 :
    user.username === 'ped.sp' || user.username === 'provincial.admin' || user.roleName?.includes('Level 3 Admin') ? 3 :
    user.username === 'zeo.galle' || user.username === 'zonal.admin' || user.roleName?.includes('Level 4 Admin') ? 4 :
    user.username === 'deo.galle' || user.username === 'divisional.admin' || user.roleName?.includes('Level 5 Admin') ? 5 : null
  );

  if (adminLevel === null) return false;

  // Level 1 Admin can manage Level 1 MoE branches & units
  if (adminLevel === 1) {
    return targetLevel === 1 || targetParentId === 'org-moe' || !targetParentId || targetParentId.startsWith('org-moe');
  }

  // Level 2 Admin can manage Level 2 Apex units under NIE, EPD, DoE
  if (adminLevel === 2) {
    const userOrgId = user.organizationId || 'org-nie';
    return targetLevel === 2 && (targetOrgId === userOrgId || targetParentId === userOrgId);
  }

  // Level 3 Admin can manage their Province (L3) and child Zones (L4), Divisions (L5), Schools (L6)
  if (adminLevel === 3) {
    if (targetLevel < 3) return false;
    const userOrgId = user.organizationId;
    if (!userOrgId) return false;
    if (targetOrgId === userOrgId || targetParentId === userOrgId) return true;
    const parent = organizations.find((o) => o.id === targetParentId);
    if (parent?.parentId === userOrgId) return true;
    const grandParent = parent ? organizations.find((o) => o.id === parent.parentId) : null;
    if (grandParent?.parentId === userOrgId) return true;
    return false;
  }

  // Level 4 Admin can manage their Zone (L4) and child Divisions (L5), Schools (L6)
  if (adminLevel === 4) {
    if (targetLevel < 4) return false;
    const userOrgId = user.organizationId;
    if (!userOrgId) return false;
    if (targetOrgId === userOrgId || targetParentId === userOrgId) return true;
    const parent = organizations.find((o) => o.id === targetParentId);
    if (parent?.parentId === userOrgId) return true;
    return false;
  }

  // Level 5 Admin can manage their Division (L5) and child Schools (L6)
  if (adminLevel === 5) {
    if (targetLevel < 5) return false;
    const userOrgId = user.organizationId;
    if (!userOrgId) return false;
    return targetOrgId === userOrgId || targetParentId === userOrgId;
  }

  return false;
}

/**
 * Checks institutional data visibility boundary (FRS Section 2.1)
 */
export function canUserAccessInstitution(
  securityContext: UserSecurityContext,
  targetInstitutionId: string,
  organizations: Organization[]
): boolean {
  if (securityContext.isSuperAdmin) return true;
  if (securityContext.organizationId === targetInstitutionId) return true;

  // Level 1: Ministry level -> National scope
  if (securityContext.administrativeLevel === 1) return true;

  // Level 2: National Apex (NIE / EPD / DoE) -> Autonomous institution scope (no provincial cascade)
  if (securityContext.administrativeLevel === 2) {
    const target = organizations.find((o) => o.id === targetInstitutionId);
    if (!target) return false;
    return target.parentId === securityContext.organizationId || target.id === securityContext.organizationId;
  }

  // Level 3: Provincial level -> Can view child zones (Level 4), divisions (Level 5), and schools (Level 6) in the same province
  if (securityContext.administrativeLevel === 3) {
    const target = organizations.find((o) => o.id === targetInstitutionId);
    if (!target) return false;
    if (target.parentId === securityContext.organizationId) return true;
    const parent = organizations.find((o) => o.id === target.parentId);
    if (parent && parent.parentId === securityContext.organizationId) return true;
    const grandParent = parent ? organizations.find((o) => o.id === parent.parentId) : null;
    if (grandParent && grandParent.parentId === securityContext.organizationId) return true;
  }

  // Level 4: Zonal level -> Can view child divisions (Level 5) and schools (Level 6) in the same zone
  if (securityContext.administrativeLevel === 4) {
    const target = organizations.find((o) => o.id === targetInstitutionId);
    if (!target) return false;
    if (target.parentId === securityContext.organizationId) return true;
    const parent = organizations.find((o) => o.id === target.parentId);
    if (parent && parent.parentId === securityContext.organizationId) return true;
  }

  // Level 5: Divisional level -> Can view child schools (Level 6) in the same division
  if (securityContext.administrativeLevel === 5) {
    const target = organizations.find((o) => o.id === targetInstitutionId);
    if (!target) return false;
    if (target.parentId === securityContext.organizationId) return true;
  }

  return false;
}
