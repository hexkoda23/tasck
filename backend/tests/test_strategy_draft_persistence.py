"""Regression: POST /api/v3/business-cases/{bc_id}/plan/save-strategy-draft

Locks in:
- 9 canonical headings persist; unknown headings are dropped.
- Reload via GET /business-cases/{bc_id} returns the same draft (hydration path).
- Re-saving with new content overwrites the previous values.
- Unknown business_case_id → 404.
"""

import os
from typing import Dict

import pytest
import requests


BACKEND_URL = (
    os.environ.get("REACT_APP_BACKEND_URL")
    or os.environ.get("BACKEND_URL")
    or "http://localhost:8001"
).rstrip("/")
API = f"{BACKEND_URL}/api/v3"

CANONICAL_HEADINGS = [
    "Executive Snapshot", "Strategic Foundation", "Growth Plan",
    "Creator Strategy", "Execution Roadmap", "Commercial Overview",
    "Tracking Plan", "Risks & Mitigation", "Next Steps",
]


@pytest.fixture(scope="module")
def bc_id() -> str:
    # Use the seeded business case
    return "bc-472329ed4c"


def _save(bc_id: str, sections: Dict[str, str]):
    return requests.post(
        f"{API}/business-cases/{bc_id}/plan/save-strategy-draft",
        json={"sections": sections, "actor": "pytest"},
        timeout=20,
    )


def test_save_strategy_draft_persists_9_canonical_sections(bc_id: str):
    payload = {h: f"content for {h}" for h in CANONICAL_HEADINGS}
    payload["UnknownHeading"] = "should be dropped"

    r = _save(bc_id, payload)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["ok"] is True
    sd = body["strategy_draft"]
    assert set(sd["sections"].keys()) == set(CANONICAL_HEADINGS)
    assert sd["updated_at"]
    assert sd["updated_by"] == "pytest"
    assert all(sd["sections"][h] == f"content for {h}" for h in CANONICAL_HEADINGS)


def test_reload_via_business_case_bundle_returns_saved_draft(bc_id: str):
    r = requests.get(f"{API}/business-cases/{bc_id}", timeout=20)
    assert r.status_code == 200
    case = r.json()["business_case"]
    sd = (case.get("plan") or {}).get("strategy_draft") or {}
    sections = sd.get("sections") or {}
    assert set(sections.keys()) == set(CANONICAL_HEADINGS)
    assert all(sections[h] == f"content for {h}" for h in CANONICAL_HEADINGS)


def test_resaving_overwrites_previous_values(bc_id: str):
    payload = {h: f"updated content for {h}" for h in CANONICAL_HEADINGS}
    r = _save(bc_id, payload)
    assert r.status_code == 200, r.text
    sd = r.json()["strategy_draft"]
    assert all(sd["sections"][h] == f"updated content for {h}" for h in CANONICAL_HEADINGS)

    # And the bundle reflects the new values
    r2 = requests.get(f"{API}/business-cases/{bc_id}", timeout=20)
    case = r2.json()["business_case"]
    sections = ((case.get("plan") or {}).get("strategy_draft") or {}).get("sections") or {}
    assert sections["Executive Snapshot"] == "updated content for Executive Snapshot"


def test_unknown_business_case_id_returns_404():
    r = _save("bc-does-not-exist", {h: "x" for h in CANONICAL_HEADINGS})
    assert r.status_code == 404


def test_missing_headings_default_to_empty_string(bc_id: str):
    # Only send 3 headings; the rest should default to empty strings (still 9 keys)
    payload = {
        "Executive Snapshot": "only-this-one",
        "Growth Plan": "and-this",
        "Next Steps": "and-this-too",
    }
    r = _save(bc_id, payload)
    assert r.status_code == 200, r.text
    sd = r.json()["strategy_draft"]
    assert set(sd["sections"].keys()) == set(CANONICAL_HEADINGS)
    assert sd["sections"]["Executive Snapshot"] == "only-this-one"
    assert sd["sections"]["Strategic Foundation"] == ""
    assert sd["sections"]["Creator Strategy"] == ""
