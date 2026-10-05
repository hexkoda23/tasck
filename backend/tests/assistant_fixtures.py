"""A real alignment snapshot, section for section.

Every shape here is copied from how v3_routes builds an alignment snapshot
(see the section list around `"heading": "Desired Outcomes and Success
Metrics"`), not invented for convenience.

The first assistant test suite used a tidy fixture instead: a bullets section
with no narrative and a table whose rows were objects keyed by column name.
Everything passed - against a document shape this app never produces. Run
against the real shapes, three of five calls in a whole-page rewrite were
rejected: the narrative above every list and table was unreachable, and no cell
of any real table could be edited, because real rows are plain lists beside a
separate `columns` array. These fixtures exist so that cannot happen again.
"""
from __future__ import annotations

import copy
from typing import Any, Dict, List

REAL_SECTIONS: List[Dict[str, Any]] = [
    {"heading": "Brand Context", "type": "prose",
     "content": ("NNPC Limited is repositioning its public communication around Oil and "
                 "Gas content but has not yet chosen a consistent voice for younger "
                 "Nigerian audiences.")},
    {"heading": "2. BUSINESS CONTEXT", "type": "bullets",
     "content": "The working business context for this project:",
     "items": ["Marketing Focus: energy literacy for young adults",
               "Decision Maker: Chief Marketing Officer"]},
    {"heading": "3. USER & MARKET LANDSCAPE", "type": "table",
     "content": ("Key observations point to a need for clearer proof, stronger moments "
                 "of influence, and creator voices that make the brand culturally usable."),
     "columns": ["Segment", "Behavior / Usage", "Key Driver", "Notes / Evidence"],
     "rows": [
         ["Core adopters", "Already engage with the category.", "Trust and proof.",
          "Inferred from the Connect call."],
         ["Culture-led switchers", "Respond to creators who translate value.",
          "Identity and social proof.", "Useful for social-first channels."],
     ]},
    {"heading": "Desired Outcomes and Success Metrics", "type": "table",
     "content": ("The outcomes below are our current view of what success should look "
                 "like. Please confirm or adjust the targets."),
     "columns": ["Metrics", "Success Looks Like"],
     "rows": [
         ["To make NNPC's communication more understandable to younger Nigerians",
          "Increased understanding of complex energy information among young people"],
         ["Qualified reach", "Confirm target with brand."],
     ]},
    {"heading": "Focus & Priority", "type": "focus_priority",
     "content": "Priority not set:\n• Public education and awareness",
     "focus_options": ["Awareness", "Education", "Conversion"],
     "priority_options": ["High", "Medium", "Low"],
     "segments": [{"name": "", "focus": "Education", "priority": "High"}]},
    {"heading": "Open Questions for Client Confirmation", "type": "numbered",
     "content": "To sharpen the next stage, we would like to confirm the following:",
     "items": ["Have we understood your organisation correctly?",
               "Is this the correct priority audience?",
               "Which success outcome matters most for this project?"]},
    {"heading": "Recommended Next Step", "type": "prose",
     "content": "Book a 30-minute alignment call to confirm the targets above."},
]


def real_sections() -> List[Dict[str, Any]]:
    """A fresh copy, so no test can leak edits into another."""
    return copy.deepcopy(REAL_SECTIONS)


def real_snapshot(**overrides: Any) -> Dict[str, Any]:
    doc = {
        "id": "snap-real", "business_case_id": "bc-real",
        "title": "NNPC Limited - Alignment Snapshot",
        "sections": real_sections(),
        "last_edited_at": "2026-09-21T09:00:00Z",
    }
    doc.update(overrides)
    return doc
