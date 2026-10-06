"""An admin edit survives in both stored copies of a generated creator brief."""

import asyncio
from copy import deepcopy

import httpx
from fastapi import FastAPI

from v3_routes import make_v3_router


class Collection:
    def __init__(self, documents):
        self.documents = documents

    async def find_one(self, query, projection=None):
        return next((deepcopy(doc) for doc in self.documents if all(doc.get(k) == v for k, v in query.items())), None)

    async def update_one(self, query, update):
        doc = next(doc for doc in self.documents if all(doc.get(k) == v for k, v in query.items()))
        for path, value in update.get('$set', {}).items():
            target = doc
            parts = path.split('.')
            for part in parts[:-1]:
                target = target.setdefault(part, {})
            target[parts[-1]] = deepcopy(value)
        for path, value in update.get('$push', {}).items():
            doc.setdefault(path, []).append(deepcopy(value))


class Database:
    def __init__(self, brief):
        self.v3_business_cases = Collection([{
            'id': 'case-1', 'frame': {'alignment_snapshot_id': 'snap-1'},
            'plan': {'generated_brief': deepcopy(brief)},
        }])
        self.v3_alignment_snapshots = Collection([{
            'id': 'snap-1', 'business_case_id': 'case-1',
            'generated_brief': deepcopy(brief),
        }])


def test_admin_edit_is_saved_to_snapshot_and_case():
    brief = {
        'title': 'CREATOR ROLE BRIEF', 'duration': 'October - December 2026',
        'sections': [{'heading': 'The Opportunity', 'paragraphs': ['Original copy'],
                      'bullets': ['Original point']}],
    }
    db = Database(brief)
    app = FastAPI()
    app.include_router(make_v3_router(db))

    async def scenario():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url='http://test') as client:
            response = await client.patch(
                '/api/v3/business-cases/case-1/creative-brief',
                params={'alignment_snapshot_id': 'snap-1'},
                json={'title': 'Updated brief', 'duration': 'January 2027',
                      'sections': [{'heading': 'The Opportunity',
                                    'paragraphs': ['Edited copy'], 'bullets': ['Edited point']}]},
            )
            assert response.status_code == 200, response.text
            assert response.json()['brief']['sections'][0]['paragraphs'] == ['Edited copy']
            assert db.v3_business_cases.documents[0]['plan']['generated_brief'] == db.v3_alignment_snapshots.documents[0]['generated_brief']
            assert db.v3_alignment_snapshots.documents[0]['generated_brief']['duration'] == 'January 2027'

            response = await client.patch(
                '/api/v3/business-cases/case-1/creative-brief',
                params={'alignment_snapshot_id': 'another-case-snapshot'},
                json={'title': 'Wrong case', 'sections': [{'heading': 'The Opportunity'}]},
            )
            assert response.status_code == 404

    asyncio.run(scenario())
