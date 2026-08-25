"""Iteration 36: Fixed 4-page canonical Creative Brief template tests.

Covers: preview HTML, DOCX download, create /creative-briefs, send endpoint,
canonical section counts, boilerplate wordings, creator personalisation,
regression on /creative-briefs/{id}/docx (legacy free-text and templated).
"""
import io
import os
import re
import time
import zipfile

import pytest
import requests
from dotenv import load_dotenv

load_dotenv("/app/backend/.env")
load_dotenv("/app/frontend/.env")

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
BC_ID = "bc-f211533491"  # NASCO – Cornflakes (already has generated brief)
CREATOR_ID = "creator-9c51ad8660"  # MI
CREATOR2_ID = "creator-0ffe5398f1"  # Kiekie

BOILERPLATE = [
    "All content must reinforce one clear story:",
    "Your content should bring these four pillars to life:",
    "Content is not one-off, it is a series designed to:",
    "Your creativity is key, but every piece of content should move your audience to act.",
    "Hybrid structure:",
    "Fixed base fee",
    "Performance-based incentives (approx. 50%) tied to:",
]
CLOSING_CORE = "reply with your rate card or let us know a good time to connect"


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def brief_doc(api):
    r = api.get(f"{BASE_URL}/api/v3/business-cases/{BC_ID}")
    assert r.status_code == 200
    doc = ((r.json().get("business_case") or {}).get("plan") or {}).get("generated_brief")
    assert doc, "Expected pre-generated brief on bc-f211533491"
    return doc


# ---------------- section shape / counts ----------------
class TestCanonicalShape:
    def test_nine_sections_in_order(self, brief_doc):
        expected = [
            "The Opportunity", "Your Role", "Core Narrative (Non-Negotiable)",
            "What You'll Do", "Content Approach",
            "Creator Benefits (Limited Access)", "Success Metrics",
            "Commercial Model", "Next Steps",
        ]
        headings = [s.get("heading") for s in brief_doc.get("sections", [])]
        assert headings == expected, headings

    def test_counts(self, brief_doc):
        secs = {s["heading"]: s for s in brief_doc["sections"]}
        assert len(secs["The Opportunity"].get("bullets") or []) == 5
        assert len(secs["Core Narrative (Non-Negotiable)"].get("bullets") or []) == 4
        groups = secs["What You'll Do"].get("groups") or []
        assert len(groups) == 4
        for g in groups:
            assert len(g.get("bullets") or []) == 3, g
        assert len(secs["Content Approach"].get("bullets") or []) == 4
        assert len(secs["Creator Benefits (Limited Access)"].get("bullets") or []) == 8
        assert len(secs["Success Metrics"].get("bullets") or []) == 5
        cm = secs["Commercial Model"]
        assert len(cm.get("bullets") or []) == 2
        assert len(cm.get("groups", [{}])[0].get("sub_bullets") or []) == 4


# ---------------- HTML preview ----------------
class TestPreviewHTML:
    def test_preview_4_page_cards(self, api):
        r = api.get(f"{BASE_URL}/api/v3/business-cases/{BC_ID}/creative-brief/preview")
        assert r.status_code == 200
        html = r.text
        for i in range(1, 5):
            assert f'data-testid="cb-page-{i}"' in html, f"missing cb-page-{i}"
        assert 'data-testid="cb-page-5"' not in html
        assert "Print / Save as PDF" in html or "Print" in html

    def test_preview_page_headings(self, api):
        html = api.get(
            f"{BASE_URL}/api/v3/business-cases/{BC_ID}/creative-brief/preview"
        ).text
        # split pages
        pages = {}
        for i in range(1, 5):
            m = re.search(
                rf'data-testid="cb-page-{i}".*?(?=data-testid="cb-page-{i+1}"|$)',
                html, re.S,
            )
            pages[i] = m.group(0) if m else ""
        h = lambda p: re.findall(r"<h2[^>]*>([^<]+)</h2>", pages[p])
        assert "The Opportunity" in h(1) and "Your Role" in h(1) and "Core Narrative" in h(1)[2]
        assert any("What" in x for x in h(2))
        assert "Content Approach" in h(3) and "Success Metrics" in h(3)
        assert "Commercial Model" in h(4) and "Next Steps" in h(4)

    def test_boilerplate_verbatim(self, api):
        html = api.get(
            f"{BASE_URL}/api/v3/business-cases/{BC_ID}/creative-brief/preview"
        ).text
        for phrase in BOILERPLATE:
            assert phrase in html, f"missing boilerplate: {phrase}"
        assert CLOSING_CORE in html

    def test_preview_no_creator_has_no_prepared_for(self, api):
        html = api.get(
            f"{BASE_URL}/api/v3/business-cases/{BC_ID}/creative-brief/preview"
        ).text
        assert "Prepared for:" not in html
        # closing line NOT personalised
        assert not re.search(r"[A-Z][a-zA-Z]+, if you", html)

    def test_preview_with_creator_prepared_for_and_named_closing(self, api):
        html = api.get(
            f"{BASE_URL}/api/v3/business-cases/{BC_ID}/creative-brief/preview",
            params={"creator_id": CREATOR_ID},
        ).text
        assert "Prepared for:" in html
        assert re.search(r"MI, if you.{0,10}re interested", html)

    def test_preview_logo_and_footer_on_each_page(self, api):
        html = api.get(
            f"{BASE_URL}/api/v3/business-cases/{BC_ID}/creative-brief/preview"
        ).text
        # At least 2 imgs per page × 4 pages = 8 imgs (logo header + footer strip)
        assert html.count("<img") >= 8


