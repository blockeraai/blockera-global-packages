#!/usr/bin/env bash
# Prepare wp-env, build, and run Cypress E2E for one matrix category.
#
# Required env:
#   BLOCKERA_E2E_CATEGORY
#
# Defaults match the Blockera plugin base. Override via env:
#   BLOCKERA_E2E_INSTALL_CMD
#   BLOCKERA_E2E_COMPOSER_INSTALL / BLOCKERA_E2E_COMPOSER_CMD
#   BLOCKERA_E2E_WP_ENV_CONFIG_DIR     default: .github/wp-env-configs
#   BLOCKERA_E2E_WP_ENV_START_CMD      default: bash packages/global-packages/packages/dev-tools/github/scripts/retry-wp-env-start.sh
#   BLOCKERA_E2E_BUILD_CMD             default: npm run build
#   BLOCKERA_E2E_TEST_CMD              default: npm run test:e2e
#   BLOCKERA_E2E_STOP_CMD              default: npm run env:stop
#   BLOCKERA_E2E_PRODUCT_STYLE         plugin|theme|pro (default: plugin)
#   BLOCKERA_E2E_PACKAGE_GLOB          optional Cypress glob prefix; wins over product style
#   BLOCKERA_E2E_PREPARE_CMD           optional; replaces default .wp-env.json + .env setup
#   BLOCKERA_E2E_PRE_TEST_CMD          optional; runs after build, before category specs
#   BLOCKERA_E2E_PR_ENV_FILE           default: .pr-cypress.env.json (spec filter)
#   BLOCKERA_WP_ENV_PR_ENV_FILE        default: .pr-env.json (wp-env overlay)
#   BLOCKERA_E2E_GENERAL_CATEGORY      default: general-1 (Pro: general)
set -euo pipefail

CATEGORY="${BLOCKERA_E2E_CATEGORY:-}"
if [[ -z "${CATEGORY}" ]]; then
	echo "cypress-e2e/run: BLOCKERA_E2E_CATEGORY is required" >&2
	exit 1
fi

INSTALL_CMD="${BLOCKERA_E2E_INSTALL_CMD:-npx cypress install}"
COMPOSER_INSTALL="${BLOCKERA_E2E_COMPOSER_INSTALL:-true}"
COMPOSER_CMD="${BLOCKERA_E2E_COMPOSER_CMD:-composer install --no-dev -o --apcu-autoloader -a}"
WP_ENV_CONFIG_DIR="${BLOCKERA_E2E_WP_ENV_CONFIG_DIR:-.github/wp-env-configs}"
WP_ENV_START_CMD="${BLOCKERA_E2E_WP_ENV_START_CMD:-bash packages/global-packages/packages/dev-tools/github/scripts/retry-wp-env-start.sh}"
BUILD_CMD="${BLOCKERA_E2E_BUILD_CMD:-npm run build}"
TEST_CMD="${BLOCKERA_E2E_TEST_CMD:-npm run test:e2e}"
STOP_CMD="${BLOCKERA_E2E_STOP_CMD:-npm run env:stop}"
PRODUCT_STYLE="${BLOCKERA_E2E_PRODUCT_STYLE:-plugin}"
PR_ENV_FILE="${BLOCKERA_E2E_PR_ENV_FILE:-.pr-cypress.env.json}"
GENERAL_CATEGORY="${BLOCKERA_E2E_GENERAL_CATEGORY:-general-1}"
PACKAGE_GLOB="${BLOCKERA_E2E_PACKAGE_GLOB:-}"
PREPARE_CMD="${BLOCKERA_E2E_PREPARE_CMD:-}"
PRE_TEST_CMD="${BLOCKERA_E2E_PRE_TEST_CMD:-}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TOOLKIT_SCRIPTS="$(cd "${SCRIPT_DIR}/../.." && pwd)"
CREATE_WP_ENV="${TOOLKIT_SCRIPTS}/create-wp-env.js"
PR_WP_ENV_FILE="${BLOCKERA_WP_ENV_PR_ENV_FILE:-.pr-env.json}"

