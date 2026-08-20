#!/usr/bin/env bash
# Fail when PR-only config files are still in the tree.
#
# Defaults: see github/scripts/lib/pr-config-files.sh
#   BLOCKERA_PR_CONFIG_NAME            space-separated find -name patterns
#   BLOCKERA_PR_CONFIG_EXCLUDE_NAMES   space-separated ! -name patterns
#   BLOCKERA_PR_CONFIG_ROOT            search root (default: .)
set -euo pipefail

ROOT="${BLOCKERA_PR_CONFIG_ROOT:-.}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# shellcheck source=../../lib/pr-config-files.sh
source "${SCRIPT_DIR}/../../lib/pr-config-files.sh"

cd "${ROOT}"

FOUND="$(pr_config_find -print)"

if [[ -n "${FOUND}" ]]; then
	echo "❌ PR config files found. Please remove all PR-related config files and wait for all tests to pass before merging to master."
	echo "Found files:"
	printf '%s\n' "${FOUND}"
	exit 1
fi

echo "✅ No PR config files found. You can proceed with merging."
