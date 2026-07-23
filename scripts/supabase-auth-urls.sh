#!/usr/bin/env bash
# Ensure Auth Site URL + redirect allow list include Pofo web URLs
# (patterned after triftly-app scripts/supabase-auth-p0.sh).
set -euo pipefail

if [ -z "${SUPABASE_ACCESS_TOKEN:-}" ]; then
  echo "Set SUPABASE_ACCESS_TOKEN (supabase login or GitHub secret)"
  exit 1
fi

SUPABASE_URL="${SUPABASE_URL:-${NEXT_PUBLIC_SUPABASE_URL:-}}"
if [ -z "$SUPABASE_URL" ]; then
  echo "Set SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL"
  exit 1
fi

SITE_URL="${POFO_SITE_URL:-https://pofo-web.vercel.app}"

list_contains() {
  # $1=haystack (comma-separated), $2=needle
  echo "$1" | tr ',' '\n' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//' | grep -Fxq "$2"
}

REQUIRED_REDIRECTS="
${SITE_URL}
${SITE_URL}/**
http://localhost:3000
http://localhost:3000/**
http://localhost:3002
http://localhost:3002/**
"

if [ -n "${POFO_EXTRA_REDIRECTS:-}" ]; then
  REQUIRED_REDIRECTS="${REQUIRED_REDIRECTS}
$(echo "$POFO_EXTRA_REDIRECTS" | tr ',' '\n')"
fi

PROJECT_REF="${SUPABASE_URL#https://}"
PROJECT_REF="${PROJECT_REF#http://}"
PROJECT_REF="${PROJECT_REF%.supabase.co}"
PROJECT_REF="${PROJECT_REF%/}"

API="https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth"
AUTH_HEADER="Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}"

echo "Fetching auth config for project ${PROJECT_REF}…"
CONFIG=$(curl -sS -H "$AUTH_HEADER" -H "Content-Type: application/json" "$API")

if ! echo "$CONFIG" | jq -e . >/dev/null 2>&1; then
  echo "Could not read auth config:"
  echo "$CONFIG"
  exit 1
fi

CURRENT_LIST=$(echo "$CONFIG" | jq -r '
  if .uri_allow_list then .uri_allow_list
  elif .URI_ALLOW_LIST then .URI_ALLOW_LIST
  else "" end')

changed=0
while IFS= read -r r; do
  r="$(echo "$r" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
  [ -z "$r" ] && continue
  if list_contains "$CURRENT_LIST" "$r"; then
    echo "OK: already allowed — $r"
  else
    echo "Adding redirect: $r"
    if [ -n "$CURRENT_LIST" ]; then
      CURRENT_LIST="${CURRENT_LIST},${r}"
    else
      CURRENT_LIST="$r"
    fi
    changed=1
  fi
done <<<"$REQUIRED_REDIRECTS"

CURRENT_SITE=$(echo "$CONFIG" | jq -r '.site_url // .SITE_URL // empty')
if [ "$CURRENT_SITE" != "$SITE_URL" ]; then
  echo "Setting site_url → $SITE_URL (was: ${CURRENT_SITE:-empty})"
  changed=1
else
  echo "OK: site_url is $SITE_URL"
fi

if [ "$changed" -eq 0 ]; then
  echo "Auth URLs already configured."
  exit 0
fi

PATCH_BODY=$(jq -n \
  --arg list "$CURRENT_LIST" \
  --arg site "$SITE_URL" \
  '{ "uri_allow_list": $list, "site_url": $site }')

RESPONSE=$(curl -sS -X PATCH "$API" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d "$PATCH_BODY")

if echo "$RESPONSE" | jq -e . >/dev/null 2>&1; then
  echo "OK: updated Supabase Auth URL config"
  echo "$RESPONSE" | jq '{ site_url: (.site_url // .SITE_URL), uri_allow_list: (.uri_allow_list // .URI_ALLOW_LIST) }'
else
  echo "PATCH failed — set manually in Dashboard → Authentication → URL configuration:"
  echo "  Site URL: $SITE_URL"
  echo "  Redirects: production + localhost:3000/3002"
  echo "$RESPONSE"
  exit 1
fi
