import json
import os

DB_PATH = r'D:\Data\Tests\plan\Workshop-MS-TEST\data\database.json'
with open(DB_PATH, 'r', encoding='utf-8') as f:
    db = json.load(f)

print(f"=== ROLES IN DATABASE ({len(db['userRoles'])}) ===")
for r in db['userRoles']:
    print(f"\nRole ID: {r['id']}")
    print(f"Name:    {r.get('name')}")
    print(f"Desc:    {r.get('description', '')}")
    perms = r.get('permissions', [])
    print(f"Perms ({len(perms)}): {perms}")

print("\n=== USERS IN DATABASE ===")
for u in db['users']:
    role = next((r for r in db['userRoles'] if r['id'] == u.get('roleId')), None)
    print(f"User: {u.get('username'):<22} | Role: {u.get('roleId'):<22} ({role.get('name') if role else 'Unknown'}) | Org: {u.get('organizationId')}")

print("\n=== USER ORG PERMISSIONS ===")
for uop in db.get('userOrgPermissions', []):
    print(f"UserOrgPerm: {uop.get('userId')} -> Org: {uop.get('organizationId')} | Perms: {uop.get('permissions')}")
