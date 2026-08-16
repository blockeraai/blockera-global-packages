#!/usr/bin/env bash
# Point packages/global-packages at a remote SHA/branch tip, stage the gitlink, and commit.
#
# Usage:
#   bump-global-packages-submodule.sh [sha|branch] [repo-root]
#
# Local (no ref arg): advance the current pin to the tip of the branch that contains it.
#   - If the pin is on master → master tip
#   - Else if exactly one remote branch contains it → that branch tip
#   - Else if multiple remote branches contain it → master tip (ambiguous)
#   - Else → error
# Explicit ref/SHA always wins. CI should pass the ref (defaults to master if omitted).
#
# Env:
#   BLOCKERA_GLOBAL_PACKAGES_TOKEN / GITHUB_TOKEN — optional HTTPS auth for private fetch
#   NO_COLOR — disable ANSI colors when set
#
# Compatible with SSH or HTTPS .gitmodules urls (CI rewrites to HTTPS + PAT).
#
# Machine-readable lines (plain, uncolored; parsed by CI helpers):
#   sha=…  short_sha=…  target_ref=…  commits=…  commit_subject=…  changed=true|false  commit=…
set -euo pipefail

EXPLICIT_REF="${1:-}"
ROOT="${2:-$(pwd)}"
SUBMODULE_PATH="packages/global-packages"
SUBMODULE="${ROOT}/${SUBMODULE_PATH}"
TOKEN="${BLOCKERA_GLOBAL_PACKAGES_TOKEN:-${GITHUB_TOKEN:-}}"
MAX_COMMITS=5
SCRIPT_NAME="bump-global-packages-submodule"

# ── colors (honor NO_COLOR / FORCE_COLOR; enable on stdout or stderr TTY) ─────
# npm often leaves stdout non-TTY while the terminal still shows the stream.
if [[ -n "${NO_COLOR:-}" ]]; then
	_USE_COLOR=0
elif [[ -n "${FORCE_COLOR:-}" || -t 1 || -t 2 ]]; then
	_USE_COLOR=1
else
	_USE_COLOR=0
fi
if [[ "${_USE_COLOR}" -eq 1 ]]; then
	C_RESET=$'\033[0m'
	C_DIM=$'\033[2m'
	C_BOLD=$'\033[1m'
	C_CYAN=$'\033[36m'
	C_GREEN=$'\033[32m'
	C_YELLOW=$'\033[33m'
	C_RED=$'\033[31m'
	C_BLUE=$'\033[34m'
else
	C_RESET= C_DIM= C_BOLD= C_CYAN= C_GREEN= C_YELLOW= C_RED= C_BLUE=
fi
unset _USE_COLOR

log_banner() {
	printf '\n%s── %s ──%s\n' "${C_BOLD}${C_CYAN}" "$1" "${C_RESET}"
}

log_step() {
	printf '%s→%s %s\n' "${C_BLUE}" "${C_RESET}" "$1"
}

log_info() {
	printf '%s•%s %s\n' "${C_DIM}" "${C_RESET}" "$1"
}

log_ok() {
	printf '%s✓%s %s\n' "${C_GREEN}" "${C_RESET}" "$1"
}

log_warn() {
	printf '%s!%s %s\n' "${C_YELLOW}" "${C_RESET}" "$1" >&2
}

log_err() {
	printf '%s✗%s %s: %s\n' "${C_RED}" "${C_RESET}" "${SCRIPT_NAME}" "$1" >&2
}

# Human-readable key/value (colored). Machine lines stay separate via emit_kv.
log_kv() {
	printf '  %s%-12s%s %s\n' "${C_DIM}" "$1" "${C_RESET}" "$2"
}

# Plain key=value for CI parsers (run-bump.sh sed). Never color these.
emit_kv() {
	printf '%s=%s\n' "$1" "$2"
}

# "submodule: bump global-packages (N commit(s)) [sha]" — omit the count when empty.
format_bump_subject() {
	local short_sha="$1"
	local n="${2:-0}"
	if [ "${n}" -eq 1 ]; then
		printf 'submodule: bump global-packages (1 commit) [%s]' "${short_sha}"
	elif [ "${n}" -gt 1 ]; then
		printf 'submodule: bump global-packages (%s commits) [%s]' "${n}" "${short_sha}"
	else
		printf 'submodule: bump global-packages [%s]' "${short_sha}"
	fi
}

