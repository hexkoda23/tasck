"""Regression: the Pitch Deck must report WHY generation failed, and must
never do its LLM work on the server's event loop.

Both were the same outage. The Anthropic key had hit a hard spend cap and was
answering `400 You have reached your specified API usage limits`, but the job
swallowed that into "Check ANTHROPIC_API_KEY / TASCK_AI_PROVIDER and retry" -
so the real cause stayed invisible. Meanwhile the LLM call and the heavy
`emergentintegrations` import ran on the event loop, which stalled the worker
and made Cloudflare answer every request with a 520.
"""

import asyncio
import os
import sys
import threading
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import v3_routes as mod  # noqa: E402


BRAND = {"company": "Star Lager"}
CASE = {"title": "Creator Campaign"}
SNAPSHOT = {"priority": "Brand Awareness"}


def _clear_provider_env(monkeypatch):
    for name in ("EMERGENT_LLM_KEY", "ANTHROPIC_API_KEY", "TASCK_AI_PROVIDER",
                 "PITCH_DECK_PROVIDER", "APP_ENV", "ENVIRONMENT"):
        monkeypatch.delenv(name, raising=False)


def test_missing_keys_are_reported_by_name(monkeypatch):
    """With no provider configured the admin is told exactly that."""
    _clear_provider_env(monkeypatch)
    failures = []
    result = asyncio.run(mod._call_pitch_deck_tool(
        BRAND, CASE, SNAPSHOT, {}, [], failures=failures))

    assert result is None
    joined = " | ".join(failures)
    assert "EMERGENT_LLM_KEY is not set" in joined
    assert "ANTHROPIC_API_KEY is not set" in joined


def test_anthropic_spend_cap_reaches_the_admin(monkeypatch):
    """A 400 usage-limit reply is quoted, not flattened into a generic string.

    This is the exact body that took the Pitch Deck down; `raise_for_status()`
    used to turn it into a bare "400 Client Error" with the reason discarded.
    """
    _clear_provider_env(monkeypatch)
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-ant-test")

    class _Resp:
        status_code = 400
        text = ('{"type":"error","error":{"type":"invalid_request_error",'
                '"message":"You have reached your specified API usage limits. '
                'You will regain access on 2026-09-01 at 00:00 UTC."}}')

    monkeypatch.setattr(mod.requests, "post", lambda *a, **k: _Resp())

    failures = []
    result = asyncio.run(mod._call_pitch_deck_tool(
        BRAND, CASE, SNAPSHOT, {}, [], failures=failures))

    assert result is None
    joined = " | ".join(failures)
    assert "HTTP 400" in joined
    assert "reached your specified API usage limits" in joined


def test_truncated_deck_json_is_named_as_truncation(monkeypatch):
    """`stop_reason: max_tokens` must not masquerade as "the AI returned junk"."""
    _clear_provider_env(monkeypatch)
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-ant-test")

    class _Resp:
        status_code = 200
        text = ""

        @staticmethod
        def json():
            return {"stop_reason": "max_tokens",
                    "content": [{"type": "text", "text": '{"slides": {"cover":'}]}

    monkeypatch.setattr(mod.requests, "post", lambda *a, **k: _Resp())

    failures = []
    assert asyncio.run(mod._call_pitch_deck_tool(
        BRAND, CASE, SNAPSHOT, {}, [], failures=failures)) is None
    assert "truncated" in " | ".join(failures)


def test_emergent_call_never_runs_on_the_event_loop(monkeypatch):
    """The SDK call must happen on a worker thread.

    A blocking client inside `send_message` freezes every other request for the
    length of a 60-second generation - which is what the gateway reported as a
    520. Assert on the thread identity rather than on timing.
    """
    calling_thread = {}

    def _fake_chat_sync(api_key, session_id, system_prompt, provider, model, user_message):
        calling_thread["name"] = threading.current_thread()
        return '{"ok": true}'

    monkeypatch.setattr(mod, "_emergent_chat_sync", _fake_chat_sync)

    async def _run():
        main_thread = threading.current_thread()
        text = await mod._emergent_chat("key", "sid", "system", "gemini", "m", "hello")
        return main_thread, text

    main_thread, text = asyncio.run(_run())

    assert text == '{"ok": true}'
    assert calling_thread["name"] is not main_thread, \
        "emergent chat ran on the event loop thread"


def test_emergent_import_failure_is_cached_and_explained(monkeypatch):
    """A missing SDK is reported once, not re-imported on every request."""
    monkeypatch.setattr(mod, "_EMERGENT_CACHE",
                        {"loaded": False, "chat": None, "user_message": None, "error": None})
    real_import = __builtins__["__import__"] if isinstance(__builtins__, dict) else __builtins__.__import__
    calls = []

    def _blocked_import(name, *args, **kwargs):
        if name.startswith("emergentintegrations"):
            calls.append(name)
            raise ModuleNotFoundError("No module named 'emergentintegrations'")
        return real_import(name, *args, **kwargs)

    monkeypatch.setattr("builtins.__import__", _blocked_import)

    chat, user_message, err = mod._load_emergent_sync()
    assert chat is None and user_message is None
    assert "emergentintegrations unavailable" in err
    assert "ModuleNotFoundError" in err

    # Second call is served from cache - the expensive import is not retried.
    mod._load_emergent_sync()
    assert len(calls) == 1
