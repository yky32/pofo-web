#!/usr/bin/env bash
# Apply Supabase SQL files to the linked remote project (idempotent).
# Usage:
#   ./scripts/supabase-apply-schema.sh                      # schema + all feature SQLs
#   ./scripts/supabase-apply-schema.sh supabase/foo.sql     # one file
#   ./scripts/supabase-apply-schema.sh all                  # same as default
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

# Ordered, idempotent feature pack (Phase 1 schema first).
DEFAULT_SQLS=(
  supabase/schema.sql
  supabase/storage.sql
  supabase/profiles-providers.sql
  supabase/share-gate.sql
  supabase/features-p1-p2.sql
  supabase/features-p3.sql
  supabase/features-teams.sql
  supabase/features-plans.sql
  supabase/features-raw-pipeline.sql
  supabase/features-project-memory.sql
  supabase/features-project-tags.sql
)

SQLS=()
if [ "${1:-}" = "" ] || [ "${1:-}" = "all" ]; then
  SQLS=("${DEFAULT_SQLS[@]}")
else
  SQLS=("$@")
fi

for f in "${SQLS[@]}"; do
  if [ ! -f "$f" ]; then
    echo "::error::Schema file not found: $f"
    exit 1
  fi
done

echo "=== Link project $PROJECT_REF ==="
supabase link --project-ref "$PROJECT_REF" --password "$SUPABASE_DB_PASSWORD"

for SCHEMA in "${SQLS[@]}"; do
  echo "=== Apply $SCHEMA ==="
  supabase db query --linked --file "$SCHEMA"
done

echo "OK: applied ${#SQLS[@]} SQL file(s)"
