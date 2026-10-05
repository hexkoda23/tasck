"""Unit tests for backend/official_brand_logo.py - no network, no database.

Covers: official-site candidates and verification (third-party pages such as
Pinterest never count), logo extraction from a page (logo <img> first, inline
<svg> recognised by aria-label / class / homepage link, icons only as a
fallback), SVG sanitising, and the backfill keep/re-check decision.

Run: cd backend && python -m pytest tests/test_official_brand_logo.py -q
"""
import base64
import pathlib
import sys

from lxml import html as lxml_html

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

import official_brand_logo as obl  # noqa: E402

GUCCI_LOGO_SVG = (
    '<svg viewBox="0 0 1312 210" fill="none" xmlns="http://www.w3.org/2000/svg" '
    'class="_brand_icon_113d3_1 _gucci_logo_1yorg_1" aria-label="Logo Gucci" aria-hidden="true">'
    '<path fill-rule="evenodd" d="M0 104.57C0 44.88 47.71 0 111.19 0L180 21Z" fill="var(--_g-logo-fill-color)"></path>'
    '</svg>'
)
GUCCI_PAGE = (
    '<html><head><title>Gucci® International Site | Luxury Fashion</title>'
    '<script type="application/ld+json">{"@type":"Organization","name":"Gucci",'
    '"logo":"https://www.gucci.com/componentsfront/_public/brand/logo.png"}</script>'
    '<link rel="apple-touch-icon" href="/icons/AppIcon_120.png"></head><body>'
    '<nav><button aria-label="Search"><svg viewBox="0 0 24 24"><path d="M1 1h2v2z"/></svg></button></nav>'
    '<div class="_logoContainer_sbhzg_1" id="logo"><a class="_logoAnchor" href="/int/en/" '
    'aria-label="gucci - go to homepage">' + GUCCI_LOGO_SVG + '</a></div>'
    '<footer><img class="payment-logo" alt="Visa logo" src="/img/visa.png"></footer></body></html>'
)


def _doc(page):
    return lxml_html.fromstring(obl._clean_html(page))


# ---------------------------------------------------------------- domains
def test_third_party_pages_are_never_official_candidates():
    brand = {"company": "Gucci", "website": "https://www.pinterest.com/pin/gucci-pet--328833210273285681",
             "source_url": "https://www.pinterest.com/pin/gucci-pet--328833210273285681"}
    urls = [u for u, _ in obl.candidate_sites(brand)]
    assert not any("pinterest" in u for u in urls)
    assert urls[0] == "https://www.gucci.com"


def test_declared_brand_domain_is_tried_first_and_email_domain_used():
    brand = {"company": "Paystack", "website": "https://paystack.com", "email": "hello@paystack.com"}
    sites = obl.candidate_sites(brand)
    assert sites[0] == ("https://paystack.com", "declared")
    brand = {"company": "Zestora Foods Limited", "email": "ops@zestora.ng"}
    assert ("https://zestora.ng", "email") in obl.candidate_sites(brand)


def test_domain_matching_handles_country_tlds_and_noise_words():
    assert obl.domain_matches_brand("mtn.com.ng", "MTN Nigeria")
    assert obl.domain_matches_brand("coca-cola.co.uk", "Coca Cola")
    assert obl.domain_matches_brand("www.gucci.com", "Gucci")
    assert not obl.domain_matches_brand("pinterest.com", "Gucci")


def test_guessed_site_must_be_the_brand_by_name_and_say_so():
    doc = _doc(GUCCI_PAGE)
    assert obl.verify_site("guess", "https://www.gucci.com", "https://www.gucci.com/int/en", doc, "Gucci")
    parked = _doc("<html><head><title>This domain is for sale</title></head></html>")
    assert not obl.verify_site("guess", "https://www.gucci.com", "https://www.gucci.com", parked, "Gucci")


def test_declared_article_on_unrelated_site_is_rejected_but_homepage_trusted():
    article = _doc("<html><head><title>Ten luxury trends</title></head></html>")
    assert not obl.verify_site("declared", "https://blog.example.org/2024/10/luxury-trends",
                               "https://blog.example.org/2024/10/luxury-trends", article, "Gucci")
    home = _doc("<html><head><title>Welcome</title></head></html>")
    assert obl.verify_site("declared", "https://opensocietyfoundations.org",
                           "https://www.opensocietyfoundations.org", home, "OSF")
    assert not obl.verify_site("declared", "https://www.pinterest.com/pin/1/",
                               "https://www.pinterest.com/pin/1", home, "Gucci")


