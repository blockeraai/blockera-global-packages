#!/usr/bin/env bash
# Download a GitHub release zip and POST it to the Blockera AI release endpoint.
#
# Required env:
#   PLUGIN_URL              browser_download_url of the release asset
#   PLUGIN_VERSION          release tag (e.g. v1.2.3) — leading v is stripped for product_version
#   RELEASE_ENDPOINT
#   BLOCKERAAI_PRODUCT_ID
#   RELEASE_META_KEY
#   RELEASE_ACTION
#   BLOCKERABOT_API_KEY
#   GH_TOKEN                GitHub token for private/authenticated asset download
#
# Optional (Pro defaults):
#   BLOCKERA_UPLOAD_BLOCKERAAI_ZIP              default: blockera-pro.zip
#   BLOCKERA_UPLOAD_BLOCKERAAI_FILENAME_FIELD   default: ./my-downloads/<zip>
#   BLOCKERA_UPLOAD_BLOCKERAAI_FILES_MODE       append | replace
#                                               default: append when product_version
#                                               contains "-" (RC), else replace
set -euo pipefail

: "${PLUGIN_URL:?upload-blockeraai/publish: PLUGIN_URL is required}"
: "${PLUGIN_VERSION:?upload-blockeraai/publish: PLUGIN_VERSION is required}"
: "${RELEASE_ENDPOINT:?upload-blockeraai/publish: RELEASE_ENDPOINT is required}"
: "${BLOCKERAAI_PRODUCT_ID:?upload-blockeraai/publish: BLOCKERAAI_PRODUCT_ID is required}"
: "${RELEASE_META_KEY:?upload-blockeraai/publish: RELEASE_META_KEY is required}"
: "${RELEASE_ACTION:?upload-blockeraai/publish: RELEASE_ACTION is required}"
: "${BLOCKERABOT_API_KEY:?upload-blockeraai/publish: BLOCKERABOT_API_KEY is required}"
: "${GH_TOKEN:?upload-blockeraai/publish: GH_TOKEN is required}"

ZIP_NAME="${BLOCKERA_UPLOAD_BLOCKERAAI_ZIP:-blockera-pro.zip}"
FILENAME_FIELD="${BLOCKERA_UPLOAD_BLOCKERAAI_FILENAME_FIELD:-./my-downloads/${ZIP_NAME}}"
CLEAN_VERSION="${PLUGIN_VERSION#v}"
FILES_MODE="${BLOCKERA_UPLOAD_BLOCKERAAI_FILES_MODE:-}"
if [[ "${FILES_MODE}" != "append" && "${FILES_MODE}" != "replace" ]]; then
	if [[ "${CLEAN_VERSION}" == *-* ]]; then
		FILES_MODE="append"
	else
		FILES_MODE="replace"
	fi
fi

cleanup() {
	rm -f "${ZIP_NAME}"
}
trap cleanup EXIT

echo "upload-blockeraai/publish: download ${PLUGIN_URL} → ${ZIP_NAME}"
curl -fsSL \
	-H "Accept: application/octet-stream" \
	-H "Authorization: Bearer ${GH_TOKEN}" \
	-o "${ZIP_NAME}" \
	"${PLUGIN_URL}"

if [[ ! -s "${ZIP_NAME}" ]]; then
	echo "upload-blockeraai/publish: downloaded zip is empty: ${ZIP_NAME}" >&2
	exit 1
fi

echo "upload-blockeraai/publish: POST ${RELEASE_ENDPOINT} (product=${BLOCKERAAI_PRODUCT_ID} version=${CLEAN_VERSION} files_mode=${FILES_MODE})"
curl -fsS -X POST "${RELEASE_ENDPOINT}" \
	-H "Content-Type: multipart/form-data" \
	-F "product_id=${BLOCKERAAI_PRODUCT_ID}" \
	-F "product_version=${CLEAN_VERSION}" \
	-F "metaKey=${RELEASE_META_KEY}" \
	-F "filename=${FILENAME_FIELD}" \
	-F "action=${RELEASE_ACTION}" \
	-F "api_key=${BLOCKERABOT_API_KEY}" \
	-F "files_mode=${FILES_MODE}" \
	-F "file=@${ZIP_NAME}"

echo "upload-blockeraai/publish: done ${CLEAN_VERSION}"
