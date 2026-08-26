#!/usr/bin/env bash
# Cherry-pick changelog + version bump commits onto master when versions match.
#
# Required env:
#   OLD_VERSION
#   CHANGELOG_COMMIT     short sha from update-changelogs
#   RELEASE_BRANCH
#
# Writes version_bump_commit when a cherry-pick lands.
set -euo pipefail

if [[ -z "${GITHUB_OUTPUT:-}" ]]; then
	echo "build-zip/cherry-pick: GITHUB_OUTPUT is unset" >&2
	exit 1
fi

OLD_VERSION="${OLD_VERSION:-}"
CHANGELOG_COMMIT="${CHANGELOG_COMMIT:-}"
RELEASE_BRANCH="${RELEASE_BRANCH:-}"

if [[ -z "${OLD_VERSION}" || -z "${CHANGELOG_COMMIT}" || -z "${RELEASE_BRANCH}" ]]; then
	echo "build-zip/cherry-pick: OLD_VERSION, CHANGELOG_COMMIT, RELEASE_BRANCH required" >&2
	exit 1
fi

if [[ "${GITHUB_REF:-}" != "refs/heads/master" ]]; then
	git fetch --depth=1 origin master
fi

git checkout master
git pull

MASTER_VERSION="$(jq --raw-output '.version' package.json)"
if [[ "${OLD_VERSION}" != "${MASTER_VERSION}" ]]; then
	echo "build-zip/cherry-pick: master version ${MASTER_VERSION} != old ${OLD_VERSION}; skip"
	exit 0
fi

git cherry-pick "${CHANGELOG_COMMIT}"
git cherry-pick "${RELEASE_BRANCH}"
git push
echo "version_bump_commit=$(git rev-parse --verify --short HEAD)" >>"${GITHUB_OUTPUT}"
