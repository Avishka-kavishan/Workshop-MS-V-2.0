import { NextRequest, NextResponse } from 'next/server';
import { getDb, updateDb, CalendarSubscriber, DEFAULT_CALENDAR_SUBSCRIBERS } from '@/lib/db';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const data = await getDb();
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get('branchId');

    let subscribers = data.calendarSubscribers || [];

    // Initialize defaults if empty
    if (!subscribers || subscribers.length === 0) {
      subscribers = [...DEFAULT_CALENDAR_SUBSCRIBERS];
      await updateDb((dbData) => {
        dbData.calendarSubscribers = subscribers;
      });
    }

    if (branchId && branchId !== 'all') {
      // Filter by branch or include matching branch items
      const branchSubs = subscribers.filter((s) => s.branchId === branchId);
      // If branch has no specific subscribers yet, return generalized subscribers adapted to this branch
      if (branchSubs.length > 0) {
        subscribers = branchSubs;
      }
    }

    return NextResponse.json({
      subscribers,
      counts: {
        total: subscribers.length,
        google: subscribers.filter((s) => s.platform === 'Google Calendar').length,
        apple: subscribers.filter((s) => s.platform === 'Apple Calendar').length,
        outlook: subscribers.filter((s) => s.platform === 'Outlook').length,
      },
    });
  } catch (err: any) {
    console.error('Error fetching calendar subscribers:', err);
    return NextResponse.json({ error: 'Failed to fetch subscribers' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      officerName,
      email,
      platform = 'Google Calendar',
      branchId = 'org-moe-ict',
      branchName = 'MOE ICT Branch',
      role = 'Branch Officer',
      notificationOnChanges = true,
    } = body;

    if (!officerName || !email) {
      return NextResponse.json({ error: 'Officer Name and Email are required.' }, { status: 400 });
    }

    const newSubscriber: CalendarSubscriber = {
      id: `sub-${randomUUID().slice(0, 8)}`,
      branchId,
      branchName,
      officerName: officerName.trim(),
      email: email.trim().toLowerCase(),
      platform: platform as any,
      role: role.trim(),
      status: 'Active',
      lastSyncedAt: 'Just now',
      notificationOnChanges: Boolean(notificationOnChanges),
      createdAt: new Date().toISOString(),
    };

    let updatedList: CalendarSubscriber[] = [];

    await updateDb((dbData) => {
      dbData.calendarSubscribers = dbData.calendarSubscribers || [...DEFAULT_CALENDAR_SUBSCRIBERS];
      dbData.calendarSubscribers.unshift(newSubscriber);
      updatedList = dbData.calendarSubscribers;
    });

    return NextResponse.json({ success: true, subscriber: newSubscriber, subscribers: updatedList });
  } catch (err: any) {
    console.error('Error adding subscriber:', err);
    return NextResponse.json({ error: 'Failed to add subscriber' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Subscriber ID is required' }, { status: 400 });
    }

    await updateDb((dbData) => {
      dbData.calendarSubscribers = (dbData.calendarSubscribers || []).filter((s) => s.id !== id);
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error deleting subscriber:', err);
    return NextResponse.json({ error: 'Failed to delete subscriber' }, { status: 500 });
  }
}
