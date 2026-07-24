#!/usr/bin/env bash
# Deploy pofo-web to Vercel production (triftly-www style).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ -z "${VERCEL_TOKEN:-}" ]; then
  echo "::error::Set VERCEL_TOKEN"
  exit 1
fi
if [ -z "${VERCEL_ORG_ID:-}" ] || [ -z "${VERCEL_PROJECT_ID:-}" ]; then
  echo "::error::Set VERCEL_ORG_ID and VERCEL_PROJECT_ID"
  exit 1
fi

export VERCEL_ORG_ID VERCEL_PROJECT_ID

echo "=== Install Vercel CLI ==="
npm install --global vercel@latest >/dev/null

echo "=== Pull production env ==="
vercel pull --yes --environment=production --token="$VERCEL_TOKEN"

echo "=== Deploy production ==="
# Prefer Vercel Git integration for day-to-day deploys; this CLI path is a manual override.
set +e
url="$(vercel deploy --prod --yes --token="$VERCEL_TOKEN" 2>&1)"
code=$?
set -e
if [ "$code" -ne 0 ]; then
  echo "$url"
  if echo "$url" | grep -q 'api-deployments-free-per-day\|more than 100'; then
    echo "::error::Vercel Free plan hit 100 deploys/day. Wait for the quota reset, or rely on Vercel Git deploys (no CLI). See docs/CI.md"
  fi
  exit "$code"
fi
echo "Deployed: $url"

PROD_URL="${POFO_PROD_URL:-https://pofo-web.vercel.app}"
echo "=== Smoke $PROD_URL ==="
sleep 8
for path in "/" "/login" "/signup"; do
  code="$(curl -sS -o /dev/null -w "%{http_code}" "${PROD_URL}${path}" || true)"
  if [ "$code" != "200" ]; then
    echo "FAIL: ${PROD_URL}${path} → HTTP ${code}"
    exit 1
  fi
  echo "OK: ${PROD_URL}${path} → $code"
done

echo "Deploy complete."
