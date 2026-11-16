import json

with open("data/database.json", "r", encoding="utf-8") as f:
    db = json.load(f)

org_map = {o['id']: o for o in db.get('organizations', [])}

print("=== USERS IN SYSTEM ===")
for u in db.get('users', []):
    org = org_map.get(u.get('organizationId', ''), {})
    uname = str(u.get('username', 'N/A'))
    role = str(u.get('role', 'N/A'))
    org_name = str(org.get('name', 'N/A'))
    org_lvl = str(org.get('level', 'N/A'))
    active = str(u.get('active', True))
    print(f"Username: {uname:25} | Role: {role:25} | Org: {org_name:30} ({org_lvl}) | Active: {active}")

print("\n=== USER ROLES IN SYSTEM ===")
for r in db.get('userRoles', []):
    print(f"Role ID: {str(r.get('id')):20} | Name: {str(r.get('name')):25} | Scope: {str(r.get('scope', 'N/A'))}")

print("\n=== WORKSHOPS BY STATUS & ORG ===")
from collections import Counter
ws_status = Counter(w.get('status') for w in db.get('workshops', []))
print("Workshops status count:", dict(ws_status))

ws_branches = Counter(w.get('branch') for w in db.get('workshops', []))
print("Workshops top branches:", ws_branches.most_common(10))

print("\n=== BUDGET PROPOSALS BY STATUS & BRANCH ===")
bp_status = Counter(p.get('status') for p in db.get('budgetProposalActivities', []))
print("Budget Proposals status count:", dict(bp_status))

bp_divs = Counter(p.get('divisionName') for p in db.get('budgetProposalActivities', []))
print("Budget Proposals top branches:", bp_divs.most_common(10))

print("\n=== USER 0 SCHEMA ===")
import pprint
pprint.pprint(db.get('users', [])[0])
