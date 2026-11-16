import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb, updateDb } from '@/lib/db';
import { logAuditEvent } from '@/lib/auditLogger';

/**
 * GET /api/auth/switch-role
 * Returns the current authenticated officer's profile, assigned working roles,
 * active role assignment, and "remember last role" preference.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = await getDb();
  const user = data.users.find(
    (u) =>
      u.id === (session.user as any).id ||
      u.username === (session.user as any).username ||
      u.aliases?.includes((session.user as any).username)
  );

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const assignedRoles = user.assignedRoles || [];
  const activeAssignmentId =
    user.lastSelectedRoleId ||
    (session.user as any).activeRoleAssignmentId ||
    assignedRoles.find((r) => r.isDefault)?.id ||
    assignedRoles[0]?.id;

  const activeAssignment = assignedRoles.find((r) => r.id === activeAssignmentId) || assignedRoles[0];

  return NextResponse.json({
    userId: user.id,
    username: user.username,
    fullName: user.fullName,
    designation: user.designation,
    assignedRoles,
    activeRoleAssignmentId: activeAssignment?.id || '',
    activeRole: activeAssignment || null,
    rememberLastRole: user.rememberLastRole || false,
  });
}

/**
 * POST /api/auth/switch-role
 * Switches the active working role for the current authenticated officer without logging out.
 * Enforces AUTH-07 (in-session switch), AUTH-08 (audit logging), AUTH-09 (prevent unassigned roles),
 * and AUTH-11 (immediate session propagation).
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { roleAssignmentId, remember } = body;

    if (!roleAssignmentId) {
      return NextResponse.json(
        { error: 'Missing required field: roleAssignmentId' },
        { status: 400 }
      );
    }

    const data = await getDb();
    const user = data.users.find(
      (u) =>
        u.id === (session.user as any).id ||
        u.username === (session.user as any).username ||
        u.aliases?.includes((session.user as any).username)
    );

    if (!user) {
      return NextResponse.json({ error: 'User record not found' }, { status: 404 });
    }

    const assignedRoles = user.assignedRoles || [];
    const targetAssignment = assignedRoles.find((r) => r.id === roleAssignmentId);

    // AUTH-09: Users shall not be able to access unassigned roles or unauthorized functions
    if (!targetAssignment || !targetAssignment.isActive) {
      logAuditEvent({
        user: {
          id: user.id,
          username: user.username,
          fullName: user.fullName,
        },
        category: 'Security',
        action: 'AUTH_ROLE_SWITCH_DENIED',
        entityType: 'AUTH',
        entityId: roleAssignmentId,
        summary: `Denied role switch attempt by "${user.fullName}" (${user.username}): Target role "${roleAssignmentId}" is not assigned or is suspended.`,
        severity: 'Warning',
        details: { targetRoleAssignmentId: roleAssignmentId },
      });

      return NextResponse.json(
        { error: 'Access Denied: You are not authorized to assume this working role.' },
        { status: 403 }
      );
    }

    const previousRoleName = (session.user as any).roleName || 'Initial Session Role';

    // Persist new working role context and remember preference
    await updateDb((d) => {
      const u = d.users.find((u) => u.id === user.id);
      if (u) {
        u.lastSelectedRoleId = targetAssignment.id;
        if (typeof remember === 'boolean') {
          u.rememberLastRole = remember;
        }
      }
    });

    // AUTH-08: Role changes shall be recorded in the audit log
    logAuditEvent({
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        organizationId: targetAssignment.organizationId,
        organizationName: targetAssignment.organizationName,
        roleId: targetAssignment.roleId,
        roleName: targetAssignment.roleName,
      },
      category: 'Security',
      action: 'AUTH_ROLE_SWITCH',
      entityType: 'AUTH',
      entityId: targetAssignment.id,
      summary: `Officer "${user.fullName}" (${user.username}) switched active working role from "${previousRoleName}" to "${targetAssignment.roleName}" (${targetAssignment.organizationName}).`,
      details: {
        previousRole: previousRoleName,
        newRole: targetAssignment.roleName,
        organization: targetAssignment.organizationName,
        functionalCategory: targetAssignment.functionalCategory,
        adminLevel: targetAssignment.adminLevel,
        rememberedForNextLogin: typeof remember === 'boolean' ? remember : user.rememberLastRole,
        switchTimestamp: new Date().toISOString(),
      },
      severity: 'Info',
    });

    return NextResponse.json({
      success: true,
      message: `Active working role switched to ${targetAssignment.roleName}`,
      activeRole: targetAssignment,
    });
  } catch (err: any) {
    console.error('Error switching role:', err);
    return NextResponse.json(
      { error: err?.message || 'Internal server error switching role' },
      { status: 500 }
    );
  }
}
