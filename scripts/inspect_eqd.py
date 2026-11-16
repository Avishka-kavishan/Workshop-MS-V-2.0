import json

with open('data/database.json', 'r', encoding='utf-8') as f:
    db = json.load(f)

print("Organizations under org-moe-div-eqd:")
for org in db.get('organizations', []):
    if org.get('parentId') == 'org-moe-div-eqd' or 'eqd' in org.get('id', '').lower():
        print(f"ID: {org.get('id')}, Name: {org.get('name')}, Code: {org.get('code')}, Category: {org.get('functionalCategory')}")

print("\nUsers matching eqd:")
for u in db.get('users', []):
    if 'eqd' in u.get('username', '').lower() or 'eqd' in u.get('organizationId', '').lower():
        print(f"ID: {u.get('id')}, Username: {u.get('username')}, Org: {u.get('organizationId')}, Role: {u.get('roleId')}")
