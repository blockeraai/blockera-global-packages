#!/usr/bin/env bash
# Recreate RELEASE_BRANCH from origin/SOURCE_BRANCH (default: master HEAD).
# Never continues an existing release/* history. Dispatch does not require
# creating the branch in GitHub first.
#
# Required env:
#   RELEASE_BRANCH
#
# Optional env:
#   SOURCE_BRANCH   default: BLOCKERA_BUILD_ZIP_DEFAULT_BRANCH / master
#   BLOCKERA_BUILD_ZIP_DEFAULT_BRANCH   default: master
#   RELEASE_TYPE    ignored; kept so older workflows can still pass it
#   OLD_VERSION     ignored; kept so older workflows can still pass it
#
# Outputs (GITHUB_OUTPUT):
#   created   true when origin did not already have RELEASE_BRANCH
set -euo pipefail

RELEASE_BRANCH="${RELEASE_BRANCH:-}"
DEFAULT_BRANCH="${BLOCKERA_BUILD_ZIP_DEFAULT_BRANCH:-master}"
SOURCE_BRANCH="${SOURCE_BRANCH:-${DEFAULT_BRANCH}}"
if [[ -z "${RELEASE_BRANCH}" ]]; then
	echo "build-zip/prepare-branch: RELEASE_BRANCH required" >&2
	exit 1
fi

created=true

origin_has() {
	git ls-remote --exit-code --heads origin "${1}" >/dev/null 2>&1
}

if origin_has "${RELEASE_BRANCH}"; then
	created=false
fi

echo "build-zip/prepare-branch: fork ${RELEASE_BRANCH} from origin/${SOURCE_BRANCH}"
git fetch origin "${SOURCE_BRANCH}"
git checkout -B "${RELEASE_BRANCH}" "origin/${SOURCE_BRANCH}"

if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
	echo "created=${created}" >>"${GITHUB_OUTPUT}"
fi
