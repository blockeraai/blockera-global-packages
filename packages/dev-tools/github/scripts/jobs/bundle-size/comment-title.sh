#!/usr/bin/env bash
# Title the compressed-size PR comment and keep it under GitHub's 65536-character
# limit. Prefer the materialized report from this run (the size action may fail
# to post when the raw table is too long).
#
# Env (optional):
#   BLOCKERA_BUNDLE_SIZE_COMMENT_TITLE   default: # 📦 Bundle Size Report
#   BLOCKERA_BUNDLE_SIZE_COMMENT_MARKER  default: compressed-size-action
#   BLOCKERA_BUNDLE_SIZE_PR_NUMBER       override PR number
#   BLOCKERA_BUNDLE_SIZE_MAX_COMMENT_CHARS  default: 64000
#   BLOCKERA_BUNDLE_SIZE_COMMENT_BODY_FILE  full markdown from this run
#   GITHUB_TOKEN or BLOCKERA_GLOBAL_PACKAGES_TOKEN  required for API
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../../lib/retry.sh
RETRY_SH="${SCRIPT_DIR}/../../lib/retry.sh"
TRUNCATE_JS="${SCRIPT_DIR}/truncate-comment-body.js"

gh_api() {
	bash "${RETRY_SH}" --label "gh api" --max 5 --delay 15 -- gh api "$@"
}

TITLE="${BLOCKERA_BUNDLE_SIZE_COMMENT_TITLE:-# 📦 Bundle Size Report}"
MARKER="${BLOCKERA_BUNDLE_SIZE_COMMENT_MARKER:-compressed-size-action}"
MAX_CHARS="${BLOCKERA_BUNDLE_SIZE_MAX_COMMENT_CHARS:-64000}"
BODY_SRC="${BLOCKERA_BUNDLE_SIZE_COMMENT_BODY_FILE:-}"
TOKEN="${GITHUB_TOKEN:-${BLOCKERA_GLOBAL_PACKAGES_TOKEN:-}}"

if [[ -z "${TOKEN}" ]]; then
	echo "bundle-size/comment-title: missing GITHUB_TOKEN / BLOCKERA_GLOBAL_PACKAGES_TOKEN" >&2
	exit 1
fi
export GH_TOKEN="${TOKEN}"

if [[ -z "${GITHUB_REPOSITORY:-}" ]]; then
	echo "bundle-size/comment-title: GITHUB_REPOSITORY is unset; skipping" >&2
	exit 0
fi

PR_NUMBER="${BLOCKERA_BUNDLE_SIZE_PR_NUMBER:-}"
if [[ -z "${PR_NUMBER}" && -n "${GITHUB_EVENT_PATH:-}" && -f "${GITHUB_EVENT_PATH}" ]]; then
	PR_NUMBER="$(jq -r '.pull_request.number // .issue.number // empty' "${GITHUB_EVENT_PATH}")"
fi

if [[ -z "${PR_NUMBER}" || "${PR_NUMBER}" == "null" ]]; then
	echo "bundle-size/comment-title: no PR number; skipping"
	exit 0
fi

echo "bundle-size/comment-title: looking for comment marker '${MARKER}' on PR #${PR_NUMBER}"

# Do not retry list/get: 404 here is not a flake (missing comment / no access).
IDS_FILE="$(mktemp)"
BODY_FILE="$(mktemp)"
NEW_BODY_FILE="$(mktemp)"
PAYLOAD_FILE="$(mktemp)"
cleanup() {
	rm -f "${IDS_FILE}" "${BODY_FILE}" "${NEW_BODY_FILE}" "${PAYLOAD_FILE}"
}
trap cleanup EXIT

if ! gh api --paginate "repos/${GITHUB_REPOSITORY}/issues/${PR_NUMBER}/comments" \
	--jq ".[] | select(.body != null and (.body | contains(\"${MARKER}\"))) | .id" \
	>"${IDS_FILE}"; then
	echo "bundle-size/comment-title: could not list PR comments; skipping"
	exit 0
fi

mapfile -t COMMENT_IDS < "${IDS_FILE}"
COMMENT_ID=""
if [[ "${#COMMENT_IDS[@]}" -gt 0 && -n "${COMMENT_IDS[0]:-}" ]]; then
	COMMENT_ID="${COMMENT_IDS[0]}"
fi

if [[ -n "${BODY_SRC}" && -s "${BODY_SRC}" ]]; then
	cp "${BODY_SRC}" "${BODY_FILE}"
	echo "bundle-size/comment-title: using materialized body ($(wc -c <"${BODY_FILE}" | tr -d ' ') chars)"
elif [[ -n "${COMMENT_ID}" ]]; then
	if ! gh api "repos/${GITHUB_REPOSITORY}/issues/comments/${COMMENT_ID}" --jq .body >"${BODY_FILE}"; then
		echo "bundle-size/comment-title: could not fetch comment ${COMMENT_ID}; skipping"
		exit 0
	fi
else
	echo "bundle-size/comment-title: no size report body; skipping"
	exit 0
fi

node "${TRUNCATE_JS}" "${TITLE}" "${MAX_CHARS}" <"${BODY_FILE}" >"${NEW_BODY_FILE}"

post_payload() {
	local method="$1"
	local url="$2"
	jq -n --rawfile body "${NEW_BODY_FILE}" '{body: $body}' >"${PAYLOAD_FILE}"
	gh_api --method "${method}" "${url}" --input "${PAYLOAD_FILE}" >/dev/null
}

if [[ -n "${COMMENT_ID}" ]]; then
	if cmp -s "${BODY_FILE}" "${NEW_BODY_FILE}"; then
		echo "bundle-size/comment-title: comment ${COMMENT_ID} already up to date"
		exit 0
	fi
	if post_payload PATCH "repos/${GITHUB_REPOSITORY}/issues/comments/${COMMENT_ID}"; then
		echo "bundle-size/comment-title: updated comment ${COMMENT_ID}"
	else
		echo "bundle-size/comment-title: could not update comment ${COMMENT_ID}; skipping"
	fi
	exit 0
fi

if post_payload POST "repos/${GITHUB_REPOSITORY}/issues/${PR_NUMBER}/comments"; then
	echo "bundle-size/comment-title: posted truncated comment on PR #${PR_NUMBER}"
else
	echo "bundle-size/comment-title: could not post comment; skipping"
fi
