"""API integration tests for v3.3 addendum — multi-source scan + provenance + cost telemetry."""
import os
import time
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://tasck-live-demo-1.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# Small per_source_limit keeps run-time bounded; we only assert shape & telemetry.
SMALL_LIMIT = 3


def _run_scan(client, *, enabled_sources, hot_ratio=0.6, per_source_limit=SMALL_LIMIT, base_query="brand ambassador"):
    body = {
        "query": base_query,
        "template": {
            "keywords": base_query,
            "country": "Nigeria",
            "enabled_sources": enabled_sources,
            "hot_ratio": hot_ratio,
            "per_source_limit": per_source_limit,
            "result_limit": per_source_limit,
        },
        "created_by": "TEST_v33_addendum",
    }
    r = client.post(f"{API}/v3/opportunities/scans", json=body, timeout=180)
    return r


def _scan_summary(resp_json):
    # Response shape: { "candidates": [...], "scan": { ...summary fields... } }
    return resp_json.get("scan") or resp_json


def test_scan_one_source_returns_fan_out_4(client):
    r = _run_scan(client, enabled_sources=["google_web"])
    assert r.status_code == 200, r.text
    data = _scan_summary(r.json())
    assert data.get("status") == "completed", data
    assert data.get("fan_out") == 4, f"expected fan_out=4 for 1 source, got {data.get('fan_out')}"
    su = data.get("sources_used")
    assert (su == 1) or (isinstance(su, list) and len(su) == 1), f"sources_used={su}"


def test_scan_multi_source_returns_fan_out_16_and_cost(client):
    r = _run_scan(
        client,
        enabled_sources=["google_web", "google_news", "linkedin", "trade_press"],
    )
    assert r.status_code == 200, r.text
    data = _scan_summary(r.json())
    assert data.get("status") == "completed", data
    assert data.get("fan_out") == 16
    su = data.get("sources_used")
    assert (su == 4) or (isinstance(su, list) and len(su) == 4), f"sources_used={su}"

    # Cost telemetry
    cost = data.get("cost_estimate") or {}
    for k in ("serpapi_calls", "serpapi_usd", "llm_calls", "llm_usd", "total_usd"):
        assert k in cost, f"missing cost field {k}; got {cost}"
    assert isinstance(cost["total_usd"], (int, float))

    # Hot/pipeline split exists
    assert "hot_count" in data and "pipeline_count" in data
    assert data["hot_count"] + data["pipeline_count"] == data["fan_out"]


def test_scan_hot_ratio_tilt(client):
    r = _run_scan(
        client,
        enabled_sources=["google_web", "google_news", "linkedin", "trade_press"],
        hot_ratio=0.8,
    )
    assert r.status_code == 200, r.text
    data = _scan_summary(r.json())
    assert data.get("hot_count", 0) >= 12, f"expected hot_count>=12 with hot_ratio=0.8, got {data.get('hot_count')}"


def test_candidates_have_provenance_fields(client):
    # Ensure at least one scan happened above; fetch candidates
    r = client.get(f"{API}/v3/opportunities/candidates", timeout=60)
    assert r.status_code == 200, r.text
    rows = r.json()
    assert isinstance(rows, list)
    if not rows:
        pytest.skip("No candidates produced by upstream scans; provenance assertion skipped.")
    # Check at least one row has new provenance fields
    new_fields = ("source_key", "source_label", "signal_type_targeted", "freshness_bucket")
    has_any = any(all(f in row for f in new_fields) for row in rows)
    assert has_any, f"No candidate row had all new provenance fields {new_fields}; sample row keys: {list(rows[0].keys())}"


def test_accept_candidate_to_crm_regression(client):
    r = client.get(f"{API}/v3/opportunities/candidates", timeout=30)
    assert r.status_code == 200, r.text
    rows = [c for c in r.json() if c.get("status") in (None, "new", "pending")]
    if not rows:
        pytest.skip("No pending candidates to accept; regression check skipped.")
    cid = rows[0].get("id") or rows[0].get("_id")
    assert cid, f"Candidate row missing id: {rows[0]}"
    r2 = client.post(f"{API}/v3/opportunities/candidates/{cid}/accept", json={}, timeout=60)
    assert r2.status_code in (200, 201), r2.text
    data = r2.json()
    # Expect refs to created brand/contact/opportunity/business case
    accepted_keys = {k.lower() for k in data.keys()}
    assert any("brand" in k for k in accepted_keys) or "brand_id" in data
    assert any("opportunit" in k for k in accepted_keys) or "opportunity_id" in data


def test_reset_demo_regression(client):
    r = client.post(f"{API}/v3/admin/reset-demo", json={}, timeout=60)
    assert r.status_code in (200, 201, 204), r.text
    # Verify candidates collection wiped
    r2 = client.get(f"{API}/v3/opportunities/candidates", timeout=30)
    assert r2.status_code == 200
    assert r2.json() == [] or len(r2.json()) == 0
