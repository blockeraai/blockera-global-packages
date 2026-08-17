#!/usr/bin/env bash
# Upload the product zip to the ci-artifacts prerelease and export PUBLIC_URL.
#
# Required env:
#   GH_TOKEN, PR_NUMBER, REPO, SHORT_SHA (full or short)
# Optional (Blockera base defaults):
#   BLOCKERA_DEMO_SLUG           default: blockera
#   BLOCKERA_DEMO_ZIP            default: ${SLUG}.zip
#   BLOCKERA_DEMO_RELEASE_TAG    default: ci-artifacts
#   BLOCKERA_DEMO_RELEASE_TITLE  default: CI Artifacts
#   BLOCKERA_DEMO_RELEASE_NOTES  default: Public PR build zips…
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RETRY_SH="${SCRIPT_DIR}/../../lib/retry.sh"

if [[ ! -f "${RETRY_SH}" ]]; then
	echo "create-demo/publish-zip: missing ${RETRY_SH}" >&2
	exit 1
fi

# GitHub Releases often 503s while deleting an existing asset for --clobber.
gh_retry() {
	local label="$1"
	shift
	bash "${RETRY_SH}" --label "${label}" --max 5 --delay 15 -- "$@"
}

: "${GH_TOKEN:?GH_TOKEN is required}"
: "${PR_NUMBER:?PR_NUMBER is required}"
: "${REPO:?REPO is required}"
: "${SHORT_SHA:?SHORT_SHA is required}"

SLUG="${BLOCKERA_DEMO_SLUG:-blockera}"
ZIP_FILE="${BLOCKERA_DEMO_ZIP:-${SLUG}.zip}"
RELEASE_TAG="${BLOCKERA_DEMO_RELEASE_TAG:-ci-artifacts}"
RELEASE_TITLE="${BLOCKERA_DEMO_RELEASE_TITLE:-CI Artifacts}"
RELEASE_NOTES="${BLOCKERA_DEMO_RELEASE_NOTES:-Public PR build zips for WordPress Playground demos. Not a product release.}"

SHORT_SHA="${SHORT_SHA:0:7}"
ASSET_NAME="${SLUG}-pr-${PR_NUMBER}.zip"
PUBLIC_URL="https://github.com/${REPO}/releases/download/${RELEASE_TAG}/${ASSET_NAME}?v=${SHORT_SHA}"

if [[ ! -f "${ZIP_FILE}" ]]; then
	echo "create-demo/publish-zip: missing zip file '${ZIP_FILE}'" >&2
	exit 1
fi

cp "${ZIP_FILE}" "${ASSET_NAME}"

if ! gh release view "${RELEASE_TAG}" --repo "${REPO}" >/dev/null 2>&1; then
	gh_retry "gh release create" gh release create "${RELEASE_TAG}" \
		--repo "${REPO}" \
		--title "${RELEASE_TITLE}" \
		--notes "${RELEASE_NOTES}" \
		--prerelease
fi

gh_retry "gh release upload" gh release upload "${RELEASE_TAG}" "${ASSET_NAME}" \
	--repo "${REPO}" \
	--clobber

LEGACY_PREFIX="${SLUG}-pr-${PR_NUMBER}-"
while IFS= read -r legacy_asset; do
	[[ -z "${legacy_asset}" ]] && continue
	echo "Deleting legacy release asset: ${legacy_asset}"
	gh_retry "gh release delete-asset" gh release delete-asset "${RELEASE_TAG}" "${legacy_asset}" --repo "${REPO}" --yes
done < <(
	gh release view "${RELEASE_TAG}" --repo "${REPO}" --json assets \
		| jq -r --arg prefix "${LEGACY_PREFIX}" '
			.assets
			| map(select(.name | startswith($prefix)))
			| .[].name
		'
)

if [[ -n "${GITHUB_ENV:-}" ]]; then
	echo "uploaded_zip_file=${PUBLIC_URL}" >>"${GITHUB_ENV}"
fi
echo "uploaded_zip_file=${PUBLIC_URL}"
echo "Public zip URL: ${PUBLIC_URL}"
