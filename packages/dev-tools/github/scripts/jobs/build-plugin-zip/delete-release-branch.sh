#!/usr/bin/env bash
# Delete a release branch that was created only for a new RC.
#
# Required env:
#   RELEASE_BRANCH
set -euo pipefail

RELEASE_BRANCH="${RELEASE_BRANCH:-}"
if [[ -z "${RELEASE_BRANCH}" ]]; then
	echo "build-zip/delete-branch: RELEASE_BRANCH is required" >&2
	exit 1
fi

git push origin ":${RELEASE_BRANCH}"
