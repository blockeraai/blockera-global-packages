#!/usr/bin/env bash
# Install Cypress, start wp-env, run build E2E tests, and stop the environment.
#
# Optional env:
#   BLOCKERA_BUILD_ZIP_TESTS_BUILD_DIR   default: ./build/blockera
#   BLOCKERA_BUILD_ZIP_TESTS_INSTALL_CMD default: npx cypress install
#   BLOCKERA_BUILD_ZIP_TESTS_START_CMD   default: bash packages/global-packages/packages/dev-tools/github/scripts/retry-wp-env-start.sh
#   BLOCKERA_BUILD_ZIP_TESTS_TEST_CMD    default: npm run test:e2e
#   BLOCKERA_BUILD_ZIP_TESTS_STOP_CMD    default: npm run env:stop
set -euo pipefail

BUILD_DIR_RAW="${BLOCKERA_BUILD_ZIP_TESTS_BUILD_DIR:-./build/blockera}"
# Resolve absolute path before any cd — cleanup trap must not use a cwd-relative path.
BUILD_DIR="$(cd "$(dirname "${BUILD_DIR_RAW}")" && pwd)/$(basename "${BUILD_DIR_RAW}")"
INSTALL_CMD="${BLOCKERA_BUILD_ZIP_TESTS_INSTALL_CMD:-npx cypress install}"
START_CMD="${BLOCKERA_BUILD_ZIP_TESTS_START_CMD:-bash packages/global-packages/packages/dev-tools/github/scripts/retry-wp-env-start.sh}"
TEST_CMD="${BLOCKERA_BUILD_ZIP_TESTS_TEST_CMD:-npm run test:e2e}"
STOP_CMD="${BLOCKERA_BUILD_ZIP_TESTS_STOP_CMD:-npm run env:stop}"

if [[ ! -d "${BUILD_DIR}" ]]; then
	echo "build-zip-tests/run: missing ${BUILD_DIR}" >&2
	exit 1
fi

cleanup() {
	if [[ ! -d "${BUILD_DIR}" ]]; then
		return 0
	fi
	echo "build-zip-tests/run: ${STOP_CMD}"
	(cd "${BUILD_DIR}" && eval "${STOP_CMD}") || true
}
trap cleanup EXIT

cd "${BUILD_DIR}"
echo "build-zip-tests/run: ${INSTALL_CMD}"
eval "${INSTALL_CMD}"

echo "build-zip-tests/run: ${START_CMD}"
eval "${START_CMD}"

echo "build-zip-tests/run: ${TEST_CMD}"
eval "${TEST_CMD}"
