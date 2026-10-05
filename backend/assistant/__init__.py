"""TASCK assistant: a tool-calling agent for the admin portal.

Full specification: docs/ASSISTANT_AGENT_SPEC.md

Mounted by server.py as `make_assistant_router(db)` under /api/v3/assistant.
"""
from __future__ import annotations

import asyncio
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from .context import build_document_context
from .errors import AssistantError
from .registry import Tier, Tool, ToolRegistry, registry
from .tools import documents, lookup, session as session_tools, workflow  # noqa: F401

__all__ = ["Tier", "Tool", "ToolRegistry", "registry", "make_assistant_router"]

#: Which tiers a surface may use. A page with no document must not be offered
#: edit_section at all - a tool the model cannot successfully use is a tool it
#: will waste a turn on.
SURFACE_TIERS = {
    "document": (Tier.READ, Tier.CONTENT, Tier.RECORD, Tier.GENERATE, Tier.OUTBOUND),
    "record": (Tier.READ, Tier.RECORD, Tier.GENERATE, Tier.OUTBOUND),
    "readonly": (Tier.READ,),
}


class ChatMessage(BaseModel):
    role: str
    text: str


class ChatPayload(BaseModel):
    message: str
    session_id: str = "default"
    history: List[ChatMessage] = Field(default_factory=list)
    # Where the admin is. Sent by the page, not guessed.
    surface_label: str = ""
    surface_mode: str = "readonly"
    document_kind: Optional[str] = None
    document_id: Optional[str] = None
    project_id: Optional[str] = None
    recent_pages: List[str] = Field(default_factory=list)
    pinned_sections: List[int] = Field(default_factory=list)
    #: Set by the widget when the admin approves a pending confirmation.
    confirmed_tool: Optional[str] = None
    actor: str = "admin"


class UndoPayload(BaseModel):
    # Module level, not inside make_assistant_router: with `from __future__
    # import annotations` FastAPI resolves type hints by name from module
    # globals, and a model defined inside the factory cannot be found - the
    # parameter silently becomes a required QUERY field and every call 422s.
    session_id: str


def make_assistant_router(db: Any) -> APIRouter:
    from . import execution, journal
    from .client import make_caller
    from .runtime import AssistantRuntime, Surface
    from .schemas import DOCUMENT_COLLECTIONS

    router = APIRouter(prefix="/api/v3/assistant", tags=["assistant"])

    @router.get("/diagnostics")
    async def diagnostics():
        """Which provider answers, which model, and whether tools go native.

        Deliberately exposed: when the assistant misbehaves the first question
        is always "which key is loaded", and guessing at that is what turned a
        revoked key into a multi-day outage. Keys are fingerprinted, never shown.
        """
        from .providers import describe_chain
        return {
            "providers": describe_chain(),
            "tools": [
                {"name": t.name, "tier": t.tier.value,
                 "needs_confirmation": t.needs_confirmation, "undoable": t.undoable}
                for t in registry.all()
            ],
            "tool_count": len(registry),
        }

    @router.get("/changes")
    async def changes(session_id: str, limit: int = 50):
        return await journal.list_changes(db, session_id, limit)

    @router.post("/undo")
    async def undo(payload: UndoPayload):
        """Take back the most recent turn, directly.

        The Undo button used to send "Undo that last change." through the chat,
        which spent a model call - and the provider's latency, and its chance
        of failing - on something with exactly one correct meaning. Undo is
        deterministic, so it goes straight to the journal. Returns the restored
        document so the page updates in place, and reports failures in the
        body like /chat does.
        """
        try:
            summary = await journal.undo_last(db, payload.session_id, DOCUMENT_COLLECTIONS)
            document = await execution.load_document(
                db, summary["document_kind"], summary["document_id"])
        except AssistantError as exc:
            return {"ok": False, "document": None,
                    "error": {"code": exc.code, "message": exc.message,
                              "hint": exc.hint, "details": exc.details or {}}}
        count = summary["count"]
        return {
            "ok": True,
            "document": document,
            "count": count,
            "reply": ("Undone - the document is back to how it was before that change."
                      if count == 1 else
                      f"Undone - all {count} changes from that request were reverted."),
            "error": None,
        }

    @router.post("/chat")
    async def chat(payload: ChatPayload):
        message = (payload.message or "").strip()
        if not message:
            raise HTTPException(422, "message is required")

        tiers = SURFACE_TIERS.get(payload.surface_mode, SURFACE_TIERS["readonly"])
        surface = Surface(
            label=payload.surface_label,
            document_kind=payload.document_kind,
            document_id=payload.document_id,
            project_id=payload.project_id,
            allowed_tiers=tiers,
            recent_pages=list(payload.recent_pages),
            pinned_sections=list(payload.pinned_sections),
        )

        # The document goes into the prompt from the database, not from whatever
        # the browser last rendered, so the model and the page cannot disagree.
        document_context = ""
        if surface.document_kind:
            try:
                doc = await execution.load_document(
                    db, surface.document_kind, surface.document_id, surface.project_id)
                surface.document_id = doc.get("id")
                document_context = build_document_context(
                    execution.sections_of(doc), message,
                    pinned=surface.pinned_sections,
                    document_title=doc.get("title"),
                )["text"]
            except AssistantError:
                document_context = ""  # answer without it rather than failing the turn

        call_model, failures = make_caller(payload.session_id)
        runtime = AssistantRuntime(db, call_model)
        # Failures come back IN the body with HTTP 200, not as a 5xx. A 5xx lets
        # every proxy between here and the browser replace our explanation with
        # its own page - on Emergent that turned "the model timed out" into
        # Cloudflare's "origin is overloaded or misconfigured". It also keeps
        # partial success expressible: a turn that saved three edits and then
        # failed must still deliver those edits to the page.
        try:
            result = await runtime.run_turn(
                message=message,
                history=[turn.model_dump() for turn in payload.history],
                surface=surface, session_id=payload.session_id, actor=payload.actor,
                document_context=document_context,
                confirmed_tool=payload.confirmed_tool,
            )
        except AssistantError as exc:  # safety net; run_turn reports its own
            return {"reply": "", "tool_calls": [], "changes": [], "document": None,
                    "navigate_to": None, "pending_confirmation": None, "model_calls": 0,
                    "failures": [exc.message], "provider_failures": failures,
                    "error": {"code": exc.code, "message": exc.message,
                              "hint": exc.hint, "details": exc.details or {}}}

        response = result.as_response()
        response["provider_failures"] = failures
        return response

    return router
