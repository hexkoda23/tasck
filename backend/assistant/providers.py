"""Which model answers, and how tools reach it.

The deployment target moves: today the Emergent gateway, later a client's own
Anthropic key. The requirement is that dropping in that key is the ONLY change
anyone makes - no second env var, no redeploy of a different code path, no
edit to a tool definition.

So provider choice is derived, never declared:

    ANTHROPIC_API_KEY present  ->  Anthropic direct, native tool calling
    EMERGENT_LLM_KEY present   ->  Emergent gateway, JSON tool protocol
    both present               ->  Anthropic first, Emergent as fallback
    neither                    ->  ProviderUnavailable, said plainly

An explicit ASSISTANT_PROVIDER or TASCK_AI_PROVIDER still wins when someone
wants to pin it, which keeps the existing one-knob behaviour in v3_routes.

Capability follows the binding rather than being configured separately: the
adapter is a property of the provider, so a key swap changes how tools are
presented without anyone thinking about it.
"""
from __future__ import annotations

import os
from dataclasses import dataclass
from typing import List, Optional

from .errors import ProviderUnavailable

#: How tools are put in front of the model.
ADAPTER_NATIVE = "native_tools"    # real function calling
ADAPTER_JSON = "json_protocol"     # schemas in the prompt, JSON envelope back

DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-4-5"
DEFAULT_EMERGENT_PROVIDER = "anthropic"
DEFAULT_EMERGENT_MODEL = "claude-sonnet-4-5"


@dataclass(frozen=True)
class ProviderBinding:
    """One resolved way to reach a model."""

    name: str              # "anthropic" | "emergent"
    adapter: str           # ADAPTER_NATIVE | ADAPTER_JSON
    model: str
    api_key: str
    #: Only meaningful for the Emergent SDK, which takes (provider, model).
    upstream: Optional[str] = None

    @property
    def supports_native_tools(self) -> bool:
        return self.adapter == ADAPTER_NATIVE

    def fingerprint(self) -> str:
        """Masked key identity, for the diagnostic endpoint and the logs.

        Enough to tell two keys apart or confirm a rotation took effect;
        never enough to use. A revoked key looks identical to a live one from
        the outside, so being able to say *which* key is loaded is the
        difference between diagnosing that in a minute and in an afternoon.
        """
        if not self.api_key:
            return "none"
        return f"{self.api_key[:6]}…{self.api_key[-4:]} ({len(self.api_key)} chars)"


def _env(name: str) -> str:
    return (os.getenv(name) or "").strip()


def _pinned() -> Optional[str]:
    """An explicit choice, if anyone made one."""
    for var in ("ASSISTANT_PROVIDER", "TASCK_AI_PROVIDER"):
        value = _env(var).lower()
        if value in {"anthropic", "claude"}:
            return "anthropic"
        if value in {"emergent", "gemini"}:
            return "emergent"
    return None


def _anthropic_binding() -> Optional[ProviderBinding]:
    key = _env("ANTHROPIC_API_KEY")
    if not key:
        return None
    return ProviderBinding(
        name="anthropic",
        adapter=ADAPTER_NATIVE,
        model=_env("ASSISTANT_LLM_MODEL") or DEFAULT_ANTHROPIC_MODEL,
        api_key=key,
    )


def _emergent_binding() -> Optional[ProviderBinding]:
    key = _env("EMERGENT_LLM_KEY")
    if not key:
        return None
    return ProviderBinding(
        name="emergent",
        adapter=ADAPTER_JSON,
        model=_env("ASSISTANT_EMERGENT_MODEL") or DEFAULT_EMERGENT_MODEL,
        api_key=key,
        upstream=_env("ASSISTANT_EMERGENT_PROVIDER") or DEFAULT_EMERGENT_PROVIDER,
    )


def resolve_chain() -> List[ProviderBinding]:
    """Every usable provider, best first.

    Returned as a chain rather than a single choice so a key that is present
    but rejected - revoked, over quota, wrong project - falls through to the
    next provider instead of taking the assistant down. That is not
    hypothetical: a revoked ANTHROPIC_API_KEY is what broke this feature in
    production, and an anthropic-only chain is why it broke rather than
    degraded.
    """
    anthropic = _anthropic_binding()
    emergent = _emergent_binding()
    pin = _pinned()

    if pin == "anthropic":
        chain = [b for b in (anthropic, emergent) if b]
    elif pin == "emergent":
        chain = [b for b in (emergent, anthropic) if b]
    else:
        # No pin: a client's own key is the stronger signal of intent, so it
        # leads. This is what makes "paste the key and it works" true with no
        # other change.
        chain = [b for b in (anthropic, emergent) if b]

    if not chain:
        raise ProviderUnavailable(
            "No model provider is configured for the assistant.",
            hint=("Set ANTHROPIC_API_KEY to use Claude directly, or EMERGENT_LLM_KEY "
                  "to use the Emergent gateway. Either alone is enough."),
        )
    return chain


def describe_chain() -> List[dict]:
    """Masked provider status, for the diagnostic endpoint.

    Deliberately safe to expose: names, models, adapters and key fingerprints,
    never a key.
    """
    try:
        chain = resolve_chain()
    except ProviderUnavailable as exc:
        return [{"ok": False, "error": exc.message, "how_to_fix": exc.hint}]
    return [
        {
            "order": i,
            "provider": b.name,
            "model": b.model,
            "upstream": b.upstream,
            "adapter": b.adapter,
            "native_tool_calling": b.supports_native_tools,
            "key": b.fingerprint(),
        }
        for i, b in enumerate(chain)
    ]
