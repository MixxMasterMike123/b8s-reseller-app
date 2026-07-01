#!/usr/bin/env bash
# set-user-password-rest.sh — set a Firebase Auth user's password directly via
# the Identity Toolkit REST API, using your gcloud Application Default
# Credentials. NO email is sent; works while the custom SMTP path is down.
#
# Why REST instead of the firebase-admin SDK: firebase-admin v11 does NOT send
# the X-Goog-User-Project quota header for the Auth (Identity Toolkit) API when
# using end-user ADC, so every getUser/updateUser is billed to Google's default
# CLI project (764086051850) where the API is disabled → auth/internal-error.
# Raw REST lets us set that header explicitly, so the call bills to OUR project.
#
# USAGE (Mikael runs — live Auth write, STOP-and-surface class):
#   ./scripts/set-user-password-rest.sh <email> '<newPassword>'           # dry run (lookup only)
#   ./scripts/set-user-password-rest.sh <email> '<newPassword>' --commit  # set the password
#
# Requires: gcloud (logged in via `gcloud auth application-default login`).
# Password must be >= 6 chars. Wrap it in single quotes.
set -euo pipefail

PROJECT="b8shield-reseller-app"
EMAIL="${1:-}"
NEWPASS="${2:-}"
COMMIT="${3:-}"

if [[ -z "$EMAIL" || -z "$NEWPASS" ]]; then
  echo "Usage: $0 <email> '<newPassword>' [--commit]" >&2
  exit 1
fi
if [[ "${#NEWPASS}" -lt 6 ]]; then
  echo "❌ Password must be at least 6 characters (Firebase minimum)." >&2
  exit 1
fi

TOKEN="$(gcloud auth application-default print-access-token)"
API="https://identitytoolkit.googleapis.com/v1"
HDR_AUTH="Authorization: Bearer ${TOKEN}"
HDR_PROJ="X-Goog-User-Project: ${PROJECT}"

echo "🔑 Set user password via Identity Toolkit REST (no email)"
echo "   project: ${PROJECT}"
echo "   email:   ${EMAIL}"
echo "   newPass: $(printf '%*s' "${#NEWPASS}" '' | tr ' ' '*') (${#NEWPASS} chars)"
echo "   mode:    $([[ "$COMMIT" == "--commit" ]] && echo '🔴 COMMIT (will write)' || echo '🟡 DRY RUN (lookup only)')"
echo ""

# 1. Look up the user (and get localId / uid)
LOOKUP="$(curl -s -X POST "${API}/accounts:lookup" \
  -H "${HDR_AUTH}" -H "${HDR_PROJ}" -H "Content-Type: application/json" \
  -d "{\"email\":[\"${EMAIL}\"]}")"

USER_UID="$(printf '%s' "$LOOKUP" | python3 -c "import sys,json; u=json.load(sys.stdin).get('users',[]); print(u[0]['localId'] if u else '')")"

if [[ -z "$USER_UID" ]]; then
  echo "❌ No Auth user found for ${EMAIL}. Raw response:" >&2
  printf '%s\n' "$LOOKUP" | head -c 500 >&2; echo "" >&2
  exit 1
fi
echo "Found Auth user: uid=${USER_UID}"
echo ""

if [[ "$COMMIT" != "--commit" ]]; then
  echo "🟡 Dry run complete. Re-run with --commit to set the password."
  exit 0
fi

# 2. Set the password (accounts:update with localId + password)
RESP="$(curl -s -X POST "${API}/accounts:update" \
  -H "${HDR_AUTH}" -H "${HDR_PROJ}" -H "Content-Type: application/json" \
  -d "{\"localId\":\"${USER_UID}\",\"password\":$(python3 -c "import json,sys; print(json.dumps(sys.argv[1]))" "$NEWPASS")}")"

OK="$(printf '%s' "$RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print('yes' if d.get('localId') and not d.get('error') else 'no')")"
if [[ "$OK" == "yes" ]]; then
  echo "🔴 ✅ Password updated for ${EMAIL} (uid=${USER_UID})."
  echo "   No email sent. Hand the password over securely + have them change it."
else
  echo "❌ Update failed. Raw response:" >&2
  printf '%s\n' "$RESP" | head -c 600 >&2; echo "" >&2
  exit 1
fi
