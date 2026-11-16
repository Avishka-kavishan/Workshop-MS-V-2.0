import urllib.request
import json

try:
    req = urllib.request.Request('http://localhost:3000/api/system/health')
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        print("Health check response:", json.dumps(data, indent=2))
except Exception as e:
    print("Health check error:", e)
