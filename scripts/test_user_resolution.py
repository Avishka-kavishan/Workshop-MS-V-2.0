import json

with open("data/database.json", "r", encoding="utf-8") as f:
    db = json.load(f)

test_users = [
    "ict", "ict.officer",
    "digital.infra", "digital",
    "reforms", "reforms.officer",
    "ncoe", "ncoe.officer",
    "piriven", "piriven.officer",
    "agri", "agri.officer",
    "maths", "maths.officer",
    "health", "health.officer",
    "curriculum", "curriculum.officer"
]

all_ok = True
for uname in test_users:
    u = next((x for x in db.get("users", []) if (x.get("username") == uname or uname in (x.get("aliases") or [])) and x.get("isActive")), None)
    if not u:
        print(f"FAIL: {uname} not resolved!")
        all_ok = False
    else:
        print(f"OK: {uname:20} -> ID: {u.get('id'):22} Primary: {u.get('username'):12} Org: {u.get('organizationId')}")

assert all_ok, "Some users failed resolution!"
print("\nALL USER RESOLUTIONS AND ALIASES VERIFIED SUCCESSFULLY!")
