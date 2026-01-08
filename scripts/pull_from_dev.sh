#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=shopify_env.sh
source "${SCRIPT_DIR}/shopify_env.sh"

mkdir -p "${THEME_PATH}"

echo "Pulling from DEV theme: ${THEME_DEV_ID} into ./${THEME_PATH}"
shopify theme pull --store "${SHOPIFY_STORE}" --theme "${THEME_DEV_ID}" --path "${THEME_PATH}"


