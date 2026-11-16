import json

with open('data/database.json', 'r', encoding='utf-8') as f:
    db = json.load(f)

for u in db.get('users', []):
    if u.get('username') in ['planning.officer', 'planning']:
        print(f"User {u['username']}:", json.dumps(u, indent=2))
