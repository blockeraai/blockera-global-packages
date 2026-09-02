#!/usr/bin/env bash
# After PHP unit jobs fail on the default line: open/update a hotfix PR and
# notify Slack. Intended for post-merge (push to master), not feature PRs.
#
# Required env:
#   GH_TOKEN / GITHUB_TOKEN
#   GITHUB_REPOSITORY, GITHUB_SHA, GITHUB_RUN_ID, GITHUB_SERVER_URL
#
# Optional:
#   BLOCKERA_PHP_UNIT_HOTFIX_BASE     default: master
#   BLOCKERA_PHP_UNIT_HOTFIX_PREFIX   default: hotfix/php-unit
#   BLOCKERA_PHP_UNIT_HOTFIX_GIT_NAME default: blockerabot
#   BLOCKERA_PHP_UNIT_HOTFIX_GIT_EMAIL default: blockeraai+githubbot@gmail.com
#   SLACK_BOT_TOKEN / BLOCKERA_SLACK_BOT_TOKEN
#   SLACK_CHANNEL_ID / BLOCKERA_SLACK_CHANNEL_ID
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SLACK_POST_SCRIPT="${SCRIPT_DIR}/../../lib/slack-chat-post-message.sh"

TOKEN="${BLOCKERA_GLOBAL_PACKAGES_TOKEN:-${GH_TOKEN:-${GITHUB_TOKEN:-}}}"
export GH_TOKEN="${GH_TOKEN:-${TOKEN}}"
export GH_REPO="${GITHUB_REPOSITORY:-}"

BASE_BRANCH="${BLOCKERA_PHP_UNIT_HOTFIX_BASE:-master}"
PREFIX="${BLOCKERA_PHP_UNIT_HOTFIX_PREFIX:-hotfix/php-unit}"
GIT_NAME="${BLOCKERA_PHP_UNIT_HOTFIX_GIT_NAME:-blockerabot}"
GIT_EMAIL="${BLOCKERA_PHP_UNIT_HOTFIX_GIT_EMAIL:-blockeraai+githubbot@gmail.com}"

REPO="${GITHUB_REPOSITORY:-}"
SHA="${GITHUB_SHA:-}"
RUN_ID="${GITHUB_RUN_ID:-}"
SERVER="${GITHUB_SERVER_URL:-https://github.com}"
SHORT_SHA="$(git rev-parse --short "${SHA}" 2>/dev/null || printf '%.7s' "${SHA}")"
BRANCH="${PREFIX}-${SHORT_SHA}"
RUN_URL="${SERVER}/${REPO}/actions/runs/${RUN_ID}"
COMMIT_URL="${SERVER}/${REPO}/commit/${SHA}"

PREFIX_LOG="php-unit-hotfix"

log() {
	echo "${PREFIX_LOG}: $*"
}

die() {
	echo "${PREFIX_LOG}: $*" >&2
	exit 1
}

[[ -n "${GH_TOKEN}" ]] || die "GH_TOKEN is required"
[[ -n "${REPO}" && -n "${SHA}" && -n "${RUN_ID}" ]] || die "GITHUB_REPOSITORY, GITHUB_SHA, and GITHUB_RUN_ID are required"

FAILED_JOBS="$(
	gh run view "${RUN_ID}" --repo "${REPO}" --json jobs --jq '
		[.jobs[] | select(.conclusion == "failure") | .name] | join("\n")
	' 2>/dev/null || true
)"
CANCELLED_JOBS="$(
	gh run view "${RUN_ID}" --repo "${REPO}" --json jobs --jq '
		[.jobs[] | select(.conclusion == "cancelled") | .name] | join("\n")
	' 2>/dev/null || true
)"

FAILED_SUMMARY="$(printf '%s' "${FAILED_JOBS}" | awk 'NF' | paste -sd ', ' - || true)"
if [[ -z "${FAILED_SUMMARY}" ]]; then
	FAILED_SUMMARY="one or more PHP unit checks"
fi

git config user.name "${GIT_NAME}"
git config user.email "${GIT_EMAIL}"

git fetch origin "${BASE_BRANCH}" --depth=1 || true

if git ls-remote --exit-code --heads origin "${BRANCH}" >/dev/null 2>&1; then
	log "branch origin/${BRANCH} already exists"
	git fetch origin "${BRANCH}"
	git checkout -B "${BRANCH}" "origin/${BRANCH}"
else
	git checkout -B "${BRANCH}" "${SHA}"
	export HUSKY="${HUSKY:-0}"
	HUSKY=0 git commit --allow-empty -m "ci: PHP unit failures on ${BASE_BRANCH} ${SHORT_SHA}

Failed checks: ${FAILED_SUMMARY}
Run: ${RUN_URL}
"
	git push -u origin "HEAD:${BRANCH}"
	log "pushed ${BRANCH}"
fi

PR_JSON="$(gh pr list --repo "${REPO}" --state open --head "${BRANCH}" --base "${BASE_BRANCH}" \
	--json number,title,url --jq '.[0] // {}')"
PR_NUMBER="$(printf '%s' "${PR_JSON:-{}}" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("number") or "")')"
PR_URL="$(printf '%s' "${PR_JSON:-{}}" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("url") or "")')"

