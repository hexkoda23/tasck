"""Provider resolution: dropping in a client key must be the only change.

The requirement is narrow and worth stating exactly: when the client sets
ANTHROPIC_API_KEY, the assistant moves to their key AND to native tool calling,
with no second environment variable, no redeploy of a different code path, and
no edit to a tool definition. Everything below is that sentence as assertions.

It also pins the failure mode that took this feature down in production: a key
that is present but rejected must fall through to the next provider, not take
the assistant with it.
"""
from __future__ import annotations

import pytest

from assistant import providers
from assistant.errors import ProviderUnavailable

KEYS = ("ANTHROPIC_API_KEY", "EMERGENT_LLM_KEY", "ASSISTANT_PROVIDER",
        "TASCK_AI_PROVIDER", "ASSISTANT_LLM_MODEL", "ASSISTANT_EMERGENT_MODEL",
        "ASSISTANT_EMERGENT_PROVIDER")


@pytest.fixture(autouse=True)
def clean_env(monkeypatch):
    for key in KEYS:
        monkeypatch.delenv(key, raising=False)


# --------------------------------------------------------------------------
# The core promise
# --------------------------------------------------------------------------

def test_emergent_only_uses_the_json_protocol(monkeypatch):
    """Today's deployment: gateway key, no Anthropic account."""
    monkeypatch.setenv("EMERGENT_LLM_KEY", "sk-emergent-abc123456789")
    chain = providers.resolve_chain()
    assert [b.name for b in chain] == ["emergent"]
    assert chain[0].adapter == providers.ADAPTER_JSON
    assert chain[0].supports_native_tools is False


def test_adding_a_client_key_switches_provider_and_adapter(monkeypatch):
    """The whole point: one env var, and tool calling goes native."""
    monkeypatch.setenv("EMERGENT_LLM_KEY", "sk-emergent-abc123456789")
    before = providers.resolve_chain()[0]
    assert before.name == "emergent"

    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-ant-client-key-0987654321")
    after = providers.resolve_chain()[0]

    assert after.name == "anthropic"
    assert after.adapter == providers.ADAPTER_NATIVE
    assert after.supports_native_tools is True
    assert after.model == providers.DEFAULT_ANTHROPIC_MODEL


def test_the_gateway_remains_a_fallback_once_a_client_key_is_added(monkeypatch):
    """Their key leads; ours stays behind it so a bad key degrades, not breaks."""
    monkeypatch.setenv("EMERGENT_LLM_KEY", "sk-emergent-abc123456789")
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-ant-client-key-0987654321")
    chain = providers.resolve_chain()
    assert [b.name for b in chain] == ["anthropic", "emergent"]


def test_anthropic_only_still_works(monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-ant-client-key-0987654321")
    chain = providers.resolve_chain()
    assert [b.name for b in chain] == ["anthropic"]


def test_no_key_at_all_says_what_to_set(monkeypatch):
    with pytest.raises(ProviderUnavailable) as excinfo:
        providers.resolve_chain()
    assert "ANTHROPIC_API_KEY" in excinfo.value.hint
    assert "EMERGENT_LLM_KEY" in excinfo.value.hint


# --------------------------------------------------------------------------
# Explicit pins still win
# --------------------------------------------------------------------------

@pytest.mark.parametrize("var", ["ASSISTANT_PROVIDER", "TASCK_AI_PROVIDER"])
def test_pinning_emergent_beats_the_presence_of_a_client_key(monkeypatch, var):
    monkeypatch.setenv("EMERGENT_LLM_KEY", "sk-emergent-abc123456789")
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-ant-client-key-0987654321")
    monkeypatch.setenv(var, "emergent")
    assert [b.name for b in providers.resolve_chain()] == ["emergent", "anthropic"]


def test_assistant_provider_outranks_the_global_knob(monkeypatch):
    monkeypatch.setenv("EMERGENT_LLM_KEY", "sk-emergent-abc123456789")
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-ant-client-key-0987654321")
    monkeypatch.setenv("TASCK_AI_PROVIDER", "emergent")
    monkeypatch.setenv("ASSISTANT_PROVIDER", "anthropic")
    assert providers.resolve_chain()[0].name == "anthropic"


@pytest.mark.parametrize("alias,expected", [
    ("claude", "anthropic"), ("anthropic", "anthropic"),
    ("gemini", "emergent"), ("emergent", "emergent"),
])
def test_provider_aliases_match_the_rest_of_the_codebase(monkeypatch, alias, expected):
    monkeypatch.setenv("EMERGENT_LLM_KEY", "sk-emergent-abc123456789")
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-ant-client-key-0987654321")
    monkeypatch.setenv("TASCK_AI_PROVIDER", alias)
    assert providers.resolve_chain()[0].name == expected


def test_whitespace_and_case_do_not_break_resolution(monkeypatch):
    monkeypatch.setenv("EMERGENT_LLM_KEY", "sk-emergent-abc123456789")
    monkeypatch.setenv("ANTHROPIC_API_KEY", "  sk-ant-padded-key-1234567890  ")
    monkeypatch.setenv("TASCK_AI_PROVIDER", "  ANTHROPIC  ")
    binding = providers.resolve_chain()[0]
    assert binding.name == "anthropic"
    assert binding.api_key == "sk-ant-padded-key-1234567890"


def test_an_empty_key_is_treated_as_absent(monkeypatch):
    """A blank env var is a common deploy slip; it must not look configured."""
    monkeypatch.setenv("ANTHROPIC_API_KEY", "   ")
    monkeypatch.setenv("EMERGENT_LLM_KEY", "sk-emergent-abc123456789")
    assert [b.name for b in providers.resolve_chain()] == ["emergent"]


# --------------------------------------------------------------------------
# Model overrides and diagnostics
# --------------------------------------------------------------------------

def test_model_can_be_overridden_without_touching_provider_choice(monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-ant-client-key-0987654321")
    monkeypatch.setenv("ASSISTANT_LLM_MODEL", "claude-opus-4-1")
    assert providers.resolve_chain()[0].model == "claude-opus-4-1"


def test_fingerprint_identifies_without_exposing(monkeypatch):
    secret = "sk-ant-supersecret-key-value-do-not-leak"
    monkeypatch.setenv("ANTHROPIC_API_KEY", secret)
    fingerprint = providers.resolve_chain()[0].fingerprint()
    assert secret not in fingerprint
    assert "supersecret" not in fingerprint
    assert str(len(secret)) in fingerprint


def test_describe_chain_never_leaks_a_key(monkeypatch):
    secret = "sk-ant-supersecret-key-value-do-not-leak"
    monkeypatch.setenv("ANTHROPIC_API_KEY", secret)
    monkeypatch.setenv("EMERGENT_LLM_KEY", "sk-emergent-abc123456789")
    rows = providers.describe_chain()
    assert [r["provider"] for r in rows] == ["anthropic", "emergent"]
    assert secret not in repr(rows)
    assert rows[0]["native_tool_calling"] is True
    assert rows[1]["native_tool_calling"] is False


def test_describe_chain_reports_misconfiguration_rather_than_raising(monkeypatch):
    rows = providers.describe_chain()
    assert rows[0]["ok"] is False
    assert "how_to_fix" in rows[0]
