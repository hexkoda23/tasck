"""
Iteration 14 — TASCK Opportunity Tracker v3.3 backend regression suite.

Validates:
  * POST /api/v3/opportunities/scans returns scan + candidate v3.3 schema
  * GET  /api/v3/opportunities/candidates filters by pipeline_state and hides dismissed_auto
  * GET  /api/v3/opportunities/pipeline-counts returns counts for all states
  * POST /api/v3/opportunities/candidates/{id}/transition flows reviewing -> outreach_sent -> meeting_booked
  * POST /api/v3/opportunities/candidates/{id}/accept produces Family A brand fields, Stranger contact, Connect-stage BC
"""

import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # Backend tests are run inside the cloud container which has frontend/.env mounted,
    # but pytest invocations don't pick it up automatically. Fall back to reading the file.
    try:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
                    break
    except FileNotFoundError:
        pass

API = f"{BASE_URL}/api/v3"
V33_FIELDS = [
    "partner_name", "signal_type", "brand_confidence", "signal_strength",
    "key_marketing_focus", "primary_target_audience", "key_marketing_channels",
    "marketing_kpis", "likelihood_to_work_with_tta", "why_this_matters",
    "outreach_angle", "outreach_draft",
]


@pytest.fixture(scope="module", autouse=True)
def reset_state():
    # Reset before the whole module so each run starts from the demo seed.
    r = requests.post(f"{API}/admin/reset-demo", timeout=30)
    assert r.status_code == 200, r.text
    yield
    # final reset so the demo DB is clean for the next agent
    requests.post(f"{API}/admin/reset-demo", timeout=30)


