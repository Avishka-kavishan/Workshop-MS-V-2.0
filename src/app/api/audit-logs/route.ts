import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAuditLogs, getAuditStats, logAuditEvent } from '@/lib/auditLogger';

export const dynamic = 'force-dynamic';

function isSuperAdminUser(user: any): boolean {
  if (!user) return false;
  return (
    user.isSuperAdmin === true ||
    user.adminLevel === 0 ||
    user.adminLevel === 1 ||
    user.roleId === 'role-superadmin' ||
    user.roleId === 'role-admin' ||
    user.username === 'superadmin' ||
    user.username === 'admin' ||
    user.roleName === 'Super Administrator' ||
    user.roleName === 'System Administrator'
  );
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user as any;

    // Strict Super Admin Access Control Gate
    if (!isSuperAdminUser(user)) {
      return NextResponse.json(
        {
          error: 'Access Denied: Enterprise System Audit Log is restricted strictly to Super Administrators.',
          requiresSuperAdmin: true,
          currentRole: user.roleName || user.roleId || 'Standard User',
          currentUser: user.username,
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category') || undefined;
    const entityType = searchParams.get('entityType') || undefined;
    const username = searchParams.get('username') || undefined;
    const severity = searchParams.get('severity') || undefined;
    const search = searchParams.get('search') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const limit = parseInt(searchParams.get('limit') || '250', 10);
    const includeStats = searchParams.get('includeStats') !== 'false';

    const [auditData, stats] = await Promise.all([
      getAuditLogs({
        category,
        entityType,
        username,
        severity,
        search,
        startDate,
        endDate,
        limit,
      }),
      includeStats ? getAuditStats() : Promise.resolve(null),
    ]);

    return NextResponse.json({
      success: true,
      total: auditData.total,
      totalInDb: auditData.totalInDb,
      logs: auditData.logs,
      stats,
    });
  } catch (error: any) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit logs', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user as any;
    const body = await req.json();
    const {
      category = 'Operational',
      action,
      entityType = 'APPLICATION',
      entityId,
      summary,
      details = {},
      severity = 'Info',
    } = body;

    if (!action || !summary) {
      return NextResponse.json(
        { error: 'Action and summary are required for audit logging.' },
        { status: 400 }
      );
    }

    // Capture client IP and User Agent from request headers
    const ipAddress =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'Browser Client';

    const logEntry = await logAuditEvent({
      user: {
        id: user.id,
        username: user.username,
        fullName: user.name || user.fullName,
        organizationId: user.organizationId,
        organizationName: user.organizationName,
        roleId: user.roleId,
        roleName: user.roleName,
      },
      category,
      action,
      entityType,
      entityId: entityId || `ref-${Date.now()}`,
      summary,
      details,
      severity,
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ success: true, logEntry }, { status: 201 });
  } catch (error: any) {
    console.error('Error recording client audit event:', error);
    return NextResponse.json(
      { error: 'Failed to record audit event', details: error.message },
      { status: 500 }
    );
  }
}
