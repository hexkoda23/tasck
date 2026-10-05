"""Find a brand's logo on its OFFICIAL website.

Used by the brand scraper (POST /api/v3/brands/{id}/scrape) and by the brand
logo backfill (POST /api/v3/admin/brand-logo-backfill). Order of work:

1. Work out which site is the brand's own and verify it (the declared
   website only when it is not a third-party page such as a Pinterest pin, a
   contact email on the brand's domain, and the obvious "<brand>.com"
   guesses - each confirmed by fetching it).
2. On that site, take the logo the site itself shows: a logo ``<img>``
   (its real asset URL), else an inline ``<svg>`` logo, recognised by
   aria-label / class / id / <title> mentioning "logo" or the brand, or by
   sitting inside the homepage link or the header.
3. Inline SVG markup is sanitised (see ``sanitize_svg``) and stored as an
   ``image/svg+xml`` data URI - the same inline form uploaded logos already
   use in ``logo_url``, so the frontend renders it with a plain ``<img>``.
4. Only when the official site has no usable logo asset do its icons (JSON-LD
   logo, og:logo, touch icon, favicon) come into play, and the caller may add
   a favicon-service fallback for the verified domain.

A site that merely mentions the brand (Pinterest, news, logo galleries,
marketplaces, social networks) is never treated as the brand's site, so its
logo is never returned.
"""

from __future__ import annotations

import base64
import re
from typing import Any, Callable, Dict, Iterable, List, Optional, Tuple
from urllib.parse import urljoin, urlparse

from lxml import etree
from lxml import html as lxml_html

# Browser-like request headers. Large brand sites (Akamai / Cloudflare bot
# managers - gucci.com among them) stall a request that announces itself as a
# bot until it times out, but answer an ordinary browser request at once.
BROWSER_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Upgrade-Insecure-Requests": "1",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
}
IMAGE_HEADERS = {**BROWSER_HEADERS, "Accept": "image/avif,image/webp,image/svg+xml,image/*,*/*;q=0.8",
                 "Sec-Fetch-Dest": "image", "Sec-Fetch-Mode": "no-cors"}

# Sites that host pages ABOUT brands (pins, galleries, press, directories,
# stock and logo libraries). Never a brand's own site, whatever they mention.
THIRD_PARTY_DOMAINS = frozenset({
    "pinterest.com", "pinterest.co.uk", "pinterest.ca", "pinterest.fr", "pinterest.de", "pinterest.it",
    "pinterest.es", "pinterest.com.au", "pin.it", "pinimg.com",
    "tumblr.com", "reddit.com", "redd.it", "quora.com", "flickr.com", "behance.net", "dribbble.com",
    "imgur.com", "giphy.com", "threads.net", "vk.com", "weibo.com", "fandom.com", "blogspot.com",
    "wikimedia.org", "wikipedia.org", "wikidata.org", "wikiwand.com",
    "brandsoftheworld.com", "seeklogo.com", "logos-world.net", "1000logos.net", "logowik.com",
    "worldvectorlogo.com", "logo.wine", "logodownload.org", "freebiesupply.com", "vectorlogo.zone",
    "freepik.com", "shutterstock.com", "gettyimages.com", "istockphoto.com", "alamy.com", "dreamstime.com",
    "vecteezy.com", "pngwing.com", "pngegg.com", "pngtree.com", "kindpng.com", "cleanpng.com",
    "stickpng.com", "pngitem.com", "unsplash.com", "pexels.com", "canva.com",
    "trustpilot.com", "zoominfo.com", "dnb.com", "owler.com", "craft.co", "apollo.io", "rocketreach.co",
    "bloomberg.com", "reuters.com", "forbes.com", "businessinsider.com", "cnbc.com", "bbc.com", "bbc.co.uk",
    "cnn.com", "nytimes.com", "theguardian.com", "vogue.com", "hypebeast.com", "techcrunch.com",
    "nairametrics.com", "punchng.com", "vanguardngr.com", "guardian.ng", "thecable.ng", "premiumtimesng.com",
    "instagram.com", "facebook.com", "fb.com", "x.com", "twitter.com", "tiktok.com", "linkedin.com",
    "snapchat.com", "youtube.com", "youtu.be", "whatsapp.com", "telegram.org", "t.me",
    "apps.apple.com", "itunes.apple.com", "play.google.com", "crunchbase.com", "producthunt.com",
    "indeed.com", "glassdoor.com", "yelp.com", "google.com", "bing.com", "duckduckgo.com",
    "amazon.com", "amazon.co.uk", "etsy.com", "ebay.com", "alibaba.com", "aliexpress.com", "jumia.com.ng",
    "jiji.ng", "konga.com", "github.com", "medium.com", "substack.com", "wordpress.com", "wix.com",
    "godaddy.com", "namecheap.com", "linktr.ee", "beacons.ai",
})

