import urllib.request
import json

url = "http://localhost:3000/api/system/telemetry"
req = urllib.request.urlopen(url)
data = json.loads(req.read().decode('utf-8'))

print("=== PROVINCIAL DATA (9 PROVINCES) ===")
for p in data.get('provinces', []):
    print(f"{p.get('name'):25} | Progress: {p.get('progressPct')}% | Workshops: {p.get('workshopsCount')} | Activities: {p.get('activitiesCount')} | Budget: Rs. {p.get('budgetAllocatedMn')} Mn | Spent: Rs. {p.get('budgetSpentMn')} Mn | Zones: {len(p.get('zones', []))}")

print("\n=== METRICS ===")
for k, v in data.get('metrics', {}).items():
    print(f"{k:25}: {v}")

print("\n=== KPI GROUPS ===")
for group_name, group_data in data.get('kpiGroups', {}).items():
    print(f"Group: {group_name} -> {group_data.get('title', 'N/A')}")
