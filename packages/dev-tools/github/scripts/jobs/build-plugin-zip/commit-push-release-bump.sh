#!/usr/bin/env bash
# Commit version files and push the release branch. Writes version_bump_commit.
#
# Required env:
#   NEW_VERSION
#   RELEASE_BRANCH
#
# Optional:
#   BLOCKERA_BUILD_ZIP_MAIN_FILE  default: blockera.php
#
# Pushes with --force-with-lease because the branch was recreated from source.
set -euo pipefail

if [[ -z "${GITHUB_OUTPUT:-}" ]]; then
	echo "build-zip/commit-release: GITHUB_OUTPUT is unset" >&2
	exit 1
fi

NEW_VERSION="${NEW_VERSION:-}"
RELEASE_BRANCH="${RELEASE_BRANCH:-}"
MAIN_FILE="${BLOCKERA_BUILD_ZIP_MAIN_FILE:-blockera.php}"

if [[ -z "${NEW_VERSION}" || -z "${RELEASE_BRANCH}" ]]; then
	echo "build-zip/commit-release: NEW_VERSION and RELEASE_BRANCH are required" >&2
	exit 1
fi

git add "${MAIN_FILE}" package.json package-lock.json
if [[ -f composer.json ]] && jq --exit-status '.version != null' composer.json >/dev/null 2>&1; then
	git add composer.json
fi

if git diff --cached --quiet; then
	echo "build-zip/commit-release: no version-file changes (package.json=$(jq --raw-output '.version' package.json); expected ${NEW_VERSION})" >&2
	exit 1
fi

git commit -m "Bump version to ${NEW_VERSION}"
git fetch origin "${RELEASE_BRANCH}" || true
git push --force-with-lease --set-upstream origin "${RELEASE_BRANCH}"
echo "version_bump_commit=$(git rev-parse --verify --short HEAD)" >>"${GITHUB_OUTPUT}"
