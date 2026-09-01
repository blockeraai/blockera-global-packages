#!/usr/bin/env bash
# After a consumer PR merges to master, open (or update) a pull request on the
# global-packages repo: mirror branch → GP base (master).
#
# Mirror name matches husky: <consumer-repo>/<head-branch>
# (e.g. blockera-pro/fix/foo).
#
# Required env:
#   BLOCKERA_GP_PR_HEAD_BRANCH     merged consumer head (or workflow_dispatch)
#
# Optional env:
#   BLOCKERA_GP_PR_REPO            default: blockeraai/blockera-global-packages
#   BLOCKERA_GP_PR_BASE            GP base branch (default: master)
#   BLOCKERA_GP_PR_CONSUMER_REPO   owner/repo (default: GITHUB_REPOSITORY)
#   BLOCKERA_GP_PR_HEAD_REPO       fork full name; skip when ≠ consumer repo
#   BLOCKERA_GP_PR_URL             consumer PR html URL (body link)
#   BLOCKERA_GP_PR_NUMBER          consumer PR number
#   BLOCKERA_GP_PR_TITLE           consumer PR title
#   BLOCKERA_GP_PR_SKIP_HEADS      space-separated heads to ignore
#                                  default: chore/bump-global-packages
#   BLOCKERA_GP_PR_LABEL           label on the GP PR (empty = none)
#   GH_TOKEN / BLOCKERA_GLOBAL_PACKAGES_TOKEN / GITHUB_TOKEN
set -euo pipefail

PREFIX="merge-global-packages-mirror"

log() {
	echo "${PREFIX}: $*"
}

die() {
	echo "${PREFIX}: $*" >&2
	exit 1
}

uri_encode() {
	jq -nr --arg s "$1" '$s|@uri'
}

HEAD_BRANCH="${BLOCKERA_GP_PR_HEAD_BRANCH:-}"
GP_REPO="${BLOCKERA_GP_PR_REPO:-blockeraai/blockera-global-packages}"
GP_BASE="${BLOCKERA_GP_PR_BASE:-master}"
CONSUMER_REPO="${BLOCKERA_GP_PR_CONSUMER_REPO:-${GITHUB_REPOSITORY:-}}"
HEAD_REPO="${BLOCKERA_GP_PR_HEAD_REPO:-}"
PR_URL="${BLOCKERA_GP_PR_URL:-}"
PR_NUMBER="${BLOCKERA_GP_PR_NUMBER:-}"
PR_TITLE="${BLOCKERA_GP_PR_TITLE:-}"
SKIP_HEADS="${BLOCKERA_GP_PR_SKIP_HEADS:-chore/bump-global-packages}"
PR_LABEL="${BLOCKERA_GP_PR_LABEL:-}"
export GH_TOKEN="${GH_TOKEN:-${BLOCKERA_GLOBAL_PACKAGES_TOKEN:-${GITHUB_TOKEN:-}}}"

if [[ -z "${HEAD_BRANCH}" ]]; then
	die "BLOCKERA_GP_PR_HEAD_BRANCH is required"
fi

if [[ -z "${GH_TOKEN}" ]]; then
	die "GH_TOKEN (or BLOCKERA_GLOBAL_PACKAGES_TOKEN) is required"
fi

if [[ -z "${CONSUMER_REPO}" ]]; then
	die "BLOCKERA_GP_PR_CONSUMER_REPO or GITHUB_REPOSITORY is required"
fi

if [[ -n "${HEAD_REPO}" && "${HEAD_REPO}" != "${CONSUMER_REPO}" ]]; then
	log "skip — head is fork ${HEAD_REPO}"
	exit 0
fi

case "${HEAD_BRANCH}" in
	master | main | develop | trunk)
		log "skip — head '${HEAD_BRANCH}' is a default line"
		exit 0
		;;
esac

