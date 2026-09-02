#!/usr/bin/env bash
# Delete an orphaned bump branch when there is no open bump PR.
# Never close an open pin PR (a later GP master commit should update that PR).
#
# Required env:
#   GH_TOKEN (or gh auth)
#
# Optional:
#   BLOCKERA_SYNC_GP_PR_BRANCH   default: chore/bump-global-packages
#   BASE_BRANCH / TARGET_BRANCH  never deleted even if they match the bump name
#   MODE                         skip delete when push (feature-branch land)
#   SKIP_SYNC                    skip delete when this dispatch is not for us
#   BLOCKERA_SYNC_GP_CLOSE_PR    true = close open bump PRs (default: false)
set -euo pipefail

PR_BRANCH="${BLOCKERA_SYNC_GP_PR_BRANCH:-chore/bump-global-packages}"
TARGET_BRANCH="${BASE_BRANCH:-${TARGET_BRANCH:-}}"
MODE="${MODE:-}"
SKIP_SYNC="${SKIP_SYNC:-false}"
CLOSE_PR="${BLOCKERA_SYNC_GP_CLOSE_PR:-false}"

if [[ "${SKIP_SYNC}" == "true" ]]; then
	echo "sync-gp/cleanup: skip_sync; leaving ${PR_BRANCH} alone"
	exit 0
fi

if [[ "${MODE}" == "push" ]]; then
	echo "sync-gp/cleanup: push mode; leaving ${PR_BRANCH} alone"
	exit 0
fi

if [[ -n "${TARGET_BRANCH}" && "${PR_BRANCH}" == "${TARGET_BRANCH}" ]]; then
	echo "sync-gp/cleanup: refusing to delete target branch '${PR_BRANCH}'" >&2
	exit 0
fi

if [[ -n "${GITHUB_REF_NAME:-}" && "${PR_BRANCH}" == "${GITHUB_REF_NAME}" ]]; then
	echo "sync-gp/cleanup: refusing to delete current ref '${PR_BRANCH}'" >&2
	exit 0
fi

open_numbers="$(gh pr list --head "${PR_BRANCH}" --state open --json number --jq '.[].number' 2>/dev/null || true)"

if [[ -n "${open_numbers}" ]]; then
	if [[ "${CLOSE_PR}" == "true" ]]; then
		while IFS= read -r num; do
			[[ -z "${num}" ]] && continue
			gh pr close "${num}" --comment "Closing leftover global-packages bump PR; this run did not open or update a pin PR." || true
			echo "sync-gp/cleanup: closed PR #${num}"
		done <<<"${open_numbers}"
	else
		echo "sync-gp/cleanup: open bump PR remains (${open_numbers//$'\n'/, }); not closing"
		exit 0
	fi
fi

if git ls-remote --exit-code --heads origin "${PR_BRANCH}" >/dev/null 2>&1; then
	git push origin --delete "${PR_BRANCH}"
	echo "sync-gp/cleanup: deleted origin/${PR_BRANCH}"
else
	echo "sync-gp/cleanup: origin/${PR_BRANCH} not present"
fi
