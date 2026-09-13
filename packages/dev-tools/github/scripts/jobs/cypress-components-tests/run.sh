#!/usr/bin/env bash
# Install Cypress, optional Composer/build, then run component tests.
#
# Defaults match the Blockera plugin base. Override via env:
#   BLOCKERA_CT_INSTALL_CMD          default: npx cypress install
#   BLOCKERA_CT_COMPOSER_INSTALL     true|false (default: true)
#   BLOCKERA_CT_COMPOSER_CMD         default: composer install --no-dev -o --apcu-autoloader -a
#   BLOCKERA_CT_BUILD                true|false (default: true)
#   BLOCKERA_CT_BUILD_CMD            default: npm run build
#   BLOCKERA_CT_TEST_CMD             default: npm run test:ct
#   BLOCKERA_CT_SKIP_IF_NO_SPECS     true|false (default: false)
#   BLOCKERA_CT_SPECS_ROOTS          space-separated find roots when skipping
#   BLOCKERA_CT_SPECS_NAME           find -name pattern (default: *.component.cy.js)
#   BLOCKERA_CT_CATEGORY            when set, pass --spec for that matrix category
#   BLOCKERA_CT_LIST_CATEGORIES_CMD  default: node …/list-test-categories.js --suffix cy.js --env-prefix BLOCKERA_CT
#   BLOCKERA_CT_PR_ENV_FILE          optional; when the file exists, filter specs
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESOLVE="${SCRIPT_DIR}/../../lib/resolve-dev-tools-root.sh"
DEV_TOOLS="$(bash "${RESOLVE}")"
RETRY_COMPOSER="${SCRIPT_DIR}/../../retry-composer-install.sh"

INSTALL_CMD="${BLOCKERA_CT_INSTALL_CMD:-npx cypress install}"
COMPOSER_INSTALL="${BLOCKERA_CT_COMPOSER_INSTALL:-true}"
COMPOSER_CMD="${BLOCKERA_CT_COMPOSER_CMD:-composer install --no-dev -o --apcu-autoloader -a}"
RUN_BUILD="${BLOCKERA_CT_BUILD:-true}"
BUILD_CMD="${BLOCKERA_CT_BUILD_CMD:-npm run build}"
TEST_CMD="${BLOCKERA_CT_TEST_CMD:-npm run test:ct}"
SKIP_IF_NO_SPECS="${BLOCKERA_CT_SKIP_IF_NO_SPECS:-false}"
SPECS_NAME="${BLOCKERA_CT_SPECS_NAME:-*.component.cy.js}"
CATEGORY="${BLOCKERA_CT_CATEGORY:-}"
PR_ENV_FILE="${BLOCKERA_CT_PR_ENV_FILE:-}"
LIST_CMD="${BLOCKERA_CT_LIST_CATEGORIES_CMD:-node ${DEV_TOOLS}/github/scripts/list-test-categories.js --suffix cy.js --env-prefix BLOCKERA_CT}"

if [[ -z "${CATEGORY}" && "${SKIP_IF_NO_SPECS}" == "true" ]]; then
	SPECS_ROOTS="${BLOCKERA_CT_SPECS_ROOTS:-.}"
	# Expand globs; drop unmatched patterns so missing roots do not fail find
	# under `set -o pipefail` (e.g. theme optional `blockera-one-*`).
	shopt -s nullglob
	# Intentional word-splitting for multiple roots / globs.
	# shellcheck disable=SC2206
	roots=(${SPECS_ROOTS})
	shopt -u nullglob
	if [[ ${#roots[@]} -eq 0 ]]; then
		echo "cypress-components: no roots matched '${SPECS_ROOTS}'; skipping"
		exit 0
	fi
	count="$(find "${roots[@]}" -name "${SPECS_NAME}" 2>/dev/null | wc -l | tr -d '[:space:]' || true)"
	if [[ "${count:-0}" == "0" ]]; then
		echo "cypress-components: no '${SPECS_NAME}' under '${roots[*]}'; skipping"
		exit 0
	fi
	echo "cypress-components: found ${count} spec file(s)"
fi

echo "cypress-components: ${INSTALL_CMD}"
eval "${INSTALL_CMD}"

if [[ "${COMPOSER_INSTALL}" == "true" ]]; then
	echo "cypress-components: ${COMPOSER_CMD}"
	COMPOSER_CMD="${COMPOSER_CMD}" bash "${RETRY_COMPOSER}"
else
	echo "cypress-components: skipping composer (BLOCKERA_CT_COMPOSER_INSTALL=false)"
fi

if [[ "${RUN_BUILD}" == "true" ]]; then
	echo "cypress-components: ${BUILD_CMD}"
	eval "${BUILD_CMD}"
else
	echo "cypress-components: skipping build (BLOCKERA_CT_BUILD=false)"
fi

if [[ -n "${CATEGORY}" ]]; then
	echo "cypress-components: category=${CATEGORY}"
	if [[ -n "${PR_ENV_FILE}" && -f "${PR_ENV_FILE}" ]]; then
		spec_pattern="$(eval "${LIST_CMD} --pr-env \"${PR_ENV_FILE}\" --specs-for-category \"${CATEGORY}\"")"
		echo "cypress-components: PR spec filter (${PR_ENV_FILE}) category=${CATEGORY}"
	else
		spec_pattern="$(eval "${LIST_CMD} --specs-for-category \"${CATEGORY}\"")"
	fi

	if [[ -z "${spec_pattern}" ]]; then
		echo "cypress-components: no specs for category ${CATEGORY}" >&2
		exit 1
	fi

	echo "cypress-components: spec=${spec_pattern}"
	eval "${TEST_CMD} -- --spec \"${spec_pattern}\""
	exit 0
fi

echo "cypress-components: ${TEST_CMD}"
eval "${TEST_CMD}"
