# CI / GitHub Actions (Pofo)

Patterned after **triftly-app** (`pr.yml` / `prod.yml`). **Ship path differs from triftly-www:**

| | **pofo-web** | **triftly-www** |
|--|--------------|-----------------|
| App host | **Vercel** (Git integration) | Vercel *and/or* GitHub Pages |
| On push to `main` | GitHub **verify only** + Vercel auto-deploy | Vercel workflow may CLI-deploy |
| CLI deploy in Actions | **Manual only** (`task=web`) | Often on every push |

### Why we don’t CLI-deploy on every push

Vercel is already linked to this GitHub repo (`pofo-web`). Every push → Vercel builds production automatically.

If Actions **also** run `vercel deploy --prod`, you get **two deploys per push**. On the Free plan that burns the **100 deploys/day** quota and fails with:

`Resource is limited - try again in 24 hours (more than 100, code: "api-deployments-free-per-day")`

So: **trust Vercel Git for normal deploys.** Use Actions CLI deploy only when you need an explicit override.

## Workflows

| Workflow | Trigger | What it runs |
|----------|---------|----------------|
| **PR** | Pull requests | `verify-ci` → lint → typecheck → build |
| **Prod** | Push to `main` | **verify only** (lint / typecheck / build) |
| **Prod** | **Actions → Prod → Run workflow** | verify / optional CLI deploy / Supabase SQL / auth URLs |

### Prod tasks (`workflow_dispatch`)

| Task | Effect |
|------|--------|
| `verify` | Repo checks + lint/typecheck/build only |
| `web` | CI verify + **manual** Vercel CLI production deploy |
| `supabase` | Apply schema + feature SQLs (incl. `features-project-memory.sql`) + auth URLs |
| `auth-urls` | Only Supabase Auth site URL / redirect allow list |
| `all` | verify + web + supabase + auth-urls |

## Scripts

```bash
./scripts/verify-ci.sh              # repo P0 checks
./scripts/deploy-vercel.sh          # production Vercel deploy + smoke
./scripts/supabase-auth-urls.sh     # site_url + localhost + prod redirects
./scripts/supabase-apply-schema.sh  # link project + run schema.sql
```

## GitHub secrets

Repo → **Settings → Secrets and variables → Actions**

### Required for Vercel deploy

| Secret | Notes |
|--------|--------|
| `VERCEL_TOKEN` | [Vercel → Account → Tokens](https://vercel.com/account/tokens) |
| `VERCEL_ORG_ID` | From `.vercel/project.json` → `orgId` (local link) |
| `VERCEL_PROJECT_ID` | From `.vercel/project.json` → `projectId` |

Current project (local `.vercel/project.json`):

- **orgId:** `team_d6YRaCG7K4E3GBmBaeQJHuH9`
- **projectId:** `prj_C45xh8qiDqUdUsG5bxMTotE4stVw`

### Required for Supabase jobs

| Secret | Notes |
|--------|--------|
| `SUPABASE_ACCESS_TOKEN` | [Account → Access Tokens](https://supabase.com/dashboard/account/tokens) |
| `SUPABASE_DB_PASSWORD` | Database password from project create / settings |
| `SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL` | e.g. `https://vjtdasuuxkxfiibziymb.supabase.co` |

### Optional

| Secret | Notes |
|--------|--------|
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Used at **build** in Prod verify (Vercel project env still owns runtime) |
| `NEXT_PUBLIC_APP_URL` | Defaults to `https://pofo-web.vercel.app` |
| `POFO_PROD_URL` | Smoke-test base URL after deploy |

## Local CI parity

```bash
bun install
./scripts/verify-ci.sh
bun run lint
bun run typecheck
bun run build
```

## Notes

- **Vercel Git** = automatic deploys on push. **Actions `deploy-web`** = optional CLI override only.
- Schema apply is **idempotent** (`IF NOT EXISTS`); re-running is safe.
- Memory columns (`event_date`, `location`): run **Actions → Prod → task `supabase`**, or paste `supabase/features-project-memory.sql` in the SQL Editor.
- `SUPABASE_ACCESS_TOKEN` must be a valid [account access token](https://supabase.com/dashboard/account/tokens) (`sbp_…`). If Actions/link returns **Unauthorized**, regenerate the token and update the GitHub secret + `.env.local`.
- Do not commit `.env.local` or service role keys.
