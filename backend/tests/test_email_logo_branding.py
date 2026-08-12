"""Regression: every transactional email HTML wrapper embeds the TASCK logo.

The Brand Portal welcome, credential resend, and snapshot-send emails all
share `_smtp_transactional_html` as their HTML alternative. This test locks
in that:
- the wrapper injects an <img> tag using a data-URI logo (Gmail-friendly),
- the logo data URI is cached (called twice → same string),
- the brand-green header colour is preserved,
- the HTML alt fallback ("TASCK") is present so screen readers still read it.
"""
import os

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv("/app/backend/.env")


def _router():
    from v3_routes import make_v3_router
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ["DB_NAME"]]
    return make_v3_router(db)


def test_transactional_html_contains_logo_image():
    r = _router()
    html_out = r._smtp_transactional_html(
        "Welcome to your TASCK brand workspace.\n\nUsername: a@b.c\nTemporary password: XYZ",
        "hello@tasck.example",
    )
    assert '<img src="data:image/jpeg;base64,' in html_out
    assert 'alt="TASCK"' in html_out
    # Brand-green header strip must remain around the logo.
    assert "#1F4A3A" in html_out


def test_logo_data_uri_is_cached_and_small():
    r = _router()
    uri1 = r._email_logo_data_uri()
    uri2 = r._email_logo_data_uri()
    assert uri1 == uri2, "logo data URI must be cached across calls"
    assert uri1.startswith("data:image/jpeg;base64,"), uri1[:40]
    # Keep the inline logo under 15 KB — anything bigger bloats every email.
    assert len(uri1) < 15_000, f"logo data URI is {len(uri1)} chars (too heavy for email)"


def test_html_alternative_used_for_snapshot_and_welcome():
    """Both welcome and snapshot emails route through the same wrapper.

    The wrapper is used unconditionally for all `kind`s except when
    SMTP_SEND_ACCESS_HTML=false explicitly opts welcome mails out. The
    default is HTML ON, so both flows include the logo header.
    """
    r = _router()
    for body in [
        "Welcome to your TASCK brand workspace.\n\nUsername: a@b.c",  # welcome
        "Alignment Snapshot ready for approval.\n\nProject: Test",  # snapshot
        "Please re-review the updated Strategy Snapshot.",  # snapshot revision
    ]:
        html_out = r._smtp_transactional_html(body, "hello@tasck.example")
        assert '<img src="data:image/jpeg;base64,' in html_out, body[:40]
