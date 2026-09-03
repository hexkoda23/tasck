#!/usr/bin/env python
"""Read-only inventory of a MongoDB database, for migration verification.

Run it against the SOURCE (Emergent production, once access is granted) and
again against the TARGET (Azure) after the restore, then compare the two JSON
files with infra/verify_restore.py.

    python infra/inventory_mongo.py --uri "$MONGO_URL" --db tasck --out source.json
    python infra/inventory_mongo.py --uri "$AZURE_MONGO_URL" --db tasck --out target.json

What it records per collection:
  - document count (exact, via count_documents)
  - index specifications (name, keys, unique/sparse/partial/TTL options)
  - storage statistics (size, avgObjSize) when collStats is available
  - an order-independent content fingerprint: sha256 of the sorted set of
    per-document sha256 hashes over the canonical JSON of each document, so a
    faithful restore of the same documents yields the same fingerprint
    regardless of insertion order or _id assignment differences
  - the count of documents that carry large inline binary payloads (base64
    strings over 32 KiB), because those are the records most likely to be
    truncated or dropped by a bad restore

It only ever reads. It never creates, modifies or drops anything, and it never
prints document contents or the connection string.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
from datetime import datetime, timezone
from typing import Any, Dict, List

from bson import json_util
from pymongo import MongoClient

BIG_INLINE_THRESHOLD = 32 * 1024


def canonical_doc_hash(doc: Dict[str, Any]) -> str:
    """Stable hash of one document; _id excluded so regenerated ids do not matter."""
    body = {k: v for k, v in doc.items() if k != "_id"}
    payload = json_util.dumps(body, sort_keys=True, json_options=json_util.CANONICAL_JSON_OPTIONS)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def has_big_inline_payload(value: Any, threshold: int = BIG_INLINE_THRESHOLD) -> bool:
    if isinstance(value, str):
        return len(value) >= threshold
    if isinstance(value, (bytes, bytearray)):
        return len(value) >= threshold
    if isinstance(value, dict):
        return any(has_big_inline_payload(v, threshold) for v in value.values())
    if isinstance(value, list):
        return any(has_big_inline_payload(v, threshold) for v in value)
    return False


def inventory(uri: str, db_name: str, sample_hash_limit: int) -> Dict[str, Any]:
    client = MongoClient(uri, serverSelectionTimeoutMS=20000, appname="tasck-inventory")
    info = client.server_info()
    db = client[db_name]
    result: Dict[str, Any] = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "database": db_name,
        "server_version": info.get("version"),
        "collections": {},
    }
    names = sorted(db.list_collection_names())
    for name in names:
        coll = db[name]
        entry: Dict[str, Any] = {}
        entry["count"] = coll.count_documents({})
        try:
            idx = coll.index_information()
            entry["indexes"] = {
                k: {
                    "key": [list(pair) for pair in v.get("key", [])],
                    **{opt: v[opt] for opt in ("unique", "sparse", "expireAfterSeconds", "partialFilterExpression") if opt in v},
                }
                for k, v in sorted(idx.items())
            }
        except Exception as exc:  # noqa: BLE001
            entry["indexes_error"] = str(exc)
        try:
            stats = db.command("collStats", name)
            entry["size_bytes"] = stats.get("size")
            entry["storage_size_bytes"] = stats.get("storageSize")
            entry["avg_obj_size"] = stats.get("avgObjSize")
        except Exception as exc:  # noqa: BLE001
            entry["stats_error"] = str(exc)[:200]

        hashes: List[str] = []
        big = 0
        scanned = 0
        for doc in coll.find({}, batch_size=200):
            scanned += 1
            hashes.append(canonical_doc_hash(doc))
            if has_big_inline_payload(doc):
                big += 1
            if sample_hash_limit and scanned >= sample_hash_limit:
                break
        hashes.sort()
        entry["fingerprint"] = hashlib.sha256("\n".join(hashes).encode("utf-8")).hexdigest()
        entry["fingerprint_docs"] = scanned
        entry["big_inline_payload_docs"] = big
        result["collections"][name] = entry
        print(f"  {name:40s} count={entry['count']:>8}  big_inline={big:>5}", file=sys.stderr)
    result["collection_count"] = len(names)
    result["total_documents"] = sum(c["count"] for c in result["collections"].values())
    return result


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--uri", required=True, help="MongoDB connection string (never printed)")
    ap.add_argument("--db", required=True, help="database name")
    ap.add_argument("--out", required=True, help="output JSON path")
    ap.add_argument("--sample-hash-limit", type=int, default=0,
                    help="hash at most N docs per collection (0 = all; use only for a quick look)")
    args = ap.parse_args()
    print(f"Inventorying database '{args.db}' (read-only)...", file=sys.stderr)
    data = inventory(args.uri, args.db, args.sample_hash_limit)
    with open(args.out, "w", encoding="utf-8") as fh:
        json.dump(data, fh, indent=2, sort_keys=True)
    print(f"{data['collection_count']} collections, {data['total_documents']} documents -> {args.out}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
