"""Phase 3: record edits, generation, and the things that leave the building.

Everything here that costs money or cannot be taken back is Tier.GENERATE or
Tier.OUTBOUND, which the runtime refuses to execute without a human
confirmation. That refusal is enforced by tier, not by the model setting a flag
— a tool that emails a brand must never run because a model said it was fine.
"""
from __future__ import annotations

from ..registry import Tier, Tool, registry
from ..schemas import (
    DOCUMENT_KINDS,
    REASON_PROPERTY,
    RECORD_KINDS,
    optional_id_property,
    record_fields_sentence,
)

UPDATE_RECORD = Tool(
    name="update_record",
    tier=Tier.RECORD,
    see_also=("edit_section", "find"),
    description=(
        "Change structured database fields on a project, brand, deliverable or invoice, "
        "and save immediately. These are record fields, not document text - to change "
        "anything inside a document, including a heading, use edit_section instead. "
        "Only the fields listed below are accepted and anything else is rejected, so "
        "check the list before calling. Use find first if you need an id you do not "
        "have. " + record_fields_sentence()
    ),
    input_schema={
        "type": "object",
        "properties": {
            "record": {
                "type": "string",
                "enum": RECORD_KINDS,
                "description": "Which kind of record to change.",
            },
            "record_id": optional_id_property("record"),
            "fields": {
                "type": "object",
                "minProperties": 1,
                "description": (
                    record_fields_sentence()
                    + " Money is a plain number in naira with no symbol or separators. "
                    "Dates are YYYY-MM-DD."
                ),
            },
            "reason": REASON_PROPERTY,
        },
        "required": ["record", "fields", "reason"],
        "additionalProperties": False,
    },
)

GENERATE_DOCUMENT = Tool(
    name="generate_document",
    tier=Tier.GENERATE,
    see_also=("edit_section", "restructure_document"),
    description=(
        "Run TASCK's AI generation to build a whole document from scratch. This costs "
        "money, takes 30-90 seconds, and OVERWRITES any existing draft of that document. "
        "Always describe what will be replaced before the admin confirms. Never reach for "
        "this to make a small change - use edit_section for wording and "
        "restructure_document for adding or removing sections."
    ),
    input_schema={
        "type": "object",
        "properties": {
            "document": {
                "type": "string",
                "enum": DOCUMENT_KINDS + ["creator_matches", "meeting_questions"],
                "description": "Which document to generate.",
            },
            "project_id": optional_id_property("project"),
            "reason": REASON_PROPERTY,
        },
        "required": ["document", "reason"],
        "additionalProperties": False,
    },
)

SEND_DOCUMENT = Tool(
    name="send_document",
    tier=Tier.OUTBOUND,
    see_also=("read_document", "approve_document"),
    description=(
        "Email a document to the brand or to the creator. This leaves TASCK and CANNOT be "
        "undone. State the document, the recipient and the email address in your reply so "
        "the admin can check all three before approving. The brand and the creator receive "
        "DIFFERENT documents - never send one party the other's. Use read_document first "
        "if you are not certain the content is final, and approve_document when the admin "
        "wants to record approval rather than send anything."
    ),
    input_schema={
        "type": "object",
        "properties": {
            "document": {
                "type": "string",
                "enum": DOCUMENT_KINDS + ["feedback_form"],
                "description": "Which document to email.",
            },
            "audience": {
                "type": "string",
                "enum": ["brand", "creator"],
                "description": (
                    "Who receives it. For 'feedback_form' this also selects WHICH form: "
                    "brand gets the Brand Partner form, creator gets the Creative Partner "
                    "form. They are different documents and must never be swapped."
                ),
            },
            "to_email": {
                "type": "string",
                "description": (
                    "Omit to use the address on file for that party. Only pass this when "
                    "the admin gave you a specific address."
                ),
            },
            "reason": REASON_PROPERTY,
        },
        "required": ["document", "audience", "reason"],
        "additionalProperties": False,
    },
)

APPROVE_DOCUMENT = Tool(
    name="approve_document",
    tier=Tier.OUTBOUND,
    see_also=("send_document", "change_stage"),
    description=(
        "Record TASCK's approval of a document, which advances the workflow and may "
        "unlock later stages. This is permanent and cannot be undone from chat. Use "
        "send_document to email something instead, and change_stage to move the project "
        "as a whole."
    ),
    input_schema={
        "type": "object",
        "properties": {
            "document": {
                "type": "string",
                "enum": ["alignment_snapshot", "pitch_deck", "creative_snapshot",
                         "deliverables", "scope_change"],
                "description": "Which document to mark approved.",
            },
            "project_id": optional_id_property("project"),
            "reason": REASON_PROPERTY,
        },
        "required": ["document", "reason"],
        "additionalProperties": False,
    },
)

CHANGE_STAGE = Tool(
    name="change_stage",
    tier=Tier.OUTBOUND,
    see_also=("approve_document",),
    description=(
        "Move a project to the next workflow stage, or close it. Closing a project is "
        "permanent and cannot be undone. Name the current stage and the target stage in "
        "your reply so the admin can check before approving. To approve a single document "
        "rather than move the whole project, use approve_document."
    ),
    input_schema={
        "type": "object",
        "properties": {
            "action": {
                "type": "string",
                "enum": ["advance", "close"],
                "description": (
                    "'advance' moves to the next stage in order; 'close' ends the project "
                    "permanently."
                ),
            },
            "project_id": optional_id_property("project"),
            "reason": REASON_PROPERTY,
        },
        "required": ["action", "reason"],
        "additionalProperties": False,
    },
)

for _tool in (UPDATE_RECORD, GENERATE_DOCUMENT, SEND_DOCUMENT, APPROVE_DOCUMENT,
              CHANGE_STAGE):
    registry.register(_tool)
