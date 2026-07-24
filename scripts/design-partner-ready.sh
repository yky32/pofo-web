#!/usr/bin/env bash
# Smoke check: is this environment ready for a design-partner dry-run?
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ -f .env.local ]; then
  set -a
  # shellcheck disable=SC1091
  source .env.local
  set +a
fi

ok=0
warn=0
fail=0

pass() { echo "  OK  $1"; ok=$((ok + 1)); }
note() { echo "  !!  $1"; warn=$((warn + 1)); }
bad()  { echo "  XX  $1"; fail=$((fail + 1)); }

echo "=== Pofo design-partner readiness ==="
echo

# App URL
APP="${NEXT_PUBLIC_APP_URL:-}"
if [ -z "$APP" ]; then
  note "NEXT_PUBLIC_APP_URL unset (defaults to http://localhost:3000 in code)"
elif echo "$APP" | grep -q ':3002'; then
  bad "NEXT_PUBLIC_APP_URL is $APP — use port 3000 to match next dev"
elif echo "$APP" | grep -qE 'localhost:3000|https://'; then
  pass "NEXT_PUBLIC_APP_URL=$APP"
else
  note "NEXT_PUBLIC_APP_URL=$APP (check it matches where clients open links)"
fi

# Supabase public
if [ -n "${NEXT_PUBLIC_SUPABASE_URL:-}" ] && [ -n "${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}" ]; then
  if echo "${NEXT_PUBLIC_SUPABASE_URL}" | grep -q 'your-project'; then
    bad "NEXT_PUBLIC_SUPABASE_URL still placeholder"
  else
    pass "Supabase URL + anon key set"
  fi
else
  bad "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
fi

# Service role
if [ -n "${SUPABASE_SERVICE_ROLE_KEY:-}" ] && [ "${SUPABASE_SERVICE_ROLE_KEY}" != "your-service-role-key" ]; then
  pass "SUPABASE_SERVICE_ROLE_KEY set (client signed URLs)"
else
  bad "SUPABASE_SERVICE_ROLE_KEY missing — client gallery images will fail"
fi

# Optional
if [ -n "${RESEND_API_KEY:-}" ]; then
  pass "RESEND_API_KEY set (email share / proofing notify)"
else
  note "RESEND_API_KEY unset — use copy link / mailto"
fi

if [ -n "${CRON_SECRET:-}" ] || [ -n "${PREVIEW_WORKER_SECRET:-}" ]; then
  pass "CRON_SECRET (or PREVIEW_WORKER_SECRET) set for preview worker"
else
  note "CRON_SECRET unset — set on Vercel so /api/cron/process-previews is protected"
fi

if [ -n "${NEXT_PUBLIC_ROOT_DOMAIN:-}" ]; then
  pass "NEXT_PUBLIC_ROOT_DOMAIN=${NEXT_PUBLIC_ROOT_DOMAIN}"
else
  note "No ROOT_DOMAIN — portfolio uses localhost subdomain or /s/{slug}"
fi

# Critical SQL files present in repo
for f in \
  supabase/schema.sql \
  supabase/storage.sql \
  supabase/features-p3.sql \
  supabase/features-raw-pipeline.sql \
  supabase/features-portfolio-page.sql \
  supabase/slug.sql
do
  if [ -f "$f" ]; then
    pass "repo has $f"
  else
    bad "missing $f"
  fi
done

if [ -f vercel.json ] && grep -q process-previews vercel.json; then
  pass "vercel.json schedules process-previews cron"
else
  note "vercel.json cron for previews not found"
fi

echo
echo "=== Result: $ok ok · $warn warnings · $fail failures ==="
if [ "$fail" -gt 0 ]; then
  echo "Fix failures before a partner job."
  exit 1
fi
echo "Ready for a supervised design-partner dry-run."
echo "See docs/DESIGN_PARTNER.md"
exit 0
