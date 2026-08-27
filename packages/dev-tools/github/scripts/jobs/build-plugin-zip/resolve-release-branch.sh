#!/usr/bin/env bash
# Resolve the release/* branch for this dispatch.
#
# Uses the core x.y.z line (prerelease suffix stripped). Prefers origin/release/x.y.z,
# then a leftover origin/release/x.y.z-rc from older IFS splits, then creates x.y.z.
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

PREFERRED="release/${CORE_VERSION}"
LEGACY="release/${CORE_VERSION}-rc"
CURRENT="$(git branch --show-current)"

origin_has() {
	git ls-remote --exit-code --heads origin "${1}" >/dev/null 2>&1
}

if origin_has "${PREFERRED}"; then
	RELEASE_BRANCH="${PREFERRED}"
elif origin_has "${LEGACY}"; then
	RELEASE_BRANCH="${LEGACY}"
elif [[ "${CURRENT}" == "${PREFERRED}" || "${CURRENT}" == "${LEGACY}" ]]; then
	RELEASE_BRANCH="${CURRENT}"
else
	RELEASE_BRANCH="${PREFERRED}"
fi

echo "release_branch=${RELEASE_BRANCH}" >>"${GITHUB_OUTPUT}"
echo "build-zip/resolve-branch: ${OLD_VERSION} → ${RELEASE_BRANCH} (core ${CORE_VERSION})"
