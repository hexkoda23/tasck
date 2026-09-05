#!/usr/bin/env python3
"""
TASCK Emergent Production MongoDB Exporter
Reads production collections via Emergent's authenticated Mongo View API
and saves sanitized JSON backups, SHA256 checksums, and export manifest.

SAFE & READ-ONLY: Never writes to Emergent, never connects to Azure.
"""

import argparse
import datetime
import hashlib
import json
import os
import sys
import time
from typing import Any, Dict, List, Tuple
import requests

DEFAULT_BASE_URL = "https://mongoview.emergent.host"
DEFAULT_ENV = "production"
DEFAULT_DB = "tasck-live-demo-1-test_database"
PAGE_LIMIT = 500


def mask_session_id(text: str, session_id: str) -> str:
    """Mask session_id in any string to prevent leaking credentials in logs."""
    if not session_id or not text:
        return text
    return text.replace(session_id, "***REDACTED***")


class EmergentExporter:
    def __init__(
        self,
        base_url: str,
        session_id: str,
        environment: str = DEFAULT_ENV,
        database: str = DEFAULT_DB,
        output_dir: str = "infra/emergent-export/output",
        timeout: int = 30,
        retries: int = 3,
    ):
        self.base_url = base_url.rstrip("/")
        self.session_id = session_id
        self.environment = environment
        self.database = database
        self.output_dir = os.path.abspath(output_dir)
        self.timeout = timeout
        self.retries = retries
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": "TASCK-Migration-Exporter/1.0"})

    def log(self, message: str) -> None:
        """Print log message with session ID masked."""
        safe_msg = mask_session_id(message, self.session_id)
        timestamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M:%SZ")
        print(f"[{timestamp}] {safe_msg}")

    def _get(self, endpoint: str, params: Dict[str, Any] = None) -> requests.Response:
        """Make an HTTP GET request with session_id parameter and retry logic."""
        if params is None:
            params = {}
        params["session_id"] = self.session_id

        url = f"{self.base_url}{endpoint}"

        for attempt in range(1, self.retries + 1):
            try:
                resp = self.session.get(url, params=params, timeout=self.timeout)
                if resp.status_code == 200:
                    return resp
                safe_url = mask_session_id(resp.url, self.session_id)
                self.log(f"HTTP {resp.status_code} for {safe_url} (attempt {attempt}/{self.retries})")
                if resp.status_code in (401, 403):
                    raise RuntimeError(f"Authentication failed (HTTP {resp.status_code}). Check EMERGENT_VIEWER_SESSION_ID.")
            except requests.RequestException as e:
                safe_err = mask_session_id(str(e), self.session_id)
                self.log(f"Request error: {safe_err} (attempt {attempt}/{self.retries})")

            if attempt < self.retries:
                time.sleep(2 ** attempt)

        raise RuntimeError(f"Failed request to {endpoint} after {self.retries} attempts")

    def fetch_inventory(self) -> Dict[str, int]:
        """Fetch list of collections and expected document counts."""
        self.log(f"Discovering collections for environment '{self.environment}', database '{self.database}'...")

        candidate_endpoints = [
            f"/api/collections/{self.environment}/{self.database}",
            f"/api/databases/{self.environment}/{self.database}/collections",
            f"/api/collections/{self.database}",
            f"/api/databases/{self.database}/collections",
            "/api/collections",
            "/api/databases",
        ]

        inventory: Dict[str, int] = {}
        last_error = None

        for endpoint in candidate_endpoints:
            try:
                resp = self._get(endpoint)
                data = resp.json()
                parsed = self._parse_inventory_json(data)
                if parsed:
                    inventory = parsed
                    self.log(f"Inventory discovery succeeded via endpoint: {endpoint}")
                    break
            except Exception as e:
                last_error = e
                continue

        if not inventory:
            self.log("Inventory discovery endpoints returned no structured list. Probing document endpoints...")
            inventory = self._probe_known_collections()

        if not inventory:
            raise RuntimeError(f"Could not discover collections inventory. Last error: {mask_session_id(str(last_error), self.session_id)}")

        return inventory

    def _parse_inventory_json(self, data: Any) -> Dict[str, int]:
        """Normalize inventory JSON responses into {collection_name: count}."""
        inventory = {}

        if isinstance(data, list):
            for item in data:
                if isinstance(item, dict):
                    name = item.get("name") or item.get("collection_name") or item.get("id")
                    count = item.get("total") or item.get("count") or item.get("doc_count") or item.get("total_documents") or 0
                    if name:
                        inventory[name] = int(count)
                elif isinstance(item, str):
                    inventory[item] = -1  # count unknown, will probe

        elif isinstance(data, dict):
            collections = data.get("collections") or data.get("items") or data
            if isinstance(collections, list):
                return self._parse_inventory_json(collections)
            elif isinstance(collections, dict):
                for name, info in collections.items():
                    if isinstance(info, dict):
                        count = info.get("count") or info.get("total") or info.get("total_documents") or 0
                        inventory[name] = int(count)
                    elif isinstance(info, (int, float)):
                        inventory[name] = int(info)

        # For any collections with unknown (-1) count, probe count
        for name, count in list(inventory.items()):
            if count < 0:
                inventory[name] = self._get_collection_count(name)

        return inventory

    def _get_collection_count(self, collection_name: str) -> int:
        """Fetch total document count for a single collection."""
        endpoint = f"/api/documents/{self.environment}/{self.database}/{collection_name}"
        resp = self._get(endpoint, params={"limit": 1, "skip": 0})
        data = resp.json()
        return int(data.get("total", len(data.get("documents", []))))

    def _probe_known_collections(self) -> Dict[str, int]:
        """Fallback list of standard TASCK backend collections if inventory discovery API is unavailable."""
        known = [
            "users", "feedback", "v3_brands", "v3_brand_accounts", "v3_business_cases",
            "v3_connect_sources", "v3_contacts", "v3_contracts", "v3_email_outbox",
            "v3_interactions", "v3_opportunity_scans", "v3_analysis_jobs", "v3_alignment_snapshots"
        ]
        inventory = {}
        for col in known:
            try:
                count = self._get_collection_count(col)
                inventory[col] = count
            except Exception:
                pass
        return inventory

    def export_collection(self, collection_name: str, expected_count: int) -> Tuple[List[Dict[str, Any]], str, str]:
        """Paginate and retrieve all documents for a collection."""
        self.log(f"Exporting collection '{collection_name}' (expected: {expected_count} docs)...")

        endpoint = f"/api/documents/{self.environment}/{self.database}/{collection_name}"
        all_documents: List[Dict[str, Any]] = []
        skip = 0

        while True:
            resp = self._get(endpoint, params={"limit": PAGE_LIMIT, "skip": skip})
            data = resp.json()

            docs = data.get("documents", [])
            if not docs and isinstance(data, list):
                docs = data

            all_documents.extend(docs)

            total_server = data.get("total", expected_count)
            has_next = data.get("has_next", False)

            self.log(f"  [{collection_name}] Fetched {len(all_documents)}/{total_server} documents (skip={skip})...")

            if not docs or not has_next or len(all_documents) >= total_server:
                break

            skip += PAGE_LIMIT

        actual_count = len(all_documents)
        if actual_count != expected_count:
            error_msg = f"COUNT MISMATCH for collection '{collection_name}': expected {expected_count}, got {actual_count}!"
            self.log(f"ERROR: {error_msg}")
            raise RuntimeError(error_msg)

        # Write to JSON file
        os.makedirs(self.output_dir, exist_ok=True)
        json_filename = f"{collection_name}.json"
        json_path = os.path.join(self.output_dir, json_filename)

        json_bytes = json.dumps(all_documents, indent=2, ensure_ascii=False).encode("utf-8")
        with open(json_path, "wb") as f:
            f.write(json_bytes)

        sha256_hash = hashlib.sha256(json_bytes).hexdigest()
        self.log(f"  [{collection_name}] Saved {actual_count} documents to {json_filename} (SHA256: {sha256_hash[:12]}...)")

        return all_documents, json_filename, sha256_hash

    def run(self, collection_filter: str = None, dry_run: bool = False) -> bool:
        """Run inventory discovery and export process."""
        self.log("==================================================")
        self.log("Starting TASCK Emergent Production Export Process")
        self.log("==================================================")

        inventory = self.fetch_inventory()

        if collection_filter:
            if collection_filter not in inventory:
                self.log(f"Collection '{collection_filter}' not found in inventory. Probing count...")
                try:
                    inventory = {collection_filter: self._get_collection_count(collection_filter)}
                except Exception as e:
                    raise RuntimeError(f"Collection '{collection_filter}' could not be queried: {mask_session_id(str(e), self.session_id)}")
            else:
                inventory = {collection_filter: inventory[collection_filter]}

        self.log("\n--- COLLECTION INVENTORY ---")
        total_expected = 0
        for col_name, count in inventory.items():
            self.log(f"  * {col_name:30s}: {count:6d} documents")
            total_expected += count
        self.log(f"Total expected documents across {len(inventory)} collection(s): {total_expected}\n")

        if dry_run:
            self.log("DRY-RUN MODE: Inventory completed. No document exports performed.")
            return True

        # Perform Export
        os.makedirs(self.output_dir, exist_ok=True)
        manifest_collections = {}
        sha256_entries = []
        total_exported = 0
        all_success = True

        for col_name, expected_count in inventory.items():
            try:
                docs, filename, sha256 = self.export_collection(col_name, expected_count)
                exported_count = len(docs)
                total_exported += exported_count

                manifest_collections[col_name] = {
                    "expected_count": expected_count,
                    "exported_count": exported_count,
                    "status": "SUCCESS",
                    "file": filename,
                    "sha256": sha256,
                }
                sha256_entries.append(f"{sha256}  {filename}\n")

            except Exception as e:
                all_success = False
                safe_err = mask_session_id(str(e), self.session_id)
                manifest_collections[col_name] = {
                    "expected_count": expected_count,
                    "exported_count": 0,
                    "status": "FAILED",
                    "error": safe_err,
                }

        # Write SHA256SUMS file
        sha256sums_path = os.path.join(self.output_dir, "SHA256SUMS")
        with open(sha256sums_path, "w", encoding="utf-8") as f:
            f.writelines(sha256_entries)

        # Write manifest.json
        manifest_data = {
            "export_timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "environment": self.environment,
            "database": self.database,
            "total_expected_documents": total_expected,
            "total_exported_documents": total_exported,
            "overall_status": "SUCCESS" if all_success else "FAILED",
            "collections": manifest_collections,
        }

        manifest_path = os.path.join(self.output_dir, "manifest.json")
        with open(manifest_path, "w", encoding="utf-8") as f:
            json.dump(manifest_data, f, indent=2)

        # Print Final Summary Table
        self.log("\n==================================================")
        self.log("EXPORT SUMMARY")
        self.log("==================================================")
        self.log(f"{'Collection':<30s} | {'Expected':<10s} | {'Exported':<10s} | {'Status':<10s}")
        self.log("-" * 70)
        for col_name, info in manifest_collections.items():
            status = info["status"]
            exp = info["expected_count"]
            act = info["exported_count"]
            self.log(f"{col_name:<30s} | {exp:<10d} | {act:<10d} | {status:<10s}")
        self.log("-" * 70)
        self.log(f"{'TOTALS':<30s} | {total_expected:<10d} | {total_exported:<10d} | {'SUCCESS' if all_success else 'FAILED':<10s}")
        self.log(f"Manifest written to: {manifest_path}")
        self.log(f"Checksums written to: {sha256sums_path}\n")

        if not all_success:
            raise RuntimeError("Export completed with errors. See manifest.json for details.")

        return True


