import json

DB_PATH = r'D:\Data\Tests\plan\Workshop-MS-TEST\data\database.json'
with open(DB_PATH, 'r', encoding='utf-8') as f:
    db = json.load(f)

print(f"{'Role ID':<24} | {'canCreate':<9} | {'canApprove':<10} | {'canUsers':<8} | {'canOrgs':<7} | {'Name'}")
print("-" * 90)
for r in db['userRoles']:
    print(f"{r['id']:<24} | {str(r.get('canCreateWorkshop')):<9} | {str(r.get('canApproveWorkshop')):<10} | {str(r.get('canManageUsers')):<8} | {str(r.get('canManageOrganizations')):<7} | {r.get('name')}")