cd "${ROOT}"

configure_ci_submodule_https() {
	local token="$1"
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

	authed="https://x-access-token:${token}@github.com/${https_path}"

	# Explicit URL only — avoid url.*.insteadOf (not idempotent across setup steps).
	git config "submodule.${SUBMODULE_PATH}.url" "${authed}"
}

log_banner "bump global-packages"

# Previous pin from the parent repo HEAD (before we move the submodule).
PREV_SHA="$(git rev-parse "HEAD:${SUBMODULE_PATH}" 2>/dev/null || true)"
PREV_SHORT=""
if [[ -n "${PREV_SHA}" ]]; then
	PREV_SHORT="$(git -C "${SUBMODULE}" rev-parse --short "${PREV_SHA}" 2>/dev/null || printf '%.7s' "${PREV_SHA}")"
fi

log_step "Syncing submodule URL…"
git submodule sync -- "${SUBMODULE_PATH}" >/dev/null

if [ -n "${TOKEN}" ]; then
	log_info "Configuring HTTPS auth for private fetch"
	configure_ci_submodule_https "${TOKEN}"
fi

if [ ! -e "${SUBMODULE}/.git" ]; then
	log_step "Initializing submodule…"
	git submodule update --init --force -- "${SUBMODULE_PATH}"
fi

if [ -n "${TOKEN}" ]; then
	ORIGIN_URL="$(git config --get "submodule.${SUBMODULE_PATH}.url" 2>/dev/null || true)"
	if [ -n "${ORIGIN_URL}" ]; then
		git -C "${SUBMODULE}" remote set-url origin "${ORIGIN_URL}" 2>/dev/null || true
	fi
fi

# Keep fetch on the terminal: progress + SSH/credential prompts must stay visible.
# Redirecting to /dev/null made long fetches look hung.
log_step "Fetching origin refs (network; may take a bit)…"
git -C "${SUBMODULE}" fetch --progress --force --prune origin \
	"+refs/heads/*:refs/remotes/origin/*" \
	"+refs/tags/*:refs/tags/*"

# Resolve which ref tip to pin (local auto-detect when no arg).
if [ -n "${EXPLICIT_REF}" ]; then
	TARGET_REF="${EXPLICIT_REF}"
	log_info "Using explicit ref ${C_BOLD}${TARGET_REF}${C_RESET}"
elif [ "${CI:-}" = "true" ]; then
	TARGET_REF="master"
	log_info "CI mode — defaulting to ${C_BOLD}master${C_RESET}"
else
	if [ -z "${PREV_SHA}" ]; then
		log_err "no existing pin at ${SUBMODULE_PATH}; pass an explicit ref"
		exit 1
	fi

	# Prefer master whenever the current pin is already on master's history.
	if git -C "${SUBMODULE}" rev-parse --verify --quiet "origin/master^{commit}" >/dev/null \
		&& git -C "${SUBMODULE}" merge-base --is-ancestor "${PREV_SHA}" "origin/master"; then
		TARGET_REF="master"
	else
		CANDIDATES=()
		while IFS= read -r remote_ref; do
			[ -z "${remote_ref}" ] && continue
			case "${remote_ref}" in
				origin/HEAD) continue ;;
				origin/master | origin/main) continue ;;
			esac
			CANDIDATES+=("${remote_ref#origin/}")
		done < <(
			git -C "${SUBMODULE}" branch -r --contains "${PREV_SHA}" \
				| sed -e 's/^[* ]*//' -e 's/ -> .*//'
		)

		if [ "${#CANDIDATES[@]}" -eq 0 ]; then
			log_err "current pin ${PREV_SHA} is not on any remote branch"
			exit 1
		fi

		if [ "${#CANDIDATES[@]}" -eq 1 ]; then
			TARGET_REF="${CANDIDATES[0]}"
		else
			log_warn "pin ${PREV_SHORT:-${PREV_SHA}} is on multiple branches (${CANDIDATES[*]}); falling back to master"
			TARGET_REF="master"
		fi
	fi

	log_info "Auto-detected target ref ${C_BOLD}${TARGET_REF}${C_RESET} from pin ${C_DIM}${PREV_SHORT:-${PREV_SHA}}${C_RESET}"
fi

