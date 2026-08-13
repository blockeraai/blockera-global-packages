#!/usr/bin/env bash
# Theme Cypress E2E prepare: merge category wp-env with optional .pr-env.json.
#
# Required env:
#   BLOCKERA_E2E_CATEGORY
# Optional:
#   GITHUB_TOKEN (BLOCKERABOT_PAT) when .pr-env.json uses a GitHub tree/artifact/branch
set -euo pipefail

CATEGORY="${BLOCKERA_E2E_CATEGORY:-}"
if [[ -z "${CATEGORY}" ]]; then
	echo "cypress-e2e/prepare-theme: BLOCKERA_E2E_CATEGORY is required" >&2
	exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TOOLKIT_SCRIPTS="$(cd "${SCRIPT_DIR}/../.." && pwd)"
CREATE_WP_ENV="${TOOLKIT_SCRIPTS}/create-wp-env.js"

export BLOCKERA_WP_ENV_PRODUCT_STYLE="${BLOCKERA_WP_ENV_PRODUCT_STYLE:-${BLOCKERA_E2E_PRODUCT_STYLE:-theme}}"

echo "cypress-e2e/prepare-theme: node ${CREATE_WP_ENV} ${CATEGORY}"
node "${CREATE_WP_ENV}" "${CATEGORY}"
cat .wp-env.json

{
	echo "APP_MODE=production"
	echo "DB=wp_tests"
	echo "CI_ENV=true"
} >.env
cat .env
