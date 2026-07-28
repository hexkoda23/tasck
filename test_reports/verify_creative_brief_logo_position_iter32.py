#!/usr/bin/env python3
"""
Focused bug verification for Creative Brief DOCX letterhead logo placement.

Checks both the existing-brief download endpoint and the preview-docx endpoint:
1. Download DOCX from real local backend APIs.
2. Inspect generated DOCX XML/media for right-aligned header, watermark, footer strip,
   fonts and heading color.
3. Convert DOCX -> PDF with LibreOffice, render page 1 with pdftoppm, and measure the
   blue TASCK logo component position in the rendered PNG.
"""

from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import sys
import time
import zipfile
from pathlib import Path
from typing import Any, Dict, List, Tuple

import requests
from PIL import Image
import numpy as np


BASE_URL = os.environ.get("BACKEND_URL", "http://localhost:8001/api")
BUSINESS_CASE_ID = "bc-0ae422a0dc"
OUT_ROOT = Path("/app/test_reports/generated/creative_brief_logo_iter32")


def ensure_tools() -> None:
    missing = [tool for tool in ("libreoffice", "pdftoppm") if shutil.which(tool) is None]
    if missing:
        raise RuntimeError(f"Missing required conversion tools: {missing}")


def request_or_fail(method: str, url: str, **kwargs: Any) -> requests.Response:
    resp = requests.request(method, url, timeout=60, **kwargs)
    if not (200 <= resp.status_code < 300):
        raise RuntimeError(f"{method} {url} returned {resp.status_code}: {resp.text[:500]}")
    return resp


def download_docx_files(work_dir: Path) -> Tuple[List[Dict[str, Any]], Dict[str, Path]]:
    list_url = f"{BASE_URL}/v3/creative-briefs?business_case_id={BUSINESS_CASE_ID}"
    briefs = request_or_fail("GET", list_url).json()
    if not isinstance(briefs, list) or not briefs:
        raise RuntimeError(f"No creative briefs returned for business case {BUSINESS_CASE_ID}")
    brief_id = briefs[0].get("id")
    if not brief_id:
        raise RuntimeError(f"First brief has no id: {briefs[0]}")

    existing_path = work_dir / "existing_brief.docx"
    existing_resp = request_or_fail("GET", f"{BASE_URL}/v3/creative-briefs/{brief_id}/docx")
    existing_path.write_bytes(existing_resp.content)

    preview_path = work_dir / "preview_brief.docx"
    preview_payload = {
        "subject": "QA Logo Placement Check",
        "brief_text": "Short creative brief body used only to verify top-right TASCK logo placement.",
        "creator_name": "QA Creator",
    }
    preview_resp = request_or_fail(
        "POST",
        f"{BASE_URL}/v3/business-cases/{BUSINESS_CASE_ID}/creative-briefs/preview-docx",
        json=preview_payload,
        headers={"Content-Type": "application/json"},
    )
    preview_path.write_bytes(preview_resp.content)

    if existing_path.stat().st_size < 1000 or preview_path.stat().st_size < 1000:
        raise RuntimeError("Downloaded DOCX content is unexpectedly small")

    return briefs, {"existing": existing_path, "preview": preview_path}


def inspect_docx(docx_path: Path) -> Dict[str, Any]:
    with zipfile.ZipFile(docx_path) as zf:
        names = set(zf.namelist())
        header_xml = zf.read("word/header1.xml").decode("utf-8", errors="replace")
        footer_xml = zf.read("word/footer1.xml").decode("utf-8", errors="replace")
        document_xml = zf.read("word/document.xml").decode("utf-8", errors="replace")
        font_table = zf.read("word/fontTable.xml").decode("utf-8", errors="replace")
        logo_bytes = zf.read("word/media/tasck_logo.png")
        footer_bytes = zf.read("word/media/footer_contact.png")

    logo_tmp = docx_path.with_suffix(".logo.png")
    footer_tmp = docx_path.with_suffix(".footer.png")
    logo_tmp.write_bytes(logo_bytes)
    footer_tmp.write_bytes(footer_bytes)
    logo_size = Image.open(logo_tmp).size
    footer_size = Image.open(footer_tmp).size

    checks = {
        "has_header_right_alignment": bool(re.search(r'<w:jc\s+w:val="right"\s*/>', header_xml)),
        "has_watermark_shape": "TasckWatermark" in header_xml,
        "has_decorative_curves_media": "word/media/decorative_curves.png" in names,
        "has_footer_contact_media": "word/media/footer_contact.png" in names,
        "footer_has_center_alignment": bool(re.search(r'<w:jc\s+w:val="center"\s*/>', footer_xml)),
        "has_bebas_neue": "Bebas Neue" in document_xml or "Bebas Neue" in font_table,
        "has_century_gothic": "Century Gothic" in document_xml or "Century Gothic" in font_table,
        "has_heading_blue_4A90E2": "4A90E2" in document_xml,
        "logo_png_size": logo_size,
        "footer_png_size": footer_size,
    }
    checks["all_xml_sanity_checks_pass"] = all(
        checks[k]
        for k in (
            "has_header_right_alignment",
            "has_watermark_shape",
            "has_decorative_curves_media",
            "has_footer_contact_media",
            "footer_has_center_alignment",
            "has_bebas_neue",
            "has_century_gothic",
            "has_heading_blue_4A90E2",
        )
    )
    return checks


def run(cmd: List[str], cwd: Path) -> None:
    proc = subprocess.run(cmd, cwd=str(cwd), text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=120)
    if proc.returncode != 0:
        raise RuntimeError(f"Command failed ({proc.returncode}): {' '.join(cmd)}\nSTDOUT:\n{proc.stdout}\nSTDERR:\n{proc.stderr}")


