#!/usr/bin/env bash
# Stage Pro build-zip Cypress fixtures after the product zip is extracted.
#
# Required env:
#   BLOCKERA_BUILD_ZIP_TESTS_BUILD_DIR
#   BLOCKERA_BUILD_ZIP_TESTS_PHP_VERSION
#   GITHUB_TOKEN (for create-wp-env-pro free artifact download)
#
# Optional:
#   BLOCKERA_BUILD_ZIP_TESTS_SPECS_PATH   default: *-pro*
set -euo pipefail

BUILD_DIR="${BLOCKERA_BUILD_ZIP_TESTS_BUILD_DIR:-./build/blockera-pro}"
PHP_VERSION="${BLOCKERA_BUILD_ZIP_TESTS_PHP_VERSION:-}"
SPECS_PATH="${BLOCKERA_BUILD_ZIP_TESTS_SPECS_PATH:-*-pro*}"

if [[ -z "${PHP_VERSION}" ]]; then
	echo "build-zip-tests/prepare-pro: BLOCKERA_BUILD_ZIP_TESTS_PHP_VERSION is required" >&2
	exit 1
fi
if [[ ! -d "${BUILD_DIR}" ]]; then
	echo "build-zip-tests/prepare-pro: build dir missing: ${BUILD_DIR}" >&2
	exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TOOLKIT_SCRIPTS="$(cd "${SCRIPT_DIR}/../.." && pwd)"
CREATE_WP_ENV="${TOOLKIT_SCRIPTS}/create-wp-env-pro.js"
WORKSPACE="${GITHUB_WORKSPACE:-$(pwd)}"

(
	cd "${BUILD_DIR}"
	mkdir -p packages/blockera-pro/tests
	mkdir -p .github/wp-env-configs
	mkdir -p packages/global-packages/packages/dev-tools/github/scripts

	cp "${TOOLKIT_SCRIPTS}/setup-wp-env.js" packages/global-packages/packages/dev-tools/github/scripts/
	cp "${TOOLKIT_SCRIPTS}/retry-wp-env-start.sh" packages/global-packages/packages/dev-tools/github/scripts/
	chmod +x packages/global-packages/packages/dev-tools/github/scripts/retry-wp-env-start.sh

	cp "${WORKSPACE}/.github/wp-env-configs/general.json" .github/wp-env-configs/
)

# Resolve free Blockera into .wp-env.json at the consumer root, then inject PHP.
echo "build-zip-tests/prepare-pro: node ${CREATE_WP_ENV} general"
node "${CREATE_WP_ENV}" "general"
jq --arg php "${PHP_VERSION}" '. + {"phpVersion": $php}' .wp-env.json >.wp-env.json.tmp
mv .wp-env.json.tmp .wp-env.json
cat .wp-env.json

cat >cypress.env.json <<'EOF'
{"isLogin": false,"wpUsername": "admin","wpPassword": "password","testURL": "http://localhost:8888","e2e": {"excludeSpecPattern": [],"specPattern": ["packages/**/*.build.e2e.cy.js"]}}
EOF
cat cypress.env.json

cp ./package.json "${BUILD_DIR}/"
cp -r ./node_modules "${BUILD_DIR}/"
cp ./cypress.config.js "${BUILD_DIR}/"
cp .wp-env.json "${BUILD_DIR}/"
cp cypress.env.json "${BUILD_DIR}/"

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
if [[ -f ./babel.config.js ]]; then
	cp ./babel.config.js "${BUILD_DIR}/"
fi

find ./packages -path "${SPECS_PATH}" -name "*.build.e2e.cy.js" -type f \
	-exec cp {} "${BUILD_DIR}/packages/blockera-pro/tests" \;

echo "build-zip-tests/prepare-pro: done → ${BUILD_DIR}"
