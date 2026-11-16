import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db, { getDb, updateDb } from '@/lib/db';
import { logAuditEvent } from '@/lib/auditLogger';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = await getDb();
  const rp = data.resourcePersons.find((r) => r.id === params.id);
  if (!rp) {
    return NextResponse.json({ error: 'Resource person not found' }, { status: 404 });
  }

  const workshop = rp.workshopId ? data.workshops.find((w) => w.id === rp.workshopId) : null;
  return NextResponse.json({
    resourcePerson: {
      ...rp,
      workshopTitle: workshop ? workshop.title : null,
      workshopNumber: workshop ? workshop.workshopNumber : null,
    },
  });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = await getDb();
    const rp = data.resourcePersons.find((r) => r.id === params.id);
    if (!rp) {
      return NextResponse.json({ error: 'Resource person not found' }, { status: 404 });
    }

    const {
      workshopId,
      personType,
      nic,
      passportNumber,
      citizenship,
      country,
      name,
      position,
      service,
      grade,
      workplace,
      personalAddress,
      educationalQualifications,
      subjectQualifications,
      phone,
      email,
      specialNotes,
      roleInWorkshop,
      organization,
      designation,
      expertiseArea,
      remarks,
    } = body;

    if (name !== undefined && !name.trim()) {
      return NextResponse.json({ error: 'Resource person name cannot be empty.' }, { status: 400 });
    }

    const now = new Date().toISOString();
    let updatedRP: any = null;

    await updateDb((d) => {
      const target = d.resourcePersons.find((r) => r.id === params.id);
      if (!target) return;

      if (workshopId !== undefined) {
        target.workshopId = (workshopId && workshopId !== 'none' && workshopId !== 'unassigned') ? workshopId.trim() : '';
      }
      if (personType !== undefined) target.personType = personType;
      if (nic !== undefined) target.nic = nic.trim().toUpperCase();
      if (passportNumber !== undefined) target.passportNumber = passportNumber.trim().toUpperCase();
      if (citizenship !== undefined) target.citizenship = citizenship.trim();
      if (country !== undefined) target.country = country.trim();
      if (name !== undefined) target.name = name.trim();
      if (position !== undefined || designation !== undefined) {
        target.position = (position || designation || '').trim();
        target.designation = target.position;
      }
      if (service !== undefined) target.service = service.trim();
      if (grade !== undefined) target.grade = grade.trim();
      if (workplace !== undefined || organization !== undefined) {
        target.workplace = (workplace || organization || '').trim();
        target.organization = target.workplace;
      }
      if (personalAddress !== undefined) target.personalAddress = personalAddress.trim();
      if (educationalQualifications !== undefined) target.educationalQualifications = educationalQualifications.trim();
      if (subjectQualifications !== undefined || expertiseArea !== undefined) {
        target.subjectQualifications = (subjectQualifications || expertiseArea || '').trim();
        target.expertiseArea = target.subjectQualifications;
      }
      if (phone !== undefined) target.phone = phone.trim();
      if (email !== undefined) target.email = email.trim();
      if (specialNotes !== undefined || remarks !== undefined) {
        target.specialNotes = (specialNotes || remarks || '').trim();
        target.remarks = target.specialNotes;
      }
      if (roleInWorkshop !== undefined) target.roleInWorkshop = roleInWorkshop.trim();
      target.updatedAt = now;
      updatedRP = target;
    });

    // Enterprise Audit Trail: Resource Person Update
    if (updatedRP) {
      const rpUser = session.user as any;
      logAuditEvent({
        user: {
          id: rpUser.id,
          username: rpUser.username,
          fullName: rpUser.name || rpUser.fullName,
          organizationId: rpUser.organizationId,
          organizationName: rpUser.organizationName || 'Ministry of Education',
          roleId: rpUser.roleId,
          roleName: rpUser.roleName,
        },
        category: 'Operational',
        action: 'RESOURCE_PERSON_UPDATED',
        entityType: 'RESOURCE_PERSON',
        entityId: params.id,
        summary: `Updated profile for resource person "${updatedRP.name}" (${updatedRP.nic || updatedRP.passportNumber}).`,
        details: {
          id: params.id,
          name: updatedRP.name,
          updatedFields: Object.keys(body),
        },
        severity: 'Info',
      });
    }

    return NextResponse.json({ success: true, resourcePerson: updatedRP });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update resource person' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = await getDb();
  const rp = data.resourcePersons.find((r) => r.id === params.id);
  if (!rp) {
    return NextResponse.json({ error: 'Resource person not found' }, { status: 404 });
  }

  await updateDb((d) => {
    d.resourcePersons = d.resourcePersons.filter((r) => r.id !== params.id);
  });

  // Enterprise Audit Trail: Resource Person Deletion
  const rpUser = session.user as any;
  logAuditEvent({
    user: {
      id: rpUser.id,
      username: rpUser.username,
      fullName: rpUser.name || rpUser.fullName,
      organizationId: rpUser.organizationId,
      organizationName: rpUser.organizationName || 'Ministry of Education',
      roleId: rpUser.roleId,
      roleName: rpUser.roleName,
    },
    category: 'Operational',
    action: 'RESOURCE_PERSON_DELETED',
    entityType: 'RESOURCE_PERSON',
    entityId: params.id,
    summary: `Deleted resource person "${rp.name}" (${rp.nic || rp.passportNumber}).`,
    details: {
      id: params.id,
      name: rp.name,
      nic: rp.nic,
      passportNumber: rp.passportNumber,
    },
    severity: 'Warning',
  });

  return NextResponse.json({ success: true, message: 'Resource person deleted' });
}
