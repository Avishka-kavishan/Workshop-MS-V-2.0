import json

with open('data/database.json', 'r', encoding='utf-8') as f:
    db = json.load(f)

print("Keys:", list(db.keys()))
for k in ['roles', 'userRoles', 'permissions']:
    if k in db:
        print(f"{k}: count = {len(db[k])}")
        for item in db[k][:10]:
            print("  ", item)
