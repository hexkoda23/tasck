"""Inventory of a mongodump DIRECTORY, in the same format as inventory_mongo.py.

Lets backend/verify_restore.py compare what was restored into Azure against the
archive itself (counts, order-independent content fingerprints, index sets),
without needing a live connection to the source database.

    python backend/inventory_from_dump.py --dump-dir ./dump --db <db-in-dump> --out source-inventory.json
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import bson
from bson import json_util

sys.path.insert(0, str(Path(__file__).resolve().parent))
from inventory_mongo import canonical_doc_hash, has_big_inline_payload  # noqa: E402


def inventory(dump_dir: Path, db_name: str) -> dict:
    src = dump_dir / db_name
    if not src.is_dir():
        raise SystemExit(f"{src} is not a directory (expected <dump-dir>/<db>/<collection>.bson)")
    result = {"generated_at": datetime.now(timezone.utc).isoformat(), "database": db_name,
              "server_version": "dump", "collections": {}}
    for f in sorted(src.glob("*.bson")):
        name = f.stem
        docs = bson.decode_all(f.read_bytes())
        entry = {"count": len(docs)}
        meta_path = src / f"{name}.metadata.json"
        if meta_path.exists():
            meta = json_util.loads(meta_path.read_text(encoding="utf-8"))
            entry["indexes"] = {
                ix["name"]: {"key": [[k, v] for k, v in ix["key"].items()],
                             **{opt: ix[opt] for opt in ("unique", "sparse", "expireAfterSeconds", "partialFilterExpression") if opt in ix}}
                for ix in sorted(meta.get("indexes", []), key=lambda i: i["name"])
            }
        hashes = sorted(canonical_doc_hash(d) for d in docs)
        entry["fingerprint"] = hashlib.sha256("\n".join(hashes).encode("utf-8")).hexdigest()
        entry["fingerprint_docs"] = len(docs)
        entry["big_inline_payload_docs"] = sum(has_big_inline_payload(d) for d in docs)
        result["collections"][name] = entry
        print(f"  {name:40s} count={len(docs):>8}", file=sys.stderr)
    result["collection_count"] = len(result["collections"])
    result["total_documents"] = sum(c["count"] for c in result["collections"].values())
    return result


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dump-dir", required=True)
    ap.add_argument("--db", required=True)
    ap.add_argument("--out", required=True)
    a = ap.parse_args()
    data = inventory(Path(a.dump_dir), a.db)
    Path(a.out).write_text(json.dumps(data, indent=2, sort_keys=True), encoding="utf-8")
    print(f"wrote {a.out}: {data['total_documents']} documents in {data['collection_count']} collections", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
