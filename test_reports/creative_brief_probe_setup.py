import os, re, json, urllib.request, urllib.error
from pathlib import Path
base = None
for line in Path('/app/frontend/.env').read_text().splitlines():
    if line.startswith('REACT_APP_BACKEND_URL='):
        base = line.split('=',1)[1].strip().strip('"')
print('BASE', base)

def req(path, method='GET', data=None):
    body = None if data is None else json.dumps(data).encode()
    r = urllib.request.Request(base+path, data=body, method=method, headers={'Content-Type':'application/json'} if body else {})
    try:
        with urllib.request.urlopen(r, timeout=20) as resp:
            raw=resp.read()
            print(method, path, resp.status, resp.headers.get('content-type'), len(raw))
            if 'json' in (resp.headers.get('content-type') or ''):
                return json.loads(raw)
            return raw
    except urllib.error.HTTPError as e:
        print(method, path, 'HTTP', e.code, e.read()[:500])
    except Exception as e:
        print(method, path, type(e).__name__, e)

for p in ['/api/v3/creative-briefs', '/api/v3/business-cases?limit=3', '/api/v3/creators?limit=3']:
    data=req(p)
    if isinstance(data, (list,dict)):
        print(json.dumps(data if not isinstance(data,list) else data[:2], indent=2)[:1500])
