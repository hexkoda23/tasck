"""Talking to whichever model is configured.

Self-contained on purpose: this module does not import v3_routes, so the
assistant package stays independent of the 1.2 MB route file and can be tested,
moved or replaced on its own.

Both paths return raw text. Parsing is the runtime's job, because a text-only
gateway and a native tool-use response need the same envelope handling either
way, and keeping that in one place means one set of tests for it.
"""
from __future__ import annotations

import asyncio
import logging
from typing import Any, Dict, List, Optional, Tuple

import requests

from .errors import ProviderUnavailable
from .providers import ProviderBinding, resolve_chain
from .upstream import UpstreamError, breaker_key, is_tripped, summarise, trip

logger = logging.getLogger(__name__)

ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"
ANTHROPIC_VERSION = "2023-06-01"
#: Only the direct Anthropic path sends this; the Emergent SDK takes no
#: output limit, so on the gateway the timeout is the only ceiling. Sized for
#: a whole-document rewrite: the generators that WRITE these documents in
#: v3_routes are given 16,000 tokens, and a rewrite outputs about as much text
#: as the document holds.
MAX_TOKENS = 8000
TEMPERATURE = 0.2

#: Per-provider ceiling, sized from the Emergent log rather than guessed. Every
#: call that timed out at the old 18s went on to COMPLETE successfully 24-29s
#: after it started - the work finished, nobody was still waiting for it. 40s
#: clears the observed worst case with margin while staying well inside the
#: turn budget and the ~100s edge cap.
PER_CALL_TIMEOUT = 40.0


def _anthropic_sync(binding: ProviderBinding, system: str, user: str) -> str:
    response = requests.post(
        ANTHROPIC_URL,
        headers={"x-api-key": binding.api_key,
                 "anthropic-version": ANTHROPIC_VERSION,
                 "content-type": "application/json"},
        json={"model": binding.model, "max_tokens": MAX_TOKENS,
              "temperature": TEMPERATURE, "system": system,
              "messages": [{"role": "user", "content": user}]},
        timeout=PER_CALL_TIMEOUT,
    )
    if response.status_code >= 400:
        # Keep the status AND the body: the body's error.type and message are
        # what tell a billing failure from a malformed request.
        raise UpstreamError("anthropic", status=response.status_code,
                            body=response.text or "")
    data = response.json()
    if data.get("stop_reason") == "max_tokens":
        # A truncated reply is not a reply. Handing it to the JSON parser used
        # to trigger "correction" rounds that regenerated the same over-long
        # output up to three times before giving up.
        raise UpstreamError(
            "anthropic", status=400,
            detail=f"the reply hit the {MAX_TOKENS}-token output limit and was cut off",
            body='{"error":{"type":"request_too_large"}}',
        )
    return "\n".join(part.get("text", "") for part in data.get("content", [])
                     if part.get("type") == "text")


def _emergent_sync(binding: ProviderBinding, system: str, user: str,
                   session_id: str) -> str:
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
    except Exception as exc:  # noqa: BLE001
        raise RuntimeError(f"emergentintegrations unavailable: "
                           f"{type(exc).__name__}: {exc}") from exc

    chat = LlmChat(api_key=binding.api_key, session_id=session_id,
                   system_message=system).with_model(binding.upstream, binding.model)
    result = chat.send_message(UserMessage(text=user))
    if asyncio.iscoroutine(result):
        # send_message is a coroutine but we are already on a worker thread, so
        # it gets its own loop rather than touching the server's.
        loop = asyncio.new_event_loop()
        try:
            result = loop.run_until_complete(result)
        finally:
            loop.close()
    if isinstance(result, str):
        return result
    for attr in ("text", "content", "message"):
        value = getattr(result, attr, None)
        if isinstance(value, str):
            return value
    return str(result)


async def call_one(binding: ProviderBinding, system: str, user: str,
                   session_id: str = "assistant") -> str:
    """One attempt against one provider. Raises so the chain can move on."""
    if binding.name == "anthropic":
        worker, args = _anthropic_sync, (binding, system, user)
    else:
        worker, args = _emergent_sync, (binding, system, user, session_id)
    # to_thread: both SDKs are blocking, and blocking the event loop would stall
    # every other request on this single-worker container.
    return await asyncio.wait_for(asyncio.to_thread(worker, *args),
                                  timeout=PER_CALL_TIMEOUT + 2)


def make_caller(session_id: str = "assistant") -> Tuple[Any, List[str]]:
    """Build the `call_model(system, user)` the runtime expects.

    Walks the resolved chain and returns the first usable answer. `failures`
    accumulates the real reason each provider declined - status code and body,
    import error, timeout - because "the assistant is unavailable" is not
    something anyone can act on.
    """
    failures: List[str] = []

    async def call_model(system: str, user: str) -> str:
        chain = resolve_chain()
        # Skip providers whose key failed on auth or billing within the
        # cool-off window - unless that would leave nothing to try, in which
        # case trying a probably-dead key beats refusing outright.
        live = [b for b in chain
                if not is_tripped(breaker_key(b.name, b.fingerprint()))] or chain

        errors: List[UpstreamError] = []
        for binding in live:
            key = breaker_key(binding.name, binding.fingerprint())
            try:
                text = await call_one(binding, system, user, session_id)
            except asyncio.TimeoutError:
                err = UpstreamError(binding.name, timed_out=True,
                                    detail=f"no answer within {PER_CALL_TIMEOUT:.0f}s")
            except UpstreamError as exc:
                err = exc
            except Exception as exc:  # noqa: BLE001
                # LiteLLM (under the Emergent SDK) raises its own exception types
                # but carries the HTTP status on them; keep it so a gateway 429
                # or 401 classifies the same way as a direct one.
                err = UpstreamError(binding.name,
                                    status=getattr(exc, "status_code", None),
                                    detail=f"{type(exc).__name__}: {exc}")
            else:
                if (text or "").strip():
                    return text
                err = UpstreamError(binding.name, detail="empty response")

            trip(key, err.kind)
            errors.append(err)
            failures.append(err.log_line())
            logger.warning("assistant: %s", err.log_line())

        worst = summarise(errors)
        if worst is None:
            raise ProviderUnavailable("No AI provider is configured for the assistant.")
        raise worst

    return call_model, failures
