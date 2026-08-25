"""Iteration 37 regression tests.

Covers:
 - Pitch deck flipbook renderer (new template + legacy) markup
 - Deck analytics endpoints (open view + page turn)
 - Email transactional HTML (inline CID logo + wordmark) and MIME shape
 - Creative Brief always delivered as .docx (never PDF/HTML)
"""

import os
import re
import uuid
from email.message import EmailMessage

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
assert BASE_URL, "REACT_APP_BACKEND_URL must be set"

TEMPLATE_DECK = "pd-b17d80c0"
LEGACY_DECK = "pd-dfd1cca6"
BC_ID = "bc-f211533491"
CREATOR_A = "creator-9c51ad8660"   # MI (no email)
CREATOR_B = "creator-0ffe5398f1"   # Kiekie

DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module", autouse=True)
def ensure_generated_brief(api):
    """The .docx / preview endpoints require a generated brief on the BC.
    If plan.generated_brief is missing (fresh DB), kick the generator once."""
    import time as _t
    bc = api.get(f"{BASE_URL}/api/v3/business-cases/{BC_ID}").json()
    plan = ((bc.get("business_case") or bc).get("plan") or {})
    if plan.get("generated_brief"):
        return
    r = api.post(f"{BASE_URL}/api/v3/business-cases/{BC_ID}/ai/creative-brief/generate", json={})
    if r.status_code not in (200, 201, 202):
        pytest.skip(f"generate endpoint failed: {r.status_code} {r.text[:200]}")
    job_id = (r.json().get("job_id") or r.json().get("id"))
    status = None
    for _ in range(40):
        _t.sleep(3)
        j = api.get(f"{BASE_URL}/api/v3/business-cases/{BC_ID}/ai/creative-brief/jobs/{job_id}").json() or {}
        job = j.get("job") or j
        status = job.get("status")
        if status in ("done", "completed", "failed", "error"):
            break
    if status not in ("done", "completed"):
        pytest.skip(f"brief generation did not complete in time (status={status})")


# ---------------------------------------------------------------- FLIPBOOK ---
class TestFlipbookRenderers:

    def test_template_flipbook_markup(self, api):
        r = api.get(f"{BASE_URL}/api/v3/pitch-decks/{TEMPLATE_DECK}/flipbook")
        assert r.status_code == 200, r.text[:400]
        assert "text/html" in r.headers.get("content-type", "")
        html = r.text
        # Book container + curl hint
        assert "book-wrap" in html
        assert "curl-hint" in html
        # Toolbar controls
        for tid in ("id='m-flip'", "id='m-slides'", "id='m-full'", "id='count'", "id='prev'", "id='next'"):
            assert tid in html, f"template missing {tid}"
        # StPageFlip build + snappy config
        assert "flippingTime:550" in html
        assert "swipeDistance:12" in html
        # Print rules hide book-wrap
        assert "#book-wrap" in html and "@media print" in html
        # 16 slide entries in the printable/slides mode
        # markup: <section class="slide s-dark" ...>  (or single quotes)
        n_slide = html.count('class="slide ') + html.count("class='slide ")
        assert n_slide >= 16, f"expected >=16 .slide sections, got {n_slide}"

    def test_legacy_flipbook_markup(self, api):
        r = api.get(f"{BASE_URL}/api/v3/pitch-decks/{LEGACY_DECK}/flipbook")
        assert r.status_code == 200, r.text[:400]
        html = r.text
        assert 'id="curl-hint"' in html
        assert 'data-testid="flipbook-fullscreen"' in html
        assert 'id="indicator"' in html
        # Legacy renderer must still keep the Download PDF button
        assert "Download PDF" in html or "download-pdf" in html.lower()
        # Snappy StPageFlip config
        assert "flippingTime: 550" in html or "flippingTime:550" in html
        assert "swipeDistance: 12" in html or "swipeDistance:12" in html

    def test_pageflip_bundle_served(self, api):
        r = api.get(f"{BASE_URL}/api/v3/static/pageflip/page-flip.browser.js")
        # The bundle can be served via /static or through the flipbook HTML;
        # ensure it exists somewhere reachable from the backend origin.
        if r.status_code == 404:
            # Fallback: at minimum the deck HTML must include the loader
            html = api.get(f"{BASE_URL}/api/v3/pitch-decks/{TEMPLATE_DECK}/flipbook").text
            assert "page-flip" in html.lower() or "PageFlip" in html
        else:
            assert r.status_code in (200, 304)


