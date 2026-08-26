#!/usr/bin/env bash
# Run update:changelogs, commit product changelog files, and export changelog + has_commit.
#
# Required env:
#   NEW_VERSION
#
# Optional:
#   OLD_VERSION                               passed as BLOCKERA_CHANGELOG_PREVIOUS_VERSION
#   BLOCKERA_BUILD_ZIP_UPDATE_CHANGELOGS_CMD  default: npm run update:changelogs -- --version=…
#   BLOCKERA_BUILD_ZIP_CHANGELOG_FILE         default: changelog.txt
#   BLOCKERA_CHANGELOG_ROOT_MD                default: CHANGELOG.md
#   BLOCKERA_CHANGELOG_CONSUMER_GLOBS         package CHANGELOG.md globs (required)
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
ROOT_MD="${BLOCKERA_CHANGELOG_ROOT_MD:-CHANGELOG.md}"
UPDATE_CMD="${BLOCKERA_BUILD_ZIP_UPDATE_CHANGELOGS_CMD:-npm run update:changelogs -- --version=${NEW_VERSION}}"

if [[ -n "${OLD_VERSION:-}" ]]; then
	export BLOCKERA_CHANGELOG_PREVIOUS_VERSION="${OLD_VERSION}"
fi

echo "build-zip/changelogs: ${UPDATE_CMD}"
eval "${UPDATE_CMD}"

CHANGELOG="$(awk '{printf "%s\\n", $0}' "${CHANGELOG_FILE}")"
echo "changelog=${CHANGELOG}" >>"${GITHUB_OUTPUT}"

git add "${CHANGELOG_FILE}" "${ROOT_MD}"
git add -- packages/*/CHANGELOG.md 2>/dev/null || true
if git diff --cached --quiet; then
	echo "build-zip/changelogs: no changelog files to commit"
	echo "has_commit=" >>"${GITHUB_OUTPUT}"
	exit 0
fi

git commit -m "Update Changelog for ${NEW_VERSION}"
echo "has_commit=$(git rev-parse --verify --short HEAD)" >>"${GITHUB_OUTPUT}"
