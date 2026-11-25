import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getBranchAbbreviation } from '@/lib/branchUtils';

export const dynamic = 'force-dynamic';

export interface LoginUserEntry {
  userId: string;
  username: string;
  fullName: string;
  designation: string;
  organizationId: string;
  organizationName: string;
  roleId: string;
  roleName: string;
  functionalCategory: string;
  roleAssignmentId: string;
}

/**
 * GET /api/auth/login-options
 * Public endpoint returning non-sensitive branch, role, and branch-user directory
 * metadata for the role-based & branch-scoped login interface.
 */
export async function GET() {
  try {
    const data = await getDb();
    const activeUsers = (data.users || []).filter((u) => u.isActive);
    const orgMap = new Map((data.organizations || []).map((o) => [o.id, o]));
    const orgTypeMap = new Map((data.organizationTypes || []).map((t) => [t.id, t]));
    const roleMap = new Map((data.userRoles || []).map((r) => [r.id, r]));

    const entries: LoginUserEntry[] = [];
    const seenKeys = new Set<string>();

    for (const user of activeUsers) {
      const assignments = (user.assignedRoles || []).filter((a) => a.isActive);

      if (assignments.length > 0) {
        for (const a of assignments) {
          const org = orgMap.get(a.organizationId);
          const role = roleMap.get(a.roleId);
          if (org && !org.isActive) continue;

          const key = `${user.id}::${a.organizationId}::${a.roleId}`;
          if (seenKeys.has(key)) continue;
          seenKeys.add(key);

          entries.push({
            userId: user.id,
            username: user.username,
            fullName: user.fullName,
            designation: user.designation || '',
            organizationId: a.organizationId,
            organizationName: org?.name || a.organizationName || a.organizationId,
            roleId: a.roleId,
            roleName: role?.name || a.roleName || a.roleId,
            functionalCategory: a.functionalCategory || role?.functionalScope || org?.functionalCategory || 'Normal',
            roleAssignmentId: a.id,
          });
        }
      } else {
        const org = orgMap.get(user.organizationId);
        const role = roleMap.get(user.roleId);
        if (org && !org.isActive) continue;

        const key = `${user.id}::${user.organizationId}::${user.roleId}`;
        if (seenKeys.has(key)) continue;
        seenKeys.add(key);

        entries.push({
          userId: user.id,
          username: user.username,
          fullName: user.fullName,
          designation: user.designation || '',
          organizationId: user.organizationId,
          organizationName: org?.name || user.organizationId,
          roleId: user.roleId,
          roleName: role?.name || user.roleId,
          functionalCategory: role?.functionalScope || org?.functionalCategory || 'Normal',
          roleAssignmentId: '',
        });
      }
    }

    // Build distinct branches that have at least one active login user
    const branchUserSets = new Map<string, Set<string>>();
    for (const entry of entries) {
      if (!branchUserSets.has(entry.organizationId)) {
        branchUserSets.set(entry.organizationId, new Set());
      }
      branchUserSets.get(entry.organizationId)!.add(entry.userId);
    }

    const branches = Array.from(branchUserSets.entries())
      .map(([orgId, userIds]) => {
        const org = orgMap.get(orgId);
        const orgType = org ? orgTypeMap.get(org.typeId) : undefined;
        return {
          id: orgId,
          name: org?.name || entries.find((e) => e.organizationId === orgId)?.organizationName || orgId,
          code: org?.code || '',
          abbreviation: org?.abbreviation || getBranchAbbreviation(org?.name || orgId, org?.code),
          typeName: orgType?.name || 'Branch',
          level: orgType?.level ?? 4,
          functionalCategory: org?.functionalCategory || 'Normal',
          userCount: userIds.size,
        };
      })
      .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));

    // Build distinct roles that have at least one active login user
    const roleIdsPresent = new Set(entries.map((e) => e.roleId));
    const roles = Array.from(roleIdsPresent)
      .map((roleId) => {
        const role = roleMap.get(roleId);
        return {
          id: roleId,
          name: role?.name || entries.find((e) => e.roleId === roleId)?.roleName || roleId,
          description: role?.description || '',
          functionalScope: role?.functionalScope || 'Normal',
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({
      branches,
      roles,
      branchUsers: entries,
    });
  } catch (err: any) {
    console.error('Failed to load login options:', err);
    return NextResponse.json(
      { error: 'Failed to load login options' },
      { status: 500 }
    );
  }
}
