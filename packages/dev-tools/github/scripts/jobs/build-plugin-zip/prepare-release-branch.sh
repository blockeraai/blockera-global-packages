#!/usr/bin/env bash
# Checkout origin/RELEASE_BRANCH when it exists; otherwise create it from HEAD.
# Dispatch from the default branch does not require creating the branch in GitHub first.
#
# Required env:
#   RELEASE_BRANCH
#
# Optional env (ignored; kept so older workflows can still pass them):
#   RELEASE_TYPE
#   OLD_VERSION
#
# Outputs (GITHUB_OUTPUT):
#   created   true when origin did not have the branch
set -euo pipefail

RELEASE_BRANCH="${RELEASE_BRANCH:-}"
if [[ -z "${RELEASE_BRANCH}" ]]; then
	echo "build-zip/prepare-branch: RELEASE_BRANCH required" >&2
	exit 1
fi

created=false

if git ls-remote --exit-code --heads origin "${RELEASE_BRANCH}" >/dev/null 2>&1; then
	echo "build-zip/prepare-branch: checkout origin/${RELEASE_BRANCH}"
	git fetch origin "${RELEASE_BRANCH}"
	git checkout -B "${RELEASE_BRANCH}" "origin/${RELEASE_BRANCH}"
elif [[ "$(git branch --show-current)" == "${RELEASE_BRANCH}" ]]; then
	echo "build-zip/prepare-branch: already on ${RELEASE_BRANCH} (not on origin)"
	created=true
else
	echo "build-zip/prepare-branch: create ${RELEASE_BRANCH}"
	git checkout -b "${RELEASE_BRANCH}"
	created=true
fi

if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
	echo "created=${created}" >>"${GITHUB_OUTPUT}"
fi
