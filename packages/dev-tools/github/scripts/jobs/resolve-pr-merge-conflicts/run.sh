#!/usr/bin/env bash
# For each conflicted consumer PR:
#   1. Merge GP master into the husky mirror branch and push that merge.
#   2. Merge consumer master into the PR, pin packages/global-packages to the
#      mirror (submodule:bump), push the PR.
#
# Destination is never the triggering ref. After master moves, GitHub's
# mergeable field is often UNKNOWN — detect conflicts with git merge-tree.
# Optional BLOCKERA_CONFLICT_HEAD_BRANCH limits to that head (dispatch).
#
# Required env:
#   BLOCKERA_CONFLICT_BASE_BRANCH       consumer PR base (e.g. master)
#
# Optional env:
#   BLOCKERA_CONFLICT_HEAD_BRANCH       limit to this head (dispatch); empty = scan
#   BLOCKERA_CONFLICT_HEAD_REPO         unused for scan; skip forks via gh
#   BLOCKERA_CONFLICT_SKIP_HEADS        space-separated; default: chore/bump-global-packages
#   BLOCKERA_CONFLICT_GP_PATH           default: packages/global-packages
#   BLOCKERA_CONFLICT_GP_BASE_BRANCH    submodule base (default: master)
#   BLOCKERA_CONFLICT_GIT_NAME          default: blockerabot
#   BLOCKERA_CONFLICT_GIT_EMAIL         default: blockeraai+githubbot@gmail.com
#   BLOCKERA_CONFLICT_PUSH              true|false (default: true)
#   BLOCKERA_CONFLICT_BUMP_SCRIPT       bump-global-packages-submodule.sh
#   SLACK_BOT_TOKEN / BLOCKERA_SLACK_BOT_TOKEN
#   SLACK_CHANNEL_ID / BLOCKERA_SLACK_CHANNEL_ID
#                                   notify when a PR cannot be auto-resolved
#   BLOCKERA_GLOBAL_PACKAGES_TOKEN / GITHUB_TOKEN / GH_TOKEN
#   GITHUB_REPOSITORY                   owner/repo (Actions sets this)
set -euo pipefail

BASE_BRANCH="${BLOCKERA_CONFLICT_BASE_BRANCH:-}"
REQUESTED_HEAD="${BLOCKERA_CONFLICT_HEAD_BRANCH:-}"
SUBMODULE_PATH="${BLOCKERA_CONFLICT_GP_PATH:-packages/global-packages}"
GP_BASE_BRANCH="${BLOCKERA_CONFLICT_GP_BASE_BRANCH:-master}"
GIT_NAME="${BLOCKERA_CONFLICT_GIT_NAME:-blockerabot}"
GIT_EMAIL="${BLOCKERA_CONFLICT_GIT_EMAIL:-blockeraai+githubbot@gmail.com}"
DO_PUSH="${BLOCKERA_CONFLICT_PUSH:-true}"
BUMP_SCRIPT="${BLOCKERA_CONFLICT_BUMP_SCRIPT:-packages/global-packages/packages/dev-tools/github/scripts/bump-global-packages-submodule.sh}"
TOKEN="${BLOCKERA_GLOBAL_PACKAGES_TOKEN:-${GITHUB_TOKEN:-}}"
export GH_TOKEN="${GH_TOKEN:-${TOKEN}}"
SKIP_HEADS="${BLOCKERA_CONFLICT_SKIP_HEADS:-chore/bump-global-packages}"
THIS_REPO="${GITHUB_REPOSITORY:-}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SLACK_POST_SCRIPT="${SCRIPT_DIR}/../../lib/slack-chat-post-message.sh"

PREFIX="resolve-pr-conflicts"

log() {
	echo "${PREFIX}: $*"
}

die() {
	echo "${PREFIX}: $*" >&2
	exit 1
}

abort_merge() {
	if git rev-parse -q --verify MERGE_HEAD >/dev/null 2>&1; then
		git merge --abort || true
	fi
}

