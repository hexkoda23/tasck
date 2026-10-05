"""Errors the model is expected to read and correct itself from.

Every message here is written for two audiences: the admin, who may see it in
the widget, and the model, which gets it back as a tool result and is asked to
retry. That means each message must say what was wrong AND what to do instead -
"index 9 is out of range" leaves the model guessing; "index 9 is out of range,
the document has 6 sections (0-5); call read_document if you are unsure" does
not.
"""
from __future__ import annotations

from typing import Any, Dict, Optional


class AssistantError(Exception):
    """Base for everything raised inside the assistant module."""

    code = "assistant_error"
    retryable = False

    def __init__(self, message: str, *, hint: Optional[str] = None,
                 details: Optional[Dict[str, Any]] = None):
        super().__init__(message)
        self.message = message
        self.hint = hint
        self.details = details or {}

    def as_tool_result(self) -> Dict[str, Any]:
        """The shape fed back to the model when a call fails."""
        payload: Dict[str, Any] = {
            "ok": False,
            "error": self.code,
            "message": self.message,
            "retryable": self.retryable,
        }
        if self.hint:
            payload["how_to_fix"] = self.hint
        if self.details:
            payload["details"] = self.details
        return payload


class ToolNotFound(AssistantError):
    code = "tool_not_found"
    retryable = True


class SchemaViolation(AssistantError):
    """Arguments did not match the tool's declared input schema."""

    code = "schema_violation"
    retryable = True


class ValidationFailed(AssistantError):
    """Arguments were well-formed but wrong about the world.

    An out-of-range index, a field that does not apply to this section's type,
    a record field outside the whitelist. The model can fix these by reading
    the document again and retrying.
    """

    code = "validation_failed"
    retryable = True


class StaleDocument(AssistantError):
    """Someone else changed the document since the model read it.

    Always retryable: the model is told to call read_document and reapply.
    Never silently overwrite - a human editing the same page outranks us.
    """

    code = "stale_document"
    retryable = True

    def __init__(self, message: str = "The document changed since you last read it.",
                 **kwargs: Any):
        kwargs.setdefault(
            "hint",
            "Call read_document to get the current sections, then reapply your change "
            "to the new indices. Do not assume your earlier view is still accurate.",
        )
        super().__init__(message, **kwargs)


class ConfirmationRequired(AssistantError):
    """A tier-3/4 tool was called without the admin having confirmed.

    Enforced by the runtime, never trusted to the model: a tool that spends
    money or sends an email must not run because the model set a flag.
    """

    code = "confirmation_required"
    retryable = False


class NotUndoable(AssistantError):
    """Asked to undo something that cannot be taken back.

    Sent email, recorded approval, closed project. Saying so plainly is better
    than a vague failure, because the admin needs to know the action stands.
    """

    code = "not_undoable"
    retryable = False


class ProviderUnavailable(AssistantError):
    """No usable model provider is configured, or every one of them failed."""

    code = "provider_unavailable"
    retryable = False
