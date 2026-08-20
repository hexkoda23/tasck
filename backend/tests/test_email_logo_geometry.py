"""Regression: the TASCK mark in transactional email is a CIRCLE, not an ellipse.

Client report (Aug 2026): the logo arrived visibly squashed in brand and
creator mail. The source is a perfect 180x180 square, but the header markup
asked for `width:120px` while clamping `max-height:44px`, so a 1:1 image was
rendered at 2.73:1.

Every transactional email - brand welcome, credential resend, alignment
snapshot, pitch deck, creative brief - shares `_smtp_transactional_html`, so
these assertions cover all of them at once.

Size is pinned to 76px: the approved 0.787" letterhead logo at the 96 CSS px
per inch mail clients assume (0.787 * 96 = 75.6), keeping the email mark the
same size as the one in the attached .docx.
"""
import os
import re
from io import BytesIO

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv("/app/backend/.env")

EXPECTED_PX = 76


def _router():
    from v3_routes import make_v3_router
    client = AsyncIOMotorClient(os.environ["MONGO_URL"], serverSelectionTimeoutMS=400)
    db = client[os.environ["DB_NAME"]]
    return make_v3_router(db)


def _logo_img_tag(html: str) -> str:
    match = re.search(r"<img\b[^>]*>", html, re.I | re.S)
    assert match, "no <img> tag in the transactional email header"
    return match.group(0)


def test_source_logo_is_square():
    """If the source stops being square, no amount of markup can save it."""
    from PIL import Image
    data = _router()._email_logo_bytes()
    assert data, "email logo bytes are empty"
    img = Image.open(BytesIO(data))
    assert img.width == img.height, f"email logo source is {img.width}x{img.height}, not square"


def test_logo_rendered_square_at_expected_size():
    r = _router()
    tag = _logo_img_tag(r._smtp_transactional_html("Hello there.", "hello@tasck.example"))

    width_attr = re.search(r'\bwidth="(\d+)"', tag)
    height_attr = re.search(r'\bheight="(\d+)"', tag)
    assert width_attr and height_attr, f"logo needs explicit width AND height attributes: {tag}"
    assert int(width_attr.group(1)) == int(height_attr.group(1)) == EXPECTED_PX, tag

    css_w = re.search(r"width:\s*(\d+)px", tag)
    css_h = re.search(r"height:\s*(\d+)px", tag)
    assert css_w and css_h, f"logo needs explicit CSS width AND height: {tag}"
    assert int(css_w.group(1)) == int(css_h.group(1)) == EXPECTED_PX, tag


def test_no_clamp_can_distort_the_circle():
    """max-height / max-width against a fixed width is what squashed it."""
    r = _router()
    tag = _logo_img_tag(r._smtp_transactional_html("Hello there.", "hello@tasck.example"))
    assert "max-height" not in tag, f"max-height re-introduces the squash: {tag}"
    assert "max-width" not in tag, f"max-width re-introduces the squash: {tag}"
    assert "height:auto" not in tag.replace(" ", ""), f"height:auto with a fixed width distorts: {tag}"


def test_constant_matches_the_docx_letterhead_size():
    """76px is 0.787" at 96 CSS px/in - keep email and .docx in step."""
    r = _router()
    assert r._EMAIL_LOGO_PX == EXPECTED_PX
    assert round(r.TASCK_LOGO_SIZE_IN * 96) == EXPECTED_PX


def test_geometry_holds_for_the_cid_variant():
    """Emails attach the logo by CID; that path must be square too."""
    r = _router()
    tag = _logo_img_tag(
        r._smtp_transactional_html("Hello there.", "hello@tasck.example", logo_src="cid:tasck-logo")
    )
    assert 'src="cid:tasck-logo"' in tag, tag
    assert f'width="{EXPECTED_PX}"' in tag and f'height="{EXPECTED_PX}"' in tag, tag
    assert "max-height" not in tag, tag
