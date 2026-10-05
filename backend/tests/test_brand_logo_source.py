"""Regression: the brand scraper records where the logo it found came from.

Locks in:
- A logo found on the brand's website is saved with `logo_source` (what kind
  of mark it was) and `logo_source_page` (the page it was found on).
- The scrape response carries the same two fields.
- An admin-entered logo can be saved with its own source through PATCH.

Serves a tiny brand website from this process so the scrape needs no
internet. Needs the backend running (REACT_APP_BACKEND_URL / BACKEND_URL,
default http://localhost:8001) on the same machine.
"""

import os
import struct
import threading
import uuid
import zlib
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import pytest
import requests

BACKEND_URL = (
    os.environ.get("REACT_APP_BACKEND_URL")
    or os.environ.get("BACKEND_URL")
    or "http://localhost:8001"
).rstrip("/")
API = f"{BACKEND_URL}/api/v3"


def _png(size: int = 64) -> bytes:
    raw = b"".join(b"\x00" + os.urandom(4 * size) for _ in range(size))

    def chunk(tag: bytes, data: bytes) -> bytes:
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(raw)) + chunk(b"IEND", b""))


@pytest.fixture(scope="module")
def brand_site():
    logo = _png()
    port_holder = {}

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *args):  # keep pytest output clean
            pass

        def do_GET(self):
            if self.path.startswith("/brand-logo.png"):
                body, ctype = logo, "image/png"
            elif self.path in ("/", "/index.html"):
                base = f"http://127.0.0.1:{port_holder['port']}"
                body = (
                    "<html><head><title>Logosource Brand</title>"
                    '<script type="application/ld+json">{"@context":"https://schema.org","@type":"Organization",'
                    f'"name":"Logosource Brand","logo":"{base}/brand-logo.png"}}</script>'
                    "</head><body><p>Logosource Brand</p></body></html>"
                ).encode()
                ctype = "text/html"
            else:
                self.send_response(404)
                self.end_headers()
                return
            self.send_response(200)
            self.send_header("Content-Type", ctype)
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    port_holder["port"] = server.server_address[1]
    threading.Thread(target=server.serve_forever, daemon=True).start()
    yield f"http://127.0.0.1:{port_holder['port']}"
    server.shutdown()


@pytest.fixture
def brand_id(brand_site):
    r = requests.post(f"{API}/brands", json={
        "company": f"Logosource Brand {uuid.uuid4().hex[:6]}",
        "industry": "Testing",
        "primary_contact": "QA",
        "website": brand_site + "/",
    }, timeout=20)
    assert r.status_code == 200, r.text
    bid = r.json()["id"]
    yield bid
    requests.delete(f"{API}/brands/{bid}", timeout=20)


def test_scraped_logo_is_saved_with_its_source(brand_site, brand_id):
    r = requests.post(f"{API}/brands/{brand_id}/scrape", timeout=120)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["logo_url"] == f"{brand_site}/brand-logo.png"
    # Found by the official-site lookup (official_brand_logo.py).
    assert body["logo_source"] == "the logo in the official website's structured data"
    assert body["logo_source_page"].rstrip("/") == brand_site

    brand = requests.get(f"{API}/brands/{brand_id}", timeout=20).json()
    brand = brand.get("brand", brand)
    assert brand["logo_url"] == body["logo_url"]
    assert brand["logo_source"] == body["logo_source"]
    assert brand["logo_source_page"] == body["logo_source_page"]


def test_admin_entered_logo_keeps_its_source(brand_id):
    r = requests.patch(f"{API}/brands/{brand_id}", json={
        "logo_url": "https://example.com/logo.png",
        "brand_logo_url": "https://example.com/logo.png",
        "logo_source": "Entered by an admin",
        "logo_source_page": "",
    }, timeout=20)
    assert r.status_code == 200, r.text
    brand = r.json()["brand"]
    assert brand["logo_source"] == "Entered by an admin"
    assert brand["logo_source_page"] == ""
