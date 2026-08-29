#!/usr/bin/env bash
# Rewrite source_branch choice options in a release workflow YAML.
#
# GitHub workflow_dispatch choice lists are static. This keeps the dropdown
# as default-branch + origin release/* (allowed hotfix sources).
#
# Required: markers in the workflow file:
#   # BEGIN SOURCE_BRANCH_OPTIONS
#   # END SOURCE_BRANCH_OPTIONS
#
# Optional env:
#   BLOCKERA_RELEASE_WORKFLOW_FILE     default: .github/workflows/release-plugin.yml
#   BLOCKERA_BUILD_ZIP_DEFAULT_BRANCH  default: master
#   BLOCKERA_SOURCE_BRANCH_OPTIONS_MAX default: 50  (default-branch + this many release/*)
set -euo pipefail

FILE="${BLOCKERA_RELEASE_WORKFLOW_FILE:-.github/workflows/release-plugin.yml}"
DEFAULT_BRANCH="${BLOCKERA_BUILD_ZIP_DEFAULT_BRANCH:-master}"
MAX_RELEASE="${BLOCKERA_SOURCE_BRANCH_OPTIONS_MAX:-50}"
HERE="$(cd "$(dirname "$0")" && pwd)"

if [[ ! -f "${FILE}" ]]; then
	echo "build-zip/sync-source-options: missing ${FILE}" >&2
	exit 1
fi

if ! grep -q '# BEGIN SOURCE_BRANCH_OPTIONS' "${FILE}"; then
	echo "build-zip/sync-source-options: ${FILE} has no BEGIN SOURCE_BRANCH_OPTIONS marker" >&2
	exit 1
fi

git fetch origin --prune --quiet

RELEASE_ARGS=()
while IFS= read -r branch; do
	[[ -z "${branch}" ]] && continue
	RELEASE_ARGS+=("${branch}")
done < <(
	git ls-remote --heads origin 'refs/heads/release/*' |
		awk '{print $2}' |
		sed 's#^refs/heads/##' |
		sort -V -r |
		head -n "${MAX_RELEASE}"
)

python3 "${HERE}/sync-release-source-branch-options.py" \
	"${FILE}" \
	"${DEFAULT_BRANCH}" \
	"${RELEASE_ARGS[@]+"${RELEASE_ARGS[@]}"}"
