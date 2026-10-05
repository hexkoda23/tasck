"""The turn loop.

One admin message in, one reply plus a list of applied changes out. The loop is
bounded in three ways on purpose:

  * MAX_MODEL_CALLS caps a turn at four model calls, so a model that keeps
    correcting itself cannot spend an admin's afternoon;
  * MAX_CORRECTIONS caps retries after a *validation* failure, which is the
    recoverable kind;
  * the whole turn runs inside a timeout.

That last one is not theoretical. The assistant was the only AI endpoint in the
codebase with no timeout budget: it inherited `_anthropic_json_call`'s 180s
default while the browser gave up at 60s and Cloudflare at ~100s, so slow turns
surfaced as gateway errors on work that was still running.

One rule outranks all the others: A SAVED CHANGE ALWAYS REACHES THE CLIENT.
The Emergent log showed turns where the edits were written to Mongo and then
the closing "summarise what you did" call timed out - and because that call
was unguarded, its failure discarded the result. The admin saw an error for an
edit that had actually happened, and the page never refreshed to show it. Any
failure after a write now returns the write, with the failure alongside it.
"""
from __future__ import annotations

import asyncio
import json
import os
import re
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional

from . import execution, journal
from .errors import AssistantError, ConfirmationRequired, ValidationFailed
from .upstream import HINTS, MESSAGES, TIMEOUT, ActionNotSupported
from .prompts import (
    SECTION_REWRITE_SYSTEM,
    build_section_rewrite_prompt,
    build_system_prompt,
    build_user_message,
)
from .registry import CONFIRM_TIERS, Tier, registry
from .schemas import DOCUMENT_COLLECTIONS, table_columns
from .tools.session import resolve_route

MAX_MODEL_CALLS = 4
MAX_CORRECTIONS = 2
#: Sits above one full-length model call (client.PER_CALL_TIMEOUT, 40s) with
#: room for a correction round, and comfortably below the ~100s edge cap that
#: the rest of the codebase's AI jobs were moved to background polling to
#: avoid. A turn that runs out still returns anything it already saved.
DEFAULT_TIMEOUT_SECONDS = 70.0

#: Tools whose RESULT the model must read before it can act. After these the
#: loop goes round again. After anything else - an edit, a navigation - the
#: work is finished and there is nothing for another model call to do.
#:
#: This replaced an unconditional "one more call to summarise" after every
#: successful write. That call was the one timing out in the Emergent log: it
#: was fed a full copy of the document per edit, so a whole-page rewrite made
#: it enormous while a one-section edit kept it small - which is precisely why
#: only whole-page edits failed. It also doubled the latency of every edit.
FOLLOW_UP_TOOLS = frozenset({"find", "read_document"})

_FENCE = re.compile(r"^\s*```(?:json)?\s*|\s*```\s*$", re.I)


def turn_timeout() -> float:
    try:
        return max(5.0, float(os.getenv("ASSISTANT_TIMEOUT_SECONDS", "")
                              or DEFAULT_TIMEOUT_SECONDS))
    except ValueError:
        return DEFAULT_TIMEOUT_SECONDS


@dataclass
class Surface:
    """What the page the admin is on can offer the assistant."""

    label: str = ""
    document_kind: Optional[str] = None
    document_id: Optional[str] = None
    project_id: Optional[str] = None
    #: Tiers this surface permits. A page with no document should not be
    #: offering edit_section at all.
    allowed_tiers: tuple = (Tier.READ, Tier.CONTENT, Tier.RECORD, Tier.GENERATE,
                            Tier.OUTBOUND)
    recent_pages: List[str] = field(default_factory=list)
    pinned_sections: List[int] = field(default_factory=list)


