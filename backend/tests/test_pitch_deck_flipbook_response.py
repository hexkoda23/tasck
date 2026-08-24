"""Regression: the Pitch Deck document routes must return a framed, complete
HTTP response - and must fail loudly rather than silently.

Symptom this covers: "The origin web server sent a response that Cloudflare
could not parse. This may indicate the origin returned an empty response,
malformed HTTP headers, or an otherwise invalid response."

Both document routes used to answer with `StreamingResponse(BytesIO(...))`,
which sends ~1.5 MB chunked with no Content-Length and makes a second full
in-memory copy of the document on every hit. The same deck is fetched by the
admin preview iframe, the brand portal embed, the download button and the
print-to-PDF view, so that cost was paid over and over on the event loop.
"""

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

pytest.importorskip("httpx2", reason="starlette's TestClient needs httpx2")

from fastapi import FastAPI  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

import v3_routes  # noqa: E402


def _deck():
    return {
        "id": "pd-test", "business_case_id": "bc-1", "title": "Star x TASCK",
        "updated_at": "2026-08-24T00:00:00Z",
        "sections": [{"heading": f"H{i}", "content": "Body " * 60} for i in range(10)],
        "slides": {}, "creator_images": [], "cover_image": "",
    }


class _Coll:
    def __init__(self, doc):
        self.doc = doc

    async def find_one(self, *args, **kwargs):
        return self.doc


class _DB:
    def __init__(self, deck):
        self._by_name = {
            "v3_pitch_decks": _Coll(deck),
            "v3_business_cases": _Coll({"id": "bc-1", "brand_id": "b-1"}),
            "v3_brands": _Coll({"id": "b-1", "company": "Star Lager"}),
        }

    def __getattr__(self, name):
        return self._by_name.get(name, _Coll(None))


@pytest.fixture()
def deck():
    return _deck()


@pytest.fixture()
def client(deck):
    app = FastAPI()
    app.include_router(v3_routes.make_v3_router(_DB(deck)))
    return TestClient(app)


@pytest.mark.parametrize("url", [
    "/api/v3/pitch-decks/pd-test/flipbook",
    "/api/v3/pitch-decks/pd-test/flipbook?view=slides",
    "/api/v3/pitch-decks/pd-test/flipbook?download=1",
    "/api/v3/pitch-decks/pd-test/docx",
])
def test_document_routes_declare_their_length(client, url):
    """Every deck document must arrive with a Content-Length the gateway can
    frame. Without it the megabyte goes out chunked and a truncated stream is
    indistinguishable from a valid one."""
    response = client.get(url)

    assert response.status_code == 200
    assert response.headers.get("content-length") == str(len(response.content))
    assert len(response.content) > 1000


def test_download_keeps_its_filename(client):
    response = client.get("/api/v3/pitch-decks/pd-test/flipbook?download=1")
    assert 'filename="Star_x_TASCK.html"' in response.headers["content-disposition"]


def test_repeat_views_reuse_the_render(client, deck):
    """The preview iframe, the portal embed and the download all hit this one
    route; re-rendering a megabyte per hit is what starved the worker."""
    first = client.get("/api/v3/pitch-decks/pd-test/flipbook")
    second = client.get("/api/v3/pitch-decks/pd-test/flipbook")
    assert first.content == second.content


def test_edited_deck_is_not_served_from_cache(client, deck):
    """Caching must never outlive the deck it was rendered from."""
    before = client.get("/api/v3/pitch-decks/pd-test/flipbook").content

    deck["title"] = "Star x TASCK v2"
    deck["updated_at"] = "2026-08-25T00:00:00Z"
    after = client.get("/api/v3/pitch-decks/pd-test/flipbook").content

    assert after != before


def test_render_failure_returns_a_readable_page(client, deck, monkeypatch):
    """A template error must not tear down the connection mid-response - inside
    the preview iframe that reads as an unexplained gateway error."""
    import v3_flipbook

    def _boom(*args, **kwargs):
        raise ValueError("template exploded")

    monkeypatch.setattr(v3_flipbook, "pitch_deck_flipbook_html", _boom)
    deck["updated_at"] = "2026-08-26T00:00:00Z"  # miss the cache

    response = client.get("/api/v3/pitch-decks/pd-test/flipbook")

    assert response.status_code == 500
    assert "template exploded" in response.text
    assert response.headers["content-type"].startswith("text/html")