RESOLVED_SHA="$(git -C "${SUBMODULE}" rev-parse --verify "${TARGET_REF}^{commit}" 2>/dev/null || true)"
if [ -z "${RESOLVED_SHA}" ]; then
	RESOLVED_SHA="$(git -C "${SUBMODULE}" rev-parse --verify "origin/${TARGET_REF}^{commit}" 2>/dev/null || true)"
fi
if [ -z "${RESOLVED_SHA}" ]; then
	log_err "cannot resolve '${TARGET_REF}'"
	exit 1
fi

log_step "Checking out ${C_BOLD}$(git -C "${SUBMODULE}" rev-parse --short "${RESOLVED_SHA}")${C_RESET}…"
# Quiet the "HEAD is now at …" noise; failures still surface on stderr.
git -C "${SUBMODULE}" checkout --detach --force "${RESOLVED_SHA}" >/dev/null
git -C "${SUBMODULE}" sparse-checkout init --no-cone
git -C "${SUBMODULE}" sparse-checkout set '/packages/'

git add "${SUBMODULE_PATH}"

SHORT_SHA="$(git -C "${SUBMODULE}" rev-parse --short HEAD)"

TOTAL=0
if [ -n "${PREV_SHA}" ] && [ "${PREV_SHA}" != "${RESOLVED_SHA}" ]; then
	TOTAL="$(git -C "${SUBMODULE}" rev-list --count "${PREV_SHA}..${RESOLVED_SHA}" 2>/dev/null || echo 0)"
fi

COMMIT_SUBJECT="$(format_bump_subject "${SHORT_SHA}" "${TOTAL}")"

printf '\n%sOutputs%s\n' "${C_BOLD}" "${C_RESET}"
log_kv "path" "${SUBMODULE_PATH}"
log_kv "ref" "${TARGET_REF}"
log_kv "sha" "${RESOLVED_SHA}"
log_kv "short_sha" "${SHORT_SHA}"
if [[ -n "${PREV_SHA}" && "${PREV_SHA}" != "${RESOLVED_SHA}" ]]; then
	log_kv "previous" "${PREV_SHORT:-${PREV_SHA}}"
	log_kv "commits" "${TOTAL}"
fi
printf '\n'

# Machine-readable (CI). Keep exact prefixes; do not color.
emit_kv "sha" "${RESOLVED_SHA}"
emit_kv "short_sha" "${SHORT_SHA}"
emit_kv "target_ref" "${TARGET_REF}"
emit_kv "commits" "${TOTAL}"
emit_kv "commit_subject" "${COMMIT_SUBJECT}"

if git diff --cached --quiet -- "${SUBMODULE_PATH}"; then
	emit_kv "changed" "false"
	log_ok "Already at ${C_BOLD}${SHORT_SHA}${C_RESET}; nothing to commit"
	printf '\n'
	exit 0
fi

# CI keeps its own commit step; only auto-commit for local/manual bumps.
if [ "${CI:-}" = "true" ]; then
	emit_kv "changed" "true"
	log_ok "Staged only ${C_DIM}(CI=true; skipping commit)${C_RESET}"
	printf '\n'
	exit 0
fi

COMMIT_BODY=""

if [ "${TOTAL}" -gt 0 ]; then
	log_step "Including ${TOTAL} upstream commit(s) in message…"
	COMMIT_BODY="$(git -C "${SUBMODULE}" log --pretty=format:'- %s' -n "${MAX_COMMITS}" "${PREV_SHA}..${RESOLVED_SHA}")"
	if [ "${TOTAL}" -gt "${MAX_COMMITS}" ]; then
		MORE=$((TOTAL - MAX_COMMITS))
		COMMIT_BODY="${COMMIT_BODY}"$'\n'"- ...and ${MORE} more commits"
	fi
fi

log_step "Creating commit…"
if [ -n "${COMMIT_BODY}" ]; then
	git commit -m "${COMMIT_SUBJECT}" -m "${COMMIT_BODY}"
else
	git commit -m "${COMMIT_SUBJECT}"
fi

PARENT_SHORT="$(git rev-parse --short HEAD)"
emit_kv "changed" "true"
emit_kv "commit" "${PARENT_SHORT}"

printf '\n'
log_ok "Committed ${C_BOLD}${COMMIT_SUBJECT}${C_RESET}"
log_kv "commit" "${PARENT_SHORT}"
printf '\n'
