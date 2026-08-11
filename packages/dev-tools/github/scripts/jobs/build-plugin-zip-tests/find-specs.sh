#!/usr/bin/env bash
# Count build E2E specs and write file_count to GITHUB_OUTPUT.
#
# Optional env:
#   BLOCKERA_BUILD_ZIP_TESTS_SPECS_ROOTS   default: .
#   BLOCKERA_BUILD_ZIP_TESTS_SPECS_PATH    find -path (default: empty = any)
#   BLOCKERA_BUILD_ZIP_TESTS_SPECS_NAME    default: *.build.e2e.cy.js
set -euo pipefail

if [[ -z "${GITHUB_OUTPUT:-}" ]]; then
	echo "build-zip-tests/find: GITHUB_OUTPUT is unset" >&2
	exit 1
fi

ROOTS="${BLOCKERA_BUILD_ZIP_TESTS_SPECS_ROOTS:-.}"
PATH_GLOB="${BLOCKERA_BUILD_ZIP_TESTS_SPECS_PATH:-}"
NAME="${BLOCKERA_BUILD_ZIP_TESTS_SPECS_NAME:-*.build.e2e.cy.js}"

if [[ -n "${PATH_GLOB}" ]]; then
	# shellcheck disable=SC2086
	count="$(find ${ROOTS} -path "${PATH_GLOB}" -name "${NAME}" 2>/dev/null | wc -l | tr -d '[:space:]')"
else
	# shellcheck disable=SC2086
	count="$(find ${ROOTS} -type f -name "${NAME}" 2>/dev/null | wc -l | tr -d '[:space:]')"
fi

echo "file_count=${count:-0}" >>"${GITHUB_OUTPUT}"
echo "build-zip-tests/find: ${count:-0} spec(s)"
