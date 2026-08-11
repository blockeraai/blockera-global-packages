#!/usr/bin/env bash
# Create or update the PR Playground demo comment.
#
# Required env:
#   GITHUB_TOKEN, REPO, PR_NUMBER, demo_url, uploaded_zip_file
# Optional:
#   comment_id                 update existing comment when set
#   BLOCKERA_DEMO_COMMENT_TITLE default: # 🔗 PR Playground Demo
set -euo pipefail

TOKEN="${GITHUB_TOKEN:-${BLOCKERA_GLOBAL_PACKAGES_TOKEN:-}}"
: "${TOKEN:?GITHUB_TOKEN or BLOCKERA_GLOBAL_PACKAGES_TOKEN is required}"
: "${REPO:?REPO is required}"
: "${PR_NUMBER:?PR_NUMBER is required}"

DEMO_URL="${demo_url:-${BLOCKERA_DEMO_URL:-}}"
ZIP_URL="${uploaded_zip_file:-${BLOCKERA_DEMO_ZIP_URL:-}}"
: "${DEMO_URL:?demo_url is required}"
: "${ZIP_URL:?uploaded_zip_file is required}"

TITLE="${BLOCKERA_DEMO_COMMENT_TITLE:-# 🔗 PR Playground Demo}"
COMMENT_BODY="$(printf '%s\n\n**Branch Links**\n\n- [**🔗 Playground Demo**](%s)\n\n- [**📦 Download Zip** (Build)](%s)' "${TITLE}" "${DEMO_URL}" "${ZIP_URL}")"
COMMENT_JSON="$(jq -n --arg body "${COMMENT_BODY}" '{body: $body}')"

if [[ -z "${comment_id:-}" ]]; then
	echo "create-demo/post-comment: creating comment on PR #${PR_NUMBER}"
	curl -fsS -X POST \
		-H "Authorization: token ${TOKEN}" \
		-H "Accept: application/vnd.github.v3+json" \
		"https://api.github.com/repos/${REPO}/issues/${PR_NUMBER}/comments" \
		-d "${COMMENT_JSON}" >/dev/null
else
	echo "create-demo/post-comment: updating comment ${comment_id}"
	curl -fsS -X PATCH \
		-H "Authorization: token ${TOKEN}" \
		-H "Accept: application/vnd.github.v3+json" \
		"https://api.github.com/repos/${REPO}/issues/comments/${comment_id}" \
		-d "${COMMENT_JSON}" >/dev/null
fi
