"""Convert an infra/emergent-export JSON export into a mongodump directory.

The Emergent Mongo Viewer exporter writes one JSON array per collection plus a
manifest. This turns that into `<out>/<db>/<collection>.bson` +
`<collection>.metadata.json` so the archive can go through the same validated
Azure restore path as a real mongodump (`infra/restore-production.sh` with a
.tar.gz). Only the `_id_` index is declared; the application creates no others.

    python backend/json_export_to_dump.py --export-dir <dir with *.json + manifest.json> \
        --db tasck-live-demo-1-test_database --out ./dump
    tar --force-local -czf production.dump.tar.gz -C ./dump .

Fidelity notes (documented, not hidden): the Viewer serialises documents as JSON.
24-hex `_id` strings become ObjectId again; every other value keeps its JSON
type. The application stores dates as ISO strings and ids as plain strings, so
this matches how the app reads them; documents with native BSON dates would
come back as strings.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

import bson
from bson import ObjectId
from bson.json_util import dumps as bson_dumps, CANONICAL_JSON_OPTIONS

HEX24 = re.compile(r"^[0-9a-fA-F]{24}$")


def _fix_id(doc: dict) -> dict:
    v = doc.get("_id")
    if isinstance(v, str) and HEX24.match(v):
        doc["_id"] = ObjectId(v)
    elif isinstance(v, dict) and "$oid" in v:
        doc["_id"] = ObjectId(v["$oid"])
    return doc


def convert(export_dir: Path, db_name: str, out: Path, include_empty: bool) -> int:
    target = out / db_name
    target.mkdir(parents=True, exist_ok=True)
    manifest_path = export_dir / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8")) if manifest_path.exists() else {}
    files = sorted(p for p in export_dir.glob("*.json") if p.name not in ("manifest.json",))
    total = 0
    written = 0
    for f in files:
        docs = json.loads(f.read_text(encoding="utf-8"))
        if not isinstance(docs, list):
            print(f"  skip {f.name}: not a JSON array", file=sys.stderr)
            continue
        if not docs and not include_empty:
            continue
        name = f.stem
        with open(target / f"{name}.bson", "wb") as fh:
            for d in docs:
                fh.write(bson.encode(_fix_id(d)))
        meta = {"options": {}, "indexes": [{"v": 2, "key": {"_id": 1}, "name": "_id_"}], "collectionName": name, "type": "collection"}
        (target / f"{name}.metadata.json").write_text(bson_dumps(meta, json_options=CANONICAL_JSON_OPTIONS), encoding="utf-8")
        total += len(docs)
        written += 1
        print(f"  {name}: {len(docs)} documents", file=sys.stderr)
    print(f"converted {written} collections, {total} documents -> {target}", file=sys.stderr)
    # cross-check against the manifest when it carries counts
    counts = {}
    mc = manifest.get("collections")
    if isinstance(mc, list):
        counts = {e.get("collection") or e.get("name"): e.get("document_count", e.get("exported_count")) for e in mc}
    elif isinstance(mc, dict):
        counts = {k: (v.get("document_count", v.get("exported_count")) if isinstance(v, dict) else v) for k, v in mc.items()}
    mism = {k: (v, len(json.loads((export_dir / f"{k}.json").read_text(encoding="utf-8")))) for k, v in counts.items()
            if isinstance(v, int) and (export_dir / f"{k}.json").exists() and v != len(json.loads((export_dir / f"{k}.json").read_text(encoding="utf-8")))}
    if mism:
        print(f"MANIFEST MISMATCH: {mism}", file=sys.stderr)
        return 1
    if counts:
        print("manifest counts match the JSON files", file=sys.stderr)
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--export-dir", required=True)
    ap.add_argument("--db", required=True, help="database name to write into the dump layout (use the SOURCE name; the restore job renames)")
    ap.add_argument("--out", required=True)
    ap.add_argument("--include-empty", action="store_true", help="also emit empty collections")
    a = ap.parse_args()
    return convert(Path(a.export_dir), a.db, Path(a.out), a.include_empty)


if __name__ == "__main__":
    sys.exit(main())