# ---------------------------------------------------------------- extraction
def test_gucci_inline_svg_logo_is_chosen_over_icons_and_badges():
    cands = obl.extract_logo_candidates(GUCCI_PAGE, "https://www.gucci.com/int/en", "Gucci")
    assert cands[0]["kind"] == "svg"
    assert 'aria-label="Logo Gucci"' in cands[0]["svg"]
    # The search icon and the footer Visa badge are not candidates.
    assert not any("visa" in (c.get("url") or "") for c in cands)
    assert not any('viewBox="0 0 24 24"' in (c.get("svg") or "") for c in cands)
    # Structured-data logo and app icon remain as lower-ranked fallbacks.
    assert [c["kind"] for c in cands[1:]] == ["icon", "icon"]


def test_logo_img_in_header_wins_over_inline_svg():
    page = ('<html><body><header><a href="/"><img class="site-logo" alt="Acme" src="/assets/acme-logo.svg"></a>'
            '<svg class="logo-mark" viewBox="0 0 100 40"><path d="M0 0h10v10z"/></svg></header></body></html>')
    cands = obl.extract_logo_candidates(page, "https://acme.com", "Acme")
    assert cands[0] == {"kind": "img", "url": "https://acme.com/assets/acme-logo.svg", "score": cands[0]["score"],
                        "source": "the logo image on the brand's official website"}


def test_svg_in_homepage_link_is_recognised_without_logo_words():
    page = ('<html><body><header><a href="/" aria-label="Home"><svg viewBox="0 0 300 60">'
            '<path d="M0 0h300v60z"/></svg></a></header></body></html>')
    cands = obl.extract_logo_candidates(page, "https://brand.com", "Brand")
    assert cands and cands[0]["kind"] == "svg"


def test_page_without_logo_gives_only_icons_or_nothing():
    page = '<html><head><link rel="icon" href="/favicon.ico"></head><body><p>Hello</p></body></html>'
    cands = obl.extract_logo_candidates(page, "https://plain.com", "Plain")
    assert [c["kind"] for c in cands] == ["icon"]
    assert obl.extract_logo_candidates("<html><body></body></html>", "https://x.com", "X") == []


# ---------------------------------------------------------------- sanitising
def test_sanitised_gucci_svg_is_standalone_and_visible():
    svg = obl.sanitize_svg(GUCCI_LOGO_SVG)
    assert svg.startswith('<svg xmlns="http://www.w3.org/2000/svg"')
    assert "var(" not in svg and 'fill="currentColor"' in svg
    assert 'width="1312"' in svg and 'height="210"' in svg
    assert "aria-hidden" not in svg
    uri = obl.svg_data_uri(svg)
    assert uri.startswith("data:image/svg+xml;base64,")
    assert base64.b64decode(uri.split(",", 1)[1]).decode() == svg


def test_sanitiser_strips_scripts_handlers_and_external_references():
    dirty = ('<svg viewBox="0 0 10 10" onload="alert(1)"><script>alert(2)</script>'
             '<foreignObject><div>x</div></foreignObject><image href="https://evil.test/x.png"/>'
             '<a href="javascript:alert(3)"><path d="M0 0h1v1z" fill="red" onclick="alert(4)"/></a>'
             '<use href="https://evil.test/sprite.svg#x"/>'
             '<rect width="5" height="5" style="fill:url(https://evil.test/p.png)"/>'
             '<style>@import url(https://evil.test/a.css); .a{fill:red}</style>'
             '<animate attributeName="href" to="javascript:alert(5)"/></svg>')
    clean = obl.sanitize_svg(dirty)
    lowered = clean.lower()
    for bad in ("script", "onload", "onclick", "foreignobject", "<image", "javascript", "evil.test",
                "@import", "<animate", "<a "):
        assert bad not in lowered, bad
    assert "<path" in clean and 'fill="red"' in clean