if [[ -z "${PR_NUMBER}" ]]; then
	FAILED_LIST="$(printf '%s' "${FAILED_JOBS}" | awk 'NF { print "- " $0 }')"
	CANCELLED_LIST="$(printf '%s' "${CANCELLED_JOBS}" | awk 'NF { print "- " $0 }')"
	if [[ -z "${FAILED_LIST}" ]]; then
		FAILED_LIST="- (see workflow run)"
	fi
	CANCELLED_SECTION=""
	if [[ -n "${CANCELLED_LIST}" ]]; then
		CANCELLED_SECTION="$(printf '### Cancelled jobs (often fail-fast)\n%s\n' "${CANCELLED_LIST}")"
	fi

	BODY="$(
		cat <<EOF
## Summary
PHP unit checks failed on \`${BASE_BRANCH}\` after a merge. This branch is
\`${SHORT_SHA}\` plus an empty commit so a hotfix can land without pushing
straight to \`${BASE_BRANCH}\`.

- Commit: ${COMMIT_URL}
- Workflow run: ${RUN_URL}

### Failed jobs
${FAILED_LIST}

${CANCELLED_SECTION}

## Test plan
- [ ] Reproduce the failed PHP unit / coordinator wp-env jobs
- [ ] Push the fix to \`${BRANCH}\`
- [ ] Confirm this workflow is green, then merge
EOF
	)"

	PR_URL="$(
		gh pr create --repo "${REPO}" --base "${BASE_BRANCH}" --head "${BRANCH}" \
			--title "hotfix: PHP unit tests failed on ${BASE_BRANCH} (${SHORT_SHA})" \
			--body "${BODY}"
	)"
	PR_NUMBER="$(printf '%s' "${PR_URL}" | grep -oE '[0-9]+$')"
	log "opened ${PR_URL}"
else
	log "reusing PR #${PR_NUMBER} ${PR_URL}"
fi

export SLACK_TEXT="[${REPO}] PHP unit tests failed on ${BASE_BRANCH} (${SHORT_SHA}). Failed: ${FAILED_SUMMARY}. Hotfix: ${PR_URL:-none}. Run: ${RUN_URL}"

SLACK_BLOCKS_JSON="$(
	REPO="${REPO}" SHORT_SHA="${SHORT_SHA}" BASE_BRANCH="${BASE_BRANCH}" \
		FAILED_SUMMARY="${FAILED_SUMMARY}" PR_URL="${PR_URL}" PR_NUMBER="${PR_NUMBER}" \
		RUN_URL="${RUN_URL}" COMMIT_URL="${COMMIT_URL}" python3 - <<'PY'
import json
import os

repo = os.environ.get("REPO") or "unknown"
short = os.environ.get("SHORT_SHA") or ""
base = os.environ.get("BASE_BRANCH") or "master"
failed = os.environ.get("FAILED_SUMMARY") or ""
pr_url = os.environ.get("PR_URL") or ""
pr_number = os.environ.get("PR_NUMBER") or ""
run_url = os.environ.get("RUN_URL") or ""
commit_url = os.environ.get("COMMIT_URL") or ""

pr_id = f"#{pr_number}" if pr_number else "(not opened)"

fields = [
    {"type": "mrkdwn", "text": f"*Repository:*\n`{repo}`"},
    {"type": "mrkdwn", "text": f"*Branch:*\n`{base}` @ `{short}`"},
    {"type": "mrkdwn", "text": f"*Failed jobs:*\n{failed}"},
    {"type": "mrkdwn", "text": f"*Hotfix PR:*\n{pr_id}"},
]

blocks = [
    {
        "type": "header",
        "text": {
            "type": "plain_text",
            "text": "PHP unit tests failed after merge",
            "emoji": True,
        },
    },
    {
        "type": "section",
        "text": {
            "type": "mrkdwn",
            "text": (
                f"Checks failed after a merge into `{base}`. "
                "A hotfix PR is open so the fix does not go straight to master."
            ),
        },
    },
    {"type": "section", "fields": fields},
]

actions = []
if pr_url:
    actions.append(
        {
            "type": "button",
            "text": {"type": "plain_text", "text": "Open hotfix PR"},
            "url": pr_url,
        }
    )
if run_url:
    actions.append(
        {
            "type": "button",
            "text": {"type": "plain_text", "text": "View workflow run"},
            "url": run_url,
        }
    )
if commit_url:
    actions.append(
        {
            "type": "button",
            "text": {"type": "plain_text", "text": "View commit"},
            "url": commit_url,
        }
    )
if actions:
    blocks.append({"type": "actions", "elements": actions})

print(json.dumps(blocks))
PY
)"
export SLACK_BLOCKS_JSON

if [[ ! -f "${SLACK_POST_SCRIPT}" ]]; then
	log "skip Slack (missing ${SLACK_POST_SCRIPT})"
	exit 0
fi

set +e
bash "${SLACK_POST_SCRIPT}"
slack_status=$?
set -e
if [[ "${slack_status}" -ne 0 ]]; then
	log "Slack notify failed (exit ${slack_status}); continuing"
fi
