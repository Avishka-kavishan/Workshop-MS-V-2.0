import json

with open('data/database.json', 'r', encoding='utf-8') as f:
    db = json.load(f)

for o in db.get('organizations', []):
    if o.get('id') == 'org-moe-eqd-dev':
        print("Sample branch org:", json.dumps(o, indent=2))
        break

for u in db.get('users', []):
    if u.get('username') == 'maths.officer':
        print("Sample user:", json.dumps(u, indent=2))
        break
