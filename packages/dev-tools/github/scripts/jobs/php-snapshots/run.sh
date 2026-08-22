#!/usr/bin/env bash
# Build, start wp-env, run PHP snapshot tests, and verify fixture coverage.
#
# Required/typical env:
#   BLOCKERA_PHP_SNAPSHOTS_PHP_VERSION   matrix.php (default: 8.2)
#   BLOCKERA_PHP_SNAPSHOTS_MULTISITE     true|false (default: false)
#
# Defaults match the Blockera plugin base. Override via env:
#   BLOCKERA_PHP_SNAPSHOTS_BUILD_CMD
#   BLOCKERA_PHP_SNAPSHOTS_WP_ENV_CONFIG_DIR
#   BLOCKERA_PHP_SNAPSHOTS_WP_ENV_START_CMD
#   BLOCKERA_PHP_SNAPSHOTS_TEST_CMD
#   BLOCKERA_PHP_SNAPSHOTS_FIXTURES_DIR
#   BLOCKERA_PHP_SNAPSHOTS_ON_EMPTY      fail|skip (default: fail)
#   BLOCKERA_PHP_SNAPSHOTS_DEBUG_INFO    true|false (default: true)
set -euo pipefail

PHP_VERSION="${BLOCKERA_PHP_SNAPSHOTS_PHP_VERSION:-8.2}"
MULTISITE="${BLOCKERA_PHP_SNAPSHOTS_MULTISITE:-false}"
BUILD_CMD="${BLOCKERA_PHP_SNAPSHOTS_BUILD_CMD:-npm run build}"
WP_ENV_CONFIG_DIR="${BLOCKERA_PHP_SNAPSHOTS_WP_ENV_CONFIG_DIR:-.github/wp-env-configs}"
WP_ENV_START_CMD="${BLOCKERA_PHP_SNAPSHOTS_WP_ENV_START_CMD:-bash packages/global-packages/packages/dev-tools/github/scripts/retry-wp-env-start.sh}"
TEST_CMD="${BLOCKERA_PHP_SNAPSHOTS_TEST_CMD:-npm run test:snapshots:php}"
FIXTURES_DIR="${BLOCKERA_PHP_SNAPSHOTS_FIXTURES_DIR:-tests/fixtures}"
ON_EMPTY="${BLOCKERA_PHP_SNAPSHOTS_ON_EMPTY:-fail}"
DEBUG_INFO="${BLOCKERA_PHP_SNAPSHOTS_DEBUG_INFO:-true}"

count_expected_fixtures() {
	local expected=0
	local design_dir config_path
	for design_dir in "${FIXTURES_DIR}"/*/; do
		[[ -d "${design_dir}" ]] || continue
		config_path="${design_dir}config.json"
		if [[ -f "${config_path}" ]]; then
			if jq -e '.snapshot == false' "${config_path}" >/dev/null 2>&1; then
				continue
			fi
		fi
		expected=$((expected + 1))
	done
	echo "${expected}"
}

EXPECTED_TESTS="$(count_expected_fixtures)"
echo "php-snapshots: expected fixture tests=${EXPECTED_TESTS}"

if [[ "${EXPECTED_TESTS}" -eq 0 ]]; then
	if [[ "${ON_EMPTY}" == "skip" ]]; then
		echo "php-snapshots: no fixtures; skipping (BLOCKERA_PHP_SNAPSHOTS_ON_EMPTY=skip)"
		exit 0
	fi
	echo "No snapshot fixtures found under ${FIXTURES_DIR}/*/ (or all have snapshot: false)."
	echo "Add fixtures or disable this workflow — refusing to treat an empty suite as success."
	exit 1
fi

if [[ "${DEBUG_INFO}" == "true" ]]; then
	npm --version
	node --version
	curl --version
	git --version
	locale -a
fi

echo "php-snapshots: ${BUILD_CMD}"
eval "${BUILD_CMD}"

WP_ENV_CONFIG="${WP_ENV_CONFIG_DIR}/base.json"
echo "php-snapshots: using ${WP_ENV_CONFIG} (phpVersion=${PHP_VERSION})"
cp "${WP_ENV_CONFIG}" .wp-env.json
jq --arg php "${PHP_VERSION}" '. + {"phpVersion": $php}' .wp-env.json >.wp-env.json.tmp
mv .wp-env.json.tmp .wp-env.json
cat .wp-env.json

{
	echo "APP_MODE=production"
	echo "DB=wp_tests"
} >.env
cat .env

echo "php-snapshots: ${WP_ENV_START_CMD}"
eval "${WP_ENV_START_CMD}"

if [[ "${MULTISITE}" == "true" ]]; then
	echo "php-snapshots: multisite matrix entry is not implemented in the shared runner" >&2
	exit 1
fi

echo "php-snapshots: ${TEST_CMD}"
set -o pipefail
eval "${TEST_CMD}" | tee phpunit.log

if ! num_tests="$(grep -Eo 'OK \([0-9]+ tests' phpunit.log)"; then
	if ! num_tests="$(grep -Eo 'Tests: [0-9]+, Assertions:' phpunit.log)"; then
		echo "PHPUnit failed or did not run. Check the PHPUnit output above to debug." >&2
		exit 1
	fi
fi

num_tests="$(echo "${num_tests}" | grep -Eo '[0-9]+' | head -n 1)"

skipped_tests=0
if skipped_line="$(grep -Eo 'Skipped: [0-9]+' phpunit.log)"; then
	skipped_tests="$(echo "${skipped_line}" | grep -Eo '[0-9]+' | head -n 1)"
fi

executed_tests=$((num_tests - skipped_tests))
if [[ "${executed_tests}" -lt "${EXPECTED_TESTS}" ]]; then
	echo "Only ${executed_tests} tests executed (${num_tests} reported, ${skipped_tests} skipped), expected at least ${EXPECTED_TESTS} (from ${FIXTURES_DIR})." >&2
	exit 1
fi

echo "${executed_tests} tests passed (expected at least ${EXPECTED_TESTS})."
