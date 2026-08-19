#!/usr/bin/env bash
# Post or update the sticky theme-review PR comment from theme-review-action logs.
#
# Env (optional):
#   BLOCKERA_THEME_CHECK_LOGS_DIR          default: ${GITHUB_WORKSPACE}/theme-review-action/logs
#   BLOCKERA_THEME_CHECK_COMMENT_TITLE     default: # 🎨 WordPress Theme Review Report
#   BLOCKERA_THEME_CHECK_COMMENT_MARKER    default: blockera-theme-check
#   BLOCKERA_THEME_CHECK_PR_NUMBER         override PR number
#   BLOCKERA_THEME_CHECK_MAX_COMMENT_CHARS default: 64000
#   GITHUB_TOKEN or BLOCKERA_GLOBAL_PACKAGES_TOKEN  required for API
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../../lib/retry.sh
RETRY_SH="${SCRIPT_DIR}/../../lib/retry.sh"
FORMAT_JS="${SCRIPT_DIR}/format-comment-body.js"
TRUNCATE_JS="${SCRIPT_DIR}/truncate-comment-body.js"

gh_api() {
	bash "${RETRY_SH}" --label "gh api" --max 5 --delay 15 -- gh api "$@"
}

TITLE="${BLOCKERA_THEME_CHECK_COMMENT_TITLE:-# 🧱 WordPress Theme Review Report}"
MARKER="${BLOCKERA_THEME_CHECK_COMMENT_MARKER:-blockera-theme-check}"
MAX_CHARS="${BLOCKERA_THEME_CHECK_MAX_COMMENT_CHARS:-64000}"
LOGS_DIR="${BLOCKERA_THEME_CHECK_LOGS_DIR:-${GITHUB_WORKSPACE:-}/theme-review-action/logs}"
TOKEN="${GITHUB_TOKEN:-${BLOCKERA_GLOBAL_PACKAGES_TOKEN:-}}"

if [[ -z "${TOKEN}" ]]; then
	echo "theme-check/post-comment: missing GITHUB_TOKEN / BLOCKERA_GLOBAL_PACKAGES_TOKEN" >&2
	exit 1
fi
export GH_TOKEN="${TOKEN}"

if [[ -z "${GITHUB_REPOSITORY:-}" ]]; then
	echo "theme-check/post-comment: GITHUB_REPOSITORY is unset; skipping"
	exit 0
fi

PR_NUMBER="${BLOCKERA_THEME_CHECK_PR_NUMBER:-}"
if [[ -z "${PR_NUMBER}" && -n "${GITHUB_EVENT_PATH:-}" && -f "${GITHUB_EVENT_PATH}" ]]; then
	PR_NUMBER="$(jq -r '.pull_request.number // .issue.number // empty' "${GITHUB_EVENT_PATH}")"
fi

if [[ -z "${PR_NUMBER}" || "${PR_NUMBER}" == "null" ]]; then
	echo "theme-check/post-comment: no PR number; skipping"
	exit 0
fi

RUN_URL=""
if [[ -n "${GITHUB_SERVER_URL:-}" && -n "${GITHUB_REPOSITORY:-}" && -n "${GITHUB_RUN_ID:-}" ]]; then
	RUN_URL="${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}"
fi

echo "theme-check/post-comment: building report from '${LOGS_DIR}' for PR #${PR_NUMBER}"

IDS_FILE="$(mktemp)"
BODY_FILE="$(mktemp)"
NEW_BODY_FILE="$(mktemp)"
PAYLOAD_FILE="$(mktemp)"
cleanup() {
	rm -f "${IDS_FILE}" "${BODY_FILE}" "${NEW_BODY_FILE}" "${PAYLOAD_FILE}"
}
trap cleanup EXIT

node "${FORMAT_JS}" "${LOGS_DIR}" "${TITLE}" "${RUN_URL}" >"${BODY_FILE}"
node "${TRUNCATE_JS}" "${MAX_CHARS}" <"${BODY_FILE}" >"${NEW_BODY_FILE}"

if ! gh api --paginate "repos/${GITHUB_REPOSITORY}/issues/${PR_NUMBER}/comments" \
	--jq ".[] | select(.body != null and (.body | contains(\"${MARKER}\"))) | .id" \
	>"${IDS_FILE}"; then
	echo "theme-check/post-comment: could not list PR comments; skipping"
	exit 0
fi

mapfile -t COMMENT_IDS < "${IDS_FILE}"
COMMENT_ID=""
if [[ "${#COMMENT_IDS[@]}" -gt 0 && -n "${COMMENT_IDS[0]:-}" ]]; then
	COMMENT_ID="${COMMENT_IDS[0]}"
fi

post_payload() {
	local method="$1"
	local url="$2"
	jq -n --rawfile body "${NEW_BODY_FILE}" '{body: $body}' >"${PAYLOAD_FILE}"
	gh_api --method "${method}" "${url}" --input "${PAYLOAD_FILE}" >/dev/null
}

if [[ -n "${COMMENT_ID}" ]]; then
	EXISTING_FILE="$(mktemp)"
	if gh api "repos/${GITHUB_REPOSITORY}/issues/comments/${COMMENT_ID}" --jq .body >"${EXISTING_FILE}" 2>/dev/null; then
		if cmp -s "${NEW_BODY_FILE}" "${EXISTING_FILE}"; then
			echo "theme-check/post-comment: comment ${COMMENT_ID} already up to date"
			rm -f "${EXISTING_FILE}"
			exit 0
		fi
	fi
	rm -f "${EXISTING_FILE}"

	if post_payload PATCH "repos/${GITHUB_REPOSITORY}/issues/comments/${COMMENT_ID}"; then
		echo "theme-check/post-comment: updated comment ${COMMENT_ID}"
	else
		echo "theme-check/post-comment: could not update comment ${COMMENT_ID}; skipping"
	fi
	exit 0
fi

if post_payload POST "repos/${GITHUB_REPOSITORY}/issues/${PR_NUMBER}/comments"; then
	echo "theme-check/post-comment: posted comment on PR #${PR_NUMBER}"
else
	echo "theme-check/post-comment: could not post comment; skipping"
fi