# Company-name filler words ignored when matching a brand name to a domain.
_NAME_NOISE = {
    "ltd", "limited", "inc", "incorporated", "co", "company", "corp", "corporation", "group", "global",
    "intl", "international", "nigeria", "ng", "africa", "plc", "holdings", "the", "and", "llc", "sa",
    "spa", "gmbh", "official", "brand", "foods", "food",
}
_PUBLIC_EMAIL_DOMAINS = {
    "gmail.com", "googlemail.com", "yahoo.com", "ymail.com", "outlook.com", "hotmail.com", "live.com",
    "icloud.com", "me.com", "aol.com", "proton.me", "protonmail.com", "zoho.com",
}
# Second-level labels that sit under a country code (brand.co.uk, brand.com.ng).
_SECOND_LEVEL = {"co", "com", "org", "net", "gov", "ac", "edu", "ltd", "plc", "sch", "mil"}

# Places a logo-like image or SVG does NOT belong to the brand: payment
# badges, partner strips, social icons, app-store badges, country flags...
_NEGATIVE_CONTEXT = re.compile(
    r"footer|payment|paypal|visa|mastercard|partner|sponsor|social|share|app-?store|google-?play|badge|"
    r"award|client|press|flag|country|cart|basket|bag-icon|avatar|profile|wishlist|search|close|arrow|"
    r"chevron|hamburger|menu-icon|icon-menu|trustpilot|cookie",
    re.I,
)
_HEADER_CONTEXT = re.compile(r"header|navbar|nav-bar|masthead|topbar|top-bar|site-nav|main-nav", re.I)
_LOGO_WORD = re.compile(r"logo|logotype|wordmark|brandmark|brand-mark|site-brand|navbar-brand", re.I)
# A path that is only a locale: /us, /en-gb, /ng/en, /int/en.
_LOCALE_ROOT = re.compile(r"^(/(?:[a-z]{2,3}|int)(?:[-_][a-z]{2})?){1,2}$", re.I)

MAX_SVG_BYTES = 150_000


# --------------------------------------------------------------------------
# names and domains
# --------------------------------------------------------------------------
def domain_of(url: Any) -> str:
    raw = str(url or "").strip()
    if not raw:
        return ""
    if "://" not in raw:
        raw = "https://" + raw
    try:
        host = (urlparse(raw).hostname or "").lower()
    except ValueError:
        return ""
    return host[4:] if host.startswith("www.") else host


def registrable_label(domain: str) -> str:
    """'gucci' for www.gucci.com, 'mtn' for mtn.com.ng, 'coca-cola' for coca-cola.co.uk."""
    parts = [p for p in str(domain or "").lower().split(".") if p]
    if len(parts) < 2:
        return parts[0] if parts else ""
    if len(parts) >= 3 and len(parts[-1]) == 2 and parts[-2] in _SECOND_LEVEL:
        return parts[-3]
    return parts[-2]


def brand_key(name: Any) -> str:
    tokens = re.sub(r"[^a-z0-9]+", " ", str(name or "").lower()).split()
    return "".join(t for t in tokens if t not in _NAME_NOISE)


def brand_tokens(name: Any) -> List[str]:
    return [t for t in re.sub(r"[^a-z0-9]+", " ", str(name or "").lower()).split() if t not in _NAME_NOISE]


def is_third_party_domain(domain: str, extra: Optional[Callable[[str], bool]] = None) -> bool:
    value = str(domain or "").lower()
    value = value[4:] if value.startswith("www.") else value
    if not value:
        return False
    if any(value == d or value.endswith("." + d) for d in THIRD_PARTY_DOMAINS):
        return True
    return bool(extra and extra(value))


def domain_matches_brand(domain: str, brand_name: Any) -> bool:
    label = registrable_label(domain).replace("-", "")
    key = brand_key(brand_name)
    if len(label) < 3 or len(key) < 3:
        return False
    return label in key or key in label


def _text_mentions_brand(text: Any, brand_name: Any) -> bool:
    haystack = re.sub(r"[^a-z0-9]+", "", str(text or "").lower())
    key = brand_key(brand_name)
    return len(key) >= 3 and key in haystack


def page_identity_matches(doc, brand_name: Any) -> bool:
    """The page says it IS the brand: og:site_name, application-name, <title>
    or a JSON-LD Organization name carries the brand name."""
    values: List[str] = []
    for meta in doc.xpath('//meta[@property="og:site_name" or @name="application-name" or @name="apple-mobile-web-app-title"]'):
        values.append(meta.get("content") or "")
    values.extend(t.text_content() for t in doc.xpath("//title")[:1])
    for script in doc.xpath('//script[@type="application/ld+json"]'):
        match = re.search(r'"name"\s*:\s*"([^"]{1,120})"', script.text_content() or "")
        if match:
            values.append(match.group(1))
    return any(_text_mentions_brand(v, brand_name) for v in values)


# --------------------------------------------------------------------------
# official site candidates + verification
# --------------------------------------------------------------------------
def _normalise_url(value: Any) -> str:
    raw = str(value or "").strip().rstrip(",;|")
    if not raw or " " in raw:
        return ""
    if "@" in raw and "://" not in raw:
        raw = raw.rsplit("@", 1)[-1]
    if not raw.startswith(("http://", "https://")):
        if "." not in raw:
            return ""
        raw = "https://" + raw.strip("/")
    return raw


