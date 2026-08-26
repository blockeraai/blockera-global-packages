#!/usr/bin/env bash
# Create or checkout the release branch based on release_type / old_version.
#
# Required env:
#   RELEASE_TYPE     rc|stable
#   OLD_VERSION
#   RELEASE_BRANCH
set -euo pipefail

RELEASE_TYPE="${RELEASE_TYPE:-}"
OLD_VERSION="${OLD_VERSION:-}"
RELEASE_BRANCH="${RELEASE_BRANCH:-}"

if [[ -z "${RELEASE_TYPE}" || -z "${OLD_VERSION}" || -z "${RELEASE_BRANCH}" ]]; then
	echo "build-zip/prepare-branch: RELEASE_TYPE, OLD_VERSION, RELEASE_BRANCH required" >&2
	exit 1
fi

if [[ "${RELEASE_TYPE}" == "rc" && "${OLD_VERSION}" != *"rc"* ]]; then
	echo "build-zip/prepare-branch: create ${RELEASE_BRANCH}"
	git checkout -b "${RELEASE_BRANCH}"
	exit 0
fi

if [[ "${RELEASE_TYPE}" == "stable" || "${OLD_VERSION}" == *"rc"* ]]; then
	echo "build-zip/prepare-branch: checkout ${RELEASE_BRANCH}"
	git fetch --depth=1 origin "${RELEASE_BRANCH}"
	git checkout "${RELEASE_BRANCH}"
	exit 0
fi

echo "build-zip/prepare-branch: no branch action for release_type=${RELEASE_TYPE}" >&2
exit 1