is_skip_head() {
	local head="$1"
	local skip
	# shellcheck disable=SC2086
	for skip in ${SKIP_HEADS}; do
		if [[ -n "${skip}" && "${head}" == "${skip}" ]]; then
			return 0
		fi
	done
	return 1
}

is_protected_head() {
	case "$1" in
		master | main | develop | trunk) return 0 ;;
		*) return 1 ;;
	esac
}

gh_repo_args() {
	if [[ -n "${THIS_REPO}" ]]; then
		echo --repo "${THIS_REPO}"
	fi
}

notify_unresolved() {
	local head="$1"
	local reason="$2"
	local paths="${3:-}"
	local pr_json number title url
	# shellcheck disable=SC2046
	pr_json="$(gh pr list $(gh_repo_args) --state open --head "${head}" --base "${BASE_BRANCH}" \
		--json number,title,url --jq '.[0] // {}' 2>/dev/null || true)"
	number="$(printf '%s' "${pr_json:-{}}" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("number") or "")')"
	title="$(printf '%s' "${pr_json:-{}}" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("title") or "")')"
	url="$(printf '%s' "${pr_json:-{}}" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("url") or "")')"

	local pr_label="#${number}"
	if [[ -z "${number}" ]]; then
		pr_label="${head}"
	fi
	local fallback="[${THIS_REPO:-repo}] ${pr_label}: ${title:-${head}} — cannot auto-resolve (${reason})"

	export SLACK_TEXT="${fallback}"
	SLACK_BLOCKS_JSON="$(
		PR_NUMBER="${number}" PR_TITLE="${title}" PR_URL="${url}" PR_HEAD="${head}" \
			PR_REASON="${reason}" PR_PATHS="${paths}" PR_REPO="${THIS_REPO}" \
			python3 - <<'PY'
import json
import os

repo = os.environ.get("PR_REPO") or "unknown"
number = os.environ.get("PR_NUMBER") or ""
title = os.environ.get("PR_TITLE") or os.environ.get("PR_HEAD") or ""
url = os.environ.get("PR_URL") or ""
head = os.environ.get("PR_HEAD") or ""
reason = os.environ.get("PR_REASON") or ""
paths = os.environ.get("PR_PATHS") or ""
pr_id = f"#{number}" if number else head

fields = [
    {"type": "mrkdwn", "text": f"*Repository:*\n`{repo}`"},
    {"type": "mrkdwn", "text": f"*PR ID:*\n{pr_id}"},
    {"type": "mrkdwn", "text": f"*Title:*\n{title}"},
    {"type": "mrkdwn", "text": f"*Head:*\n`{head}`"},
    {"type": "mrkdwn", "text": f"*Reason:*\n{reason}"},
]
if paths:
    fields.append({"type": "mrkdwn", "text": f"*Conflicted paths:*\n`{paths}`"})

blocks = [
    {
        "type": "header",
        "text": {"type": "plain_text", "text": "PR merge conflicts need a human", "emoji": True},
    },
    {"type": "section", "fields": fields},
]
if url:
    blocks.append(
        {
            "type": "actions",
            "elements": [
                {
                    "type": "button",
                    "text": {"type": "plain_text", "text": "View Pull Request"},
                    "url": url,
                }
            ],
        }
    )
print(json.dumps(blocks))
PY
	)"
	export SLACK_BLOCKS_JSON

	if [[ ! -f "${SLACK_POST_SCRIPT}" ]]; then
		log "skip Slack (missing ${SLACK_POST_SCRIPT})"
		return 0
	fi
	set +e
	bash "${SLACK_POST_SCRIPT}"
	local slack_status=$?
	set -e
	if [[ "${slack_status}" -ne 0 ]]; then
		log "Slack notify failed (exit ${slack_status}); continuing"
	fi
}

fail_one() {
	local head="$1"
	local reason="$2"
	local paths="${3:-}"
	log "${head}: ${reason}"
	notify_unresolved "${head}" "${reason}" "${paths}"
	return 1
}

if [[ -z "${BASE_BRANCH}" ]]; then
	die "BLOCKERA_CONFLICT_BASE_BRANCH is required"
fi

if ! command -v gh >/dev/null 2>&1; then
	die "gh is required to list conflicted pull requests"
