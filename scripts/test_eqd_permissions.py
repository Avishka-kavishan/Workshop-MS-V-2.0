import json
from src_lib_simulation import canUserViewWorkshop

with open('data/database.json', 'r', encoding='utf-8') as f:
    db = json.load(f)

users = {u['username']: u for u in db['users']}
eqd_officer = users.get('eqd.officer')
eqd_normal = users.get('eqd')

print("eqd.officer:", eqd_officer)
print("eqd:", eqd_normal)
