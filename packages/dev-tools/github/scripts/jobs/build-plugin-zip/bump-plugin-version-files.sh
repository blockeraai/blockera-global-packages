#!/usr/bin/env bash
# Rewrite version in package.json, package-lock.json, and the plugin main file.
#
# Required env:
#   OLD_VERSION
#   NEW_VERSION  (or VERSION)
#
# Optional:
#   BLOCKERA_BUILD_ZIP_MAIN_FILE      default: blockera.php
#   BLOCKERA_BUILD_ZIP_PACKAGE_JSON   default: package.json
#   BLOCKERA_BUILD_ZIP_PACKAGE_LOCK   default: package-lock.json
#   composer.json                     bumped when it has a "version" field
set -euo pipefail

OLD_VERSION="${OLD_VERSION:-}"
VERSION="${NEW_VERSION:-${VERSION:-}}"
MAIN_FILE="${BLOCKERA_BUILD_ZIP_MAIN_FILE:-blockera.php}"
PACKAGE_JSON="${BLOCKERA_BUILD_ZIP_PACKAGE_JSON:-package.json}"
PACKAGE_LOCK="${BLOCKERA_BUILD_ZIP_PACKAGE_LOCK:-package-lock.json}"

if [[ -z "${OLD_VERSION}" || -z "${VERSION}" ]]; then
	echo "build-zip/bump-files: OLD_VERSION and NEW_VERSION are required" >&2
	exit 1
fi

echo "build-zip/bump-files: ${OLD_VERSION} → ${VERSION} (${MAIN_FILE})"

tmp_pkg="$(mktemp)"
jq --tab --arg version "${VERSION}" '.version = $version' "${PACKAGE_JSON}" >"${tmp_pkg}"
mv "${tmp_pkg}" "${PACKAGE_JSON}"

tmp_lock="$(mktemp)"
jq --tab --arg version "${VERSION}" '.version = $version | .packages[""].version = $version' "${PACKAGE_LOCK}" >"${tmp_lock}"
mv "${tmp_lock}" "${PACKAGE_LOCK}"

sed -i "s/${OLD_VERSION}/${VERSION}/g" "${MAIN_FILE}"

if [[ -f composer.json ]] && jq --exit-status '.version != null' composer.json >/dev/null 2>&1; then
	tmp_composer="$(mktemp)"
	jq --tab --arg version "${VERSION}" '.version = $version' composer.json >"${tmp_composer}"
	mv "${tmp_composer}" composer.json
fi
