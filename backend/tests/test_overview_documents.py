"""Regression: every document counted on the Overview can be opened.

Locks in:
- Each Documents row carries one item per document it counts.
- Every item links to a Business Case page for its own case.
- Pipeline counts cover every project, so the Total projects tile (their sum)
  matches the number of current business cases.

Needs the backend running (REACT_APP_BACKEND_URL / BACKEND_URL, default
http://localhost:8001).
"""

import os

import requests

BACKEND_URL = (
    os.environ.get("REACT_APP_BACKEND_URL")
    or os.environ.get("BACKEND_URL")
    or "http://localhost:8001"
).rstrip("/")
API = f"{BACKEND_URL}/api/v3"


def _overview():
    r = requests.get(f"{API}/metrics/overview", timeout=30)
    assert r.status_code == 200, r.text
    return r.json()


def test_every_counted_document_has_a_link_to_its_page():
    for row in _overview()["documents"]:
        items = row["items"]
        assert len(items) == row["total"], row["key"]
        assert row["generated"] + row["sent"] + row["approved"] + row["revision"] == row["total"]
        for item in items:
            assert item["case_id"], (row["key"], item)
            assert item["href"].startswith(f"/business-cases/{item['case_id']}/"), (row["key"], item)
            assert item["state"] in {"Draft", "Sent", "Approved", "Needs revision"}


def test_pipeline_counts_every_project_once():
    data = _overview()
    total = sum(stage["count"] for stage in data["pipeline"])
    closed = next(stage["count"] for stage in data["pipeline"] if stage["key"] == "closed")
    assert total == data["projects_total"] + closed


def test_every_pending_action_links_to_its_page():
    data = _overview()
    items = data["pending_items"]
    # The tile's number and the list it opens are the same set.
    assert len(items) == data["portfolio"]["pending"]["value"]
    for item in items:
        assert item["href"].startswith(f"/business-cases/{item['case_id']}/"), item


def test_active_projects_are_every_open_project_and_link_to_each():
    data = _overview()
    active = data["portfolio"]["active_projects"]
    # Every project from Connect onwards that is not closed.
    open_count = sum(stage["count"] for stage in data["pipeline"] if stage["key"] != "closed")
    assert active["value"] == open_count == len(active["items"])
    for item in active["items"]:
        assert item["href"] == f"/business-cases/{item['case_id']}", item
        assert item["stage"], item
