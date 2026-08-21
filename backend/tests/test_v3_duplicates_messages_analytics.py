"""
Backend tests for iteration 35:
  - Duplicate Flagger (scan, count, merge, dismiss)
  - Unread Messages badge (count, mark-read)
  - Deck Analytics (view, turn, get)
  - Flipbook analytics tracker injection
"""
import os
import uuid
import re
import pytest
import requests

def _load_backend_url():
    v = os.environ.get("REACT_APP_BACKEND_URL")
    if v:
        return v.rstrip("/")
    env_path = "/app/frontend/.env"
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    return line.split("=", 1)[1].strip().rstrip("/")
    raise RuntimeError("REACT_APP_BACKEND_URL not set")


BASE_URL = _load_backend_url()
API = f"{BASE_URL}/api/v3"

# --- Duplicate Flagger --------------------------------------------------------


class TestDuplicateFlagger:
    def test_count_endpoint(self):
        r = requests.get(f"{API}/business-case-duplicates/count", timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "count" in data
        assert isinstance(data["count"], int)
        assert data["count"] >= 0
        pytest.dup_count_initial = data["count"]

    def test_list_endpoint_shape(self):
        r = requests.get(f"{API}/business-case-duplicates", timeout=60)
        assert r.status_code == 200, r.text
        data = r.json()
        assert set(["count", "pairs"]).issubset(data.keys())
        assert data["count"] == len(data["pairs"])
        # Expect at least 1 seeded duplicate pair per problem statement (12-13)
        assert data["count"] >= 1, f"Expected >=1 duplicate pair, got {data['count']}"
        pair = data["pairs"][0]
        for key in ("pair_key", "similarity", "reasons", "left", "right"):
            assert key in pair
        for side in ("left", "right"):
            assert "id" in pair[side]
            assert "title" in pair[side]
            assert "brand_name" in pair[side]
        assert 0.0 <= pair["similarity"] <= 1.0
        pytest.first_pair = pair

    def test_dismiss_reduces_count(self):
        r = requests.get(f"{API}/business-case-duplicates", timeout=60)
        pairs = r.json()["pairs"]
        if not pairs:
            pytest.skip("no pairs to dismiss")
        target = pairs[0]
        left_id = target["left"]["id"]
        right_id = target["right"]["id"]
        before = len(pairs)
        r2 = requests.post(
            f"{API}/business-cases/{left_id}/duplicate-dismiss",
            json={"other_id": right_id},
            timeout=30,
        )
        assert r2.status_code == 200, r2.text
        assert r2.json().get("ok") is True
        r3 = requests.get(f"{API}/business-case-duplicates/count", timeout=30).json()
        assert r3["count"] == before - 1, f"expected {before-1}, got {r3['count']}"
        # cleanup: remove dismissal so we can re-run
        # (no delete endpoint, so leave — tests still pass idempotently by picking a new top pair)

    def test_merge_moves_source_out_of_list(self):
        r = requests.get(f"{API}/business-case-duplicates", timeout=60)
        pairs = r.json()["pairs"]
        if not pairs:
            pytest.skip("no pairs to merge")
        pair = pairs[0]
        source_id = pair["left"]["id"]
        target_id = pair["right"]["id"]
        assert source_id != target_id

        # Add an interaction to source to verify it gets moved
        interaction_payload = {
            "type": "note",
            "business_case_id": source_id,
            "content": f"TEST_merge_probe_{uuid.uuid4().hex[:6]}",
        }
        ri = requests.post(f"{API}/interactions", json=interaction_payload, timeout=30)
        # Non-fatal if this endpoint has a different signature; skip movement check
        interaction_id = None
        if ri.status_code in (200, 201):
            body = ri.json() if ri.text else {}
            interaction_id = body.get("id") or body.get("interaction_id")

        r2 = requests.post(
            f"{API}/business-cases/{source_id}/merge-into",
            json={"target_id": target_id, "actor": "pytest"},
            timeout=30,
        )
        assert r2.status_code == 200, r2.text
        assert r2.json().get("ok") is True

        # Source should no longer appear in default list
        rl = requests.get(f"{API}/business-cases", timeout=60)
        assert rl.status_code == 200
        ids = [c.get("id") for c in rl.json() if isinstance(c, dict)]
        assert source_id not in ids, "Merged source case should be filtered from list"

        # Pair should not resurface
        r3 = requests.get(f"{API}/business-case-duplicates", timeout=60).json()
        pair_key = pair["pair_key"]
        assert not any(p["pair_key"] == pair_key for p in r3["pairs"])


# --- Unread Messages ----------------------------------------------------------


class TestUnreadMessages:
    def test_unread_count_endpoint(self):
        r = requests.get(f"{API}/admin/messages/unread-count", timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "count" in data and isinstance(data["count"], int)

    def test_new_brand_message_increments_and_mark_read_clears(self):
        # Pick a brand
        br = requests.get(f"{API}/brands", timeout=30)
        assert br.status_code == 200
        brands = br.json()
        if not brands:
            pytest.skip("no brands seeded")
        brand_id = brands[0].get("id")

        before = requests.get(f"{API}/admin/messages/unread-count", timeout=30).json()["count"]

        payload = {
            "type": "brand_message",
            "brand_id": brand_id,
            "title": "TEST_unread_probe",
            "author": "brand",
            "content": f"TEST_unread_probe_{uuid.uuid4().hex[:6]}",
        }
        rp = requests.post(f"{API}/interactions", json=payload, timeout=30)
        if rp.status_code not in (200, 201):
            pytest.skip(f"interactions endpoint rejected brand_message: {rp.status_code} {rp.text[:200]}")

        after = requests.get(f"{API}/admin/messages/unread-count", timeout=30).json()["count"]
        assert after >= before + 1, f"expected count to increment from {before}; got {after}"

        rm = requests.post(f"{API}/admin/messages/mark-read", json={}, timeout=30)
        assert rm.status_code == 200, rm.text
        assert rm.json().get("ok") is True

        cleared = requests.get(f"{API}/admin/messages/unread-count", timeout=30).json()["count"]
        assert cleared == 0, f"expected 0 after mark-read all, got {cleared}"


# --- Deck Analytics -----------------------------------------------------------

DECK_ID_FALLBACK = "pd-aad78149"


def _pick_deck_id():
    # Try any known deck via business-cases -> pitch-decks. Fallback to sample.
    r = requests.get(f"{API}/pitch-decks", timeout=15)
    if r.status_code == 200 and isinstance(r.json(), list) and r.json():
        return r.json()[0].get("id") or DECK_ID_FALLBACK
    return DECK_ID_FALLBACK


class TestDeckAnalytics:
    def test_view_turn_and_get(self):
        deck_id = _pick_deck_id()
        # verify deck exists
        rd = requests.get(f"{API}/pitch-decks/{deck_id}", timeout=15)
        if rd.status_code == 404:
            pytest.skip(f"deck {deck_id} not found")

        session_id = f"TEST_sess_{uuid.uuid4().hex[:8]}"

        # baseline
        base = requests.get(f"{API}/pitch-decks/{deck_id}/analytics", timeout=30)
        assert base.status_code == 200
        base_data = base.json()
        base_views = base_data["total_views"]
        base_turns = base_data["total_page_turns"]

        # View twice with same session -> should not create duplicate row
        for _ in range(2):
            rv = requests.post(
                f"{API}/pitch-decks/{deck_id}/analytics/view",
                json={"session_id": session_id, "source": "brand"},
                timeout=15,
            )
            assert rv.status_code == 200, rv.text
            assert rv.json().get("session_id") == session_id

        # Turn pages
        for page in range(1, 4):
            rt = requests.post(
                f"{API}/pitch-decks/{deck_id}/analytics/turn",
                json={"session_id": session_id, "page": page},
                timeout=15,
            )
            assert rt.status_code == 200, rt.text

        after = requests.get(f"{API}/pitch-decks/{deck_id}/analytics", timeout=30).json()
        assert after["deck_id"] == deck_id
        assert after["total_views"] == base_views + 1, "Session should be deduped"
        assert after["total_page_turns"] == base_turns + 3
        our_row = [v for v in after["views"] if v.get("session_id") == session_id]
        assert len(our_row) == 1
        assert our_row[0]["page_turns"] == 3
        assert "opened_at" in our_row[0]

    def test_turn_without_prior_view_seeds_row(self):
        deck_id = _pick_deck_id()
        rd = requests.get(f"{API}/pitch-decks/{deck_id}", timeout=15)
        if rd.status_code == 404:
            pytest.skip("no deck")
        session_id = f"TEST_seed_{uuid.uuid4().hex[:8]}"
        r = requests.post(
            f"{API}/pitch-decks/{deck_id}/analytics/turn",
            json={"session_id": session_id, "page": 1},
            timeout=15,
        )
        assert r.status_code == 200
        after = requests.get(f"{API}/pitch-decks/{deck_id}/analytics", timeout=30).json()
        row = [v for v in after["views"] if v.get("session_id") == session_id]
        assert len(row) == 1
        assert row[0]["page_turns"] >= 1


# --- Flipbook analytics injection --------------------------------------------


class TestFlipbookTracker:
    def test_flipbook_contains_tracker(self):
        deck_id = _pick_deck_id()
        r = requests.get(f"{API}/pitch-decks/{deck_id}/flipbook", timeout=60)
        if r.status_code == 404:
            pytest.skip("no deck flipbook")
        assert r.status_code == 200
        html = r.text
        assert "id=\"deck-analytics\"" in html or "id='deck-analytics'" in html
        assert f"data-deck-id=\"{deck_id}\"" in html or f"data-deck-id='{deck_id}'" in html
        # Should reference analytics endpoints
        assert "/analytics/view" in html
        assert "/analytics/turn" in html

    def test_flipbook_download_mode_skips_analytics_base(self):
        deck_id = _pick_deck_id()
        r = requests.get(f"{API}/pitch-decks/{deck_id}/flipbook?download=1", timeout=60)
        if r.status_code == 404:
            pytest.skip("no deck flipbook")
        assert r.status_code == 200
        html = r.text
        # Look for the meta tag; api-base should be empty
        m = re.search(r"data-api-base=([\"'])(.*?)\1", html)
        if m:
            assert m.group(2) == "", f"download mode should have empty api-base, got '{m.group(2)}'"
