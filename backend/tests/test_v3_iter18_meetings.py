"""
Iteration 18 backend tests for TASCK OS v3.3 meeting workflow + creator detail.
Covers:
- GET /api/v3/meetings list (13 imported)
- GET /api/v3/meetings/{id} hydrated detail
- POST /api/v3/meetings (deterministic suggested questions)
- PATCH /api/v3/meetings/{id}/contact (completeness recalc)
- POST /api/v3/meetings/{id}/transcript + /analyze
- POST /api/v3/meetings/{id}/questions/regenerate
- POST /api/v3/meetings/{id}/qualification/accept|reschedule|delete
- GET /api/v3/creators/{id} with projects + business_cases
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # Fall back to reading the file
    try:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
                    break
    except Exception:
        pass

API = f"{BASE_URL}/api/v3"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---------- Meetings list & detail ----------

def test_meetings_list_returns_13(session):
    r = session.get(f"{API}/meetings", timeout=30)
    assert r.status_code == 200, r.text
    body = r.json()
    # Tolerate either {items:[...]} or [...] shape
    items = body.get("items") if isinstance(body, dict) else body
    assert isinstance(items, list)
    assert len(items) >= 13, f"expected >=13 meetings, got {len(items)}"
    titles = [m.get("title", "") for m in items]
    rms = [m.get("rm_name", "") for m in items]
    assert any("Pernod Ricard" in t or "Chivas" in t for t in titles), titles[:5]
    assert any(rm == "Fanii" for rm in rms), rms


@pytest.fixture(scope="module")
def meeting_ids(session):
    r = session.get(f"{API}/meetings", timeout=30)
    body = r.json()
    items = body.get("items") if isinstance(body, dict) else body
    return [m["id"] for m in items if m.get("id")]


def test_meeting_detail_hydrated(session, meeting_ids):
    assert meeting_ids, "no meeting ids from list"
    sample = meeting_ids[:5]
    for mid in sample:
        r = session.get(f"{API}/meetings/{mid}", timeout=30)
        assert r.status_code == 200, f"{mid} -> {r.status_code} {r.text[:200]}"
        body = r.json()
        # Required keys
        for key in ("id", "title", "suggested_questions", "candidate_snapshot", "contact_completeness"):
            assert key in body, f"missing {key} in meeting {mid}"
        assert isinstance(body["suggested_questions"], list)
        assert isinstance(body["candidate_snapshot"], dict)
        assert isinstance(body["contact_completeness"], (int, float))
        assert 0 <= body["contact_completeness"] <= 100


def test_meeting_detail_404_for_bogus_id(session):
    r = session.get(f"{API}/meetings/does-not-exist-xyz", timeout=20)
    assert r.status_code == 404


# ---------- Create meeting ----------

def test_create_qualification_meeting_has_10_questions(session):
    payload = {
        "title": "TEST_Qualification Call: Acme Inc",
        "meeting_type": "qualification",
        "brand_name": "Acme Inc",
    }
    r = session.post(f"{API}/meetings", json=payload, timeout=30)
    assert r.status_code in (200, 201), r.text
    body = r.json()
    assert "id" in body
    assert isinstance(body.get("suggested_questions"), list)
    assert len(body["suggested_questions"]) == 10, (
        f"expected 10 qualification questions, got {len(body['suggested_questions'])}"
    )
    # cleanup
    session.post(f"{API}/meetings/{body['id']}/qualification/delete", timeout=20)


def test_create_connector_meeting_has_8_questions(session):
    payload = {
        "title": "TEST_Connector Call: Acme Inc",
        "meeting_type": "connector",
        "brand_name": "Acme Inc",
    }
    r = session.post(f"{API}/meetings", json=payload, timeout=30)
    assert r.status_code in (200, 201), r.text
    body = r.json()
    assert len(body.get("suggested_questions", [])) == 8, (
        f"expected 8 connector questions, got {len(body.get('suggested_questions', []))}"
    )
    # cleanup
    session.post(f"{API}/meetings/{body['id']}/qualification/delete", timeout=20)


# ---------- Patch contact + completeness ----------

def test_patch_contact_updates_completeness(session):
    create = session.post(
        f"{API}/meetings",
        json={"title": "TEST_Contact Update", "meeting_type": "qualification", "brand_name": "TestBrand"},
        timeout=30,
    )
    mid = create.json()["id"]
    try:
        r = session.patch(
            f"{API}/meetings/{mid}/contact",
            json={
                "contact_name": "Jane Doe",
                "contact_email": "jane@example.com",
                "contact_phone": "+2348000000000",
                "contact_role": "Marketing Lead",
                "contact_linkedin": "https://linkedin.com/in/jane",
            },
            timeout=30,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert "contact_completeness" in body
        assert body["contact_completeness"] >= 50, body
    finally:
        session.post(f"{API}/meetings/{mid}/qualification/delete", timeout=20)


# ---------- Transcript + analyze ----------

def test_transcript_and_analyze(session):
    create = session.post(
        f"{API}/meetings",
        json={"title": "TEST_Transcript", "meeting_type": "qualification", "brand_name": "TestBrand"},
        timeout=30,
    )
    mid = create.json()["id"]
    try:
        t = session.post(
            f"{API}/meetings/{mid}/transcript",
            json={"transcript": "We discussed budget of 200k USD targeting Gen Z women in Lagos via TikTok and Instagram. KPI is reach and conversion."},
            timeout=30,
        )
        assert t.status_code in (200, 201), t.text

        a = session.post(f"{API}/meetings/{mid}/analyze", json={}, timeout=60)
        assert a.status_code == 200, a.text
        body = a.json()
        for key in ("readiness_score", "missingContext", "followUpQuestions", "ai_outputs", "marketing_intelligence"):
            assert key in body, f"missing {key} in analyze response"
        assert isinstance(body["readiness_score"], (int, float))
        assert 0 <= body["readiness_score"] <= 100
        mi = body["marketing_intelligence"]
        for k in ("key_marketing_focus", "primary_target_audience", "key_marketing_channels", "marketing_kpis"):
            assert k in mi, f"marketing_intelligence missing {k}"
    finally:
        session.post(f"{API}/meetings/{mid}/qualification/delete", timeout=20)


# ---------- Regenerate questions ----------

def test_regenerate_questions(session, meeting_ids):
    mid = meeting_ids[0]
    r = session.post(f"{API}/meetings/{mid}/questions/regenerate", json={}, timeout=30)
    assert r.status_code == 200, r.text
    body = r.json()
    assert isinstance(body.get("suggested_questions"), list)
    assert len(body["suggested_questions"]) > 0


# ---------- Qualification accept / reschedule / delete ----------

def test_qualification_accept_reschedule_delete(session):
    create = session.post(
        f"{API}/meetings",
        json={"title": "TEST_Lifecycle", "meeting_type": "qualification", "brand_name": "LifecycleBrand"},
        timeout=30,
    )
    mid = create.json()["id"]

    acc = session.post(f"{API}/meetings/{mid}/qualification/accept", json={}, timeout=30)
    assert acc.status_code == 200, acc.text
    assert acc.json().get("qualification_status") == "accepted"

    res = session.post(f"{API}/meetings/{mid}/qualification/reschedule", json={}, timeout=30)
    assert res.status_code == 200, res.text
    assert res.json().get("qualification_status") == "rescheduled"

    d = session.post(f"{API}/meetings/{mid}/qualification/delete", json={}, timeout=30)
    assert d.status_code in (200, 204), d.text

    g = session.get(f"{API}/meetings/{mid}", timeout=20)
    assert g.status_code == 404, f"deleted meeting still returns {g.status_code}"


# ---------- Creator detail ----------

def test_creator_mi_hydrated(session):
    r = session.get(f"{API}/creators/creator-9c51ad8660", timeout=30)
    assert r.status_code == 200, r.text
    body = r.json()
    # Pull `creator` if nested, else top-level
    creator = body.get("creator", body)
    for f in ("fee_raw", "fee_amount", "fee_currency", "key_marketing_focus",
              "role", "current_relationship_status", "desired_relationship_status",
              "relationship_manager_name", "source_sheet", "source_row_number", "imported_at"):
        assert f in creator, f"creator missing field {f}"
    assert creator["source_sheet"] == "CRM - Super Creatives"
    # Projects + business_cases
    projects = body.get("projects") or creator.get("projects") or []
    assert isinstance(projects, list)
    assert len(projects) >= 1, "expected linked projects for MI"
    bcs = body.get("business_cases") or creator.get("business_cases") or []
    assert isinstance(bcs, list)


def test_creator_unknown_returns_404(session):
    r = session.get(f"{API}/creators/creator-bogus-xyz", timeout=20)
    assert r.status_code == 404
