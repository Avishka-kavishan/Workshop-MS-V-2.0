import json

DB_PATH = r'D:\Data\Tests\plan\Workshop-MS-TEST\data\database.json'
with open(DB_PATH, 'r', encoding='utf-8') as f:
    db = json.load(f)

# 1. Update userRoles with strict Principle of Least Privilege
ROLE_CONFIG = {
    'role-superadmin': {
        'name': 'Super Administrator',
        'description': 'Full unrestricted administrative authority across all 6 administrative levels, all functional divisions, master hierarchy configuration, user management, budget approvals, and audit overrides',
        'canCreateWorkshop': True,
        'canApproveWorkshop': True,
        'canManageUsers': True,
        'canViewReports': True,
        'canManageOrganizations': True,
        'permissions': ['SYSTEM_ADMIN', 'AIP_APPROVE', 'AIP_DISPATCH', 'BUDGET_REALLOCATE', 'BUDGET_REVISE', 'QA_VERIFY', 'QA_MONITOR', 'WORKSHOP_CREATE', 'WORKSHOP_APPROVE', 'USER_MANAGE', 'ORG_MANAGE', 'AUDIT_VIEW'],
    },
    'role-admin-level-1': {
        'name': 'Level 1 Administrator (MoE National)',
        'description': 'National administrative authority over MoE Headquarters, 20 Divisions, and 88 Branches. Can manage MoE divisions, branches, units, and workshops.',
        'canCreateWorkshop': True,
        'canApproveWorkshop': True,
        'canManageUsers': True,
        'canViewReports': True,
        'canManageOrganizations': True,
        'permissions': ['MOE_ADMIN', 'AIP_APPROVE', 'BUDGET_REALLOCATE', 'BUDGET_REVISE', 'WORKSHOP_CREATE', 'WORKSHOP_APPROVE', 'USER_MANAGE', 'ORG_MANAGE', 'AUDIT_VIEW'],
    },
    'role-admin': {
        'name': 'System Administrator',
        'description': 'System-wide data operations, user account management, and database integrity maintenance.',
        'canCreateWorkshop': True,
        'canApproveWorkshop': True,
        'canManageUsers': True,
        'canViewReports': True,
        'canManageOrganizations': True,
        'permissions': ['SYSTEM_ADMIN', 'WORKSHOP_CREATE', 'WORKSHOP_APPROVE', 'USER_MANAGE', 'ORG_MANAGE', 'AUDIT_VIEW'],
    },
    'role-planning-officer': {
        'name': 'Planning Division Officer',
        'description': 'Special authority for macro ceilings, vote allocation, reviewing proposals, approving/returning AIP plans, and dispatching amendments',
        'canCreateWorkshop': True,
        'canApproveWorkshop': True,
        'canManageUsers': False,
        'canViewReports': True,
        'canManageOrganizations': False,
        'permissions': ['AIP_APPROVE', 'AIP_DISPATCH', 'AIP_REVIEW', 'BUDGET_REALLOCATE', 'BUDGET_REVISE', 'WORKSHOP_CREATE', 'AUDIT_VIEW'],
    },
    'role-monitoring-officer': {
        'name': 'Monitoring & Verification Officer',
        'description': 'Independent progress verification, field inspection observations, evidence verification and corrective action tracking',
        'canCreateWorkshop': False,
        'canApproveWorkshop': False,
        'canManageUsers': False,
        'canViewReports': True,
        'canManageOrganizations': False,
        'permissions': ['QA_VERIFY', 'QA_MONITOR', 'CORRECTIVE_ACTION_MANAGE', 'AUDIT_VIEW'],
    },
    'role-admin-level-2': {
        'name': 'Level 2 Administrator (National Apex)',
        'description': 'Institutional administrative authority over National Apex Bodies (NIE, EPD, DoE). Scoped strictly to Apex departments and curriculum units.',
        'canCreateWorkshop': True,
        'canApproveWorkshop': False,
        'canManageUsers': False,
        'canViewReports': True,
        'canManageOrganizations': False,
        'permissions': ['APEX_ADMIN', 'WORKSHOP_CREATE', 'AUDIT_VIEW'],
    },
    'role-admin-level-3': {
        'name': 'Level 3 Administrator (Provincial)',
        'description': 'Provincial administrative authority over Provincial Education Department and subordinate Zonal Offices within that Province.',
        'canCreateWorkshop': True,
        'canApproveWorkshop': False,
        'canManageUsers': False,
        'canViewReports': True,
        'canManageOrganizations': False,
        'permissions': ['PROVINCE_ADMIN', 'WORKSHOP_CREATE', 'AUDIT_VIEW'],
    },
    'role-admin-level-4': {
        'name': 'Level 4 Administrator (Zonal)',
        'description': 'Zonal administrative authority over Zonal Education Office, Zonal IT Centers, and child Divisions in the Zone.',
        'canCreateWorkshop': False,
        'canApproveWorkshop': False,
        'canManageUsers': False,
        'canViewReports': True,
        'canManageOrganizations': False,
        'permissions': ['ZONE_ADMIN', 'AUDIT_VIEW'],
    },
    'role-admin-level-5': {
        'name': 'Level 5 Administrator (Divisional)',
        'description': 'Divisional administrative authority over Divisional Education Office and child Schools.',
        'canCreateWorkshop': False,
        'canApproveWorkshop': False,
        'canManageUsers': False,
        'canViewReports': True,
        'canManageOrganizations': False,
        'permissions': ['DIVISION_ADMIN'],
    },
    'role-moe-officer': {
        'name': 'MOE Officer / Planner',
        'description': 'Creates and schedules workshops for own branch, submits branch budget proposals and AIP activities',
        'canCreateWorkshop': True,
        'canApproveWorkshop': False,
        'canManageUsers': False,
        'canViewReports': True,
        'canManageOrganizations': False,
        'permissions': ['WORKSHOP_CREATE', 'AIP_SUBMIT', 'BUDGET_PROPOSE'],
    },
    'role-place-coordinator': {
        'name': 'Place Coordinator / Officer',
        'description': 'Receives workshop notifications, manages assigned venue attendance, coordinates local trainees & resource persons, exports Excel',
        'canCreateWorkshop': False,
        'canApproveWorkshop': False,
        'canManageUsers': False,
        'canViewReports': True,
        'canManageOrganizations': False,
        'permissions': ['VENUE_MANAGE', 'TRAINEE_ATTENDANCE', 'ROSTER_EXPORT'],
    },
}

for role in db['userRoles']:
    cfg = ROLE_CONFIG.get(role['id'])
    if cfg:
        role.update(cfg)

# 2. Clean up userOrgPermissions - Remove cross-jurisdictional leakage
# Only keep legitimate user-to-own-organization permission entries
cleaned_uops = []
for user in db['users']:
    user_id = user['id']
    org_id = user.get('organizationId')
    role_id = user.get('roleId')
    cfg = ROLE_CONFIG.get(role_id, {})
    if org_id:
        cleaned_uops.append({
            'id': f"uop-{user_id}-{org_id}",
            'userId': user_id,
            'organizationId': org_id,
            'canCreate': cfg.get('canCreateWorkshop', False),
            'canView': True,
            'canApprove': cfg.get('canApproveWorkshop', False),
            'permissions': cfg.get('permissions', [])
        })

db['userOrgPermissions'] = cleaned_uops

with open(DB_PATH, 'w', encoding='utf-8') as f:
    json.dump(db, f, indent=2)

print(f"Successfully updated {len(db['userRoles'])} roles with PoLP constraints.")
print(f"Replaced {182} legacy cross-org permissions with {len(cleaned_uops)} scoped permissions.")
