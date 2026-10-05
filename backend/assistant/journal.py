"""The change journal, and undo.

Writing straight to Mongo removes the pre-approval gate, so the safety has to
come from the other side: every write records exactly what was there before, and
undo puts it back verbatim. `before` is stored rather than reconstructed because
a reconstructed undo is a guess, and a guess that silently half-restores a
document is worse than no undo at all.

Undo works on a TURN, not a row. One admin message can produce several changes
- a rename plus a reworded paragraph, say - and the admin thinks of that as one
action. Undoing only the last row of it would leave the document in a state the
admin never saw: half their request applied. So every row carries the turn it
came from, and undo restores the document to how it stood before that turn
began. (rewrite_document already saves as a single row; this is what makes
several edit_section calls in one turn behave the same way.)

Rows live in `v3_assistant_changes`.
"""
from __future__ import annotations

import itertools
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from .errors import NotUndoable, ValidationFailed

COLLECTION = "v3_assistant_changes"

#: Tie-breaker for rows written in the same instant. Undo restores the EARLIEST
#: row of a turn, and two edits a few milliseconds apart can share a timestamp
#: on a coarse clock - Windows commonly ticks at ~15ms - which would make
#: "earliest" a coin toss and undo a partial restore.
_SEQ = itertools.count()


def _order(row: Dict[str, Any]) -> tuple:
    return (row.get("at") or "", row.get("seq") or 0)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_turn_id() -> str:
    return f"turn-{uuid.uuid4().hex[:10]}"


async def record_change(
    db: Any,
    *,
    session_id: str,
    actor: str,
    tool: str,
    arguments: Dict[str, Any],
    document_kind: str,
    document_id: str,
    before: Dict[str, Any],
    after: Dict[str, Any],
    reason: str,
    undoable: bool = True,
    turn_id: Optional[str] = None,
) -> Dict[str, Any]:
    row = {
        "id": f"chg-{uuid.uuid4().hex[:8]}",
        "at": _now(),
        "seq": next(_SEQ),
        "session_id": session_id,
        # A row with no turn is its own turn, so older rows still undo cleanly.
        "turn_id": turn_id or f"turn-solo-{uuid.uuid4().hex[:8]}",
        "actor": actor or "admin",
        "tool": tool,
        "input": arguments,
        "document_kind": document_kind,
        "document_id": document_id,
        "before": before,
        "after": after,
        "reason": reason,
        "undoable": undoable,
        "undone_at": None,
    }
    await db[COLLECTION].insert_one({**row})
    return row


async def list_changes(db: Any, session_id: str, limit: int = 50) -> List[Dict[str, Any]]:
    cursor = db[COLLECTION].find({"session_id": session_id}, {"_id": 0})
    return await cursor.sort("at", -1).to_list(limit)


async def last_turn(db: Any, session_id: str) -> List[Dict[str, Any]]:
    """Every not-yet-undone row of the most recent turn, oldest first."""
    rows = sorted((r for r in await list_changes(db, session_id, limit=200)
                   if not r.get("undone_at")), key=_order, reverse=True)
    if not rows:
        return []
    turn = rows[0].get("turn_id")
    return sorted((r for r in rows if r.get("turn_id") == turn), key=_order)


async def undo_last(db: Any, session_id: str,
                    collections: Dict[str, str]) -> Dict[str, Any]:
    """Restore every document the most recent turn changed.

    Returns a summary: which turn, how many changes, the reasons, and the
    documents touched. Refuses rather than pretends when the turn included
    something that cannot be taken back - a sent email, a recorded approval.
    The admin needs to know the action stands, not be told "done" about
    something that is still out in the world.
    """
    rows = await last_turn(db, session_id)
    if not rows:
        raise ValidationFailed(
            "There is nothing to undo in this conversation.",
            hint="Only changes made by the assistant in this session can be undone.",
        )
    blocked = [r for r in rows if not r.get("undoable", True)]
    if blocked:
        first = blocked[0]
        raise NotUndoable(
            f"The last action ({first['tool']}) cannot be undone: "
            f"{first.get('reason') or ''}".strip(),
            hint=("Emails that have been sent, approvals and stage changes are permanent. "
                  "Tell the admin plainly that it stands."),
        )

    # The EARLIEST row per document holds that document as it was before the
    # turn began; restoring it takes back every later change in the turn too.
    earliest: Dict[tuple, Dict[str, Any]] = {}
    for row in rows:
        key = (row["document_kind"], row["document_id"])
        earliest.setdefault(key, row)

    touched: List[Dict[str, str]] = []
    for (kind, document_id), row in earliest.items():
        collection = collections.get(kind)
        if not collection:
            raise ValidationFailed(f"Unknown document kind {kind!r}.")
        restore = dict(row["before"])
        restore["last_edited_at"] = _now()
        await db[collection].update_one({"id": document_id}, {"$set": restore})
        touched.append({"document_kind": kind, "document_id": document_id})

    stamp = _now()
    for row in rows:
        await db[COLLECTION].update_one({"id": row["id"]}, {"$set": {"undone_at": stamp}})

    return {
        "turn_id": rows[0].get("turn_id"),
        "count": len(rows),
        "tools": [r["tool"] for r in rows],
        "reasons": [r.get("reason") for r in rows],
        "documents": touched,
        # Kept for callers written against the single-row version.
        "tool": rows[-1]["tool"],
        "reason": rows[-1].get("reason"),
        "document_kind": rows[-1]["document_kind"],
        "document_id": rows[-1]["document_id"],
    }
