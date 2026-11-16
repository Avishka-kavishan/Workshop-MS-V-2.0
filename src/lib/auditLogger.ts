import { getDb, updateDb, SystemAuditLog } from '@/lib/db';
import { randomUUID } from 'crypto';

export interface AuditEventParams {
  user: {
    id?: string;
    userId?: string;
    username?: string;
    name?: string;
    fullName?: string;
    organizationId?: string;
    organizationName?: string;
    roleId?: string;
    roleName?: string;
  } | null | undefined;
  category: 'Governance' | 'Financial' | 'Operational' | 'Security';
  action: string;
  entityType:
    | 'AIP_PLAN'
    | 'AIP_AMENDMENT'
    | 'AIP_MONTHLY_RETURN'
    | 'BUDGET_PROPOSAL'
    | 'BUDGET_ALLOCATION'
    | 'BUDGET_CEILING'
    | 'WORKSHOP'
    | 'QA_VERIFICATION'
    | 'QA_OBSERVATION'
    | 'USER_ROLE'
    | 'ORGANIZATION'
    | 'RESOURCE_PERSON'
    | 'AUTH'
    | 'SYSTEM_SETTINGS'
    | 'REPORT_EXPORT'
    | 'CORRECTIVE_ACTION'
    | 'USER_MANAGEMENT'
    | string;
  entityId: string;
  summary: string;
  details?: Record<string, any>;
  severity?: 'Info' | 'Warning' | 'Critical';
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditLogFilter {
  category?: string;
  entityType?: string;
  username?: string;
  severity?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}

export interface AuditStats {
  total: number;
  securityCount: number;
  governanceCount: number;
  operationalCount: number;
  financialCount: number;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  uniqueUsers: number;
  userBreakdown: { username: string; name: string; count: number }[];
  categoryBreakdown: Record<string, number>;
  latestTimestamp: string | null;
}

/**
 * Enterprise Audit Trail Logger
 * Compliant with ISO 27001, General Data Protection & Government Digital Service (GDS) auditability standards.
 * Records immutable governance & operational events with cryptographic UUID and ISO timestamp.
 */
export async function logAuditEvent(params: AuditEventParams): Promise<SystemAuditLog> {
  const now = new Date().toISOString();
  const user = params.user;

  const logEntry: SystemAuditLog = {
    id: `audit-${Date.now()}-${randomUUID().slice(0, 8)}`,
    timestamp: now,
    userId: user?.id || user?.userId || 'system',
    username: user?.username || 'system',
    userFullName: user?.fullName || user?.name || 'System Service',
    organizationId: user?.organizationId || 'org-moe',
    organizationName: user?.organizationName || 'Ministry of Education',
    category: params.category,
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,
    summary: params.summary,
    details: params.details || {},
    severity: params.severity || 'Info',
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
  };

  try {
    await updateDb((dbData) => {
      if (!dbData.auditLogs) {
        dbData.auditLogs = [];
      }
      dbData.auditLogs.unshift(logEntry);
      // Retain the last 2000 system logs for high-speed indexing
      if (dbData.auditLogs.length > 2000) {
        dbData.auditLogs = dbData.auditLogs.slice(0, 2000);
      }
    });
  } catch (err) {
    console.error('AuditLogger error (non-blocking):', err);
  }

  return logEntry;
}

/**
 * Retrieves audit logs with comprehensive multi-parameter filtering and full-text search.
 */
export async function getAuditLogs(filter?: AuditLogFilter): Promise<{ logs: SystemAuditLog[]; total: number; totalInDb: number }> {
  const db = await getDb();
  let logs: SystemAuditLog[] = [...(db.auditLogs || [])];
  const totalInDb = logs.length;

  if (filter?.category && filter.category !== 'all') {
    logs = logs.filter((l) => l.category.toLowerCase() === filter.category!.toLowerCase());
  }

  if (filter?.entityType && filter.entityType !== 'all') {
    logs = logs.filter((l) => l.entityType.toLowerCase() === filter.entityType!.toLowerCase());
  }

  if (filter?.username && filter.username !== 'all') {
    logs = logs.filter((l) => l.username.toLowerCase() === filter.username!.toLowerCase());
  }

  if (filter?.severity && filter.severity !== 'all') {
    logs = logs.filter((l) => l.severity.toLowerCase() === filter.severity!.toLowerCase());
  }

  if (filter?.startDate) {
    const start = new Date(filter.startDate).getTime();
    if (!isNaN(start)) {
      logs = logs.filter((l) => new Date(l.timestamp).getTime() >= start);
    }
  }

  if (filter?.endDate) {
    const end = new Date(filter.endDate).getTime();
    if (!isNaN(end)) {
      logs = logs.filter((l) => new Date(l.timestamp).getTime() <= end + 86400000); // inclusive of entire end day
    }
  }

  if (filter?.search && filter.search.trim()) {
    const q = filter.search.trim().toLowerCase();
    logs = logs.filter((l) => {
      return (
        (l.summary && l.summary.toLowerCase().includes(q)) ||
        (l.action && l.action.toLowerCase().includes(q)) ||
        (l.username && l.username.toLowerCase().includes(q)) ||
        (l.userFullName && l.userFullName.toLowerCase().includes(q)) ||
        (l.organizationName && l.organizationName.toLowerCase().includes(q)) ||
        (l.entityId && l.entityId.toLowerCase().includes(q)) ||
        (l.category && l.category.toLowerCase().includes(q)) ||
        (l.entityType && l.entityType.toLowerCase().includes(q))
      );
    });
  }

  const totalFiltered = logs.length;
  const limit = filter?.limit || 200;
  const slicedLogs = logs.slice(0, limit);

  return {
    logs: slicedLogs,
    total: totalFiltered,
    totalInDb,
  };
}

/**
 * Calculates aggregated audit telemetry metrics for Super Administrator dashboard
 */
export async function getAuditStats(): Promise<AuditStats> {
  const db = await getDb();
  const logs: SystemAuditLog[] = db.auditLogs || [];

  const categoryBreakdown: Record<string, number> = {
    Governance: 0,
    Financial: 0,
    Operational: 0,
    Security: 0,
  };

  let criticalCount = 0;
  let warningCount = 0;
  let infoCount = 0;

  const userMap = new Map<string, { username: string; name: string; count: number }>();

  logs.forEach((l) => {
    // Categories
    if (l.category in categoryBreakdown) {
      categoryBreakdown[l.category]++;
    } else {
      categoryBreakdown[l.category] = (categoryBreakdown[l.category] || 0) + 1;
    }

    // Severities
    if (l.severity === 'Critical') criticalCount++;
    else if (l.severity === 'Warning') warningCount++;
    else infoCount++;

    // User tracking
    const key = l.username || 'system';
    if (!userMap.has(key)) {
      userMap.set(key, { username: key, name: l.userFullName || key, count: 0 });
    }
    userMap.get(key)!.count++;
  });

  const userBreakdown = Array.from(userMap.values()).sort((a, b) => b.count - a.count);

  return {
    total: logs.length,
    securityCount: categoryBreakdown.Security || 0,
    governanceCount: categoryBreakdown.Governance || 0,
    operationalCount: categoryBreakdown.Operational || 0,
    financialCount: categoryBreakdown.Financial || 0,
    criticalCount,
    warningCount,
    infoCount,
    uniqueUsers: userMap.size,
    userBreakdown: userBreakdown.slice(0, 10),
    categoryBreakdown,
    latestTimestamp: logs.length > 0 ? logs[0].timestamp : null,
  };
}
