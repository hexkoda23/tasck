"""Provider error classification, the circuit breaker, and whole-document scope.

The classification tests use the error bodies providers actually send, not
tidy stand-ins. The most important is the 400 billing case: Anthropic reports
an exhausted balance as HTTP 400, and the production outage recorded in
v3_routes was exactly "400 You have reached your specified API usage limits".
A classifier that mapped by status code alone would call that a malformed
request and send the admin looking in entirely the wrong place.
"""
from __future__ import annotations

import asyncio
import json

import pytest

from assistant import client, upstream
from assistant.context import _WHOLE_DOCUMENT, build_document_context, wants_whole_document
from assistant.providers import ProviderBinding
from assistant.upstream import MESSAGES, UpstreamError, classify, summarise


def body(error_type, message):
    return json.dumps({"type": "error", "error": {"type": error_type, "message": message}})


# --------------------------------------------------------------------------
# The two messages the requirement specifies word for word
# --------------------------------------------------------------------------

def test_quota_message_is_exact():
    assert MESSAGES[upstream.QUOTA] == (
        "API Quota Exceeded: The Anthropic API balance or usage limit has been reached. "
        "Please update billing/credits in the console.")


def test_route_message_is_exact():
    assert MESSAGES[upstream.NOT_SUPPORTED] == (
        "Action Not Supported: The requested route or backend action endpoint is missing "
        "or improperly configured.")


# --------------------------------------------------------------------------
# Classification against real provider bodies
# --------------------------------------------------------------------------

@pytest.mark.parametrize("status,error_type,message,expected", [
    # 429 rate limit - the obvious case
    (429, "rate_limit_error", "Number of request tokens has exceeded your rate limit", "quota_exceeded"),
    (429, None, "", "quota_exceeded"),
    # Billing reported as 400 - the case status-only mapping gets wrong
    (400, "invalid_request_error",
     "Your credit balance is too low to access the Anthropic API.", "quota_exceeded"),
    (400, "invalid_request_error",
     "You have reached your specified API usage limits.", "quota_exceeded"),
    # Auth
    (401, "authentication_error", "API key is invalid.", "auth_failed"),
    (403, "permission_error", "Your API key does not have permission.", "auth_failed"),
    (401, None, "", "auth_failed"),
    # Missing route or model
    (404, "not_found_error", "model: claude-nope", "action_not_supported"),
    (404, None, "", "action_not_supported"),
    # Genuinely malformed or oversized
    (400, "invalid_request_error", "prompt is too long: 250000 tokens > 200000 maximum",
     "bad_request"),
    (413, "request_too_large", "Request exceeds the maximum allowed size", "bad_request"),
    # Provider side
    (500, "api_error", "Internal server error", "provider_down"),
    (529, "overloaded_error", "Overloaded", "provider_down"),
    (503, None, "", "provider_down"),
])
def test_classification(status, error_type, message, expected):
    err = UpstreamError("anthropic", status=status,
                        body=body(error_type, message) if error_type else "")
    assert err.kind == expected, f"{status} {error_type} {message!r}"
    assert err.message == MESSAGES[expected]


def test_the_exact_401_from_the_emergent_log():
    raw = '{"type":"error","error":{"type":"authentication_error","message":"API key is invalid."},"request_id":null}'
    err = UpstreamError("anthropic", status=401, body=raw)
    assert err.kind == "auth_failed"
    assert err.details["provider_message"] == "API key is invalid."


def test_timeout_classifies_as_timeout_whatever_else_is_set():
    assert classify(status=500, timed_out=True) == "timed_out"


def test_litellm_style_exception_keeps_its_status():
    """The gateway path raises LiteLLM exceptions carrying status_code."""
    err = UpstreamError("emergent", status=429, detail="RateLimitError: litellm.RateLimitError")
    assert err.kind == "quota_exceeded"


def test_non_json_body_does_not_break_classification():
    err = UpstreamError("anthropic", status=502, body="<html>Bad Gateway</html>")
    assert err.kind == "provider_down"


def test_unknown_failure_still_gives_an_actionable_message():
    err = UpstreamError("emergent", detail="ConnectionResetError: peer reset")
    assert err.kind == "provider_error"
    assert "diagnostics" in err.hint


# --------------------------------------------------------------------------
# Which failure leads when several providers failed
# --------------------------------------------------------------------------

def test_the_last_provider_leads_and_earlier_ones_are_kept():
    """In the Emergent deployment the Anthropic key is known-dead; leading with
    'key rejected' on every request would bury the timeout that really failed."""
    auth = UpstreamError("anthropic", status=401, body=body("authentication_error", "bad"))
    timeout = UpstreamError("emergent", timed_out=True)
    lead = summarise([auth, timeout])
    assert lead is timeout
    assert any("Authentication Failed" in line for line in lead.details["also"])


def test_summarise_of_nothing_is_nothing():
    assert summarise([]) is None


# --------------------------------------------------------------------------
# Circuit breaker - the wasted 401 on every call in the Emergent log
# --------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def clean_breaker():
    upstream.reset_breaker()
    yield
    upstream.reset_breaker()


