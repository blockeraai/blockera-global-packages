#!/usr/bin/env bash
# Merge the PR base into the head branch when GitHub reports conflicts.
# Auto-resolve only when the sole conflict is the global-packages gitlink:
# merge the submodule base into the GP mirror branch (always keep mirror),
# push that merge, bump the gitlink, finish the parent merge, push the PR.
#
# Required env:
#   BLOCKERA_CONFLICT_BASE_BRANCH       consumer PR base (e.g. master)
#   BLOCKERA_CONFLICT_HEAD_BRANCH       consumer PR head
#
# Optional env:
#   BLOCKERA_CONFLICT_HEAD_REPO         fork full name; skip when ≠ this repo
#   BLOCKERA_CONFLICT_GP_PATH           default: packages/global-packages
#   BLOCKERA_CONFLICT_GP_BASE_BRANCH    submodule base (default: master)
#   BLOCKERA_CONFLICT_GIT_NAME          default: blockerabot
#   BLOCKERA_CONFLICT_GIT_EMAIL         default: blockeraai+githubbot@gmail.com
#   BLOCKERA_CONFLICT_PUSH              true|false (default: true)
#   BLOCKERA_CONFLICT_BUMP_SCRIPT       bump-global-packages-submodule.sh
#   BLOCKERA_GLOBAL_PACKAGES_TOKEN / GITHUB_TOKEN
#   GITHUB_REPOSITORY                   owner/repo (Actions sets this)
set -euo pipefail

BASE_BRANCH="${BLOCKERA_CONFLICT_BASE_BRANCH:-}"
HEAD_BRANCH="${BLOCKERA_CONFLICT_HEAD_BRANCH:-}"
HEAD_REPO="${BLOCKERA_CONFLICT_HEAD_REPO:-}"
THIS_REPO="${GITHUB_REPOSITORY:-}"
SUBMODULE_PATH="${BLOCKERA_CONFLICT_GP_PATH:-packages/global-packages}"
GP_BASE_BRANCH="${BLOCKERA_CONFLICT_GP_BASE_BRANCH:-master}"
GIT_NAME="${BLOCKERA_CONFLICT_GIT_NAME:-blockerabot}"
GIT_EMAIL="${BLOCKERA_CONFLICT_GIT_EMAIL:-blockeraai+githubbot@gmail.com}"
DO_PUSH="${BLOCKERA_CONFLICT_PUSH:-true}"
BUMP_SCRIPT="${BLOCKERA_CONFLICT_BUMP_SCRIPT:-packages/global-packages/packages/dev-tools/github/scripts/bump-global-packages-submodule.sh}"
TOKEN="${BLOCKERA_GLOBAL_PACKAGES_TOKEN:-${GITHUB_TOKEN:-}}"

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

if [[ -z "${BASE_BRANCH}" || -z "${HEAD_BRANCH}" ]]; then
	die "BLOCKERA_CONFLICT_BASE_BRANCH and BLOCKERA_CONFLICT_HEAD_BRANCH are required"
fi

case "${HEAD_BRANCH}" in
	master | main | develop | trunk)
		die "refusing to merge/push onto protected line '${HEAD_BRANCH}'"
		;;
esac

if [[ -n "${HEAD_REPO}" && -n "${THIS_REPO}" && "${HEAD_REPO}" != "${THIS_REPO}" ]]; then
	log "skip — head is fork ${HEAD_REPO} (cannot push)"
	exit 0
fi

git config user.name "${GIT_NAME}"
git config user.email "${GIT_EMAIL}"

git fetch --prune origin \
	"+refs/heads/${BASE_BRANCH}:refs/remotes/origin/${BASE_BRANCH}" \
	"+refs/heads/${HEAD_BRANCH}:refs/remotes/origin/${HEAD_BRANCH}"

if ! git rev-parse --verify --quiet "origin/${BASE_BRANCH}^{commit}" >/dev/null; then
	die "cannot resolve origin/${BASE_BRANCH}"
fi

if git merge-base --is-ancestor "origin/${BASE_BRANCH}" HEAD; then
	log "origin/${BASE_BRANCH} already contained in HEAD; nothing to do"
	exit 0
fi

set +e
git merge --no-commit --no-ff "origin/${BASE_BRANCH}"
merge_status=$?
set -e

if [[ "${merge_status}" -eq 0 ]]; then
	abort_merge
	log "merge of origin/${BASE_BRANCH} is clean; leaving it for GitHub"
	exit 0
fi

if ! git rev-parse -q --verify MERGE_HEAD >/dev/null 2>&1; then
	die "git merge failed without starting a merge (exit ${merge_status})"
fi

mapfile -t UNMERGED < <(git diff --name-only --diff-filter=U | sort -u)

if [[ "${#UNMERGED[@]}" -eq 0 ]]; then
	abort_merge
	die "merge failed but no unmerged paths"
fi

log "conflicted paths: ${UNMERGED[*]}"

if [[ "${#UNMERGED[@]}" -ne 1 || "${UNMERGED[0]}" != "${SUBMODULE_PATH}" ]]; then
	abort_merge
	die "cannot auto-resolve; only a sole ${SUBMODULE_PATH} gitlink conflict is handled"
fi

OURS_SHA="$(git rev-parse ":2:${SUBMODULE_PATH}" 2>/dev/null || true)"
if [[ -z "${OURS_SHA}" ]]; then
	abort_merge
	die "could not read ours gitlink at ${SUBMODULE_PATH}"
fi

ROOT="$(git rev-parse --show-toplevel)"
SUBMODULE="${ROOT}/${SUBMODULE_PATH}"