def candidate_sites(brand: Dict[str, Any], extra_urls: Iterable[str] = (),
                    is_marketplace: Optional[Callable[[str], bool]] = None) -> List[Tuple[str, str]]:
    """(url, kind) pairs to try, best first. kind is 'declared', 'email',
    'search' or 'guess'. Third-party pages are dropped here."""
    name = brand.get("company") or brand.get("name") or brand.get("brand_name") or ""
    seen, out = set(), []

    def add(url: str, kind: str):
        url = _normalise_url(url)
        dom = domain_of(url)
        if not url or not dom or is_third_party_domain(dom, is_marketplace):
            return
        key = ((urlparse(url).hostname or "").lower(), urlparse(url).path.rstrip("/"))
        if key in seen:
            return
        seen.add(key)
        out.append((url, kind))

    declared = [brand.get(k) for k in ("website", "url", "brand_url", "source_url")]
    # Declared sites whose domain carries the brand name first.
    for url in declared:
        if domain_matches_brand(domain_of(_normalise_url(url)), name):
            add(url, "declared")
    email = str(brand.get("email") or brand.get("contact_email") or "").strip().lower()
    email_domain = email.rsplit("@", 1)[-1] if "@" in email else ""
    if email_domain and email_domain not in _PUBLIC_EMAIL_DOMAINS and domain_matches_brand(email_domain, name):
        add(email_domain, "email")
    # The admin's declared website outranks anything found or guessed; it is
    # still checked in verify_site (a deep page on an unrelated site fails).
    for url in declared:
        add(url, "declared")
    for url in extra_urls or []:
        add(url, "search")
    key = brand_key(name)
    tokens = brand_tokens(name)
    if 3 <= len(key) <= 30:
        add(f"https://www.{key}.com", "guess")
        add(f"https://{key}.com", "guess")
        if len(tokens) > 1:
            add(f"https://www.{'-'.join(tokens)}.com", "guess")
    return out


def verify_site(kind: str, requested_url: str, final_url: str, doc, brand_name: Any,
                is_marketplace: Optional[Callable[[str], bool]] = None) -> bool:
    """Is the fetched page the brand's own site?"""
    final_domain = domain_of(final_url)
    if not final_domain or is_third_party_domain(final_domain, is_marketplace):
        return False
    name_match = domain_matches_brand(final_domain, brand_name)
    identity = page_identity_matches(doc, brand_name)
    if kind in ("guess", "search"):
        # Guessed or searched: the site must be the brand by name AND say so.
        return name_match and identity
    if kind == "email":
        return name_match or identity
    # Declared by the admin: trust it unless it is a deep page on an unrelated
    # site (an article or listing that merely mentions the brand).
    depth = len([p for p in urlparse(requested_url).path.split("/") if p])
    return name_match or identity or depth <= 1


# --------------------------------------------------------------------------
# logo extraction from the official page
# --------------------------------------------------------------------------
def _clean_html(text: str) -> str:
    """Blank out comments, scripts and styles so markup inside them is never
    mistaken for page elements (and positions stay in document order)."""
    text = re.sub(r"<!--.*?-->", "", text, flags=re.S)
    text = re.sub(r"(<script\b[^>]*>).*?(</script>)", r"\1\2", text, flags=re.S | re.I)
    text = re.sub(r"(<style\b[^>]*>).*?(</style>)", r"\1\2", text, flags=re.S | re.I)
    text = re.sub(r"(<template\b[^>]*>).*?(</template>)", r"\1\2", text, flags=re.S | re.I)
    return text


def _raw_svg_blocks(text: str) -> List[str]:
    """Every <svg>...</svg> in document order (outer and nested), taken from
    the raw markup so SVG's camelCase names (viewBox, linearGradient) survive."""
    blocks = []
    for start in re.finditer(r"<svg\b", text, re.I):
        depth, pos = 0, start.start()
        for tag in re.finditer(r"<(/?)svg\b[^>]*?(/?)>", text[pos:], re.I):
            if tag.group(1):
                depth -= 1
            elif not tag.group(2):
                depth += 1
            else:
                if depth == 0:
                    blocks.append(text[pos:pos + tag.end()])
                    break
                continue
            if depth == 0:
                blocks.append(text[pos:pos + tag.end()])
                break
        else:
            blocks.append("")
    return blocks


def _attrs_text(el) -> str:
    return " ".join(str(el.get(a) or "") for a in ("class", "id", "alt", "title", "aria-label", "role", "data-testid"))


def _ancestors(el, limit: int = 8):
    node, n = el.getparent(), 0
    while node is not None and n < limit:
        yield node
        node, n = node.getparent(), n + 1


def _is_home_link(a, page_url: str) -> bool:
    href = (a.get("href") or "").strip()
    label = " ".join([a.get("aria-label") or "", a.get("title") or "", a.get("class") or "", a.get("id") or ""]).lower()
    if "home" in label or _LOGO_WORD.search(label):
        return True
    if not href or href.startswith(("#", "javascript:", "mailto:", "tel:")):
        return False
    target = urlparse(urljoin(page_url, href))
    page = urlparse(page_url)
    if domain_of(target.geturl()) != domain_of(page_url):
        return False
    path = target.path.rstrip("/")
    return path == "" or path == page.path.rstrip("/") or bool(_LOCALE_ROOT.match(path))


