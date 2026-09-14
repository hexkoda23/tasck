"""Dump one MongoDB database in mongodump's directory format using only pymongo.

For environments (such as the Emergent production pod) where the MongoDB
Database Tools may not be installed. Produces exactly what `mongodump --db X
--out DIR` produces - `DIR/X/<collection>.bson` plus
`DIR/X/<collection>.metadata.json` (options + indexes) - so `mongorestore --dir`
restores it, including indexes. Read-only against the source.

    python pymongo_dump.py --uri "$MONGO_URL" --db "$DB_NAME" --out ./dump
    tar -czf production.dump.tar.gz -C ./dump .

Prefer real `mongodump --archive --gzip` when it is available; use this only as
the fallback. The Azure restore job accepts both forms.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

import bson
from bson.json_util import dumps as bson_dumps, CANONICAL_JSON_OPTIONS
from pymongo import MongoClient


def dump(uri: str, db_name: str, out: Path) -> None:
    client = MongoClient(uri, serverSelectionTimeoutMS=20000)
    db = client[db_name]
    target = out / db_name
    target.mkdir(parents=True, exist_ok=True)
    names = sorted(n for n in db.list_collection_names() if not n.startswith("system."))
    total = 0
    for name in names:
        coll = db[name]
        info = next((c for c in db.list_collections(filter={"name": name})), {})
        indexes = list(coll.list_indexes())
        # mongodump metadata: options, indexes (as they appear in listIndexes), uuid
        meta = {
            "options": info.get("options", {}),
            "indexes": indexes,
            "uuid": info.get("info", {}).get("uuid").hex() if info.get("info", {}).get("uuid") is not None else None,
            "collectionName": name,
            "type": info.get("type", "collection"),
        }
        if meta["uuid"] is None:
            meta.pop("uuid")
        (target / f"{name}.metadata.json").write_text(
            bson_dumps(meta, json_options=CANONICAL_JSON_OPTIONS), encoding="utf-8"
        )
        count = 0
        with open(target / f"{name}.bson", "wb") as fh:
            for raw in coll.find_raw_batches(batch_size=500):
                # find_raw_batches yields concatenated BSON documents - exactly the .bson file format
                fh.write(raw)
                count += len(bson.decode_all(raw))
        total += count
        print(f"  {name}: {count} documents, {len(indexes)} indexes", file=sys.stderr)
    print(f"dumped {len(names)} collections, {total} documents from '{db_name}' to {target}", file=sys.stderr)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--uri", help="MongoDB connection string (never printed)")
    ap.add_argument("--uri-env", help="environment variable holding the connection string")
    ap.add_argument("--db", help="database name")
    ap.add_argument("--db-env", help="environment variable holding the database name")
    ap.add_argument("--out", required=True, help="output directory (mongodump layout: <out>/<db>/<collection>.bson)")
    args = ap.parse_args()
    uri = args.uri or (os.environ.get(args.uri_env) if args.uri_env else None)
    db_name = args.db or (os.environ.get(args.db_env) if args.db_env else None)
    if not uri or not db_name:
        ap.error("provide --uri or --uri-env, and --db or --db-env")
    dump(uri, db_name, Path(args.out))
    return 0


if __name__ == "__main__":
    sys.exit(main())
