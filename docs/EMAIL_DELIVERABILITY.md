# Email Deliverability Checklist — keeping TASCK mail out of spam

The application already sends well-formed transactional email (correct
`Message-ID`, `Date`, `Reply-To`, aligned `From`/`Sender`, multipart
text+HTML, `Feedback-ID`). **But inbox placement is decided mostly by the
sending domain's DNS authentication and reputation — which is configured at
the domain registrar / email provider, not in code.** Until the records
below exist, some mail WILL land in spam no matter what the app does.

## The three DNS records you must add (do these first)

Assume mail is sent from `something@thetasck.com` through your SMTP
provider (the values below use Zoho/Google/SendGrid-style examples — your
provider's dashboard shows the exact strings to copy).

### 1. SPF — authorises your provider to send for your domain
One TXT record on `thetasck.com`:

```
v=spf1 include:<your-provider-spf> ~all
```

Examples: `include:zohomail.com`, `include:_spf.google.com`,
`include:sendgrid.net`. Only ONE SPF record may exist per domain — if one
already exists, merge the `include:` into it.

### 2. DKIM — cryptographically signs every message
Your SMTP provider's dashboard has a "DKIM" section that generates a
TXT record like:

```
Host:  <selector>._domainkey.thetasck.com
Value: v=DKIM1; k=rsa; p=MIGfMA0GCSq...
```

Add it, then click "verify" in the provider dashboard. **This is the single
highest-impact record** — Gmail effectively requires DKIM now.

### 3. DMARC — tells receivers what to do with unauthenticated mail
One TXT record on `_dmarc.thetasck.com`:

```
v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@thetasck.com; adkim=r; aspf=r
```

Start with `p=none` for a week if you want to observe reports first, then
move to `p=quarantine`.

## Verify it worked
1. Send a welcome email to a Gmail address you control.
2. Open the message → three-dot menu → **Show original**.
3. All three must say PASS: `SPF: PASS`, `DKIM: PASS`, `DMARC: PASS`.
4. Or use https://www.mail-tester.com — send any TASCK email to the address
   it gives you and aim for a score of 9+/10.

## App-side settings (already good by default — don't break them)
| Env var | Default | Keep it because |
|---|---|---|
| `SMTP_FROM_EMAIL` | SMTP username | MUST be on the authenticated domain. Never send From a domain without SPF/DKIM. |
| `SMTP_SEND_HTML_ALTERNATIVE` | on | Multipart text+HTML scores better than bare plain text. |
| `SMTP_SEND_ACCESS_HTML` | on | Plain-text "here's your password + link" is a phishing signature. |
| `SMTP_ENABLE_FEEDBACK_ID` | on | Gmail per-stream reputation. |
| `SMTP_MARK_AUTOMATED` | off | `Auto-Submitted: auto-generated` hurts inbox placement — leave off. |
| `SMTP_ENVELOPE_FROM` | = From | Keeps SPF alignment. Only change if your provider requires a bounce address, and keep it on the same domain. |

## Reputation habits (ongoing)
- Send from ONE consistent domain and From address. Every domain change
  resets reputation to zero.
- Never send to `*.tasck.local` placeholders or invalid addresses — bounces
  poison reputation. (The app already blocks `.tasck.local` recipients.)
- Warm up: if the domain has never sent mail, start with low volume.
- Register the domain in Google Postmaster Tools
  (https://postmaster.google.com) to watch your spam-rate and reputation.
- Ask the first few brands to hit "Not spam" / drag to Primary if anything
  lands wrong — Gmail learns from this fast.

## Honest limits
No sender can guarantee 100% inbox placement — the receiving server always
has the final say. But with SPF + DKIM + DMARC passing, a consistent From
domain, and the app's current message hygiene, transactional mail like
TASCK's normally inboxes reliably within days of the records propagating.
