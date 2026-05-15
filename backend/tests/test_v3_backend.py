"""v3.2 TASCK OS backend integration tests covering /api/v3/* endpoints."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://tasck-live-demo-1.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api/v3"


@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


# ---------- Brands ----------
class TestBrands:
    def test_list_brands_includes_osf_grant(self, s):
        r = s.get(f"{API}/brands")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 11, f"Expected >=11 brands, got {len(data)}"
        osf = next((b for b in data if b["id"] == "brand-osf"), None)
        assert osf is not None, "brand-osf missing"
        assert osf["engagement_track_default"] == "grant"

    def test_filter_brands_by_grant(self, s):
        r = s.get(f"{API}/brands", params={"engagement": "grant"})
        assert r.status_code == 200
        assert all(b["engagement_track_default"] == "grant" for b in r.json())


# ---------- Business Cases listing & hydration ----------
class TestBusinessCases:
    def test_list_at_least_5_seeded(self, s):
        r = s.get(f"{API}/business-cases")
        assert r.status_code == 200
        bcs = r.json()
        ids = {b["id"] for b in bcs}
        for bid in ["bc-nb-flagship", "bc-cc-tems", "bc-gn-rema", "bc-mtn-burna", "bc-osf-cj"]:
            assert bid in ids, f"Seeded BC {bid} missing"

    def test_hydrate_nb_flagship(self, s):
        r = s.get(f"{API}/business-cases/bc-nb-flagship")
        assert r.status_code == 200
        d = r.json()
        for key in ["business_case", "brand", "creator", "alignment_snapshot",
                    "creative_brief", "creative_snapshot", "contract",
                    "deliverables", "invoices"]:
            assert key in d, f"Missing hydration key {key}"
        assert d["business_case"]["stage"] == "deliver"
        assert d["business_case"]["engagement_track"] == "paid"
        assert d["alignment_snapshot"]["status"] == "approved"
        assert d["contract"]["status"] == "signed"
        assert len(d["deliverables"]) >= 6
        assert any(i["kind"] == "strategy_development_fee" for i in d["invoices"])

    def test_osf_grant_waived(self, s):
        r = s.get(f"{API}/business-cases/bc-osf-cj")
        assert r.status_code == 200
        d = r.json()
        assert d["business_case"]["engagement_track"] == "grant"
        frame = d["business_case"]["frame"]
        assert frame.get("strategy_development_fee_waived_reason"), "Waived reason should be populated"
        assert frame.get("strategy_development_fee_invoice_id") in (None, "")
        # No SDF invoice for grant
        sdf = [i for i in d["invoices"] if i.get("kind") == "strategy_development_fee"]
        assert sdf == [], "Grant BC should not have a Strategy Development Fee invoice"

    def test_create_bc_starts_in_connect(self, s):
        payload = {
            "brand_id": "brand-cocacola",
            "title": "TEST_New BC from pytest",
            "engagement_track": "paid",
            "estimated_value": 50_000_000,
            "rm_id": "rm-temi",
            "connect_status": "new_lead",
            "stated_intent": "Test intent",
            "source": "pytest",
        }
        r = s.post(f"{API}/business-cases", json=payload)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["stage"] == "connect"
        assert d["engagement_track"] == "paid"
        assert len(d["timeline"]) >= 1
        assert d["timeline"][0]["event"] == "business_case_created"
        # Verify GET persistence
        g = s.get(f"{API}/business-cases/{d['id']}").json()
        assert g["business_case"]["id"] == d["id"]


# ---------- Stage advancement gates ----------
class TestStageGates:
    def test_advance_blocked_when_gates_fail(self, s):
        # bc-cc-tems is in frame, alignment not approved, SDF not paid
        r = s.post(f"{API}/business-cases/bc-cc-tems/advance", json={"actor": "rm"})
        assert r.status_code == 400
        body = r.json()
        # detail can be dict with errors
        detail = body.get("detail", body)
        # Should mention alignment approval and SDF
        text = str(detail).lower()
        assert "alignment" in text or "strategy" in text

    def test_advance_override_works(self, s):
        # Create a fresh BC and force advance with override
        bc = s.post(f"{API}/business-cases", json={
            "brand_id": "brand-mtn", "title": "TEST_Override advance",
            "engagement_track": "paid", "estimated_value": 1, "rm_id": "rm-temi",
        }).json()
        r = s.post(f"{API}/business-cases/{bc['id']}/advance",
                   json={"actor": "rm", "override": True, "reason": "test"})
        assert r.status_code == 200
        assert r.json()["stage"] == "frame"


# ---------- AI Alignment Snapshot ----------
class TestAlignment:
    def test_generate_and_approve_alignment_paid(self, s):
        # Create fresh paid BC, advance to frame, generate alignment
        bc = s.post(f"{API}/business-cases", json={
            "brand_id": "brand-cocacola", "title": "TEST_Alignment paid",
            "engagement_track": "paid", "estimated_value": 1, "rm_id": "rm-temi",
        }).json()
        s.post(f"{API}/business-cases/{bc['id']}/advance",
               json={"actor": "rm", "override": True, "reason": "test"})
        gen = s.post(f"{API}/business-cases/{bc['id']}/ai/alignment")
        assert gen.status_code == 200
        doc = gen.json()
        assert doc["status"] == "under_review"
        assert len(doc["sections"]) == 11, f"Expected 11 sections, got {len(doc['sections'])}"

        ap = s.post(f"{API}/business-cases/{bc['id']}/ai/alignment/approve",
                    json={"approver": "TestApprover"})
        assert ap.status_code == 200

        # Paid should now have an SDF invoice
        invs = s.get(f"{API}/invoices", params={"business_case_id": bc["id"]}).json()
        sdfs = [i for i in invs if i["kind"] == "strategy_development_fee"]
        assert len(sdfs) == 1
        assert sdfs[0]["status"] == "issued"

    def test_approve_alignment_grant_skips_invoice(self, s):
        bc = s.post(f"{API}/business-cases", json={
            "brand_id": "brand-osf", "title": "TEST_Alignment grant",
            "engagement_track": "grant", "estimated_value": 1, "rm_id": "rm-femi",
        }).json()
        s.post(f"{API}/business-cases/{bc['id']}/advance",
               json={"actor": "rm", "override": True, "reason": "test"})
        s.post(f"{API}/business-cases/{bc['id']}/ai/alignment")
        ap = s.post(f"{API}/business-cases/{bc['id']}/ai/alignment/approve",
                    json={"approver": "TestApprover"})
        assert ap.status_code == 200
        invs = s.get(f"{API}/invoices", params={"business_case_id": bc["id"]}).json()
        sdfs = [i for i in invs if i["kind"] == "strategy_development_fee"]
        assert sdfs == [], "Grant must skip SDF invoice"
        # Verify waived reason populated
        d = s.get(f"{API}/business-cases/{bc['id']}").json()
        assert d["business_case"]["frame"].get("strategy_development_fee_waived_reason")


# ---------- Brainstorm auto-elimination ----------
class TestBrainstorm:
    def test_auto_eliminate_low_conversion(self, s):
        bc = s.post(f"{API}/business-cases", json={
            "brand_id": "brand-mtn", "title": "TEST_Brainstorm",
            "engagement_track": "paid", "estimated_value": 1, "rm_id": "rm-temi",
        }).json()
        payload = {
            "business_case_id": bc["id"],
            "scored_creators": [
                {"creator_id": "creator-burna", "cultural_fit": 5, "conversion_behavior": 5, "reliability": 5},
                {"creator_id": "creator-wizkid", "cultural_fit": 5, "conversion_behavior": 2, "reliability": 3},
                {"creator_id": "creator-boyspyce", "cultural_fit": 3, "conversion_behavior": 1, "reliability": 4},
            ],
        }
        r = s.post(f"{API}/brainstorm-rounds", json=payload)
        assert r.status_code == 200
        d = r.json()
        by_id = {x["creator_id"]: x for x in d["scored_creators"]}
        assert by_id["creator-burna"]["eliminated"] is False
        assert by_id["creator-wizkid"]["eliminated"] is True
        assert "conversion behavior" in by_id["creator-wizkid"]["reason"].lower()
        assert by_id["creator-boyspyce"]["eliminated"] is True


# ---------- Deliverable transitions ----------
class TestDeliverables:
    def test_transition_cycle(self, s):
        # Find a non-approved deliverable on bc-nb-flagship (state may have
        # drifted from prior runs since there's no seed-reset).
        dels = s.get(f"{API}/deliverables", params={"business_case_id": "bc-nb-flagship"}).json()
        target = next((d for d in dels if d["status"] != "approved"), None)
        if not target:
            pytest.skip("All NB deliverables already approved from prior runs")
        start = target["status"]
        r1 = s.post(f"{API}/deliverables/{target['id']}/transition", json={"actor": "rm"})
        assert r1.status_code == 200, r1.text
        new_status = r1.json()["new_status"]
        expected = {"pending_upload": "pending_rm_review", "pending_rm_review": "approved"}[start]
        assert new_status == expected
        # If we are now at pending_rm_review, transition once more to approved
        if new_status == "pending_rm_review":
            r2 = s.post(f"{API}/deliverables/{target['id']}/transition", json={"actor": "rm"})
            assert r2.status_code == 200
            assert r2.json()["new_status"] == "approved"
        # Verify milestone counter updated on business case
        bc = s.get(f"{API}/business-cases/bc-nb-flagship").json()["business_case"]
        assert bc["deliver"]["milestones_complete"] >= 1
        # Approved cannot transition again
        r3 = s.post(f"{API}/deliverables/{target['id']}/transition", json={"actor": "rm"})
        assert r3.status_code == 400


# ---------- Scope change ----------
class TestScopeChange:
    def test_scope_change_pause_and_resume(self, s):
        bc_id = "bc-gn-rema"
        r = s.post(f"{API}/business-cases/{bc_id}/scope-change",
                   json={"title": "TEST_Add cutdowns", "fee_delta": 1, "rationale": "test"})
        assert r.status_code == 200
        sc_id = r.json()["scope_change"]["id"]

        d = s.get(f"{API}/business-cases/{bc_id}").json()
        assert d["business_case"]["deliver"]["scope_creep_paused"] is True

        a = s.post(f"{API}/business-cases/{bc_id}/scope-change/{sc_id}/approve")
        assert a.status_code == 200
        d2 = s.get(f"{API}/business-cases/{bc_id}").json()
        assert d2["business_case"]["deliver"]["scope_creep_paused"] is False


# ---------- Feedback + closure ----------
class TestFeedbackClosure:
    def test_brand_and_creator_feedback_updates_closure(self, s):
        bc_id = "bc-mtn-burna"
        rb = s.post(f"{API}/business-cases/{bc_id}/feedback/brand",
                    json={"rater": "Kemi Adebayo", "scores": {"creative": 9, "delivery": 10, "comms": 9}, "comment": "great"})
        assert rb.status_code == 200
        assert rb.json()["average"] > 0

        rc = s.post(f"{API}/business-cases/{bc_id}/feedback/creator",
                    json={"rater": "Burna Boy", "scores": {"clarity": 9, "trust": 10}, "comment": "smooth"})
        assert rc.status_code == 200

        # Closure pct should reflect those items completed
        d = s.get(f"{API}/business-cases/{bc_id}").json()
        assert d["business_case"]["closure"]["closure_pct"] >= 75


# ---------- Metrics ----------
class TestMetrics:
    def test_admin_overview(self, s):
        r = s.get(f"{API}/metrics/admin-overview")
        assert r.status_code == 200
        d = r.json()
        assert "by_stage" in d
        for k in ["connect", "frame", "plan", "deliver", "closed"]:
            assert k in d["by_stage"]
        assert d["business_cases_total"] >= 5
        assert d["grant_count"] >= 1
        assert d["paid_count"] >= 4
        assert d["paid_total_value"] > 0


# ---------- CRM live (brands count) ----------
class TestCRMLive:
    def test_crm_brand_count(self, s):
        r = s.get(f"{API}/brands")
        assert r.status_code == 200
        assert len(r.json()) >= 11
