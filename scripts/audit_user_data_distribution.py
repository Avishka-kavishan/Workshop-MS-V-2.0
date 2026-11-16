import json
from collections import defaultdict

with open("data/database.json", "r", encoding="utf-8") as f:
    db = json.load(f)

org_map = {o['id']: o for o in db.get('organizations', [])}
users = db.get('users', [])
workshops = db.get('workshops', [])
proposals = db.get('budgetProposalActivities', [])
aip = db.get('aipActivities', [])

print(f"{'User':20} | {'Org ID':22} | {'Org Name':30} | {'Workshops':10} | {'Proposals':10} | {'AIP Acts':10}")
print("-" * 115)

for u in users:
    uname = u['username']
    org_id = u.get('organizationId', '')
    org = org_map.get(org_id, {})
    org_name = org.get('name', 'N/A')
    
    # Check workshops matching this org
    ws_count = sum(1 for w in workshops if w.get('organizingOrgId') == org_id or w.get('branch') == org_name or w.get('placeId') == org_id)
    # Check proposals matching this org
    prop_count = sum(1 for p in proposals if p.get('divisionId') == org_id or p.get('divisionName') == org_name or p.get('submittedBy') == uname)
    # Check AIP activities matching this org
    aip_count = sum(1 for a in aip if a.get('branchId') == org_id or a.get('branchName') == org_name)
    
    print(f"{uname:20} | {org_id:22} | {org_name[:30]:30} | {ws_count:<10} | {prop_count:<10} | {aip_count:<10}")
