"""TASCK OS v3 - Iteration 13 write-flow tests.
Covers: brand create, interactions, connect/status, simulate-response,
creative-snapshots, deliverables add, generate final-report, reset-demo.
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api/v3"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# --- Brand create ---
def test_create_brand_and_contact(session):
    payload = {
        "company": "TEST_BrandCo Ltd",
        "industry": "Beverages",
        "primary_contact": "TEST_Tomi Bello",
        "role": "Brand Lead",
        "email": "tomi@testbrandco.test",
        "phone": "+2348000000000",
        "engagement_track_default": "paid",
        "lead_score": 72,
        "hq": "Lagos",
        "website": "https://test.example",
    }
    r = session.post(f"{API}/brands", json=payload)
    assert r.status_code == 200, r.text
    brand = r.json()
    assert brand["company"] == payload["company"]
    assert brand["id"].startswith("brand-")
    # GET back
    r2 = session.get(f"{API}/brands/{brand['id']}")
    assert r2.status_code == 200
    data = r2.json()
    assert data["brand"]["company"] == payload["company"]
    # Auto contact created
    assert any(c["is_primary"] and c["name"] == payload["primary_contact"] for c in data["contacts"])
    pytest.brand_id = brand["id"]


# --- Business case create (depends on brand) ---
def test_create_business_case(session):
    bc_payload = {
        "brand_id": pytest.brand_id,
        "creator_id": None,
        "title": "TEST_Iter13 walkthrough BC",
        "engagement_track": "paid",
        "estimated_value": 100_000_000,
        "rm_id": "rm-amara",
        "connect_status": "new_lead",
        "stated_intent": "Need a flagship campaign",
        "source": "Inbound",
    }
    r = session.post(f"{API}/business-cases", json=bc_payload)
    assert r.status_code == 200, r.text
    bc = r.json()
    assert bc["stage"] == "connect"
    assert bc["connect"]["connect_status"] == "new_lead"
    pytest.bc_id = bc["id"]


# --- Interaction create ---
def test_create_interaction_updates_timeline(session):
    payload = {
        "brand_id": pytest.brand_id,
        "business_case_id": pytest.bc_id,
        "type": "call_transcript",
        "title": "TEST_Discovery call",
        "author": "rm-amara",
        "content": "Discussed scope and timeline.",
    }
    r = session.post(f"{API}/interactions", json=payload)
    assert r.status_code == 200, r.text
    inter = r.json()
    assert inter["id"].startswith("int-")
    # Verify timeline updated
    bc = session.get(f"{API}/business-cases/{pytest.bc_id}").json()["business_case"]
    assert any(t.get("event") == "interaction_logged" for t in bc["timeline"])


# --- Connect status ---
def test_set_connect_status_qualified(session):
    r = session.post(
        f"{API}/business-cases/{pytest.bc_id}/connect/status",
        json={"connect_status": "qualified_to_frame"},
    )
    assert r.status_code == 200, r.text
    bc = session.get(f"{API}/business-cases/{pytest.bc_id}").json()["business_case"]
    assert bc["connect"]["connect_status"] == "qualified_to_frame"


# --- Advance to frame ---
def test_advance_to_frame(session):
    r = session.post(f"{API}/business-cases/{pytest.bc_id}/advance", json={"actor": "rm"})
    assert r.status_code == 200, r.text
    assert r.json()["stage"] == "frame"


# --- Alignment + approve + invoice paid ---
def test_alignment_full(session):
    r = session.post(f"{API}/business-cases/{pytest.bc_id}/ai/alignment")
    assert r.status_code == 200
    snap = r.json()
    assert snap["status"] == "under_review"
    # resolve all flags
    bc = session.get(f"{API}/business-cases/{pytest.bc_id}").json()["business_case"]
    total = bc["frame"]["scope_flags_total"]
    for i in range(total):
        rr = session.post(f"{API}/business-cases/{pytest.bc_id}/scope-flags/{i}/resolve")
        assert rr.status_code == 200
    # approve
    r2 = session.post(
        f"{API}/business-cases/{pytest.bc_id}/ai/alignment/approve",
        json={"approver": "rm-amara"},
    )
    assert r2.status_code == 200
    # pay SDF invoice
    invs = session.get(f"{API}/invoices", params={"business_case_id": pytest.bc_id}).json()
    sdf = [i for i in invs if i["kind"] == "strategy_development_fee"][0]
    r3 = session.post(f"{API}/invoices/{sdf['id']}/mark-paid")
    assert r3.status_code == 200
    # advance to plan
    r4 = session.post(f"{API}/business-cases/{pytest.bc_id}/advance", json={"actor": "rm"})
    assert r4.status_code == 200, r4.text
    assert r4.json()["stage"] == "plan"


# --- Plan: brief + simulate response + snapshot ---
def test_brief_and_simulate_response(session):
    # Use a seeded creator for response context
    creators = session.get(f"{API}/creators").json()
    creator_id = creators[0]["id"]
    r = session.post(
        f"{API}/creative-briefs",
        json={
            "business_case_id": pytest.bc_id,
            "creator_id": creator_id,
            "brief_text": "TEST brief text",
        },
    )
    assert r.status_code == 200
    brief = r.json()
    # Simulate creator response
    r2 = session.post(f"{API}/creative-briefs/{brief['id']}/simulate-response")
    assert r2.status_code == 200, r2.text
    resp = r2.json()["response"]
    assert "proposed_concept" in resp and len(resp["proposed_concept"]) > 30
    assert resp["interest"] == "yes"
    pytest.brief_id = brief["id"]


def test_create_snapshot_inherits_concept(session):
    r = session.post(
        f"{API}/creative-snapshots",
        json={"business_case_id": pytest.bc_id},
    )
    assert r.status_code == 200, r.text
    snap = r.json()
    assert snap["concept"]  # auto-inherited from brief response
    assert "proposed_concept" not in snap["concept"]  # value, not key
    # Budget allocated and sums close to estimated_value
    total = sum(b["amount"] for b in snap["budget"])
    assert total > 0
    # Approve + draft contract + sign
    rr = session.post(
        f"{API}/business-cases/{pytest.bc_id}/creative-snapshot/approve",
        json={"approver": "rm-amara"},
    )
    assert rr.status_code == 200
    rc = session.post(
        f"{API}/contracts",
        json={
            "business_case_id": pytest.bc_id,
            "template": "creator_principal",
            "value": 100_000_000,
            "parties": ["TASCK", "TEST_BrandCo Ltd"],
        },
    )
    assert rc.status_code == 200
    ctr = rc.json()
    rs = session.post(f"{API}/contracts/{ctr['id']}/sign")
    assert rs.status_code == 200
    # advance to deliver
    ra = session.post(f"{API}/business-cases/{pytest.bc_id}/advance", json={"actor": "rm"})
    assert ra.status_code == 200, ra.text
    assert ra.json()["stage"] == "deliver"


# --- Add deliverable ---
def test_add_deliverable_updates_total(session):
    before = session.get(f"{API}/business-cases/{pytest.bc_id}").json()["business_case"]
    before_total = before.get("deliver", {}).get("milestones_total", 0)
    r = session.post(
        f"{API}/deliverables",
        json={"business_case_id": pytest.bc_id, "title": "TEST_Hero film"},
    )
    assert r.status_code == 200, r.text
    after = session.get(f"{API}/business-cases/{pytest.bc_id}").json()["business_case"]
    assert after["deliver"]["milestones_total"] == before_total + 1


# --- Generate final report ---
def test_generate_final_report(session):
    r = session.post(
        f"{API}/business-cases/{pytest.bc_id}/final-report/generate",
        json={},
    )
    assert r.status_code == 200, r.text
    rep = r.json()
    assert rep["business_case_id"] == pytest.bc_id
    assert rep["status"] == "ready_for_brand"
    assert len(rep["kpis"]) >= 1
    assert all("variance" in k for k in rep["kpis"])
    assert any(item["item"] == "Final report delivered" for item in rep["closure_checklist"])


# --- Reset demo at the end ---
def test_reset_demo_cleans_state(session):
    r = session.post(f"{API}/admin/reset-demo")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["ok"] is True
    assert len(body["collections_reset"]) >= 10
    # Now the seed should have exactly 5 BCs
    bcs = session.get(f"{API}/business-cases").json()
    assert len(bcs) == 5, f"After reset expected 5 BCs, got {len(bcs)}"
    # Our TEST_ brand should be gone
    brands = session.get(f"{API}/brands").json()
    assert not any(b["company"].startswith("TEST_") for b in brands)