fi

if [[ -z "${GH_TOKEN}" ]]; then
	die "GH_TOKEN or BLOCKERA_GLOBAL_PACKAGES_TOKEN is required"
fi

git config user.name "${GIT_NAME}"
git config user.email "${GIT_EMAIL}"

git fetch --prune origin "+refs/heads/${BASE_BRANCH}:refs/remotes/origin/${BASE_BRANCH}" "+refs/heads/*:refs/remotes/origin/*"

if ! git rev-parse --verify --quiet "origin/${BASE_BRANCH}^{commit}" >/dev/null; then
	die "cannot resolve origin/${BASE_BRANCH}"
fi

ROOT="$(git rev-parse --show-toplevel)"
REPO_NAME="$(basename -s .git "$(git remote get-url origin 2>/dev/null || true)" 2>/dev/null || true)"
if [[ -z "${REPO_NAME}" ]]; then
	REPO_NAME="$(basename "${ROOT}")"
fi

discover_open_heads() {
	local repo_args=()
	if [[ -n "${THIS_REPO}" ]]; then
		repo_args=(--repo "${THIS_REPO}")
	fi
	gh pr list "${repo_args[@]}" --state open --base "${BASE_BRANCH}" \
		--json headRefName,isCrossRepository \
		--jq '.[] | select(.isCrossRepository == false) | .headRefName'
}

# GitHub mergeable is often UNKNOWN right after master moves. Use merge-tree.
head_has_local_conflicts() {
	local head="$1"
	if ! git rev-parse --verify --quiet "origin/${head}^{commit}" >/dev/null; then
		return 1
	fi
	if git merge-base --is-ancestor "origin/${BASE_BRANCH}" "origin/${head}"; then
		return 1
	fi
	set +e
	git merge-tree --write-tree --quiet "origin/${BASE_BRANCH}" "origin/${head}" >/dev/null 2>&1
	local status=$?
	set -e
	[[ "${status}" -eq 1 ]]
}

FILTER_HEAD=""
if [[ -n "${REQUESTED_HEAD}" ]]; then
	if is_skip_head "${REQUESTED_HEAD}"; then
		log "requested head '${REQUESTED_HEAD}' is skipped; scanning conflicted PRs"
	elif is_protected_head "${REQUESTED_HEAD}"; then
		die "refusing to merge/push onto protected line '${REQUESTED_HEAD}'"
	else
		FILTER_HEAD="${REQUESTED_HEAD}"
	fi
fi

mapfile -t CANDIDATES < <(discover_open_heads | sort -u)

TARGETS=()
for head in "${CANDIDATES[@]+"${CANDIDATES[@]}"}"; do
	[[ -z "${head}" ]] && continue
	if is_protected_head "${head}"; then
		log "skip — '${head}' is a default line"
		continue
	fi
	if is_skip_head "${head}"; then
		log "skip — '${head}' is in BLOCKERA_CONFLICT_SKIP_HEADS"
		continue
	fi
	if [[ -n "${FILTER_HEAD}" && "${head}" != "${FILTER_HEAD}" ]]; then
		continue
	fi
	if [[ -n "${FILTER_HEAD}" ]]; then
		TARGETS+=("${head}")
		continue
	fi
	if head_has_local_conflicts "${head}"; then
		TARGETS+=("${head}")
	else
		log "skip — '${head}' has no local merge conflicts with origin/${BASE_BRANCH}"
	fi
done

if [[ -n "${FILTER_HEAD}" && "${#TARGETS[@]}" -eq 0 ]]; then
	if git rev-parse --verify --quiet "origin/${FILTER_HEAD}^{commit}" >/dev/null \
		&& head_has_local_conflicts "${FILTER_HEAD}"; then
		TARGETS=("${FILTER_HEAD}")
	else
		log "skip — '${FILTER_HEAD}' has no local merge conflicts with origin/${BASE_BRANCH}"
		exit 0
	fi
fi

if [[ "${#TARGETS[@]}" -eq 0 ]]; then
	log "no same-repo PRs with local merge conflicts (base ${BASE_BRANCH})"
	exit 0