for skip in ${SKIP_HEADS}; do
	if [[ "${HEAD_BRANCH}" == "${skip}" ]]; then
		log "skip — head '${HEAD_BRANCH}' is in BLOCKERA_GP_PR_SKIP_HEADS"
		exit 0
	fi
done

REPO_NAME="${CONSUMER_REPO#*/}"
case "${HEAD_BRANCH}" in
	"${REPO_NAME}/"*)
		MIRROR_BRANCH="${HEAD_BRANCH}"
		;;
	*)
		MIRROR_BRANCH="${REPO_NAME}/${HEAD_BRANCH}"
		;;
esac

log "consumer ${CONSUMER_REPO} head ${HEAD_BRANCH} → GP ${GP_REPO} ${MIRROR_BRANCH} into ${GP_BASE}"

MIRROR_ENC="$(uri_encode "${MIRROR_BRANCH}")"
BASE_ENC="$(uri_encode "${GP_BASE}")"

if ! gh api --silent "repos/${GP_REPO}/branches/${MIRROR_ENC}" >/dev/null 2>&1; then
	log "skip — no branch '${MIRROR_BRANCH}' on ${GP_REPO}"
	exit 0
fi

COMPARE_JSON="$(gh api "repos/${GP_REPO}/compare/${BASE_ENC}...${MIRROR_ENC}")"
AHEAD="$(echo "${COMPARE_JSON}" | jq -r '.ahead_by // 0')"
if ! [[ "${AHEAD}" =~ ^[0-9]+$ ]] || [[ "${AHEAD}" -eq 0 ]]; then
	log "skip — '${MIRROR_BRANCH}' has no commits not already on ${GP_BASE}"
	exit 0
fi

TITLE="merge: ${MIRROR_BRANCH} into ${GP_BASE}"
BODY="$(
	cat <<EOF
## Summary
- Merge global-packages mirror \`${MIRROR_BRANCH}\` into \`${GP_BASE}\` after the consumer PR landed.

## Consumer
- Repo: \`${CONSUMER_REPO}\`
- Head: \`${HEAD_BRANCH}\`
EOF
)"
if [[ -n "${PR_URL}" ]]; then
	BODY+=$'\n'"- PR: ${PR_URL}"
elif [[ -n "${PR_NUMBER}" ]]; then
	BODY+=$'\n'"- PR: ${CONSUMER_REPO}#${PR_NUMBER}"
fi
if [[ -n "${PR_TITLE}" ]]; then
	BODY+=$'\n'"- Title: ${PR_TITLE}"
fi
BODY+=$'\n\n## Test plan\n- [ ] GP CI on this PR is green\n- [ ] Mirror commits belong on '"\`${GP_BASE}\`"$'\n'

EXISTING="$(gh pr list --repo "${GP_REPO}" --head "${MIRROR_BRANCH}" --base "${GP_BASE}" --json number --jq '.[0].number // empty')"

if [[ -n "${EXISTING}" ]]; then
	gh pr edit "${EXISTING}" --repo "${GP_REPO}" --title "${TITLE}" --body "${BODY}"
	if [[ -n "${PR_LABEL}" ]]; then
		gh pr edit "${EXISTING}" --repo "${GP_REPO}" --add-label "${PR_LABEL}" || log "could not add label '${PR_LABEL}' to #${EXISTING}"
	fi
	log "updated ${GP_REPO}#${EXISTING} (${AHEAD} commit(s) ahead)"
	gh pr view "${EXISTING}" --repo "${GP_REPO}" --json url --jq .url
	exit 0
fi

CREATE_ARGS=(
	--repo "${GP_REPO}"
	--base "${GP_BASE}"
	--head "${MIRROR_BRANCH}"
	--title "${TITLE}"
	--body "${BODY}"
)
if [[ -n "${PR_LABEL}" ]]; then
	CREATE_ARGS+=(--label "${PR_LABEL}")
fi

gh pr create "${CREATE_ARGS[@]}"
log "opened PR for ${MIRROR_BRANCH} (${AHEAD} commit(s) ahead of ${GP_BASE})"