def _context_score(el, page_url: str) -> Tuple[int, bool]:
    score, in_home = 0, False
    for depth, node in enumerate(_ancestors(el)):
        tag = node.tag if isinstance(node.tag, str) else ""
        attrs = _attrs_text(node)
        if tag == "a" and _is_home_link(node, page_url):
            in_home = True
        if tag == "footer" or (depth < 3 and _NEGATIVE_CONTEXT.search(attrs)):
            return -100, in_home
        if tag == "header" or _HEADER_CONTEXT.search(attrs):
            score = max(score, 15)
        if _LOGO_WORD.search(attrs):
            score = max(score, 20)
    if in_home:
        score += 25
    return score, in_home


def _img_src(img, page_url: str) -> str:
    for attr in ("src", "data-src", "data-lazy-src", "data-original"):
        value = (img.get(attr) or "").strip()
        if value and not value.startswith("data:"):
            return urljoin(page_url, value)
    srcset = (img.get("srcset") or img.get("data-srcset") or "").strip()
    if srcset:
        first = srcset.split(",")[0].strip().split(" ")[0]
        if first and not first.startswith("data:"):
            return urljoin(page_url, first)
    return ""


def _svg_box(block: str) -> Tuple[float, float]:
    match = re.search(r'viewBox\s*=\s*["\']\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)', block[:400], re.I)
    if match:
        return float(match.group(1)), float(match.group(2))
    w = re.search(r'\bwidth\s*=\s*["\']?([\d.]+)', block[:400])
    h = re.search(r'\bheight\s*=\s*["\']?([\d.]+)', block[:400])
    return (float(w.group(1)) if w else 0.0, float(h.group(1)) if h else 0.0)


def extract_logo_candidates(page_html: str, page_url: str, brand_name: Any) -> List[Dict[str, Any]]:
    """Logo candidates from an official page, best first.

    Each: {"kind": "img"|"svg"|"icon", "url" or "svg", "score", "source"}.
    Header/homepage-link logos (img, then inline svg) rank above the site's
    structured-data logo, which ranks above its icons.
    """
    cleaned = _clean_html(page_html or "")
    try:
        doc = lxml_html.fromstring(cleaned)
    except (etree.ParserError, ValueError):
        return []
    out: List[Dict[str, Any]] = []

    # 1. logo <img>
    for img in doc.iter("img"):
        own = _attrs_text(img) + " " + (img.get("src") or "")
        own_logo = bool(_LOGO_WORD.search(own))
        own_brand = _text_mentions_brand(img.get("alt") or img.get("title") or "", brand_name)
        if _NEGATIVE_CONTEXT.search(_attrs_text(img)):
            continue
        ctx, in_home = _context_score(img, page_url)
        if ctx < 0:
            continue
        score = (45 if own_logo else 0) + (25 if own_brand else 0) + ctx
        if not own_logo and not (own_brand and in_home):
            continue
        if not (own_brand or in_home or ctx > 0):
            continue
        src = _img_src(img, page_url)
        if src and score >= 45:
            out.append({"kind": "img", "url": src, "score": score + 5,
                        "source": "the logo image on the brand's official website"})

    # 2. inline <svg> logo
    raw_blocks = _raw_svg_blocks(cleaned)
    for index, svg in enumerate(doc.iter("svg")):
        if index >= len(raw_blocks) or not raw_blocks[index]:
            break
        block = raw_blocks[index]
        # Sanity check that the regex walk and the parser agree on which SVG this is.
        label = (svg.get("aria-label") or svg.get("class") or "")[:40]
        if label and label.lower() not in block[:600].lower():
            continue
        titles = " ".join(t.text_content() for t in svg.iter("title"))
        own = _attrs_text(svg) + " " + titles
        own_logo = bool(_LOGO_WORD.search(own))
        own_brand = _text_mentions_brand(own, brand_name)
        ctx, in_home = _context_score(svg, page_url)
        if ctx < 0:
            continue
        width, height = _svg_box(block)
        tiny = 0 < width <= 32 and 0 < height <= 32
        score = (45 if own_logo else 0) + (25 if own_brand else 0) + ctx - (40 if tiny and not own_logo else 0)
        if not own_logo and not own_brand and not in_home:
            continue
        if not (own_brand or in_home or ctx > 0):
            continue
        if score >= 40:
            out.append({"kind": "svg", "svg": block, "score": score,
                        "source": "the inline SVG logo on the brand's official website"})

    # 3. the site's own declared logo / icons (secondary). Structured data
    # lives in <script>, which _clean_html blanked - read the original markup.
    for match in re.finditer(r'<script[^>]*application/ld\+json[^>]*>(.*?)</script>', page_html or "", re.S | re.I):
        for logo in re.finditer(r'"logo"\s*:\s*(?:"([^"]+)"|\{[^}]*?"(?:url|contentUrl)"\s*:\s*"([^"]+)")', match.group(1)):
            url = logo.group(1) or logo.group(2)
            if url:
                out.append({"kind": "icon", "url": urljoin(page_url, url), "score": 40,
                            "source": "the logo in the official website's structured data"})
    for meta in doc.xpath('//meta[@property="og:logo" or @itemprop="logo"]'):
        if meta.get("content"):
            out.append({"kind": "icon", "url": urljoin(page_url, meta.get("content")), "score": 35,
                        "source": "the official website's logo meta tag"})
    for link in doc.xpath("//link[@rel]"):
        rel = (link.get("rel") or "").lower()
        href = link.get("href")
        if not href:
            continue
        if "apple-touch-icon" in rel:
            out.append({"kind": "icon", "url": urljoin(page_url, href), "score": 25,
                        "source": "the official website's app icon"})
        elif "mask-icon" in rel or rel in ("icon", "shortcut icon"):
            out.append({"kind": "icon", "url": urljoin(page_url, href), "score": 20,
                        "source": "the official website's favicon"})

    out.sort(key=lambda c: c["score"], reverse=True)
    deduped, seen = [], set()
    for cand in out:
        key = cand.get("url") or cand.get("svg")
        if key in seen:
            continue
        seen.add(key)
        deduped.append(cand)
    return deduped


