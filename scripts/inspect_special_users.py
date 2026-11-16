import json

with open('data/database.json', 'r', encoding='utf-8') as f:
    db = json.load(f)

special_usernames = ['planning', 'planning.officer', 'monitoring', 'monitoring.officer', 'admin', 'data.management', 'data']
print("Special branches users:")
for u in db.get('users', []):
    if u.get('username') in special_usernames:
        org = next((o for o in db.get('organizations', []) if o['id'] == u.get('organizationId')), {})
        print(f"Username: {u['username']}, FullName: {u.get('fullName')}, OrgId: {u.get('organizationId')}, OrgName: {org.get('name')}, OrgCat: {org.get('functionalCategory')}, Role: {u.get('roleId')}")
