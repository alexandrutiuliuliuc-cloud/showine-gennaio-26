#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=shopify_env.sh
source "${SCRIPT_DIR}/shopify_env.sh"

if [[ -z "${THEME_DEV_ID:-}" ]]; then
  cat >&2 <<'EOF'
ERROR: THEME_DEV_ID is not set.

Set THEME_DEV_ID to the ID of the *draft* theme "Release [MASSIMO EDIT - DEV]" and retry.

Tip: run `shopify theme list --store <store> --json` to find the correct ID.
EOF
  exit 1
fi

if [[ "${OK_PUSH:-}" != "YES" ]]; then
  cat >&2 <<'EOF'
BLOCKED: push is disabled by default.

If you really want to push local changes to the DEV theme, run:
  OK_PUSH=YES ./scripts/push_to_dev__REQUIRES_OK_PUSH.sh

This script pushes ONLY to "Release [MASSIMO EDIT - DEV]" (THEME_DEV_ID).
EOF
  exit 1
fi

# Hard guard: prevent accidental full theme pushes.
# A FULL push overwrites remote files and can wipe Theme Editor changes.
if [[ "${FULL_PUSH:-}" == "YES" && "${OK_FULL_PUSH:-}" != "YES" ]]; then
  cat >&2 <<'EOF'
BLOCKED: FULL_PUSH=YES is dangerous and is disabled by default.

If you really intend to do a FULL theme push (overwrites remote files),
you MUST set BOTH:
  FULL_PUSH=YES OK_FULL_PUSH=YES

Otherwise, use the default safe mode (push only changed files).
EOF
  exit 1
fi

if [[ ! -d "${THEME_PATH}" ]]; then
  echo "ERROR: ./${THEME_PATH} not found. Nothing to push." >&2
  exit 1
fi

echo "Safety check: fetching theme list to validate IDs/names..."
themes_json="$(shopify theme list --store "${SHOPIFY_STORE}" --json)"

EXPECTED_DEV_THEME_NAME="${EXPECTED_DEV_THEME_NAME:-Release [MASSIMO EDIT - DEV]}"

# Strong validation: the *specific* THEME_DEV_ID must match the expected DEV theme name.
# We parse JSON via node (Shopify CLI ships with node) to avoid jq dependency.
theme_meta_json="$(
  node -e '
    const fs = require("fs");
    const themes = JSON.parse(fs.readFileSync(0, "utf8"));
    const id = Number(process.env.THEME_DEV_ID);
    const t = themes.find(x => Number(x.id) === id);
    if (!t) process.exit(2);
    process.stdout.write(JSON.stringify({ id: t.id, name: t.name, role: t.role }));
  ' <<<"${themes_json}" 2>/dev/null || true
)"

if [[ -z "${theme_meta_json}" ]]; then
  echo "ERROR: DEV theme id ${THEME_DEV_ID} not found (or JSON parse failed). Aborting." >&2
  exit 1
fi

theme_name="$(
  node -e 'const o=JSON.parse(fs.readFileSync(0,"utf8")); process.stdout.write(String(o.name||""));' \
    <<<"${theme_meta_json}" 2>/dev/null || true
)"
theme_role="$(
  node -e 'const o=JSON.parse(fs.readFileSync(0,"utf8")); process.stdout.write(String(o.role||""));' \
    <<<"${theme_meta_json}" 2>/dev/null || true
)"

if [[ "${theme_name}" != "${EXPECTED_DEV_THEME_NAME}" ]]; then
  echo "ERROR: Theme id ${THEME_DEV_ID} name mismatch." >&2
  echo "  Expected: ${EXPECTED_DEV_THEME_NAME}" >&2
  echo "  Actual:   ${theme_name}" >&2
  echo "Aborting to avoid pushing to the wrong theme." >&2
  exit 1
fi

# Extra guard: never push to the published/main theme by mistake.
if [[ "${theme_role}" == "main" && "${ALLOW_MAIN_THEME_PUSH:-}" != "YES" ]]; then
  echo "ERROR: Theme id ${THEME_DEV_ID} appears to be the MAIN (published) theme." >&2
  echo "Refusing to push. If this is intentional, run with ALLOW_MAIN_THEME_PUSH=YES (not recommended)." >&2
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

declare -a changed_files=()
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

if [[ ${#changed_files[@]} -eq 0 ]]; then
  echo "No changed files under ${THEME_PATH}/ to push. Skipping."
  exit 0
fi

declare -a only_args=()
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