# --------------------------------------------------------------------------
# SVG sanitising
# --------------------------------------------------------------------------
SVG_NS = "http://www.w3.org/2000/svg"
XLINK_NS = "http://www.w3.org/1999/xlink"
_ALLOWED_ELEMENTS = {
    "svg", "g", "path", "rect", "circle", "ellipse", "line", "polyline", "polygon", "text", "tspan",
    "textPath", "defs", "linearGradient", "radialGradient", "stop", "clipPath", "mask", "symbol", "use",
    "title", "desc", "pattern", "style", "filter", "feGaussianBlur", "feOffset", "feBlend", "feColorMatrix",
    "feFlood", "feComposite", "feMerge", "feMergeNode", "feMorphology", "feDropShadow",
}
_DRAWABLE = {"path", "rect", "circle", "ellipse", "line", "polyline", "polygon", "text", "use"}
_UNWRAP = {"a", "switch"}
_ALLOWED_ATTR = re.compile(
    r"^(id|class|viewBox|preserveAspectRatio|x|y|x1|x2|y1|y2|cx|cy|r|rx|ry|fx|fy|width|height|d|points|"
    r"transform|fill|fill-rule|fill-opacity|stroke|stroke-width|stroke-linecap|stroke-linejoin|"
    r"stroke-miterlimit|stroke-dasharray|stroke-dashoffset|stroke-opacity|opacity|clip-path|clip-rule|"
    r"mask|filter|offset|stop-color|stop-opacity|gradientUnits|gradientTransform|spreadMethod|"
    r"patternUnits|patternContentUnits|patternTransform|maskUnits|maskContentUnits|clipPathUnits|"
    r"font-family|font-size|font-weight|font-style|letter-spacing|text-anchor|dominant-baseline|dx|dy|"
    r"textLength|lengthAdjust|startOffset|style|href|in|in2|result|stdDeviation|mode|operator|k1|k2|k3|k4|"
    r"values|type|flood-color|flood-opacity|radius|visibility|display|vector-effect|shape-rendering|"
    r"color|xml:space)$"
)
_UNSAFE_VALUE = re.compile(r"javascript:|vbscript:|data:(?!image/(png|jpe?g|gif|webp);)|expression\s*\(|@import", re.I)
_URL_REF = re.compile(r"url\(\s*['\"]?\s*(?!#)[^)]*\)", re.I)
_CSS_VAR = re.compile(r"var\(\s*--[^)]*\)")


def _local(tag: Any) -> str:
    if not isinstance(tag, str):
        return ""
    return tag.split("}", 1)[1] if "}" in tag else tag


def _clean_value(value: str) -> str:
    # CSS variables only resolve on the page the SVG came from; alone they
    # leave the shape unpainted. currentColor paints black inside an <img>.
    value = _CSS_VAR.sub("currentColor", value)
    return _URL_REF.sub("none", value)


