#!/usr/bin/env bash
# Revert the version bump commit on the release branch (stable / continuing RC).
#
# Required env:
#   RELEASE_BRANCH_COMMIT
#   RELEASE_BRANCH
set -euo pipefail

RELEASE_BRANCH_COMMIT="${RELEASE_BRANCH_COMMIT:-}"
RELEASE_BRANCH="${RELEASE_BRANCH:-}"

if [[ -z "${RELEASE_BRANCH_COMMIT}" || -z "${RELEASE_BRANCH}" ]]; then
	echo "build-zip/revert-release: RELEASE_BRANCH_COMMIT and RELEASE_BRANCH required" >&2
	exit 1
fi

git revert --no-edit "${RELEASE_BRANCH_COMMIT}"
git push --set-upstream origin "${RELEASE_BRANCH}"
