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

ROOTS="${ROOTS//,/ }"
# Expand globs; drop unmatched patterns so missing roots do not fail find
# under `set -o pipefail`.
shopt -s nullglob
# Intentional word-splitting for multiple roots / globs.
# shellcheck disable=SC2206
roots=(${ROOTS})
shopt -u nullglob

if [[ ${#roots[@]} -eq 0 ]]; then
	count=0
elif [[ -n "${PATH_GLOB}" ]]; then
	count="$(find "${roots[@]}" -path "${PATH_GLOB}" -name "${NAME}" 2>/dev/null | wc -l | tr -d '[:space:]' || true)"
else
	count="$(find "${roots[@]}" -type f -name "${NAME}" 2>/dev/null | wc -l | tr -d '[:space:]' || true)"
fi

echo "file_count=${count:-0}" >>"${GITHUB_OUTPUT}"
echo "build-zip-tests/find: ${count:-0} spec(s)"
