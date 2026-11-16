import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db, { getDb, updateDb, ResourcePerson } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { logAuditEvent } from '@/lib/auditLogger';
import {
  validateSriLankanNic,
  validateSriLankanPassport,
  validateForeignPassport,
  validatePhone,
  validateEmail,
  findSimilarResourcePersons,
} from '@/lib/idValidation';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const checkDuplicate = searchParams.get('checkDuplicate');
  const workshopId = searchParams.get('workshopId');
  const search = (searchParams.get('search') || '').trim().toLowerCase();

  const data = await getDb();
  let list = data.resourcePersons || [];

  // Fast duplicate similarity check endpoint
  if (checkDuplicate === '1') {
    const candidate = {
      id: searchParams.get('id') || '',
      personType: searchParams.get('personType') || 'local',
      nic: searchParams.get('nic') || '',
      passportNumber: searchParams.get('passportNumber') || '',
      name: searchParams.get('name') || '',
      phone: searchParams.get('phone') || '',
      email: searchParams.get('email') || '',
      workplace: searchParams.get('workplace') || '',
    };
    const matches = findSimilarResourcePersons(candidate, list);
    return NextResponse.json({ matches });
  }

  if (workshopId === 'unassigned') {
    list = list.filter((r) => !r.workshopId || r.workshopId === 'general');
  } else if (workshopId && workshopId !== 'all') {
    list = list.filter((r) => r.workshopId === workshopId);
  }

  if (search) {
    list = list.filter((r) =>
      (r.name && r.name.toLowerCase().includes(search)) ||
      (r.nic && r.nic.toLowerCase().includes(search)) ||
      (r.passportNumber && r.passportNumber.toLowerCase().includes(search)) ||
      (r.citizenship && r.citizenship.toLowerCase().includes(search)) ||
      (r.country && r.country.toLowerCase().includes(search)) ||
      (r.position && r.position.toLowerCase().includes(search)) ||
      (r.workplace && r.workplace.toLowerCase().includes(search)) ||
      (r.subjectQualifications && r.subjectQualifications.toLowerCase().includes(search)) ||
      (r.educationalQualifications && r.educationalQualifications.toLowerCase().includes(search))
    );
  }

  // Enrich with workshop info
  const workshopMap = new Map((data.workshops || []).map((w) => [w.id, w]));
  const enriched = list.map((rp) => {
    const ws = rp.workshopId ? workshopMap.get(rp.workshopId) : null;
    return {
      ...rp,
      workshopTitle: ws ? ws.title : null,
      workshopNumber: ws ? ws.workshopNumber : null,
    };
  });

  return NextResponse.json({ resourcePersons: enriched });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      workshopId,
      serialNumber,
      personType = 'local',
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
      forceDuplicate = false,
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Resource person name is required.' }, { status: 400 });
    }

    const isForeign = personType === 'foreign';
    const resolvedCountry = (country || citizenship || (isForeign ? '' : 'Sri Lanka')).trim();
    const resolvedNic = (nic || '').trim().toUpperCase();
    const resolvedPassport = (passportNumber || '').trim().toUpperCase();

    // ── Validations ──
    if (isForeign) {
      if (!resolvedCountry) {
        return NextResponse.json({ error: 'Citizenship / Country is required for foreign resource persons.' }, { status: 400 });
      }
      if (!resolvedPassport) {
        return NextResponse.json({ error: 'Passport Number is required for foreign resource persons.' }, { status: 400 });
      }
      const passportCheck = validateForeignPassport(resolvedPassport);
      if (!passportCheck.isValid) {
        return NextResponse.json({ error: passportCheck.error }, { status: 400 });
      }
    } else {
      // Sri Lankan Citizen
      if (!resolvedNic && !resolvedPassport) {
        return NextResponse.json({
          error: 'National Identity Card (NIC) or Sri Lankan Passport Number is required for Sri Lankan resource persons.',
        }, { status: 400 });
      }

      if (resolvedNic) {
        const nicCheck = validateSriLankanNic(resolvedNic);
        if (!nicCheck.isValid) {
          return NextResponse.json({ error: nicCheck.error }, { status: 400 });
        }
      }

      if (resolvedPassport) {
        const passportCheck = validateSriLankanPassport(resolvedPassport);
        if (!passportCheck.isValid) {
          return NextResponse.json({ error: passportCheck.error }, { status: 400 });
        }
      }
    }

    // Phone & Email Validation if provided
    if (phone && phone.trim()) {
      const phoneCheck = validatePhone(phone);
      if (!phoneCheck.isValid) {
        return NextResponse.json({ error: phoneCheck.error }, { status: 400 });
      }
    }

    if (email && email.trim()) {
      const emailCheck = validateEmail(email);
      if (!emailCheck.isValid) {
        return NextResponse.json({ error: emailCheck.error }, { status: 400 });
      }
    }

    const data = await getDb();
    const existingList = data.resourcePersons || [];

    // Duplicate Check: exact NIC or exact Passport
    if (!forceDuplicate) {
      const exactMatch = existingList.find((r) => {
        if (resolvedNic && r.nic && r.nic.toUpperCase() === resolvedNic) return true;
        if (resolvedPassport && r.passportNumber && r.passportNumber.toUpperCase() === resolvedPassport) return true;
        return false;
      });

      if (exactMatch) {
        return NextResponse.json({
          error: `Resource person "${exactMatch.name}" is already registered with this ${resolvedNic ? `NIC (${resolvedNic})` : `Passport (${resolvedPassport})`}.`,
          duplicateFound: true,
          existingRecord: exactMatch,
        }, { status: 409 });
      }
    }

    const now = new Date().toISOString();
    let newRP: ResourcePerson | null = null;

    await updateDb((d) => {
      if (!d.resourcePersons) d.resourcePersons = [];

      const resolvedWsId = (workshopId && workshopId.trim() !== '' && workshopId !== 'none' && workshopId !== 'unassigned')
        ? workshopId.trim()
        : '';

      const maxSerial = d.resourcePersons.reduce((max, r) => Math.max(max, r.serialNumber || 0), 0);
      const computedSerial = serialNumber && Number(serialNumber) > 0 && !d.resourcePersons.some((r) => r.serialNumber === Number(serialNumber))
        ? Number(serialNumber)
        : maxSerial + 1;

      const resolvedWorkplace = (workplace || organization || '').trim();
      const resolvedPosition = (position || designation || '').trim();
      const resolvedSubjectQuals = (subjectQualifications || expertiseArea || '').trim();
      const resolvedNotes = (specialNotes || remarks || '').trim();

      newRP = {
        id: uuidv4(),
        workshopId: resolvedWsId,
        serialNumber: computedSerial,
        personType: isForeign ? 'foreign' : 'local',
        nic: resolvedNic,
        passportNumber: resolvedPassport,
        citizenship: resolvedCountry,
        country: resolvedCountry,
        name: name.trim(),
        position: resolvedPosition || 'Resource Person',
        service: (service || '').trim(),
        grade: (grade || '').trim(),
        workplace: resolvedWorkplace || 'Ministry of Education',
        personalAddress: (personalAddress || '').trim(),
        educationalQualifications: (educationalQualifications || '').trim(),
        subjectQualifications: resolvedSubjectQuals,
        phone: (phone || '').trim(),
        specialNotes: resolvedNotes,
        organization: resolvedWorkplace || 'Ministry of Education',
        designation: resolvedPosition || 'Resource Person',
        expertiseArea: resolvedSubjectQuals,
        roleInWorkshop: (roleInWorkshop || 'Lead Facilitator').trim(),
        email: (email || '').trim(),
        remarks: resolvedNotes,
        createdAt: now,
        updatedAt: now,
      };

      d.resourcePersons.push(newRP);

      if (resolvedWsId) {
        const w = d.workshops.find((item) => item.id === resolvedWsId);
        if (w) w.updatedAt = now;
      }
    });

    // Enterprise Audit Trail: Resource Person Registration
    if (newRP) {
      const rpUser = session.user as any;
      const rpItem: ResourcePerson = newRP;
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
        action: 'RESOURCE_PERSON_REGISTERED',
        entityType: 'RESOURCE_PERSON',
        entityId: rpItem.id,
        summary: `Registered resource person "${rpItem.name}" (${rpItem.personType === 'foreign' ? `Foreign: ${rpItem.country}` : `NIC: ${rpItem.nic}`}) with role "${rpItem.roleInWorkshop}".`,
        details: {
          resourcePersonId: rpItem.id,
          name: rpItem.name,
          personType: rpItem.personType,
          nic: rpItem.nic,
          passportNumber: rpItem.passportNumber,
          citizenship: rpItem.citizenship,
          workplace: rpItem.workplace,
          position: rpItem.position,
        },
        severity: 'Info',
      });
    }

    return NextResponse.json({ success: true, resourcePerson: newRP }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to register resource person' }, { status: 500 });
  }
}
