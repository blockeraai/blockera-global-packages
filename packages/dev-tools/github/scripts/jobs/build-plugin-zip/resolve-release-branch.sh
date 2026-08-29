#!/usr/bin/env bash
# Resolve the release/* branch for this dispatch.
#
# Fork from origin/<the branch this workflow was run from> (GitHub's live
# "Use workflow from" list). master = current line. release/* = hotfix
# (later default-branch PRs are excluded). Feature branches are rejected.
#
# Required env:
#   RELEASE_TYPE   rc|stable
#   VERSION_TYPE   major|minor|patch  (used only when package.json is not already a prerelease)
#
# Optional:
#   BLOCKERA_BUILD_ZIP_PACKAGE_JSON     default: package.json
#   BLOCKERA_BUILD_ZIP_DEFAULT_BRANCH   default: master
#   GITHUB_REF                          dispatch branch (refs/heads/…)
#
# Outputs (GITHUB_OUTPUT):
#   release_branch
#   source_branch
set -euo pipefail

if [[ -z "${GITHUB_OUTPUT:-}" ]]; then
	echo "build-zip/resolve-branch: GITHUB_OUTPUT is unset" >&2
	exit 1
fi

RELEASE_TYPE="${RELEASE_TYPE:-}"
VERSION_TYPE="${VERSION_TYPE:-patch}"
PACKAGE_JSON="${BLOCKERA_BUILD_ZIP_PACKAGE_JSON:-package.json}"
DEFAULT_BRANCH="${BLOCKERA_BUILD_ZIP_DEFAULT_BRANCH:-master}"

if [[ -z "${RELEASE_TYPE}" ]]; then
	echo "build-zip/resolve-branch: RELEASE_TYPE is required" >&2
	exit 1
fi

trim_branch() {
	local b="${1:-}"
	b="${b#"${b%%[![:space:]]*}"}"
	b="${b%"${b##*[![:space:]]}"}"
	b="${b#refs/heads/}"
	printf '%s' "${b}"
}

is_allowed_source() {
	local b="$1"
	[[ "${b}" == "${DEFAULT_BRANCH}" || "${b}" == release/* ]] && [[ "${b}" != "release/" ]]
}

SOURCE_BRANCH="$(trim_branch "${GITHUB_REF:-}")"
if [[ -z "${SOURCE_BRANCH}" ]]; then
	SOURCE_BRANCH="${DEFAULT_BRANCH}"
fi

if ! is_allowed_source "${SOURCE_BRANCH}"; then
	echo "build-zip/resolve-branch: source '${SOURCE_BRANCH}' must be ${DEFAULT_BRANCH} or release/* (pick it in Use workflow from)" >&2
	exit 1
fi

if [[ "${SOURCE_BRANCH}" != "${DEFAULT_BRANCH}" && "${VERSION_TYPE}" != "patch" ]]; then
	echo "build-zip/resolve-branch: hotfix from ${SOURCE_BRANCH} requires version_type=patch (got ${VERSION_TYPE})" >&2
	exit 1
fi

git fetch origin "${SOURCE_BRANCH}"

OLD_VERSION="$(git show "origin/${SOURCE_BRANCH}:${PACKAGE_JSON}" | jq --raw-output '.version')"
if [[ -z "${OLD_VERSION}" || "${OLD_VERSION}" == "null" ]]; then
	echo "build-zip/resolve-branch: no version in origin/${SOURCE_BRANCH}:${PACKAGE_JSON}" >&2
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
echo "build-zip/resolve-branch: origin/${SOURCE_BRANCH} ${OLD_VERSION} → ${RELEASE_BRANCH} (core ${CORE_VERSION})"