def test_auth_and_quota_trip_the_breaker_but_timeouts_do_not():
    upstream.trip("anthropic:k1", upstream.AUTH)
    upstream.trip("anthropic:k2", upstream.QUOTA)
    upstream.trip("emergent:k3", upstream.TIMEOUT)
    assert upstream.is_tripped("anthropic:k1")
    assert upstream.is_tripped("anthropic:k2")
    assert not upstream.is_tripped("emergent:k3"), "a timeout can succeed next time"


def test_breaker_expires(monkeypatch):
    now = [1000.0]
    monkeypatch.setattr(upstream.time, "monotonic", lambda: now[0])
    upstream.trip("anthropic:k", upstream.AUTH)
    assert upstream.is_tripped("anthropic:k")
    now[0] += upstream.COOL_OFF_SECONDS + 1
    assert not upstream.is_tripped("anthropic:k")


def test_a_rotated_key_is_not_skipped_because_the_old_one_was_bad():
    upstream.trip(upstream.breaker_key("anthropic", "old-fp"), upstream.AUTH)
    assert not upstream.is_tripped(upstream.breaker_key("anthropic", "new-fp"))


def _bindings():
    return [
        ProviderBinding(name="anthropic", adapter="native_tools", model="m",
                        api_key="sk-ant-revoked-000000000000"),
        ProviderBinding(name="emergent", adapter="json_protocol", model="m",
                        api_key="sk-emergent-111111111111", upstream="anthropic"),
    ]


def test_a_rejected_key_is_skipped_on_the_next_call(monkeypatch):
    """Exactly the pattern in the log: 401, fall back, 401, fall back..."""
    attempts = []

    async def fake_call_one(binding, system, user, session_id="x"):
        attempts.append(binding.name)
        if binding.name == "anthropic":
            raise UpstreamError("anthropic", status=401,
                                body=body("authentication_error", "API key is invalid."))
        return '{"reply":"ok","tool_calls":[]}'

    monkeypatch.setattr(client, "resolve_chain", _bindings)
    monkeypatch.setattr(client, "call_one", fake_call_one)

    call_model, failures = client.make_caller("s")
    asyncio.run(call_model("sys", "user"))
    asyncio.run(call_model("sys", "user"))
    asyncio.run(call_model("sys", "user"))

    assert attempts == ["anthropic", "emergent", "emergent", "emergent"], \
        "the revoked key should be tried once, then skipped"


def test_if_every_provider_is_tripped_they_are_tried_anyway(monkeypatch):
    for b in _bindings():
        upstream.trip(upstream.breaker_key(b.name, b.fingerprint()), upstream.AUTH)
    seen = []

    async def fake_call_one(binding, system, user, session_id="x"):
        seen.append(binding.name)
        return '{"reply":"ok"}'

    monkeypatch.setattr(client, "resolve_chain", _bindings)
    monkeypatch.setattr(client, "call_one", fake_call_one)
    call_model, _ = client.make_caller("s")
    asyncio.run(call_model("sys", "user"))
    assert seen, "refusing outright is worse than trying a probably-dead key"


def test_caller_raises_the_classified_error_not_a_string(monkeypatch):
    async def fake_call_one(binding, system, user, session_id="x"):
        raise asyncio.TimeoutError()

    monkeypatch.setattr(client, "resolve_chain", _bindings)
    monkeypatch.setattr(client, "call_one", fake_call_one)
    call_model, failures = client.make_caller("s")
    with pytest.raises(UpstreamError) as excinfo:
        asyncio.run(call_model("sys", "user"))
    assert excinfo.value.kind == "timed_out"
    assert len(failures) == 2


def test_per_call_timeout_clears_the_generations_seen_in_the_log():
    """Every call that timed out at 18s completed at 24-29s."""
    assert client.PER_CALL_TIMEOUT >= 30


# --------------------------------------------------------------------------
# Whole-document scope
# --------------------------------------------------------------------------

def test_whole_document_pattern_has_no_stray_control_characters():
    """Regression: a shell heredoc once turned the regex's word boundary into a
    literal backspace byte, so the detector matched nothing and failed silently."""
    assert "\x08" not in _WHOLE_DOCUMENT.pattern
    assert _WHOLE_DOCUMENT.pattern.startswith("\\b")


@pytest.mark.parametrize("message,expected", [
    ("change the vibe of the whole content to reflect a playful vibe", True),
    ("rewrite everything to sound friendlier", True),
    ("make the entire snapshot shorter", True),
    ("tidy all of the content", True),
    ("change every section to British spelling", True),
    ("rename section 2 to Reveal Questions", False),
    ("change the heading of focus and priority", False),
    ("make the opening paragraph punchier", False),
    ("wholesale pricing", False),  # word boundary, not substring
])
def test_whole_document_detection(message, expected):
    assert wants_whole_document(message) is expected


def test_whole_document_request_sends_every_body():
    sections = [{"heading": f"Section {i}", "type": "prose",
                 "content": "Long body text. " * 20} for i in range(10)]
    ctx = build_document_context(
        sections, "change the vibe of the whole content to reflect a playful vibe")
    assert ctx["included_full"] == list(range(10))
    assert ctx["previewed"] == []
