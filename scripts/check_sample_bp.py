import json

with open('data/database.json', 'r', encoding='utf-8') as f:
    db = json.load(f)

for bp in db.get('budgetProposalActivities', [])[:2]:
    print("Sample budget proposal:", json.dumps(bp, indent=2))