cleanup() {
	echo "cypress-e2e/run: ${STOP_CMD}"
	eval "${STOP_CMD}" || true
}
trap cleanup EXIT

echo "cypress-e2e/run: category=${CATEGORY} style=${PRODUCT_STYLE}"

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
	export BLOCKERA_WP_ENV_PRODUCT_STYLE="${BLOCKERA_WP_ENV_PRODUCT_STYLE:-${PRODUCT_STYLE}}"
	if [[ -f "${PR_WP_ENV_FILE}" ]]; then
		echo "cypress-e2e/run: merge ${PR_WP_ENV_FILE} via ${CREATE_WP_ENV} ${CATEGORY}"
		node "${CREATE_WP_ENV}" "${CATEGORY}"
	else
		WP_ENV_CONFIG="${WP_ENV_CONFIG_DIR}/base.json"
		if [[ -f "${WP_ENV_CONFIG_DIR}/${CATEGORY}.json" ]]; then
			WP_ENV_CONFIG="${WP_ENV_CONFIG_DIR}/${CATEGORY}.json"
		fi
		echo "cypress-e2e/run: using ${WP_ENV_CONFIG}"
		cp "${WP_ENV_CONFIG}" .wp-env.json
	fi
	cat .wp-env.json

	{
		echo "APP_MODE=production"
		echo "DB=wp_tests"
	} >.env
	cat .env
fi

echo "cypress-e2e/run: ${WP_ENV_START_CMD}"
eval "${WP_ENV_START_CMD}"

echo "cypress-e2e/run: WordPress version $(npx wp-env run cli wp core version)"

echo "cypress-e2e/run: ${BUILD_CMD}"
eval "${BUILD_CMD}"

npx wp-env run cli -- wp eval 'if (!file_exists(WPMU_PLUGIN_DIR)) { wp_mkdir_p(WPMU_PLUGIN_DIR); }'

if [[ -z "${PACKAGE_GLOB}" ]]; then
	if [[ "${PRODUCT_STYLE}" == "theme" ]]; then
		PACKAGE_GLOB='packages/**-one(-**|)/**'
	elif [[ "${PRODUCT_STYLE}" == "pro" ]]; then
		PACKAGE_GLOB='packages/**-pro(-**|)/**'
	fi
fi

build_spec_pattern() {
	local category="$1"

	# Theme / Pro (or any explicit package glob): Cypress brace/negation globs.
	if [[ -n "${PACKAGE_GLOB}" ]]; then
		if [[ "${category}" != "${GENERAL_CATEGORY}" ]]; then
			echo "${PACKAGE_GLOB}/*.${category}.e2e.cy.js"
		else
			echo "${PACKAGE_GLOB}/!(*.*.e2e).cy.js"
		fi
		return
	fi

	# plugin (Blockera base)
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

# Optional PR filter: only keep this category's pattern when listed in the PR env file.
if [[ -f "${PR_ENV_FILE}" ]]; then
	spec_patterns="$(jq -r '.e2e.specPattern[]' "${PR_ENV_FILE}")"
	filtered_categories="$(
		echo "${spec_patterns}" \
			| sed -E 's|.*/([^/]+)\..*|\1|' \
			| sed -E 's|\.e2e\.cy$||' \
			| sort -u
	)"
	echo "cypress-e2e/run: PR filtered categories: ${filtered_categories}"
	for category in ${filtered_categories}; do
		if [[ "${CATEGORY}" == "${category}" ]]; then
			spec_pattern="$(build_spec_pattern "${CATEGORY}")"
			break
		fi
	done
fi

if [[ -n "${PRE_TEST_CMD}" ]]; then
	echo "cypress-e2e/run: pre-test via BLOCKERA_E2E_PRE_TEST_CMD"
	eval "${PRE_TEST_CMD}"
fi

echo "cypress-e2e/run: spec=${spec_pattern}"
eval "${TEST_CMD} -- --spec \"${spec_pattern}\""
