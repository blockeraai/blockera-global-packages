#!/usr/bin/env bash
# Cherry-pick changelog + version bump commits onto the default branch when
# versions match. RC / prerelease bumps stay on RELEASE_BRANCH only.
#
# Required env:
#   OLD_VERSION
#   CHANGELOG_COMMIT     short sha from update-changelogs
#   RELEASE_BRANCH
#
# Optional env:
#   RELEASE_TYPE         rc|stable  (default: stable — skip cherry-pick when rc)
#   SOURCE_BRANCH        skip when this is not the default branch (hotfix)
#   BLOCKERA_BUILD_ZIP_DEFAULT_BRANCH  default: master
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
RELEASE_TYPE="${RELEASE_TYPE:-stable}"
DEFAULT_BRANCH="${BLOCKERA_BUILD_ZIP_DEFAULT_BRANCH:-master}"
SOURCE_BRANCH="${SOURCE_BRANCH:-${DEFAULT_BRANCH}}"

if [[ -z "${OLD_VERSION}" || -z "${CHANGELOG_COMMIT}" || -z "${RELEASE_BRANCH}" ]]; then
	echo "build-zip/cherry-pick: OLD_VERSION, CHANGELOG_COMMIT, RELEASE_BRANCH required" >&2
	exit 1
fi

if [[ "${RELEASE_TYPE}" == "rc" ]]; then
	echo "build-zip/cherry-pick: skip ${DEFAULT_BRANCH} (release_type=rc; keep commits on ${RELEASE_BRANCH})"
	exit 0
fi

if [[ "${SOURCE_BRANCH}" != "${DEFAULT_BRANCH}" ]]; then
	echo "build-zip/cherry-pick: skip ${DEFAULT_BRANCH} (hotfix from ${SOURCE_BRANCH}; land the fix with a PR)"
	exit 0
fi

if [[ "${GITHUB_REF:-}" != "refs/heads/${DEFAULT_BRANCH}" ]]; then
	git fetch --depth=1 origin "${DEFAULT_BRANCH}"
fi

git checkout "${DEFAULT_BRANCH}"
git pull

MASTER_VERSION="$(jq --raw-output '.version' package.json)"
if [[ "${OLD_VERSION}" != "${MASTER_VERSION}" ]]; then
	echo "build-zip/cherry-pick: ${DEFAULT_BRANCH} version ${MASTER_VERSION} != old ${OLD_VERSION}; skip"
	exit 0
fi

git cherry-pick "${CHANGELOG_COMMIT}"
git cherry-pick "${RELEASE_BRANCH}"
git push
echo "version_bump_commit=$(git rev-parse --verify --short HEAD)" >>"${GITHUB_OUTPUT}"
