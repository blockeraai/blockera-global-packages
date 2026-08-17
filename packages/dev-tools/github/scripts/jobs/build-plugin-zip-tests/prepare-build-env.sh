#!/usr/bin/env bash
# Extract the product zip and stage Cypress/wp-env fixtures for build E2E tests.
#
# Consumers pass dest/path/wp-env knobs via env — there is no product-style switch.
#
#   BLOCKERA_BUILD_ZIP_TESTS_ZIP                 default: blockera.zip
#   BLOCKERA_BUILD_ZIP_TESTS_BUILD_DIR           default: ./build/blockera
#   BLOCKERA_BUILD_ZIP_TESTS_PHP_VERSION         required (matrix.php)
#   BLOCKERA_BUILD_ZIP_TESTS_WP_ENV_CONFIG       default: .github/wp-env-configs/base.json
#   BLOCKERA_BUILD_ZIP_TESTS_USE_CREATE_WP_ENV   true = run create-wp-env.js
#   BLOCKERA_BUILD_ZIP_TESTS_WP_ENV_CATEGORY     create-wp-env category (required when USE_CREATE_WP_ENV)
#   BLOCKERA_BUILD_ZIP_TESTS_SPECS_ROOTS         default: ./packages/global-packages/packages
#   BLOCKERA_BUILD_ZIP_TESTS_SPECS_PATH          find -path (empty = any)
#   BLOCKERA_BUILD_ZIP_TESTS_SPECS_NAME          default: *.build.e2e.cy.js
#   BLOCKERA_BUILD_ZIP_TESTS_SPECS_DEST          default: packages/global-packages/packages/blockera/tests
#   BLOCKERA_BUILD_ZIP_TESTS_CYPRESS_SPEC_PATTERN  comma list; default: packages/**/*.build.e2e.cy.js
#   BLOCKERA_BUILD_ZIP_TESTS_PREPARE_CMD         optional extra hook after default staging
set -euo pipefail

ZIP_FILE="${BLOCKERA_BUILD_ZIP_TESTS_ZIP:-blockera.zip}"
BUILD_DIR="${BLOCKERA_BUILD_ZIP_TESTS_BUILD_DIR:-./build/blockera}"
PHP_VERSION="${BLOCKERA_BUILD_ZIP_TESTS_PHP_VERSION:-}"
WP_ENV_CONFIG="${BLOCKERA_BUILD_ZIP_TESTS_WP_ENV_CONFIG:-.github/wp-env-configs/base.json}"
USE_CREATE_WP_ENV="${BLOCKERA_BUILD_ZIP_TESTS_USE_CREATE_WP_ENV:-false}"
WP_ENV_CATEGORY="${BLOCKERA_BUILD_ZIP_TESTS_WP_ENV_CATEGORY:-}"
SPECS_ROOTS="${BLOCKERA_BUILD_ZIP_TESTS_SPECS_ROOTS:-./packages/global-packages/packages}"
SPECS_PATH="${BLOCKERA_BUILD_ZIP_TESTS_SPECS_PATH:-}"
SPECS_NAME="${BLOCKERA_BUILD_ZIP_TESTS_SPECS_NAME:-*.build.e2e.cy.js}"
SPECS_DEST="${BLOCKERA_BUILD_ZIP_TESTS_SPECS_DEST:-packages/global-packages/packages/blockera/tests}"
CYPRESS_SPEC_PATTERN="${BLOCKERA_BUILD_ZIP_TESTS_CYPRESS_SPEC_PATTERN:-packages/**/*.build.e2e.cy.js}"

if [[ -z "${PHP_VERSION}" ]]; then
	echo "build-zip-tests/prepare: BLOCKERA_BUILD_ZIP_TESTS_PHP_VERSION is required" >&2
	exit 1
fi
if [[ ! -f "${ZIP_FILE}" ]]; then
	echo "build-zip-tests/prepare: zip not found: ${ZIP_FILE}" >&2
	exit 1
fi
if [[ "${USE_CREATE_WP_ENV}" == "true" && -z "${WP_ENV_CATEGORY}" ]]; then
	echo "build-zip-tests/prepare: BLOCKERA_BUILD_ZIP_TESTS_WP_ENV_CATEGORY is required when USE_CREATE_WP_ENV=true" >&2
	exit 1
fi

WORKSPACE="${GITHUB_WORKSPACE:-$(pwd)}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TOOLKIT_SCRIPTS="$(cd "${SCRIPT_DIR}/../.." && pwd)"
CREATE_WP_ENV="${TOOLKIT_SCRIPTS}/create-wp-env.js"

copy_if() {
	local src="$1"
	local dest="$2"
	if [[ ! -e "${src}" ]]; then
		return 0
	fi
	mkdir -p "$(dirname "${dest}")"
	if [[ -d "${src}" ]]; then
		cp -r "${src}" "${dest}"
	else
		cp "${src}" "${dest}"
	fi
}

inject_php_version() {
	local file="$1"
	jq --arg php "${PHP_VERSION}" '. + {"phpVersion": $php}' "${file}" >"${file}.tmp"
	mv "${file}.tmp" "${file}"
}

echo "build-zip-tests/prepare: extract ${ZIP_FILE} → ${BUILD_DIR}"
rm -rf "${BUILD_DIR}"
mkdir -p "${BUILD_DIR}"
unzip -q "${ZIP_FILE}" -d "${BUILD_DIR}"
rm -f "${ZIP_FILE}"

echo "build-zip-tests/prepare: staging fixtures (php=${PHP_VERSION})"

mkdir -p "${BUILD_DIR}/.github/wp-env-configs"
mkdir -p "${BUILD_DIR}/packages/global-packages/packages/dev-tools/github/scripts"
mkdir -p "${BUILD_DIR}/${SPECS_DEST}"

