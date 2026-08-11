#!/usr/bin/env bash
# Compute next release/* branch from the latest v* tag + version_type.
#
# Required env:
#   VERSION_TYPE   major|minor|patch
#
# Optional:
#   BLOCKERA_BUILD_ZIP_TAG_GLOB   default: v*
set -euo pipefail

if [[ -z "${GITHUB_OUTPUT:-}" ]]; then
	echo "build-zip/next-branch: GITHUB_OUTPUT is unset" >&2
	exit 1
fi

VERSION_TYPE="${VERSION_TYPE:-patch}"
TAG_GLOB="${BLOCKERA_BUILD_ZIP_TAG_GLOB:-v*}"

LATEST_STABLE_TAG="$(git tag --list "${TAG_GLOB}" | sort -V | tail -n 1)"
if [[ -z "${LATEST_STABLE_TAG}" ]]; then
	echo "build-zip/next-branch: no tags matching ${TAG_GLOB}" >&2
	exit 1
fi

IFS='.' read -r LATEST_STABLE_MAJOR LATEST_STABLE_MINOR LATEST_STABLE_PATCH <<<"${LATEST_STABLE_TAG#v}"

if [[ "${VERSION_TYPE}" == "major" ]]; then
	NEXT="release/$((LATEST_STABLE_MAJOR + 1)).0"
elif [[ "${VERSION_TYPE}" == "minor" ]]; then
	NEXT="release/${LATEST_STABLE_MAJOR}.$((LATEST_STABLE_MINOR + 1))"
else
	NEXT="release/${LATEST_STABLE_MAJOR}.${LATEST_STABLE_MINOR}.$((LATEST_STABLE_PATCH + 1))"
fi

echo "next_stable_branch=${NEXT}" >>"${GITHUB_OUTPUT}"
echo "build-zip/next-branch: ${NEXT} (from ${LATEST_STABLE_TAG})"