def sanitize_svg(markup: str, resolve_symbol: Optional[Callable[[str], str]] = None) -> str:
    """Return safe, standalone SVG markup, or '' when it cannot be made so.

    - No DTDs/entities, scripts, event handlers, foreignObject, <image>,
      animation, or external references (only same-document #fragment refs).
    - <style> kept only with external url()/@import removed.
    - Sprite <use href="#id"> refs are inlined from the page when possible.
    - The result must draw something and stay under MAX_SVG_BYTES.
    """
    text = str(markup or "").strip()
    if not text or len(text.encode("utf-8")) > MAX_SVG_BYTES * 2:
        return ""
    if re.search(r"<!DOCTYPE|<!ENTITY", text, re.I):
        return ""
    text = re.sub(r"&nbsp;", "&#160;", text)
    # HTML-embedded SVG often omits the namespace; XML needs it.
    head = re.match(r"<svg\b[^>]*>", text, re.I)
    if not head:
        return ""
    if "xmlns=" not in head.group(0):
        text = re.sub(r"<svg\b", f'<svg xmlns="{SVG_NS}"', text, count=1, flags=re.I)
    if "xlink:" in text and "xmlns:xlink" not in text:
        text = re.sub(r"<svg\b", f'<svg xmlns:xlink="{XLINK_NS}"', text, count=1)
    parser = etree.XMLParser(resolve_entities=False, no_network=True, load_dtd=False, huge_tree=False,
                             remove_comments=True, remove_pis=True, recover=True)
    try:
        root = etree.fromstring(text.encode("utf-8"), parser)
    except (etree.XMLSyntaxError, ValueError):
        return ""
    if root is None or _local(root.tag) != "svg":
        return ""

    # Unwrap links first (keep what they draw, drop the link) so the
    # unwrapped shapes still go through the scrub below.
    for wrapper in [el for el in root.iter() if _local(el.tag) in _UNWRAP]:
        parent = wrapper.getparent()
        if parent is None:
            continue
        index = list(parent).index(wrapper)
        for grand in list(wrapper):
            parent.insert(index, grand)
            index += 1
        parent.remove(wrapper)

    def scrub(el):
        for child in list(el):
            name = _local(child.tag)
            if name not in _ALLOWED_ELEMENTS:
                el.remove(child)
                continue
            scrub(child)
        for attr in list(el.attrib):
            local = _local(attr)
            full = "xml:space" if attr == "{http://www.w3.org/XML/1998/namespace}space" else local
            value = el.attrib[attr]
            keep = bool(_ALLOWED_ATTR.match(full)) and not local.lower().startswith("on")
            if local == "href" and not value.strip().startswith("#"):
                keep = False
            if keep and _UNSAFE_VALUE.search(value):
                keep = False
            if not keep:
                del el.attrib[attr]
                continue
            if local in ("fill", "stroke", "stop-color", "style", "clip-path", "mask", "filter", "color"):
                el.attrib[attr] = _clean_value(value)
        if _local(el.tag) == "style":
            css = el.text or ""
            css = re.sub(r"@import[^;]*;?", "", css, flags=re.I)
            el.text = _clean_value(css) if not _UNSAFE_VALUE.search(css) else ""
    scrub(root)

    # Inline sprite symbols the logo points at (<use href="#logo">).
    def refs(node) -> set:
        found = set()
        for el in node.iter():
            for attr, value in el.attrib.items():
                if _local(attr) == "href" and value.startswith("#"):
                    found.add(value[1:])
        return found

    ids = {el.get("id") for el in root.iter() if el.get("id")}
    missing = refs(root) - ids
    if missing and resolve_symbol:
        defs = etree.SubElement(root, f"{{{SVG_NS}}}defs")
        defs_markup = "".join(resolve_symbol(m) for m in missing)
        if defs_markup:
            wrapped = sanitize_svg(f'<svg xmlns="{SVG_NS}" xmlns:xlink="{XLINK_NS}">{defs_markup}</svg>')
            if wrapped:
                for child in etree.fromstring(wrapped.encode("utf-8"), parser):
                    defs.append(child)
        ids = {el.get("id") for el in root.iter() if el.get("id")}
        missing = refs(root) - ids
    if missing:
        # A logo drawn from a symbol we could not bring along renders empty.
        return ""

    if not any(_local(el.tag) in _DRAWABLE for el in root.iter()):
        return ""
    if not root.get("viewBox") and not (root.get("width") and root.get("height")):
        symbol_boxes = [el.get("viewBox") for el in root.iter() if _local(el.tag) == "symbol" and el.get("viewBox")]
        if len(symbol_boxes) == 1:
            root.set("viewBox", symbol_boxes[0])

    # Visible when shown alone: a root fill of "none" whose shapes set no
    # colour of their own (the page's CSS used to paint them) would draw nothing.
    painted = any(
        (el.get("fill") not in (None, "", "none", "inherit")) or (el.get("stroke") not in (None, "", "none"))
        or re.search(r"(fill|stroke)\s*:", el.get("style") or "")
        for el in root.iter() if _local(el.tag) in _DRAWABLE or _local(el.tag) == "g"
    )
    has_style_rules = any(_local(el.tag) == "style" and (el.text or "").strip() for el in root.iter())
    if not painted and not has_style_rules:
        root.set("fill", "#000000")

    # Intrinsic size from the viewBox so <img> scales it like a bitmap.
    box = root.get("viewBox")
    width, height = root.get("width"), root.get("height")
    if not box and width and height:
        try:
            box = f"0 0 {float(re.sub('[^0-9.]', '', width))} {float(re.sub('[^0-9.]', '', height))}"
            root.set("viewBox", box)
        except ValueError:
            box = None
    if box:
        numbers = re.findall(r"[-\d.]+", box)
        if len(numbers) == 4:
            root.set("width", numbers[2])
            root.set("height", numbers[3])
    for attr in ("aria-hidden", "focusable", "role"):
        root.attrib.pop(attr, None)

    out = etree.tostring(root, encoding="unicode")
    if len(out.encode("utf-8")) > MAX_SVG_BYTES:
        return ""
    return out


