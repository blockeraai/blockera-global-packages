#!/usr/bin/env bash
# Derive release/<major.minor.patch> from a release tag and write release_branch to GITHUB_OUTPUT.
#
# Required env:
#   TAG   e.g. v1.2.3 or 1.2.3
#
# Optional:
#   BLOCKERA_UPLOAD_RELEASE_BRANCH_PREFIX  default: release/
set -euo pipefail

if [[ -z "${GITHUB_OUTPUT:-}" ]]; then
	echo "upload-release/compute: GITHUB_OUTPUT is unset" >&2
	exit 1
fi

TAG="${TAG:-}"
if [[ -z "${TAG}" ]]; then
	echo "upload-release/compute: TAG is required" >&2
	exit 1
fi

PREFIX="${BLOCKERA_UPLOAD_RELEASE_BRANCH_PREFIX:-release/}"

IFS='.' read -r -a VERSION_ARRAY <<<"${TAG#v}"
RELEASE_BRANCH="${PREFIX}${VERSION_ARRAY[0]}.${VERSION_ARRAY[1]}.${VERSION_ARRAY[2]}"

echo "release_branch=${RELEASE_BRANCH}" >>"${GITHUB_OUTPUT}"
echo "upload-release/compute: ${RELEASE_BRANCH}"