if [[ ! -e "${SUBMODULE}/.git" ]]; then
	git submodule update --init --force -- "${SUBMODULE_PATH}" || true
fi
if [[ ! -e "${SUBMODULE}/.git" ]]; then
	abort_merge
	die "submodule missing at ${SUBMODULE_PATH}"
fi

git -C "${SUBMODULE}" config user.name "${GIT_NAME}"
git -C "${SUBMODULE}" config user.email "${GIT_EMAIL}"

if [[ -n "${TOKEN}" ]]; then
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
	git -C "${SUBMODULE}" remote set-url origin "${authed}"
fi

git -C "${SUBMODULE}" fetch --force --prune origin \
	"+refs/heads/*:refs/remotes/origin/*"

REPO_NAME="$(basename -s .git "$(git remote get-url origin 2>/dev/null || true)" 2>/dev/null || true)"
if [[ -z "${REPO_NAME}" ]]; then
	REPO_NAME="$(basename "${ROOT}")"
fi

case "${HEAD_BRANCH}" in
	"${REPO_NAME}/"*)
		MIRROR_BRANCH="${HEAD_BRANCH}"
		;;
	*)
		MIRROR_BRANCH="${REPO_NAME}/${HEAD_BRANCH}"
		;;
esac

log "GP mirror branch ${MIRROR_BRANCH} (ours gitlink ${OURS_SHA:0:7})"

if git -C "${SUBMODULE}" rev-parse --verify --quiet "origin/${MIRROR_BRANCH}^{commit}" >/dev/null; then
	git -C "${SUBMODULE}" checkout --force -B "${MIRROR_BRANCH}" "origin/${MIRROR_BRANCH}"
else
	git -C "${SUBMODULE}" checkout --force -B "${MIRROR_BRANCH}" "${OURS_SHA}"
fi

if ! git -C "${SUBMODULE}" rev-parse --verify --quiet "origin/${GP_BASE_BRANCH}^{commit}" >/dev/null; then
	abort_merge
	die "cannot resolve origin/${GP_BASE_BRANCH} in submodule"
fi

gp_before="$(git -C "${SUBMODULE}" rev-parse HEAD)"

set +e
git -C "${SUBMODULE}" merge --no-edit -X ours "origin/${GP_BASE_BRANCH}"
gp_merge_status=$?
set -e

if [[ "${gp_merge_status}" -ne 0 ]]; then
	if git -C "${SUBMODULE}" rev-parse -q --verify MERGE_HEAD >/dev/null 2>&1; then
		log "GP merge still conflicted; taking mirror (--ours) for leftover paths"
		mapfile -t GP_UNMERGED < <(git -C "${SUBMODULE}" diff --name-only --diff-filter=U | sort -u)
		if [[ "${#GP_UNMERGED[@]}" -eq 0 ]]; then
			git -C "${SUBMODULE}" merge --abort || true
			abort_merge
			die "GP merge failed with no unmerged paths"
		fi
		for path in "${GP_UNMERGED[@]}"; do
			git -C "${SUBMODULE}" checkout --ours -- "${path}"
			git -C "${SUBMODULE}" add -- "${path}"
		done
		git -C "${SUBMODULE}" commit --no-edit
	else
		abort_merge
		die "GP merge of origin/${GP_BASE_BRANCH} into ${MIRROR_BRANCH} failed"
	fi
fi

gp_after="$(git -C "${SUBMODULE}" rev-parse HEAD)"
log "GP ${MIRROR_BRANCH} now at ${gp_after:0:7} (was ${gp_before:0:7})"

if [[ "${DO_PUSH}" == "true" ]]; then
	if [[ "${gp_after}" != "${gp_before}" ]] \
		|| ! git -C "${SUBMODULE}" rev-parse --verify --quiet "origin/${MIRROR_BRANCH}^{commit}" >/dev/null \
		|| [[ "$(git -C "${SUBMODULE}" rev-parse "origin/${MIRROR_BRANCH}")" != "${gp_after}" ]]; then
		log "pushing submodule ${MIRROR_BRANCH}"
		git -C "${SUBMODULE}" push origin "HEAD:${MIRROR_BRANCH}"
	else
		log "submodule ${MIRROR_BRANCH} already on origin; skip GP push"
	fi
else
	log "skip GP push (BLOCKERA_CONFLICT_PUSH=${DO_PUSH})"
fi

export CI="${CI:-true}"
export BLOCKERA_CHANGELOG_FOLD_ON_BUMP="${BLOCKERA_CHANGELOG_FOLD_ON_BUMP:-0}"

if [[ ! -f "${BUMP_SCRIPT}" ]]; then
	abort_merge
	die "missing bump script ${BUMP_SCRIPT}"
fi

chmod +x "${BUMP_SCRIPT}"
log "bumping gitlink to ${MIRROR_BRANCH}"
bash "${BUMP_SCRIPT}" "${MIRROR_BRANCH}" "${ROOT}"

git add -- "${SUBMODULE_PATH}"

remaining="$(git diff --name-only --diff-filter=U || true)"
if [[ -n "${remaining}" ]]; then
	abort_merge
	die "unmerged paths remain after gitlink bump: ${remaining}"
fi

git commit --no-edit -m "merge: ${BASE_BRANCH} into ${HEAD_BRANCH} (resolve ${SUBMODULE_PATH} gitlink)"

if [[ "${DO_PUSH}" == "true" ]]; then
	log "pushing ${HEAD_BRANCH}"
	git push origin "HEAD:${HEAD_BRANCH}"
else
	log "skip parent push (BLOCKERA_CONFLICT_PUSH=${DO_PUSH})"
fi

log "done"
