import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb, updateDb, UserRoleAssignment } from '@/lib/db';
import { logAuditEvent } from '@/lib/auditLogger';

function isAuthorizedAdmin(session: any): boolean {
  if (!session?.user) return false;
  const user = session.user as any;
  return (
    user.isSuperAdmin === true ||
    (user.adminLevel !== undefined && user.adminLevel >= 0 && user.adminLevel <= 5) ||
    ['superadmin', 'admin', 'moe', 'moe.admin', 'nie.admin', 'nie', 'ped.sp', 'provincial.admin', 'zeo.galle', 'zonal.admin', 'deo.galle', 'divisional.admin'].includes(user.username) ||
    user.roleId === 'role-superadmin' ||
    user.roleName === 'Super Administrator'
  );
}

/**
 * GET /api/admin/roles
 * Returns centralized role definitions, officers with multi-role assignments,
 * organizations/branches, and institutional policy status.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!isAuthorizedAdmin(session)) {
    return NextResponse.json({ error: 'Access Denied: Administrator authority required.' }, { status: 403 });
  }

  const data = await getDb();

  const usersWithRoles = data.users.map((u) => ({
    id: u.id,
    username: u.username,
    fullName: u.fullName,
    email: u.email,
    designation: u.designation,
    organizationId: u.organizationId,
    primaryRoleId: u.roleId,
    isActive: u.isActive,
    aliases: u.aliases || [],
    assignedRoles: u.assignedRoles || [],
    lastSelectedRoleId: u.lastSelectedRoleId || '',
    rememberLastRole: u.rememberLastRole || false,
    lastLogin: u.lastLogin,
  }));

  return NextResponse.json({
    roles: data.userRoles,
    users: usersWithRoles,
    organizations: data.organizations.map((o) => ({
      id: o.id,
      name: o.name,
      typeId: o.typeId,
      functionalCategory: (o as any).functionalCategory || 'Normal',
      district: (o as any).district,
    })),
  });
}

/**
 * POST /api/admin/roles
 * Creates a new centralized system role (AUTH-10).
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAuthorizedAdmin(session)) {
    return NextResponse.json({ error: 'Access Denied: Administrator authority required.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const {
      name,
      description,
      functionalScope = 'Normal',
      delegatedAuthority = 'Standard',
      canCreateWorkshop = false,
      canApproveWorkshop = false,
      canManageUsers = false,
      canViewReports = true,
      canManageOrganizations = false,
      canSubmit = true,
      canReview = false,
      canRecommend = false,
      canApprove = false,
      canVerify = false,
      canMonitor = false,
    } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Role name is required.' }, { status: 400 });
    }

    const roleId = `role-${name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')}-${Date.now().toString().slice(-4)}`;

    const newRole = {
      id: roleId,
      name: name.trim(),
      description: description?.trim() || 'Centralized IPMIS working role definition.',
      functionalScope,
      delegatedAuthority,
      canCreateWorkshop,
      canApproveWorkshop,
      canManageUsers,
      canViewReports,
      canManageOrganizations,
      canSubmit,
      canReview,
      canRecommend,
      canApprove,
      canVerify,
      canMonitor,
      isCustom: true,
      createdAt: new Date().toISOString(),
    };

    await updateDb((d) => {
      d.userRoles.push(newRole as any);
    });

    logAuditEvent({
      user: session?.user as any,
      category: 'Security',
      action: 'ROLE_CREATED',
      entityType: 'USER_ROLE',
      entityId: roleId,
      summary: `Administrator created new centralized role "${newRole.name}" (${newRole.functionalScope} scope).`,
      details: newRole,
      severity: 'Info',
    });

    return NextResponse.json({ success: true, role: newRole });
  } catch (err: any) {
    console.error('Error creating role:', err);
    return NextResponse.json({ error: err?.message || 'Error creating role' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/roles
 * Administrative operations:
 * - assign_user_role: Assigns working role to officer
 * - modify_user_role: Updates assignment active status, default flag
 * - revoke_user_role: Revokes role assignment from officer
 * - update_role_permissions: Edits system role permissions
 * - apply_branch_defaults: Roll out institutional default approvals to all branches (Requirement C)
 */
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAuthorizedAdmin(session)) {
    return NextResponse.json({ error: 'Access Denied: Administrator authority required.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { action } = body;

    const data = await getDb();

    // 1. Assign New Role to User (AUTH-10)
    if (action === 'assign_user_role') {
      const {
        userId,
        roleId,
        organizationId,
        functionalCategory,
        adminLevel,
        delegatedAuthority = 'Standard',
        description,
        isDefault = false,
      } = body;

      const user = data.users.find((u) => u.id === userId);
      if (!user) return NextResponse.json({ error: 'Target user not found' }, { status: 404 });

      const role = data.userRoles.find((r) => r.id === roleId);
      if (!role) return NextResponse.json({ error: 'Target role not found' }, { status: 404 });

      const org = data.organizations.find((o) => o.id === organizationId);
      if (!org) return NextResponse.json({ error: 'Target organization/branch not found' }, { status: 404 });

      const newAssignment: UserRoleAssignment = {
        id: `ura-${user.username}-${role.id.replace('role-', '')}-${Date.now().toString().slice(-4)}`,
        userId: user.id,
        roleId: role.id,
        roleName: role.name,
        organizationId: org.id,
        organizationName: org.name,
        functionalCategory: functionalCategory || role.functionalScope || (org as any).functionalCategory || 'Normal',
        adminLevel: adminLevel !== undefined ? Number(adminLevel) : undefined,
        delegatedAuthority: delegatedAuthority || role.delegatedAuthority || 'Standard',
        description: description || role.description || `Assigned to ${org.name}`,
        isDefault: Boolean(isDefault),
        isActive: true,
        assignedAt: new Date().toISOString(),
        assignedBy: (session?.user as any)?.username || 'superadmin',
      };

      await updateDb((d) => {
        const u = d.users.find((x) => x.id === user.id);
        if (u) {
          if (!u.assignedRoles) u.assignedRoles = [];
          if (newAssignment.isDefault) {
            u.assignedRoles.forEach((r) => (r.isDefault = false));
            u.lastSelectedRoleId = newAssignment.id;
          }
          u.assignedRoles.push(newAssignment);
        }
      });

      logAuditEvent({
        user: session?.user as any,
        category: 'Security',
        action: 'ROLE_ASSIGNED',
        entityType: 'USER_ROLE',
        entityId: newAssignment.id,
        summary: `Administrator assigned role "${role.name}" (${org.name}) to officer "${user.fullName}" (${user.username}).`,
        details: newAssignment,
        severity: 'Info',
      });

      return NextResponse.json({ success: true, assignment: newAssignment });
    }

    // 2. Modify User Role Assignment (Toggle Active/Suspended, Set Default)
    if (action === 'modify_user_role') {
      const { userId, assignmentId, isActive, isDefault } = body;
      const user = data.users.find((u) => u.id === userId);
      if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

      let modifiedRoleName = '';
      await updateDb((d) => {
        const u = d.users.find((x) => x.id === userId);
        if (u && u.assignedRoles) {
          const assignment = u.assignedRoles.find((r) => r.id === assignmentId);
          if (assignment) {
            modifiedRoleName = assignment.roleName;
            if (typeof isActive === 'boolean') assignment.isActive = isActive;
            if (isDefault === true) {
              u.assignedRoles.forEach((r) => (r.isDefault = false));
              assignment.isDefault = true;
              u.lastSelectedRoleId = assignment.id;
            }
          }
        }
      });

      logAuditEvent({
        user: session?.user as any,
        category: 'Security',
        action: 'ROLE_ASSIGNMENT_MODIFIED',
        entityType: 'USER_ROLE',
        entityId: assignmentId,
        summary: `Administrator updated role assignment "${modifiedRoleName}" for officer "${user.fullName}" (Active: ${isActive}, Default: ${isDefault}).`,
        details: { userId, assignmentId, isActive, isDefault },
        severity: 'Info',
      });

      return NextResponse.json({ success: true, message: 'Role assignment updated successfully.' });
    }

    // 3. Revoke User Role Assignment (AUTH-10)
    if (action === 'revoke_user_role') {
      const { userId, assignmentId } = body;
      const user = data.users.find((u) => u.id === userId);
      if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

      if (user.assignedRoles && user.assignedRoles.length <= 1) {
        return NextResponse.json(
          { error: 'Cannot revoke the officer’s only remaining role. Assign an alternative role first.' },
          { status: 400 }
        );
      }

      let revokedName = '';
      await updateDb((d) => {
        const u = d.users.find((x) => x.id === userId);
        if (u && u.assignedRoles) {
          const target = u.assignedRoles.find((r) => r.id === assignmentId);
          if (target) revokedName = target.roleName;
          u.assignedRoles = u.assignedRoles.filter((r) => r.id !== assignmentId);
          if (u.lastSelectedRoleId === assignmentId) {
            u.lastSelectedRoleId = u.assignedRoles[0]?.id || '';
          }
        }
      });

      logAuditEvent({
        user: session?.user as any,
        category: 'Security',
        action: 'ROLE_REVOKED',
        entityType: 'USER_ROLE',
        entityId: assignmentId,
        summary: `Administrator revoked role assignment "${revokedName}" from officer "${user.fullName}" (${user.username}).`,
        details: { userId, assignmentId, revokedName },
        severity: 'Warning',
      });

      return NextResponse.json({ success: true, message: 'Role assignment revoked.' });
    }

    // 4. Update System Role Permissions (AUTH-11)
    if (action === 'update_role_permissions') {
      const { roleId, permissions } = body;
      const role = data.userRoles.find((r) => r.id === roleId);
      if (!role) return NextResponse.json({ error: 'Role not found' }, { status: 404 });

      await updateDb((d) => {
        const r = d.userRoles.find((x) => x.id === roleId);
        if (r) {
          Object.assign(r, permissions);
        }
      });

      logAuditEvent({
        user: session?.user as any,
        category: 'Security',
        action: 'ROLE_PERMISSIONS_UPDATED',
        entityType: 'USER_ROLE',
        entityId: roleId,
        summary: `Administrator updated permissions for role "${role.name}".`,
        details: { roleId, permissions },
        severity: 'Info',
      });

      return NextResponse.json({ success: true, message: 'Role permissions updated.' });
    }

    // 5. Apply Branch Default Approvals & Permissions (Requirement C)
    if (action === 'apply_branch_defaults') {
      let updatedBranchCount = 0;

      await updateDb((d) => {
        // Ensure default permissions across all MoE, DoE, and Sub-national branches
        d.userRoles.forEach((r) => {
          if (r.id === 'role-moe-officer') {
            r.canSubmit = true;
            r.canCreate = true;
            r.canCreateWorkshop = true;
            r.canViewReports = true;
            r.canEdit = true;
          }
          if (r.id === 'role-planning-officer') {
            r.canReview = true;
            r.canRecommend = true;
            r.canApprove = true;
            r.canApproveWorkshop = true;
            r.canViewReports = true;
            r.functionalScope = 'Planning';
            r.delegatedAuthority = 'Approval';
          }
          if (r.id === 'role-monitoring-officer') {
            r.canVerify = true;
            r.canMonitor = true;
            r.canViewReports = true;
            r.functionalScope = 'Monitoring';
            r.delegatedAuthority = 'Verification';
          }
        });

        // Set all branch officers with standard dual working scope
        d.users.forEach((u) => {
          if (u.assignedRoles) {
            u.assignedRoles.forEach((ra) => {
              ra.isActive = true;
              if (ra.functionalCategory === 'Planning') {
                ra.delegatedAuthority = 'Review';
              } else if (ra.functionalCategory === 'Monitoring') {
                ra.delegatedAuthority = 'Verification';
              } else {
                ra.delegatedAuthority = 'Standard';
              }
            });
            updatedBranchCount++;
          }
        });
      });

      logAuditEvent({
        user: session?.user as any,
        category: 'Security',
        action: 'BRANCH_DEFAULT_APPROVALS_APPLIED',
        entityType: 'SYSTEM_SETTINGS',
        entityId: 'branch-policy-defaults',
        summary: `Administrator applied standard institutional approval & access policies across ${updatedBranchCount} officer accounts and all branches.`,
        details: { updatedBranchCount, appliedDefaultsAt: new Date().toISOString() },
        severity: 'Info',
      });

      return NextResponse.json({
        success: true,
        message: `Institutional default approvals successfully applied across ${updatedBranchCount} accounts and all branches.`,
      });
    }

    // 6. Create User / Level Administrator Account (AUTH-13)
    if (action === 'create_user_account') {
      const {
        username,
        fullName,
        email,
        designation,
        password = '123',
        adminLevel,
        organizationId,
        roleId,
        functionalCategory = 'Normal',
        delegatedAuthority = 'Standard',
        hasDualRole = false,
      } = body;

      if (!username?.trim() || !fullName?.trim() || !organizationId) {
        return NextResponse.json({ error: 'Username, Full Name, and Organization are required.' }, { status: 400 });
      }

      const cleanUsername = username.trim().toLowerCase();
      const existingUser = data.users.find((u) => u.username === cleanUsername || u.aliases?.includes(cleanUsername));
      if (existingUser) {
        return NextResponse.json({ error: `Username "${cleanUsername}" already exists.` }, { status: 400 });
      }

      const org = data.organizations.find((o) => o.id === organizationId);
      const role = data.userRoles.find((r) => r.id === roleId) || data.userRoles.find((r) => r.id === 'role-moe-officer');
      const userId = `user-${cleanUsername.replace(/[^a-z0-9]/g, '-')}-${Date.now().toString().slice(-4)}`;

      const numAdminLevel = adminLevel !== undefined && adminLevel !== '' && adminLevel !== null ? Number(adminLevel) : undefined;

      const primaryAssignment: UserRoleAssignment = {
        id: `ura-${cleanUsername}-pri`,
        userId,
        roleId: role?.id || 'role-moe-officer',
        roleName: role?.name || 'Operational Officer',
        organizationId: org?.id || organizationId,
        organizationName: org?.name || 'Education Entity',
        functionalCategory: functionalCategory || (role?.functionalScope as any) || 'Normal',
        adminLevel: numAdminLevel,
        delegatedAuthority: delegatedAuthority || (role?.delegatedAuthority as any) || 'Standard',
        description: `Primary role assigned for ${org?.name || 'institution'}.`,
        isDefault: true,
        isActive: true,
        assignedAt: new Date().toISOString(),
        assignedBy: (session?.user as any)?.username || 'superadmin',
      };

      const assignedRoles: UserRoleAssignment[] = [primaryAssignment];

      if (hasDualRole) {
        assignedRoles.push({
          id: `ura-${cleanUsername}-ops`,
          userId,
          roleId: 'role-moe-officer',
          roleName: `${org?.name || 'Branch'} Operational Officer`,
          organizationId: org?.id || organizationId,
          organizationName: org?.name || 'Education Entity',
          functionalCategory: 'Normal',
          delegatedAuthority: 'Standard',
          description: `Secondary operational branch execution role.`,
          isDefault: false,
          isActive: true,
          assignedAt: new Date().toISOString(),
          assignedBy: (session?.user as any)?.username || 'superadmin',
        });
      }

      const newUser: any = {
        id: userId,
        username: cleanUsername,
        aliases: [cleanUsername],
        passwordHash: '$2b$10$Xq1QeMIASNtiDAYj20k6Eu7Msmb4/zICwVeA2qlJav31Z6BIOvl7a', // bcrypt for '123'
        fullName: fullName.trim(),
        email: email?.trim() || `${cleanUsername}@moe.gov.lk`,
        designation: designation?.trim() || (numAdminLevel !== undefined ? `Level ${numAdminLevel} Administrator` : 'Operational Officer'),
        organizationId: org?.id || organizationId,
        roleId: role?.id || 'role-moe-officer',
        isActive: true,
        createdAt: new Date().toISOString(),
        assignedRoles,
        lastSelectedRoleId: primaryAssignment.id,
      };

      await updateDb((d) => {
        d.users.push(newUser);
      });

      logAuditEvent({
        user: session?.user as any,
        category: 'Security',
        action: 'USER_CREATED',
        entityType: 'USER',
        entityId: userId,
        summary: `Administrator created user/admin "${newUser.fullName}" (${cleanUsername}) with Admin Level: ${numAdminLevel !== undefined ? `Level ${numAdminLevel}` : 'Normal User'}.`,
        details: { username: cleanUsername, adminLevel: numAdminLevel, organizationId, hasDualRole },
        severity: 'Info',
      });

      return NextResponse.json({ success: true, user: newUser });
    }

    return NextResponse.json({ error: 'Unknown administrative action' }, { status: 400 });
  } catch (err: any) {
    console.error('Error in admin roles action:', err);
    return NextResponse.json({ error: err?.message || 'Error processing request' }, { status: 500 });
  }
}
