#!/usr/bin/env bash
# Fail when PR-only config files (e.g. .pr-*) are still in the tree.
#
# Defaults match the Blockera plugin base. Override via env:
#   BLOCKERA_PR_CONFIG_NAME            find -name pattern (default: .pr-*)
#   BLOCKERA_PR_CONFIG_EXCLUDE_NAMES   space-separated extra ! -name patterns
#                                      (default: *.env-example* *.example.*)
#   BLOCKERA_PR_CONFIG_ROOT            search root (default: .)
set -euo pipefail

ROOT="${BLOCKERA_PR_CONFIG_ROOT:-.}"
NAME_PATTERN="${BLOCKERA_PR_CONFIG_NAME:-.pr-*}"
EXCLUDE_NAMES="${BLOCKERA_PR_CONFIG_EXCLUDE_NAMES:-*.env-example* *.example.*}"

FIND_ARGS=(. -name "${NAME_PATTERN}")
# shellcheck disable=SC2086
for exclude in ${EXCLUDE_NAMES}; do
	FIND_ARGS+=(! -name "${exclude}")
done

cd "${ROOT}"

FOUND="$(find "${FIND_ARGS[@]}" 2>/dev/null || true)"

if [[ -n "${FOUND}" ]]; then
	echo "❌ PR config files found. Please remove all PR-related config files and wait for all tests to pass before merging to master."
	echo "Found files:"
	printf '%s\n' "${FOUND}"
	exit 1
fi

echo "✅ No PR config files found. You can proceed with merging."
