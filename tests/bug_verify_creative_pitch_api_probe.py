import requests, json
base='http://localhost:8001'
for bid in ['bc-942ddda2','bc-5e08b38a','bc-0ae422a0dc']:
    print('\nBC', bid)
    b=requests.get(f'{base}/api/v3/business-cases/{bid}',timeout=20).json()
    print('selected', b.get('selected_creator_ids'))
    briefs=requests.get(f'{base}/api/v3/creative-briefs', params={'business_case_id': bid},timeout=20).json()
    print('briefs', [(x.get('id'), x.get('creator_id'), x.get('email_status') or (x.get('email') or {}).get('status')) for x in briefs])
    pd=b.get('pitch_deck')
    print('pitch', pd and pd.get('id'), pd and len(pd.get('sections') or []), pd and [len(s.get('content','')) for s in (pd.get('sections') or [])])
