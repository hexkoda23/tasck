"""Safe, actionable errors for the TASCK Copilot chat endpoint.

Provider response bodies can contain implementation details (and occasionally
request metadata), so this module deliberately maps them to messages that are
useful to an administrator without passing the raw response through the API.
"""

from dataclasses import asdict, dataclass
from typing import Optional


@dataclass(frozen=True)
class ChatError:
    status_code: int
    code: str
    message: str

    def as_response(self) -> dict:
        return {"error": asdict(self)}


def chat_error_for(status_code: Optional[int], provider_detail: str = "") -> ChatError:
    """Translate a provider or route failure into the chat API contract."""
    status = int(status_code or 500)
    detail = provider_detail.lower()

    # Anthropic has historically returned some spend-cap failures as 400s.
    # Treat the diagnostic text as authoritative so billing failures do not
    # masquerade as malformed-chat-request errors.
    if status == 429 or any(term in detail for term in (
        "billing", "credit", "quota", "rate limit", "usage limit", "balance",
        "too many requests",
    )):
        return ChatError(
            429,
            "api_quota_exceeded",
            "API Quota Exceeded: The Anthropic API balance or usage limit has been reached. "
            "Please update billing/credits in the console.",
        )

    if status == 404:
        return ChatError(
            404,
            "action_not_supported",
            "Action Not Supported: The requested route or backend action endpoint is missing "
            "or improperly configured.",
        )

    if status in (401, 403):
        return ChatError(
            401,
            "api_authentication_failed",
            "API Authentication Failed: The Anthropic API key is missing, expired, or invalid. "
            "Verify ANTHROPIC_API_KEY and try again.",
        )

    if status == 400:
        return ChatError(
            400,
            "bad_request",
            "Chat Request Rejected: The request may exceed the model context window or contain "
            "malformed data. Review the message and try again.",
        )

    if status in (500, 502, 503, 504, 529):
        return ChatError(
            503,
            "ai_service_unavailable",
            "AI Service Unavailable: Anthropic is temporarily unavailable or returned a server error. "
            "Please try again shortly.",
        )

    return ChatError(
        500,
        "chat_request_failed",
        "Chat Request Failed: The assistant could not complete this request. Please try again.",
    )