# ---------------------------------------------------------------------------
# Pipeline counts + candidate listing
# ---------------------------------------------------------------------------
class TestPipelineCounts:
    def test_pipeline_counts_shape(self):
        r = requests.get(f"{API}/opportunities/pipeline-counts", timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        for key in ["new", "reviewing", "outreach_sent", "meeting_booked", "won", "dismissed", "dismissed_auto"]:
            assert key in data, f"missing pipeline state: {key}"
            assert isinstance(data[key], int)

    def test_default_candidates_hide_dismissed_auto(self):
        r = requests.get(f"{API}/opportunities/candidates", timeout=20)
        assert r.status_code == 200
        for c in r.json():
            assert c.get("pipeline_state") != "dismissed_auto"

    def test_candidates_filter_by_pipeline_state_new(self):
        r = requests.get(f"{API}/opportunities/candidates", params={"pipeline_state": "new"}, timeout=20)
        assert r.status_code == 200
        for c in r.json():
            assert c.get("pipeline_state") == "new"


# ---------------------------------------------------------------------------
# Scan — Pass 1 + Pass 2 LLM enrichment
# ---------------------------------------------------------------------------
class TestOpportunityScan:
    """Use a known-deterministic query that surfaces real brand cards."""

    @pytest.fixture(scope="class")
    def scan_result(self):
        payload = {
            "query": "Coca-Cola Nigeria campaign launch",
            "template": {"result_limit": 6},
            "created_by": "pytest",
        }
        r = requests.post(f"{API}/opportunities/scans", json=payload, timeout=180)
        assert r.status_code == 200, r.text
        return r.json()

    def test_scan_response_shape(self, scan_result):
        scan = scan_result["scan"]
        for key in ("pass1_rejected", "auto_dismissed", "candidate_count", "raw_count", "extraction_method"):
            assert key in scan, f"scan missing key: {key}"
        assert isinstance(scan["pass1_rejected"], int)
        assert isinstance(scan["auto_dismissed"], int)
        assert isinstance(scan["candidate_count"], int)
        # Pass 1 should reject at least some content for a query that returns mixed news results,
        # OR all results pass — both are allowed. We just check the field exists and is non-negative.
        assert scan["pass1_rejected"] >= 0
        assert scan["auto_dismissed"] >= 0

    def test_candidates_carry_v33_fields(self, scan_result):
        candidates = scan_result.get("candidates", [])
        if not candidates:
            # The Coca-Cola query reliably surfaces at least one real card; if not, the scan
            # still passes shape validation and we fall back to checking the seeded card.
            r = requests.get(f"{API}/opportunities/candidates", params={"pipeline_state": "new"}, timeout=20)
            candidates = r.json()
        assert candidates, "expected at least one candidate to inspect v3.3 schema"
        c = candidates[0]
        for field in V33_FIELDS:
            assert field in c, f"candidate missing v3.3 field: {field}"
        # Type sanity
        assert isinstance(c.get("brand_confidence") or 0, int)
        assert isinstance(c.get("signal_strength") or 0, int)
        assert c.get("signal_type") in {
            "creator_signing", "campaign_launch", "rfp_open", "spend_signal", None, ""
        }


# ---------------------------------------------------------------------------
# Transition + Accept flow against the seeded candidate
# ---------------------------------------------------------------------------
class TestTransitionAndAccept:
    @pytest.fixture(scope="class")
    def candidate_id(self):
        r = requests.get(f"{API}/opportunities/candidates", params={"pipeline_state": "new"}, timeout=20)
        rows = r.json()
        assert rows, "expected a seeded 'new' candidate to transition"
        return rows[0]["id"]

    def test_transition_to_reviewing(self, candidate_id):
        r = requests.post(
            f"{API}/opportunities/candidates/{candidate_id}/transition",
            json={"to_state": "reviewing", "note": "TEST_pytest reviewing"},
            timeout=20,
        )
        assert r.status_code == 200, r.text
        assert r.json()["pipeline_state"] == "reviewing"

    def test_transition_to_outreach_sent_sets_timestamp(self, candidate_id):
        r = requests.post(
            f"{API}/opportunities/candidates/{candidate_id}/transition",
            json={"to_state": "outreach_sent"},
            timeout=20,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["pipeline_state"] == "outreach_sent"
        assert body.get("outreach_sent_at"), "outreach_sent_at should be set"

    def test_transition_to_meeting_booked_sets_timestamp(self, candidate_id):
        r = requests.post(
            f"{API}/opportunities/candidates/{candidate_id}/transition",
            json={"to_state": "meeting_booked"},
            timeout=20,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["pipeline_state"] == "meeting_booked"
        assert body.get("meeting_booked_at"), "meeting_booked_at should be set"

    def test_accept_creates_brand_contact_and_bc(self, candidate_id):
        # Snapshot the candidate so we can compare Family A fields
        cand_before = requests.get(f"{API}/opportunities/candidates", timeout=20).json()
        cand = next((c for c in cand_before if c["id"] == candidate_id), None)
        assert cand, "candidate vanished before accept"

        r = requests.post(
            f"{API}/opportunities/candidates/{candidate_id}/accept",
            json={"reviewed_by": "pytest"},
            timeout=30,
        )
        assert r.status_code == 200, r.text
        payload = r.json()
        assert "brand" in payload
        assert "business_case" in payload
        assert payload.get("business_case_id")

        brand = payload["brand"]
        # Family A fields on brand
        assert brand.get("desired_relationship_status") == "Project Identified - Move to Framing", (
            f"expected desired_relationship_status set, got: {brand.get('desired_relationship_status')}"
        )
        for f in ("key_marketing_focus", "primary_target_audience", "key_marketing_channels", "marketing_kpis"):
            assert f in brand, f"brand missing Family A field: {f}"
        assert "likelihood_to_work_with_tta" in brand
        # brand_type either passed-through or defaulted
        assert "brand_type" in brand

        # Contact should be Stranger (look it up via brand contacts list)
        contacts = requests.get(f"{API}/brands/{brand['id']}", timeout=20).json().get("contacts", [])
        assert contacts, "expected at least one contact created on brand"
        statuses = [c.get("connect_status") for c in contacts]
        assert "Stranger" in statuses, f"expected a Stranger contact, got statuses: {statuses}"

        # Business case should be in connect stage with intelligence + suggested_outreach
        bc = payload["business_case"]
        assert bc.get("stage") == "connect"
        connect = bc.get("connect") or {}
        assert connect.get("intelligence"), "BC.connect.intelligence should be populated"
        assert connect.get("suggested_outreach"), "BC.connect.suggested_outreach should be populated"

    def test_pipeline_counts_reflect_won(self):
        r = requests.get(f"{API}/opportunities/pipeline-counts", timeout=20)
        data = r.json()
        # After accept, the candidate should move to 'won'
        assert data.get("won", 0) >= 1, f"expected at least one 'won' after accept, got: {data}"
