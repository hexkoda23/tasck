"""Shared snapshots resolve the document's own brand, not a browser session."""
from copy import deepcopy
import pytest
from fastapi import HTTPException
from v3_routes import make_v3_router


def finish(coroutine):
    try:
        coroutine.send(None)
    except StopIteration as result:
        return result.value
    raise AssertionError("Fake database should complete without external services")


def test_shared_snapshot_opens_exact_brand_and_content_without_portal_session():
    class Collection:
        def __init__(self, docs):
            self.docs = docs
        async def find_one(self, query, projection=None):
            return next((deepcopy(doc) for doc in self.docs
                         if all(doc.get(k) == v for k, v in query.items())), None)
    class Database:
        v3_alignment_snapshots = Collection([{"id": "snap-nnpc", "business_case_id": "bc-nnpc",
            "title": "NNPC Alignment Snapshot", "sections": [{"heading": "Success Metrics",
            "columns": ["Metric", "Target"], "rows": [["New users", "100,000"]]}]}])
        v3_business_cases = Collection([{"id": "bc-nnpc", "brand_id": "brand-nnpc", "title": "NNPC Campaign"}])
        v3_brands = Collection([{"id": "brand-nnpc", "company": "NNPC"}])
    router = make_v3_router(Database())
    route = next(route for route in router.routes
                 if route.path.endswith('/alignment-snapshots/{snapshot_id}/preview'))
    response = finish(route.endpoint("snap-nnpc"))
    content = response.body.decode()
    assert response.status_code == 200
    assert "NNPC Alignment Snapshot" in content
    assert "100,000" in content
    assert "Brand not found" not in content
    assert "doc=snap-nnpc" in content
    assert 'name="viewport"' in content
    with pytest.raises(HTTPException) as error:
        finish(route.endpoint("missing"))
    assert error.value.status_code == 404
