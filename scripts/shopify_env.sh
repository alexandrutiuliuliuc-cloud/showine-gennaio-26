#!/usr/bin/env bash
set -euo pipefail

# Shopify store + theme IDs (verified via `shopify theme list --store showine.myshopify.com --json`)
export SHOPIFY_STORE="showine.myshopify.com"

# Preview/dev "ghost" theme (sync target for `shopify theme dev`)
export THEME_TEST_ID="186924204358" # Release [MASSIMO EDIT - TEST]

# Push target theme (draft/unpublished only)
# IMPORTANT: Do NOT set this to a live theme.
# Set this to the ID of: "Release [MASSIMO EDIT - DEV]" (bozza).
export THEME_DEV_ID="187231306054" # Release [MASSIMO EDIT - DEV]

# Local path where the theme lives in this repo
export THEME_PATH="theme"


