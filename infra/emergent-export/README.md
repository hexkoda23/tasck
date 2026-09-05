# TASCK Emergent Production MongoDB Exporter

This is a local-only, read-only Python exporter tool designed to export production MongoDB collections from Emergent's authenticated Mongo View API (`https://mongoview.emergent.host`).

## Requirements

- Python 3.8+
- `requests` library (`pip install requests`)

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `EMERGENT_VIEWER_SESSION_ID` | **Required.** Your authenticated session ID from Chrome DevTools / Mongo View | None |
| `EMERGENT_VIEWER_BASE_URL` | Base URL for Emergent Mongo View API | `https://mongoview.emergent.host` |

## Quick Start

### 1. Dry Run (Inventory Check Only)
Verify connection and discover collection document counts without downloading document contents:

```bash
export EMERGENT_VIEWER_SESSION_ID="your-session-id-here"
python infra/emergent-export/export.py --dry-run
```

On Windows PowerShell:
```powershell
$env:EMERGENT_VIEWER_SESSION_ID="your-session-id-here"
python infra/emergent-export/export.py --dry-run
```

### 2. Single Small Collection Test
Run a test export against a single small collection (e.g. `users`) to verify output format and manifest generation before a full export:

```bash
python infra/emergent-export/export.py --collection users
```

### 3. Full Production Export
Export all collections from `tasck-live-demo-1-test_database`:

```bash
python infra/emergent-export/export.py
```

## Outputs

All output files are saved in `infra/emergent-export/output/`:

- `<collection>.json`: Indented UTF-8 JSON array containing all documents for that collection.
- `manifest.json`: Metadata manifest containing timestamp, expected vs exported document counts, sha256 hashes, and overall export status.
- `SHA256SUMS`: Standard checksum file for verifying data integrity of exported JSON files.

## Safety Guarantees

- **Read-Only**: Performs HTTP `GET` requests only. Never writes, modifies, or deletes any data in Emergent.
- **No Azure Access**: Does not connect to or alter the Azure MongoDB or Azure resources.
- **Credential Masking**: `EMERGENT_VIEWER_SESSION_ID` is masked (`***REDACTED***`) in all terminal output and logs.
- **Verification**: Verifies that the exported document count for every collection exactly matches the expected inventory count, failing loudly if there is any mismatch.
