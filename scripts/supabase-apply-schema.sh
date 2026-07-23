#!/usr/bin/env bash
# Apply supabase/schema.sql to the linked remote project (Phase 1).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ -z "${SUPABASE_ACCESS_TOKEN:-}" ]; then
  echo "::error::Set SUPABASE_ACCESS_TOKEN"
  exit 1
fi
if [ -z "${SUPABASE_DB_PASSWORD:-}" ]; then
  echo "::error::Set SUPABASE_DB_PASSWORD"
  exit 1
fi

SUPABASE_URL="${SUPABASE_URL:-${NEXT_PUBLIC_SUPABASE_URL:-}}"
if [ -z "$SUPABASE_URL" ]; then
  echo "::error::Set SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL"
  exit 1
fi

PROJECT_REF="${SUPABASE_URL#https://}"
PROJECT_REF="${PROJECT_REF#http://}"
PROJECT_REF="${PROJECT_REF%.supabase.co}"
PROJECT_REF="${PROJECT_REF%/}"

SCHEMA="${1:-supabase/schema.sql}"
if [ ! -f "$SCHEMA" ]; then
  echo "::error::Schema file not found: $SCHEMA"
  exit 1
fi

echo "=== Link project $PROJECT_REF ==="
supabase link --project-ref "$PROJECT_REF" --password "$SUPABASE_DB_PASSWORD"

echo "=== Apply $SCHEMA ==="
# Idempotent IF NOT EXISTS schema — safe to re-run for Phase 1.
supabase db query --linked --file "$SCHEMA"

echo "OK: schema applied"
