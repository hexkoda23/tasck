"""Phase 2: moving around, and taking things back.

`navigate` is what makes the assistant cross-page: the conversation no longer
belongs to one editor, so the model can take the admin to where the change has
to happen instead of telling them to go there themselves.
"""
from __future__ import annotations

from ..registry import Tier, Tool, registry

#: Every page the assistant can send an admin to, and the route it maps onto.
#: Pages scoped to one project take :id, and the runtime refuses to build the
#: URL without one rather than landing the admin on a broken page.
PAGES = {
    "overview": "/admin",
    "crm_brands": "/admin/crm-brands",
    "business_cases": "/admin/business-cases",
    "project_home": "/admin/business-cases/{project_id}",
    "alignment_snapshot": "/admin/business-cases/{project_id}/frame/snapshot",
    "brainstorm": "/admin/business-cases/{project_id}/frame/brainstorm",
    "creator_selector": "/admin/business-cases/{project_id}/frame/creator-scan",
    "pitch_deck": "/admin/business-cases/{project_id}/frame/pitch-deck",
    "creative_brief": "/admin/business-cases/{project_id}/frame/brief",
    "planning": "/admin/business-cases/{project_id}/plan/planning",
    "contracts": "/admin/business-cases/{project_id}/delivery/contracts",
    "deliverables": "/admin/business-cases/{project_id}/delivery/deliverables",
    "final_report": "/admin/business-cases/{project_id}/reporting/final-report",
    "messages": "/admin/brand-communications",
    "settings": "/admin/settings",
}

#: Pages whose route contains {project_id}.
PROJECT_SCOPED = sorted(k for k, v in PAGES.items() if "{project_id}" in v)

NAVIGATE = Tool(
    name="navigate",
    tier=Tier.READ,
    see_also=("find", "edit_section"),
    description=(
        "Take the admin to another page in the TASCK admin portal. Use this when they ask "
        "to go somewhere, or when the change they want has to be made on a different page "
        "from the one they are on. Always say where you are taking them in your reply - "
        "never move them silently. Use find first if you need a project id you do not "
        "have. Navigating does not change anything: to make an edit once you arrive, use "
        "edit_section."
    ),
    input_schema={
        "type": "object",
        "properties": {
            "page": {
                "type": "string",
                "enum": sorted(PAGES),
                "description": "Which page to open.",
            },
            "project_id": {
                "type": "string",
                "description": (
                    "Required for any page belonging to one project ("
                    + ", ".join(PROJECT_SCOPED)
                    + "). Omit it only for the portal-wide pages."
                ),
            },
        },
        "required": ["page"],
        "additionalProperties": False,
    },
)

UNDO_LAST_CHANGE = Tool(
    name="undo_last_change",
    tier=Tier.CONTENT,
    see_also=("read_document", "edit_section"),
    description=(
        "Revert the most recent change you made in this conversation, restoring exactly "
        "what was there before. Use it when the admin says your change was wrong, or to "
        "take back your own mistake. Emails that have been sent, approvals and stage "
        "changes CANNOT be undone - say so plainly rather than trying. After undoing, "
        "call read_document before making another edit, because the indices you were "
        "working from may have moved. To make a different change instead of reverting, "
        "use edit_section."
    ),
    input_schema={
        "type": "object",
        "properties": {
            "reason": {
                "type": "string",
                "minLength": 3,
                "description": (
                    "One short sentence for the audit trail, e.g. 'Admin said the new "
                    "heading was wrong'."
                ),
            },
        },
        "required": ["reason"],
        "additionalProperties": False,
    },
)

registry.register(NAVIGATE)
registry.register(UNDO_LAST_CHANGE)


def resolve_route(page: str, project_id: str | None) -> str:
    """Build the URL, refusing rather than producing a broken one."""
    from ..errors import ValidationFailed

    template = PAGES.get(page)
    if not template:
        raise ValidationFailed(
            f"Unknown page {page!r}.",
            hint=f"Use one of: {', '.join(sorted(PAGES))}.",
        )
    if "{project_id}" in template:
        if not project_id:
            raise ValidationFailed(
                f"The {page} page belongs to one project, so it needs a project_id.",
                hint="Call find with entity='project' to get the id, then navigate again.",
            )
        return template.format(project_id=project_id)
    return template
