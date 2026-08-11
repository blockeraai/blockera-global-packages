#!/usr/bin/env bash
# Prepare artifacts for the compressed-size report (Composer + product zip).
#
# Env (all optional):
#   BLOCKERA_BUNDLE_SIZE_SKIP_COMPOSER   true|false (default: false)
#   BLOCKERA_BUNDLE_SIZE_COMPOSER_OPTS   default: --no-dev -o --apcu-autoloader -a
#   BLOCKERA_BUNDLE_SIZE_BUILD_CMD       override full build command (eval'd)
#   BLOCKERA_BUNDLE_SIZE_MAIN_FILE_SUFFIX  passed to plugin zip builder when using default
#   BLOCKERA_BUNDLE_SIZE_SKIP_BUILD      true|false (default: false)
#
# Default build (when BUILD_CMD unset):
#   - plugin: bin/generate-build-plugin-zip-sh.php
#   - theme:  bin/generate-build-theme-zip-sh.php
set -euo pipefail

SKIP_COMPOSER="${BLOCKERA_BUNDLE_SIZE_SKIP_COMPOSER:-false}"
COMPOSER_OPTS="${BLOCKERA_BUNDLE_SIZE_COMPOSER_OPTS:---no-dev -o --apcu-autoloader -a}"
SKIP_BUILD="${BLOCKERA_BUNDLE_SIZE_SKIP_BUILD:-false}"
BUILD_CMD="${BLOCKERA_BUNDLE_SIZE_BUILD_CMD:-}"
MAIN_FILE_SUFFIX="${BLOCKERA_BUNDLE_SIZE_MAIN_FILE_SUFFIX:-}"

if [[ "${SKIP_COMPOSER}" != "true" ]]; then
	echo "bundle-size/prepare: composer install ${COMPOSER_OPTS}"
	# Intentional word-splitting for composer option flags.
	# shellcheck disable=SC2086
	composer install ${COMPOSER_OPTS}
else
	echo "bundle-size/prepare: skipping composer (BLOCKERA_BUNDLE_SIZE_SKIP_COMPOSER=true)"
fi

if [[ "${SKIP_BUILD}" == "true" ]]; then
	echo "bundle-size/prepare: skipping build (BLOCKERA_BUNDLE_SIZE_SKIP_BUILD=true)"
	exit 0
fi

if [[ -n "${BUILD_CMD}" ]]; then
	echo "bundle-size/prepare: ${BUILD_CMD}"
	eval "${BUILD_CMD}"
	exit 0
fi

if [[ -f ./bin/generate-build-plugin-zip-sh.php ]]; then
	echo "bundle-size/prepare: default plugin zip build"
	php ./bin/generate-build-plugin-zip-sh.php >./bin/build-plugin-zip.temp.sh
	chmod +x ./bin/build-plugin-zip.temp.sh
	NO_CHECKS=true NO_INSTALL_NPM=true NO_INSTALL_COMPOSER=true \
		MAIN_FILE_SUFFIX="${MAIN_FILE_SUFFIX}" \
		./bin/build-plugin-zip.temp.sh
	rm -f ./bin/build-plugin-zip.temp.sh
	exit 0
fi

if [[ -f ./bin/generate-build-theme-zip-sh.php ]]; then
	echo "bundle-size/prepare: default theme zip build"
	php ./bin/generate-build-theme-zip-sh.php >./bin/build-theme-zip.temp.sh
	chmod +x ./bin/build-theme-zip.temp.sh
	NO_CHECKS=true NO_INSTALL_NPM=true NO_INSTALL_COMPOSER=true \
		./bin/build-theme-zip.temp.sh
	rm -f ./bin/build-theme-zip.temp.sh
	exit 0
fi

echo "bundle-size/prepare: no build generator found; set BLOCKERA_BUNDLE_SIZE_BUILD_CMD" >&2
exit 1
