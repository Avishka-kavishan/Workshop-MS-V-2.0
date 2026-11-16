import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb, updateDb, Organization, OrganizationType } from '@/lib/db';
import { canUserManageBranch } from '@/lib/permissions';

function getAdminPrivilege(user: any): { isAuthorized: boolean; adminLevel: number } {
  if (!user) return { isAuthorized: false, adminLevel: -1 };
  if (user.isSuperAdmin || user.username === 'superadmin' || user.roleName === 'Super Administrator' || user.adminLevel === 0) {
    return { isAuthorized: true, adminLevel: 0 };
  }
  if (user.adminLevel !== undefined) {
    return { isAuthorized: true, adminLevel: user.adminLevel };
  }
  if (user.username === 'moe.admin' || user.roleName?.includes('Level 1 Admin') || user.username === 'admin') {
    return { isAuthorized: true, adminLevel: 1 };
  }
  if (user.username === 'nie.admin' || user.roleName?.includes('Level 2 Admin')) {
    return { isAuthorized: true, adminLevel: 2 };
  }
  if (user.username === 'provincial.admin' || user.roleName?.includes('Level 3 Admin')) {
    return { isAuthorized: true, adminLevel: 3 };
  }
  if (user.username === 'zonal.admin' || user.roleName?.includes('Level 4 Admin')) {
    return { isAuthorized: true, adminLevel: 4 };
  }
  if (user.username === 'divisional.admin' || user.roleName?.includes('Level 5 Admin')) {
    return { isAuthorized: true, adminLevel: 5 };
  }
  if (user.canManageOrganizations || user.roleName?.toLowerCase().includes('admin')) {
    return { isAuthorized: true, adminLevel: user.administrativeLevel || 1 };
  }
  return { isAuthorized: false, adminLevel: -1 };
}

