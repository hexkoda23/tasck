"""A Creative Brief opened before funnel rows were added can still be saved."""

from copy import deepcopy

from v3_routes import (restore_missing_funnel_lines, with_bundle_brief_funnel,
                       with_document_funnel, make_v3_router)


SELECTOR = {"top_of_funnel_size":
            "2,000,000 people. Based on a final KPI of 100,000 new users per quarter."}


def test_old_editor_draft_without_funnel_lines_keeps_current_results():
    stored = {"title": "Brief", "sections": [
        {"heading": "Success Metrics", "bullets": ["Original point"]},
    ]}
    current = with_document_funnel(stored, SELECTOR, kind="brief")
    current_lines = current["sections"][0]["lines"]

    # The old editor sends its original shape alongside edited body text.
    submitted_lines = []
    merged = restore_missing_funnel_lines(current_lines, submitted_lines)
    assert len(merged) == 5
    assert merged[1]["value"] == "2,000,000 people"
    assert merged[4]["value"] == "60,000 new users"
    assert stored["sections"][0]["bullets"] == ["Original point"]


def test_existing_custom_lines_are_preserved_without_duplicates():
    stored = {"sections": [{"heading": "Success Metrics", "lines": [
        {"label": "Custom target", "value": "First draft"},
    ]}]}
    current = with_document_funnel(stored, SELECTOR, kind="brief")
    current_lines = current["sections"][0]["lines"]
    old_editor_lines = [{"label": "Custom target", "value": "Admin update"}]
    merged = restore_missing_funnel_lines(current_lines, old_editor_lines)
    assert len(merged) == 6
    assert merged[0]["value"] == "Admin update"
    assert restore_missing_funnel_lines(merged, merged) == merged
    assert len(with_document_funnel({"sections": [{"heading": "Success Metrics",
                                               "lines": merged}]}, SELECTOR,
                                    kind="brief")["sections"][0]["lines"]) == 6


def test_unrelated_line_removal_is_still_rejected_by_structure_check():
    old_rows = [{"label": "First", "value": "A"},
                {"label": "Second", "value": "B"}]
    assert len(restore_missing_funnel_lines(old_rows, [])) != len(old_rows)


def test_bundle_snapshot_preferred_by_editor_includes_same_funnel_rows():
    raw = {"title": "Brief", "sections": [
        {"heading": "Success Metrics", "bullets": ["Original point"]},
    ]}
    case = {"plan": {"generated_brief": raw}}
    snapshot = {"generated_brief": raw}
    projected_case, projected_snapshot = with_bundle_brief_funnel(case, snapshot, SELECTOR)
    case_brief = projected_case["plan"]["generated_brief"]
    preferred_brief = projected_snapshot["generated_brief"]
    assert preferred_brief == case_brief
    assert len(preferred_brief["sections"][0]["lines"]) == 5
    assert "lines" not in raw["sections"][0]


def test_save_handler_accepts_the_old_editor_shape():
    class Collection:
        def __init__(self, docs):
            self.docs = docs

        async def find_one(self, query, projection=None):
            return next((deepcopy(doc) for doc in self.docs
                         if all(doc.get(key) == value for key, value in query.items())), None)

        async def update_one(self, query, update):
            doc = next(doc for doc in self.docs
                       if all(doc.get(key) == value for key, value in query.items()))
            for path, value in update.get("$set", {}).items():
                target = doc
                parts = path.split(".")
                for part in parts[:-1]:
                    target = target.setdefault(part, {})
                target[parts[-1]] = deepcopy(value)
            if "$push" in update:
                doc.setdefault("timeline", []).append(deepcopy(update["$push"]["timeline"]))

    original = {"title": "Brief", "duration": "12 months", "sections": [
        {"heading": "Success Metrics", "bullets": ["Original point"]},
    ]}
    class Database:
        v3_business_cases = Collection([{"id": "case-1", "frame": {"alignment_snapshot_id": "snap-1"},
                                         "plan": {"generated_brief": deepcopy(original)}}])
        v3_alignment_snapshots = Collection([{"id": "snap-1", "business_case_id": "case-1",
                                              "generated_brief": deepcopy(original)}])
        v3_brainstorm_rounds = Collection([{"business_case_id": "case-1", "creator_selector": SELECTOR}])

    db = Database()
    router = make_v3_router(db)
    route = next(route for route in router.routes
                 if route.path.endswith("/business-cases/{bc_id}/creative-brief")
                 and "PATCH" in route.methods)
    payload_type = route.endpoint.__annotations__["payload"]
    # The fake database completes each await immediately, so this runs the
    # real handler without requiring a Windows event loop or external service.
    def complete(coroutine):
        try:
            coroutine.send(None)
        except StopIteration as finished:
            return finished.value
        raise AssertionError("Save handler unexpectedly waited for an external service")

    result = complete(route.endpoint(
        "case-1", payload_type(title="Brief", duration="12 months", sections=[
            {"heading": "Success Metrics", "bullets": ["Edited point"], "lines": []},
        ]), alignment_snapshot_id="snap-1",
    ))
    saved = result["brief"]
    assert saved["sections"][0]["bullets"] == ["Edited point"]
    assert len(saved["sections"][0]["lines"]) == 5
    assert db.v3_business_cases.docs[0]["plan"]["generated_brief"] == (
        db.v3_alignment_snapshots.docs[0]["generated_brief"])
    again = complete(route.endpoint(
        "case-1", payload_type(title=saved["title"], duration=saved["duration"],
                               sections=saved["sections"]), alignment_snapshot_id="snap-1",
    ))
    assert len(again["brief"]["sections"][0]["lines"]) == 5
