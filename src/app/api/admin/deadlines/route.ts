import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb, updateDb, SystemDeadline } from '@/lib/db';

function isSuperAdminUser(user: any): boolean {
  if (!user) return false;
  return (
    user.isSuperAdmin ||
    user.username === 'superadmin' ||
    user.username === 'admin' ||
    user.roleName === 'Super Administrator' ||
    user.roleName === 'System Administrator'
  );
}

export async function GET(req: NextRequest) {
  const data = await getDb();
  const sorted = [...(data.deadlines || [])].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  return NextResponse.json({ deadlines: sorted });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  if (!isSuperAdminUser(user)) {
    return NextResponse.json({ error: 'Unauthorized: Super Administrator privileges required' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const {
      title,
      financialYear = '2027',
      category = 'AIP Submission',
      targetLevel = 'All',
      targetBranchIds,
      dueDate,
      reminderDays = 7,
      description = '',
      status = 'Active',
    } = body;

    if (!title || !dueDate) {
      return NextResponse.json({ error: 'Title and Due Date are required.' }, { status: 400 });
    }

    const newDeadline: SystemDeadline = {
      id: `dl-${Date.now()}`,
      title: title.trim(),
      financialYear: String(financialYear),
      category: category as any,
      targetLevel,
      targetBranchIds,
      dueDate,
      reminderDays: Number(reminderDays) || 7,
      description,
      status: status as any,
      createdAt: new Date().toISOString(),
      createdBy: user?.id || 'user-superadmin',
    };

    await updateDb((draft) => {
      draft.deadlines.unshift(newDeadline);
    });

    return NextResponse.json({ success: true, deadline: newDeadline });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  if (!isSuperAdminUser(user)) {
    return NextResponse.json({ error: 'Unauthorized: Super Administrator privileges required' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { id, title, dueDate, status, reminderDays, description, targetLevel } = body;

    if (!id) {
      return NextResponse.json({ error: 'Deadline ID is required.' }, { status: 400 });
    }

    let updatedRecord: SystemDeadline | null = null;

    await updateDb((draft) => {
      const idx = draft.deadlines.findIndex((d) => d.id === id);
      if (idx !== -1) {
        draft.deadlines[idx] = {
          ...draft.deadlines[idx],
          ...(title ? { title: title.trim() } : {}),
          ...(dueDate ? { dueDate } : {}),
          ...(status ? { status } : {}),
          ...(reminderDays !== undefined ? { reminderDays: Number(reminderDays) } : {}),
          ...(description !== undefined ? { description } : {}),
          ...(targetLevel !== undefined ? { targetLevel } : {}),
        };
        updatedRecord = draft.deadlines[idx];
      }
    });

    if (!updatedRecord) {
      return NextResponse.json({ error: 'Deadline not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, deadline: updatedRecord });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  if (!isSuperAdminUser(user)) {
    return NextResponse.json({ error: 'Unauthorized: Super Administrator privileges required' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'ID parameter required.' }, { status: 400 });
  }

  await updateDb((draft) => {
    draft.deadlines = draft.deadlines.filter((d) => d.id !== id);
  });

  return NextResponse.json({ success: true, message: `Deadline ${id} deleted.` });
}
