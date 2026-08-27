#!/usr/bin/env bash
# Resolve the release/* branch for this dispatch.
#
# RC always uses release/x.y.z-rc (create from HEAD if missing).
# Stable always uses release/x.y.z (never commits on the -rc branch). When
# that branch is missing and origin/release/x.y.z-rc exists, create stable
# from the RC tip.
#
# Required env:
#   RELEASE_TYPE   rc|stable
#   VERSION_TYPE   major|minor|patch  (used only when package.json is not already a prerelease)
#
# Optional:
#   BLOCKERA_BUILD_ZIP_PACKAGE_JSON   default: package.json
#
# Outputs (GITHUB_OUTPUT):
#   release_branch
#   source_branch   origin ref to fork from when creating release_branch (may be empty)
set -euo pipefail

if [[ -z "${GITHUB_OUTPUT:-}" ]]; then
	echo "build-zip/resolve-branch: GITHUB_OUTPUT is unset" >&2
	exit 1
fi

RELEASE_TYPE="${RELEASE_TYPE:-}"
VERSION_TYPE="${VERSION_TYPE:-patch}"
PACKAGE_JSON="${BLOCKERA_BUILD_ZIP_PACKAGE_JSON:-package.json}"

if [[ -z "${RELEASE_TYPE}" ]]; then
	echo "build-zip/resolve-branch: RELEASE_TYPE is required" >&2
	exit 1
fi

OLD_VERSION="$(jq --raw-output '.version' "${PACKAGE_JSON}")"
if [[ -z "${OLD_VERSION}" || "${OLD_VERSION}" == "null" ]]; then
	echo "build-zip/resolve-branch: no version in ${PACKAGE_JSON}" >&2
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

RC_BRANCH="release/${CORE_VERSION}-rc"
STABLE_BRANCH="release/${CORE_VERSION}"
CURRENT="$(git branch --show-current)"
SOURCE_BRANCH=""

origin_has() {
	git ls-remote --exit-code --heads origin "${1}" >/dev/null 2>&1
}

if [[ "${RELEASE_TYPE}" == "rc" ]]; then
	RELEASE_BRANCH="${RC_BRANCH}"
else
	RELEASE_BRANCH="${STABLE_BRANCH}"
	if ! origin_has "${STABLE_BRANCH}" && [[ "${CURRENT}" != "${STABLE_BRANCH}" ]]; then
		if origin_has "${RC_BRANCH}" || [[ "${CURRENT}" == "${RC_BRANCH}" ]]; then
			SOURCE_BRANCH="${RC_BRANCH}"
		fi
	fi
fi

{
	echo "release_branch=${RELEASE_BRANCH}"
	echo "source_branch=${SOURCE_BRANCH}"
} >>"${GITHUB_OUTPUT}"
echo "build-zip/resolve-branch: ${OLD_VERSION} → ${RELEASE_BRANCH} (core ${CORE_VERSION} source=${SOURCE_BRANCH:-none})"
