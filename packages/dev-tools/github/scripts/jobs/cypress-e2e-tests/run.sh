#!/usr/bin/env bash
# Prepare wp-env, build, and run Cypress E2E for one matrix category.
#
# Required env:
#   BLOCKERA_E2E_CATEGORY
#
# Optional:
#   BLOCKERA_E2E_INSTALL_CMD
#   BLOCKERA_E2E_COMPOSER_INSTALL / BLOCKERA_E2E_COMPOSER_CMD
#   BLOCKERA_E2E_WP_ENV_START_CMD
#   BLOCKERA_E2E_BUILD_CMD / _TEST_CMD / _STOP_CMD
#   BLOCKERA_E2E_PACKAGE_GLOB          Cypress glob prefix (empty = packages + tests)
#   BLOCKERA_E2E_PREPARE_CMD           replaces prepare.sh
#   BLOCKERA_E2E_PRE_TEST_CMD          after build, before category specs
#   BLOCKERA_E2E_PR_ENV_FILE           default: .pr-cypress.env.json
#   BLOCKERA_CYPRESS_IGNORE_PR_FILTER  set during PRE_TEST when PR filter file exists
#   BLOCKERA_E2E_GENERAL_CATEGORY      default: general-1
set -euo pipefail

CATEGORY="${BLOCKERA_E2E_CATEGORY:-}"
if [[ -z "${CATEGORY}" ]]; then
	echo "cypress-e2e/run: BLOCKERA_E2E_CATEGORY is required" >&2
	exit 1
fi

INSTALL_CMD="${BLOCKERA_E2E_INSTALL_CMD:-npx cypress install}"
COMPOSER_INSTALL="${BLOCKERA_E2E_COMPOSER_INSTALL:-true}"
COMPOSER_CMD="${BLOCKERA_E2E_COMPOSER_CMD:-composer install --no-dev -o --apcu-autoloader -a}"
WP_ENV_START_CMD="${BLOCKERA_E2E_WP_ENV_START_CMD:-bash packages/global-packages/packages/dev-tools/github/scripts/retry-wp-env-start.sh}"
BUILD_CMD="${BLOCKERA_E2E_BUILD_CMD:-npm run build}"
TEST_CMD="${BLOCKERA_E2E_TEST_CMD:-npm run test:e2e}"
STOP_CMD="${BLOCKERA_E2E_STOP_CMD:-npm run env:stop}"
PR_ENV_FILE="${BLOCKERA_E2E_PR_ENV_FILE:-.pr-cypress.env.json}"
GENERAL_CATEGORY="${BLOCKERA_E2E_GENERAL_CATEGORY:-general-1}"
PACKAGE_GLOB="${BLOCKERA_E2E_PACKAGE_GLOB:-}"
LIST_CMD="${BLOCKERA_E2E_LIST_CATEGORIES_CMD:-node packages/global-packages/packages/dev-tools/github/scripts/list-test-categories.js --suffix e2e.cy.js --env-prefix BLOCKERA_E2E}"
PREPARE_CMD="${BLOCKERA_E2E_PREPARE_CMD:-}"
PRE_TEST_CMD="${BLOCKERA_E2E_PRE_TEST_CMD:-}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cleanup() {
	echo "cypress-e2e/run: ${STOP_CMD}"
	eval "${STOP_CMD}" || true
}
trap cleanup EXIT

echo "cypress-e2e/run: category=${CATEGORY}"

echo "cypress-e2e/run: ${INSTALL_CMD}"
eval "${INSTALL_CMD}"

if [[ "${COMPOSER_INSTALL}" == "true" ]]; then
	echo "cypress-e2e/run: ${COMPOSER_CMD}"
	eval "${COMPOSER_CMD}"
fi

if [[ -n "${PREPARE_CMD}" ]]; then
	echo "cypress-e2e/run: prepare via BLOCKERA_E2E_PREPARE_CMD"
	eval "${PREPARE_CMD}"
else
	echo "cypress-e2e/run: prepare.sh"
	bash "${SCRIPT_DIR}/prepare.sh"
fi

echo "cypress-e2e/run: ${WP_ENV_START_CMD}"
eval "${WP_ENV_START_CMD}"

echo "cypress-e2e/run: WordPress version $(npx wp-env run cli wp core version)"

echo "cypress-e2e/run: ${BUILD_CMD}"
eval "${BUILD_CMD}"

npx wp-env run cli -- wp eval 'if (!file_exists(WPMU_PLUGIN_DIR)) { wp_mkdir_p(WPMU_PLUGIN_DIR); }'

build_spec_pattern() {
	local category="$1"

	if [[ -n "${PACKAGE_GLOB}" ]]; then
		if [[ "${category}" != "${GENERAL_CATEGORY}" ]]; then
			echo "${PACKAGE_GLOB}/*.${category}.e2e.cy.js"
		else
			echo "${PACKAGE_GLOB}/!(*.*.e2e).cy.js"
		fi
		return
	fi

	if [[ "${category}" != "${GENERAL_CATEGORY}" ]]; then
		local pattern="packages/**/*.${category}.e2e.cy.js"
		if [[ -d "tests" ]]; then
			pattern="${pattern},tests/**/*.${category}.e2e.cy.js"
		fi
		echo "${pattern}"
		return
	fi

	local search_dirs="packages"
	if [[ -d "tests" ]]; then
		search_dirs="${search_dirs} tests"
	fi
	# shellcheck disable=SC2086
	local pattern
	pattern="$(find ${search_dirs} -type f -name "*.e2e.cy.js" ! -name "*.*.e2e.cy.js" | tr '\n' ',')"
	echo "${pattern%,}"
}

spec_pattern="$(build_spec_pattern "${CATEGORY}")"

if [[ -f "${PR_ENV_FILE}" ]]; then
	spec_pattern="$(eval "${LIST_CMD} --pr-env \"${PR_ENV_FILE}\" --specs-for-category \"${CATEGORY}\"")"
	echo "cypress-e2e/run: PR spec filter (${PR_ENV_FILE}) category=${CATEGORY}"
	if [[ -z "${spec_pattern}" ]]; then
		echo "cypress-e2e/run: no specs in ${PR_ENV_FILE} for category ${CATEGORY}" >&2
		exit 1
	fi
fi

if [[ -n "${PRE_TEST_CMD}" ]]; then
	echo "cypress-e2e/run: pre-test via BLOCKERA_E2E_PRE_TEST_CMD"
	if [[ -f "${PR_ENV_FILE}" ]]; then
		# .pr-cypress.env.json narrows Cypress specPattern; ignore it for PRE_TEST
		# so --spec in BLOCKERA_E2E_PRE_TEST_CMD can run outside the PR filter list.
		BLOCKERA_CYPRESS_IGNORE_PR_FILTER=true eval "${PRE_TEST_CMD}"
	else
		eval "${PRE_TEST_CMD}"
	fi
fi

echo "cypress-e2e/run: spec=${spec_pattern}"
eval "${TEST_CMD} -- --spec \"${spec_pattern}\""
