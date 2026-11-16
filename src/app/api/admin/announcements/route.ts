import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb, updateDb, Announcement } from '@/lib/db';
import { logAuditEvent } from '@/lib/auditLogger';

function isAuthorizedAdmin(user: any): boolean {
  if (!user) return false;
  return (
    user.isSuperAdmin ||
    user.isLevelAdmin ||
    user.adminLevel !== undefined ||
    user.username === 'superadmin' ||
    user.username === 'admin' ||
    user.username === 'moe.admin' ||
    user.username === 'nie.admin' ||
    user.username === 'provincial.admin' ||
    user.username === 'zonal.admin' ||
    user.username === 'divisional.admin' ||
    user.roleName?.includes('Administrator') ||
    user.roleName?.includes('Admin')
  );
}

export async function GET(req: NextRequest) {
  const data = await getDb();
  const { searchParams } = new URL(req.url);
  const all = searchParams.get('all') === 'true';

  let list = data.announcements || [];
  if (!all) {
    list = list.filter((a) => a.isPublished);
  }

  const sorted = [...list].sort((a, b) => new Date(b.publishDate || b.createdAt).getTime() - new Date(a.publishDate || a.createdAt).getTime());
  return NextResponse.json({ announcements: sorted });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  if (!isAuthorizedAdmin(user)) {
    return NextResponse.json({ error: 'Unauthorized: Administrator privileges required' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const {
      title,
      circularNumber = '',
      content,
      priority = 'Normal',
      targetLevel = 'All',
      targetBranchIds,
      publishDate = new Date().toISOString().split('T')[0],
      expiryDate,
      isPublished = true,
      authorName = user?.name || 'Super Administrator',
    } = body;

    if (!title || !content) {
      return NextResponse.json({ error: 'Title and Content are required.' }, { status: 400 });
    }

    const newAnnouncement: Announcement = {
      id: `ann-${Date.now()}`,
      title: title.trim(),
      circularNumber: circularNumber.trim() || undefined,
      content: content.trim(),
      priority: priority as any,
      targetLevel,
      targetBranchIds,
      publishDate,
      expiryDate,
      isPublished: Boolean(isPublished),
      authorName,
      createdAt: new Date().toISOString(),
      createdBy: user?.id || 'user-superadmin',
    };

    await updateDb((draft) => {
      draft.announcements.unshift(newAnnouncement);
    });

    // Enterprise Audit Trail: Announcement Published
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
      action: 'ANNOUNCEMENT_PUBLISHED',
      entityType: 'COMMUNICATION',
      entityId: newAnnouncement.id,
      summary: `Published national announcement "${newAnnouncement.title}" [Priority: ${newAnnouncement.priority}].`,
      details: {
        announcementId: newAnnouncement.id,
        title: newAnnouncement.title,
        circularNumber: newAnnouncement.circularNumber,
        priority: newAnnouncement.priority,
        targetLevel: newAnnouncement.targetLevel,
      },
      severity: newAnnouncement.priority === 'High' ? 'Warning' : 'Info',
    });

    return NextResponse.json({ success: true, announcement: newAnnouncement });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  if (!isAuthorizedAdmin(user)) {
    return NextResponse.json({ error: 'Unauthorized: Administrator privileges required' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { id, title, circularNumber, content, priority, targetLevel, isPublished, expiryDate } = body;

    if (!id) {
      return NextResponse.json({ error: 'Announcement ID is required.' }, { status: 400 });
    }

    let updatedRecord: Announcement | null = null;

    await updateDb((draft) => {
      const idx = draft.announcements.findIndex((a) => a.id === id);
      if (idx !== -1) {
        draft.announcements[idx] = {
          ...draft.announcements[idx],
          ...(title ? { title: title.trim() } : {}),
          ...(circularNumber !== undefined ? { circularNumber: circularNumber.trim() || undefined } : {}),
          ...(content ? { content: content.trim() } : {}),
          ...(priority ? { priority } : {}),
          ...(targetLevel !== undefined ? { targetLevel } : {}),
          ...(typeof isPublished === 'boolean' ? { isPublished } : {}),
          ...(expiryDate !== undefined ? { expiryDate } : {}),
        };
        updatedRecord = draft.announcements[idx];
      }
    });

    if (!updatedRecord) {
      return NextResponse.json({ error: 'Announcement not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, announcement: updatedRecord });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  if (!isAuthorizedAdmin(user)) {
    return NextResponse.json({ error: 'Unauthorized: Administrator privileges required' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'ID parameter required.' }, { status: 400 });
  }

  await updateDb((draft) => {
    draft.announcements = draft.announcements.filter((a) => a.id !== id);
  });

  return NextResponse.json({ success: true, message: `Announcement ${id} deleted.` });
}