@dataclass
class TurnResult:
    reply: str
    tool_calls: List[Dict[str, Any]] = field(default_factory=list)
    changes: List[Dict[str, Any]] = field(default_factory=list)
    document: Optional[Dict[str, Any]] = None
    navigate_to: Optional[str] = None
    pending_confirmation: Optional[Dict[str, Any]] = None
    model_calls: int = 0
    failures: List[str] = field(default_factory=list)
    #: An admin-facing failure, reported IN the response body rather than as an
    #: HTTP 5xx. A 5xx gives every proxy between here and the browser licence to
    #: swap our explanation for its own error page - which is how a clear
    #: "provider timed out" arrived on screen as Cloudflare's "origin is
    #: overloaded or misconfigured".
    error: Optional[Dict[str, Any]] = None
    #: Facts the admin must be told that the model could not have known when it
    #: wrote its reply - chiefly, which sections a rewrite had to skip. The
    #: model writes "made every section playful" BEFORE the rewrite runs, so if
    #: one section failed, the runtime has to say so or the reply is untrue.
    notes: List[str] = field(default_factory=list)
    #: Per-section outcome of a rewrite_document call, for the change card.
    rewrite_report: Optional[Dict[str, Any]] = None

    def as_response(self) -> Dict[str, Any]:
        return {
            "reply": self.reply,
            "tool_calls": self.tool_calls,
            "changes": self.changes,
            "document": self.document,
            "navigate_to": self.navigate_to,
            "pending_confirmation": self.pending_confirmation,
            "model_calls": self.model_calls,
            "failures": self.failures,
            "error": self.error,
            "notes": self.notes,
            "rewrite_report": self.rewrite_report,
        }

    def record_error(self, exc: AssistantError) -> None:
        self.error = {"code": exc.code, "message": exc.message, "hint": exc.hint,
                      "details": exc.details or {}}
        self.failures.append(exc.message)

    def settle_reply(self, fallback: str = "") -> None:
        """Make sure the admin is told what was actually saved."""
        if self.changes:
            saved = "; ".join(c.get("reason") or c.get("tool") or "change"
                              for c in self.changes)
            if self.error:
                self.reply = (f"I saved {len(self.changes)} change"
                              f"{'' if len(self.changes) == 1 else 's'} ({saved}), "
                              "but could not finish the rest. Use Undo if any of it "
                              "is wrong.")
            elif not self.reply:
                self.reply = f"Done - {saved}."
        elif not self.reply:
            self.reply = fallback
        if self.notes:
            self.reply = (self.reply + " " + " ".join(self.notes)).strip()


def parse_envelope(text: str) -> Dict[str, Any]:
    """Pull the JSON object out of a model reply.

    Tolerant of a markdown fence and of prose either side, because that is what
    text-only gateways produce in practice; strict about the result being an
    object, because everything downstream indexes into it.
    """
    if not (text or "").strip():
        raise ValidationFailed("The model returned an empty response.")
    cleaned = _FENCE.sub("", text.strip())
    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError:
        start, end = cleaned.find("{"), cleaned.rfind("}")
        if start == -1 or end <= start:
            raise ValidationFailed(
                "The model's reply was not JSON.",
                hint="Reply with one JSON object and nothing else.",
            ) from None
        try:
            parsed = json.loads(cleaned[start:end + 1])
        except json.JSONDecodeError as exc:
            raise ValidationFailed(
                f"The model's reply was not valid JSON: {exc}.",
                hint="Reply with one JSON object and nothing else.",
            ) from None
    if not isinstance(parsed, dict):
        raise ValidationFailed(
            f"Expected a JSON object, got {type(parsed).__name__}.",
            hint='Reply with {"reply": "...", "tool_calls": [...]}.',
        )
    parsed.setdefault("reply", "")
    calls = parsed.get("tool_calls") or []
    if not isinstance(calls, list):
        raise ValidationFailed(
            '"tool_calls" must be a list.',
            hint='Use [] when you are not calling any tool.',
        )
    parsed["tool_calls"] = calls
    return parsed