cp "${TOOLKIT_SCRIPTS}/setup-wp-env.js" \
	"${BUILD_DIR}/packages/global-packages/packages/dev-tools/github/scripts/"
cp "${TOOLKIT_SCRIPTS}/retry-wp-env-start.sh" \
	"${BUILD_DIR}/packages/global-packages/packages/dev-tools/github/scripts/"
chmod +x "${BUILD_DIR}/packages/global-packages/packages/dev-tools/github/scripts/retry-wp-env-start.sh"
# retry-wp-env-start.sh runs lib/retry.sh relative to its own directory.
mkdir -p "${BUILD_DIR}/packages/global-packages/packages/dev-tools/github/scripts/lib"
cp "${TOOLKIT_SCRIPTS}/lib/retry.sh" \
	"${BUILD_DIR}/packages/global-packages/packages/dev-tools/github/scripts/lib/"
chmod +x "${BUILD_DIR}/packages/global-packages/packages/dev-tools/github/scripts/lib/retry.sh"

if [[ "${USE_CREATE_WP_ENV}" == "true" ]]; then
	if [[ -f "${WORKSPACE}/.github/wp-env-configs/${WP_ENV_CATEGORY}.json" ]]; then
		cp "${WORKSPACE}/.github/wp-env-configs/${WP_ENV_CATEGORY}.json" \
			"${BUILD_DIR}/.github/wp-env-configs/"
	fi
	echo "build-zip-tests/prepare: node ${CREATE_WP_ENV} ${WP_ENV_CATEGORY}"
	node "${CREATE_WP_ENV}" "${WP_ENV_CATEGORY}"
	inject_php_version .wp-env.json
	cp .wp-env.json "${BUILD_DIR}/.wp-env.json"
else
	cp "${WORKSPACE}/${WP_ENV_CONFIG}" "${BUILD_DIR}/.github/wp-env-configs/base.json"
	cp "${BUILD_DIR}/.github/wp-env-configs/base.json" "${BUILD_DIR}/.wp-env.json"
	inject_php_version "${BUILD_DIR}/.wp-env.json"
fi
cat "${BUILD_DIR}/.wp-env.json"

spec_json="$(
	jq -nc --arg raw "${CYPRESS_SPEC_PATTERN}" '
		$raw
		| split(",")
		| map(gsub("^\\s+|\\s+$"; ""))
		| map(select(. != ""))
	'
)"
jq -n --argjson spec "${spec_json}" '{
	isLogin: false,
	wpUsername: "admin",
	wpPassword: "password",
	testURL: "http://localhost:8888",
	e2e: { excludeSpecPattern: [], specPattern: $spec }
}' >"${BUILD_DIR}/cypress.env.json"
cat "${BUILD_DIR}/cypress.env.json"

copy_if ./cypress "${BUILD_DIR}/cypress"
cp ./package.json "${BUILD_DIR}/"
cp -r ./node_modules "${BUILD_DIR}/"
cp ./cypress.config.js "${BUILD_DIR}/"
copy_if ./babel.config.js "${BUILD_DIR}/babel.config.js"

mkdir -p "${BUILD_DIR}/packages/global-packages/packages"
copy_if ./packages/global-packages/packages/dev-cypress \
	"${BUILD_DIR}/packages/global-packages/packages/dev-cypress"

mkdir -p "${BUILD_DIR}/packages/global-packages/packages/dev-tools/js"
copy_if ./packages/global-packages/packages/dev-tools/js/cypress \
	"${BUILD_DIR}/packages/global-packages/packages/dev-tools/js/cypress"
copy_if ./packages/global-packages/packages/dev-tools/js/babel \
	"${BUILD_DIR}/packages/global-packages/packages/dev-tools/js/babel"

copy_if ./packages/global-packages/packages/editor/js/tabs/constants/testIds.ts \
	"${BUILD_DIR}/packages/global-packages/packages/editor/js/tabs/constants/testIds.ts"
copy_if ./packages/global-packages/packages/editor/js/preview-mode/constants/testIds.ts \
	"${BUILD_DIR}/packages/global-packages/packages/editor/js/preview-mode/constants/testIds.ts"
copy_if ./packages/global-packages/packages/controls/js/libs/feature-wrapper/constants/testIds.js \
	"${BUILD_DIR}/packages/global-packages/packages/controls/js/libs/feature-wrapper/constants/testIds.js"

SPECS_ROOTS="${SPECS_ROOTS//,/ }"
shopt -s nullglob
# Intentional word-splitting for multiple roots / globs.
# shellcheck disable=SC2206
roots=(${SPECS_ROOTS})
shopt -u nullglob

if [[ ${#roots[@]} -gt 0 ]]; then
	if [[ -n "${SPECS_PATH}" ]]; then
		find "${roots[@]}" -path "${SPECS_PATH}" -name "${SPECS_NAME}" -type f \
			-exec cp {} "${BUILD_DIR}/${SPECS_DEST}" \;
	else
		find "${roots[@]}" -type f -name "${SPECS_NAME}" \
			-exec cp {} "${BUILD_DIR}/${SPECS_DEST}" \;
	fi
fi

if [[ -n "${BLOCKERA_BUILD_ZIP_TESTS_PREPARE_CMD:-}" ]]; then
	echo "build-zip-tests/prepare: extra ${BLOCKERA_BUILD_ZIP_TESTS_PREPARE_CMD}"
	eval "${BLOCKERA_BUILD_ZIP_TESTS_PREPARE_CMD}"
fi

echo "build-zip-tests/prepare: done → ${BUILD_DIR}"