export async function GET(req: NextRequest) {
  const data = await getDb();
  return NextResponse.json({
    organizations: data.organizations,
    organizationTypes: data.organizationTypes,
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  const priv = getAdminPrivilege(user);

  if (!priv.isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized: Level Administrator privileges required' }, { status: 403 });
  }

  try {
    const data = await getDb();
    const body = await req.json();
    const { action = 'create-org' } = body;

    // Sub-action: Create / Add a Level (Super Admin only)
    if (action === 'create-level') {
      if (priv.adminLevel !== 0) {
        return NextResponse.json({ error: 'Only Apex Super Administrator can define new administrative levels.' }, { status: 403 });
      }

      const { name, level, description } = body;
      if (!name || level === undefined) {
        return NextResponse.json({ error: 'Name and Level number are required for new Level.' }, { status: 400 });
      }

      const newType: OrganizationType = {
        id: `ot-level-${level}-${Date.now().toString().slice(-4)}`,
        name: name.trim(),
        level: Number(level),
        description: description || '',
        createdAt: new Date().toISOString(),
      };

      await updateDb((draft) => {
        draft.organizationTypes.push(newType);
      });

      return NextResponse.json({ success: true, organizationType: newType });
    }

    // Default: Add a new Branch / Institution / Unit
    const {
      name,
      code,
      typeId,
      parentId = null,
      unitType = 'branch',
      functionalCategory = 'Normal',
      address,
      phone,
      email,
    } = body;

    if (!name || !typeId) {
      return NextResponse.json({ error: 'Name and Organization Type (Level) are required.' }, { status: 400 });
    }

    const targetType = data.organizationTypes.find((t) => t.id === typeId);
    const targetLevel = targetType?.level || 4;

    // Check authority based on admin level
    if (!canUserManageBranch(user, targetLevel, undefined, parentId, data.organizations)) {
      return NextResponse.json({
        error: `Authority Denied: Level ${priv.adminLevel} Administrator cannot create branches at Level ${targetLevel} or under parent institution "${parentId || 'Root'}".`,
      }, { status: 403 });
    }

    const orgCode = (code || name.replace(/[^A-Za-z0-9]/g, '').slice(0, 10)).toUpperCase();
    const cleanId = `org-${orgCode.toLowerCase()}-${Date.now().toString().slice(-4)}`;

    const newOrg: Organization = {
      id: cleanId,
      name: name.trim(),
      code: orgCode,
      typeId,
      parentId: parentId || null,
      unitType: unitType === 'location' ? 'location' : 'branch',
      functionalCategory: functionalCategory as any,
      address,
      phone,
      email,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    await updateDb((draft) => {
      draft.organizations.push(newOrg);
    });

    return NextResponse.json({ success: true, organization: newOrg });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  const priv = getAdminPrivilege(user);

  if (!priv.isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized: Administrator privileges required' }, { status: 403 });
  }

  try {
    const data = await getDb();
    const body = await req.json();
    const { action = 'update-org' } = body;

    // Sub-action: Update Level (Super Admin only)
    if (action === 'update-level') {
      if (priv.adminLevel !== 0) {
        return NextResponse.json({ error: 'Only Apex Super Administrator can update administrative levels.' }, { status: 403 });
      }

      const { id, name, description, level } = body;
      if (!id) return NextResponse.json({ error: 'Level ID is required.' }, { status: 400 });

      let updatedType: OrganizationType | null = null;
      await updateDb((draft) => {
        const idx = draft.organizationTypes.findIndex((t) => t.id === id);
        if (idx !== -1) {
          draft.organizationTypes[idx] = {
            ...draft.organizationTypes[idx],
            ...(name ? { name: name.trim() } : {}),
            ...(description !== undefined ? { description } : {}),
            ...(level !== undefined ? { level: Number(level) } : {}),
          };
          updatedType = draft.organizationTypes[idx];
        }
      });
      return NextResponse.json({ success: true, organizationType: updatedType });
    }

    // Default: Update Branch / Institution
    const { id, name, code, typeId, parentId, functionalCategory, unitType, address, phone, email, isActive } = body;
    if (!id) {
      return NextResponse.json({ error: 'Organization ID is required.' }, { status: 400 });
    }

    const existingOrg = data.organizations.find((o) => o.id === id);
    if (!existingOrg) {
      return NextResponse.json({ error: 'Organization not found.' }, { status: 404 });
    }

    const orgType = data.organizationTypes.find((t) => t.id === existingOrg.typeId);
    const orgLevel = orgType?.level || 4;

    // Authority boundary check
    if (!canUserManageBranch(user, orgLevel, existingOrg.id, existingOrg.parentId, data.organizations)) {
      return NextResponse.json({
        error: `Authority Denied: Level ${priv.adminLevel} Administrator cannot modify unit "${existingOrg.name}" outside delegated jurisdiction.`,
      }, { status: 403 });
    }

    let updatedOrg: Organization | null = null;

    await updateDb((draft) => {
      const idx = draft.organizations.findIndex((o) => o.id === id);
      if (idx !== -1) {
        draft.organizations[idx] = {
          ...draft.organizations[idx],
          ...(name ? { name: name.trim() } : {}),
          ...(code ? { code: code.trim().toUpperCase() } : {}),
          ...(typeId ? { typeId } : {}),
          ...(parentId !== undefined ? { parentId: parentId || null } : {}),
          ...(functionalCategory ? { functionalCategory } : {}),
          ...(unitType ? { unitType } : {}),
          ...(address !== undefined ? { address } : {}),
          ...(phone !== undefined ? { phone } : {}),
          ...(email !== undefined ? { email } : {}),
          ...(typeof isActive === 'boolean' ? { isActive } : {}),
        };
        updatedOrg = draft.organizations[idx];
      }
    });

    return NextResponse.json({ success: true, organization: updatedOrg });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  const priv = getAdminPrivilege(user);

  if (!priv.isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized: Administrator privileges required' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const typeId = searchParams.get('typeId');

  // Delete Level / Organization Type (Super Admin only)
  if (typeId) {
    if (priv.adminLevel !== 0) {
      return NextResponse.json({ error: 'Only Apex Super Administrator can delete administrative levels.' }, { status: 403 });
    }
    await updateDb((draft) => {
      draft.organizationTypes = draft.organizationTypes.filter((t) => t.id !== typeId);
    });
    return NextResponse.json({ success: true, message: `Level ${typeId} removed.` });
  }

  if (!id) {
    return NextResponse.json({ error: 'ID parameter required.' }, { status: 400 });
  }

  const data = await getDb();
  const existingOrg = data.organizations.find((o) => o.id === id);
  if (!existingOrg) {
    return NextResponse.json({ error: 'Organization not found.' }, { status: 404 });
  }

  if (id === 'org-moe') {
    return NextResponse.json({ error: 'Ministry of Education Headquarters Root cannot be deleted.' }, { status: 400 });
  }

  const orgType = data.organizationTypes.find((t) => t.id === existingOrg.typeId);
  const orgLevel = orgType?.level || 4;

  if (!canUserManageBranch(user, orgLevel, existingOrg.id, existingOrg.parentId, data.organizations)) {
    return NextResponse.json({
      error: `Authority Denied: Level ${priv.adminLevel} Administrator cannot remove unit "${existingOrg.name}" outside delegated jurisdiction.`,
    }, { status: 403 });
  }

  await updateDb((draft) => {
    draft.organizations = draft.organizations.filter((o) => o.id !== id);
  });

  return NextResponse.json({ success: true, message: `Organization / Branch ${existingOrg.name} removed.` });
}
