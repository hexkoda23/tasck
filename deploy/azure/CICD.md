# GitHub → ACR → Azure Container Apps

Production (`tasck-api`, `tasck-web` in `rg-tasck-prod`) is built and deployed **only** from
`THCO-Labs/TASCK`. First pipeline release: commit `85aa1cc` on 2026-09-15.

## Release flow

```
PR ──► CI checks ──► merge to main ──► CI on main ──► Deploy to Azure:
                                                     build + tag images with the commit SHA
                                                     push to acrtasckproddcycxfri
                                                     ⏸ required approval (environment "production")
                                                     tasck-api, then tasck-web, by image digest
                                                     health checks, automatic rollback on failure
                                                  ──► Verify production
```

| Workflow | Trigger | What it does |
|---|---|---|
| `ci.yml` (**CI**) | every PR to `main`, every push to `main` | backend unit tests; builds both images and smoke-tests them on the runner. Never pushes or deploys. Its three jobs are the required status checks. |
| `deploy-azure.yml` (**Deploy to Azure**) | automatically when CI succeeds for a push to `main`; or manually from `main` | resolves the commit, builds `tasck-api:<sha>` / `tasck-web:<sha>` with `org.opencontainers.image.revision=<sha>`, pushes to ACR, waits for **production approval**, rolls out by digest, waits for a healthy revision, smoke-tests `/healthz` and `/api/health`, rolls back on failure. |
| `verify-production.yml` (**Verify production**) | daily 06:17 UTC, after every deploy, or manually | fails if a running app is not pinned to a digest, if its image was not built by the pipeline from a commit on `main`, or if ACR received a tag since cut-over that is not a `main` commit (a manual `az acr build` / `docker push`). Read-only. |

Deployments change **only the container image**. They never change app settings, secrets, scale,
ingress, Key Vault, storage, the MongoDB resource (`mongo-tasck-prod-dcycxfri`) or the jobs
`tasck-inventory` / `tasck-restore`, and they never run data scripts.

If several commits land on `main` while one is waiting for approval, only the newest waiting run
is kept. Approving it releases everything merged so far. Rejecting leaves production unchanged.

## Rules

- **No manual images.** Do not run `az acr build`, `docker push` or `az containerapp update --image`
  against production. Every change goes through a PR. *Verify production* flags anything else.
- **No secrets in Git.** `.env*` is ignored except `.env.example`. Production credentials live in
  Key Vault; GitHub holds no Azure credentials (OIDC only, IDs stored as Actions variables).
- **Emergency rollback** is the one exception to the no-manual rule (see below). Afterwards, fix
  forward through a PR so `main` matches production again.

## Configuration (done 2026-09-15; keep as record)

### Azure

- App registration `github-tasck-deploy`, client ID `3e322087-5236-4d14-9125-b0823b013021`, no
  client secrets.
- Federated credentials (this organisation issues OIDC subjects with immutable owner/repo IDs;
  a plain `repo:THCO-Labs/TASCK:...` subject fails with `AADSTS700213`):
  - `repo:THCO-Labs@280632813/TASCK@1361235412:ref:refs/heads/main`: CI-triggered builds, verification
  - `repo:THCO-Labs@280632813/TASCK@1361235412:environment:production`: deploy jobs
- Roles (least privilege, nothing on the resource group):

  | Role | Scope |
  |---|---|
  | `AcrPush` | `acrtasckproddcycxfri` |
  | `Contributor` | `tasck-api` |
  | `Contributor` | `tasck-web` |
  | `TASCK Container Apps Environment Join` (custom: `managedEnvironments/join/action`, `read`) | `cae-tasck-prod` |

To recreate the credentials:

```bash
APP_ID=3e322087-5236-4d14-9125-b0823b013021
REPO_OIDC=THCO-Labs@280632813/TASCK@1361235412
az ad app federated-credential create --id "$APP_ID" --parameters "{\"name\":\"tasck-main\",\"issuer\":\"https://token.actions.githubusercontent.com\",\"subject\":\"repo:$REPO_OIDC:ref:refs/heads/main\",\"audiences\":[\"api://AzureADTokenExchange\"]}"
az ad app federated-credential create --id "$APP_ID" --parameters "{\"name\":\"tasck-production\",\"issuer\":\"https://token.actions.githubusercontent.com\",\"subject\":\"repo:$REPO_OIDC:environment:production\",\"audiences\":[\"api://AzureADTokenExchange\"]}"
```