def test_sanitiser_rejects_entities_empty_and_unresolvable_sprites():
    assert obl.sanitize_svg('<!DOCTYPE svg [<!ENTITY x "y">]><svg><path d="M0 0z"/></svg>') == ""
    assert obl.sanitize_svg('<svg viewBox="0 0 1 1"></svg>') == ""
    assert obl.sanitize_svg('<svg viewBox="0 0 1 1"><use href="#missing"/></svg>') == ""
    assert obl.sanitize_svg("not svg") == ""


def test_sprite_symbol_is_inlined_from_the_page():
    page = ('<svg style="display:none"><symbol id="brand-logo" viewBox="0 0 50 10"><path d="M0 0h50v10z"/>'
            '</symbol></svg>')
    svg = obl.sanitize_svg('<svg viewBox="0 0 50 10"><use href="#brand-logo"/></svg>', obl.symbol_resolver(page))
    assert 'id="brand-logo"' in svg and "<path" in svg


def test_unpainted_svg_gets_a_visible_fill():
    svg = obl.sanitize_svg('<svg viewBox="0 0 10 10" fill="none"><path d="M0 0h5v5z"/></svg>')
    assert 'fill="#000000"' in svg


# ---------------------------------------------------------------- backfill decision
def test_backfill_keeps_admin_and_official_logos_and_rechecks_the_rest():
    keep = [
        {"company": "A", "logo_url": "https://x.com/a.png", "logo_source": "Entered by an admin"},
        {"company": "B", "logo_url": "data:image/png;base64,AAAA"},
        {"company": "Gucci", "logo_url": "https://www.gucci.com/logo.png"},
        {"company": "Shop", "logo_url": "https://cdn.shopify.com/s/logo.png",
         "logo_source": "the logo image on the brand's official website", "logo_source_page": "https://shop.ng"},
    ]
    for brand in keep:
        assert obl.logo_review_reason(brand) == "", brand
    assert obl.logo_review_reason({"company": "Gucci"}) == "no logo saved"
    assert "third-party" in obl.logo_review_reason({"company": "Gucci", "logo_url": "https://i.pinimg.com/x.jpg"})
    assert "favicon" in obl.logo_review_reason(
        {"company": "Gucci", "logo_url": "https://www.google.com/s2/favicons?sz=256&domain=gucci.com"})


def test_image_check_rejects_html_pixels_and_tiny_pngs():
    assert not obl.image_bytes_ok(b"<html>404</html>", "text/html")
    assert not obl.image_bytes_ok(b"GIF89a" + b"\x00" * 40, "image/gif")
    tiny_png = b"\x89PNG\r\n\x1a\n" + b"\x00\x00\x00\rIHDR" + (16).to_bytes(4, "big") + (16).to_bytes(4, "big") + b"\x00" * 600
    assert not obl.image_bytes_ok(tiny_png, "image/png")
    assert obl.image_bytes_ok(b'<svg xmlns="http://www.w3.org/2000/svg">' + b" " * 200 + b"</svg>", "image/svg+xml")


def test_sprite_files_referenced_by_a_logo_are_found_and_sized():
    page = ('<html><body><script>x.open("GET","/dist/icons/icons.svg")</script>'
            '<a href="/" class="g-header__logo"><svg><use xlink:href="#icon--logo"></use></svg></a></body></html>')
    urls = obl._sprite_urls('<svg><use href="/assets/sprite.svg#logo"/></svg>', page, "https://brand.org/")
    assert urls == ["https://brand.org/assets/sprite.svg", "https://brand.org/dist/icons/icons.svg"]
    sprite = '<svg><symbol id="icon--logo" viewBox="0 0 123 34"><path d="M0 0h123v34z"/></symbol></svg>'
    svg = obl.sanitize_svg('<svg><use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#icon--logo"></use></svg>',
                           obl.symbol_resolver(sprite))
    assert 'viewBox="0 0 123 34"' in svg and 'width="123"' in svg


def test_website_values_with_list_punctuation_are_usable():
    assert obl._normalise_url("http://www.opensocietyfoundations.org/,") == "http://www.opensocietyfoundations.org/"


def test_declared_website_is_tried_before_name_guesses():
    brand = {"company": "OSF", "website": "http://www.opensocietyfoundations.org/"}
    sites = obl.candidate_sites(brand)
    assert sites[0] == ("http://www.opensocietyfoundations.org/", "declared")
    assert [kind for _, kind in sites[1:]] == ["guess", "guess"]
