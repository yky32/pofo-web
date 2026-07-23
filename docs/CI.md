# CI / GitHub Actions (Pofo)

Patterned after **triftly-app** (`pr.yml` / `prod.yml`) and **triftly-www** (Vercel deploy).

## Workflows

| Workflow | Trigger | What it runs |
|----------|---------|----------------|
| **PR** | Pull requests | `verify-ci` → lint → typecheck → build |
| **Prod** | Push to `main`, or **Actions → Prod → Run workflow** | verify + Vercel deploy; optional Supabase schema / auth URLs |

### Prod tasks (`workflow_dispatch`)

| Task | Effect |
|------|--------|
| `web` | CI verify + deploy to Vercel production |
| `verify` | Repo checks + lint/typecheck/build only |
| `supabase` | Apply `supabase/schema.sql` + ensure auth URLs |
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

- Git push to `main` still triggers **Vercel’s own Git integration** if linked. The Prod workflow is an explicit CI path (like triftly) and a manual lever for schema/auth.
- Schema apply is **idempotent** (`IF NOT EXISTS`) for Phase 1; re-running is safe.
- Do not commit `.env.local` or service role keys.
