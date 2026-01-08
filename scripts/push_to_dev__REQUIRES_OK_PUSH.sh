#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=shopify_env.sh
source "${SCRIPT_DIR}/shopify_env.sh"

if [[ "${OK_PUSH:-}" != "YES" ]]; then
  cat >&2 <<'EOF'
BLOCKED: push is disabled by default.

If you really want to push local changes to the DEV theme, run:
  OK_PUSH=YES ./scripts/push_to_dev__REQUIRES_OK_PUSH.sh

This script pushes ONLY to "Release [MASSIMO EDIT - DEV]" (THEME_DEV_ID).
EOF
  exit 1
fi

if [[ ! -d "${THEME_PATH}" ]]; then
  echo "ERROR: ./${THEME_PATH} not found. Nothing to push." >&2
  exit 1
fi

echo "Safety check: fetching theme list to validate IDs/names..."
themes_json="$(shopify theme list --store "${SHOPIFY_STORE}" --json)"

if ! echo "${themes_json}" | grep -q "\"id\": ${THEME_DEV_ID}"; then
  echo "ERROR: DEV theme id ${THEME_DEV_ID} not found in theme list. Aborting." >&2
  exit 1
fi
if ! echo "${themes_json}" | grep -q "Release \\[MASSIMO EDIT - DEV\\]"; then
  echo "ERROR: Expected theme name 'Release [MASSIMO EDIT - DEV]' not found. Aborting." >&2
  exit 1
fi

echo "PUSHING to DEV theme: ${THEME_DEV_ID}"
echo "Store: ${SHOPIFY_STORE}"
echo "Local theme path: ./${THEME_PATH}"
echo

shopify theme push --store "${SHOPIFY_STORE}" --theme "${THEME_DEV_ID}" --path "${THEME_PATH}"