# ---------------- DOCX ----------------
class TestDocx:
    def _xml(self, content: bytes) -> str:
        with zipfile.ZipFile(io.BytesIO(content)) as z:
            return z.read("word/document.xml").decode("utf-8", errors="ignore")

    def test_docx_has_3_page_breaks(self, api):
        r = api.get(f"{BASE_URL}/api/v3/business-cases/{BC_ID}/creative-brief/docx")
        assert r.status_code == 200
        assert r.headers["content-type"].startswith(
            "application/vnd.openxmlformats-officedocument.wordprocessingml"
        )
        xml = self._xml(r.content)
        assert xml.count('<w:br w:type="page"/>') == 3

    def test_docx_content_matches_preview_boilerplate(self, api):
        r = api.get(f"{BASE_URL}/api/v3/business-cases/{BC_ID}/creative-brief/docx")
        xml = self._xml(r.content)
        for phrase in BOILERPLATE:
            assert phrase in xml, f"docx missing: {phrase}"
        assert "rate card" in xml

    def test_docx_with_creator_has_prepared_for(self, api):
        r = api.get(
            f"{BASE_URL}/api/v3/business-cases/{BC_ID}/creative-brief/docx",
            params={"creator_id": CREATOR_ID},
        )
        xml = self._xml(r.content)
        assert "Prepared for" in xml
        assert "MI" in xml


# ---------------- generate endpoint ----------------
class TestGenerate:
    def test_generate_and_poll(self, api):
        r = api.post(
            f"{BASE_URL}/api/v3/business-cases/{BC_ID}/ai/creative-brief/generate",
            json={},
        )
        assert r.status_code in (200, 201, 202), r.text
        data = r.json()
        job_id = data.get("job_id") or data.get("id")
        assert job_id, data
        status = None
        for _ in range(30):
            time.sleep(3)
            j = api.get(
                f"{BASE_URL}/api/v3/business-cases/{BC_ID}/ai/creative-brief/jobs/{job_id}"
            )
            assert j.status_code == 200
            body = j.json() or {}
            job = body.get("job") or body
            status = job.get("status")
            if status in ("done", "completed", "failed", "error"):
                break
        assert status in ("done", "completed"), f"job status={status}, job={job}"
        # Verify canonical shape after regenerate
        r2 = api.get(f"{BASE_URL}/api/v3/business-cases/{BC_ID}")
        doc = ((r2.json()["business_case"].get("plan") or {}).get("generated_brief")) or {}
        headings = [s.get("heading") for s in doc.get("sections", [])]
        assert headings[0] == "The Opportunity"
        assert headings[-1] == "Next Steps"
        assert len(headings) == 9


# ---------------- send / create ----------------
class TestSendCreate:
    def test_create_brief_without_brief_text(self, api):
        payload = {
            "business_case_id": BC_ID,
            "creator_id": CREATOR2_ID,
            "creator_contact_email": "test+kiekie@example.com",
            "subject": "TEST_Creative Brief - NASCO",
        }
        r = api.post(f"{BASE_URL}/api/v3/creative-briefs", json=payload)
        assert r.status_code in (200, 201), r.text
        doc = r.json()
        assert doc.get("id")
        assert doc.get("brief_text")
        # brief_text should be flattened structured content (not empty), containing boilerplate
        assert "All content must reinforce one clear story" in doc["brief_text"]
        # regression: docx download for this brief
        rd = api.get(f"{BASE_URL}/api/v3/creative-briefs/{doc['id']}/docx")
        assert rd.status_code == 200
        with zipfile.ZipFile(io.BytesIO(rd.content)) as z:
            xml = z.read("word/document.xml").decode("utf-8", errors="ignore")
        assert xml.count('<w:br w:type="page"/>') == 3

    def test_send_endpoint_no_brief_text(self, api):
        payload = {
            "recipient_email": "test+brand@example.com",
            "subject": "TEST_Send NASCO Brief",
        }
        r = api.post(
            f"{BASE_URL}/api/v3/business-cases/{BC_ID}/creative-brief/send",
            json=payload,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("ok") is True
        assert (data.get("email") or {}).get("status") in (
            "queued", "sent", "failed", "delivery_failed", "delivery_error"
        )


# ---------------- regression: legacy free-text brief ----------------
class TestLegacyRegression:
    def test_legacy_free_text_brief_docx(self, api):
        # Find or create a business case WITHOUT generated_brief
        # Then insert a legacy free-text brief via the API and download docx
        # Simpler: pick any other bc, create a brief while ensuring no generated_brief
        r = api.get(f"{BASE_URL}/api/v3/business-cases")
        cases = r.json() if isinstance(r.json(), list) else r.json().get("business_cases", [])
        target = None
        for c in cases:
            if c.get("id") == BC_ID:
                continue
            plan = c.get("plan") or {}
            if not plan.get("generated_brief"):
                target = c["id"]
                break
        if not target:
            pytest.skip("no business case without generated_brief available")
        # need any creator id
        cr = api.get(f"{BASE_URL}/api/v3/creators").json()
        creator_id = (cr[0] if isinstance(cr, list) else cr.get("creators", [{}])[0])["id"]
        payload = {
            "business_case_id": target,
            "creator_id": creator_id,
            "creator_contact_email": "test+legacy@example.com",
            "brief_text": "TEST_LEGACY free text body of an old-style brief.",
            "subject": "TEST_legacy brief",
        }
        rc = api.post(f"{BASE_URL}/api/v3/creative-briefs", json=payload)
        assert rc.status_code in (200, 201), rc.text
        brief_id = rc.json()["id"]
        rd = api.get(f"{BASE_URL}/api/v3/creative-briefs/{brief_id}/docx")
        assert rd.status_code == 200, rd.text
        assert rd.content[:2] == b"PK"  # valid zip / docx
