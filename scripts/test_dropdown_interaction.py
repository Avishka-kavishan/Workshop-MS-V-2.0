import urllib.request
import re

url = 'http://localhost:3000/annual-plan'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req) as resp:
        html = resp.read().decode('utf-8')
        print("Status code:", resp.status)
        print("Has GlobalSearchableSelect in bundle:", 'GlobalSearchableSelect' in html)
        # Check script tags
        scripts = re.findall(r'<script[^>]+src="([^">]+)"', html)
        print("Scripts found:", len(scripts))
        for s in scripts:
            if 'app' in s or 'layout' in s or 'page' in s:
                try:
                    s_url = 'http://localhost:3000' + s if s.startswith('/') else s
                    with urllib.request.urlopen(s_url) as s_resp:
                        js = s_resp.read().decode('utf-8')
                        if 'Type a few letters to find' in js:
                            print("FOUND 'Type a few letters to find' in script:", s)
                except Exception as e:
                    pass
except Exception as e:
    print("Error:", e)
