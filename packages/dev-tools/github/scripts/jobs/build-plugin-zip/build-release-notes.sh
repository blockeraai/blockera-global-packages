#!/usr/bin/env bash
# Build release-notes.txt from the bump-job CHANGELOG payload.
# Does not call other:changelog or look up GitHub milestones.
#
# Required env:
#   NEW_VERSION
#   CHANGELOG          escaped newlines (\\n) from bump job output
#
# Optional:
#   BLOCKERA_BUILD_ZIP_CHANGELOG_FILE   default: changelog.txt
#     on stable, matching sections from this WordPress.org-style file are appended
set -euo pipefail

NEW_VERSION="${NEW_VERSION:-}"
CHANGELOG="${CHANGELOG:-}"
CHANGELOG_FILE="${BLOCKERA_BUILD_ZIP_CHANGELOG_FILE:-changelog.txt}"

if [[ -z "${NEW_VERSION}" ]]; then
	echo "build-zip/notes: NEW_VERSION is required" >&2
	exit 1
fi

printf '%s' "${CHANGELOG}" | sed 's/\\n/\n/g' >release-notes.txt

if [[ "${NEW_VERSION}" != *"rc"* && -f "${CHANGELOG_FILE}" ]]; then
	CHANGELOG_REGEX="=\s[0-9]+\.[0-9]+\.[0-9]+(-rc\.[0-9]+)?\s="
	RC_REGEX="=\s${NEW_VERSION}(-rc\.[0-9]+)?\s="
	awk "/${RC_REGEX}/ {found=1;print;next} /${CHANGELOG_REGEX}/ {found=0} found" "${CHANGELOG_FILE}" >>release-notes.txt
fi

echo "build-zip/notes: wrote release-notes.txt from accumulated changelog"
