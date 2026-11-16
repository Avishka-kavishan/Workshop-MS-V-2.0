import json

with open('data/database.json', 'r', encoding='utf-8') as f:
    db = json.load(f)

for w in db.get('workshops', []):
    if w.get('organizingOrgId') == 'org-moe-maths' or w.get('organizingOrgId') == 'org-moe-agri':
        print("Sample workshop:", json.dumps(w, indent=2))
        break