def svg_data_uri(svg: str) -> str:
    return "data:image/svg+xml;base64," + base64.b64encode(svg.encode("utf-8")).decode("ascii")


def symbol_resolver(page_html: str) -> Callable[[str], str]:
    """Look up <symbol id=...> (or any element with that id inside an SVG
    sprite) on the page, for logos drawn with <use href="#id">."""
    def resolve(ref: str) -> str:
        pattern = re.compile(rf'<(symbol|g|path)\b[^>]*\bid\s*=\s*["\']{re.escape(ref)}["\'][^>]*>', re.I)
        match = pattern.search(page_html or "")
        if not match:
            return ""
        tag = match.group(1)
        if match.group(0).endswith("/>"):
            return match.group(0)
        end = (page_html or "").find(f"</{tag}>", match.end())
        return page_html[match.start():end + len(tag) + 3] if end > 0 else ""
    return resolve


# --------------------------------------------------------------------------
# network: fetch, verify, choose
# --------------------------------------------------------------------------
def image_bytes_ok(content: bytes, content_type: str) -> bool:
    """A real, usable image: not an HTML soft-404, not a tracker pixel, not a
    16px generic globe."""
    content_type = (content_type or "").lower()
    if "svg" in content_type or content[:200].lstrip().startswith((b"<svg", b"<?xml")):
        return len(content) > 100 and b"<svg" in content[:2000]
    if not content_type.startswith("image/"):
        return False
    if len(content) <= 500:
        return False
    if len(content) > 24 and content[:8] == b"\x89PNG\r\n\x1a\n":
        width = int.from_bytes(content[16:20], "big")
        height = int.from_bytes(content[20:24], "big")
        return width >= 32 and height >= 32
    return True


async def _fetch_page(client, url: str) -> Optional[Tuple[str, str]]:
    try:
        resp = await client.get(url, headers=BROWSER_HEADERS)
    except Exception:  # noqa: BLE001 - any network failure just means "not this site"
        return None
    if resp.status_code >= 400 or "html" not in str(resp.headers.get("content-type") or "").lower():
        return None
    return str(resp.url), resp.text[:4_000_000]


def locale_home_link(page_html: str, page_url: str) -> str:
    """On a "choose your country" page, the homepage to read instead:
    international first, then English, then the first locale link."""
    links = []
    for href in re.findall(r'href\s*=\s*["\']([^"\'#?]+)["\']', page_html or "", re.I):
        target = urlparse(urljoin(page_url, href))
        if domain_of(target.geturl()) != domain_of(page_url):
            continue
        path = target.path.rstrip("/")
        if path and _LOCALE_ROOT.match(path) and path != urlparse(page_url).path.rstrip("/"):
            links.append(urljoin(page_url, path + "/"))
    if not links:
        return ""

    def rank(url: str) -> int:
        path = urlparse(url).path.lower()
        if "/int/" in path and "/en" in path:
            return 0
        if path.rstrip("/").endswith(("/en", "/en-gb", "/en-us")) or path in ("/en/", "/en-gb/", "/en-us/"):
            return 1
        return 2
    return sorted(dict.fromkeys(links), key=rank)[0]


_SPRITE_URL = re.compile(r"""["'(]((?:https?://[^"')\s]+|/)[^"')\s]*?\.svg)(?:#[^"')\s]*)?["')]""", re.I)


def _sprite_urls(svg_markup: str, page_html: str, page_url: str) -> List[str]:
    """Same-site SVG sprite files a logo's <use> may point into: the file in
    the <use> href itself, then sprite-like .svg files the page mentions."""
    urls: List[str] = []
    for href in re.findall(r'href\s*=\s*["\']([^"\'#]+\.svg)#', svg_markup or "", re.I):
        urls.append(urljoin(page_url, href))
    for match in _SPRITE_URL.finditer(page_html or ""):
        path = match.group(1)
        if re.search(r"sprite|icons?|symbol", path.rsplit("/", 1)[-1], re.I):
            urls.append(urljoin(page_url, path))
    same_site = [u for u in dict.fromkeys(urls) if domain_of(u) == domain_of(page_url)]
    return same_site[:3]


async def _fetch_sprites(client, urls: List[str]) -> str:
    texts = []
    for url in urls:
        try:
            resp = await client.get(url, headers=IMAGE_HEADERS)
        except Exception:  # noqa: BLE001
            continue
        if resp.status_code < 400 and "<symbol" in resp.text[:2_000_000]:
            texts.append(resp.text[:2_000_000])
    return "".join(texts)


async def _image_ok(client, url: str) -> bool:
    try:
        resp = await client.get(url, headers=IMAGE_HEADERS)
    except Exception:  # noqa: BLE001
        return False
    return resp.status_code < 400 and image_bytes_ok(resp.content or b"", str(resp.headers.get("content-type") or ""))


