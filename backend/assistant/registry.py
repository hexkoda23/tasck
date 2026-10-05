"""The tool catalogue.

One definition per tool, consumed by two adapters:

  * native_tools  - emitted as Anthropic `tools=[...]` when a direct API key is
                    present and the provider supports function calling.
  * json_protocol - serialised into the system prompt when the provider is
                    text-only (the Emergent gateway SDK is text-in/text-out).

Both read this registry, so a tool is written once and validated once no matter
which provider answers. Adding a provider never means restating the catalogue.
"""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable, Dict, List, Optional

from jsonschema import Draft202012Validator

from .errors import SchemaViolation, ToolNotFound


class Tier(str, Enum):
    """How much freedom a tool gets, and what the human has to do about it."""

    READ = "read"          # returns data, writes nothing, no journal row
    CONTENT = "content"    # edits document text; journalled, undoable
    RECORD = "record"      # edits structured fields; journalled, undoable
    GENERATE = "generate"  # costs money and time; confirmation required
    OUTBOUND = "outbound"  # leaves TASCK or cannot be reversed; confirm, no undo


#: Tiers whose calls the runtime refuses to execute without an explicit human
#: confirmation. Enforced here rather than trusted to the model's own flag - a
#: tool that sends an email must never run because a model set a boolean.
CONFIRM_TIERS = frozenset({Tier.GENERATE, Tier.OUTBOUND})

#: Tiers that write something `undo_last_change` can put back.
UNDOABLE_TIERS = frozenset({Tier.CONTENT, Tier.RECORD, Tier.GENERATE})


@dataclass(frozen=True)
class Tool:
    name: str
    description: str
    input_schema: Dict[str, Any]
    tier: Tier
    handler: Optional[Callable[..., Any]] = None
    #: Tools the model should reach for instead in the cases this one excludes.
    #: Not decoration: naming the alternative in the description is the single
    #: biggest driver of correct first-call selection, so the registry checks
    #: that every tool does it.
    see_also: tuple = field(default_factory=tuple)

    @property
    def needs_confirmation(self) -> bool:
        return self.tier in CONFIRM_TIERS

    @property
    def undoable(self) -> bool:
        return self.tier in UNDOABLE_TIERS

    def as_native(self) -> Dict[str, Any]:
        """Anthropic tool-use definition."""
        return {
            "name": self.name,
            "description": self.description,
            "input_schema": self.input_schema,
        }


class ToolRegistry:
    def __init__(self) -> None:
        self._tools: Dict[str, Tool] = {}

    # -- registration -------------------------------------------------------
    def tool(self, *, name: str, description: str, input_schema: Dict[str, Any],
             tier: Tier, see_also: tuple = ()) -> Callable:
        """Decorator registering a handler as a tool.

        The schema is checked against the JSON Schema metaschema at import time,
        so a malformed tool fails the process rather than failing in front of an
        admin halfway through a conversation.
        """
        Draft202012Validator.check_schema(input_schema)

        def decorator(handler: Callable) -> Callable:
            if name in self._tools:
                raise ValueError(f"tool {name!r} is already registered")
            self._tools[name] = Tool(
                name=name, description=description, input_schema=input_schema,
                tier=tier, handler=handler, see_also=see_also,
            )
            return handler

        return decorator

    def register(self, tool: Tool) -> Tool:
        if tool.name in self._tools:
            raise ValueError(f"tool {tool.name!r} is already registered")
        Draft202012Validator.check_schema(tool.input_schema)
        self._tools[tool.name] = tool
        return tool

    # -- lookup -------------------------------------------------------------
    def __len__(self) -> int:
        return len(self._tools)

    def __contains__(self, name: object) -> bool:
        return name in self._tools

    def all(self) -> List[Tool]:
        return list(self._tools.values())

    def names(self) -> List[str]:
        return list(self._tools)

    def get(self, name: str) -> Tool:
        try:
            return self._tools[name]
        except KeyError:
            raise ToolNotFound(
                f"There is no tool called {name!r}.",
                hint=f"Use one of: {', '.join(sorted(self._tools))}.",
            ) from None

    def for_tiers(self, tiers: Any) -> List[Tool]:
        allowed = set(tiers)
        return [t for t in self._tools.values() if t.tier in allowed]

    # -- validation ---------------------------------------------------------
    def validate(self, name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Check arguments against the tool's schema.

        Raises SchemaViolation carrying every problem at once. Reporting all of
        them together matters: fed back one at a time, a model burns a
        correction round per mistake and can exhaust the retry budget on a call
        it could have fixed in one go.
        """
        tool = self.get(name)
        if not isinstance(arguments, dict):
            raise SchemaViolation(
                f"Arguments for {name!r} must be a JSON object, got "
                f"{type(arguments).__name__}.",
                hint='Send "input" as an object, e.g. {"index": 2, "reason": "..."}.',
            )
        validator = Draft202012Validator(tool.input_schema)
        problems = [_describe(e) for e in sorted(validator.iter_errors(arguments),
                                                 key=lambda e: list(e.path))]
        if problems:
            raise SchemaViolation(
                f"{name}: " + "; ".join(problems),
                hint=(
                    "Fix the arguments and call the tool again. The schema in your "
                    "instructions lists every accepted field."
                ),
                details={"tool": name, "problems": problems},
            )
        return arguments

    # -- emission -----------------------------------------------------------
    def as_native_tools(self, tools: Optional[List[Tool]] = None) -> List[Dict[str, Any]]:
        return [t.as_native() for t in (tools if tools is not None else self.all())]

    def as_prompt_block(self, tools: Optional[List[Tool]] = None) -> str:
        """The catalogue as prompt text, for providers without function calling.

        Never abbreviated by the context budget. A tool trimmed out of the
        prompt is a tool the model cannot know exists, and it will either
        hallucinate the call or tell the admin the thing is impossible - which
        is exactly the failure this whole module is replacing.
        """
        chosen = tools if tools is not None else self.all()
        lines: List[str] = []
        for t in chosen:
            lines.append(f"### {t.name}")
            lines.append(t.description)
            if t.needs_confirmation:
                lines.append(
                    'This tool REQUIRES confirmation: set "needs_confirmation": true '
                    "and describe exactly what will happen before the admin approves."
                )
            lines.append("Schema: " + json.dumps(t.input_schema, ensure_ascii=False,
                                                 separators=(",", ":")))
            lines.append("")
        return "\n".join(lines).strip()


def _describe(error: Any) -> str:
    """Turn a jsonschema error into something a model can act on."""
    where = ".".join(str(p) for p in error.path) or "(root)"
    validator = error.validator
    if validator == "required":
        return f"{error.message} at {where}"
    if validator == "additionalProperties":
        return (
            f"{error.message} at {where} - this tool accepts no other fields, "
            "check the spelling against the schema"
        )
    if validator == "enum":
        allowed = ", ".join(repr(v) for v in error.validator_value)
        return f"{where}: {error.instance!r} is not allowed; use one of {allowed}"
    if validator in {"minimum", "maximum"}:
        return f"{where}: {error.message}"
    if validator == "type":
        return f"{where}: expected {error.validator_value}, got {type(error.instance).__name__}"
    return f"{where}: {error.message}"


#: The process-wide catalogue. Tool modules import this and decorate.
registry = ToolRegistry()
