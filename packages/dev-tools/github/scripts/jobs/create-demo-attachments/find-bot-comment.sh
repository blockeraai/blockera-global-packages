#!/usr/bin/env bash
# Find an existing bot PR comment that contains the demo marker.
#
# Required env:
#   GITHUB_TOKEN (or BLOCKERABOT token), REPO
#   PR_NUMBER or GITHUB_EVENT_PATH
# Optional:
#   BLOCKERA_DEMO_BOT_LOGIN      default: blockerabot
#   BLOCKERA_DEMO_COMMENT_MARKER default: Branch Links
set -euo pipefail

TOKEN="${GITHUB_TOKEN:-${BLOCKERA_GLOBAL_PACKAGES_TOKEN:-}}"
: "${TOKEN:?GITHUB_TOKEN or BLOCKERA_GLOBAL_PACKAGES_TOKEN is required}"
: "${REPO:?REPO is required}"

BOT_LOGIN="${BLOCKERA_DEMO_BOT_LOGIN:-blockerabot}"
MARKER="${BLOCKERA_DEMO_COMMENT_MARKER:-Branch Links}"

PR_NUMBER="${PR_NUMBER:-}"
if [[ -z "${PR_NUMBER}" && -n "${GITHUB_EVENT_PATH:-}" && -f "${GITHUB_EVENT_PATH}" ]]; then
	PR_NUMBER="$(jq -r '.pull_request.number // empty' "${GITHUB_EVENT_PATH}")"
fi
: "${PR_NUMBER:?PR_NUMBER is required}"

COMMENTS_URL="https://api.github.com/repos/${REPO}/issues/${PR_NUMBER}/comments"
COMMENT_ID="$(
	curl -fsS \
		-H "Authorization: token ${TOKEN}" \
		-H "Accept: application/vnd.github.v3+json" \
		"${COMMENTS_URL}" \
		| jq -r --arg login "${BOT_LOGIN}" --arg marker "${MARKER}" \
			'.[] | select(.user.login == $login and (.body | test($marker; "i"))) | .id' \
		| head -n 1
)"

if [[ -n "${COMMENT_ID}" && "${COMMENT_ID}" != "null" ]]; then
	echo "create-demo/find-bot-comment: found comment ${COMMENT_ID}"
	if [[ -n "${GITHUB_ENV:-}" ]]; then
		echo "comment_id=${COMMENT_ID}" >>"${GITHUB_ENV}"
	fi
	echo "comment_id=${COMMENT_ID}"
else
	echo "create-demo/find-bot-comment: no existing comment"
fi