fi

log "will merge origin/${BASE_BRANCH} into: ${TARGETS[*]}"

mirror_name() {
	local head="$1"
	case "${head}" in
		"${REPO_NAME}/"*)
			printf '%s\n' "${head}"
			;;
		*)
			printf '%s\n' "${REPO_NAME}/${head}"
			;;
	esac
}

auth_submodule_origin() {
	local submodule="$1"
	if [[ -z "${TOKEN}" ]]; then
		return 0
	fi
	local raw https_path authed
	raw="$(git config -f .gitmodules --get "submodule.${SUBMODULE_PATH}.url" 2>/dev/null || true)"
	case "${raw}" in
		git@github.com:*)
			https_path="${raw#git@github.com:}"
			;;
		ssh://git@github.com/*)
			https_path="${raw#ssh://git@github.com/}"
			;;
		https://github.com/*)
			https_path="${raw#https://github.com/}"
			;;
		http://github.com/*)
			https_path="${raw#http://github.com/}"
			;;
		*)
			https_path="blockeraai/blockera-global-packages.git"
			;;
	esac
	authed="https://x-access-token:${TOKEN}@github.com/${https_path}"
	git -C "${submodule}" remote set-url origin "${authed}"
}

# 1. Merge GP master into <repo>/<pr-head> and push the merge commit.
merge_master_into_gp_mirror() {
	local HEAD_BRANCH="$1"
	local MIRROR_BRANCH="$2"
	local SUBMODULE="$3"
	local OURS_SHA="$4"

	log "${HEAD_BRANCH}: 1/2 merge origin/${GP_BASE_BRANCH} into GP ${MIRROR_BRANCH}"

	git -C "${SUBMODULE}" config user.name "${GIT_NAME}"
	git -C "${SUBMODULE}" config user.email "${GIT_EMAIL}"
	auth_submodule_origin "${SUBMODULE}"

	git -C "${SUBMODULE}" fetch --force --prune origin \
		"+refs/heads/*:refs/remotes/origin/*"

	if ! git -C "${SUBMODULE}" rev-parse --verify --quiet "origin/${GP_BASE_BRANCH}^{commit}" >/dev/null; then
		fail_one "${HEAD_BRANCH}" "cannot resolve origin/${GP_BASE_BRANCH} in submodule" || return 1
	fi

	if git -C "${SUBMODULE}" rev-parse --verify --quiet "origin/${MIRROR_BRANCH}^{commit}" >/dev/null; then
		git -C "${SUBMODULE}" checkout --force -B "${MIRROR_BRANCH}" "origin/${MIRROR_BRANCH}"
	else
		git -C "${SUBMODULE}" checkout --force -B "${MIRROR_BRANCH}" "${OURS_SHA}"
	fi

	local gp_before gp_after gp_merge_status
	gp_before="$(git -C "${SUBMODULE}" rev-parse HEAD)"

	if git -C "${SUBMODULE}" merge-base --is-ancestor "origin/${GP_BASE_BRANCH}" HEAD; then
		log "${HEAD_BRANCH}: GP ${MIRROR_BRANCH} already contains origin/${GP_BASE_BRANCH}"
	else
		set +e
		git -C "${SUBMODULE}" merge --no-edit "origin/${GP_BASE_BRANCH}"
		gp_merge_status=$?
		set -e

		if [[ "${gp_merge_status}" -ne 0 ]]; then
			if git -C "${SUBMODULE}" rev-parse -q --verify MERGE_HEAD >/dev/null 2>&1; then
				log "${HEAD_BRANCH}: GP merge conflicted; taking mirror (--ours) for leftover paths"
				local GP_UNMERGED
				mapfile -t GP_UNMERGED < <(git -C "${SUBMODULE}" diff --name-only --diff-filter=U | sort -u)
				if [[ "${#GP_UNMERGED[@]}" -eq 0 ]]; then
					git -C "${SUBMODULE}" merge --abort || true
					fail_one "${HEAD_BRANCH}" "GP merge failed with no unmerged paths" || return 1
				fi
				local path
				for path in "${GP_UNMERGED[@]}"; do
					git -C "${SUBMODULE}" checkout --ours -- "${path}"
					git -C "${SUBMODULE}" add -- "${path}"
				done
				git -C "${SUBMODULE}" commit --no-edit
			else
				fail_one "${HEAD_BRANCH}" "GP merge of origin/${GP_BASE_BRANCH} into ${MIRROR_BRANCH} failed" || return 1
			fi
		fi
	fi

	gp_after="$(git -C "${SUBMODULE}" rev-parse HEAD)"
	log "${HEAD_BRANCH}: GP ${MIRROR_BRANCH} now at ${gp_after:0:7} (was ${gp_before:0:7})"

	if [[ "${DO_PUSH}" == "true" ]]; then
		if [[ "${gp_after}" != "${gp_before}" ]] \
			|| ! git -C "${SUBMODULE}" rev-parse --verify --quiet "origin/${MIRROR_BRANCH}^{commit}" >/dev/null \
			|| [[ "$(git -C "${SUBMODULE}" rev-parse "origin/${MIRROR_BRANCH}")" != "${gp_after}" ]]; then
			log "${HEAD_BRANCH}: pushing GP ${MIRROR_BRANCH}"
			git -C "${SUBMODULE}" push origin "HEAD:${MIRROR_BRANCH}"
		else
			log "${HEAD_BRANCH}: GP ${MIRROR_BRANCH} already on origin; skip GP push"
		fi
	else
		log "${HEAD_BRANCH}: skip GP push (BLOCKERA_CONFLICT_PUSH=${DO_PUSH})"
	fi
}

