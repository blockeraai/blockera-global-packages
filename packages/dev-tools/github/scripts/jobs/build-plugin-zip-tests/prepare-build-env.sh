#!/usr/bin/env bash
# Extract the product zip and stage Cypress/wp-env fixtures for build E2E tests.
#
# Defaults match the Blockera plugin base. Override via env:
#   BLOCKERA_BUILD_ZIP_TESTS_ZIP            default: blockera.zip
#   BLOCKERA_BUILD_ZIP_TESTS_BUILD_DIR      default: ./build/blockera
#   BLOCKERA_BUILD_ZIP_TESTS_PHP_VERSION    required (matrix.php)
#   BLOCKERA_BUILD_ZIP_TESTS_WP_ENV_CONFIG  default: .github/wp-env-configs/base.json
#   BLOCKERA_BUILD_ZIP_TESTS_PREPARE_CMD    optional custom staging after unzip
set -euo pipefail

ZIP_FILE="${BLOCKERA_BUILD_ZIP_TESTS_ZIP:-blockera.zip}"
BUILD_DIR="${BLOCKERA_BUILD_ZIP_TESTS_BUILD_DIR:-./build/blockera}"
PHP_VERSION="${BLOCKERA_BUILD_ZIP_TESTS_PHP_VERSION:-}"
WP_ENV_CONFIG="${BLOCKERA_BUILD_ZIP_TESTS_WP_ENV_CONFIG:-.github/wp-env-configs/base.json}"

if [[ -z "${PHP_VERSION}" ]]; then
	echo "build-zip-tests/prepare: BLOCKERA_BUILD_ZIP_TESTS_PHP_VERSION is required" >&2
	exit 1
fi
if [[ ! -f "${ZIP_FILE}" ]]; then
	echo "build-zip-tests/prepare: zip not found: ${ZIP_FILE}" >&2
	exit 1
fi

echo "build-zip-tests/prepare: extract ${ZIP_FILE} → ${BUILD_DIR}"
rm -rf "${BUILD_DIR}"
mkdir -p "${BUILD_DIR}"
unzip -q "${ZIP_FILE}" -d "${BUILD_DIR}"
rm -f "${ZIP_FILE}"

if [[ -n "${BLOCKERA_BUILD_ZIP_TESTS_PREPARE_CMD:-}" ]]; then
	echo "build-zip-tests/prepare: ${BLOCKERA_BUILD_ZIP_TESTS_PREPARE_CMD}"
	eval "${BLOCKERA_BUILD_ZIP_TESTS_PREPARE_CMD}"
	exit 0
fi

echo "build-zip-tests/prepare: staging fixtures (php=${PHP_VERSION})"
(
	cd "${BUILD_DIR}"
	mkdir -p packages/blockera/tests
	mkdir -p .github/wp-env-configs

	TOOLKIT_SCRIPTS="${GITHUB_WORKSPACE}/packages/global-packages/packages/dev-tools/github/scripts"
	mkdir -p packages/global-packages/packages/dev-tools/github/scripts
	cp "${TOOLKIT_SCRIPTS}/setup-wp-env.js" packages/global-packages/packages/dev-tools/github/scripts/
	cp "${TOOLKIT_SCRIPTS}/retry-wp-env-start.sh" packages/global-packages/packages/dev-tools/github/scripts/
	cp "${GITHUB_WORKSPACE}/${WP_ENV_CONFIG}" .github/wp-env-configs/base.json

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
# Cypress webpack babel-loader resolves babel.config.js from plugin root.
cp ./babel.config.js "${BUILD_DIR}/"

mkdir -p "${BUILD_DIR}/packages/global-packages/packages"
cp -r ./packages/global-packages/packages/dev-cypress "${BUILD_DIR}/packages/global-packages/packages/"

# Thin root cypress.config.js / babel.config.js require shared factories under dev-tools.
mkdir -p "${BUILD_DIR}/packages/global-packages/packages/dev-tools/js"
cp -r ./packages/global-packages/packages/dev-tools/js/cypress \
	"${BUILD_DIR}/packages/global-packages/packages/dev-tools/js/"
cp -r ./packages/global-packages/packages/dev-tools/js/babel \
	"${BUILD_DIR}/packages/global-packages/packages/dev-tools/js/"

# Cypress webpack aliases resolve to packages/.../testIds; the zip extract does
# not include source packages, so mirror the minimal files.
mkdir -p "${BUILD_DIR}/packages/global-packages/packages/editor/js/tabs/constants"
mkdir -p "${BUILD_DIR}/packages/global-packages/packages/editor/js/preview-mode/constants"
mkdir -p "${BUILD_DIR}/packages/global-packages/packages/controls/js/libs/feature-wrapper/constants"
cp ./packages/global-packages/packages/editor/js/tabs/constants/testIds.ts \
	"${BUILD_DIR}/packages/global-packages/packages/editor/js/tabs/constants/"
cp ./packages/global-packages/packages/editor/js/preview-mode/constants/testIds.ts \
	"${BUILD_DIR}/packages/global-packages/packages/editor/js/preview-mode/constants/"
cp ./packages/global-packages/packages/controls/js/libs/feature-wrapper/constants/testIds.js \
	"${BUILD_DIR}/packages/global-packages/packages/controls/js/libs/feature-wrapper/constants/"

mkdir -p "${BUILD_DIR}/packages/global-packages/packages/blockera/tests"
find ./packages/global-packages/packages -type f \( -name "*.build.e2e.cy.js" \) \
	-exec cp {} "${BUILD_DIR}/packages/global-packages/packages/blockera/tests" \;

echo "build-zip-tests/prepare: done → ${BUILD_DIR}"
