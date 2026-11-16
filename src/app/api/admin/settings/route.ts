import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb, updateDb } from '@/lib/db';
import { logAuditEvent } from '@/lib/auditLogger';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user as any;
    const isSuperAdmin = Boolean(
      user.isSuperAdmin ||
      user.adminLevel === 0 ||
      user.username === 'superadmin' ||
      user.roleName === 'Super Administrator'
    );

    const db = await getDb();
    const showDashboardProgressMeter = db.meta?.showDashboardProgressMeter ?? true;

    return NextResponse.json({
      showDashboardProgressMeter,
      isSuperAdmin,
    });
  } catch (error: any) {
    console.error('Error fetching admin settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings', details: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user as any;
    const isSuperAdmin = Boolean(
      user.isSuperAdmin ||
      user.adminLevel === 0 ||
      user.username === 'superadmin' ||
      user.roleName === 'Super Administrator'
    );

    if (!isSuperAdmin) {
      return NextResponse.json(
        { error: 'Permission denied. Only Super Administrators have authority to toggle Real-Time Progress Meter visibility.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    if (typeof body.showDashboardProgressMeter !== 'boolean') {
      return NextResponse.json(
        { error: 'showDashboardProgressMeter must be a boolean value' },
        { status: 400 }
      );
    }

    const newValue = body.showDashboardProgressMeter;

    await updateDb((d) => {
      d.meta = d.meta || { lastWorkshopNumber: 0 };
      d.meta.showDashboardProgressMeter = newValue;
    });

    // Enterprise Audit Trail: Settings update
    logAuditEvent({
      user: {
        id: user.id,
        username: user.username,
        fullName: user.name || user.fullName,
        organizationId: user.organizationId,
        organizationName: user.organizationName || 'Ministry of Education',
        roleId: user.roleId,
        roleName: user.roleName,
      },
      category: 'Governance',
      action: 'SYSTEM_SETTINGS_UPDATED',
      entityType: 'SYSTEM_SETTINGS',
      entityId: 'meta-progress-meter',
      summary: `Updated system settings: Real-Time Progress Meter visibility toggled to ${newValue ? 'VISIBLE' : 'HIDDEN'}.`,
      details: {
        settingKey: 'showDashboardProgressMeter',
        newValue,
      },
      severity: 'Info',
    });

    return NextResponse.json({
      success: true,
      showDashboardProgressMeter: newValue,
      message: `Real-Time Progress Meter visibility updated to ${newValue ? 'VISIBLE to all users' : 'HIDDEN for regular users'}.`,
    });
  } catch (error: any) {
    console.error('Error updating admin settings:', error);
    return NextResponse.json({ error: 'Failed to update settings', details: error.message }, { status: 500 });
  }
}