# 2. Merge consumer master into the PR, submodule:bump to the mirror, push.
merge_master_into_pr_then_bump() {
	local HEAD_BRANCH="$1"
	local MIRROR_BRANCH="$2"

	log "${HEAD_BRANCH}: 2/2 merge origin/${BASE_BRANCH} into ${HEAD_BRANCH}, bump ${MIRROR_BRANCH}"

	abort_merge
	git checkout -f -B "${HEAD_BRANCH}" "origin/${HEAD_BRANCH}"
	git submodule update --init --force -- "${SUBMODULE_PATH}" || true

	if ! git merge-base --is-ancestor "origin/${BASE_BRANCH}" HEAD; then
		set +e
		git merge --no-commit --no-ff "origin/${BASE_BRANCH}"
		local merge_status=$?
		set -e

		if [[ "${merge_status}" -ne 0 ]]; then
			if ! git rev-parse -q --verify MERGE_HEAD >/dev/null 2>&1; then
				fail_one "${HEAD_BRANCH}" "git merge failed without starting a merge (exit ${merge_status})" || return 1
			fi

			local UNMERGED
			mapfile -t UNMERGED < <(git diff --name-only --diff-filter=U | sort -u)
			if [[ "${#UNMERGED[@]}" -eq 0 ]]; then
				abort_merge
				fail_one "${HEAD_BRANCH}" "merge failed but no unmerged paths" || return 1
			fi
			log "${HEAD_BRANCH} conflicted paths: ${UNMERGED[*]}"
			if [[ "${#UNMERGED[@]}" -ne 1 || "${UNMERGED[0]}" != "${SUBMODULE_PATH}" ]]; then
				abort_merge
				fail_one "${HEAD_BRANCH}" "cannot auto-resolve; only a sole ${SUBMODULE_PATH} gitlink conflict is handled" "${UNMERGED[*]}" || return 1
			fi
		fi
	else
		log "${HEAD_BRANCH}: origin/${BASE_BRANCH} already contained; bump only"
	fi

	export CI="${CI:-true}"
	export BLOCKERA_CHANGELOG_FOLD_ON_BUMP="${BLOCKERA_CHANGELOG_FOLD_ON_BUMP:-0}"

	if [[ ! -f "${BUMP_SCRIPT}" ]]; then
		abort_merge
		fail_one "${HEAD_BRANCH}" "missing bump script ${BUMP_SCRIPT}" || return 1
	fi

	chmod +x "${BUMP_SCRIPT}"
	log "${HEAD_BRANCH}: submodule:bump ${MIRROR_BRANCH}"
	bash "${BUMP_SCRIPT}" "${MIRROR_BRANCH}" "${ROOT}"

	git add -- "${SUBMODULE_PATH}"

	local remaining
	remaining="$(git diff --name-only --diff-filter=U || true)"
	if [[ -n "${remaining}" ]]; then
		abort_merge
		fail_one "${HEAD_BRANCH}" "unmerged paths remain after gitlink bump" "${remaining}" || return 1
	fi

	if git rev-parse -q --verify MERGE_HEAD >/dev/null 2>&1; then
		git commit --no-edit -m "merge: ${BASE_BRANCH} into ${HEAD_BRANCH} (pin ${SUBMODULE_PATH} to ${MIRROR_BRANCH})"
	elif ! git diff --cached --quiet -- "${SUBMODULE_PATH}"; then
		git commit -m "submodule: update global-packages (${MIRROR_BRANCH})"
	else
		log "${HEAD_BRANCH}: nothing to commit after bump"
	fi

	if [[ "${DO_PUSH}" == "true" ]]; then
		if [[ "$(git rev-parse HEAD)" != "$(git rev-parse "origin/${HEAD_BRANCH}")" ]]; then
			log "${HEAD_BRANCH}: pushing ${HEAD_BRANCH}"
			git push origin "HEAD:${HEAD_BRANCH}"
		else
			log "${HEAD_BRANCH}: already on origin; skip parent push"
		fi
	else
		log "${HEAD_BRANCH}: skip parent push (BLOCKERA_CONFLICT_PUSH=${DO_PUSH})"
	fi
}

