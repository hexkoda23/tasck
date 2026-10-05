"""
TEMPORARY migration-only export mechanism. Remove after the Azure migration.

Produces a native mongodump BSON archive of the configured database on local disk
and serves it over an authenticated download route. Read-only: nothing here writes
to MongoDB. Every route returns 404 unless DB_EXPORT_TOKEN is set, so the mechanism
is invisible in normal operation.
"""
import hashlib
import json
import os
import secrets
import shutil
import subprocess
import tempfile
import threading
from datetime import datetime, timezone

from fastapi import APIRouter, Header, HTTPException
from fastapi.responses import FileResponse
from pymongo import MongoClient

ARCHIVE_NAME = "production.archive.gz"

_state = {"state": "idle", "manifest": None, "verification": None, "error": None, "dir": None}
_lock = threading.Lock()


def _token():
    return (os.environ.get("DB_EXPORT_TOKEN") or "").strip()


def _redact(text, uri):
    if not text:
        return ""
    out = text.replace(uri, "<redacted>") if uri else text
    # belt and braces: strip any surviving credential-bearing URI
    import re
    return re.sub(r"mongodb(\+srv)?://[^\s\"']+", "<redacted>", out)


def _guard(supplied):
    expected = _token()
    if not expected:
        raise HTTPException(status_code=404, detail="Not Found")
    if not supplied or not secrets.compare_digest(str(supplied), expected):
        raise HTTPException(status_code=404, detail="Not Found")


def _tool_version(tool):
    try:
        out = subprocess.run([tool, "--version"], capture_output=True, text=True, timeout=30)
        return (out.stdout or "").strip().splitlines()[0] if out.stdout else "unknown"
    except Exception:
        return "unavailable"


def _run_export():
    uri = os.environ.get("MONGO_URL", "")
    db_name = os.environ.get("DB_NAME", "")
    workdir = tempfile.mkdtemp(prefix="tasck-migration-")
    archive = os.path.join(workdir, ARCHIVE_NAME)
    started = datetime.now(timezone.utc)
    try:
        proc = subprocess.run(
            ["mongodump", f"--uri={uri}", f"--db={db_name}", f"--archive={archive}", "--gzip"],
            capture_output=True, text=True, timeout=1800,
        )
        if proc.returncode != 0 or not os.path.exists(archive):
            raise RuntimeError(f"mongodump failed (rc={proc.returncode}): {_redact(proc.stderr, uri)[-800:]}")

        # read-only inventory straight from the source database
        collections = {}
        client = MongoClient(uri, serverSelectionTimeoutMS=30000)
        try:
            source = client[db_name]
            server_version = client.server_info().get("version", "unknown")
            for name in sorted(source.list_collection_names()):
                collections[name] = source[name].count_documents({})
        finally:
            client.close()

        sha = hashlib.sha256()
        with open(archive, "rb") as fh:
            for chunk in iter(lambda: fh.read(1024 * 1024), b""):
                sha.update(chunk)

        manifest = {
            "dump_timestamp_utc": started.isoformat(),
            "completed_timestamp_utc": datetime.now(timezone.utc).isoformat(),
            "source_database": db_name,
            "mongodb_server_version": server_version,
            "mongodump_version": _tool_version("mongodump"),
            "archive_filename": ARCHIVE_NAME,
            "archive_size_bytes": os.path.getsize(archive),
            "archive_sha256": sha.hexdigest(),
            "format": "mongodump --archive --gzip (native BSON)",
            "collection_count": len(collections),
            "total_documents": sum(collections.values()),
            "collections": collections,
        }

        verify = subprocess.run(
            ["mongorestore", f"--archive={archive}", "--gzip", "--dryRun", "-v"],
            capture_output=True, text=True, timeout=900,
        )
        verification = {
            "method": "mongorestore --archive --gzip --dryRun",
            "exit_code": verify.returncode,
            "readable": verify.returncode == 0,
            "output_tail": _redact(verify.stderr or verify.stdout, uri)[-2000:],
        }

        with open(os.path.join(workdir, "manifest.json"), "w") as fh:
            json.dump(manifest, fh, indent=2)
        with open(os.path.join(workdir, "SHA256SUMS"), "w") as fh:
            fh.write(f"{manifest['archive_sha256']}  {ARCHIVE_NAME}\n")

        with _lock:
            _state.update(state="complete", manifest=manifest, verification=verification,
                          error=None, dir=workdir)
    except Exception as exc:  # noqa: BLE001
        with _lock:
            _state.update(state="failed", error=_redact(str(exc), uri)[:1500], dir=workdir)


def make_migration_export_router():
    router = APIRouter(prefix="/migration", tags=["migration"])

    @router.post("/export")
    async def start_export(x_migration_token: str = Header(None)):
        _guard(x_migration_token)
        with _lock:
            if _state["state"] == "running":
                return {"state": "running", "message": "Export already in progress."}
            previous = _state.get("dir")
            _state.update(state="running", manifest=None, verification=None, error=None, dir=None)
        if previous and os.path.isdir(previous):
            shutil.rmtree(previous, ignore_errors=True)
        threading.Thread(target=_run_export, daemon=True).start()
        return {"state": "running", "message": "Native mongodump started. Poll GET /api/migration/status."}

    @router.get("/status")
    async def status(x_migration_token: str = Header(None)):
        _guard(x_migration_token)
        with _lock:
            return {"state": _state["state"], "manifest": _state["manifest"],
                    "verification": _state["verification"], "error": _state["error"]}

    @router.get("/download")
    async def download(x_migration_token: str = Header(None)):
        _guard(x_migration_token)
        with _lock:
            workdir, state = _state.get("dir"), _state["state"]
        if state != "complete" or not workdir:
            raise HTTPException(status_code=409, detail="No completed export available.")
        path = os.path.join(workdir, ARCHIVE_NAME)
        if not os.path.exists(path):
            raise HTTPException(status_code=409, detail="Archive missing; re-run the export.")
        return FileResponse(path, media_type="application/gzip", filename=ARCHIVE_NAME)

    @router.post("/cleanup")
    async def cleanup(x_migration_token: str = Header(None)):
        _guard(x_migration_token)
        with _lock:
            workdir = _state.get("dir")
            _state.update(state="idle", manifest=None, verification=None, error=None, dir=None)
        if workdir and os.path.isdir(workdir):
            shutil.rmtree(workdir, ignore_errors=True)
        return {"state": "idle", "message": "Temporary archive removed from disk."}

    return router
