#!/usr/bin/env python
"""Compare two inventories produced by infra/inventory_mongo.py.

    python infra/verify_restore.py source.json target.json

Exit code 0 when every collection in the source exists in the target with the
same document count, the same content fingerprint, and the same index set
(names and keys). Exit code 1 otherwise, with a line per discrepancy.

Collections present only in the target are reported as informational (the app
may create empty collections on first use) unless they contain documents.
"""
from __future__ import annotations

import json
import sys
from typing import Any, Dict


def load(path: str) -> Dict[str, Any]:
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def index_keys(entry: Dict[str, Any]) -> Dict[str, Any]:
    return {name: spec.get("key") for name, spec in (entry.get("indexes") or {}).items()}


def main(argv) -> int:
    if len(argv) != 3:
        print(__doc__)
        return 2
    src, dst = load(argv[1]), load(argv[2])
    problems = 0
    print(f"source: {src['database']} @ MongoDB {src.get('server_version')}  ({src['total_documents']} docs, {src['collection_count']} collections)")
    print(f"target: {dst['database']} @ MongoDB {dst.get('server_version')}  ({dst['total_documents']} docs, {dst['collection_count']} collections)")
    print()

    for name, s in sorted(src["collections"].items()):
        t = dst["collections"].get(name)
        if t is None:
            print(f"MISSING     {name}: not in target (source has {s['count']} docs)")
            problems += 1
            continue
        line = []
        if s["count"] != t["count"]:
            line.append(f"count {s['count']} -> {t['count']}")
        if s.get("fingerprint") != t.get("fingerprint"):
            line.append("content fingerprint differs")
        if s.get("big_inline_payload_docs") != t.get("big_inline_payload_docs"):
            line.append(f"inline-payload docs {s.get('big_inline_payload_docs')} -> {t.get('big_inline_payload_docs')}")
        si, ti = index_keys(s), index_keys(t)
        missing_idx = {k: v for k, v in si.items() if k not in ti}
        changed_idx = {k: v for k, v in si.items() if k in ti and ti[k] != v}
        if missing_idx:
            line.append(f"indexes missing in target: {sorted(missing_idx)}")
        if changed_idx:
            line.append(f"index keys differ: {sorted(changed_idx)}")
        if line:
            problems += 1
            print(f"MISMATCH    {name}: " + "; ".join(line))
        else:
            print(f"ok          {name}: {s['count']} docs, {len(si)} indexes")

    for name, t in sorted(dst["collections"].items()):
        if name not in src["collections"]:
            level = "EXTRA-DATA " if t["count"] else "extra-empty"
            if t["count"]:
                problems += 1
            print(f"{level} {name}: only in target ({t['count']} docs)")

    print()
    if problems:
        print(f"FAILED: {problems} discrepancy(ies). Do not cut over.")
        return 1
    print("PASSED: target matches source (counts, content fingerprints, indexes).")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
