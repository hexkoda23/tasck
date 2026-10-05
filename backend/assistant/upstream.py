"""Turning model-provider failures into something an admin can act on.

Two jobs:

1. CLASSIFY. A provider failure arrives as a status code, a JSON error body, a
   timeout or an exception. The admin needs one sentence saying what is wrong
   and who fixes it, not "anthropic:claude-sonnet-4-5 HTTP 400: {...}".

   Classification reads the MESSAGE before the status code, and that order is
   deliberate. Anthropic reports an exhausted credit balance as a 400
   `invalid_request_error` ("Your credit balance is too low..."), not a 429 -
   and the production outage recorded in v3_routes was exactly that: "400 You
   have reached your specified API usage limits". Mapping by status alone
   would have labelled the one billing failure this system has actually
   suffered as a malformed request.

2. CIRCUIT-BREAK. A key that returned 401 will return 401 on the next call
   too. The Emergent log showed every single model call paying for a round
   trip to a revoked ANTHROPIC_API_KEY before falling back to the gateway. A
   provider that fails on auth or billing is skipped for a cool-off period
   instead of being retried on every call.
"""
from __future__ import annotations

import json
import re
import time
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from .errors import AssistantError

# ---------------------------------------------------------------------------
# Admin-facing messages
# ---------------------------------------------------------------------------
# The first two are specified word for word by the product requirement.
QUOTA = "quota_exceeded"
NOT_SUPPORTED = "action_not_supported"
AUTH = "auth_failed"
BAD_REQUEST = "bad_request"
UPSTREAM_DOWN = "provider_down"
TIMEOUT = "timed_out"
UNKNOWN = "provider_error"

MESSAGES: Dict[str, str] = {
    QUOTA: ("API Quota Exceeded: The Anthropic API balance or usage limit has been "
            "reached. Please update billing/credits in the console."),
    NOT_SUPPORTED: ("Action Not Supported: The requested route or backend action "
                    "endpoint is missing or improperly configured."),
    AUTH: ("Authentication Failed: The AI provider rejected the API key - it is "
           "expired, revoked or incorrect. Update ANTHROPIC_API_KEY or "
           "EMERGENT_LLM_KEY in the server settings."),
    BAD_REQUEST: ("Request Rejected: The AI provider refused the request, usually "
                  "because it exceeded the model's context window or the payload was "
                  "malformed. Try a smaller request, such as one section at a time."),
    UPSTREAM_DOWN: ("AI Provider Unavailable: The AI service is down or overloaded. "
                    "This is outside TASCK - try again in a minute."),
    TIMEOUT: ("AI Provider Timed Out: The model took too long to answer. Try a "
              "smaller request, such as one section at a time."),
    UNKNOWN: ("AI Provider Error: The assistant could not reach a working AI "
              "provider. Check the server logs for details."),
}

#: Who can fix it - shown under the message so the admin knows whether to
#: retry, rephrase, or hand it to whoever holds the billing account.
HINTS: Dict[str, str] = {
    QUOTA: "An account owner needs to add credits or raise the usage limit.",
    NOT_SUPPORTED: "This action is not available from chat yet - make the change on the page.",
    AUTH: "Whoever manages the deployment needs to replace the key.",
    BAD_REQUEST: "Rephrase the request or break it into smaller steps.",
    UPSTREAM_DOWN: "No action needed on TASCK's side; retry shortly.",
    TIMEOUT: "Retry, or ask for a smaller change.",
    UNKNOWN: "GET /api/v3/assistant/diagnostics shows which providers are loaded.",
}

_QUOTA_WORDS = re.compile(
    r"credit balance|usage limit|quota|billing|insufficient.?funds|"
    r"rate.?limit|too many requests|exceeded your",
    re.I,
)

_TYPE_MAP = {
    "rate_limit_error": QUOTA,
    "authentication_error": AUTH,
    "permission_error": AUTH,
    "not_found_error": NOT_SUPPORTED,
    "invalid_request_error": BAD_REQUEST,
    "request_too_large": BAD_REQUEST,
    "api_error": UPSTREAM_DOWN,
    "overloaded_error": UPSTREAM_DOWN,
}


