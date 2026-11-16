import { NextRequest, NextResponse } from 'next/server';
import db, { getDb } from '@/lib/db';
import { getBranchAbbreviation } from '@/lib/branchUtils';
import { OFFICIAL_MOE_DIVISIONS_DATA } from '@/lib/hierarchyData';

/**
 * GET /api/organizations/hierarchy
 * 
 * Returns organizations in a hierarchical structure for the step-by-step
 * host selection UI.
 * 
 * Query params:
 *   ?level=national|province|zone|school  — filter by hierarchy level
 *   ?parentId=org-xxx                     — get children of a specific org
 *   ?parentIds=org-1,org-2                — get branches grouped by parent ID
 *   ?includeBranches=true                 — embed branches into each org item
 */
export async function GET(req: NextRequest) {
  const data = await getDb();
  const { searchParams } = new URL(req.url);
  const level = searchParams.get('level');
  const parentId = searchParams.get('parentId');
  const parentIdsParam = searchParams.get('parentIds');
  const includeBranches = searchParams.get('includeBranches') === 'true';

  const allOrgs = data.organizations.filter((o) => o.isActive);
  const orgTypes = data.organizationTypes;

  // Helper: get type info
  const getTypeInfo = (typeId: string) => orgTypes.find((t) => t.id === typeId);

  // Helper: enrich organization with type info and children count
  const enrichOrg = (org: typeof allOrgs[0]) => {
    const type = getTypeInfo(org.typeId);
    const children = allOrgs.filter((c) => c.parentId === org.id);
    const locationChildren = children.filter((c) => c.unitType !== 'branch' && c.typeId !== 'ot-branch');
    const branchChildren = children.filter((c) => c.unitType === 'branch' || c.typeId === 'ot-branch');
    
    const enriched: any = {
      id: org.id,
      name: org.name,
      code: org.code,
      abbreviation: (org as any).abbreviation || getBranchAbbreviation(org.name, org.code),
      typeId: org.typeId,
      typeName: type?.name || '',
      level: type?.level || 0,
      parentId: org.parentId,
      unitType: org.unitType || (org.typeId === 'ot-branch' ? 'branch' : 'location'),
      childrenCount: locationChildren.length,
      branchCount: branchChildren.length,
      hasChildren: locationChildren.length > 0,
      hasBranches: branchChildren.length > 0,
    };

    if (includeBranches) {
      enriched.branches = branchChildren.map(enrichOrg);
    }

    return enriched;
  };

  // If parentIds (comma separated) is requested, return branches map
  if (parentIdsParam) {
    const ids = parentIdsParam.split(',').map((s) => s.trim()).filter(Boolean);
    const branchesByParent: Record<string, any[]> = {};
    for (const pid of ids) {
      const branches = allOrgs
        .filter((o) => o.parentId === pid && (o.unitType === 'branch' || o.typeId === 'ot-branch'))
        .map(enrichOrg)
        .sort((a, b) => a.name.localeCompare(b.name));
      branchesByParent[pid] = branches;
    }
    return NextResponse.json({ branchesByParent });
  }

  // If parentId is specified, return children of that parent
  if (parentId) {
    const children = allOrgs.filter((o) => o.parentId === parentId);
    const locations = children
      .filter((o) => o.unitType !== 'branch' && o.typeId !== 'ot-branch')
      .map(enrichOrg)
      .sort((a, b) => a.name.localeCompare(b.name));
    const branches = children
      .filter((o) => o.unitType === 'branch' || o.typeId === 'ot-branch')
      .map(enrichOrg)
      .sort((a, b) => a.name.localeCompare(b.name));

    // Also return the parent org info for breadcrumb display
    const parentOrg = allOrgs.find((o) => o.id === parentId);

    return NextResponse.json({
      parent: parentOrg ? enrichOrg(parentOrg) : null,
      locations,
      branches,
    });
  }

  // If level is specified, return all orgs at that level
  if (level) {
    let filtered: typeof allOrgs = [];

    switch (level) {
      case 'national':
      case '1':
        filtered = allOrgs.filter((o) => (o.typeId === 'ot-moe' || o.id === 'org-moe' || o.id.startsWith('org-moe-')) && !['org-nie', 'org-epd', 'org-doe'].includes(o.id));
        break;
      case 'apex':
      case '2':
        filtered = allOrgs.filter((o) => o.typeId === 'ot-national-apex' || o.typeId === 'ot-nie' || o.typeId === 'ot-epd' || o.typeId === 'ot-doe' || ['org-nie', 'org-epd', 'org-doe'].includes(o.id));
        break;
      case 'province':
      case '3':
        filtered = allOrgs.filter((o) => o.typeId === 'ot-province' || o.id.startsWith('org-prov-'));
        break;
      case 'zone':
      case '4':
        filtered = allOrgs.filter((o) => o.typeId === 'ot-zone' || o.id.startsWith('org-zone-'));
        break;
      case 'division':
      case '5':
        filtered = allOrgs.filter((o) => o.typeId === 'ot-division' || o.id.startsWith('org-div-'));
        break;
      case 'school':
      case '6':
        filtered = allOrgs.filter((o) => o.typeId === 'ot-school' || o.id.startsWith('org-sch-'));
        break;
    }

    return NextResponse.json({
      organizations: filtered.map(enrichOrg).sort((a, b) => a.name.localeCompare(b.name)),
    });
  }

  // Default: return the full 6-level hierarchy summary
  const national = allOrgs
    .filter((o) => (o.typeId === 'ot-moe' || o.id === 'org-moe' || o.id.startsWith('org-moe-')) && !['org-nie', 'org-epd', 'org-doe'].includes(o.id))
    .map(enrichOrg);
  const apex = allOrgs
    .filter((o) => o.typeId === 'ot-national-apex' || o.typeId === 'ot-nie' || o.typeId === 'ot-epd' || o.typeId === 'ot-doe' || ['org-nie', 'org-epd', 'org-doe'].includes(o.id))
    .map(enrichOrg);
  const provinces = allOrgs.filter((o) => o.typeId === 'ot-province' || o.id.startsWith('org-prov-')).map(enrichOrg);
  const zones = allOrgs.filter((o) => o.typeId === 'ot-zone' || o.id.startsWith('org-zone-')).map(enrichOrg);
  const divisions = allOrgs.filter((o) => o.typeId === 'ot-division' || o.id.startsWith('org-div-')).map(enrichOrg);
  const schools = allOrgs.filter((o) => o.typeId === 'ot-school' || o.id.startsWith('org-sch-')).map(enrichOrg);

  return NextResponse.json({
    levels: [
      { key: 'national', level: 1, label: 'MOE (Level 1)', description: 'National Ministry Level & Functional Branches', count: national.length, icon: '🏛️' },
      { key: 'apex', level: 2, label: 'NIE / EPD / DoE (Level 2)', description: 'Autonomous National Apex Institutions (No provincial levels)', count: apex.length, icon: '🏛️' },
      { key: 'province', level: 3, label: 'Province (Level 3)', description: '9 Provincial Departments of Education', count: provinces.length, icon: '🏢' },
      { key: 'zone', level: 4, label: 'Zone (Level 4)', description: '100 Zonal Education Offices', count: zones.length, icon: '📍' },
      { key: 'division', level: 5, label: 'Division (Level 5)', description: '312 Divisional Education Offices', count: divisions.length, icon: '📌' },
      { key: 'school', level: 6, label: 'School (Level 6)', description: 'Schools & Educational Institutions', count: schools.length, icon: '🏫' },
    ],
    summary: {
      national,
      moeDivisions: OFFICIAL_MOE_DIVISIONS_DATA,
      apex: apex.sort((a, b) => a.name.localeCompare(b.name)),
      provinces: provinces.sort((a, b) => a.name.localeCompare(b.name)),
      zones: zones.sort((a, b) => a.name.localeCompare(b.name)),
      divisions: divisions.sort((a, b) => a.name.localeCompare(b.name)),
      schools: schools.sort((a, b) => a.name.localeCompare(b.name)),
    },
  });
}
