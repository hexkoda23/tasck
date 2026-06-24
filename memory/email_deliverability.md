# Welcome email deliverability — DNS + SMTP setup

This is the **app-side** work + the **DNS-side** work you (the user) must
complete to keep TASCK welcome emails out of spam.

## What the app already does (code is in `/app/backend/v3_routes.py`)

| Setting | Value | Why it matters |
|---|---|---|
| **Subject** | `Welcome to your TASCK brand workspace` | Clean, branded, no spammy formatting |
| **From name** | `TASCK` (via `SMTP_FROM_NAME`, defaults to `TASCK Agency`) | Recognisable sender |
| **From email** | `SMTP_FROM_EMAIL` (must match your authenticated SMTP domain) | Required for SPF/DKIM alignment |
| **Reply-To** | `SMTP_REPLY_TO` (e.g. `hello@thetasck.com`) | Real person responds; helps reputation |
| **Multipart** | Plain-text + clean HTML alternative (always set on welcome) | Single-format emails are heavily down-ranked |
| **HTML body** | Card-style, one CTA button, table for credentials, footer | Avoids image-only, link-heavy, or all-caps designs |
| **Idempotency** | Guarded by `v3_email_outbox` lookup — same brand never gets two welcomes | Prevents duplicate-send penalties |
| **Logging** | `email_delivery kind=brand_welcome to=... id=... status=... error=...` | Diagnostics without exposing secrets |

## Env variables to set on production (in addition to existing SMTP_*)

```
SMTP_FROM_NAME=TASCK
SMTP_FROM_EMAIL=welcome@thetasck.com      # must be on the same domain you authenticated below
SMTP_REPLY_TO=hello@thetasck.com          # a real, monitored inbox
TASCK_SUPPORT_EMAIL=hello@thetasck.com    # surfaced inside the welcome body
FRONTEND_URL=https://thcodemo.space       # used for the "Sign in to your workspace" link
V1_BRAND_PORTAL_URL=https://thcodemo.space/brand
```

`SMTP_SEND_HTML_ALTERNATIVE` no longer needs to be set for welcome — the
welcome email always includes its own HTML alternative regardless of the flag.
Leave the flag for other transactional emails if you want them to also include
HTML.

## DNS records you MUST publish on the domain that owns `SMTP_FROM_EMAIL`

Replace `thetasck.com` with your actual sending domain. Each provider gives
slightly different exact values — these are the canonical record types.

### 1. SPF (TXT on `thetasck.com`)

If you send from Google Workspace + your SMTP provider (e.g. SendGrid/Mailgun/SES):

```
TYPE: TXT
HOST: @                        (or thetasck.com)
VALUE: "v=spf1 include:_spf.google.com include:sendgrid.net include:amazonses.com -all"
```
- Use the includes for the providers you actually use, drop the rest.
- End in `-all` (hardfail) once you've confirmed legitimate mail still flows. Start with `~all` (softfail) while testing.

### 2. DKIM (TXT records that your SMTP provider gives you)

Each provider gives you a host + value pair to publish. Examples:

- **SendGrid**: `s1._domainkey.thetasck.com → s1.domainkey.uXXXXXX.wlYYYYYY.sendgrid.net` (CNAME) + a second `s2._domainkey...` selector.
- **Mailgun**: `mailo._domainkey.thetasck.com → TXT "v=DKIM1; k=rsa; p=…"`
- **Amazon SES**: 3 CNAME records (SES provides them in the console).
- **Google Workspace**: `google._domainkey.thetasck.com → TXT "v=DKIM1; k=rsa; p=…"` (Admin console → Apps → Gmail → Authenticate email).

> ⚠️ Without DKIM, Gmail and Outlook will land most welcome emails in spam.

### 3. DMARC (TXT on `_dmarc.thetasck.com`)

Start permissive, then tighten:

```
TYPE: TXT
HOST: _dmarc
VALUE: "v=DMARC1; p=none; rua=mailto:dmarc-reports@thetasck.com; ruf=mailto:dmarc-reports@thetasck.com; fo=1; aspf=r; adkim=r"
```

After a week of clean reports, change `p=none` → `p=quarantine`, then later → `p=reject`.

### 4. Reverse DNS / PTR (only if you're sending from your own SMTP server)

If you use a 3rd-party SMTP provider (recommended), this is handled for you.
If you're using your own server's SMTP, the IP must have a PTR record that
resolves to the hostname in your EHLO/HELO greeting.

## Quick verification

After publishing the DNS records, you can verify with:

- `dig +short TXT thetasck.com` — should return your SPF record.
- `dig +short TXT _dmarc.thetasck.com` — should return your DMARC record.
- `dig +short TXT <selector>._domainkey.thetasck.com` — should return your DKIM record (or CNAME).
- [mail-tester.com](https://www.mail-tester.com) — send a real welcome email there and read the report. Aim for 9/10+.
- [mxtoolbox.com](https://mxtoolbox.com/SuperTool.aspx) — has SPF/DKIM/DMARC checks for free.

## What still requires your action (not solvable in code)

1. **Publish the SPF/DKIM/DMARC DNS records** on your sending domain.
2. **Use a transactional SMTP provider** (SendGrid, Mailgun, Postmark, Resend, Amazon SES). Gmail/Yahoo SMTP for app-driven email is heavily penalised by big inboxes.
3. **Warm up the domain** — if it's a brand new domain, send small volumes for the first 2 weeks before ramping up.
4. **Add a physical address + unsubscribe link** to non-transactional emails if you start using TASCK for marketing too. (Welcome is transactional, so this isn't strictly required — but it helps deliverability.)

## How to confirm the new email is in use

After redeploy:

```
curl https://thcodemo.space/api/v3/brands \
  -H "Content-Type: application/json" \
  -d '{"company":"Test Co","primary_contact":"Test","email":"<your-test-inbox>","industry":"Tech","engagement_track_default":"paid"}'
```

Then in your inbox:
- Subject reads exactly: `Welcome to your TASCK brand workspace`
- Email has both a text and a designed HTML body (most clients show the HTML)
- Reply-to is your monitored support inbox
- View original / show original — check `SPF: PASS`, `DKIM: PASS`, `DMARC: PASS`
