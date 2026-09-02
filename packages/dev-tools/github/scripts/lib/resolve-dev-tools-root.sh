#!/usr/bin/env bash
# Print the repo-relative path to the @blockera/dev-tools package (no trailing slash).
#
# Layouts:
#   standalone GP origin: packages/dev-tools
#   consumer submodule:   packages/global-packages/packages/dev-tools
#
# Override: BLOCKERA_DEV_TOOLS_ROOT (relative to repo root).
#
# Usage:
#   DEV_TOOLS="$(bash path/to/resolve-dev-tools-root.sh)"
#   DEV_TOOLS="$(bash path/to/resolve-dev-tools-root.sh /path/to/repo-root)"
set -euo pipefail

if [ -n "${BLOCKERA_DEV_TOOLS_ROOT:-}" ]; then
	printf '%s\n' "${BLOCKERA_DEV_TOOLS_ROOT%/}"
	exit 0
fi

ROOT="${1:-${GITHUB_WORKSPACE:-}}"
if [ -z "${ROOT}" ]; then
	ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
fi

CONSUMER="packages/global-packages/packages/dev-tools"
ORIGIN="packages/dev-tools"

if [ -d "${ROOT}/${CONSUMER}" ]; then
	printf '%s\n' "${CONSUMER}"
	exit 0
fi

if [ -d "${ROOT}/${ORIGIN}" ]; then
	printf '%s\n' "${ORIGIN}"
	exit 0
fi

echo "resolve-dev-tools-root: neither ${CONSUMER} nor ${ORIGIN} exists under ${ROOT}" >&2
exit 1
