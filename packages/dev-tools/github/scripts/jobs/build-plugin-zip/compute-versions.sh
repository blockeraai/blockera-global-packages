#!/usr/bin/env bash
# Compute old/new semver + release branch from package.json and release inputs.
#
# Required env:
#   RELEASE_TYPE   rc|stable
#   VERSION_TYPE   major|minor|patch
#
# Optional:
#   BLOCKERA_BUILD_ZIP_PACKAGE_JSON   default: package.json
set -euo pipefail

if [[ -z "${GITHUB_OUTPUT:-}" ]]; then
	echo "build-zip/versions: GITHUB_OUTPUT is unset" >&2
	exit 1
fi

RELEASE_TYPE="${RELEASE_TYPE:-}"
VERSION_TYPE="${VERSION_TYPE:-patch}"
PACKAGE_JSON="${BLOCKERA_BUILD_ZIP_PACKAGE_JSON:-package.json}"

if [[ -z "${RELEASE_TYPE}" ]]; then
	echo "build-zip/versions: RELEASE_TYPE is required" >&2
	exit 1
fi

OLD_VERSION="$(jq --raw-output '.version' "${PACKAGE_JSON}")"
echo "old_version=${OLD_VERSION}" >>"${GITHUB_OUTPUT}"

if [[ "${RELEASE_TYPE}" == "stable" ]]; then
	if [[ "${VERSION_TYPE}" == "major" ]]; then
		NEW_VERSION="$(npx semver "${OLD_VERSION}" -i major)"
	elif [[ "${VERSION_TYPE}" == "minor" ]]; then
		NEW_VERSION="$(npx semver "${OLD_VERSION}" -i minor)"
	else
		NEW_VERSION="$(npx semver "${OLD_VERSION}" -i patch)"
	fi
else
	if [[ "${OLD_VERSION}" == *"rc"* ]]; then
		NEW_VERSION="$(npx semver "${OLD_VERSION}" -i prerelease)"
	else
		if [[ "${VERSION_TYPE}" == "major" ]]; then
			NEW_VERSION="$(npx semver "${OLD_VERSION}" -i major)-rc.1"
		elif [[ "${VERSION_TYPE}" == "minor" ]]; then
			NEW_VERSION="$(npx semver "${OLD_VERSION}" -i minor)-rc.1"
		else
			NEW_VERSION="$(npx semver "${OLD_VERSION}" -i patch)-rc.1"
		fi
	fi
fi

echo "new_version=${NEW_VERSION}" >>"${GITHUB_OUTPUT}"

# Core line only (2.0.0-rc.1 → release/2.0.0). Prefer resolve-release-branch.sh
# before checkout so a leftover release/x.y.z-rc name is reused.
CORE_VERSION="${NEW_VERSION%%-*}"
RELEASE_BRANCH="release/${CORE_VERSION}"
echo "release_branch=${RELEASE_BRANCH}" >>"${GITHUB_OUTPUT}"

echo "build-zip/versions: ${OLD_VERSION} → ${NEW_VERSION} (${RELEASE_BRANCH})"
