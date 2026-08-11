#!/usr/bin/env bash
# Stage theme (blockera-one) build-zip Cypress fixtures after zip extract.
#
# Required env:
#   BLOCKERA_BUILD_ZIP_TESTS_BUILD_DIR
#   BLOCKERA_BUILD_ZIP_TESTS_PHP_VERSION
#
# Optional:
#   BLOCKERA_BUILD_ZIP_TESTS_SPECS_PATH   default: *-one*
#   BLOCKERA_BUILD_ZIP_TESTS_WP_ENV_CONFIG default: .github/wp-env-configs/base.json
set -euo pipefail

BUILD_DIR="${BLOCKERA_BUILD_ZIP_TESTS_BUILD_DIR:-./build/blockera-one}"
PHP_VERSION="${BLOCKERA_BUILD_ZIP_TESTS_PHP_VERSION:-}"
SPECS_PATH="${BLOCKERA_BUILD_ZIP_TESTS_SPECS_PATH:-*-one*}"
WP_ENV_CONFIG="${BLOCKERA_BUILD_ZIP_TESTS_WP_ENV_CONFIG:-.github/wp-env-configs/base.json}"

if [[ -z "${PHP_VERSION}" ]]; then
	echo "build-zip-tests/prepare-theme: BLOCKERA_BUILD_ZIP_TESTS_PHP_VERSION is required" >&2
	exit 1
fi
if [[ ! -d "${BUILD_DIR}" ]]; then
	echo "build-zip-tests/prepare-theme: build dir missing: ${BUILD_DIR}" >&2
	exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TOOLKIT_SCRIPTS="$(cd "${SCRIPT_DIR}/../.." && pwd)"
WORKSPACE="${GITHUB_WORKSPACE:-$(pwd)}"

(
	cd "${BUILD_DIR}"
	mkdir -p packages/global-packages/packages/blockera/tests
	mkdir -p packages/global-packages/packages/dev-tools/github/scripts
	mkdir -p .github/wp-env-configs

	cp "${TOOLKIT_SCRIPTS}/setup-wp-env.js" packages/global-packages/packages/dev-tools/github/scripts/
	cp "${TOOLKIT_SCRIPTS}/retry-wp-env-start.sh" packages/global-packages/packages/dev-tools/github/scripts/
	chmod +x packages/global-packages/packages/dev-tools/github/scripts/retry-wp-env-start.sh

	cp "${WORKSPACE}/${WP_ENV_CONFIG}" .github/wp-env-configs/base.json
	cp .github/wp-env-configs/base.json .wp-env.json
	jq --arg php "${PHP_VERSION}" '. + {"phpVersion": $php}' .wp-env.json >.wp-env.json.tmp
	mv .wp-env.json.tmp .wp-env.json
	cat .wp-env.json

	cat >cypress.env.json <<'EOF'
{"isLogin": false,"wpUsername": "admin","wpPassword": "password","testURL": "http://localhost:8888","e2e": {"excludeSpecPattern": [],"specPattern": ["packages/**/*.build.e2e.cy.js"]}}
EOF
	cat cypress.env.json
)

cp -r ./cypress "${BUILD_DIR}/"
cp ./package.json "${BUILD_DIR}/"
cp -r ./node_modules "${BUILD_DIR}/"
cp ./cypress.config.js "${BUILD_DIR}/"
cp ./babel.config.js "${BUILD_DIR}/"

mkdir -p "${BUILD_DIR}/packages/global-packages/packages"
cp -r ./packages/global-packages/packages/dev-cypress "${BUILD_DIR}/packages/global-packages/packages/"

# Thin root cypress/babel configs require shared factories under dev-tools.
mkdir -p "${BUILD_DIR}/packages/global-packages/packages/dev-tools/js"
if [[ -d ./packages/global-packages/packages/dev-tools/js/cypress ]]; then
	cp -r ./packages/global-packages/packages/dev-tools/js/cypress \
		"${BUILD_DIR}/packages/global-packages/packages/dev-tools/js/"
fi
if [[ -d ./packages/global-packages/packages/dev-tools/js/babel ]]; then
	cp -r ./packages/global-packages/packages/dev-tools/js/babel \
		"${BUILD_DIR}/packages/global-packages/packages/dev-tools/js/"
fi

mkdir -p "${BUILD_DIR}/packages/global-packages/packages/editor/js/tabs/constants"
mkdir -p "${BUILD_DIR}/packages/global-packages/packages/editor/js/preview-mode/constants"
cp ./packages/global-packages/packages/editor/js/tabs/constants/testIds.ts \
	"${BUILD_DIR}/packages/global-packages/packages/editor/js/tabs/constants/"
cp ./packages/global-packages/packages/editor/js/preview-mode/constants/testIds.ts \
	"${BUILD_DIR}/packages/global-packages/packages/editor/js/preview-mode/constants/"

find ./packages -path "${SPECS_PATH}" -name "*.build.e2e.cy.js" -type f \
	-exec cp {} "${BUILD_DIR}/packages/global-packages/packages/blockera/tests" \;

echo "build-zip-tests/prepare-theme: done → ${BUILD_DIR}"
