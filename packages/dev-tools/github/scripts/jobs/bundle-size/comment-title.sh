#!/usr/bin/env bash
# Prepend a custom H1 to the compressed-size-action PR comment.
#
# Env (optional):
#   BLOCKERA_BUNDLE_SIZE_COMMENT_TITLE   default: # 📦 Bundle Size Report
#   BLOCKERA_BUNDLE_SIZE_COMMENT_MARKER  default: compressed-size-action
#   BLOCKERA_BUNDLE_SIZE_PR_NUMBER       override PR number
#   GITHUB_TOKEN or BLOCKERA_GLOBAL_PACKAGES_TOKEN  required for API
set -euo pipefail

TITLE="${BLOCKERA_BUNDLE_SIZE_COMMENT_TITLE:-# 📦 Bundle Size Report}"
MARKER="${BLOCKERA_BUNDLE_SIZE_COMMENT_MARKER:-compressed-size-action}"
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

mapfile -t COMMENT_IDS < <(
	gh api --paginate "repos/${GITHUB_REPOSITORY}/issues/${PR_NUMBER}/comments" \
		--jq ".[] | select(.body != null and (.body | contains(\"${MARKER}\"))) | .id"
)

if [[ "${#COMMENT_IDS[@]}" -eq 0 ]]; then
	echo "bundle-size/comment-title: compressed size comment not found; skipping"
	exit 0
fi

COMMENT_ID="${COMMENT_IDS[0]}"
BODY="$(gh api "repos/${GITHUB_REPOSITORY}/issues/comments/${COMMENT_ID}" --jq .body)"

if [[ "${BODY}" == "${TITLE}"* ]]; then
	echo "bundle-size/comment-title: title already present"
	exit 0
fi

NEW_BODY="$(printf '%s\n\n%s' "${TITLE}" "${BODY}")"
jq -n --arg body "${NEW_BODY}" '{body: $body}' \
	| gh api --method PATCH "repos/${GITHUB_REPOSITORY}/issues/comments/${COMMENT_ID}" \
		--input - >/dev/null

echo "bundle-size/comment-title: updated comment ${COMMENT_ID}"
