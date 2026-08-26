#!/usr/bin/env bash
# Publish a GitHub Release zip asset to WordPress.org SVN.
#
# Required env:
#   PLUGIN_URL or BLOCKERA_UPLOAD_ASSET_URL   browser_download_url of the release asset
#   VERSION          stable version / tag name (release name)
#   SVN_USERNAME
#   SVN_PASSWORD
#
# Layout (consumer knob):
#   BLOCKERA_UPLOAD_SVN_LAYOUT   plugin | theme  (default: plugin)
#     plugin — checkout trunk, replace contents, commit, copy to tags/, update Stable tag
#     theme  — svn import the unzipped tree to {repo}/{version}/ (no trunk/tags)
#
# Optional env:
#   BLOCKERA_UPLOAD_SVN_REPO_URL            SVN root (preferred)
#   BLOCKERA_UPLOAD_PLUGIN_REPO_URL         alias for SVN root (legacy)
#   PLUGIN_REPO_URL                         alias for SVN root (legacy)
#   BLOCKERA_UPLOAD_ZIP_NAME                default: blockera.zip
#   BLOCKERA_UPLOAD_STABLE_TAG_PLACEHOLDER  plugin only; default: Stable tag: V\.V\.V
#   BLOCKERA_UPLOAD_STABLE_VERSION_REGEX    plugin only; default: [0-9]\+\.[0-9]\+\.[0-9]\+\s*
#   BLOCKERA_UPLOAD_TRUNK_DIR               plugin only; default: ./trunk
#   BLOCKERA_UPLOAD_EXTRACT_DIR             theme only; default: ./.svn-upload-extract
#   BLOCKERA_UPLOAD_UNWRAP_SINGLE_DIR       true|false (theme default: true, plugin default: false)
#   BLOCKERA_UPLOAD_SKIP_APT                true|false (default: false)
#   BLOCKERA_UPLOAD_SVN_BIN                 default: svn
#   BLOCKERA_UPLOAD_CURL_BIN                default: curl
set -euo pipefail

ASSET_URL="${BLOCKERA_UPLOAD_ASSET_URL:-${PLUGIN_URL:-}}"
VERSION="${VERSION:-}"
SVN_USERNAME="${SVN_USERNAME:-}"
SVN_PASSWORD="${SVN_PASSWORD:-}"
LAYOUT="${BLOCKERA_UPLOAD_SVN_LAYOUT:-plugin}"
SVN_BIN="${BLOCKERA_UPLOAD_SVN_BIN:-svn}"
CURL_BIN="${BLOCKERA_UPLOAD_CURL_BIN:-curl}"

if [[ -z "${ASSET_URL}" || -z "${VERSION}" ]]; then
	echo "upload-release/publish: PLUGIN_URL (or BLOCKERA_UPLOAD_ASSET_URL) and VERSION are required" >&2
	exit 1
fi
if [[ -z "${SVN_USERNAME}" || -z "${SVN_PASSWORD}" ]]; then
	echo "upload-release/publish: SVN_USERNAME and SVN_PASSWORD are required" >&2
	exit 1
fi
if [[ "${LAYOUT}" != "plugin" && "${LAYOUT}" != "theme" ]]; then
	echo "upload-release/publish: BLOCKERA_UPLOAD_SVN_LAYOUT must be plugin or theme" >&2
	exit 1
fi

REPO_URL="${BLOCKERA_UPLOAD_SVN_REPO_URL:-${BLOCKERA_UPLOAD_PLUGIN_REPO_URL:-${PLUGIN_REPO_URL:-}}}"
if [[ -z "${REPO_URL}" ]]; then
	if [[ "${LAYOUT}" == "theme" ]]; then
		echo "upload-release/publish: BLOCKERA_UPLOAD_SVN_REPO_URL is required for theme layout" >&2
		exit 1
	fi
	REPO_URL="https://plugins.svn.wordpress.org/blockera"
fi

ZIP_NAME="${BLOCKERA_UPLOAD_ZIP_NAME:-blockera.zip}"
STABLE_TAG_PLACEHOLDER="${BLOCKERA_UPLOAD_STABLE_TAG_PLACEHOLDER:-Stable tag: V\\.V\\.V}"
STABLE_VERSION_REGEX="${BLOCKERA_UPLOAD_STABLE_VERSION_REGEX:-[0-9]\\+\\.[0-9]\\+\\.[0-9]\\+\\s*}"
TRUNK_DIR="${BLOCKERA_UPLOAD_TRUNK_DIR:-./trunk}"
EXTRACT_DIR="${BLOCKERA_UPLOAD_EXTRACT_DIR:-./.svn-upload-extract}"
SKIP_APT="${BLOCKERA_UPLOAD_SKIP_APT:-false}"

if [[ -n "${BLOCKERA_UPLOAD_UNWRAP_SINGLE_DIR:-}" ]]; then
	UNWRAP_SINGLE_DIR="${BLOCKERA_UPLOAD_UNWRAP_SINGLE_DIR}"
