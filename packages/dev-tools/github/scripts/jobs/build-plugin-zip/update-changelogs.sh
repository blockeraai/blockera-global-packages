#!/usr/bin/env bash
# Run update:changelogs, commit, and export changelog + has_commit.
#
# Required env:
#   NEW_VERSION
#
# Optional:
#   BLOCKERA_BUILD_ZIP_UPDATE_CHANGELOGS_CMD  default: npm run update:changelogs -- --version=…
#   BLOCKERA_BUILD_ZIP_CHANGELOG_FILE           default: changelog.txt
set -euo pipefail

if [[ -z "${GITHUB_OUTPUT:-}" ]]; then
	echo "build-zip/changelogs: GITHUB_OUTPUT is unset" >&2
	exit 1
fi

NEW_VERSION="${NEW_VERSION:-}"
if [[ -z "${NEW_VERSION}" ]]; then
	echo "build-zip/changelogs: NEW_VERSION is required" >&2
	exit 1
fi

CHANGELOG_FILE="${BLOCKERA_BUILD_ZIP_CHANGELOG_FILE:-changelog.txt}"
UPDATE_CMD="${BLOCKERA_BUILD_ZIP_UPDATE_CHANGELOGS_CMD:-npm run update:changelogs -- --version=${NEW_VERSION}}"

echo "build-zip/changelogs: ${UPDATE_CMD}"
eval "${UPDATE_CMD}"

CHANGELOG="$(awk '{printf "%s\\n", $0}' "${CHANGELOG_FILE}")"
echo "changelog=${CHANGELOG}" >>"${GITHUB_OUTPUT}"

git add .
git commit -m "Update Changelog for ${NEW_VERSION}"
echo "has_commit=$(git rev-parse --verify --short HEAD)" >>"${GITHUB_OUTPUT}"
