import requests, json
base='http://localhost:8001'
cases=requests.get(base+'/api/v3/business-cases',timeout=30).json()
print('cases', len(cases))
for c in cases:
    bid=c.get('id')
    b=requests.get(f'{base}/api/v3/business-cases/{bid}',timeout=20).json()
    pd=b.get('pitch_deck')
    selected=b.get('selected_creator_ids') or c.get('selected_creator_ids') or (b.get('business_case') or {}).get('plan',{}).get('selected_creator_ids')
    cb=b.get('creative_brief')
    print(bid, c.get('brand_name') or c.get('title'), 'pitch', bool(pd), 'sections', len((pd or {}).get('sections') or []), 'selected', selected, 'brief', bool(cb), 'active_snapshot', b.get('active_snapshot_id'))
