#!/usr/bin/env bash
# Pro Cypress E2E prepare: credentials + create-wp-env-pro (resolves free Blockera).
#
# Required env:
#   BLOCKERA_E2E_CATEGORY
#   GITHUB_TOKEN                 (BLOCKERABOT_PAT) for free artifact download
# Optional:
#   BLOCKERAAI_USERNAME / BLOCKERAAI_USER_PASSWORD → cypress.env.json
set -euo pipefail

CATEGORY="${BLOCKERA_E2E_CATEGORY:-}"
if [[ -z "${CATEGORY}" ]]; then
	echo "cypress-e2e/prepare-pro: BLOCKERA_E2E_CATEGORY is required" >&2
	exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TOOLKIT_SCRIPTS="$(cd "${SCRIPT_DIR}/../.." && pwd)"
CREATE_WP_ENV="${TOOLKIT_SCRIPTS}/create-wp-env-pro.js"

USERNAME="${BLOCKERAAI_USERNAME:-}"
PASSWORD="${BLOCKERAAI_USER_PASSWORD:-}"

jq -n \
	--arg user "${USERNAME}" \
	--arg pass "${PASSWORD}" \
	'{blockeraUserName: $user, blockeraPassword: $pass}' >cypress.env.json
cat cypress.env.json

echo "cypress-e2e/prepare-pro: node ${CREATE_WP_ENV} ${CATEGORY}"
node "${CREATE_WP_ENV}" "${CATEGORY}"
cat .wp-env.json

{
	echo "APP_MODE=production"
	echo "DB=wp_tests"
	echo "CI_ENV=true"
} >.env
cat .env
