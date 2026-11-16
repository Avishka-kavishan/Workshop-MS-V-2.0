import json

with open("data/database.json", "r", encoding="utf-8") as f:
    db = json.load(f)

print("=== RESOURCE PERSONS ===")
for rp in db.get("resourcePersons", []):
    print(f"ID: {rp.get('id')} | Name: {rp.get('name')} | Field: {rp.get('field')} | Designation: {rp.get('designation')}")

print("\n=== WORKSHOP CATEGORIES ===")
for wc in db.get("workshopCategories", []):
    print(wc)