# --------------------------------------------------------------- ANALYTICS ---
class TestDeckAnalytics:

    def test_open_and_turn(self, api):
        session = f"TEST-sess-{uuid.uuid4().hex[:8]}"
        # Open
        r = api.post(
            f"{BASE_URL}/api/v3/pitch-decks/{TEMPLATE_DECK}/analytics/view",
            json={"session_id": session, "source": "brand"},
        )
        assert r.status_code in (200, 201), r.text[:300]
        # Turn
        r2 = api.post(
            f"{BASE_URL}/api/v3/pitch-decks/{TEMPLATE_DECK}/analytics/turn",
            json={"session_id": session, "page": 3},
        )
        assert r2.status_code == 200, r2.text[:300]
        assert r2.json().get("ok") is True

        # Aggregated analytics reflects the session
        agg = api.get(f"{BASE_URL}/api/v3/pitch-decks/{TEMPLATE_DECK}/analytics").json()
        rows = agg.get("rows") or agg.get("views") or []
        found = [r for r in rows if r.get("session_id") == session]
        assert found, "TEST session not surfaced in analytics"
        assert int(found[0].get("page_turns") or 0) >= 1


# ------------------------------------------------------------------- EMAIL ---
class TestEmailLogoAndMime:
    """Build the outgoing message in-process via the exposed helpers."""

    def test_transactional_html_has_cid_and_wordmark(self):
        import sys
        sys.path.insert(0, "/app/backend")
        # Import server so the router (and its closures) are constructed.
        import importlib
        server = importlib.import_module("server")
        router = None
        for candidate in ("api_router", "api", "router", "v3_router"):
            r = getattr(server, candidate, None)
            if r is not None and hasattr(r, "_smtp_transactional_html"):
                router = r
                break
        if router is None:
            # Search app routes for the closure attributes.
            app = getattr(server, "app", None)
            assert app is not None
            for r in getattr(app, "router", None).routes if app else []:
                if hasattr(r, "_smtp_transactional_html"):
                    router = r
                    break
        assert router is not None, "Could not locate router with _smtp_transactional_html"

        html = router._smtp_transactional_html(
            "Hello,\n\nThis is a test.\n",
            "from@example.com",
            logo_src="cid:tasck-logo",
        )
        assert "cid:tasck-logo" in html
        assert "THE TASCK AGENCY." in html
        assert "data:image" not in html, "must not embed data URI when CID is used"

    def test_transactional_html_fallback_wordmark(self):
        import importlib, sys
        sys.path.insert(0, "/app/backend")
        server = importlib.import_module("server")
        # Find router with helper
        router = None
        app = getattr(server, "app", None)
        for r in app.router.routes:
            if hasattr(r, "_smtp_transactional_html"):
                router = r; break
        # Also try attribute-scan on top-level routers module
        if router is None:
            for name in dir(server):
                obj = getattr(server, name)
                if hasattr(obj, "_smtp_transactional_html"):
                    router = obj; break
        assert router is not None
        html = router._smtp_transactional_html("Hi\n", "from@example.com", logo_src=None)
        # Wordmark always renders even when there is no img
        assert "THE TASCK AGENCY." in html

    def test_mime_structure_multipart_related_with_cid(self):
        """Assemble the message with the same construction the delivery
        function uses and verify multipart/alternative > [plain, related>[html,image]]."""
        import importlib, sys
        sys.path.insert(0, "/app/backend")
        server = importlib.import_module("server")
        router = getattr(server, "v3_router", None)
        assert router is not None, "server.v3_router not found"
        smtp_html_fn = getattr(router, "_smtp_transactional_html", None)
        logo_bytes_fn = getattr(router, "_email_logo_bytes", None)
        assert smtp_html_fn and logo_bytes_fn

        logo_bytes = logo_bytes_fn()
        assert logo_bytes, "email logo bytes should be produced"

        msg = EmailMessage()
        msg["From"] = "TASCK <from@example.com>"
        msg["To"] = "to@example.com"
        msg["Subject"] = "Test"
        msg.set_content("plain body")
        html_body = smtp_html_fn("plain body\n", "from@example.com", logo_src="cid:tasck-logo")
        msg.add_alternative(html_body, subtype="html")
        html_part = msg.get_payload()[-1]
        html_part.add_related(logo_bytes, maintype="image", subtype="jpeg", cid="<tasck-logo>")

        # Root should be multipart/alternative
        assert msg.get_content_type() == "multipart/alternative"
        parts = msg.get_payload()
        types = [p.get_content_type() for p in parts]
        assert "text/plain" in types
        related = [p for p in parts if p.get_content_type() == "multipart/related"]
        assert related, f"expected a multipart/related, got {types}"
        rel_parts = related[0].get_payload()
        sub_types = [p.get_content_type() for p in rel_parts]
        assert "text/html" in sub_types
        assert any(t.startswith("image/") for t in sub_types)
        # Content-ID header on the image
        img = [p for p in rel_parts if p.get_content_type().startswith("image/")][0]
        cid = img.get("Content-ID") or ""
        assert "tasck-logo" in cid