def main():
    parser = argparse.ArgumentParser(description="TASCK Emergent Production MongoDB Exporter")
    parser.add_argument(
        "--base-url",
        default=os.environ.get("EMERGENT_VIEWER_BASE_URL", DEFAULT_BASE_URL),
        help=f"Emergent MongoDB Viewer base URL (default: {DEFAULT_BASE_URL})",
    )
    parser.add_argument(
        "--session-id",
        default=os.environ.get("EMERGENT_VIEWER_SESSION_ID", ""),
        help="Emergent MongoDB Viewer session ID (env: EMERGENT_VIEWER_SESSION_ID)",
    )
    parser.add_argument(
        "--environment",
        default=DEFAULT_ENV,
        help=f"Emergent environment name (default: {DEFAULT_ENV})",
    )
    parser.add_argument(
        "--database",
        default=DEFAULT_DB,
        help=f"Emergent database name (default: {DEFAULT_DB})",
    )
    parser.add_argument(
        "--output-dir",
        default="infra/emergent-export/output",
        help="Output directory for exported JSON files (default: infra/emergent-export/output)",
    )
    parser.add_argument(
        "--collection",
        default=None,
        help="Export only a single collection (useful for initial test)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Retrieve collection inventory only; do not export document data",
    )

    args = parser.parse_args()

    if not args.session_id:
        print("ERROR: EMERGENT_VIEWER_SESSION_ID environment variable or --session-id argument is required.", file=sys.stderr)
        print("Usage: EMERGENT_VIEWER_SESSION_ID='<session_id>' python infra/emergent-export/export.py", file=sys.stderr)
        sys.exit(1)

    try:
        exporter = EmergentExporter(
            base_url=args.base_url,
            session_id=args.session_id,
            environment=args.environment,
            database=args.database,
            output_dir=args.output_dir,
        )
        exporter.run(collection_filter=args.collection, dry_run=args.dry_run)
    except Exception as e:
        safe_err = mask_session_id(str(e), args.session_id)
        print(f"\nFATAL EXPORT ERROR: {safe_err}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