async def find_official_logo(client, brand: Dict[str, Any], *, extra_urls: Iterable[str] = (),
                             is_marketplace: Optional[Callable[[str], bool]] = None,
                             has_budget: Callable[[], bool] = lambda: True,
                             max_sites: int = 4) -> Dict[str, Any]:
    """Verify the brand's official site and pull its logo.

    Returns {"official_url", "logo_url", "logo_source", "logo_kind", "tried"}:
    logo_url is '' when the official site offers no usable logo asset (the
    caller decides on any secondary source), official_url is '' when no site
    could be verified as the brand's own.
    """
    name = brand.get("company") or brand.get("name") or brand.get("brand_name") or ""
    result = {"official_url": "", "logo_url": "", "logo_source": "", "logo_kind": "", "tried": []}
    for url, kind in candidate_sites(brand, extra_urls, is_marketplace)[:max_sites]:
        if not has_budget():
            break
        fetched = await _fetch_page(client, url)
        result["tried"].append({"url": url, "kind": kind, "reached": bool(fetched)})
        if not fetched:
            continue
        final_url, page = fetched
        try:
            doc = lxml_html.fromstring(_clean_html(page))
        except (etree.ParserError, ValueError):
            continue
        if not verify_site(kind, url, final_url, doc, name, is_marketplace):
            result["tried"][-1]["verified"] = False
            continue
        result["tried"][-1]["verified"] = True
        result["official_url"] = final_url.rstrip("/")
        candidates = extract_logo_candidates(page, final_url, name)
        if not any(c["kind"] in ("img", "svg") for c in candidates) and has_budget():
            # A country-selector page: read the international / English home.
            locale_url = locale_home_link(page, final_url)
            locale_page = await _fetch_page(client, locale_url) if locale_url else None
            if locale_page and domain_of(locale_page[0]) == domain_of(final_url):
                locale_candidates = extract_logo_candidates(locale_page[1], locale_page[0], name)
                # Switch only when the locale home shows a real logo; otherwise
                # keep the root page's structured-data logo and icons.
                if any(c["kind"] in ("img", "svg") for c in locale_candidates):
                    final_url, page = locale_page
                    result["official_url"] = final_url.rstrip("/")
                    candidates = locale_candidates
        resolve = symbol_resolver(page)
        for cand in candidates:
            if not has_budget():
                break
            if cand["kind"] == "svg":
                clean = sanitize_svg(cand["svg"], resolve)
                if not clean and "<use" in cand["svg"] and has_budget():
                    # The symbol lives in a separate sprite file on the same site.
                    sprites = await _fetch_sprites(client, _sprite_urls(cand["svg"], page, final_url))
                    if sprites:
                        local_refs = re.sub(r'(href\s*=\s*["\'])[^"\'#]+\.svg#', r"\1#", cand["svg"], flags=re.I)
                        clean = sanitize_svg(local_refs, symbol_resolver(page + sprites))
                if clean:
                    result.update(logo_url=svg_data_uri(clean), logo_source=cand["source"], logo_kind="svg")
                    return result
                continue
            url_domain = domain_of(cand["url"])
            if is_third_party_domain(url_domain, is_marketplace):
                continue
            if await _image_ok(client, cand["url"]):
                result.update(logo_url=cand["url"][:1000], logo_source=cand["source"],
                              logo_kind="img" if cand["kind"] == "img" else "icon")
                return result
        # Verified site, but nothing usable on it - stop at the first
        # official site rather than wandering onto other domains.
        return result
    return result


# --------------------------------------------------------------------------
# backfill decision
# --------------------------------------------------------------------------
ADMIN_LOGO_SOURCES = {"Entered by an admin", "Uploaded by an admin"}
FAVICON_SERVICES = ("google.com/s2/favicons", "icons.duckduckgo.com")


def logo_review_reason(brand: Dict[str, Any], is_marketplace: Optional[Callable[[str], bool]] = None) -> str:
    """Why this brand's stored logo should be re-checked, or '' to keep it.

    Kept as they are: logos an admin typed or uploaded, and logos already
    taken from the brand's own site. Re-checked: no logo, a logo hosted on a
    third-party site, a favicon-service stand-in, or one of unknown origin.
    """
    name = brand.get("company") or brand.get("name") or brand.get("brand_name") or ""
    stored = str(brand.get("logo_url") or brand.get("brand_logo_url") or "").strip()
    source = str(brand.get("logo_source") or "")
    if source in ADMIN_LOGO_SOURCES:
        return ""
    if not stored:
        return "no logo saved"
    if stored.startswith("data:"):
        # Inline image: an upload, or an SVG already taken from the official site.
        return ""
    host = domain_of(stored)
    if any(service in stored for service in FAVICON_SERVICES):
        return "logo is a favicon-service stand-in"
    if is_third_party_domain(host, is_marketplace):
        return f"logo is hosted on a third-party site ({host})"
    page = str(brand.get("logo_source_page") or "")
    if page and not is_third_party_domain(domain_of(page), is_marketplace) and "official" in source:
        return ""
    if domain_matches_brand(host, name):
        return ""
    declared = domain_of(_normalise_url(brand.get("website")))
    if declared and host.endswith(declared) and not is_third_party_domain(declared, is_marketplace):
        return ""
    return "logo origin unknown"
