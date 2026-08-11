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
set -euo pipefail

INSTALL_CMD="${BLOCKERA_CT_INSTALL_CMD:-npx cypress install}"
COMPOSER_INSTALL="${BLOCKERA_CT_COMPOSER_INSTALL:-true}"
COMPOSER_CMD="${BLOCKERA_CT_COMPOSER_CMD:-composer install --no-dev -o --apcu-autoloader -a}"
RUN_BUILD="${BLOCKERA_CT_BUILD:-true}"
BUILD_CMD="${BLOCKERA_CT_BUILD_CMD:-npm run build}"
TEST_CMD="${BLOCKERA_CT_TEST_CMD:-npm run test:ct}"
SKIP_IF_NO_SPECS="${BLOCKERA_CT_SKIP_IF_NO_SPECS:-false}"
SPECS_NAME="${BLOCKERA_CT_SPECS_NAME:-*.component.cy.js}"

if [[ "${SKIP_IF_NO_SPECS}" == "true" ]]; then
	SPECS_ROOTS="${BLOCKERA_CT_SPECS_ROOTS:-.}"
	# Intentional word-splitting for multiple roots.
	# shellcheck disable=SC2086
	count="$(find ${SPECS_ROOTS} -name "${SPECS_NAME}" 2>/dev/null | wc -l | tr -d '[:space:]')"
	if [[ "${count}" == "0" ]]; then
		echo "cypress-components: no '${SPECS_NAME}' under '${SPECS_ROOTS}'; skipping"
		exit 0
	fi
	echo "cypress-components: found ${count} spec file(s)"
fi

echo "cypress-components: ${INSTALL_CMD}"
eval "${INSTALL_CMD}"

if [[ "${COMPOSER_INSTALL}" == "true" ]]; then
	echo "cypress-components: ${COMPOSER_CMD}"
	eval "${COMPOSER_CMD}"
else
	echo "cypress-components: skipping composer (BLOCKERA_CT_COMPOSER_INSTALL=false)"
fi

if [[ "${RUN_BUILD}" == "true" ]]; then
	echo "cypress-components: ${BUILD_CMD}"
	eval "${BUILD_CMD}"
else
	echo "cypress-components: skipping build (BLOCKERA_CT_BUILD=false)"
fi

echo "cypress-components: ${TEST_CMD}"
eval "${TEST_CMD}"
