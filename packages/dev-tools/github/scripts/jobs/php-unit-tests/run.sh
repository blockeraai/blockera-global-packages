#!/usr/bin/env bash
# Build, start wp-env, run PHPUnit unit tests, and enforce a minimum pass count.
#
# Required/typical env:
#   BLOCKERA_PHP_UNIT_PHP_VERSION   matrix.php (default: 8.2)
#   BLOCKERA_PHP_UNIT_MULTISITE     true|false (default: false)
#
# Defaults match the Blockera plugin base. Override via env:
#   BLOCKERA_PHP_UNIT_BUILD_CMD
#   BLOCKERA_PHP_UNIT_WP_ENV_CONFIG_DIR
#   BLOCKERA_PHP_UNIT_WP_ENV_START_CMD
#   BLOCKERA_PHP_UNIT_TEST_CMD           default: npm run test:unit:php
#   BLOCKERA_PHP_UNIT_MIN_TESTS          default: 54
#   BLOCKERA_PHP_UNIT_SKIP_IF_NO_TESTS   true|false (default: false)
#   BLOCKERA_PHP_UNIT_TEST_ROOTS         find roots when skip-if-no-tests
#   BLOCKERA_PHP_UNIT_TEST_NAME          find -name (default: *Test.php)
#   BLOCKERA_PHP_UNIT_DEBUG_INFO         true|false (default: true)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REMOVE_WP_CLI_VENDOR="${SCRIPT_DIR}/../../lib/remove-wp-cli-vendor.sh"

PHP_VERSION="${BLOCKERA_PHP_UNIT_PHP_VERSION:-8.2}"
MULTISITE="${BLOCKERA_PHP_UNIT_MULTISITE:-false}"
BUILD_CMD="${BLOCKERA_PHP_UNIT_BUILD_CMD:-npm run build}"
WP_ENV_CONFIG_DIR="${BLOCKERA_PHP_UNIT_WP_ENV_CONFIG_DIR:-.github/wp-env-configs}"
WP_ENV_START_CMD="${BLOCKERA_PHP_UNIT_WP_ENV_START_CMD:-bash packages/global-packages/packages/dev-tools/github/scripts/retry-wp-env-start.sh}"
TEST_CMD="${BLOCKERA_PHP_UNIT_TEST_CMD:-npm run test:unit:php}"
MIN_TESTS="${BLOCKERA_PHP_UNIT_MIN_TESTS:-54}"
SKIP_IF_NO_TESTS="${BLOCKERA_PHP_UNIT_SKIP_IF_NO_TESTS:-false}"
TEST_NAME="${BLOCKERA_PHP_UNIT_TEST_NAME:-*Test.php}"
DEBUG_INFO="${BLOCKERA_PHP_UNIT_DEBUG_INFO:-true}"

if [[ "${SKIP_IF_NO_TESTS}" == "true" ]]; then
	TEST_ROOTS="${BLOCKERA_PHP_UNIT_TEST_ROOTS:-.}"
	# Expand globs; drop unmatched patterns so missing roots do not fail find
	# under `set -o pipefail` (e.g. theme optional `blockera-one-*`).
	shopt -s nullglob
	# Intentional word-splitting for multiple roots / globs.
	# shellcheck disable=SC2206
	roots=(${TEST_ROOTS})
	shopt -u nullglob
	if [[ ${#roots[@]} -eq 0 ]]; then
		echo "php-unit: no roots matched '${TEST_ROOTS}'; skipping"
		exit 0
	fi
	count="$(find "${roots[@]}" -type f -name "${TEST_NAME}" 2>/dev/null | wc -l | tr -d '[:space:]' || true)"
	if [[ "${count:-0}" == "0" ]]; then
		echo "php-unit: no '${TEST_NAME}' under '${roots[*]}'; skipping"
		exit 0
	fi
	echo "php-unit: found ${count} test file(s)"
fi

if [[ "${DEBUG_INFO}" == "true" ]]; then
	npm --version
	node --version
	curl --version
	git --version
	locale -a
fi

echo "php-unit: ${BUILD_CMD}"
eval "${BUILD_CMD}"

WP_ENV_CONFIG="${WP_ENV_CONFIG_DIR}/base.json"
echo "php-unit: using ${WP_ENV_CONFIG} (phpVersion=${PHP_VERSION})"
cp "${WP_ENV_CONFIG}" .wp-env.json
jq --arg php "${PHP_VERSION}" '. + {"phpVersion": $php}' .wp-env.json >.wp-env.json.tmp
mv .wp-env.json.tmp .wp-env.json
cat .wp-env.json

{
	echo "APP_MODE=production"
	echo "DB=wp_tests"
} >.env
cat .env

if [[ ! -f "${REMOVE_WP_CLI_VENDOR}" ]]; then
	echo "php-unit: missing ${REMOVE_WP_CLI_VENDOR}" >&2
	exit 1
fi
bash "${REMOVE_WP_CLI_VENDOR}"

echo "php-unit: ${WP_ENV_START_CMD}"
eval "${WP_ENV_START_CMD}"

if [[ "${MULTISITE}" == "true" ]]; then
	echo "php-unit: multisite matrix entry is not implemented in the shared runner" >&2
	exit 1
fi

echo "php-unit: ${TEST_CMD}"
set -o pipefail
eval "${TEST_CMD}" | tee phpunit.log

if ! num_tests="$(grep -Eo 'OK \([0-9]+ tests' phpunit.log)"; then
	if ! num_tests="$(grep -Eo 'Tests: [0-9]+, Assertions:' phpunit.log)"; then
		echo "PHPUnit failed or did not run. Check the PHPUnit output above to debug." >&2
		exit 1
	fi
fi

num_tests="$(echo "${num_tests}" | grep -Eo '[0-9]+' | head -n 1)"
if [[ "${num_tests}" -lt "${MIN_TESTS}" ]]; then
	echo "Only ${num_tests} tests passed, which is fewer than expected minimum ${MIN_TESTS}." >&2
	exit 1
fi

echo "${num_tests} tests passed (minimum ${MIN_TESTS})."
