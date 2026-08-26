#!/usr/bin/env bash
# Build release-notes.txt from changelog + other:changelog npm script.
#
# Required env:
#   NEW_VERSION
#   CHANGELOG          escaped newlines (\\n) from bump job output
#
# Optional:
#   BLOCKERA_BUILD_ZIP_OTHER_CHANGELOG_CMD
#   BLOCKERA_BUILD_ZIP_CHANGELOG_FILE   default: changelog.txt
#   BLOCKERA_BUILD_ZIP_MILESTONE_PREFIX default: Blockera
set -euo pipefail

NEW_VERSION="${NEW_VERSION:-}"
CHANGELOG="${CHANGELOG:-}"
CHANGELOG_FILE="${BLOCKERA_BUILD_ZIP_CHANGELOG_FILE:-changelog.txt}"
MILESTONE_PREFIX="${BLOCKERA_BUILD_ZIP_MILESTONE_PREFIX:-Blockera}"

if [[ -z "${NEW_VERSION}" ]]; then
	echo "build-zip/notes: NEW_VERSION is required" >&2
	exit 1
fi

IFS='.' read -r -a VERSION_ARRAY <<<"${NEW_VERSION}"
MILESTONE="${MILESTONE_PREFIX} ${VERSION_ARRAY[0]}.${VERSION_ARRAY[1]}"

printf '%s' "${CHANGELOG}" | sed 's/\\n/\n/g' >release-note.txt

OTHER_CMD="${BLOCKERA_BUILD_ZIP_OTHER_CHANGELOG_CMD:-npm run other:changelog -- --milestone=${MILESTONE} --unreleased --file=release-note.txt --version=${NEW_VERSION}}"
echo "build-zip/notes: ${OTHER_CMD}"
eval "${OTHER_CMD}" >release-notes.txt
sed -ie '1,6d' release-notes.txt

if [[ "${NEW_VERSION}" != *"rc"* ]]; then
	CHANGELOG_REGEX="=\s[0-9]+\.[0-9]+\.[0-9]+(-rc\.[0-9]+)?\s="
	RC_REGEX="=\s${NEW_VERSION}(-rc\.[0-9]+)?\s="
	awk "/${RC_REGEX}/ {found=1;print;next} /${CHANGELOG_REGEX}/ {found=0} found" "${CHANGELOG_FILE}" >>release-notes.txt
fi

echo "build-zip/notes: wrote release-notes.txt (milestone=${MILESTONE})"
