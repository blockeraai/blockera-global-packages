#!/usr/bin/env bash
# Revert the version bump commit on master.
#
# Required env:
#   MASTER_COMMIT
set -euo pipefail

MASTER_COMMIT="${MASTER_COMMIT:-}"
if [[ -z "${MASTER_COMMIT}" ]]; then
	echo "build-zip/revert-master: MASTER_COMMIT is required" >&2
	exit 1
fi

git fetch --depth=2 origin master
git checkout master
git revert --no-edit "${MASTER_COMMIT}"
git push --set-upstream origin master
