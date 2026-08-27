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

# 2.0.0-rc.1 → 2.0 (do not split on the rc counter).
BASE_VERSION="${NEW_VERSION%%-*}"
IFS='.' read -r MAJOR MINOR _ <<<"${BASE_VERSION}"
MILESTONE="${MILESTONE_PREFIX} ${MAJOR}.${MINOR}"

printf '%s' "${CHANGELOG}" | sed 's/\\n/\n/g' >release-note.txt

# Quote --milestone: "Blockera 2.0" must stay one argv or Commander keeps only "Blockera".
if [[ -n "${BLOCKERA_BUILD_ZIP_OTHER_CHANGELOG_CMD:-}" ]]; then
	echo "build-zip/notes: ${BLOCKERA_BUILD_ZIP_OTHER_CHANGELOG_CMD}"
	eval "${BLOCKERA_BUILD_ZIP_OTHER_CHANGELOG_CMD}" >release-notes.txt
else
	echo "build-zip/notes: npm run other:changelog -- --milestone=${MILESTONE} --unreleased --file=release-note.txt --version=${NEW_VERSION}"
	npm run other:changelog -- \
		--milestone="${MILESTONE}" \
		--unreleased \
		--file=release-note.txt \
		--version="${NEW_VERSION}" \
		>release-notes.txt
fi
sed -ie '1,6d' release-notes.txt

if [[ "${NEW_VERSION}" != *"rc"* ]]; then
	CHANGELOG_REGEX="=\s[0-9]+\.[0-9]+\.[0-9]+(-rc\.[0-9]+)?\s="
	RC_REGEX="=\s${NEW_VERSION}(-rc\.[0-9]+)?\s="
	awk "/${RC_REGEX}/ {found=1;print;next} /${CHANGELOG_REGEX}/ {found=0} found" "${CHANGELOG_FILE}" >>release-notes.txt
fi

echo "build-zip/notes: wrote release-notes.txt (milestone=${MILESTONE})"
