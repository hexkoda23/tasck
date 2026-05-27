"""
Iteration 15 — focused re-test of the two HIGH-priority bugs from iteration_14:

  Bug 1 (FIXED): accept_opportunity_candidate existing-brand branch must
    - apply Family A fields via update_one $set
    - only overwrite empty/null values (do NOT clobber populated ones)
    - set desired_relationship_status='Project Identified - Move to Framing'
    - set connect_status='Stranger' on the primary contact when missing

  Bug 2 (FIXED): reset_demo must wipe v3_opportunity_candidates,
    v3_opportunity_scans, v3_opportunities collections.
"""

import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    try:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
                    break
    except FileNotFoundError:
        pass

API = f"{BASE_URL}/api/v3"
COCA_BRAND_NAME = "Coca-Cola Nigeria Limited"


def _slug(value):
    """Mirror backend v3_routes._slug — take first 3 alphanumeric tokens."""
    cleaned = "".join(ch.lower() if ch.isalnum() else "." for ch in (value or "brand"))
    parts = [p for p in cleaned.split(".") if p]
    return ".".join(parts[:3]) or "brand"


def _reset():
    r = requests.post(f"{API}/admin/reset-demo", timeout=30)
    assert r.status_code == 200, r.text
    return r.json()


# ---------------------------------------------------------------------------
# Bug 2 — reset_demo wipes tracker collections
# ---------------------------------------------------------------------------
class TestResetDemoWipesTracker:
    def test_reset_demo_returns_tracker_collections_in_response(self):
        body = _reset()
        reset_list = body.get("collections_reset") or []
        for c in ["v3_opportunity_candidates", "v3_opportunity_scans", "v3_opportunities"]:
            assert c in reset_list, f"reset-demo response should declare {c} reset, got {reset_list}"

    def test_scan_then_reset_clears_candidates(self):
        _reset()
        # Create some tracker state by running a scan
        scan_payload = {
            "query": "Coca-Cola Nigeria campaign launch",
            "template": {"result_limit": 4},
            "created_by": "pytest-iter15",
        }
        r = requests.post(f"{API}/opportunities/scans", json=scan_payload, timeout=180)
        assert r.status_code == 200, r.text
        # There should now be candidates OR at least a scan record
        cand_count_before = requests.get(f"{API}/opportunities/pipeline-counts", timeout=20).json()
        total_before = sum(int(v) for v in cand_count_before.values())
        # Reset and verify everything is zero
        _reset()
        counts_after = requests.get(f"{API}/opportunities/pipeline-counts", timeout=20).json()
        for state, val in counts_after.items():
            assert val == 0, f"after reset, pipeline-counts.{state} should be 0, got {val} (was {total_before} before)"

        # Direct list endpoints should also be empty
        all_states = ["new", "reviewing", "outreach_sent", "meeting_booked", "won", "dismissed", "dismissed_auto"]
        for state in all_states:
            r = requests.get(f"{API}/opportunities/candidates", params={"pipeline_state": state}, timeout=20)
            assert r.status_code == 200
            assert r.json() == [], f"candidates for state={state} should be empty post-reset"


