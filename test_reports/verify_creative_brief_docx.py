#!/usr/bin/env python3
"""Focused regression check for TASCK Creative Brief DOCX template.

Verifies the sent-brief download endpoint and unsent preview endpoint produce
DOCX packages with the required fonts/colours, letterhead media, header/footer
XML, and preserved template section text.
"""

from __future__ import annotations

import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import zipfile
from pathlib import Path


BASE_URL = "http://localhost:8001"
BC_ID = "bc-0ae422a0dc"
OUT_DIR = Path(f"/tmp/creative_brief_docx_verify_{int(time.time())}")


def http_json(method: str, path: str, payload: dict | None = None):
    body = None
    headers = {"Accept": "application/json"}
    if payload is not None:
        body = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(BASE_URL + path, data=body, method=method, headers=headers)
    with urllib.request.urlopen(req, timeout=30) as resp:
        raw = resp.read()
        return resp.status, json.loads(raw.decode("utf-8"))


def http_bytes(method: str, path: str, payload: dict | None = None) -> tuple[int, dict, bytes]:
    body = None
    headers = {}
    if payload is not None:
        body = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(BASE_URL + path, data=body, method=method, headers=headers)
    with urllib.request.urlopen(req, timeout=60) as resp:
        return resp.status, dict(resp.headers), resp.read()


def contains_run(xml: str, font: str, color: str) -> bool:
    """True when a single Word run has the required font and colour."""
    for run in re.findall(r"<w:r(?:\s[^>]*)?>.*?</w:r>", xml, flags=re.DOTALL):
        if f'w:ascii="{font}"' in run and f'w:val="{color}"' in run:
            return True
    return False


def extract_text(xml: str) -> str:
    texts = re.findall(r"<w:t(?:\s[^>]*)?>(.*?)</w:t>", xml, flags=re.DOTALL)
    return "\n".join(t.replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">") for t in texts)


def verify_docx(label: str, path: Path) -> dict:
    result = {"label": label, "path": str(path), "checks": {}, "failures": []}
    try:
        with zipfile.ZipFile(path) as zf:
            names = set(zf.namelist())
            document_xml = zf.read("word/document.xml").decode("utf-8")
            header_xml = zf.read("word/header1.xml").decode("utf-8") if "word/header1.xml" in names else ""
            footer_xml = zf.read("word/footer1.xml").decode("utf-8") if "word/footer1.xml" in names else ""
    except Exception as exc:  # noqa: BLE001
        result["failures"].append(f"Could not open required DOCX XML: {exc}")
        return result

    media_expected = {
        "word/media/tasck_logo.png",
        "word/media/footer_contact.png",
        "word/media/decorative_curves.png",
    }
    required_text = [
        "1. Project Reference",
        "2. Context",
        "3. Role of the Creative",
        "4. Expected Scope",
        "5. Indicative Timeline",
        "6. Working Assumptions",
        "7. Fee Indication Request",
        "8. Availability & Conditions",
        "9. Confirmation",
    ]

    checks = result["checks"]
    checks["bebas_neue_light_blue_run"] = contains_run(document_xml, "Bebas Neue", "4A90E2")
    checks["century_gothic_black_run"] = contains_run(document_xml, "Century Gothic", "000000")
    checks["media_files_present"] = sorted(media_expected) == sorted(media_expected & names)
    checks["header_has_watermark_vml"] = '<v:shape id="TasckWatermark"' in header_xml
    checks["header_has_banner_drawing"] = "<w:drawing>" in header_xml and "TASCK banner" in header_xml
    checks["footer_has_contact_strip_drawing"] = "<w:drawing>" in footer_xml and "Contact strip" in footer_xml
    text = extract_text(document_xml)
    checks["required_section_text_present"] = all(s in text for s in required_text)
    checks["document_size_bytes"] = path.stat().st_size
    checks["media_entries"] = sorted(n for n in names if n.startswith("word/media/"))

    for key, ok in checks.items():
        if isinstance(ok, bool) and not ok:
            result["failures"].append(key)
    return result


def main() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    report: dict = {"base_url": BASE_URL, "business_case_id": BC_ID, "out_dir": str(OUT_DIR), "docs": []}

    try:
        q = urllib.parse.urlencode({"business_case_id": BC_ID})
        status, briefs = http_json("GET", f"/api/v3/creative-briefs?{q}")
        report["list_status"] = status
        report["brief_count"] = len(briefs) if isinstance(briefs, list) else None
        if not isinstance(briefs, list) or not briefs:
            report["fatal"] = "No sent creative briefs found for required business case; cannot test /creative-briefs/{brief_id}/docx."
            print(json.dumps(report, indent=2))
            return 2
        brief_id = briefs[0].get("id")
        report["sent_brief_id"] = brief_id

        sent_status, sent_headers, sent_bytes = http_bytes("GET", f"/api/v3/creative-briefs/{brief_id}/docx")
        sent_path = OUT_DIR / "sent_brief.docx"
        sent_path.write_bytes(sent_bytes)
        report["sent_download"] = {
            "status": sent_status,
            "content_type": sent_headers.get("Content-Type"),
            "bytes": len(sent_bytes),
        }
        report["docs"].append(verify_docx("sent_brief", sent_path))

        preview_payload = {
            "subject": "QA Preview Creative Brief",
            "brief_text": "QA preview body: confirm fonts, footer, logo, watermark, and template sections.",
            "creator_name": "QA Creator",
        }
        preview_status, preview_headers, preview_bytes = http_bytes(
            "POST", f"/api/v3/business-cases/{BC_ID}/creative-briefs/preview-docx", preview_payload
        )
        preview_path = OUT_DIR / "preview_brief.docx"
        preview_path.write_bytes(preview_bytes)
        report["preview_download"] = {
            "status": preview_status,
            "content_type": preview_headers.get("Content-Type"),
            "bytes": len(preview_bytes),
        }
        report["docs"].append(verify_docx("preview_brief", preview_path))

    except urllib.error.HTTPError as exc:
        report["fatal"] = f"HTTP {exc.code}: {exc.read().decode('utf-8', errors='replace')[:500]}"
        print(json.dumps(report, indent=2))
        return 2
    except Exception as exc:  # noqa: BLE001
        report["fatal"] = repr(exc)
        print(json.dumps(report, indent=2))
        return 2

    all_ok = all(not doc["failures"] for doc in report["docs"])
    report["all_ok"] = all_ok
    print(json.dumps(report, indent=2))
    (OUT_DIR / "verification_result.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    return 0 if all_ok else 1


if __name__ == "__main__":
    sys.exit(main())