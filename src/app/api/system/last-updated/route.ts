import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

let cachedPublicPayload: any = null;
let lastPublicCacheTime = 0;
const PUBLIC_CACHE_TTL_MS = 5000;

function formatSLST(timestamp: number | string | Date): string {
  const date = new Date(timestamp);
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Colombo',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  return formatter.format(date).replace(/am|pm/i, (m) => m.toUpperCase()) + ' SLST';
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    const db = await getDb();
    const now = Date.now();

    // 1. If user is logged in, find their organization / user last updated time
    if (user) {
      const orgId = user.organizationId;
      const userId = user.id;
      const username = user.username;
      const dates: number[] = [];

      const addDate = (d: any) => {
        if (!d) return;
        const t = new Date(d).getTime();
        if (!isNaN(t) && t <= now) {
          dates.push(t);
        }
      };

      // User lastLogin, updatedAt, createdAt
      const userRecord = (db.users || []).find((u) => u.id === userId || u.username === username);
      if (userRecord?.lastLogin) addDate(userRecord.lastLogin);
      if ((userRecord as any)?.updatedAt) addDate((userRecord as any).updatedAt);
      if (userRecord?.createdAt) addDate(userRecord.createdAt);

      // Org updatedAt, createdAt
      const orgRecord = (db.organizations || []).find((o) => o.id === orgId);
      if ((orgRecord as any)?.updatedAt) addDate((orgRecord as any).updatedAt);
      if (orgRecord?.createdAt) addDate(orgRecord.createdAt);

      // Audit logs
      (db.auditLogs || []).forEach((l) => {
        if (l.organizationId === orgId || l.userId === userId || l.username === username) {
          addDate(l.timestamp);
        }
      });

      // AIP Plans
      (db.aipPlans || []).forEach((p) => {
        if (p.branchId === orgId || (p as any).organizationId === orgId) {
          addDate(p.updatedAt);
          addDate(p.submittedAt);
          addDate(p.approvedAt);
          addDate(p.createdAt);
        }
      });

      // AIP Activities
      (db.aipActivities || []).forEach((a) => {
        if (a.branchId === orgId || (a as any).organizationId === orgId) {
          addDate(a.updatedAt);
          addDate(a.createdAt);
        }
      });

      // Workshops
      (db.workshops || []).forEach((w: any) => {
        if (
          w.organizationId === orgId ||
          w.organizerId === orgId ||
          w.targetOrgId === orgId ||
          w.placeId === orgId ||
          w.createdById === userId
        ) {
          addDate(w.updatedAt);
          addDate(w.createdAt);
        }
      });

      if (dates.length > 0) {
        const maxTs = Math.max(...dates);
        return NextResponse.json({
          lastUpdated: formatSLST(maxTs),
          timestamp: new Date(maxTs).toISOString(),
          scope: user.organizationName || 'User Organization',
          isLoggedIn: true,
        });
      }
    }

    // 2. Unlogged visitor / baseline: MoE Planning Data Updated Time
    if (!user && cachedPublicPayload && now - lastPublicCacheTime < PUBLIC_CACHE_TTL_MS) {
      return NextResponse.json(cachedPublicPayload, {
        headers: {
          'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=10',
          'X-Cache': 'HIT',
        },
      });
    }

    const moeDates: number[] = [];
    const addMoeDate = (d: any) => {
      if (!d) return;
      const t = new Date(d).getTime();
      if (!isNaN(t) && t <= now) {
        moeDates.push(t);
      }
    };

    (db.auditLogs || []).forEach((l) => {
      if (
        l.organizationId === 'org-moe-planning' ||
        l.username === 'planning.officer' ||
        l.entityType === 'AIP_AMENDMENT' ||
        l.entityType === 'BUDGET_CEILING'
      ) {
        addMoeDate(l.timestamp);
      }
    });
    (db.aipPlans || []).forEach((p) => {
      if (p.branchId === 'org-moe-planning') {
        addMoeDate(p.updatedAt);
        addMoeDate(p.submittedAt);
        addMoeDate(p.approvedAt);
      }
    });

    if (moeDates.length === 0) {
      moeDates.push(new Date('2026-11-13T19:30:00.000Z').getTime());
    }

    const maxTs = Math.max(...moeDates);
    const publicPayload = {
      lastUpdated: formatSLST(maxTs),
      timestamp: new Date(maxTs).toISOString(),
      scope: 'MoE Planning',
      isLoggedIn: false,
    };
    cachedPublicPayload = publicPayload;
    lastPublicCacheTime = now;

    return NextResponse.json(publicPayload, {
      headers: {
        'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=10',
        'X-Cache': 'MISS',
      },
    });
  } catch (error) {
    console.error('Failed to get last updated time:', error);
    return NextResponse.json({
      lastUpdated: '14 Nov 2026, 01:00 AM SLST',
      timestamp: '2026-11-13T19:30:00.000Z',
      scope: 'MoE Planning',
      isLoggedIn: false,
    });
  }
}