# ---------------------------------------------------------------------------
# Bug 1 — Family A merge on existing brand + Stranger contact patch
# ---------------------------------------------------------------------------
class TestAcceptExistingBrandFamilyA:
    @pytest.fixture(scope="class", autouse=True)
    def reset_once(self):
        _reset()
        yield
        _reset()

    @pytest.fixture(scope="class")
    def coca_brand_before(self):
        brands = requests.get(f"{API}/brands", timeout=20).json()
        brand = next((b for b in brands if b.get("company") == COCA_BRAND_NAME), None)
        assert brand, f"Seeded brand '{COCA_BRAND_NAME}' must exist before test"
        return brand

    @pytest.fixture(scope="class")
    def scan_candidate(self, coca_brand_before):
        # Use the query that reliably surfaces Coca-Cola Nigeria
        scan_payload = {
            "query": "Coca-Cola Nigeria campaign launch",
            "template": {"result_limit": 6},
            "created_by": "pytest-iter15",
        }
        r = requests.post(f"{API}/opportunities/scans", json=scan_payload, timeout=180)
        assert r.status_code == 200, r.text
        candidates = r.json().get("candidates", [])
        # Find the one whose partner_name slug-matches the seeded brand
        target_slug = _slug(COCA_BRAND_NAME)
        cand = next((c for c in candidates if _slug(c.get("partner_name") or c.get("brand_name")) == target_slug), None)
        if not cand:
            # Fall back to listing all 'new' candidates
            rows = requests.get(f"{API}/opportunities/candidates", params={"pipeline_state": "new"}, timeout=20).json()
            cand = next((c for c in rows if _slug(c.get("partner_name") or c.get("brand_name")) == target_slug), None)
        assert cand, f"Could not surface a candidate matching '{COCA_BRAND_NAME}'. candidates={[c.get('partner_name') for c in candidates]}"
        return cand

    def test_existing_brand_starts_without_family_a(self, coca_brand_before):
        """Sanity: seeded brand should NOT have all Family A fields pre-populated,
        otherwise the 'do not overwrite populated' check below is vacuous."""
        # We just record what's already there; the empty fields are what the merge should fill.
        any_empty = any(
            not coca_brand_before.get(k)
            for k in ["key_marketing_focus", "primary_target_audience", "key_marketing_channels", "marketing_kpis"]
        )
        assert any_empty or not coca_brand_before.get("desired_relationship_status"), (
            "Seed brand has all Family A fields already set; test is vacuous"
        )

    def test_accept_applies_family_a_to_existing_brand(self, coca_brand_before, scan_candidate):
        cand_id = scan_candidate["id"]
        candidate_family_a = {
            k: scan_candidate.get(k)
            for k in ["key_marketing_focus", "primary_target_audience", "key_marketing_channels",
                      "marketing_kpis", "likelihood_to_work_with_tta", "brand_type"]
        }

        r = requests.post(
            f"{API}/opportunities/candidates/{cand_id}/accept",
            json={"reviewed_by": "pytest-iter15"},
            timeout=30,
        )
        assert r.status_code == 200, r.text
        payload = r.json()
        brand_after = payload.get("brand") or {}
        # Ensure we are working with the SAME brand row (slug-match)
        assert brand_after.get("id") == coca_brand_before.get("id"), (
            f"accept should reuse existing brand id; before={coca_brand_before.get('id')} after={brand_after.get('id')}"
        )

        # desired_relationship_status MUST be set to the spec value
        assert brand_after.get("desired_relationship_status") == "Project Identified - Move to Framing", (
            f"desired_relationship_status not patched, got {brand_after.get('desired_relationship_status')}"
        )

        # For each Family A field that was empty before and the candidate provided a value,
        # the brand must now reflect the candidate value.
        merged_any = False
        for key in ["key_marketing_focus", "primary_target_audience", "key_marketing_channels",
                    "marketing_kpis", "likelihood_to_work_with_tta", "brand_type"]:
            had_before = bool(coca_brand_before.get(key))
            incoming = candidate_family_a.get(key)
            now = brand_after.get(key)
            if not had_before and incoming:
                assert now == incoming, (
                    f"expected Family A field '{key}' to be set from candidate "
                    f"(incoming={incoming!r}), got {now!r}"
                )
                merged_any = True
        assert merged_any or any(candidate_family_a.values()) is False, (
            "Existing-brand merge did not apply any Family A field even though candidate carried values"
        )

        # Persistence check — fetch the brand directly and confirm
        brands = requests.get(f"{API}/brands", timeout=20).json()
        persisted = next((b for b in brands if b.get("id") == brand_after["id"]), None)
        assert persisted, "brand vanished after accept"
        assert persisted.get("desired_relationship_status") == "Project Identified - Move to Framing"

    def test_accept_does_not_overwrite_populated_family_a_fields(self, coca_brand_before):
        """If a Family A field was already populated on the brand, accept must not overwrite it.
        We pre-set the field by writing directly to MongoDB (no public PUT /brands route)."""
        _reset()
        bid = coca_brand_before["id"]
        sentinel = "PRE_EXISTING_FOCUS_VALUE_DO_NOT_OVERWRITE"
        try:
            import asyncio
            from motor.motor_asyncio import AsyncIOMotorClient
            mongo_url = os.environ.get("MONGO_URL")
            db_name = os.environ.get("DB_NAME")
            if not (mongo_url and db_name):
                # Fall back to backend/.env
                with open("/app/backend/.env") as f:
                    for line in f:
                        if line.startswith("MONGO_URL="):
                            mongo_url = line.split("=", 1)[1].strip().strip('"').strip("'")
                        elif line.startswith("DB_NAME="):
                            db_name = line.split("=", 1)[1].strip().strip('"').strip("'")

            async def _preset():
                client = AsyncIOMotorClient(mongo_url)
                await client[db_name].v3_brands.update_one(
                    {"id": bid}, {"$set": {"key_marketing_focus": sentinel}}
                )
                client.close()
            asyncio.run(_preset())
        except Exception as e:
            pytest.skip(f"Cannot pre-set brand Family A field via Mongo: {e}")

        # Verify the sentinel is now stored
        brands = requests.get(f"{API}/brands", timeout=20).json()
        pre = next((b for b in brands if b["id"] == bid), {})
        assert pre.get("key_marketing_focus") == sentinel, "preset did not stick"

        # Now scan + accept
        scan_payload = {
            "query": "Coca-Cola Nigeria campaign launch",
            "template": {"result_limit": 6},
            "created_by": "pytest-iter15",
        }
        s = requests.post(f"{API}/opportunities/scans", json=scan_payload, timeout=180)
        assert s.status_code == 200
        candidates = s.json().get("candidates", [])

        target_slug = _slug(COCA_BRAND_NAME)
        cand = next((c for c in candidates if _slug(c.get("partner_name") or c.get("brand_name")) == target_slug), None)
        if not cand:
            rows = requests.get(f"{API}/opportunities/candidates", params={"pipeline_state": "new"}, timeout=20).json()
            cand = next((c for c in rows if _slug(c.get("partner_name") or c.get("brand_name")) == target_slug), None)
        assert cand, "no Coca-Cola candidate surfaced for overwrite test"

        r = requests.post(
            f"{API}/opportunities/candidates/{cand['id']}/accept",
            json={"reviewed_by": "pytest-iter15-overwrite"},
            timeout=30,
        )
        assert r.status_code == 200, r.text
        brand_after = r.json().get("brand") or {}
        assert brand_after.get("key_marketing_focus") == sentinel, (
            f"Existing populated Family A field was OVERWRITTEN. expected '{sentinel}', got {brand_after.get('key_marketing_focus')!r}"
        )

    def test_accept_sets_stranger_on_primary_contact(self, coca_brand_before):
        """The seeded Coca-Cola brand already has contacts (no connect_status). After accept,
        at least one contact should carry connect_status='Stranger'."""
        _reset()
        bid = coca_brand_before["id"]

        # Snapshot existing contacts
        brand_detail = requests.get(f"{API}/brands/{bid}", timeout=20).json()
        contacts_before = brand_detail.get("contacts") or []
        statuses_before = [c.get("connect_status") for c in contacts_before]
        # We require at least one contact existed AND none was Stranger before, otherwise this test is vacuous
        if not contacts_before:
            pytest.skip("No pre-existing contacts on seeded brand; new-brand path would fire instead")

        # Scan and accept
        scan_payload = {
            "query": "Coca-Cola Nigeria campaign launch",
            "template": {"result_limit": 6},
            "created_by": "pytest-iter15",
        }
        s = requests.post(f"{API}/opportunities/scans", json=scan_payload, timeout=180)
        assert s.status_code == 200
        candidates = s.json().get("candidates", [])

        target_slug = _slug(COCA_BRAND_NAME)
        cand = next((c for c in candidates if _slug(c.get("partner_name") or c.get("brand_name")) == target_slug), None)
        if not cand:
            rows = requests.get(f"{API}/opportunities/candidates", params={"pipeline_state": "new"}, timeout=20).json()
            cand = next((c for c in rows if _slug(c.get("partner_name") or c.get("brand_name")) == target_slug), None)
        assert cand, "no Coca-Cola candidate surfaced for Stranger contact test"

        r = requests.post(
            f"{API}/opportunities/candidates/{cand['id']}/accept",
            json={"reviewed_by": "pytest-iter15-stranger"},
            timeout=30,
        )
        assert r.status_code == 200, r.text

        brand_detail = requests.get(f"{API}/brands/{bid}", timeout=20).json()
        contacts_after = brand_detail.get("contacts") or []
        statuses_after = [c.get("connect_status") for c in contacts_after]
        assert "Stranger" in statuses_after, (
            f"expected a Stranger contact after accept on existing brand; "
            f"before={statuses_before} after={statuses_after}"
        )
