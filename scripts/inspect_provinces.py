import re

content = open(r'D:\Data\Tests\plan\Workshop-MS-TEST\src\lib\trafficLightUtils.ts', encoding='utf-8').read()
matches = re.findall(r"name:\s*'([^']+Province)',\s*code:\s*'([^']+)',.*?progressPct:\s*(\d+)", content, re.DOTALL)
print("PROVINCES PROGRESS AND TRAFFIC LIGHTS:")
for name, code, pct in matches:
    pct_num = int(pct)
    light = "🟢 100% Green" if pct_num >= 100 else "🟢 90-99% Light Green" if pct_num >= 90 else "🟡 80-89% Yellow" if pct_num >= 80 else "🟠 70-79% Amber" if pct_num >= 70 else "🔴 50-69% Light Red" if pct_num >= 50 else "🔴 <50% Red"
    print(f"  {name:<25} ({code}): {pct:>3}% -> {light}")

# Find all Stalled Issues
issues = re.findall(r"title:\s*'([^']+)',\s*type:\s*'([^']+)',\s*severity:\s*'([^']+)',.*?rootCause:\s*'([^']+)',\s*correctiveAction:\s*'([^']+)',\s*responsibleOfficer:\s*'([^']+)',\s*daysDelayed:\s*(\d+)", content, re.DOTALL)
print(f"\nFOUND {len(issues)} ROOT CAUSE ISSUES ACROSS PROVINCES:")
for title, itype, sev, cause, action, officer, days in issues[:6]:
    print(f"\n- Issue: [{sev}] {title} ({itype}, Delayed {days} days)")
    print(f"  Cause:  {cause}")
    print(f"  Action: {action}")
    print(f"  Lead:   {officer}")