elif [[ "${LAYOUT}" == "theme" ]]; then
	UNWRAP_SINGLE_DIR="true"
else
	UNWRAP_SINGLE_DIR="false"
fi

svn_auth() {
	"${SVN_BIN}" "$@" \
		--no-auth-cache --non-interactive \
		--username "${SVN_USERNAME}" \
		--password "${SVN_PASSWORD}"
}

replace_in_file() {
	local file="$1"
	local expression="$2"
	sed -i.bak "${expression}" "${file}"
	rm -f "${file}.bak"
}

unwrap_single_dir() {
	local dest="$1"
	local -a entries=()
	local item

	while IFS= read -r -d '' item; do
		entries+=("${item}")
	done < <(find "${dest}" -mindepth 1 -maxdepth 1 -print0)

	if [[ ${#entries[@]} -ne 1 || ! -d "${entries[0]}" ]]; then
		return 0
	fi

	local inner="${entries[0]}"
	(
		shopt -s dotglob nullglob
		mv "${inner}"/* "${dest}/"
	)
	rmdir "${inner}"
}

download_and_unzip() {
	local dest="$1"

	echo "upload-release/publish: download → ${ZIP_NAME}"
	"${CURL_BIN}" -L -o "${ZIP_NAME}" "${ASSET_URL}"
	unzip -q "${ZIP_NAME}" -d "${dest}"
	rm -f "${ZIP_NAME}"

	if [[ "${UNWRAP_SINGLE_DIR}" == "true" ]]; then
		unwrap_single_dir "${dest}"
	fi
}

publish_plugin() {
	echo "upload-release/publish: svn checkout ${REPO_URL}/trunk"
	svn_auth checkout "${REPO_URL}/trunk" "${TRUNK_DIR}"

	echo "upload-release/publish: clearing ${TRUNK_DIR} (keep .svn)"
	(
		cd "${TRUNK_DIR}"
		find . -maxdepth 1 -not -name ".svn" -not -name "." -not -name ".." -exec rm -rf {} +
	)

	download_and_unzip "${TRUNK_DIR}"

	echo "upload-release/publish: replace stable-tag placeholder → ${VERSION}"
	replace_in_file "${TRUNK_DIR}/readme.txt" "s/${STABLE_TAG_PLACEHOLDER}/Stable tag: ${VERSION}/g"

	echo "upload-release/publish: svn commit trunk (version ${VERSION})"
	(
		cd "${TRUNK_DIR}"
		path=""
		while IFS= read -r path || [[ -n "${path}" ]]; do
			[[ -z "${path}" ]] && continue
			"${SVN_BIN}" add "${path}"
		done < <("${SVN_BIN}" st | awk '/^\?/ {print $2}')
		path=""
		while IFS= read -r path || [[ -n "${path}" ]]; do
			[[ -z "${path}" ]] && continue
			"${SVN_BIN}" rm "${path}"
		done < <("${SVN_BIN}" st | awk '/^!/ {print $2}')
		svn_auth commit -m "Committing version ${VERSION}"
	)

	echo "upload-release/publish: svn tag ${VERSION}"
	(
		cd "${TRUNK_DIR}"
		svn_auth copy "${REPO_URL}/trunk" "${REPO_URL}/tags/${VERSION}" \
			-m "Tagging version ${VERSION}"
	)

	echo "upload-release/publish: update Stable tag → ${VERSION}"
	(
		cd "${TRUNK_DIR}"
		replace_in_file ./readme.txt "s/Stable tag: ${STABLE_VERSION_REGEX}/Stable tag: ${VERSION}/g"
		svn_auth commit -m "Releasing version ${VERSION}"
	)
}

publish_theme() {
	local version_url="${REPO_URL%/}/${VERSION}"

	echo "upload-release/publish: ensure version ${VERSION} is absent"
	if svn_auth ls "${version_url}" >/dev/null 2>&1; then
		echo "upload-release/publish: ${version_url} already exists" >&2
		exit 1
	fi

	rm -rf "${EXTRACT_DIR}"
	mkdir -p "${EXTRACT_DIR}"
	download_and_unzip "${EXTRACT_DIR}"

	echo "upload-release/publish: svn import ${VERSION}"
	svn_auth import "${EXTRACT_DIR}" "${version_url}" \
		-m "Committing version ${VERSION}"

	rm -rf "${EXTRACT_DIR}"
}

if [[ "${SKIP_APT}" != "true" ]]; then
	echo "upload-release/publish: installing subversion"
	sudo apt-get update
	sudo apt-get install -y subversion
fi

echo "upload-release/publish: layout=${LAYOUT} repo=${REPO_URL}"

if [[ "${LAYOUT}" == "theme" ]]; then
	publish_theme
else
	publish_plugin
fi

echo "upload-release/publish: done ${VERSION}"
