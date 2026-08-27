#!/usr/bin/env bash
# Checkout origin/RELEASE_BRANCH when it exists; otherwise create it from HEAD.
# Dispatch from the default branch does not require creating the branch in GitHub first.
#
# Required env:
#   RELEASE_BRANCH
#
# Optional env:
#   SOURCE_BRANCH   fork from origin/SOURCE_BRANCH (or local) when RELEASE_BRANCH is new
#   RELEASE_TYPE    ignored; kept so older workflows can still pass it
#   OLD_VERSION     ignored; kept so older workflows can still pass it
#
# Outputs (GITHUB_OUTPUT):
#   created   true when origin did not have the branch
set -euo pipefail

RELEASE_BRANCH="${RELEASE_BRANCH:-}"
SOURCE_BRANCH="${SOURCE_BRANCH:-}"
if [[ -z "${RELEASE_BRANCH}" ]]; then
	echo "build-zip/prepare-branch: RELEASE_BRANCH required" >&2
	exit 1
fi

created=false

origin_has() {
	git ls-remote --exit-code --heads origin "${1}" >/dev/null 2>&1
}

if origin_has "${RELEASE_BRANCH}"; then
	echo "build-zip/prepare-branch: checkout origin/${RELEASE_BRANCH}"
	git fetch origin "${RELEASE_BRANCH}"
	git checkout -B "${RELEASE_BRANCH}" "origin/${RELEASE_BRANCH}"
elif [[ "$(git branch --show-current)" == "${RELEASE_BRANCH}" ]]; then
	echo "build-zip/prepare-branch: already on ${RELEASE_BRANCH} (not on origin)"
	created=true
elif [[ -n "${SOURCE_BRANCH}" ]] && origin_has "${SOURCE_BRANCH}"; then
	echo "build-zip/prepare-branch: create ${RELEASE_BRANCH} from origin/${SOURCE_BRANCH}"
	git fetch origin "${SOURCE_BRANCH}"
	git checkout -b "${RELEASE_BRANCH}" "origin/${SOURCE_BRANCH}"
	created=true
elif [[ -n "${SOURCE_BRANCH}" && "$(git branch --show-current)" == "${SOURCE_BRANCH}" ]]; then
	echo "build-zip/prepare-branch: create ${RELEASE_BRANCH} from ${SOURCE_BRANCH}"
	git checkout -b "${RELEASE_BRANCH}"
	created=true
else
	echo "build-zip/prepare-branch: create ${RELEASE_BRANCH}"
	git checkout -b "${RELEASE_BRANCH}"
	created=true
fi

if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
	echo "created=${created}" >>"${GITHUB_OUTPUT}"
fi
