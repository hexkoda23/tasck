"""Read tools.

These exist so the model stops guessing. `find` resolves a name the admin used
into an id; `read_document` gets the current truth when the prompt context is
stale or was shortened to fit the budget. Both are Tier.READ: no journal row, no
confirmation, cheap enough that the model should prefer calling one over
assuming.
"""
from __future__ import annotations

from ..registry import Tier, Tool, registry
from ..schemas import DOCUMENT_KINDS, ENTITY_KINDS, optional_id_property

FIND = Tool(
    name="find",
    tier=Tier.READ,
    see_also=("read_document",),
    description=(
        "Search TASCK records by name or keyword and return their ids. Use this whenever "
        "the admin names something - 'the NNPC project', 'Dangote' - and you do not "
        "already have its id. Always call this BEFORE any tool that needs an id you were "
        "not given, rather than guessing one. Do NOT use it to read the document open on "
        "the admin's page: that is read_document, which is cheaper and always current."
    ),
    input_schema={
        "type": "object",
        "properties": {
            "entity": {
                "type": "string",
                "enum": ENTITY_KINDS,
                "description": (
                    "Which kind of record to search. 'project' is what the admin portal "
                    "calls a business case."
                ),
            },
            "query": {
                "type": "string",
                "minLength": 2,
                "description": (
                    "Name or keyword, in the admin's own words. Do not add search terms "
                    "they did not use - extra words narrow the search and lose the match."
                ),
            },
            "limit": {
                "type": "integer",
                "minimum": 1,
                "maximum": 25,
                "default": 10,
                "description": (
                    "How many matches to return. Leave at the default unless the admin "
                    "asked for a broad list."
                ),
            },
        },
        "required": ["entity", "query"],
        "additionalProperties": False,
    },
)

READ_DOCUMENT = Tool(
    name="read_document",
    tier=Tier.READ,
    see_also=("find", "edit_section"),
    description=(
        "Read a document's current title and all of its sections - each with its 0-based "
        "index, type and full content - straight from the database. Call this when a "
        "section's body was shortened in your context, when you are unsure an index is "
        "still correct, or when a write was rejected as out of date. The page context you "
        "were given can be stale if someone else edited the document; this is always "
        "current. Use find first if you need an id you do not have, and edit_section "
        "afterwards to make the change - reading alone never alters anything."
    ),
    input_schema={
        "type": "object",
        "properties": {
            "document": {
                "type": "string",
                "enum": DOCUMENT_KINDS,
                "description": "Which document type to read.",
            },
            "document_id": optional_id_property("document"),
            "section_index": {
                "type": "integer",
                "minimum": 0,
                "description": (
                    "Read just this one section in full instead of the whole document. "
                    "Prefer this when you already know which section you need - it is "
                    "much cheaper than pulling every section."
                ),
            },
        },
        "required": ["document"],
        "additionalProperties": False,
    },
)

registry.register(FIND)
registry.register(READ_DOCUMENT)
