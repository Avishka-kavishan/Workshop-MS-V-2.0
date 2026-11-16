import json
import pprint

with open("data/database.json", "r", encoding="utf-8") as f:
    db = json.load(f)

ws = db.get("workshops", [])[0]
print("=== SAMPLE WORKSHOP ===")
pprint.pprint(ws)

prop = db.get("budgetProposalActivities", [])[0]
print("\n=== SAMPLE BUDGET PROPOSAL ===")
pprint.pprint(prop)

aip = db.get("aipActivities", [])[0]
print("\n=== SAMPLE AIP ACTIVITY ===")
pprint.pprint(aip)
