import json

with open('data/database.json', 'r', encoding='utf-8') as f:
    db = json.load(f)

users = {u['username']: u for u in db['users']}
for u in db['users']:
    for a in u.get('aliases', []):
        users[a] = u

test_accounts = [
    ('superadmin', 'Super Administrator'),
    ('moe', 'MoE National Level Administrator'),
    ('moe.admin', 'MoE National Level Administrator'),
    ('nie.admin', 'Apex Institutional Administrator'),
    ('ped.sp', 'Provincial Level Administrator'),
    ('provincial.admin', 'Provincial Level Administrator'),
    ('zeo.galle', 'Zonal Level Administrator'),
    ('zonal.admin', 'Zonal Level Administrator'),
    ('deo.galle', 'Divisional Level Administrator'),
    ('divisional.admin', 'Divisional Level Administrator'),
    ('ict', 'Normal User'),
    ('reforms', 'Normal User'),
    ('agri', 'Normal User'),
    ('planning', 'Planning Branch Normal User'),
    ('planning.officer', 'Planning Division Officer (Governance)'),
    ('monitoring', 'Monitoring Branch Normal User'),
    ('monitoring.officer', 'Monitoring Division Specialist'),
    ('admin', 'Data Management System Admin'),
    ('data', 'Data Management Branch Operational'),
    ('eqd', 'EQD Branch Operational'),
    ('eqd.officer', 'EQD Director Lead'),
]

for uname, desc in test_accounts:
    user = users.get(uname)
    assert user is not None, f"Missing user: {uname}"
    print(f"[OK] {uname:20} -> {user['fullName']} | designation: {user.get('designation', '')}")

print("\nALL 21 TEST ACCOUNTS VERIFIED IN DATABASE!")