def convert_and_render(docx_path: Path, work_dir: Path, label: str) -> Path:
    out_dir = work_dir / f"render_{label}"
    out_dir.mkdir(parents=True, exist_ok=True)
    run(["libreoffice", "--headless", "--convert-to", "pdf", "--outdir", str(out_dir), str(docx_path)], cwd=work_dir)
    pdf_path = out_dir / f"{docx_path.stem}.pdf"
    if not pdf_path.exists():
        pdfs = list(out_dir.glob("*.pdf"))
        if not pdfs:
            raise RuntimeError(f"LibreOffice did not produce a PDF for {docx_path}")
        pdf_path = pdfs[0]
    png_prefix = out_dir / f"{label}_page1"
    run(["pdftoppm", "-png", "-f", "1", "-singlefile", "-r", "150", str(pdf_path), str(png_prefix)], cwd=work_dir)
    png_path = png_prefix.with_suffix(".png")
    if not png_path.exists():
        raise RuntimeError(f"pdftoppm did not produce {png_path}")
    return png_path


def connected_components(mask: np.ndarray) -> List[Dict[str, Any]]:
    h, w = mask.shape
    visited = np.zeros(mask.shape, dtype=bool)
    comps: List[Dict[str, Any]] = []
    ys, xs = np.nonzero(mask)
    for start_y, start_x in zip(ys.tolist(), xs.tolist()):
        if visited[start_y, start_x] or not mask[start_y, start_x]:
            continue
        stack = [(start_y, start_x)]
        visited[start_y, start_x] = True
        min_x = max_x = start_x
        min_y = max_y = start_y
        count = 0
        while stack:
            y, x = stack.pop()
            count += 1
            if x < min_x: min_x = x
            if x > max_x: max_x = x
            if y < min_y: min_y = y
            if y > max_y: max_y = y
            for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                if 0 <= ny < h and 0 <= nx < w and (not visited[ny, nx]) and mask[ny, nx]:
                    visited[ny, nx] = True
                    stack.append((ny, nx))
        if count >= 20:
            comps.append({"bbox": [min_x, min_y, max_x, max_y], "area": count})
    return comps


def measure_logo_position(png_path: Path) -> Dict[str, Any]:
    image = Image.open(png_path).convert("RGB")
    arr = np.array(image)
    h, w, _ = arr.shape

    # The logo's blue circle is a saturated/dark blue in the top header. Limit to
    # the top quarter to avoid footer/heading artifacts, then find connected blobs.
    top_limit = int(h * 0.25)
    top = arr[:top_limit]
    r = top[:, :, 0].astype(np.int16)
    g = top[:, :, 1].astype(np.int16)
    b = top[:, :, 2].astype(np.int16)
    blue_mask = (b > 80) & (b > r + 35) & (b > g + 15) & (r < 120) & (g < 180)

    comps = connected_components(blue_mask)
    if not comps:
        raise RuntimeError(f"Could not detect a blue logo component in rendered image {png_path}")

    # Prefer a component with the approximate rendered logo size; fallback to largest.
    comps = sorted(comps, key=lambda c: c["area"], reverse=True)
    logo = comps[0]
    min_x, min_y, max_x, max_y = logo["bbox"]
    center_x = (min_x + max_x) / 2.0
    center_y = (min_y + max_y) / 2.0
    center_x_pct = center_x / w
    center_y_pct = center_y / h
    bbox_width_pct = (max_x - min_x + 1) / w
    bbox_height_pct = (max_y - min_y + 1) / h
    return {
        "png_path": str(png_path),
        "page_size_px": [w, h],
        "logo_blue_bbox_px": [int(min_x), int(min_y), int(max_x), int(max_y)],
        "logo_blue_area_px": int(logo["area"]),
        "logo_center_x_pct": round(center_x_pct, 4),
        "logo_center_y_pct": round(center_y_pct, 4),
        "logo_bbox_width_pct": round(bbox_width_pct, 4),
        "logo_bbox_height_pct": round(bbox_height_pct, 4),
        "top_right_pass": center_x_pct > 0.70,
        "not_centered_pass": not (0.45 <= center_x_pct <= 0.55),
        "component_count": len(comps),
        "top_components_sample": comps[:5],
    }


def main() -> int:
    ensure_tools()
    work_dir = OUT_ROOT / time.strftime("%Y%m%d_%H%M%S")
    work_dir.mkdir(parents=True, exist_ok=True)
    results: Dict[str, Any] = {"work_dir": str(work_dir), "base_url": BASE_URL}
    try:
        briefs, docx_paths = download_docx_files(work_dir)
        results["brief_count"] = len(briefs)
        results["brief_id_used"] = briefs[0].get("id")
        results["checks"] = {}
        for label, docx_path in docx_paths.items():
            xml_checks = inspect_docx(docx_path)
            png_path = convert_and_render(docx_path, work_dir, label)
            position = measure_logo_position(png_path)
            results["checks"][label] = {
                "docx_path": str(docx_path),
                "docx_size_bytes": docx_path.stat().st_size,
                "xml_media_checks": xml_checks,
                "rendered_logo_position": position,
                "pass": bool(xml_checks["all_xml_sanity_checks_pass"] and position["top_right_pass"] and position["not_centered_pass"]),
            }
        results["overall_pass"] = all(item["pass"] for item in results["checks"].values())
    except Exception as exc:  # keep structured output for the report
        results["overall_pass"] = False
        results["error"] = repr(exc)

    out_json = work_dir / "result.json"
    out_json.write_text(json.dumps(results, indent=2, default=str))
    print(json.dumps(results, indent=2, default=str))
    return 0 if results.get("overall_pass") else 1


if __name__ == "__main__":
    sys.exit(main())