# ------------------------------------------------------------ CREATIVE BRIEF ---
class TestCreativeBriefAlwaysDocx:

    def _assert_docx_response(self, r):
        assert r.status_code == 200, r.text[:300]
        ct = r.headers.get("content-type", "")
        assert DOCX_MIME in ct, f"bad content-type: {ct}"
        cd = r.headers.get("content-disposition", "")
        assert ".docx" in cd, f"missing .docx filename: {cd}"
        # DOCX = zip file, starts with PK
        body = r.content
        assert body[:2] == b"PK", "response body is not a docx (no PK header)"

    def test_bc_docx_endpoint(self, api):
        r = api.get(f"{BASE_URL}/api/v3/business-cases/{BC_ID}/creative-brief/docx")
        self._assert_docx_response(r)

    def test_bc_docx_with_creator(self, api):
        r = api.get(
            f"{BASE_URL}/api/v3/business-cases/{BC_ID}/creative-brief/docx",
            params={"creator_id": CREATOR_B},
        )
        self._assert_docx_response(r)

    def test_preview_docx_post(self, api):
        r = api.post(
            f"{BASE_URL}/api/v3/business-cases/{BC_ID}/creative-briefs/preview-docx",
            json={"brief_text": "TEST body", "creator_id": CREATOR_B},
        )
        self._assert_docx_response(r)

    def test_creative_briefs_post_attaches_docx(self, api):
        # Note: no brief_text — the generated 4-page brief on bc-f211533491 wins.
        r = api.post(
            f"{BASE_URL}/api/v3/creative-briefs",
            json={
                "business_case_id": BC_ID,
                "creator_id": CREATOR_B,
                "creator_contact_email": "TEST_recipient@example.com",
                "subject": "TEST_ auto brief",
                "brief_text": "",
            },
        )
        assert r.status_code == 200, r.text[:400]
        doc = r.json()
        brief_id = doc["id"]
        # Fetch the brief docx directly to confirm
        d = api.get(f"{BASE_URL}/api/v3/creative-briefs/{brief_id}/docx")
        self._assert_docx_response(d)
        # Also verify the queued email attachment: only one, and it is docx.
        email = doc.get("email") or {}
        attachments = email.get("attachments") or []
        assert attachments, "creative-briefs POST did not attach any file"
        for a in attachments:
            fn = str(a.get("filename") or "")
            mt = str(a.get("mime_type") or "")
            assert fn.endswith(".docx"), f"non-docx attachment: {fn}"
            assert mt == DOCX_MIME, f"non-docx mime: {mt}"
            assert "pdf" not in fn.lower()
            assert "html" not in fn.lower()

    def test_bc_send_attaches_docx(self, api):
        r = api.post(
            f"{BASE_URL}/api/v3/business-cases/{BC_ID}/creative-brief/send",
            json={
                "recipient_email": "TEST_brand@example.com",
                "subject": "TEST_ send",
                "creator_name": "Kiekie",
            },
        )
        assert r.status_code == 200, r.text[:400]
        body = r.json()
        email = body.get("email") or {}
        attachments = email.get("attachments") or []
        assert attachments, "send endpoint did not attach anything"
        for a in attachments:
            fn = str(a.get("filename") or "")
            mt = str(a.get("mime_type") or "")
            assert fn.endswith(".docx"), f"non-docx attachment: {fn}"
            assert mt == DOCX_MIME
            assert "pdf" not in fn.lower()


# ---------------------------------------------------- BRIEF PREVIEW (4 pages) ---
class TestCreativeBriefPreview4Pages:

    def test_preview_returns_4_pages(self, api):
        r = api.get(
            f"{BASE_URL}/api/v3/business-cases/{BC_ID}/creative-brief/preview",
            params={"creator_id": CREATOR_B},
        )
        assert r.status_code == 200, r.text[:400]
        html = r.text
        for n in (1, 2, 3, 4):
            assert f'data-testid="cb-page-{n}"' in html or f"cb-page-{n}" in html, \
                f"missing cb-page-{n} in preview"
