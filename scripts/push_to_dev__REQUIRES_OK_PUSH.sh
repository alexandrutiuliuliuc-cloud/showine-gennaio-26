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

if [[ "${FULL_PUSH:-}" == "YES" ]]; then
  echo "FULL_PUSH=YES: pushing the full theme (may overwrite manual Theme Editor changes)."
  shopify theme push --store "${SHOPIFY_STORE}" --theme "${THEME_DEV_ID}" --path "${THEME_PATH}"
  exit 0
fi

# Default: push only changed files under theme/ (safer, avoids overwriting Theme Editor edits).
# - Includes staged + unstaged + untracked files
# - Excludes editor-managed settings_data.json
repo_root="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "${repo_root}" ]]; then
  echo "ERROR: Not a git repo; refusing to push the full theme by default." >&2
  echo "Run with FULL_PUSH=YES to override, or run Shopify CLI with --only for specific files." >&2
  exit 1
fi

changed_files=()
while IFS= read -r f; do
  [[ -n "${f}" ]] || continue
  changed_files+=("${f}")
done < <(
  {
    git diff --name-only --relative -- "${THEME_PATH}/" || true
    git diff --name-only --relative --cached -- "${THEME_PATH}/" || true
    git ls-files --others --exclude-standard -- "${THEME_PATH}/" || true
  } | sort -u
)

only_args=()
for f in "${changed_files[@]}"; do
  # Exclude Theme Editor managed file to avoid overwriting manual edits.
  if [[ "${f}" == "${THEME_PATH}/config/settings_data.json" ]]; then
    continue
  fi
  # Convert repo-relative (theme/...) to theme-root relative (config/..., sections/...)
  rel="${f#${THEME_PATH}/}"
  [[ -n "${rel}" ]] || continue
  only_args+=(--only "${rel}")
done

if [[ ${#only_args[@]} -eq 0 ]]; then
  echo "No changed files under ${THEME_PATH}/ to push. Skipping."
  exit 0
fi

echo "Pushing only changed theme files:"
for ((i=0; i<${#only_args[@]}; i+=2)); do
  echo "  - ${only_args[i+1]}"
done
echo

shopify theme push \
  --store "${SHOPIFY_STORE}" \
  --theme "${THEME_DEV_ID}" \
  --path "${THEME_PATH}" \
  "${only_args[@]}"


