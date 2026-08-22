#!/usr/bin/env bash
# Build the product zip and extract it for wordpress/plugin-check-action.
#
# Defaults match the Blockera plugin base. Override via env:
#   BLOCKERA_PLUGIN_CHECK_ZIP           default: blockera.zip
#   BLOCKERA_PLUGIN_CHECK_BUILD_DIR     default: ./build/blockera
#   BLOCKERA_PLUGIN_CHECK_MAIN_FILE_SUFFIX
#   BLOCKERA_PLUGIN_CHECK_BUILD_CMD     override full zip build (eval'd)
set -euo pipefail

ZIP_FILE="${BLOCKERA_PLUGIN_CHECK_ZIP:-blockera.zip}"
BUILD_DIR="${BLOCKERA_PLUGIN_CHECK_BUILD_DIR:-./build/blockera}"
MAIN_FILE_SUFFIX="${BLOCKERA_PLUGIN_CHECK_MAIN_FILE_SUFFIX:-}"
BUILD_CMD="${BLOCKERA_PLUGIN_CHECK_BUILD_CMD:-}"

if [[ -n "${BUILD_CMD}" ]]; then
	echo "plugin-check/prepare: ${BUILD_CMD}"
	eval "${BUILD_CMD}"
elif [[ -f ./bin/generate-build-plugin-zip-sh.php ]]; then
	echo "plugin-check/prepare: default plugin zip (suffix='${MAIN_FILE_SUFFIX}')"
	php ./bin/generate-build-plugin-zip-sh.php >./bin/build-plugin-zip.temp.sh
	chmod +x ./bin/build-plugin-zip.temp.sh
	NO_CHECKS=true NO_INSTALL_NPM=true NO_INSTALL_COMPOSER=true \
		MAIN_FILE_SUFFIX="${MAIN_FILE_SUFFIX}" \
		./bin/build-plugin-zip.temp.sh
	rm -f ./bin/build-plugin-zip.temp.sh
elif [[ -f ./bin/generate-build-theme-zip-sh.php ]]; then
	# Theme consumers (blockera-one) share this prepare script via theme-check.
	echo "plugin-check/prepare: default theme zip"
	php ./bin/generate-build-theme-zip-sh.php >./bin/build-theme-zip.temp.sh
	chmod +x ./bin/build-theme-zip.temp.sh
	NO_CHECKS=true NO_INSTALL_NPM=true NO_INSTALL_COMPOSER=true \
		./bin/build-theme-zip.temp.sh
	rm -f ./bin/build-theme-zip.temp.sh
else
	echo "plugin-check/prepare: no zip generator found; set BLOCKERA_PLUGIN_CHECK_BUILD_CMD" >&2
	exit 1
fi

if [[ ! -f "${ZIP_FILE}" ]]; then
	echo "plugin-check/prepare: zip not found: ${ZIP_FILE}" >&2
	exit 1
fi

echo "plugin-check/prepare: extract ${ZIP_FILE} → ${BUILD_DIR}"
rm -rf "${BUILD_DIR}"
mkdir -p "${BUILD_DIR}"
unzip -q "${ZIP_FILE}" -d "${BUILD_DIR}"
rm -f "${ZIP_FILE}"
