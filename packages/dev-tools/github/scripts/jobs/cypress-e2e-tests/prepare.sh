#!/usr/bin/env bash
# Shared Cypress E2E prepare: .wp-env.json + .env.
#
# Required env:
#   BLOCKERA_E2E_CATEGORY
#
# Optional:
#   BLOCKERA_E2E_WP_ENV_CONFIG_DIR   default: .github/wp-env-configs
#   BLOCKERA_WP_ENV_PR_ENV_FILE      default: .pr-env.json
#   BLOCKERA_E2E_USE_CREATE_WP_ENV   true = always run create-wp-env.js
#   BLOCKERA_E2E_WRITE_CYPRESS_ENV   true = write cypress.env.json from BLOCKERAAI_* 
#   BLOCKERA_E2E_CI_ENV              true = add CI_ENV=true to .env
#   GITHUB_TOKEN                     when create-wp-env.js downloads GitHub sources
set -euo pipefail

CATEGORY="${BLOCKERA_E2E_CATEGORY:-}"
if [[ -z "${CATEGORY}" ]]; then
	echo "cypress-e2e/prepare: BLOCKERA_E2E_CATEGORY is required" >&2
	exit 1
fi

WP_ENV_CONFIG_DIR="${BLOCKERA_E2E_WP_ENV_CONFIG_DIR:-.github/wp-env-configs}"
PR_WP_ENV_FILE="${BLOCKERA_WP_ENV_PR_ENV_FILE:-.pr-env.json}"
USE_CREATE_WP_ENV="${BLOCKERA_E2E_USE_CREATE_WP_ENV:-false}"
WRITE_CYPRESS_ENV="${BLOCKERA_E2E_WRITE_CYPRESS_ENV:-false}"
WRITE_CI_ENV="${BLOCKERA_E2E_CI_ENV:-false}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TOOLKIT_SCRIPTS="$(cd "${SCRIPT_DIR}/../.." && pwd)"
CREATE_WP_ENV="${TOOLKIT_SCRIPTS}/create-wp-env.js"

echo "cypress-e2e/prepare: category=${CATEGORY}"

if [[ "${WRITE_CYPRESS_ENV}" == "true" ]]; then
	USERNAME="${BLOCKERAAI_USERNAME:-}"
	PASSWORD="${BLOCKERAAI_USER_PASSWORD:-}"
	jq -n \
		--arg user "${USERNAME}" \
		--arg pass "${PASSWORD}" \
		'{blockeraUserName: $user, blockeraPassword: $pass}' >cypress.env.json
	cat cypress.env.json
fi

if [[ "${USE_CREATE_WP_ENV}" == "true" || -f "${PR_WP_ENV_FILE}" ]]; then
	echo "cypress-e2e/prepare: node ${CREATE_WP_ENV} ${CATEGORY}"
	node "${CREATE_WP_ENV}" "${CATEGORY}"
else
	WP_ENV_CONFIG="${WP_ENV_CONFIG_DIR}/base.json"
	if [[ -f "${WP_ENV_CONFIG_DIR}/${CATEGORY}.json" ]]; then
		WP_ENV_CONFIG="${WP_ENV_CONFIG_DIR}/${CATEGORY}.json"
	fi
	echo "cypress-e2e/prepare: using ${WP_ENV_CONFIG}"
	cp "${WP_ENV_CONFIG}" .wp-env.json
fi
cat .wp-env.json

{
	echo "APP_MODE=production"
	echo "DB=wp_tests"
	if [[ "${WRITE_CI_ENV}" == "true" ]]; then
		echo "CI_ENV=true"
	fi
} >.env
cat .env
