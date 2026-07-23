#!/usr/bin/env bash
# Repo-side P0 checks (local or CI) — patterned after triftly-app verify-p0-launch.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
FAIL=0

fail() {
  echo "FAIL: $1"
  FAIL=1
}

ok() {
  echo "OK:   $1"
}

echo "=== Pofo CI verification (repo) ==="

# Core package
if [ -f package.json ] && [ -f bun.lock ]; then
  ok "package.json + bun.lock"
else
  fail "package.json or bun.lock missing"
fi

# Phase 1 surface
for path in \
  src/app/\(marketing\)/page.tsx \
  src/app/\(auth\)/login/page.tsx \
  src/app/\(auth\)/signup/page.tsx \
  src/app/dashboard/page.tsx \
  src/actions/auth.ts \
  src/lib/supabase/client.ts \
  src/lib/supabase/server.ts \
  src/lib/env.ts \
  supabase/schema.sql \
  supabase/SETUP.md; do
  if [ -f "$path" ]; then
    ok "$path"
  else
    fail "missing $path"
  fi
done

# Scripts we expect in CI
for path in \
  scripts/verify-ci.sh \
  scripts/deploy-vercel.sh \
  scripts/supabase-auth-urls.sh \
  scripts/supabase-apply-schema.sh; do
  if [ -x "$path" ] || [ -f "$path" ]; then
    ok "$path"
  else
    fail "missing $path"
  fi
done

# Env contract documented
if grep -q 'NEXT_PUBLIC_SUPABASE_URL' .env.example && grep -q 'NEXT_PUBLIC_SUPABASE_ANON_KEY' .env.example; then
  ok ".env.example Supabase keys"
else
  fail ".env.example missing Supabase keys"
fi

# Schema is Phase 1–4 (profiles + projects + share + proofing)
if grep -q 'create table if not exists public.profiles' supabase/schema.sql \
  && grep -q 'create table if not exists public.projects' supabase/schema.sql \
  && grep -q 'create table if not exists public.shots' supabase/schema.sql \
  && grep -q 'create table if not exists public.share_links' supabase/schema.sql \
  && grep -q 'get_client_gallery' supabase/schema.sql; then
  ok "schema.sql has profiles + projects + shots + share + RPCs"
else
  fail "schema.sql missing core tables or client RPCs"
fi

# Auth gates on env helper
if grep -q 'isSupabaseConfigured' src/lib/env.ts; then
  ok "isSupabaseConfigured helper"
else
  fail "isSupabaseConfigured missing"
fi

if [ "$FAIL" -ne 0 ]; then
  echo ""
  echo "=== FAILED ($FAIL) ==="
  exit 1
fi

echo ""
echo "=== All repo checks passed ==="