class AssistantRuntime:
    def __init__(self, db: Any, call_model: Callable[[str, str], Any]):
        self.db = db
        self.call_model = call_model

    # -- execution ---------------------------------------------------------
    async def _execute(self, name: str, args: Dict[str, Any], surface: Surface,
                       session_id: str, actor: str,
                       confirmed: bool, turn_id: Optional[str] = None) -> Dict[str, Any]:
        tool = registry.get(name)

        if tool.tier in CONFIRM_TIERS and not confirmed:
            raise ConfirmationRequired(
                f"{name} needs the admin to confirm before it runs.",
                hint="Tell the admin exactly what will happen and wait for them to approve.",
                details={"tool": name, "input": args},
            )

        if name == "find":
            rows = await execution.execute_find(self.db, args["entity"], args["query"],
                                                args.get("limit", 10))
            return {"ok": True, "matches": rows, "count": len(rows)}

        if name == "navigate":
            route = resolve_route(args["page"], args.get("project_id") or surface.project_id)
            return {"ok": True, "navigate_to": route, "page": args["page"]}

        if name == "read_document":
            doc = await execution.load_document(
                self.db, args["document"],
                args.get("document_id") or (surface.document_id
                                            if args["document"] == surface.document_kind
                                            else None),
                surface.project_id,
            )
            sections = execution.sections_of(doc)
            if "section_index" in args:
                index = args["section_index"]
                if index >= len(sections):
                    raise ValidationFailed(
                        f"Index {index} is out of range: that document has "
                        f"{len(sections)} sections (0-{max(len(sections) - 1, 0)}).",
                        hint="Read the whole document to see the current indices.",
                    )
                return {"ok": True, "title": doc.get("title"),
                        "section": {"index": index, **sections[index]}}
            return {"ok": True, "title": doc.get("title"),
                    "sections": [{"index": i, **s} for i, s in enumerate(sections)]}

        if name == "undo_last_change":
            summary = await journal.undo_last(self.db, session_id, DOCUMENT_COLLECTIONS)
            doc = await execution.load_document(self.db, summary["document_kind"],
                                                summary["document_id"])
            return {"ok": True, "undone": summary["tools"], "count": summary["count"],
                    "document": doc, "restored_reason": summary.get("reason")}

        if name in ("edit_section", "restructure_document"):
            kind = surface.document_kind
            if not kind:
                raise ValidationFailed(
                    "This page has no document open, so there is nothing to edit here.",
                    hint="Use navigate to open the page whose document you want to change.",
                )
            doc = await execution.load_document(self.db, kind, surface.document_id,
                                                surface.project_id)
            version = doc.get("last_edited_at")
            runner = (execution.execute_edit_section if name == "edit_section"
                      else execution.execute_restructure)
            fresh, before = await runner(self.db, kind, doc, args, expected_version=version)
            row = await journal.record_change(
                self.db, session_id=session_id, actor=actor, tool=name, arguments=args,
                document_kind=kind, document_id=doc["id"], before=before,
                after={"sections": fresh.get("sections"), "title": fresh.get("title")},
                reason=args["reason"], undoable=tool.undoable, turn_id=turn_id,
            )
            return {"ok": True, "document": fresh, "change_id": row["id"],
                    "sections": [{"index": i, "heading": s.get("heading"),
                                  "type": s.get("type")}
                                 for i, s in enumerate(fresh.get("sections") or [])]}

        if name == "rewrite_document":
            kind = surface.document_kind
            if not kind:
                raise ValidationFailed(
                    "This page has no document open, so there is nothing to rewrite here.",
                    hint="Use navigate to open the page whose document you want to change.",
                )
            doc = await execution.load_document(self.db, kind, surface.document_id,
                                                surface.project_id)
            fresh, before, report = await execution.execute_rewrite_document(
                self.db, kind, doc, args, self._rewrite_one)
            if not report["rewritten"]:
                reasons = sorted({s["why"] for s in report["skipped"]})
                raise RewriteFailed(
                    "None of the sections could be rewritten: " + "; ".join(reasons[:3]),
                    details=report,
                )
            row = await journal.record_change(
                self.db, session_id=session_id, actor=actor, tool=name, arguments=args,
                document_kind=kind, document_id=doc["id"], before=before,
                after={"sections": fresh.get("sections"), "title": fresh.get("title")},
                reason=args["reason"], undoable=tool.undoable, turn_id=turn_id,
            )
            return {"ok": True, "document": fresh, "change_id": row["id"],
                    "report": report,
                    "rewritten": len(report["rewritten"]),
                    "skipped": report["skipped"]}

        raise ActionNotSupported(name)

    async def _rewrite_one(self, section: Dict[str, Any], instruction: str,
                           include_headings: bool) -> Dict[str, Any]:
        """One section, one short model call. Provider errors propagate so the
        engine can record this section as skipped and carry on with the rest."""
        fields = execution.rewritable_fields(section)
        if include_headings:
            fields = ["heading"] + fields
        columns = table_columns(section) if "rows" in fields else None
        user = build_section_rewrite_prompt(section, instruction, fields, columns)
        raw = await self.call_model(SECTION_REWRITE_SYSTEM, user)
        return parse_object(raw)

    # -- the loop ----------------------------------------------------------
    async def run_turn(self, *, message: str, history: List[Dict[str, Any]],
                       surface: Surface, session_id: str, actor: str = "admin",
                       document_context: str = "",
                       confirmed_tool: Optional[str] = None) -> TurnResult:
        # The result lives out here so that if the turn runs out of time, what
        # it already saved is still in hand to return.
        result = TurnResult(reply="")
        # Every change this turn makes is stamped with one id, so one Undo takes
        # back the whole of what the admin asked for rather than its last step.
        turn_id = journal.new_turn_id()
        try:
            await asyncio.wait_for(
                self._run_turn(result, message=message, history=history,
                               surface=surface, session_id=session_id, actor=actor,
                               document_context=document_context,
                               confirmed_tool=confirmed_tool, turn_id=turn_id),
                timeout=turn_timeout(),
            )
        except asyncio.TimeoutError:
            result.error = {"code": TIMEOUT, "message": MESSAGES[TIMEOUT],
                            "hint": HINTS[TIMEOUT], "details": {}}
            result.failures.append(MESSAGES[TIMEOUT])
        result.settle_reply(fallback="")
        return result

    async def _ask(self, result: TurnResult, system: str, user: str) -> Optional[str]:
        """One model call. Provider failures land on the result, never escape."""
        try:
            raw = await self.call_model(system, user)
        except AssistantError as exc:
            result.record_error(exc)
            return None
        result.model_calls += 1
        return raw

    async def _run_turn(self, result: TurnResult, *, message: str,
                        history: List[Dict[str, Any]], surface: Surface,
                        session_id: str, actor: str, document_context: str,
                        confirmed_tool: Optional[str], turn_id: Optional[str] = None) -> None:
        tools = registry.for_tiers(surface.allowed_tiers)
        system = build_system_prompt(
            tools=tools, surface_label=surface.label,
            document_context=document_context or None,
            document_kind=surface.document_kind,
            recent_pages=surface.recent_pages,
        )
        tool_results: List[Dict[str, Any]] = []
        corrections = 0

        while result.model_calls < MAX_MODEL_CALLS:
            raw = await self._ask(result, system,
                                  build_user_message(history, message, tool_results or None))
            if raw is None:
                return  # provider failed; anything already saved is on `result`

            try:
                envelope = parse_envelope(raw)
            except ValidationFailed as exc:
                corrections += 1
                if corrections > MAX_CORRECTIONS:
                    result.reply = result.reply or (
                        "I could not produce a usable answer for that. Please rephrase, "
                        "or make the change on the page.")
                    result.failures.append(exc.message)
                    return
                tool_results = [exc.as_tool_result()]
                continue

            reply = str(envelope.get("reply") or "").strip()
            if reply:
                result.reply = reply
            calls = envelope["tool_calls"]
            if not calls:
                return

            # Whether the admin has already approved is the runtime's fact, not
            # the model's claim; `needs_confirmation` in the envelope only
            # affects what we say, never whether a tool runs.
            # Calls in one reply are independent - the model cannot use one
            # call's result in another call of the same reply - so a failure no
            # longer stops the rest. It used to: in a whole-page edit the first
            # rejected section blocked every section after it.
            outcomes: List[Dict[str, Any]] = []
            retryable_failure = False
            final_failure = False
            needs_follow_up = False
            for call in calls:
                name = str((call or {}).get("name") or "")
                args = (call or {}).get("input") or {}
                try:
                    registry.validate(name, args)
                    outcome = await self._execute(
                        name, args, surface, session_id, actor,
                        confirmed=(confirmed_tool == name), turn_id=turn_id,
                    )
                except ConfirmationRequired as exc:
                    # A gate, not a failure: stop and ask. Nothing after it runs,
                    # because the admin may decline.
                    result.pending_confirmation = {"tool": name, "input": args,
                                                   "message": exc.message}
                    return
                except AssistantError as exc:
                    outcomes.append({"tool": name, **exc.as_tool_result()})
                    result.failures.append(f"{name}: {exc.message}")
                    if exc.retryable:
                        retryable_failure = True
                    else:
                        final_failure = True
                        result.error = {"code": exc.code, "message": exc.message,
                                        "hint": exc.hint, "details": exc.details or {}}
                    continue

                result.tool_calls.append({"name": name, "input": args})
                if outcome.get("document"):
                    result.document = outcome["document"]
                if outcome.get("change_id"):
                    result.changes.append({"id": outcome["change_id"], "tool": name,
                                           "reason": args.get("reason")})
                if outcome.get("navigate_to"):
                    result.navigate_to = outcome["navigate_to"]
                if outcome.get("report"):
                    result.rewrite_report = outcome["report"]
                    skipped = outcome["report"].get("skipped") or []
                    if skipped:
                        done = len(outcome["report"].get("rewritten") or [])
                        names = ", ".join(f"'{s.get('heading')}'" for s in skipped[:3])
                        result.notes.append(
                            f"Rewrote {done} of {done + len(skipped)} sections; "
                            f"left {names}{' and others' if len(skipped) > 3 else ''} "
                            "unchanged.")
                if name in FOLLOW_UP_TOOLS:
                    needs_follow_up = True
                outcomes.append({"tool": name, **_for_model(outcome)})

            tool_results = outcomes
            if retryable_failure:
                corrections += 1
                if corrections > MAX_CORRECTIONS:
                    if not result.changes:
                        result.reply = "I could not complete that. " + "; ".join(result.failures)
                    return
                continue  # the model sees which calls landed and redoes only the rest
            if final_failure:
                return  # retrying cannot fix a non-retryable failure

            if not needs_follow_up:
                return  # the work is done and saved; there is nothing left to ask
        return


