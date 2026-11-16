import json
import os

DB_PATH = 'data/database.json'

with open(DB_PATH, 'r', encoding='utf-8') as f:
    db = json.load(f)

users = db.get('users', [])

# Mapping of old username -> new username & aliases
updates = {
    'ict.officer': {'username': 'ict', 'aliases': ['ict.officer']},
    'digital.infra': {'username': 'digital.infra', 'aliases': ['digital', 'digital.infra']},
    'reforms.officer': {'username': 'reforms', 'aliases': ['reforms.officer']},
    'ncoe.officer': {'username': 'ncoe', 'aliases': ['ncoe.officer']},
    'piriven.officer': {'username': 'piriven', 'aliases': ['piriven.officer']},
    'agri.officer': {'username': 'agri', 'aliases': ['agri.officer']},
    'maths.officer': {'username': 'maths', 'aliases': ['maths.officer']},
    'health.officer': {'username': 'health', 'aliases': ['health.officer']},
}

updated_count = 0
for u in users:
    curr_uname = u.get('username')
    if curr_uname in updates:
        cfg = updates[curr_uname]
        old_uname = curr_uname
        u['username'] = cfg['username']
        existing_aliases = u.get('aliases') or []
        combined_aliases = list(set(existing_aliases + cfg['aliases']))
        u['aliases'] = combined_aliases
        print(f"Updated user {u.get('id')}: '{old_uname}' -> username='{u['username']}', aliases={u['aliases']}")
        updated_count += 1

# Check if user-curriculum exists; if not, add it
curr_user = next((u for u in users if u.get('username') == 'curriculum' or u.get('id') == 'user-curriculum'), None)
if not curr_user:
    new_curr = {
        "id": "user-curriculum",
        "username": "curriculum",
        "aliases": ["curriculum.officer"],
        "passwordHash": "$2b$10$./4O5YT/QD9uTYcc46P4ceeeEY7RSq165PIVDe9XgsKcuDE.Xxm/i",
        "fullName": "MOE Curriculum Development Branch",
        "email": "curriculum@moe.gov.lk",
        "designation": "Director (Curriculum Development)",
        "organizationId": "org-moe-curriculum",
        "roleId": "role-moe-officer",
        "isActive": True,
        "createdAt": "2026-10-29T04:26:17.180Z",
        "assignedRoles": [
            {
                "id": "ura-user-curriculum",
                "userId": "user-curriculum",
                "roleId": "role-moe-officer",
                "roleName": "MOE Officer / Planner",
                "organizationId": "org-moe-curriculum",
                "organizationName": "MOE Curriculum Development Branch",
                "functionalCategory": "Normal",
                "delegatedAuthority": "Standard",
                "description": "Creates and schedules workshops for own branch, submits branch budget proposals and AIP activities",
                "isDefault": True,
                "isActive": True,
                "assignedAt": "2026-10-29T04:26:17.180Z"
            }
        ],
        "lastSelectedRoleId": "ura-user-curriculum"
    }
    users.append(new_curr)
    print("Added new user 'curriculum' for org-moe-curriculum")

with open(DB_PATH, 'w', encoding='utf-8') as f:
    json.dump(db, f, indent=2, ensure_ascii=False)

print(f"\nSuccessfully updated {updated_count} users in {DB_PATH}.")
