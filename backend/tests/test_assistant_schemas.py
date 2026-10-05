"""The schema rules from docs/ASSISTANT_AGENT_SPEC.md section 7, as a gate.

These are not style checks. Each one corresponds to a way a model gets a tool
call wrong, and writing the spec was itself enough to prove they bite: running
them against the hand-written schemas in the spec document turned up nine
undescribed properties in definitions that had been written carefully.
"""
from __future__ import annotations

import json

import pytest
from jsonschema import Draft202012Validator

from assistant import registry
from assistant.tools import documents, lookup  # noqa: F401  (registers tools)

TOOLS = registry.all()

#: Long enough to say what the tool does AND when to use something else.
MIN_DESCRIPTION_CHARS = 160


def _walk(name, schema, seen):
    """Yield (path, subschema) for every property, however deeply nested."""
    for key, value in (schema.get("properties") or {}).items():
        path = f"{name}.{key}"
        yield path, value
        if value.get("type") == "object":
            yield from _walk(path, value, seen)
        items = value.get("items")
        if value.get("type") == "array" and isinstance(items, dict):
            if items.get("type") == "object":
                yield from _walk(f"{path}[]", items, seen)


def test_registry_is_populated():
    assert len(TOOLS) >= 4
    assert len({t.name for t in TOOLS}) == len(TOOLS), "duplicate tool names"


@pytest.mark.parametrize("tool", TOOLS, ids=lambda t: t.name)
def test_schema_compiles(tool):
    Draft202012Validator.check_schema(tool.input_schema)


@pytest.mark.parametrize("tool", TOOLS, ids=lambda t: t.name)
def test_schema_is_an_object_with_properties(tool):
    assert tool.input_schema.get("type") == "object"
    assert tool.input_schema.get("properties"), "a tool with no properties takes no input"


@pytest.mark.parametrize("tool", TOOLS, ids=lambda t: t.name)
def test_additional_properties_is_closed(tool):
    """An unknown key means the model misunderstood; dropping it hides that."""
    assert tool.input_schema.get("additionalProperties") is False
    for path, prop in _walk(tool.name, tool.input_schema, set()):
        if prop.get("type") == "object" and prop.get("properties"):
            assert prop.get("additionalProperties") is False, f"{path} is open"


@pytest.mark.parametrize("tool", TOOLS, ids=lambda t: t.name)
def test_every_property_is_described(tool):
    """Rule 2. A bare {"type": "string"} tells the model nothing."""
    undescribed = [
        path for path, prop in _walk(tool.name, tool.input_schema, set())
        if not prop.get("description") and not prop.get("enum")
    ]
    assert not undescribed, f"undescribed properties: {undescribed}"


@pytest.mark.parametrize("tool", TOOLS, ids=lambda t: t.name)
def test_required_keys_exist_in_properties(tool):
    props = set(tool.input_schema.get("properties") or {})
    missing = [r for r in tool.input_schema.get("required", []) if r not in props]
    assert not missing, f"required but not defined: {missing}"


@pytest.mark.parametrize("tool", TOOLS, ids=lambda t: t.name)
def test_description_is_substantial(tool):
    assert len(tool.description) >= MIN_DESCRIPTION_CHARS, (
        f"{tool.name} description is {len(tool.description)} chars; it needs room to say "
        "when NOT to use this tool"
    )


@pytest.mark.parametrize("tool", TOOLS, ids=lambda t: t.name)
def test_description_names_an_alternative_tool(tool):
    """Rule 1 - the biggest lever on correct tool selection.

    Every tool must point somewhere else for the cases it excludes, and that
    alternative must actually exist, so a rename cannot leave the prompt
    pointing at a tool that is gone.
    """
    assert tool.see_also, f"{tool.name} declares no alternative tools"
    for other in tool.see_also:
        assert other in registry, f"{tool.name} points at unknown tool {other!r}"
        assert other in tool.description, (
            f"{tool.name} lists {other!r} in see_also but never mentions it in its "
            "description, so the model never learns about it"
        )


@pytest.mark.parametrize("tool", TOOLS, ids=lambda t: t.name)
def test_writing_tools_require_a_reason(tool):
    """Rule 6: the journal, the undo card and the model's own care depend on it."""
    if tool.tier.value == "read":
        return
    assert "reason" in tool.input_schema.get("required", []), (
        f"{tool.name} writes something but does not require a reason"
    )


@pytest.mark.parametrize("tool", TOOLS, ids=lambda t: t.name)
def test_enums_are_non_empty(tool):
    for path, prop in _walk(tool.name, tool.input_schema, set()):
        if "enum" in prop:
            assert prop["enum"], f"{path} has an empty enum"
            assert len(set(prop["enum"])) == len(prop["enum"]), f"{path} has duplicates"


@pytest.mark.parametrize("tool", TOOLS, ids=lambda t: t.name)
def test_irreversible_tools_say_so_in_their_description(tool):
    """Rule 9: the warning belongs where the model reads, not only in our docs."""
    if tool.tier.value != "outbound":
        return
    lowered = tool.description.lower()
    assert any(w in lowered for w in ("cannot be undone", "cannot be reversed",
                                      "permanent")), (
        f"{tool.name} is irreversible but never says so to the model"
    )


def test_native_emission_is_anthropic_shaped():
    for definition in registry.as_native_tools():
        assert set(definition) == {"name", "description", "input_schema"}
        json.dumps(definition)  # must be serialisable as-is


def test_prompt_block_contains_every_tool_and_its_schema():
    """A tool missing from the prompt is a tool the model cannot call."""
    block = registry.as_prompt_block()
    for tool in TOOLS:
        assert f"### {tool.name}" in block
        for required in tool.input_schema.get("required", []):
            assert required in block, f"{tool.name}.{required} absent from the prompt"


def test_confirmation_tiers_are_flagged_in_the_prompt():
    block = registry.as_prompt_block()
    for tool in TOOLS:
        if tool.needs_confirmation:
            start = block.index(f"### {tool.name}")
            assert "REQUIRES confirmation" in block[start:start + 2000]