def _for_model(outcome: Dict[str, Any]) -> Dict[str, Any]:
    """What goes back into the prompt after a tool runs.

    The full document stays out. The page already receives it through
    TurnResult.document; the model only needs to know the write landed and
    where the sections now sit. Sending the whole thing back once per edit is
    what made the follow-up prompt for a whole-page rewrite large enough to run
    past the timeout. read_document is the exception - returning content is
    its entire purpose - and it carries `sections`, not `document`, so it is
    untouched here.
    """
    return {k: v for k, v in outcome.items() if k not in ("document", "report")}


class RewriteFailed(AssistantError):
    """rewrite_document produced nothing it could safely save.

    Not retryable: asking the model to fan out the whole document again would
    spend the rest of the turn repeating whatever just failed.
    """

    code = "rewrite_failed"
    retryable = False


def parse_object(text: str) -> Dict[str, Any]:
    """A bare JSON object from a model reply (no envelope required)."""
    if not (text or "").strip():
        raise ValidationFailed("The model returned an empty rewrite.")
    cleaned = _FENCE.sub("", text.strip())
    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError:
        start, end = cleaned.find("{"), cleaned.rfind("}")
        if start == -1 or end <= start:
            raise ValidationFailed("The rewrite was not JSON.") from None
        try:
            parsed = json.loads(cleaned[start:end + 1])
        except json.JSONDecodeError as exc:
            raise ValidationFailed(f"The rewrite was not valid JSON: {exc}.") from None
    if not isinstance(parsed, dict):
        raise ValidationFailed(f"The rewrite was a {type(parsed).__name__}, not an object.")
    return parsed
