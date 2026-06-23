"""V3.3 Alignment Snapshot overhaul backend tests.

Validates:
- POST /api/v3/business-cases/{bc_id}/connect/analyze-all
- POST /api/v3/brands/{brand_id}/call-transcript (rich + thin)
- POST /api/v3/brands/{brand_id}/frame-transcripts
- POST /api/v3/business-cases/{bc_id}/ai/alignment/questions
- POST /api/v3/brands/{brand_id}/ai/follow-up-draft
- POST /api/v3/meetings/{meeting_id}/analyze (business_call)
- Regression: GET /api/v3/business-cases/{bc_id}
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://tasck-live-demo-1.preview.emergentagent.com").rstrip("/")
BRAND_ID = "brand-1915c8bded"
BC_ID = "bc-0ae422a0dc"

EXPECTED_KEYS = [
    "key_marketing_focus",
    "primary_target_audience",
    "key_marketing_channels",
    "kpis",
    "budget_range",
    "timeline",
    "approval_process_decision_maker",
    "current_marketing_challenge",
]

EXPECTED_LABELS = [
    "Key marketing focus",
    "Primary target audience",
    "Key marketing channels",
    "KPIs",
    "Budget range",
    "Timeline",
    "Approval process / decision maker",
    "Current marketing challenge",
]

# Anthropic calls may take up to 60s server-side, so allow 90s here.
LONG_TIMEOUT = 120

RICH_TRANSCRIPT = (
    "RM: Welcome to our Connect call. Can you tell us about Chivas' priorities?\n"
    "Brand: Our key marketing focus is driving premium awareness for Chivas 18 among "
    "affluent Nigerian millennials.\n"
    "RM: Who is the primary target audience?\n"
    "Brand: Lagos- and Abuja-based professionals aged 28-40, household income above N20M, "
    "into whisky and lifestyle culture.\n"
    "RM: Which marketing channels matter most?\n"
    "Brand: Instagram, TikTok, premium OOH in Victoria Island and Ikoyi, plus on-trade "
    "bar activations.\n"
    "RM: What are your KPIs?\n"
    "Brand: 50 million social impressions, 8 percent engagement rate, and 12 percent lift in "
    "premium recall over 90 days. We measure via Nielsen brand tracker.\n"
    "RM: Budget range for this push?\n"
    "Brand: We have N350M to N450M signed off for Q1 and Q2 2026.\n"
    "RM: Timeline?\n"
    "Brand: Launch first week of February 2026, run for 12 weeks ending end of April 2026.\n"
    "RM: Approval process and decision maker?\n"
    "Brand: I sign off on creative direction, but final budget approval sits with the Pernod "
    "Ricard West Africa CMO, Adaobi Eze. Two-step approval, takes about 5 business days.\n"
    "RM: Any current marketing challenge?\n"
    "Brand: Yes - we are losing share to Jack Daniel's and Hennessy with the 28-35 segment "
    "and need a creator-led push to reclaim cultural relevance.\n"
)

THIN_TRANSCRIPT = (
    "RM: Quick Connect call - tell us the headline.\n"
    "Brand: Our key marketing focus is awareness for Chivas 18 among urban Nigerian "
    "professionals.\n"
    "RM: Audience?\n"
    "Brand: Lagos and Abuja millennials aged 28-40.\n"
    "RM: Channels?\n"
    "Brand: We are exploring Instagram and creator partnerships.\n"
    "RM: KPI?\n"
    "Brand: We care about engagement and recall but have not locked targets yet.\n"
    "RM: Current challenge?\n"
    "Brand: Cultural relevance with younger drinkers.\n"
    # Intentionally omitting: budget, timeline, decision maker.
)


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _assert_alignment_snapshot_fields(fields):
    assert isinstance(fields, list), "alignment_snapshot_fields must be a list"
    assert len(fields) == 8, f"Expected 8 alignment fields, got {len(fields)}"
    keys = [f.get("key") for f in fields]
    assert keys == EXPECTED_KEYS, f"Field keys/order mismatch. Got: {keys}"
    questions = [f.get("question") for f in fields]
    assert questions == EXPECTED_LABELS, f"Field labels/order mismatch. Got: {questions}"


def _assert_readiness(readiness):
    assert isinstance(readiness, dict)
    assert "captured_count" in readiness
    assert "total_count" in readiness
    assert "percentage" in readiness
    assert readiness["total_count"] == 8


def _assert_marketing_intelligence(mi):
    assert isinstance(mi, dict)
    for key in EXPECTED_KEYS:
        assert key in mi, f"marketing_intelligence missing key: {key}"


# --------------------------------------------------------------------------
# Regression: business case GET still works
# --------------------------------------------------------------------------
def test_business_case_get_regression(session):
    r = session.get(f"{BASE_URL}/api/v3/business-cases/{BC_ID}", timeout=30)
    assert r.status_code == 200, r.text
    data = r.json()
    # Endpoint returns the business case directly under 'business_case' or top-level
    bc = data.get("business_case") or data
    assert bc.get("id") == BC_ID


# --------------------------------------------------------------------------
# Brand call-transcript: rich transcript -> all 8 captured
# --------------------------------------------------------------------------
def test_brand_call_transcript_rich(session):
    payload = {
        "transcript": RICH_TRANSCRIPT,
        "actor": "admin",
        "source": "smoke_test_rich",
    }
    r = session.post(
        f"{BASE_URL}/api/v3/brands/{BRAND_ID}/call-transcript",
        json=payload,
        timeout=LONG_TIMEOUT,
    )
    assert r.status_code == 200, r.text
    data = r.json()
    snap = data.get("alignment_snapshot") or {}
    assert snap, "alignment_snapshot missing in response"

    assert snap.get("analysis_source") == "anthropic", f"Expected anthropic, got {snap.get('analysis_source')}"

    fields = snap.get("alignment_snapshot_fields") or []
    _assert_alignment_snapshot_fields(fields)

    captured = set(snap.get("captured_fields") or [])
    missing = snap.get("missing_fields") or []
    assert captured == set(EXPECTED_KEYS), (
        f"Expected all 8 fields captured. Captured: {captured}, Missing: {missing}"
    )
    assert missing == [], f"Expected no missing fields for rich transcript, got {missing}"

    # No invented channels - the channels in the result must be derived from the transcript.
    mi = snap.get("marketing_intelligence") or {}
    _assert_marketing_intelligence(mi)


# --------------------------------------------------------------------------
# Brand call-transcript: thin transcript -> missing budget/decision-maker/timeline
# --------------------------------------------------------------------------
def test_brand_call_transcript_thin(session):
    payload = {
        "transcript": THIN_TRANSCRIPT,
        "actor": "admin",
        "source": "smoke_test_thin",
    }
    r = session.post(
        f"{BASE_URL}/api/v3/brands/{BRAND_ID}/call-transcript",
        json=payload,
        timeout=LONG_TIMEOUT,
    )
    assert r.status_code == 200, r.text
    data = r.json()
    # The single-call analysis is in transcript_analysis (uses only the thin
    # transcript). alignment_snapshot is the aggregate across ALL connect
    # meetings, which may include earlier rich uploads.
    analysis = data.get("transcript_analysis") or {}
    assert analysis.get("analysis_source") == "anthropic", (
        f"Expected anthropic, got {analysis.get('analysis_source')}"
    )

    fields = analysis.get("alignment_snapshot_fields") or []
    _assert_alignment_snapshot_fields(fields)

    field_map = {f["key"]: f for f in fields}
    must_be_missing = {"budget_range", "timeline", "approval_process_decision_maker"}
    for k in must_be_missing:
        f = field_map[k]
        assert f.get("status") == "needs_confirmation", (
            f"Field {k} should be needs_confirmation in single-call analysis, got status={f.get('status')!r}, answer={f.get('answer')!r}"
        )
        val = f.get("answer") or ""
        assert val.startswith("Needs confirmation"), (
            f"Field {k} answer should start with 'Needs confirmation:', got: {val!r}"
        )

    # No invented channels: TikTok/YouTube/PR should NOT appear unless the brand mentioned them.
    mi = analysis.get("marketing_intelligence") or {}
    channels = mi.get("key_marketing_channels") or []
    channels_text = " ".join(str(c).lower() for c in channels) if isinstance(channels, list) else str(channels).lower()
    for forbidden in ["tiktok", "youtube", "press release", " pr "]:
        assert forbidden not in channels_text, (
            f"Channels should not invent {forbidden!r}; got: {channels!r}"
        )


# --------------------------------------------------------------------------
# Frame transcripts: multiple sessions merged
# --------------------------------------------------------------------------
def test_brand_frame_transcripts_multi(session):
    payload = {
        "transcripts": [
            {
                "transcript": RICH_TRANSCRIPT,
                "call_date": "2026-01-08",
                "session_label": "Session 1 - Discovery",
                "notes": "first discovery call",
            },
            {
                "transcript": THIN_TRANSCRIPT,
                "call_date": "2026-01-15",
                "session_label": "Session 2 - Follow up",
                "notes": "follow up",
            },
        ],
        "actor": "admin",
        "source": "v1_admin_multi_transcript_frame",
    }
    r = session.post(
        f"{BASE_URL}/api/v3/brands/{BRAND_ID}/frame-transcripts",
        json=payload,
        timeout=LONG_TIMEOUT * 2,
    )
    assert r.status_code == 200, r.text
    data = r.json()
    snap = data.get("alignment_snapshot") or {}
    fields = snap.get("alignment_snapshot_fields") or []
    _assert_alignment_snapshot_fields(fields)

    bc = data.get("business_case") or {}
    connect = bc.get("connect") or {}
    assert connect.get("alignment_tool_analysis"), "connect.alignment_tool_analysis not populated"


# --------------------------------------------------------------------------
# Analyze-all on the business case
# --------------------------------------------------------------------------
def test_analyze_all_connect_transcripts(session):
    r = session.post(
        f"{BASE_URL}/api/v3/business-cases/{BC_ID}/connect/analyze-all",
        timeout=LONG_TIMEOUT,
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert data.get("analysis_source") == "anthropic", f"Expected anthropic, got {data.get('analysis_source')}"
    _assert_readiness(data.get("readiness") or {})
    _assert_alignment_snapshot_fields(data.get("alignment_snapshot_fields") or [])
    _assert_marketing_intelligence(data.get("marketing_intelligence") or {})


# --------------------------------------------------------------------------
# V1 Alignment Snapshot generator: must produce 8 rows in correct order
# --------------------------------------------------------------------------
def test_v1_alignment_snapshot_questions(session):
    # The business case must be in 'frame' stage (process_brand_call_transcript moved it there).
    r = session.post(
        f"{BASE_URL}/api/v3/business-cases/{BC_ID}/ai/alignment/questions",
        timeout=LONG_TIMEOUT,
    )
    assert r.status_code == 200, r.text
    doc = r.json()

    assert (doc.get("meta") or "").startswith("Based on our call"), (
        f"meta must start with 'Based on our call', got: {doc.get('meta')!r}"
    )

    sections = doc.get("sections") or []
    assert sections, "doc.sections missing"
    rows = sections[0].get("rows") or []
    assert len(rows) == 8, f"Expected exactly 8 rows, got {len(rows)}"
    keys = [row.get("key") for row in rows]
    assert keys == EXPECTED_KEYS, f"Row order/keys mismatch. Got: {keys}"
    labels = [row.get("Alignment field") for row in rows]
    assert labels == EXPECTED_LABELS, f"Row labels mismatch. Got: {labels}"

    _assert_readiness(doc.get("readiness") or {})
    assert "captured_fields" in doc
    assert "missing_fields" in doc


# --------------------------------------------------------------------------
# New follow-up draft endpoint
# --------------------------------------------------------------------------
def test_brand_followup_draft(session):
    payload = {
        "instructions": "Re-engage politely to confirm next step.",
        "context": "Last call discussed Chivas 18 push.",
    }
    r = session.post(
        f"{BASE_URL}/api/v3/brands/{BRAND_ID}/ai/follow-up-draft",
        json=payload,
        timeout=LONG_TIMEOUT,
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert data.get("analysis_source") == "anthropic", f"Expected anthropic, got {data.get('analysis_source')}"
    subject = data.get("subject")
    draft = data.get("draft")
    talking = data.get("talking_points")
    assert isinstance(subject, str) and subject.strip(), f"subject invalid: {subject!r}"
    assert isinstance(draft, str) and len(draft.strip()) > 30, f"draft too short: {draft!r}"
    assert isinstance(talking, list) and talking, f"talking_points missing: {talking!r}"
    # Draft should include the contact name (or fallback 'there'). Pull contact name from brand.
    br = session.get(f"{BASE_URL}/api/v3/brands/{BRAND_ID}", timeout=20).json()
    contact_name = (br.get("brand") or br).get("primary_contact") or (br.get("brand") or br).get("contact_name") or "there"
    first = (contact_name or "there").split(" ")[0]
    assert first.lower() in draft.lower() or "there" in draft.lower(), (
        f"draft should reference contact name {first!r}; draft: {draft!r}"
    )


# --------------------------------------------------------------------------
# Single-transcript meeting analyzer should use the bundle analyzer
# --------------------------------------------------------------------------
def test_meeting_analyze_business_call(session):
    # Find a business_call meeting for this brand that has a transcript.
    r = session.get(f"{BASE_URL}/api/v3/meetings", timeout=30)
    assert r.status_code == 200, r.text
    payload = r.json()
    meetings = payload if isinstance(payload, list) else payload.get("meetings", [])

    target = None
    for m in meetings:
        if (
            m.get("brand_id") == BRAND_ID
            and (m.get("meeting_type") or "").lower() in {"business_call", "connector"}
            and (m.get("transcript") or "").strip()
        ):
            target = m
            break

    if not target:
        pytest.skip("No business_call meeting with transcript found for brand-1915c8bded")

    mid = target["id"]
    r = session.post(f"{BASE_URL}/api/v3/meetings/{mid}/analyze", timeout=LONG_TIMEOUT)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data.get("analysis_source") == "anthropic", f"Expected anthropic, got {data.get('analysis_source')}"
    _assert_readiness(data.get("readiness") or {})
    fields = data.get("alignment_snapshot_fields") or []
    _assert_alignment_snapshot_fields(fields)
