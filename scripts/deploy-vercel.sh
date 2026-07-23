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
url="$(vercel deploy --prod --yes --token="$VERCEL_TOKEN")"
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
