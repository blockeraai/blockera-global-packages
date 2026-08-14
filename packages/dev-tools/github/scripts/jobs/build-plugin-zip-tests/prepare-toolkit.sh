#!/usr/bin/env bash
# Stage Site Toolkit build-zip Cypress fixtures after the product zip is extracted.
#
# Required env:
#   BLOCKERA_BUILD_ZIP_TESTS_BUILD_DIR
#   BLOCKERA_BUILD_ZIP_TESTS_PHP_VERSION
#
# Optional:
#   BLOCKERA_BUILD_ZIP_TESTS_SPECS_PATH   default: *toolkit*
#   BLOCKERA_BUILD_ZIP_TESTS_WP_ENV_CONFIG default: .github/wp-env-configs/base.json
set -euo pipefail

BUILD_DIR="${BLOCKERA_BUILD_ZIP_TESTS_BUILD_DIR:-./build/blockera-site-toolkit}"
PHP_VERSION="${BLOCKERA_BUILD_ZIP_TESTS_PHP_VERSION:-}"
SPECS_PATH="${BLOCKERA_BUILD_ZIP_TESTS_SPECS_PATH:-*toolkit*}"
WP_ENV_CONFIG="${BLOCKERA_BUILD_ZIP_TESTS_WP_ENV_CONFIG:-.github/wp-env-configs/base.json}"

if [[ -z "${PHP_VERSION}" ]]; then
	echo "build-zip-tests/prepare-toolkit: BLOCKERA_BUILD_ZIP_TESTS_PHP_VERSION is required" >&2
	exit 1
fi
if [[ ! -d "${BUILD_DIR}" ]]; then
	echo "build-zip-tests/prepare-toolkit: build dir missing: ${BUILD_DIR}" >&2
	exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TOOLKIT_SCRIPTS="$(cd "${SCRIPT_DIR}/../.." && pwd)"
WORKSPACE="${GITHUB_WORKSPACE:-$(pwd)}"

echo "build-zip-tests/prepare-toolkit: staging fixtures (php=${PHP_VERSION})"

mkdir -p "${BUILD_DIR}/packages/site-toolkit/js/test"
mkdir -p "${BUILD_DIR}/.github/wp-env-configs"
mkdir -p "${BUILD_DIR}/packages/global-packages/packages/dev-tools/github/scripts"

cp "${TOOLKIT_SCRIPTS}/setup-wp-env.js" \
	"${BUILD_DIR}/packages/global-packages/packages/dev-tools/github/scripts/"
cp "${TOOLKIT_SCRIPTS}/retry-wp-env-start.sh" \
	"${BUILD_DIR}/packages/global-packages/packages/dev-tools/github/scripts/"
chmod +x "${BUILD_DIR}/packages/global-packages/packages/dev-tools/github/scripts/retry-wp-env-start.sh"

cp "${WORKSPACE}/${WP_ENV_CONFIG}" "${BUILD_DIR}/.github/wp-env-configs/base.json"
cp "${BUILD_DIR}/.github/wp-env-configs/base.json" "${BUILD_DIR}/.wp-env.json"
jq --arg php "${PHP_VERSION}" '. + {"phpVersion": $php}' \
	"${BUILD_DIR}/.wp-env.json" >"${BUILD_DIR}/.wp-env.json.tmp"
mv "${BUILD_DIR}/.wp-env.json.tmp" "${BUILD_DIR}/.wp-env.json"
cp "${BUILD_DIR}/.wp-env.json" .wp-env.json
cat .wp-env.json

cat >cypress.env.json <<'EOF'
{"isLogin": false,"wpUsername": "admin","wpPassword": "password","testURL": "http://localhost:8888","e2e": {"excludeSpecPattern": [],"specPattern": ["packages/**/*toolkit*.build.e2e.cy.js","packages/site-toolkit/**/*.build.e2e.cy.js"]}}
EOF
cp cypress.env.json "${BUILD_DIR}/cypress.env.json"
cat cypress.env.json

cp ./package.json "${BUILD_DIR}/"
cp -r ./node_modules "${BUILD_DIR}/"
cp ./cypress.config.js "${BUILD_DIR}/"

mkdir -p "${BUILD_DIR}/packages/global-packages/packages"
cp -r ./packages/global-packages/packages/dev-cypress "${BUILD_DIR}/packages/global-packages/packages/"

mkdir -p "${BUILD_DIR}/packages/global-packages/packages/dev-tools/js"
if [[ -d ./packages/global-packages/packages/dev-tools/js/cypress ]]; then
	cp -r ./packages/global-packages/packages/dev-tools/js/cypress \
		"${BUILD_DIR}/packages/global-packages/packages/dev-tools/js/"
fi
if [[ -d ./packages/global-packages/packages/dev-tools/js/babel ]]; then
	cp -r ./packages/global-packages/packages/dev-tools/js/babel \
		"${BUILD_DIR}/packages/global-packages/packages/dev-tools/js/"
fi
if [[ -f ./babel.config.js ]]; then
	cp ./babel.config.js "${BUILD_DIR}/"
fi

if [[ -d ./packages/site-toolkit ]]; then
	find ./packages/site-toolkit -name "*.build.e2e.cy.js" -type f \
		-exec cp {} "${BUILD_DIR}/packages/site-toolkit/js/test/" \;
fi
find ./packages -path "${SPECS_PATH}" -name "*.build.e2e.cy.js" -type f \
	-exec cp {} "${BUILD_DIR}/packages/site-toolkit/js/test/" \;

echo "build-zip-tests/prepare-toolkit: done → ${BUILD_DIR}"
