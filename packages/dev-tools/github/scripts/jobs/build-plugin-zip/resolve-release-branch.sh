#!/usr/bin/env bash
# Resolve the release/* branch for this dispatch.
#
# RC → release/x.y.z-rc. Stable → release/x.y.z. Both always fork from
# origin/<default-branch> HEAD (not from an existing release/* or RC tip).
# Version core is read from that default-branch package.json.
#
# Required env:
#   RELEASE_TYPE   rc|stable
#   VERSION_TYPE   major|minor|patch  (used only when package.json is not already a prerelease)
#
# Optional:
#   BLOCKERA_BUILD_ZIP_PACKAGE_JSON     default: package.json
#   BLOCKERA_BUILD_ZIP_DEFAULT_BRANCH   default: master  (fork source)
#
# Outputs (GITHUB_OUTPUT):
#   release_branch
#   source_branch   always the default branch
set -euo pipefail

if [[ -z "${GITHUB_OUTPUT:-}" ]]; then
	echo "build-zip/resolve-branch: GITHUB_OUTPUT is unset" >&2
	exit 1
fi

RELEASE_TYPE="${RELEASE_TYPE:-}"
VERSION_TYPE="${VERSION_TYPE:-patch}"
PACKAGE_JSON="${BLOCKERA_BUILD_ZIP_PACKAGE_JSON:-package.json}"
DEFAULT_BRANCH="${BLOCKERA_BUILD_ZIP_DEFAULT_BRANCH:-master}"
SOURCE_BRANCH="${DEFAULT_BRANCH}"

if [[ -z "${RELEASE_TYPE}" ]]; then
	echo "build-zip/resolve-branch: RELEASE_TYPE is required" >&2
	exit 1
fi

git fetch origin "${DEFAULT_BRANCH}"

OLD_VERSION="$(git show "origin/${DEFAULT_BRANCH}:${PACKAGE_JSON}" | jq --raw-output '.version')"
if [[ -z "${OLD_VERSION}" || "${OLD_VERSION}" == "null" ]]; then
	echo "build-zip/resolve-branch: no version in origin/${DEFAULT_BRANCH}:${PACKAGE_JSON}" >&2
	exit 1
fi

if [[ "${OLD_VERSION}" == *-* ]]; then
	CORE_VERSION="${OLD_VERSION%%-*}"
else
	if [[ "${VERSION_TYPE}" == "major" ]]; then
		CORE_VERSION="$(npx semver "${OLD_VERSION}" -i major)"
	elif [[ "${VERSION_TYPE}" == "minor" ]]; then
		CORE_VERSION="$(npx semver "${OLD_VERSION}" -i minor)"
	else
		CORE_VERSION="$(npx semver "${OLD_VERSION}" -i patch)"
	fi
fi

if [[ "${RELEASE_TYPE}" == "rc" ]]; then
	RELEASE_BRANCH="release/${CORE_VERSION}-rc"
else
	RELEASE_BRANCH="release/${CORE_VERSION}"
fi

{
	echo "release_branch=${RELEASE_BRANCH}"
	echo "source_branch=${SOURCE_BRANCH}"
} >>"${GITHUB_OUTPUT}"
echo "build-zip/resolve-branch: origin/${DEFAULT_BRANCH} ${OLD_VERSION} → ${RELEASE_BRANCH} (core ${CORE_VERSION})"
