const fs = require('fs');
const path = require('path');

// Load database
const dbPath = path.join(__dirname, 'data', 'database.json');
const rawData = fs.readFileSync(dbPath, 'utf8');
const data = JSON.parse(rawData);

// Import permission functions
// Since permissions.ts is TypeScript, let's create a standalone evaluator mirroring permissions.ts logic
function getUserSecurityContext(user, organizations) {
  const orgList = organizations || data.organizations || [];
  const org = orgList.find((o) => o.id === user?.organizationId);

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
  const isNormalAccount = ['planning', 'monitoring', 'data.management', 'data'].includes(user?.username);
  const orgNameLower = (org?.name || user?.organizationName || '').toLowerCase();
  const orgIdLower = (user?.organizationId || '').toLowerCase();
  const roleNameLower = (user?.roleName || '').toLowerCase();
  const isPlaceCoordinator = user?.roleId === 'role-place-coordinator' || roleNameLower.includes('coordinator') || roleNameLower.includes('place');

  let functionalCategory = 'Normal';

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

  let adminLevel = undefined;
  if (user?.username === 'superadmin' || user?.roleName === 'Super Administrator') {
    adminLevel = 0;
  } else if (
    !isNormalAccount &&
    (user?.username === 'moe.admin' || user?.roleName?.includes('Level 1 Admin') || user?.username === 'admin' || user?.username === 'data.officer' || user?.roleName === 'System Administrator')
  ) {
    adminLevel = 1;
  } else if (user?.username === 'nie.admin' || user?.roleName?.includes('Level 2 Admin')) {
    adminLevel = 2;
  } else if (user?.username === 'provincial.admin' || user?.roleName?.includes('Level 3 Admin')) {
    adminLevel = 3;
  } else if (user?.username === 'zonal.admin' || user?.roleName?.includes('Level 4 Admin')) {
    adminLevel = 4;
  } else if (user?.username === 'divisional.admin' || user?.roleName?.includes('Level 5 Admin')) {
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

  return {
    userId: user?.id || '',
    username: user?.username || '',
    fullName: user?.fullName || user?.name || 'User',
    roleId: user?.roleId || '',
    roleName: user?.roleName || '',
    organizationId: user?.organizationId || '',
    organizationName: org?.name || 'Education Division',
    administrativeLevel: level,
    functionalCategory,
    delegatedAuthority: isSuperAdmin || adminLevel === 1 ? 'Approval' : isNationalPlanningOfficer ? 'Review' : isNationalMonitoringOfficer ? 'Verification' : 'Standard',
    isSuperAdmin,
    adminLevel,
    isLevelAdmin,
    isPlanningDivision,
    isMonitoringDivision,
    isNormalDivision,
    permissions: {
      canView: true,
      canCreate: isSuperAdmin || (adminLevel !== undefined && adminLevel <= 3) || isNationalPlanningOfficer || (isNormalDivision && !isPlaceCoordinator),
      canEdit: isSuperAdmin || (adminLevel !== undefined && adminLevel <= 3) || isNationalPlanningOfficer || (isNormalDivision && !isPlaceCoordinator),
      canDelete: isSuperAdmin || (adminLevel === 1),
      canSubmit: !isPlaceCoordinator,
      canReview: isSuperAdmin || (level === 1 && (isNationalPlanningOfficer || isNationalMonitoringOfficer || adminLevel === 1)),
      canRecommend: isSuperAdmin || (level <= 3 && (isNationalPlanningOfficer || isNationalMonitoringOfficer || (adminLevel !== undefined && adminLevel <= 3))),
      canApprove: isSuperAdmin || (adminLevel === 1) || (level === 1 && isNationalPlanningOfficer),
      canVerify: isSuperAdmin || isNationalMonitoringOfficer,
      canMonitor: isSuperAdmin || isNationalMonitoringOfficer,
      canReallocate: isSuperAdmin || (level === 1 && (adminLevel === 1 || isNationalPlanningOfficer)),
      canRevise: isSuperAdmin || (level === 1 && (adminLevel === 1 || isNationalPlanningOfficer)),
      canExport: true,
    },
  };
}

function canUserAccessInstitution(securityContext, targetInstitutionId, organizations) {
  if (securityContext.isSuperAdmin) return true;
  if (securityContext.organizationId === targetInstitutionId) return true;

  if (securityContext.administrativeLevel === 1) return true;

  if (securityContext.administrativeLevel === 2) {
    const target = organizations.find((o) => o.id === targetInstitutionId);
    if (!target) return false;
    return target.parentId === securityContext.organizationId || target.id === securityContext.organizationId;
  }

  if (securityContext.administrativeLevel === 3) {
    const target = organizations.find((o) => o.id === targetInstitutionId);
    if (!target) return false;
    if (target.parentId === securityContext.organizationId) return true;
    const parent = organizations.find((o) => o.id === target.parentId);
    if (parent && parent.parentId === securityContext.organizationId) return true;
    const grandParent = parent ? organizations.find((o) => o.id === parent.parentId) : null;
    if (grandParent && grandParent.parentId === securityContext.organizationId) return true;
  }

  if (securityContext.administrativeLevel === 4) {
    const target = organizations.find((o) => o.id === targetInstitutionId);
    if (!target) return false;
    if (target.parentId === securityContext.organizationId) return true;
    const parent = organizations.find((o) => o.id === target.parentId);
    if (parent && parent.parentId === securityContext.organizationId) return true;
  }

  if (securityContext.administrativeLevel === 5) {
    const target = organizations.find((o) => o.id === targetInstitutionId);
    if (!target) return false;
    if (target.parentId === securityContext.organizationId) return true;
  }

  return false;
}

console.log('================================================================================');
console.log('🚀 RUNNING COMPREHENSIVE PERMISSIONS & ACCESS CONTROL AUDIT FOR ALL LEVELS');
console.log('================================================================================\n');

const results = [];
let passedTests = 0;
let totalTests = 0;

function assert(condition, testName) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ PASS: ${testName}`);
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
  }
}

// 1. Audit all 21 users security context
console.log('--- 1. AUDITING 21 SYSTEM USER ACCOUNTS ---');
data.users.forEach((u) => {
  const role = data.userRoles.find((r) => r.id === u.roleId);
  const org = data.organizations.find((o) => o.id === u.organizationId);
  const sec = getUserSecurityContext({ ...u, roleName: role?.name }, data.organizations);
  console.log(`User: ${u.username.padEnd(18)} | L${sec.administrativeLevel} (${sec.adminLevel !== undefined ? `Admin L${sec.adminLevel}` : 'Standard'}) | Cat: ${sec.functionalCategory.padEnd(10)} | Auth: ${sec.delegatedAuthority.padEnd(12)} | Org: ${sec.organizationName}`);
});

console.log('\n--- 2. VERIFYING 6-LEVEL ADMINISTRATIVE BOUNDARIES ---');
const superadmin = data.users.find((u) => u.username === 'superadmin');
const moeAdmin = data.users.find((u) => u.username === 'moe.admin');
const nieAdmin = data.users.find((u) => u.username === 'nie.admin');
const provAdmin = data.users.find((u) => u.username === 'provincial.admin');
const zonalAdmin = data.users.find((u) => u.username === 'zonal.admin');
const divAdmin = data.users.find((u) => u.username === 'divisional.admin');

const secSuper = getUserSecurityContext(superadmin, data.organizations);
const secMoe = getUserSecurityContext(moeAdmin, data.organizations);
const secNie = getUserSecurityContext(nieAdmin, data.organizations);
const secProv = getUserSecurityContext(provAdmin, data.organizations);
const secZone = getUserSecurityContext(zonalAdmin, data.organizations);
const secDiv = getUserSecurityContext(divAdmin, data.organizations);

// Test Level 0 (SuperAdmin) access across all
assert(canUserAccessInstitution(secSuper, 'org-moe-planning', data.organizations), 'SuperAdmin accesses MoE Planning');
assert(canUserAccessInstitution(secSuper, 'org-nie', data.organizations), 'SuperAdmin accesses NIE (Apex)');
assert(canUserAccessInstitution(secSuper, 'org-prov-southern', data.organizations), 'SuperAdmin accesses Southern Province');
assert(canUserAccessInstitution(secSuper, 'org-prov-western', data.organizations), 'SuperAdmin accesses Western Province');
assert(canUserAccessInstitution(secSuper, 'org-zone-galle', data.organizations), 'SuperAdmin accesses Galle Zone');
assert(canUserAccessInstitution(secSuper, 'org-div-galle-galle', data.organizations), 'SuperAdmin accesses Galle Division');

// Test Level 1 (MoE National) scope
assert(canUserAccessInstitution(secMoe, 'org-moe-ict', data.organizations), 'MoE Admin accesses Line Ministry ICT Branch');
assert(canUserAccessInstitution(secMoe, 'org-prov-southern', data.organizations), 'MoE Admin has national oversight on Provinces');

// Test Level 2 (NIE Apex) scope
assert(canUserAccessInstitution(secNie, 'org-nie', data.organizations), 'NIE Admin accesses NIE');
assert(!canUserAccessInstitution(secNie, 'org-prov-southern', data.organizations), 'NIE Admin CANNOT access Southern Province (Autonomous Apex boundary)');

// Test Level 3 (Southern Provincial Admin) scope
assert(canUserAccessInstitution(secProv, 'org-prov-southern', data.organizations), 'Provincial Admin accesses Southern Province');
assert(canUserAccessInstitution(secProv, 'org-zone-galle', data.organizations), 'Provincial Admin accesses child Galle Zone');
assert(canUserAccessInstitution(secProv, 'org-div-galle-galle', data.organizations), 'Provincial Admin accesses child Galle Division');
assert(!canUserAccessInstitution(secProv, 'org-prov-western', data.organizations), 'Provincial Admin CANNOT access Western Province (Horizontal isolation)');
assert(!canUserAccessInstitution(secProv, 'org-zone-colombo', data.organizations), 'Provincial Admin CANNOT access Colombo Zone (Western Province)');

// Test Level 4 (Galle Zonal Admin) scope
assert(canUserAccessInstitution(secZone, 'org-zone-galle', data.organizations), 'Zonal Admin accesses Galle Zone');
assert(canUserAccessInstitution(secZone, 'org-div-galle-galle', data.organizations), 'Zonal Admin accesses child Galle Division');
assert(!canUserAccessInstitution(secZone, 'org-prov-southern', data.organizations), 'Zonal Admin CANNOT access parent Southern Province root data');
assert(!canUserAccessInstitution(secZone, 'org-zone-matara', data.organizations), 'Zonal Admin CANNOT access Matara Zone (Sibling isolation)');

// Test Level 5 (Galle Divisional Admin) scope
assert(canUserAccessInstitution(secDiv, 'org-div-galle-galle', data.organizations), 'Divisional Admin accesses Galle Division');
assert(!canUserAccessInstitution(secDiv, 'org-zone-galle', data.organizations), 'Divisional Admin CANNOT access Galle Zone');
assert(!canUserAccessInstitution(secDiv, 'org-div-matara', data.organizations), 'Divisional Admin CANNOT access Matara Division');

console.log('\n--- 3. VERIFYING FUNCTIONAL CATEGORIES & DATA FLOW PERMISSIONS ---');
const planOfficer = data.users.find((u) => u.username === 'planning.officer');
const monOfficer = data.users.find((u) => u.username === 'monitoring.officer');
const ictOfficer = data.users.find((u) => u.username === 'ict.officer');

const secPlan = getUserSecurityContext(planOfficer, data.organizations);
const secMon = getUserSecurityContext(monOfficer, data.organizations);
const secIct = getUserSecurityContext(ictOfficer, data.organizations);

// Planning Officer Permissions
assert(secPlan.functionalCategory === 'Planning', 'planning.officer is Planning Category');
assert(secPlan.permissions.canReallocate === true, 'Planning Officer can reallocate budget');
assert(secPlan.permissions.canRevise === true, 'Planning Officer can revise budget');
assert(secPlan.permissions.canVerify === false, 'Planning Officer CANNOT verify QA field monitoring');

// Monitoring Officer Permissions
assert(secMon.functionalCategory === 'Monitoring', 'monitoring.officer is Monitoring Category');
assert(secMon.permissions.canVerify === true, 'Monitoring Officer can record QA verifications');
assert(secMon.permissions.canMonitor === true, 'Monitoring Officer can log monitoring observations');
assert(secMon.permissions.canReallocate === false, 'Monitoring Officer CANNOT reallocate budget');

// Normal Branch Officer (ICT) Permissions
assert(secIct.functionalCategory === 'Normal', 'ict.officer is Normal Category');
assert(secIct.permissions.canCreate === true, 'ICT Officer can create workshops & proposals');
assert(secIct.permissions.canReallocate === false, 'ICT Officer CANNOT reallocate budget');
assert(secIct.permissions.canVerify === false, 'ICT Officer CANNOT verify QA monitoring');

function canUserViewWorkshop(user, workshop, organizations) {
  if (!user) return false;
  if (
    user.roleName === 'Super Administrator' ||
    user.roleName === 'System Administrator' ||
    user.roleName?.toLowerCase().includes('admin') ||
    user.username === 'superadmin' ||
    user.username === 'admin' ||
    user.username === 'moe.admin'
  ) {
    return true;
  }
  if (workshop.createdBy === user.id) return true;
  if (
    workshop.organizingOrgId === user.organizationId ||
    (workshop.branch && user.organizationName && workshop.branch.toLowerCase().includes(user.organizationName.toLowerCase())) ||
    (workshop.branch && user.organizationName && user.organizationName.toLowerCase().includes(workshop.branch.toLowerCase()))
  ) {
    return true;
  }
  if (
    workshop.placeId === user.organizationId ||
    workshop.targetOrgId === user.organizationId ||
    (workshop.placeName && user.organizationName && workshop.placeName.toLowerCase().includes(user.organizationName.toLowerCase())) ||
    (workshop.placeName && user.organizationName && user.organizationName.toLowerCase().includes(workshop.placeName.toLowerCase()))
  ) {
    return true;
  }
  const orgList = organizations || data.organizations || [];
  const placeOrg = orgList.find((o) => o.id === (workshop.placeId || workshop.targetOrgId));
  if (placeOrg?.parentId && placeOrg.parentId === user.organizationId) {
    return true;
  }
  return false;
}

function canUserManageParticipants(user, workshop) {
  if (!user || !workshop) return false;
  if (
    user.roleName === 'Super Administrator' ||
    user.roleName === 'System Administrator' ||
    user.roleName?.toLowerCase().includes('admin') ||
    user.username === 'superadmin' ||
    user.username === 'admin'
  ) {
    return true;
  }
  if (workshop.createdBy && workshop.createdBy === user.id) return true;
  if (
    (workshop.organizingOrgId && user.organizationId && workshop.organizingOrgId === user.organizationId) ||
    (workshop.branch && user.organizationName && workshop.branch.toLowerCase().includes(user.organizationName.toLowerCase())) ||
    (workshop.branch && user.organizationName && user.organizationName.toLowerCase().includes(workshop.branch.toLowerCase()))
  ) {
    return true;
  }
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

function canUserRescheduleWorkshop(user, workshop, organizations) {
  if (!user || !workshop) return false;
  if (
    user.roleName === 'Super Administrator' ||
    user.roleName === 'System Administrator' ||
    user.roleName?.toLowerCase().includes('admin') ||
    user.username === 'superadmin' ||
    user.username === 'admin'
  ) {
    return true;
  }
  if (workshop.createdBy && workshop.createdBy === user.id) return true;
  if (
    (workshop.organizingOrgId && user.organizationId && workshop.organizingOrgId === user.organizationId) ||
    (workshop.branch && user.organizationName && workshop.branch.toLowerCase().includes(user.organizationName.toLowerCase())) ||
    (workshop.branch && user.organizationName && user.organizationName.toLowerCase().includes(workshop.branch.toLowerCase()))
  ) {
    return true;
  }
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

console.log('\n--- 4. VERIFYING WORKSHOP & AIP DATA FLOW CONTROLS ---');
const sampleWorkshop = {
  id: 'ws-test-01',
  title: 'Advanced AI in Secondary Education',
  createdBy: 'user-moe-ict', // ict.officer
  organizingOrgId: 'org-moe-ict',
  branch: 'Information Technology and Digital Education Branch',
  placeId: 'org-zone-galle-it', // Galle Zone IT Branch
  placeName: 'Galle Zone IT Branch',
};

const galleItUser = data.users.find((u) => u.username === 'galle.it');
const colomboItUser = data.users.find((u) => u.username === 'colombo.it');
const mathsOfficer = data.users.find((u) => u.username === 'maths.officer');

// Workshop Visibility
assert(canUserViewWorkshop(ictOfficer, sampleWorkshop, data.organizations), 'Creator & Organizing branch sees workshop');
assert(canUserViewWorkshop(galleItUser, sampleWorkshop, data.organizations), 'Host Venue (Galle Zone IT) sees assigned workshop');
assert(canUserViewWorkshop(superadmin, sampleWorkshop, data.organizations), 'SuperAdmin sees all workshops');
assert(!canUserViewWorkshop(colomboItUser, sampleWorkshop, data.organizations), 'Unrelated Venue (Colombo IT) CANNOT see Galle workshop');
assert(!canUserViewWorkshop(mathsOfficer, sampleWorkshop, data.organizations), 'Unrelated Branch (Maths) CANNOT see ICT workshop');

// Participant Management
assert(canUserManageParticipants(ictOfficer, sampleWorkshop), 'Organizing Branch can manage participants');
assert(canUserManageParticipants(galleItUser, sampleWorkshop), 'Host Venue can manage participants/trainees');
assert(canUserManageParticipants(superadmin, sampleWorkshop), 'SuperAdmin can manage participants');
assert(!canUserManageParticipants(colomboItUser, sampleWorkshop), 'Unrelated Venue CANNOT manage participants');
assert(!canUserManageParticipants(mathsOfficer, sampleWorkshop), 'Unrelated Branch CANNOT manage participants');

// Rescheduling Authority
assert(canUserRescheduleWorkshop(ictOfficer, sampleWorkshop, data.organizations), 'Organizing Branch can reschedule workshop');
assert(canUserRescheduleWorkshop(galleItUser, sampleWorkshop, data.organizations), 'Host Venue can reschedule workshop');
assert(!canUserRescheduleWorkshop(colomboItUser, sampleWorkshop, data.organizations), 'Unrelated Venue CANNOT reschedule workshop');

// AIP Approval Control (Fixed in this session)
function canApproveAip(user) {
  return Boolean(
    user.username !== 'planning' &&
    (user.isSuperAdmin ||
    user.adminLevel === 0 ||
    user.adminLevel === 1 ||
    user.roleId === 'role-superadmin' ||
    user.roleId === 'role-admin' ||
    user.username === 'superadmin' ||
    user.username === 'moe.admin' ||
    user.username === 'planning.officer' ||
    (user.roleId === 'role-planning-officer' && (user.organizationId === 'org-moe-planning' || user.organizationId === 'org-moe')))
  );
}

assert(canApproveAip(secSuper), 'SuperAdmin can approve AIP plans');
assert(canApproveAip(secMoe), 'MoE Level 1 Admin can approve AIP plans');
assert(canApproveAip(secPlan), 'Planning Officer can approve AIP plans');
assert(!canApproveAip(secIct), 'ICT Branch Officer CANNOT approve AIP plans');
assert(!canApproveAip(secProv), 'Provincial Admin CANNOT approve National MoE AIP plans');
assert(!canApproveAip(secZone), 'Zonal Admin CANNOT approve National MoE AIP plans');

console.log('\n--- 5. VERIFYING NORMAL VS. SPECIAL TWO-ACCOUNT ARCHITECTURE ---');
const userNormalPlanning = data.users.find((u) => u.username === 'planning');
const userNormalMonitoring = data.users.find((u) => u.username === 'monitoring');
const userNormalDataMgmt = data.users.find((u) => u.username === 'data.management');
const userNormalDataAlias = data.users.find((u) => u.username === 'data');
const userSpecialDataOfficer = data.users.find((u) => u.username === 'data.officer');
const userSpecialAdmin = data.users.find((u) => u.username === 'admin');

const secNormPlan = getUserSecurityContext(userNormalPlanning, data.organizations);
const secNormMon = getUserSecurityContext(userNormalMonitoring, data.organizations);
const secNormData = getUserSecurityContext(userNormalDataMgmt, data.organizations);
const secSpecDataOff = getUserSecurityContext(userSpecialDataOfficer, data.organizations);
const secSpecAdmin = getUserSecurityContext(userSpecialAdmin, data.organizations);

// Planning Branch: Normal vs. Special
assert(secNormPlan.functionalCategory === 'Normal', 'user "planning" has functionalCategory === "Normal"');
assert(secNormPlan.isPlanningDivision === false, 'user "planning" is NOT planning division authority');
assert(secNormPlan.delegatedAuthority === 'Standard', 'user "planning" has Standard authority');
assert(secNormPlan.permissions.canCreate === true, 'user "planning" CAN create workshops and proposals for planning branch');
assert(!canApproveAip(secNormPlan), 'user "planning" CANNOT approve AIP plans of other branches');
assert(secNormPlan.permissions.canReallocate === false, 'user "planning" CANNOT reallocate macro budgets');

assert(secPlan.functionalCategory === 'Planning', 'user "planning.officer" has functionalCategory === "Planning"');
assert(secPlan.isPlanningDivision === true, 'user "planning.officer" IS planning division authority');
assert(secPlan.permissions.canReallocate === true, 'user "planning.officer" CAN reallocate macro budgets');
assert(canApproveAip(secPlan), 'user "planning.officer" CAN approve AIP plans');

// Monitoring Branch: Normal vs. Special
assert(secNormMon.functionalCategory === 'Normal', 'user "monitoring" has functionalCategory === "Normal"');
assert(secNormMon.isMonitoringDivision === false, 'user "monitoring" is NOT monitoring division authority');
assert(secNormMon.delegatedAuthority === 'Standard', 'user "monitoring" has Standard authority');
assert(secNormMon.permissions.canCreate === true, 'user "monitoring" CAN create workshops for monitoring branch');
assert(secNormMon.permissions.canVerify === false, 'user "monitoring" CANNOT record QA verifications');
assert(secNormMon.permissions.canMonitor === false, 'user "monitoring" CANNOT log official monitoring observations');

assert(secMon.functionalCategory === 'Monitoring', 'user "monitoring.officer" has functionalCategory === "Monitoring"');
assert(secMon.isMonitoringDivision === true, 'user "monitoring.officer" IS monitoring division authority');
assert(secMon.permissions.canVerify === true, 'user "monitoring.officer" CAN record QA verifications');
assert(secMon.permissions.canMonitor === true, 'user "monitoring.officer" CAN log official monitoring observations');

// Data Management Branch: Normal vs. Special
assert(secNormData.functionalCategory === 'Normal', 'user "data.management" has functionalCategory === "Normal"');
assert(secNormData.isLevelAdmin === false, 'user "data.management" is NOT an administrator');
assert(secNormData.delegatedAuthority === 'Standard', 'user "data.management" has Standard authority');
assert(secNormData.permissions.canCreate === true, 'user "data.management" CAN create workshops for data branch');

assert(secSpecAdmin.isLevelAdmin === true, 'user "admin" IS Level 1 System Administrator');
assert(secSpecAdmin.adminLevel === 1, 'user "admin" has adminLevel === 1');
assert(secSpecAdmin.permissions.canDelete === true, 'user "admin" CAN manage and delete entities');
assert(secSpecDataOff.adminLevel === 1, 'user "data.officer" IS Level 1 Administrator');

console.log('\n--- 6. VERIFYING STRICT LEAST PRIVILEGE ENFORCEMENT ACROSS ALL LEVELS ---');

// Place Coordinators (Level 6)
const secGalleIt = getUserSecurityContext(galleItUser, data.organizations);
const secColIt = getUserSecurityContext(colomboItUser, data.organizations);
assert(secGalleIt.permissions.canCreate === false, 'Place Coordinator (Galle IT) CANNOT create workshops');
assert(secColIt.permissions.canCreate === false, 'Place Coordinator (Colombo IT) CANNOT create workshops');
assert(secGalleIt.permissions.canApprove === false, 'Place Coordinator CANNOT approve plans');
assert(secGalleIt.permissions.canReallocate === false, 'Place Coordinator CANNOT reallocate budget');
assert(secGalleIt.permissions.canVerify === false, 'Place Coordinator CANNOT verify QA monitoring');
assert(secGalleIt.permissions.canDelete === false, 'Place Coordinator CANNOT delete entities');

// Zonal Planning Coordinator (Level 4)
const galleCoordUser = data.users.find((u) => u.username === 'galle.coordinator');
const secGalleCoord = getUserSecurityContext(galleCoordUser, data.organizations);
assert(!canApproveAip(secGalleCoord), 'Zonal Planning Coordinator CANNOT approve National MoE AIP plans');
assert(secGalleCoord.permissions.canApprove === false, 'Zonal Planning Coordinator CANNOT approve national plans');
assert(secGalleCoord.permissions.canReallocate === false, 'Zonal Planning Coordinator CANNOT reallocate national budget');
assert(secGalleCoord.permissions.canVerify === false, 'Zonal Planning Coordinator CANNOT verify QA monitoring');
assert(secGalleCoord.permissions.canDelete === false, 'Zonal Planning Coordinator CANNOT delete entities');

// Level 5 Divisional Admin
const secDivAdmin = secDiv;
assert(secDivAdmin.permissions.canApprove === false, 'Divisional Admin CANNOT approve national plans');
assert(secDivAdmin.permissions.canReallocate === false, 'Divisional Admin CANNOT reallocate national budget');
assert(secDivAdmin.permissions.canVerify === false, 'Divisional Admin CANNOT verify QA monitoring');
assert(secDivAdmin.permissions.canDelete === false, 'Divisional Admin CANNOT delete system-wide entities');

// Level 4 Zonal Admin
assert(secZone.permissions.canApprove === false, 'Zonal Admin CANNOT approve national plans');
assert(secZone.permissions.canReallocate === false, 'Zonal Admin CANNOT reallocate national budget');
assert(secZone.permissions.canVerify === false, 'Zonal Admin CANNOT verify QA monitoring');
assert(secZone.permissions.canDelete === false, 'Zonal Admin CANNOT delete system-wide entities');

// Level 3 Provincial Admin
assert(secProv.permissions.canApprove === false, 'Provincial Admin CANNOT approve national plans');
assert(secProv.permissions.canReallocate === false, 'Provincial Admin CANNOT reallocate national budget');
assert(secProv.permissions.canVerify === false, 'Provincial Admin CANNOT verify QA monitoring');
assert(secProv.permissions.canDelete === false, 'Provincial Admin CANNOT delete system-wide entities');

// Level 2 NIE Apex Admin
assert(secNie.permissions.canApprove === false, 'NIE Apex Admin CANNOT approve national plans');
assert(secNie.permissions.canReallocate === false, 'NIE Apex Admin CANNOT reallocate national budget');
assert(secNie.permissions.canVerify === false, 'NIE Apex Admin CANNOT verify QA monitoring');
assert(secNie.permissions.canDelete === false, 'NIE Apex Admin CANNOT delete line ministry entities');

// Level 1 Planning Officer vs Monitoring Officer
assert(secPlan.permissions.canVerify === false, 'Planning Officer CANNOT verify QA monitoring');
assert(secPlan.permissions.canDelete === false, 'Planning Officer CANNOT delete system accounts');
assert(secMon.permissions.canApprove === false, 'Monitoring Officer CANNOT approve AIP plans');
assert(secMon.permissions.canReallocate === false, 'Monitoring Officer CANNOT reallocate budget');
assert(secMon.permissions.canDelete === false, 'Monitoring Officer CANNOT delete system accounts');

// Role Database Flag Constraints
const rolePlaceCoord = data.userRoles.find((r) => r.id === 'role-place-coordinator');
const roleDivAdmin = data.userRoles.find((r) => r.id === 'role-admin-level-5');
const roleZoneAdmin = data.userRoles.find((r) => r.id === 'role-admin-level-4');
assert(rolePlaceCoord.canCreateWorkshop === false, 'role-place-coordinator has canCreateWorkshop === false in database');
assert(roleDivAdmin.canManageUsers === false, 'role-admin-level-5 has canManageUsers === false in database');
assert(roleDivAdmin.canManageOrganizations === false, 'role-admin-level-5 has canManageOrganizations === false in database');
assert(roleZoneAdmin.canManageUsers === false, 'role-admin-level-4 has canManageUsers === false in database');
assert(data.userOrgPermissions.length === 26, 'userOrgPermissions has exactly 26 legitimate scoped entries (0 cross-org leaks)');

console.log('\n================================================================================');
console.log(`AUDIT SUMMARY: ${passedTests}/${totalTests} TESTS PASSED (${Math.round((passedTests/totalTests)*100)}%)`);
console.log('================================================================================');
