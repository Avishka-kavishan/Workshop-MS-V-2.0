import urllib.request
import urllib.error

try:
    req = urllib.request.Request('http://localhost:3000/api/system/health')
    with urllib.request.urlopen(req) as resp:
        print("Success:", resp.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print("HTTP Error:", e.code, e.read().decode('utf-8'))
except Exception as e:
    print("Other error:", e)
