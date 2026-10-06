"""Project totals exclude CRM-only records and honor saved business phases."""

import asyncio

from v3_overview import build_overview, current_business_cases, workflow_position


def test_current_projects_match_business_case_page():
    cases = [
        {"id": "frame-one", "brand_id": "nike", "stage": "frame"},
        {"id": "frame-two", "brand_id": "nike", "stage": "frame"},
        {"id": "parkway", "brand_id": "parkway", "stage": "plan", "business_case_phase": "reporting"},
        {"id": "pluto", "brand_id": "pluto", "stage": "plan", "business_case_phase": "delivery"},
        {"id": "jenjie", "brand_id": "jenjie", "stage": "plan", "business_case_phase": "reporting"},
    ]
    projects = current_business_cases(cases)
    assert {case["id"] for case in projects} == {"parkway", "pluto", "jenjie"}
    assert [workflow_position(case) for case in projects].count("delivery") == 1
    assert [workflow_position(case) for case in projects].count("reporting") == 2


def test_intentional_new_project_is_kept_alongside_existing_project():
    projects = current_business_cases([
        {"id": "one", "brand_id": "brand", "stage": "plan", "updated_at": "2026-10-01"},
        {"id": "two", "brand_id": "brand", "stage": "plan", "updated_at": "2026-10-02",
         "project_start_mode": "new_project"},
    ])
    assert len(projects) == 2


def test_saved_phase_markers_count_as_projects():
    cases = [
        {"id": "planned", "brand_id": "one", "stage": "frame", "plan": {"planning_completed_at": "2026-10-01"}},
        {"id": "reported", "brand_id": "two", "stage": "frame", "final_report_sent_at": "2026-10-02"},
    ]
    assert [workflow_position(case) for case in current_business_cases(cases)] == ["reporting", "plan"]


def test_operational_overview_project_numbers_match_project_cases():
    class Cursor:
        def __init__(self, rows):
            self.rows = rows

        async def to_list(self, length):
            return self.rows[:length]

    class Collection:
        def __init__(self, rows):
            self.rows = rows

        def find(self, query, projection):
            return Cursor(self.rows)

    class Database:
        def __init__(self):
            self.v3_brands = Collection([{"id": name, "company": name} for name in
                                         ("nike", "parkway", "pluto", "jenjie")])
            self.v3_business_cases = Collection([
                {"id": "frame-one", "brand_id": "nike", "stage": "frame"},
                {"id": "frame-two", "brand_id": "nike", "stage": "frame"},
                {"id": "parkway", "brand_id": "parkway", "stage": "plan", "business_case_phase": "reporting"},
                {"id": "pluto", "brand_id": "pluto", "stage": "plan", "business_case_phase": "delivery"},
                {"id": "jenjie", "brand_id": "jenjie", "stage": "plan", "business_case_phase": "reporting"},
            ])

        def __getattr__(self, name):
            return Collection([])

    result = asyncio.run(build_overview(Database()))
    assert result["portfolio"]["active_projects"]["value"] == 3
    assert result["projects_total"] == 3
    assert {row["key"]: row["count"] for row in result["pipeline"]} == {
        "plan": 0, "delivery": 1, "reporting": 2, "closed": 0,
    }
    assert sum(row["count"] for row in result["status"]) == 3
