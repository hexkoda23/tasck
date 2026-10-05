"""Regression: Creator Selector transcript + fields survive a return visit.

Locks in:
- Pasted transcript is saved as a per-snapshot draft on case.plan and comes
  back in the business case bundle (transcript page hydration path).
- Saving a draft does not create a brainstorm round (routing depends on
  plan.brainstorm_round_id).
- When a snapshot has an analyzed round plus a newer empty duplicate, the
  analyzer and the Creator Selector page agree on the analyzed round.
- Unknown business_case_id -> 404.
"""

import os
import uuid

import pytest
import requests

from v3_routes import _pick_active_brainstorm_round

BACKEND_URL = (
    os.environ.get("REACT_APP_BACKEND_URL")
    or os.environ.get("BACKEND_URL")
    or "http://localhost:8001"
).rstrip("/")
API = f"{BACKEND_URL}/api/v3"


def test_pick_prefers_analyzed_round_over_newer_empty_duplicate():
    analyzed = {"id": "bs-old", "transcript": "Full transcript", "updated_at": "2026-09-01T10:00:00Z"}
    empty = {"id": "bs-new", "creator_selector": {"risks": ""}}
    assert _pick_active_brainstorm_round([analyzed, empty])["id"] == "bs-old"


def test_pick_most_recent_filled_round_and_last_row_on_tie():
    older = {"id": "bs-1", "transcript": "a", "updated_at": "2026-09-01T00:00:00Z"}
    newer = {"id": "bs-2", "creator_selector": {"risks": "r"}, "updated_at": "2026-09-03T00:00:00Z"}
    assert _pick_active_brainstorm_round([newer, older])["id"] == "bs-2"
    assert _pick_active_brainstorm_round([{"id": "first"}, {"id": "last"}])["id"] == "last"
    assert _pick_active_brainstorm_round([]) is None


@pytest.fixture(scope="module")
def bc_id() -> str:
    rows = requests.get(f"{API}/business-cases", timeout=20).json()
    rows = rows if isinstance(rows, list) else rows.get("business_cases") or rows.get("items") or []
    if not rows:
        pytest.skip("No business cases in this database")
    return rows[0]["id"]


def test_transcript_draft_round_trips_via_bundle(bc_id: str):
    snap = f"as-pytest-{uuid.uuid4().hex[:6]}"
    before = requests.get(f"{API}/business-cases/{bc_id}", timeout=20).json()
    round_id_before = (before["business_case"].get("plan") or {}).get("brainstorm_round_id")

    text = "Pasted Creator Selector transcript - pytest " + uuid.uuid4().hex
    r = requests.patch(f"{API}/business-cases/{bc_id}/brainstorm/transcript-draft",
                       json={"transcript": text, "alignment_snapshot_id": snap}, timeout=20)
    assert r.status_code == 200, r.text
    assert r.json()["alignment_snapshot_id"] == snap

    bundle = requests.get(f"{API}/business-cases/{bc_id}", timeout=20).json()
    plan = bundle["business_case"].get("plan") or {}
    assert plan["brainstorm_transcript_drafts"][snap] == text
    assert plan.get("brainstorm_round_id") == round_id_before

    # Clearing the box is saved too.
    requests.patch(f"{API}/business-cases/{bc_id}/brainstorm/transcript-draft",
                   json={"transcript": "", "alignment_snapshot_id": snap}, timeout=20)
    bundle = requests.get(f"{API}/business-cases/{bc_id}", timeout=20).json()
    assert bundle["business_case"]["plan"]["brainstorm_transcript_drafts"][snap] == ""


def test_transcript_draft_unknown_case_404():
    r = requests.patch(f"{API}/business-cases/bc-does-not-exist/brainstorm/transcript-draft",
                       json={"transcript": "x"}, timeout=20)
    assert r.status_code == 404
