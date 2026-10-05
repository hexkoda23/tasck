# Azure production reconciliation (2026-09-15)

The `azure-migration` branch brings `THCO-Labs/TASCK` in line with what Azure Container Apps
was actually running. Production images had been built with `az acr build` from a local
working copy, so part of the running code existed only inside the images.

Base: `main` at `ce1c57f04bf983e24b029fb05016c5175358cb30`.

## What production was running

| App | Revision | Image | Digest |
|---|---|---|---|
| `tasck-api` | `tasck-api--0000020` | `tasck-api:migration-closeout-20260909-ba0009c` | `sha256:ad71cae19e3cf813e2b34557f5b0a418f1d37ad7f363ee35ff17e1e645e9e9e1` |
| `tasck-web` | `tasck-web--0000008` | `tasck-web:migration-closeout-20260909-ba0009c` | `sha256:7bec55ac1345edb182cb7df4254bbe3bbc02e339db164e5d138a5b4100ccd98b` |

Both images were downloaded read-only from `acrtasckproddcycxfri` and extracted locally.
Nothing was changed in Azure.

## Recovered into Git

### API (`backend/`), copied verbatim from the image's `/app`

- `server.py`
  - `.env` is loaded only when `APP_ENV` is development/dev/local/test, and never overrides the environment.
  - Demo hydration on boot is disabled outside local environments.
  - New `ENABLE_DEMO_LOGIN` switch (default on, to keep current behaviour).
  - Emergent and `thcodemo.space` CORS origins apply only in local environments.
- `v3_routes.py`
  - Brand-website candidate scoring, marketplace/app-store logo rejection and brand-name matching
    (`_score_brand_candidate`, `_is_bad_logo_url`, `resolve_brand_enrichment_target`, `_canonical_brand_logo`, …).
  - Secrets are redacted from logged URLs.
  - No `thcodemo.space` default for `DEFAULT_PUBLIC_APP_URL`.
- `v3_tracker_v33.py`: the tracker enricher calls the Anthropic API directly when `ANTHROPIC_API_KEY`
  is set, falling back to the Emergent gateway.
- `requirements.txt`: runtime-only, pinned set (61 packages). Drops `emergentintegrations`, which is
  only installable from Emergent's private index, and packages nothing imports.
- New operator tools:
  - `seed_accounts.py`: seeds account records into an empty database only.
  - `inventory_mongo.py`: read-only database inventory.
  - `verify_restore.py`: compares two inventories.
- New `.env.example`: placeholders only.

### Web (`frontend/`)

- `nginx/default.conf.template`: the template from the image. Identical apart from line endings: stored as LF, while the image's copy had CRLF.
- `public/index.html`: the Emergent loader and visual-edit scripts are removed and the meta
  description changed, matching the deployed `index.html`.
- `src/components/v1/V1PortalLayout.js`: brand portal sign-out navigates to `/v1` on the current host,
  instead of `https://thcodemo.space/v1`.
- `src/pages/FeedbackAdmin.js`, `src/components/shared/FeedbackPopup.js`: the API base URL is normalised
  the same way as `lib/api.js`.

### Build and deployment files (reconstructed from image history and live config)

- `backend/Dockerfile`, `backend/.dockerignore`
- `frontend/Dockerfile`, `frontend/.dockerignore`
- `.gitattributes`: LF in the repository, so Windows and CI builds produce the same bytes.
- `deploy/azure/README.md`: resources, probes, scaling, ingress, env var names/values and the secret→env
  mapping. It contains no secret values.

## Deliberately NOT recovered

The deployed web bundle (`main.1c390db2.js`) also contains frontend code that cannot come from a
consistent source tree. It references identifiers that are defined nowhere in the bundle, so it
throws `ReferenceError` at runtime:

- `BrandLogo`: `direct` is referenced but never declared. This throws whenever a brand logo renders.
- Admin opportunities "accept → business case" flow: calls `demoOpportunityCandidates`,
  `demoBusinessOpportunities`, `demoGrantOpportunities`, `fallbackBrands`, `getRM`,
  `saveStoredDemoBundle` and `demoOverviewFromRows`. It also hardcodes a demo business case
  (`created_at: 2026-05-26`, `rm-temi`).

CRA's `no-undef` lint rule normally fails a build that contains this. The image was evidently built
with linting disabled, from a partially merged working copy. Minified output cannot be faithfully
converted back to source, and shipping it would re-introduce the runtime errors, so the branch keeps
`ce1c57f`'s working versions of these components. **The next web deployment from this branch will
therefore differ from current production in exactly these two places. That is the intended fix, but
it should be checked in staging.**

Also not included: newer, undeployed images `tasck-api:20260915-115307-8687ff5` and
`tasck-web:20260915-115307-8687ff5`, pushed 2026-09-15 11:54–11:58 UTC by someone else.

- The web image is identical to production.
- The API image adds user-friendly AI-failure messages in `v3_routes.py` and three database dump
  tools (`inventory_from_dump.py`, `json_export_to_dump.py`, `pymongo_dump.py`).
- Whoever is building these should commit them to Git rather than deploy from a local copy.

## Secrets

- No `.env` file, credential, key or connection string was copied from the images. The images
  contain none: `.env` was excluded from the build context. Production secrets are Container App
  secrets (`mongo-url`, `anthropic-api-key`, `serpapi-api-key`, `smtp-username`, `smtp-password`).
- `main` still tracks `backend/.env` (keys include `MONGO_URL`, `ANTHROPIC_API_KEY`, `SMTP_PASSWORD`,
  `SERPAPI_API_KEY`, `EMERGENT_LLM_KEY`) and `frontend/.env`. This branch stops tracking both and
  ignores `.env*` except `.env.example`. **They remain in Git history, so any real value in them must
  be treated as exposed and rotated.**

## Verification

| Check | Result |
|---|---|
| API build context (`backend/` filtered by `.dockerignore`) vs production `/app` | **32/32 files identical**. Nothing extra, nothing missing (text compared with CRLF normalised) |
| Web static assets vs production | all public assets identical; `index.html` template matches deployed output |
| nginx template | identical after CRLF→LF normalisation (production copy had CRLF; nginx treats both the same) |
| Frontend production build (`REACT_APP_BACKEND_URL=""`, no source maps) | builds successfully; CSS `main.41a57f15.css` **byte-identical** to production; JS differs from production only in the two excluded broken code paths (AST-level comparison: every remaining difference belongs to them) |
| Backend tests, fully offline (no DB/network reachable), `main` vs branch | main: 118 passed / 131 failed / 55 errors. branch: **146 passed** / 103 failed / 55 errors. **0 regressions, 28 fixed** (brand-scraper tests that fail on `main` because `main`'s `v3_routes.py` lacks the functions they test). Remaining failures are identical on both and need a live server/database or Emergent's `/app` layout |
| `docker build` of both Dockerfiles | **not run locally**: the Docker engine on the verification machine did not start. First CI run must build both images (build only, no push/deploy) |
