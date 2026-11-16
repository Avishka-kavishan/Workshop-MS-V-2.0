import json

with open('data/database.json', 'r', encoding='utf-8') as f:
    db = json.load(f)

for u in db.get('users', [])[:3]:
    print(f"User: {u['username']}, PasswordHash: {u.get('passwordHash')}")
