"""Regression: "Download PDF" must download the PDF, not open it in a tab.

Reported from the Final Report preview: clicking "Download PDF" opened
/api/v3/final-reports/{id}/pdf in a new browser tab. The route answered with
`Content-Disposition: inline`, which tells the browser to display the PDF
rather than save it. The same header backed the Feedback and Contract PDFs,
which share the preview modal and its button.

Every PDF route behind a "Download PDF" button must now:
 - answer with `Content-Disposition: attachment` and a `.pdf` filename,
 - name the file after the document title (with an ASCII fallback),
 - still return a real, complete PDF (Content-Length set, %PDF magic bytes),
 - 404 loudly when the document does not exist.
"""

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

pytest.importorskip("reportlab", reason="the PDF routes render with reportlab")

from fastapi import FastAPI  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

import v3_routes  # noqa: E402


REPORT = {
    "id": "fr-test",
    "business_case_id": "bc-1",
    "title": "NNPC - Business Case Frame - Final Campaign Report",
    "sections": [
        {"heading": "1. Title page", "content": "Brand: NNPC\nCreator: Anabel"},
        {"heading": "2. Executive summary", "content": "Delivered 0 of 1 contracted milestones."},
    ],
    "feedback": {
        "email_template": "Hello, please rate the campaign.",
        "brand_partner": {
            "form_title": "Brand Partner Feedback",
            "project_name": "NNPC - Business Case Frame",
            "questions": [{"label": "Clarity", "question": "Was the brief clear?", "rating": 8}],
        },
        "creative_partner": {
            "form_title": "Creative Partner Feedback",
            "project_name": "NNPC - Business Case Frame",
            "questions": [{"label": "Support", "question": "Were you supported?", "rating": 9}],
        },
        "internal_use": ["Follow up on milestone 1."],
    },
}

CONTRACT = {
    "id": "ctr-test",
    "business_case_id": "bc-1",
    "template": "brand_msa",
    "title": "NNPC x TASCK - Service Agreement",
    "sections": [{"heading": "1. Parties", "content": "NNPC and TASCK."}],
}


class _Coll:
    def __init__(self, doc):
        self.doc = doc

    async def find_one(self, query=None, *args, **kwargs):
        if self.doc is None:
            return None
        wanted = (query or {}).get("id")
        if wanted is not None and wanted != self.doc.get("id"):
            return None
        return dict(self.doc)

    async def update_one(self, *args, **kwargs):
        return None


class _DB:
    def __init__(self):
        self._by_name = {
            "v3_final_reports": _Coll(REPORT),
            "v3_contracts": _Coll(CONTRACT),
            "v3_business_cases": _Coll({"id": "bc-1", "brand_id": "b-1"}),
            "v3_brands": _Coll({"id": "b-1", "company": "NNPC"}),
        }

    def __getattr__(self, name):
        return self._by_name.get(name, _Coll(None))


@pytest.fixture()
def client():
    app = FastAPI()
    app.include_router(v3_routes.make_v3_router(_DB()))
    return TestClient(app)


@pytest.mark.parametrize("url, expected_name", [
    ("/api/v3/final-reports/fr-test/pdf", "NNPC - Business Case Frame - Final Campaign Report.pdf"),
    ("/api/v3/final-reports/fr-test/feedback/pdf", None),
    ("/api/v3/final-reports/fr-test/feedback/pdf?audience=brand", None),
    ("/api/v3/contracts/ctr-test/pdf", "NNPC x TASCK - Service Agreement.pdf"),
])
def test_download_pdf_routes_are_attachments(client, url, expected_name):
    r = client.get(url)
    assert r.status_code == 200, r.text[:400]
    assert r.headers["content-type"].startswith("application/pdf")

    disposition = r.headers["content-disposition"]
    assert disposition.lower().startswith("attachment;"), disposition
    assert "inline" not in disposition.lower(), disposition
    assert 'filename="' in disposition and ".pdf" in disposition, disposition
    assert "filename*=UTF-8''" in disposition, disposition
    if expected_name:
        assert f'filename="{expected_name}"' in disposition, disposition

    # A complete, framed PDF - not an empty or chunked stream.
    assert r.content.startswith(b"%PDF"), r.content[:16]
    assert int(r.headers["content-length"]) == len(r.content)


def test_report_pdf_carries_the_report_text(client):
    pypdf = pytest.importorskip("pypdf")
    from io import BytesIO

    r = client.get("/api/v3/final-reports/fr-test/pdf")
    text = "\n".join(page.extract_text() or "" for page in pypdf.PdfReader(BytesIO(r.content)).pages)
    assert "Final Campaign Report" in text
    assert "Executive summary" in text or "EXECUTIVE SUMMARY" in text.upper()


@pytest.mark.parametrize("url", [
    "/api/v3/final-reports/fr-missing/pdf",
    "/api/v3/final-reports/fr-missing/feedback/pdf",
    "/api/v3/contracts/ctr-missing/pdf",
])
def test_missing_documents_404(client, url):
    r = client.get(url)
    assert r.status_code == 404, r.text[:200]


def test_attachment_filename_falls_back_when_title_is_unusable():
    # Titles can hold characters the OS will not accept in a file name, or be
    # entirely non-ASCII. The header must still be valid and end in .pdf.
    # The helper is a closure inside make_v3_router, so exercise it through
    # a real route response.
    app = FastAPI()
    odd = dict(REPORT, title='Q3/Q4 "Wrap": <Naira ₦ report>')
    db = _DB()
    db._by_name["v3_final_reports"] = _Coll(odd)
    app.include_router(v3_routes.make_v3_router(db))
    r = TestClient(app).get("/api/v3/final-reports/fr-test/pdf")
    assert r.status_code == 200
    disposition = r.headers["content-disposition"]
    assert disposition.lower().startswith("attachment;")
    # No path separators or quotes inside the quoted ASCII filename.
    ascii_name = disposition.split('filename="', 1)[1].split('"', 1)[0]
    assert ascii_name.endswith(".pdf")
    assert not any(ch in ascii_name for ch in '/\\:*?"<>|')