### GitHub (repository admin)

1. **Actions variables** (Settings → Secrets and variables → Actions → *Variables*):
   `AZURE_CLIENT_ID`, `AZURE_TENANT_ID` = `004426bf-f675-4242-9197-8ffb0c2ab6c4`,
   `AZURE_SUBSCRIPTION_ID` = `76b8d220-e8d4-48d2-8ee2-088ef41fea55`.
2. **Environment `production`** (Settings → Environments):
   - *Required reviewers*: people allowed to approve releases. Tick *Prevent self-review* if there
     are at least two.
   - *Deployment branches and tags*: selected branches → `main`.
3. **Protect `main`** (Settings → Rules → Rulesets → *New branch ruleset*):
   - Name `main`, Enforcement **Active**, Target branches: *Include default branch*.
   - ✅ Restrict deletions · ✅ Block force pushes
   - ✅ Require a pull request before merging: 1 approval, dismiss stale approvals
   - ✅ Require status checks to pass, *require branches to be up to date*, checks
     (source GitHub Actions): `Backend unit tests`, `Build tasck-api image`, `Build tasck-web image`
   - Bypass list: empty (admins included).

   (Classic alternative: Settings → Branches → *Add branch protection rule* for `main` with the
   same options plus *Do not allow bypassing the above settings*.)

## Credential rotation

Production reads `anthropic-api-key`, `serpapi-api-key`, `smtp-username`, `smtp-password` and
`mongo-url` from `kv-tasck-prod-dcycxfri` via Key Vault references and the managed identity
`id-tasck-prod`. To rotate one:

1. Create the new credential at the provider; keep the old one active.
2. From the repo root, signed in with `az login` as someone with Key Vault Secrets Officer:
   `./deploy/azure/rotate-secret.ps1 -SecretName serpapi-api-key`
   It prompts for the value (hidden), stores a new Key Vault version and rolls a new `tasck-api`
   revision without downtime.
3. Check the feature that uses it, then revoke the old credential.

Credentials committed in `backend/.env` from `8850fe0` (2026-07-06) until `d0aba3b` (2026-09-15)
remain readable in Git history and must be treated as public. Status at 2026-09-15:

| Credential | In Git history | Used by production | Action |
|---|---|---|---|
| SerpAPI key | yes | **yes (same value)** | regenerate at serpapi.com, `rotate-secret.ps1 -SecretName serpapi-api-key`; regenerating invalidates the old key |
| Gmail app password (`SMTP_PASSWORD`) | yes | **yes (same value)** | create a new app password for the SMTP account, `rotate-secret.ps1 -SecretName smtp-password`, then revoke the old app password in the Google account |
| SMTP username | yes | yes | an address, not a secret; no rotation needed unless the account changes |
| Anthropic API key | yes | no (production uses a different key) | revoke the leaked key in the Anthropic Console |
| Emergent LLM key | yes | no | revoke it in Emergent |
| MongoDB URL | yes (`localhost`, no password) | no | none |

Rewriting Git history to remove the file would need a force-push and is not planned; rotation makes
the leaked values useless.

## Rollback

Every rollout creates a new revision and prints the previous image in the workflow log. The deploy
workflow rolls back automatically when health checks fail. Manual emergency rollback:

```bash
az containerapp update -g rg-tasck-prod -n tasck-api --image acrtasckproddcycxfri.azurecr.io/tasck-api@sha256:<previous>
az containerapp update -g rg-tasck-prod -n tasck-web --image acrtasckproddcycxfri.azurecr.io/tasck-web@sha256:<previous>
```

Last known-good pipeline release (`85aa1cc`):

- `tasck-api@sha256:bc163dc4f8cd08d046da10bc361a97ff08b0f2c57a99a4e25a396f64e4e03000`
- `tasck-web@sha256:183053c198b8ed1e94dd618d4a57c01e53d737f1c8d54fa69b69f74bdbeaacca`
