"""Regression: every AI feature must report WHY its providers failed.

Four features shared one copy-pasted provider loop that logged the real reason
at warning level and then told the user "Check ANTHROPIC_API_KEY /
TASCK_AI_PROVIDER". In production the real reason was
`400 You have reached your specified API usage limits` from a capped Anthropic
key, and the generic message kept it invisible - a tester was blocked on
"Analysis failed. You can retry from this page." with nothing else to go on.

The loop now lives in `_run_ai_provider_chain` and collects each provider's
actual complaint.
"""

import asyncio
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import v3_routes as mod  # noqa: E402


BRAND = {"company": "Zenvia Foods & Beverages Ltd"}
CASE = {"title": "Zenvia - Business Call Connect"}
CORPUS = "Dean: What would success look like?\nAmara: Stronger brand recall."

SPEND_CAP_BODY = (
    '{"type":"error","error":{"type":"invalid_request_error",'
    '"message":"You have reached your specified API usage limits. '
    'You will regain access on 2026-09-01 at 00:00 UTC."}}'
)


def _clear_provider_env(monkeypatch):
    for name in ("EMERGENT_LLM_KEY", "ANTHROPIC_API_KEY", "TASCK_AI_PROVIDER",
                 "OPPORTUNITY_PROVIDER", "CREATIVE_BRIEF_PROVIDER", "PITCH_DECK_PROVIDER",
                 "APP_ENV", "ENVIRONMENT"):
        monkeypatch.delenv(name, raising=False)


class _Resp:
    def __init__(self, status_code, text="", payload=None):
        self.status_code = status_code
        self.text = text
        self._payload = payload or {}

    def json(self):
        return self._payload


# --------------------------------------------------------------------------
# The chain helper itself
# --------------------------------------------------------------------------

def test_chain_returns_the_first_usable_payload():
    async def _call_bad():
        raise RuntimeError("provider one is down")

    async def _call_good():
        return {"opportunities": []}

    failures = []
    result = asyncio.run(mod._run_ai_provider_chain(
        [_call_bad, _call_good], lambda r: None, failures, "Test"))

    assert result == {"opportunities": []}
    assert failures == ["bad: provider one is down"]


def test_chain_records_an_unusable_payload_without_raising():
    async def _call_thin():
        return {"opportunities": None}

    failures = []
    result = asyncio.run(mod._run_ai_provider_chain(
        [_call_thin], lambda r: "no opportunities list", failures, "Test"))

    assert result is None
    assert failures == ["thin: no opportunities list"]


def test_chain_names_a_timeout_as_a_timeout():
    async def _call_slow():
        raise asyncio.TimeoutError()

    failures = []
    assert asyncio.run(mod._run_ai_provider_chain(
        [_call_slow], lambda r: None, failures, "Test")) is None
    assert failures == ["slow: timed out"]


# --------------------------------------------------------------------------
# The Anthropic call wrapper
# --------------------------------------------------------------------------

def test_anthropic_call_quotes_the_response_body(monkeypatch):
    """`raise_for_status()` collapsed this into a bare "400 Client Error"."""
    monkeypatch.setattr(mod.requests, "post",
                        lambda *a, **k: _Resp(400, SPEND_CAP_BODY))

    with pytest.raises(RuntimeError) as excinfo:
        mod._anthropic_json_call("sk-ant-test", "claude-sonnet-4-5", "sys", "msg",
                                 max_tokens=16000, temperature=0.1)

    assert "HTTP 400" in str(excinfo.value)
    assert "reached your specified API usage limits" in str(excinfo.value)


def test_anthropic_call_names_a_missing_key():
    with pytest.raises(RuntimeError, match="ANTHROPIC_API_KEY is not set"):
        mod._anthropic_json_call(None, "m", "sys", "msg", max_tokens=100, temperature=0)


def test_anthropic_call_flags_truncation(monkeypatch):
    monkeypatch.setattr(mod.requests, "post", lambda *a, **k: _Resp(
        200, payload={"stop_reason": "max_tokens",
                      "content": [{"type": "text", "text": '{"opportunities": ['}]}))

    with pytest.raises(RuntimeError, match="truncated"):
        mod._anthropic_json_call("sk-ant-test", "m", "sys", "msg",
                                 max_tokens=100, temperature=0)


# --------------------------------------------------------------------------
# The features the team actually walks through
# --------------------------------------------------------------------------

def test_analyze_conversations_reports_the_spend_cap(monkeypatch):
    """The exact failure the tester hit on the Connect stage."""
    _clear_provider_env(monkeypatch)
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-ant-test")
    monkeypatch.setattr(mod.requests, "post",
                        lambda *a, **k: _Resp(400, SPEND_CAP_BODY))

    failures = []
    result = asyncio.run(mod._call_opportunity_detection_tool(
        BRAND, CASE, CORPUS, failures=failures))

    assert result is None
    joined = " | ".join(failures)
    assert "reached your specified API usage limits" in joined
    assert "EMERGENT_LLM_KEY is not set" in joined


def test_creative_brief_reports_the_spend_cap(monkeypatch):
    _clear_provider_env(monkeypatch)
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-ant-test")
    monkeypatch.setattr(mod.requests, "post",
                        lambda *a, **k: _Resp(400, SPEND_CAP_BODY))

    failures = []
    assert asyncio.run(mod._call_creative_brief_tool(
        BRAND, CASE, {}, {}, [], failures=failures)) is None
    assert "reached your specified API usage limits" in " | ".join(failures)


def test_analyze_conversations_succeeds_on_the_failover(monkeypatch):
    """A capped Anthropic key must not stop a working Emergent key."""
    _clear_provider_env(monkeypatch)
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-ant-test")
    monkeypatch.setenv("EMERGENT_LLM_KEY", "sk-emergent-test")
    monkeypatch.setattr(mod.requests, "post",
                        lambda *a, **k: _Resp(400, SPEND_CAP_BODY))
    monkeypatch.setattr(
        mod, "_emergent_chat_sync",
        lambda *a, **k: '{"opportunities": [{"title": "Zenvia launch push"}]}')

    failures = []
    result = asyncio.run(mod._call_opportunity_detection_tool(
        BRAND, CASE, CORPUS, failures=failures))

    assert result is not None
    assert result["opportunities"][0]["title"] == "Zenvia launch push"
    # The Anthropic attempt is still recorded, so the cap stays visible in logs.
    assert "reached your specified API usage limits" in " | ".join(failures)
