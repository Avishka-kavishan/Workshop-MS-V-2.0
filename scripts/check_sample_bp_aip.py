import json

with open('data/database.json', 'r', encoding='utf-8') as f:
    db = json.load(f)

for bp in db.get('budgetProposalActivities', []):
    if bp.get('branchId') == 'org-moe-maths' or bp.get('branchId') == 'org-moe-agri':
        print("Sample budget proposal:", json.dumps(bp, indent=2))
        break

for aip in db.get('aipActivities', []):
    if aip.get('branchId') == 'org-moe-maths' or aip.get('branchId') == 'org-moe-agri':
        print("Sample AIP activity:", json.dumps(aip, indent=2))
        break
