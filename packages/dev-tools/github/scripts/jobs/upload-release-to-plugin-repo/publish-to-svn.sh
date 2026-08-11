#!/usr/bin/env bash
# Publish a GitHub Release zip asset to WordPress.org SVN (trunk + tag + stable tag).
#
# Required env:
#   PLUGIN_URL       browser_download_url of the release asset
#   VERSION          stable version / tag name (release name)
#   SVN_USERNAME
#   SVN_PASSWORD
#
# Defaults match the Blockera plugin base. Override via env:
#   BLOCKERA_UPLOAD_PLUGIN_REPO_URL     default: https://plugins.svn.wordpress.org/blockera
#   BLOCKERA_UPLOAD_ZIP_NAME            default: blockera.zip
#   BLOCKERA_UPLOAD_STABLE_TAG_PLACEHOLDER  default: Stable tag: V\.V\.V
#   BLOCKERA_UPLOAD_STABLE_VERSION_REGEX    default: [0-9]\+\.[0-9]\+\.[0-9]\+\s*
#   BLOCKERA_UPLOAD_TRUNK_DIR           default: ./trunk
#   BLOCKERA_UPLOAD_SKIP_APT            true|false (default: false)
set -euo pipefail

PLUGIN_URL="${PLUGIN_URL:-}"
VERSION="${VERSION:-}"
SVN_USERNAME="${SVN_USERNAME:-}"
SVN_PASSWORD="${SVN_PASSWORD:-}"

if [[ -z "${PLUGIN_URL}" || -z "${VERSION}" ]]; then
	echo "upload-release/publish: PLUGIN_URL and VERSION are required" >&2
	exit 1
fi
if [[ -z "${SVN_USERNAME}" || -z "${SVN_PASSWORD}" ]]; then
	echo "upload-release/publish: SVN_USERNAME and SVN_PASSWORD are required" >&2
	exit 1
fi

PLUGIN_REPO_URL="${BLOCKERA_UPLOAD_PLUGIN_REPO_URL:-${PLUGIN_REPO_URL:-https://plugins.svn.wordpress.org/blockera}}"
ZIP_NAME="${BLOCKERA_UPLOAD_ZIP_NAME:-blockera.zip}"
STABLE_TAG_PLACEHOLDER="${BLOCKERA_UPLOAD_STABLE_TAG_PLACEHOLDER:-Stable tag: V\\.V\\.V}"
STABLE_VERSION_REGEX="${BLOCKERA_UPLOAD_STABLE_VERSION_REGEX:-[0-9]\\+\\.[0-9]\\+\\.[0-9]\\+\\s*}"
TRUNK_DIR="${BLOCKERA_UPLOAD_TRUNK_DIR:-./trunk}"
SKIP_APT="${BLOCKERA_UPLOAD_SKIP_APT:-false}"

if [[ "${SKIP_APT}" != "true" ]]; then
	echo "upload-release/publish: installing subversion"
	sudo apt-get update
	sudo apt-get install -y subversion
fi

echo "upload-release/publish: svn checkout ${PLUGIN_REPO_URL}/trunk"
svn checkout "${PLUGIN_REPO_URL}/trunk" "${TRUNK_DIR}" \
	--username "${SVN_USERNAME}" \
	--password "${SVN_PASSWORD}"

echo "upload-release/publish: clearing ${TRUNK_DIR} (keep .svn)"
(
	cd "${TRUNK_DIR}"
	find . -maxdepth 1 -not -name ".svn" -not -name "." -not -name ".." -exec rm -rf {} +
)

echo "upload-release/publish: download ${PLUGIN_URL} → ${ZIP_NAME}"
curl -L -o "${ZIP_NAME}" "${PLUGIN_URL}"
unzip -q "${ZIP_NAME}" -d "${TRUNK_DIR}"
rm -f "${ZIP_NAME}"

echo "upload-release/publish: replace stable-tag placeholder → ${VERSION}"
sed -i "s/${STABLE_TAG_PLACEHOLDER}/Stable tag: ${VERSION}/g" "${TRUNK_DIR}/readme.txt"

echo "upload-release/publish: svn commit trunk (version ${VERSION})"
(
	cd "${TRUNK_DIR}"
	svn st | grep '^?' | awk '{print $2}' | xargs -r svn add
	svn st | grep '^!' | awk '{print $2}' | xargs -r svn rm
	svn commit -m "Committing version ${VERSION}" \
		--no-auth-cache --non-interactive \
		--username "${SVN_USERNAME}" \
		--password "${SVN_PASSWORD}"
)

echo "upload-release/publish: svn tag ${VERSION}"
(
	cd "${TRUNK_DIR}"
	svn copy "${PLUGIN_REPO_URL}/trunk" "${PLUGIN_REPO_URL}/tags/${VERSION}" \
		-m "Tagging version ${VERSION}" \
		--no-auth-cache --non-interactive \
		--username "${SVN_USERNAME}" \
		--password "${SVN_PASSWORD}"
)

echo "upload-release/publish: update Stable tag → ${VERSION}"
(
	cd "${TRUNK_DIR}"
	sed -i "s/Stable tag: ${STABLE_VERSION_REGEX}/Stable tag: ${VERSION}/g" ./readme.txt
	svn commit -m "Releasing version ${VERSION}" \
		--no-auth-cache --non-interactive \
		--username "${SVN_USERNAME}" \
		--password "${SVN_PASSWORD}"
)

echo "upload-release/publish: done ${VERSION}"
