#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=shopify_env.sh
source "${SCRIPT_DIR}/shopify_env.sh"

if [[ ! -d "${THEME_PATH}" ]]; then
  echo "ERROR: ./${THEME_PATH} not found. Run scripts/pull_from_dev.sh first." >&2
  exit 1
fi

echo "Starting theme dev preview (sync target = TEST theme): ${THEME_TEST_ID}"
echo "Store: ${SHOPIFY_STORE}"
echo "Local theme path: ./${THEME_PATH}"
echo
echo "IMPORTANT: This will continuously sync local changes to TEST theme only."
echo "It will NOT touch DEV theme unless you run a push command."
echo

cd "${THEME_PATH}"
shopify theme dev --store "${SHOPIFY_STORE}" --theme "${THEME_TEST_ID}"