resolve_one() {
	local HEAD_BRANCH="$1"

	if ! git ls-remote --exit-code origin "refs/heads/${HEAD_BRANCH}" >/dev/null 2>&1; then
		log "skip ${HEAD_BRANCH} — origin branch does not exist"
		return 3
	fi

	git fetch origin "+refs/heads/${HEAD_BRANCH}:refs/remotes/origin/${HEAD_BRANCH}"
	abort_merge
	git checkout -B "${HEAD_BRANCH}" "origin/${HEAD_BRANCH}"

	local SUBMODULE="${ROOT}/${SUBMODULE_PATH}"
	if [[ ! -e "${SUBMODULE}/.git" ]]; then
		git submodule update --init --force -- "${SUBMODULE_PATH}" || true
	fi
	if [[ ! -e "${SUBMODULE}/.git" ]]; then
		fail_one "${HEAD_BRANCH}" "submodule missing at ${SUBMODULE_PATH}" "${SUBMODULE_PATH}" || return 1
	fi

	local OURS_SHA
	OURS_SHA="$(git rev-parse "HEAD:${SUBMODULE_PATH}" 2>/dev/null || true)"
	if [[ -z "${OURS_SHA}" ]]; then
		fail_one "${HEAD_BRANCH}" "could not read gitlink at ${SUBMODULE_PATH}" "${SUBMODULE_PATH}" || return 1
	fi

	local MIRROR_BRANCH
	MIRROR_BRANCH="$(mirror_name "${HEAD_BRANCH}")"
	log "${HEAD_BRANCH}: GP mirror ${MIRROR_BRANCH} (pin ${OURS_SHA:0:7})"

	merge_master_into_gp_mirror "${HEAD_BRANCH}" "${MIRROR_BRANCH}" "${SUBMODULE}" "${OURS_SHA}" || return 1
	merge_master_into_pr_then_bump "${HEAD_BRANCH}" "${MIRROR_BRANCH}" || return 1

	log "${HEAD_BRANCH}: done"
	return 0
}

failed=0
resolved=0
for head in "${TARGETS[@]}"; do
	set +e
	resolve_one "${head}"
	status=$?
	set -e
	case "${status}" in
		0) resolved=$((resolved + 1)) ;;
		3) ;;
		*) failed=$((failed + 1)) ;;
	esac
done

log "finished: resolved=${resolved} failed=${failed}"
if [[ "${failed}" -gt 0 ]]; then
	exit 1
fi
