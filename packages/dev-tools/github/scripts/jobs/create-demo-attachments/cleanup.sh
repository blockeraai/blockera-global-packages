#!/usr/bin/env bash
# Delete PR zip assets from the ci-artifacts prerelease when a PR closes.
#
# Required env:
#   GH_TOKEN, PR_NUMBER, REPO
# Optional:
#   BLOCKERA_DEMO_SLUG         default: blockera
#   BLOCKERA_DEMO_RELEASE_TAG  default: ci-artifacts
set -euo pipefail

: "${GH_TOKEN:?GH_TOKEN is required}"
: "${PR_NUMBER:?PR_NUMBER is required}"
: "${REPO:?REPO is required}"

SLUG="${BLOCKERA_DEMO_SLUG:-blockera}"
RELEASE_TAG="${BLOCKERA_DEMO_RELEASE_TAG:-ci-artifacts}"
ASSET_NAME="${SLUG}-pr-${PR_NUMBER}.zip"
LEGACY_PREFIX="${SLUG}-pr-${PR_NUMBER}-"

if ! gh release view "${RELEASE_TAG}" --repo "${REPO}" >/dev/null 2>&1; then
	echo "Release ${RELEASE_TAG} not found; nothing to clean up."
	exit 0
fi

DELETED=0
while IFS= read -r asset; do
	[[ -z "${asset}" ]] && continue
	echo "Deleting release asset: ${asset}"
	gh release delete-asset "${RELEASE_TAG}" "${asset}" --repo "${REPO}" --yes || true
	DELETED=1
done < <(
	gh release view "${RELEASE_TAG}" --repo "${REPO}" --json assets \
		| jq -r --arg exact "${ASSET_NAME}" --arg prefix "${LEGACY_PREFIX}" '
			.assets
			| map(select(.name == $exact or (.name | startswith($prefix))))
			| .[].name
		'
)

if [[ "${DELETED}" -eq 0 ]]; then
	echo "No release assets found for PR ${PR_NUMBER}."
fi