class UpstreamError(AssistantError):
    """A provider call failed. Carries what is needed to classify it."""

    code = "upstream_error"
    retryable = False

    def __init__(self, provider: str, *, status: Optional[int] = None,
                 body: str = "", timed_out: bool = False, detail: str = ""):
        self.provider = provider
        self.status = status
        self.body = body or ""
        self.timed_out = timed_out
        self.error_type = _error_type(self.body)
        self.provider_message = _provider_message(self.body) or detail
        self.kind = classify(status=status, error_type=self.error_type,
                             message=self.provider_message or self.body,
                             timed_out=timed_out)
        super().__init__(MESSAGES[self.kind], hint=HINTS[self.kind],
                         details={"provider": provider, "status": status,
                                  "error_type": self.error_type,
                                  "provider_message": (self.provider_message or "")[:300]})
        self.code = self.kind

    def log_line(self) -> str:
        bits = [self.provider]
        if self.status is not None:
            bits.append(f"HTTP {self.status}")
        if self.error_type:
            bits.append(self.error_type)
        if self.timed_out:
            bits.append("timed out")
        if self.provider_message:
            bits.append(self.provider_message[:200])
        return ": ".join(bits)


class ActionNotSupported(AssistantError):
    """A tool the model can see but that has no working handler behind it.

    Distinct from a hallucinated tool name, which the model can correct by
    choosing a real one: this tool exists in the catalogue and simply is not
    wired to an endpoint yet, so retrying cannot help and is not attempted.
    """

    code = NOT_SUPPORTED
    retryable = False

    def __init__(self, action: str):
        super().__init__(MESSAGES[NOT_SUPPORTED], hint=HINTS[NOT_SUPPORTED],
                         details={"action": action})


def _parse(body: str) -> Dict[str, Any]:
    try:
        data = json.loads(body)
        return data if isinstance(data, dict) else {}
    except (TypeError, ValueError):
        return {}


def _error_type(body: str) -> Optional[str]:
    error = _parse(body).get("error")
    if isinstance(error, dict):
        return error.get("type")
    return None


def _provider_message(body: str) -> Optional[str]:
    error = _parse(body).get("error")
    if isinstance(error, dict) and error.get("message"):
        return str(error["message"])
    return None


def classify(*, status: Optional[int] = None, error_type: Optional[str] = None,
             message: str = "", timed_out: bool = False) -> str:
    """Pick the admin-facing category. Message beats type beats status."""
    if timed_out:
        return TIMEOUT
    # Billing first, whatever the status says - see the module docstring.
    if message and _QUOTA_WORDS.search(message):
        return QUOTA
    if error_type in _TYPE_MAP:
        return _TYPE_MAP[error_type]
    if status == 429:
        return QUOTA
    if status == 404:
        return NOT_SUPPORTED
    if status in (401, 403):
        return AUTH
    if status in (400, 413, 422):
        return BAD_REQUEST
    if status is not None and (status >= 500 or status == 529):
        return UPSTREAM_DOWN
    return UNKNOWN


def summarise(errors: List[UpstreamError]) -> Optional[UpstreamError]:
    """The one failure worth leading with when several providers failed.

    The last provider tried is the one that actually decided the outcome -
    earlier ones were fallen back from - so it leads. Leading with an earlier
    auth failure would be misleading in exactly the deployment that prompted
    this: the Anthropic key is known to be revoked, and reporting "key
    rejected" on every request would bury the timeout that was really the
    problem. Earlier failures still travel in `details["also"]`, so a broken
    key is shown rather than silently skipped past.
    """
    if not errors:
        return None
    primary = errors[-1]
    also: List[str] = []
    for err in errors[:-1]:
        line = f"{err.provider}: {MESSAGES[err.kind]}"
        if line not in also:
            also.append(line)
    if also:
        primary.details["also"] = also
    return primary


# ---------------------------------------------------------------------------
# Circuit breaker
# ---------------------------------------------------------------------------
#: Seconds a provider is skipped after an auth or billing failure. Long enough
#: to stop paying a round trip per call; short enough that a fixed key is
#: picked up without a restart.
COOL_OFF_SECONDS = 600

#: Failures that will not fix themselves between one call and the next.
_TRIPPING = frozenset({AUTH, QUOTA})

_tripped: Dict[str, float] = {}


def breaker_key(provider: str, fingerprint: str) -> str:
    # Keyed on the fingerprint, so rotating in a new key is never skipped
    # because the old one was bad.
    return f"{provider}:{fingerprint}"


def trip(key: str, kind: str) -> None:
    if kind in _TRIPPING:
        _tripped[key] = time.monotonic() + COOL_OFF_SECONDS


def is_tripped(key: str) -> bool:
    until = _tripped.get(key)
    if until is None:
        return False
    if time.monotonic() >= until:
        _tripped.pop(key, None)
        return False
    return True


def reset_breaker() -> None:
    _tripped.clear()


def tripped_keys() -> List[str]:
    return [k for k in list(_tripped) if is_tripped(k)]
