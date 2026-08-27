#!/usr/bin/env bash
# Rewrite version in package.json, package-lock.json, and the product main file.
#
# The main file is a WordPress plugin bootstrap or theme stylesheet. The
# `Version:` header (plain `Version:` or `* Version:`) is set to NEW_VERSION
# even when it did not match OLD_VERSION.
#
# Required env:
#   OLD_VERSION
#   NEW_VERSION  (or VERSION)
#
# Optional:
#   BLOCKERA_BUILD_ZIP_MAIN_FILE      default: blockera.php (theme: style.css)
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

if [[ ! -f "${MAIN_FILE}" ]]; then
	echo "build-zip/bump-files: main file '${MAIN_FILE}' is missing" >&2
	exit 1
fi

echo "build-zip/bump-files: ${OLD_VERSION} → ${VERSION} (${MAIN_FILE})"

tmp_pkg="$(mktemp)"
jq --tab --arg version "${VERSION}" '.version = $version' "${PACKAGE_JSON}" >"${tmp_pkg}"
mv "${tmp_pkg}" "${PACKAGE_JSON}"

tmp_lock="$(mktemp)"
jq --tab --arg version "${VERSION}" '.version = $version | .packages[""].version = $version' "${PACKAGE_LOCK}" >"${tmp_lock}"
mv "${tmp_lock}" "${PACKAGE_LOCK}"

tmp_main="$(mktemp)"
awk -v ver="${VERSION}" '
	$0 ~ /^[[:space:]]*(\*[[:space:]]*)?Version:[[:space:]]*/ {
		sub(/Version:[[:space:]].*/, "Version: " ver)
		print
		next
	}
	{ print }
' "${MAIN_FILE}" >"${tmp_main}"
mv "${tmp_main}" "${MAIN_FILE}"

if ! grep -E '^[[:space:]]*(\*[[:space:]]*)?Version:' "${MAIN_FILE}" | grep -F "Version: ${VERSION}" >/dev/null; then
	echo "build-zip/bump-files: failed to set Version: ${VERSION} in ${MAIN_FILE}" >&2
	exit 1
fi

if [[ -f composer.json ]] && jq --exit-status '.version != null' composer.json >/dev/null 2>&1; then
	tmp_composer="$(mktemp)"
	jq --tab --arg version "${VERSION}" '.version = $version' composer.json >"${tmp_composer}"
	mv "${tmp_composer}" composer.json
fi
