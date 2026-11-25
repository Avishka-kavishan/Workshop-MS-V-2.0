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
    const enableBranchApprovalChain = db.meta?.enableBranchApprovalChain ?? true;

    return NextResponse.json({
      showDashboardProgressMeter,
      enableBranchApprovalChain,
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
    const hasMeter = typeof body.showDashboardProgressMeter === 'boolean';
    const hasChain = typeof body.enableBranchApprovalChain === 'boolean';

    if (!hasMeter && !hasChain) {
      return NextResponse.json(
        { error: 'At least one boolean setting (showDashboardProgressMeter or enableBranchApprovalChain) is required' },
        { status: 400 }
      );
    }

    let updatedMeter: boolean | undefined;
    let updatedChain: boolean | undefined;

    await updateDb((d) => {
      d.meta = d.meta || { lastWorkshopNumber: 0 };
      if (hasMeter) {
        d.meta.showDashboardProgressMeter = body.showDashboardProgressMeter;
      }
      if (hasChain) {
        d.meta.enableBranchApprovalChain = body.enableBranchApprovalChain;
      }
      updatedMeter = d.meta.showDashboardProgressMeter ?? true;
      updatedChain = d.meta.enableBranchApprovalChain ?? true;
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
      entityId: hasChain ? 'meta-branch-approval-chain' : 'meta-progress-meter',
      summary: hasChain
        ? `Updated system settings: Branch Approval Chain (Director -> Additional Secretary) ${updatedChain ? 'ACTIVATED' : 'DEACTIVATED (Direct Send to Planning)'}.`
        : `Updated system settings: Real-Time Progress Meter visibility toggled to ${updatedMeter ? 'VISIBLE' : 'HIDDEN'}.`,
      details: {
        showDashboardProgressMeter: updatedMeter,
        enableBranchApprovalChain: updatedChain,
      },
      severity: 'Info',
    });

    return NextResponse.json({
      success: true,
      showDashboardProgressMeter: updatedMeter,
      enableBranchApprovalChain: updatedChain,
      message: hasChain
        ? `Branch Approval Chain (Director → Additional Secretary) is now ${updatedChain ? 'ACTIVE' : 'DEACTIVATED (Direct Send to Planning)'}.`
        : `Real-Time Progress Meter visibility updated to ${updatedMeter ? 'VISIBLE to all users' : 'HIDDEN for regular users'}.`,
    });
  } catch (error: any) {
    console.error('Error updating admin settings:', error);
    return NextResponse.json({ error: 'Failed to update settings', details: error.message }, { status: 500 });
  }
}
