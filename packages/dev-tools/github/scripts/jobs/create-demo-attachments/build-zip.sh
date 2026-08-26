#!/usr/bin/env bash
# Build the consumer product zip (plugin or theme).
#
# Env:
#   BLOCKERA_DEMO_MAIN_FILE_SUFFIX   passed to plugin zip builder (default: empty)
#   BLOCKERA_DEMO_BUILD_CMD          override full build command (eval'd)
set -euo pipefail

BUILD_CMD="${BLOCKERA_DEMO_BUILD_CMD:-}"
MAIN_FILE_SUFFIX="${BLOCKERA_DEMO_MAIN_FILE_SUFFIX:-}"

if [[ -n "${BUILD_CMD}" ]]; then
	echo "create-demo/build-zip: ${BUILD_CMD}"
	eval "${BUILD_CMD}"
	exit 0
fi

if [[ -f ./bin/generate-build-plugin-zip-sh.php ]]; then
	echo "create-demo/build-zip: plugin zip (suffix='${MAIN_FILE_SUFFIX}')"
	php ./bin/generate-build-plugin-zip-sh.php >./bin/build-plugin-zip.temp.sh
	chmod +x ./bin/build-plugin-zip.temp.sh
	NO_CHECKS=true NO_INSTALL_NPM=true NO_INSTALL_COMPOSER=true \
		MAIN_FILE_SUFFIX="${MAIN_FILE_SUFFIX}" \
		./bin/build-plugin-zip.temp.sh
	rm -f ./bin/build-plugin-zip.temp.sh
	exit 0
fi

if [[ -f ./bin/generate-build-theme-zip-sh.php ]]; then
	echo "create-demo/build-zip: theme zip"
	php ./bin/generate-build-theme-zip-sh.php >./bin/build-theme-zip.temp.sh
	chmod +x ./bin/build-theme-zip.temp.sh
	NO_CHECKS=true NO_INSTALL_NPM=true NO_INSTALL_COMPOSER=true \
		./bin/build-theme-zip.temp.sh
	rm -f ./bin/build-theme-zip.temp.sh
	exit 0
fi

echo "create-demo/build-zip: no generator found; set BLOCKERA_DEMO_BUILD_CMD" >&2
exit 1
