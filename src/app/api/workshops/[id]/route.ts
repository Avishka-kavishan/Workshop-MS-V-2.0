import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db, { getDb, updateDb } from '@/lib/db';
import { canUserViewWorkshop, canUserManageParticipants, canUserRescheduleWorkshop } from '@/lib/permissions';
import { computeWorkshopStatus } from '@/lib/workshopStatus';
import { logAuditEvent } from '@/lib/auditLogger';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = session.user as any;
  const data = await getDb();
  const workshop = data.workshops.find((w) => w.id === params.id);

  if (!workshop) {
    return NextResponse.json({ error: 'Workshop not found' }, { status: 404 });
  }

  if (!canUserViewWorkshop(user, workshop)) {
    return NextResponse.json({ error: 'Access denied: You do not have permission to view this workshop.' }, { status: 403 });
  }

  const organizingOrg = data.organizations.find((o) => o.id === workshop.organizingOrgId);
  const placeOrg = data.organizations.find((o) => o.id === (workshop.placeId || workshop.targetOrgId));
  const creator = data.users.find((u) => u.id === workshop.createdBy);

  const trainees = data.trainees.filter((t) => t.workshopId === workshop.id);
  const resourcePersons = data.resourcePersons.filter((r) => r.workshopId === workshop.id);

  const canManage = canUserManageParticipants(user, workshop);
  const canReschedule = canUserRescheduleWorkshop(user, workshop);
  const rescheduleHistory = (data.workshopReschedules || [])
    .filter((r) => r.workshopId === workshop.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return NextResponse.json({
    workshop: {
      ...workshop,
      year: workshop.year || (workshop.startDate ? new Date(workshop.startDate).getFullYear().toString() : '2025'),
      branch: workshop.branch || organizingOrg?.name || 'MOE Branch',
      subject: workshop.subject || 'General Curriculum',
      aim: workshop.aim || workshop.objective || '',
      placeId: workshop.placeId || workshop.targetOrgId,
      placeName: workshop.placeName || placeOrg?.name || 'Local Zonal Branch',
      daysHeld: workshop.daysHeld || 2,
      status: computeWorkshopStatus(workshop).status,
      statusName: computeWorkshopStatus(workshop).statusName,
      statusId: computeWorkshopStatus(workshop).statusId,
      confirmationStatus: workshop.confirmationStatus || 'Confirmed',
      organizingOrgName: organizingOrg?.name || workshop.branch || 'MOE Branch',
      targetOrgName: workshop.placeName || placeOrg?.name || 'Host Branch',
      creatorName: creator?.fullName || 'Authorized Officer',
      creatorEmail: creator?.email || '',
      trainees,
      resourcePersons,
      rescheduleHistory,
      canManageParticipants: canManage,
      canReschedule,
    },
  });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = session.user as any;
  const data = await getDb();
  const workshop = data.workshops.find((w) => w.id === params.id);

  if (!workshop) {
    return NextResponse.json({ error: 'Workshop not found' }, { status: 404 });
  }

  const isSuperAdmin = Boolean(user.isSuperAdmin || user.adminLevel === 0 || user.roleId === 'role-superadmin');
  const isMinistryAdmin = Boolean(user.adminLevel === 1 || user.roleId === 'role-admin' || user.username === 'admin');
  const isCreator = Boolean(workshop.createdBy && workshop.createdBy === user.id);
  const isOrganizingBranch = Boolean(
    (workshop.organizingOrgId && user.organizationId && workshop.organizingOrgId === user.organizationId) ||
    (workshop.branch && user.organizationName && workshop.branch.toLowerCase().includes(user.organizationName.toLowerCase())) ||
    (workshop.branch && user.organizationName && user.organizationName.toLowerCase().includes(workshop.branch.toLowerCase()))
  );
  const isRescheduler = canUserRescheduleWorkshop(user, workshop, data.organizations);

  if (!isSuperAdmin && !isMinistryAdmin && !isCreator && !isOrganizingBranch && !isRescheduler) {
    return NextResponse.json(
      { error: 'Permission denied: You do not have authority to modify this workshop.' },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const {
      status,
      confirmationStatus,
      title,
      aim,
      expectedOutput,
      daysHeld,
      venue,
      aipActivityId,
      aipActivityCode,
      aipActivityTitle,
      budgetBreakdown,
      expenditureBreakdown,
      commitments,
      actualPaid,
      objectCode,
      fundingSource,
    } = body;

    const now = new Date().toISOString();

    await updateDb((d) => {
      const w = d.workshops.find((item) => item.id === params.id);
      if (w) {
        if (status) {
          w.status = status;
          w.statusName = status;
        }
        if (confirmationStatus) {
          w.confirmationStatus = confirmationStatus;
        }
        if (title) w.title = title.trim();
        if (aim !== undefined) w.aim = aim.trim();
        if (expectedOutput !== undefined) w.expectedOutput = expectedOutput.trim();
        if (daysHeld) w.daysHeld = parseInt(daysHeld, 10);
        if (venue !== undefined) w.venue = venue.trim();
        if (aipActivityId !== undefined) w.aipActivityId = aipActivityId;
        if (aipActivityCode !== undefined) w.aipActivityCode = aipActivityCode;
        if (aipActivityTitle !== undefined) w.aipActivityTitle = aipActivityTitle;
        if (budgetBreakdown !== undefined) w.budgetBreakdown = budgetBreakdown;
        if (expenditureBreakdown !== undefined) w.expenditureBreakdown = expenditureBreakdown;
        if (commitments !== undefined) w.commitments = Number(commitments);
        if (actualPaid !== undefined) w.actualPaid = Number(actualPaid);
        if (objectCode !== undefined) w.objectCode = objectCode;
        if (fundingSource !== undefined) w.fundingSource = fundingSource;
        w.updatedAt = now;
      }
    });

    // Enterprise Audit Trail: Workshop Update
    logAuditEvent({
      user: {
        id: user.id,
        username: user.username,
        fullName: user.name || user.fullName,
        organizationId: user.organizationId,
        organizationName: user.organizationName || workshop.branch,
        roleId: user.roleId,
        roleName: user.roleName,
      },
      category: 'Operational',
      action: 'WORKSHOP_UPDATED',
      entityType: 'WORKSHOP',
      entityId: workshop.id,
      summary: `Updated workshop "${workshop.title}" (${workshop.workshopNumber || workshop.id})${status ? ` - status changed to ${status}` : ''}.`,
      details: {
        workshopId: workshop.id,
        workshopNumber: workshop.workshopNumber,
        newStatus: status || workshop.status,
        updatedFields: Object.keys(body),
      },
      severity: 'Info',
    });

    return NextResponse.json({ success: true, message: 'Workshop updated successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update workshop' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = await getDb();
  const workshop = data.workshops.find((w) => w.id === params.id);

  if (!workshop) {
    return NextResponse.json({ error: 'Workshop not found' }, { status: 404 });
  }

  const user = session.user as any;
  const isSuperAdmin = Boolean(user.isSuperAdmin || user.adminLevel === 0 || user.roleId === 'role-superadmin');
  const isMinistryAdmin = Boolean(user.adminLevel === 1 || user.roleId === 'role-admin' || user.username === 'admin');
  const isCreator = Boolean(workshop.createdBy && workshop.createdBy === user.id);
  const isOrganizingBranch = Boolean(
    (workshop.organizingOrgId && user.organizationId && workshop.organizingOrgId === user.organizationId) ||
    (workshop.branch && user.organizationName && workshop.branch.toLowerCase().includes(user.organizationName.toLowerCase())) ||
    (workshop.branch && user.organizationName && user.organizationName.toLowerCase().includes(workshop.branch.toLowerCase()))
  );

  if (!isSuperAdmin && !isMinistryAdmin && !isCreator && !isOrganizingBranch) {
    return NextResponse.json(
      { error: 'Permission denied: You do not have authority to delete this workshop.' },
      { status: 403 }
    );
  }

  await updateDb((d) => {
    d.workshops = d.workshops.filter((w) => w.id !== params.id);
    d.trainees = d.trainees.filter((t) => t.workshopId !== params.id);
    d.resourcePersons = d.resourcePersons.filter((r) => r.workshopId !== params.id);
  });

  // Enterprise Audit Trail: Workshop Deletion (Warning Severity)
  logAuditEvent({
    user: {
      id: user.id,
      username: user.username,
      fullName: user.name || user.fullName,
      organizationId: user.organizationId,
      organizationName: user.organizationName || workshop.branch,
      roleId: user.roleId,
      roleName: user.roleName,
    },
    category: 'Operational',
    action: 'WORKSHOP_DELETED',
    entityType: 'WORKSHOP',
    entityId: workshop.id,
    summary: `Deleted workshop "${workshop.title}" (${workshop.workshopNumber || workshop.id}) of ${workshop.branch}.`,
    details: {
      workshopId: workshop.id,
      workshopNumber: workshop.workshopNumber,
      branch: workshop.branch,
      title: workshop.title,
    },
    severity: 'Warning',
  });

  return NextResponse.json({ success: true, message: 'Workshop deleted successfully' });
}
