#!/usr/bin/env bash
# Shared bootstrap for performance benchmark suites (Composer, wp-env, build, Playwright).
#
# Defaults match the Blockera plugin base. Override via env:
#   BLOCKERA_PERF_COMPOSER_CMD
#   COMPOSER_INSTALL_RETRIES          default: 4
#   COMPOSER_INSTALL_RETRY_DELAY_SEC  default: 20
#   BLOCKERA_PERF_WP_ENV_CONFIG       default: .github/wp-env-configs/performance.json
#   BLOCKERA_PERF_WP_ENV_START_CMD    default: bash packages/global-packages/packages/dev-tools/github/scripts/retry-wp-env-start.sh
#   BLOCKERA_PERF_BUILD_CMD           default: npm run build
#   BLOCKERA_PERF_READY_URL           default: http://localhost:8888
#   BLOCKERA_PERF_READY_ATTEMPTS      default: 36
#   BLOCKERA_PERF_READY_DELAY_SEC     default: 5
#   BLOCKERA_PERF_PLAYWRIGHT_CMD      default: npx playwright install --with-deps chromium
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

COMPOSER_CMD="${BLOCKERA_PERF_COMPOSER_CMD:-composer install --no-dev -o --apcu-autoloader -a}"
WP_ENV_CONFIG="${BLOCKERA_PERF_WP_ENV_CONFIG:-.github/wp-env-configs/performance.json}"
WP_ENV_START_CMD="${BLOCKERA_PERF_WP_ENV_START_CMD:-bash packages/global-packages/packages/dev-tools/github/scripts/retry-wp-env-start.sh}"
BUILD_CMD="${BLOCKERA_PERF_BUILD_CMD:-npm run build}"
READY_URL="${BLOCKERA_PERF_READY_URL:-${WP_BASE_URL:-http://localhost:8888}}"
READY_ATTEMPTS="${BLOCKERA_PERF_READY_ATTEMPTS:-36}"
READY_DELAY="${BLOCKERA_PERF_READY_DELAY_SEC:-5}"
PLAYWRIGHT_CMD="${BLOCKERA_PERF_PLAYWRIGHT_CMD:-npx playwright install --with-deps chromium}"

echo "performance/setup: ${COMPOSER_CMD}"
# GitHub dist zipballs (api.github.com) occasionally 504; retry like npm ci / wp-env.
COMPOSER_CMD="${COMPOSER_CMD}" bash "${SCRIPT_DIR}/../../retry-composer-install.sh"

echo "performance/setup: using ${WP_ENV_CONFIG}"
cp "${WP_ENV_CONFIG}" .wp-env.json
cat .wp-env.json
{
	echo "APP_MODE=production"
	echo "DB=wp_tests"
} >.env
cat .env

echo "performance/setup: ${WP_ENV_START_CMD}"
eval "${WP_ENV_START_CMD}"

echo "performance/setup: ${BUILD_CMD}"
eval "${BUILD_CMD}"

echo "performance/setup: waiting for ${READY_URL}..."
ready=0
for i in $(seq 1 "${READY_ATTEMPTS}"); do
	if curl -sf -o /dev/null "${READY_URL}"; then
		echo "WordPress is ready"
		ready=1
		break
	fi
	echo "Attempt ${i}/${READY_ATTEMPTS} - WordPress not ready yet, waiting ${READY_DELAY}s..."
	sleep "${READY_DELAY}"
done
if [[ "${ready}" -ne 1 ]]; then
	echo "WordPress failed to become ready" >&2
	exit 1
fi

echo "performance/setup: ${PLAYWRIGHT_CMD}"
eval "${PLAYWRIGHT_CMD}"
