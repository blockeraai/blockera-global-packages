#!/usr/bin/env bash
# Force-push chore/bump-global-packages and open/update the bump PR.
#
# Required env:
#   GH_TOKEN (or gh auth)
#   BASE_BRANCH, SHORT_SHA, FULL_SHA, SOURCE_BRANCH
#   SOURCE_MESSAGE   (multiline OK)
#
# Optional:
#   COMMIT_SUBJECT   full title from the bump script
#   COMMITS          upstream commit count (used when COMMIT_SUBJECT is unset)
#
# Optional:
#   BLOCKERA_SYNC_GP_PR_BRANCH              default: chore/bump-global-packages
#   BLOCKERA_SYNC_GP_PR_LABEL               default: dependencies
#     Applied only when the label exists (or can be created) on this repo.
#     Consumers (blockera, blockera-one, blockera-pro, blockera-site-toolkit)
#     do not all ship the same labels — missing labels must not fail the bump.
#     Set empty to skip labeling.
#   BLOCKERA_SYNC_GP_GLOBAL_PACKAGES_REPO   default: blockeraai/blockera-global-packages
set -euo pipefail

BASE_BRANCH="${BASE_BRANCH:-}"
SHORT_SHA="${SHORT_SHA:-}"
FULL_SHA="${FULL_SHA:-}"
SOURCE_BRANCH="${SOURCE_BRANCH:-}"
SOURCE_MESSAGE="${SOURCE_MESSAGE:-}"

if [[ -z "${BASE_BRANCH}" || -z "${SHORT_SHA}" || -z "${FULL_SHA}" ]]; then
	echo "sync-gp/pr: BASE_BRANCH, SHORT_SHA, and FULL_SHA are required" >&2
	exit 1
fi

PR_BRANCH="${BLOCKERA_SYNC_GP_PR_BRANCH:-chore/bump-global-packages}"
PR_LABEL="${BLOCKERA_SYNC_GP_PR_LABEL-dependencies}"
GP_REPO="${BLOCKERA_SYNC_GP_GLOBAL_PACKAGES_REPO:-blockeraai/blockera-global-packages}"

# True when the label exists or was created. Never abort the bump PR for labels.
label_ready() {
	local name="${1:-}"
	[[ -z "${name}" ]] && return 1

	if gh label list --search "${name}" --limit 20 --json name --jq '.[].name' | grep -Fxq "${name}"; then
		return 0
	fi

	if gh label create "${name}" --description "Dependency and submodule bumps" --color "0366d6" >/dev/null; then
		echo "sync-gp/pr: created missing label '${name}'"
		return 0
	fi

	echo "sync-gp/pr: label '${name}' not found and could not be created; opening PR unlabeled" >&2
	return 1
}

git checkout -B "${PR_BRANCH}"
git push --force-with-lease origin "${PR_BRANCH}"

BODY="$(
	cat <<EOF
## Summary
- Auto-bump \`packages/global-packages\` to [\`${SHORT_SHA}\`](https://github.com/${GP_REPO}/commit/${FULL_SHA})
- Source branch: \`${SOURCE_BRANCH}\`

## Source commit
\`\`\`
${SOURCE_MESSAGE}
\`\`\`

## Test plan
- [ ] CI on this PR is green
- [ ] Smoke editor load after merge
EOF
)"

if [[ -n "${COMMIT_SUBJECT:-}" ]]; then
	TITLE="${COMMIT_SUBJECT}"
else
	COMMITS="${COMMITS:-0}"
	RANGE_URL="https://github.com/${GP_REPO}/commit/${SHORT_SHA}"
	if [[ "${COMMITS}" -eq 1 ]]; then
		TITLE="submodule: update global-packages (1 commit) ${RANGE_URL}"
	elif [[ "${COMMITS}" -gt 1 ]]; then
		TITLE="submodule: update global-packages (${COMMITS} commits) ${RANGE_URL}"
	else
		TITLE="submodule: update global-packages ${RANGE_URL}"
	fi
fi

EXISTING_PR="$(gh pr list --head "${PR_BRANCH}" --base "${BASE_BRANCH}" --json number --jq '.[0].number // empty')"
APPLY_LABEL=false
if label_ready "${PR_LABEL}"; then
	APPLY_LABEL=true
fi

if [[ -n "${EXISTING_PR}" ]]; then
	gh pr edit "${EXISTING_PR}" --title "${TITLE}" --body "${BODY}"
	if [[ "${APPLY_LABEL}" == "true" ]]; then
		gh pr edit "${EXISTING_PR}" --add-label "${PR_LABEL}" || echo "sync-gp/pr: could not add label '${PR_LABEL}' to #${EXISTING_PR}" >&2
	fi
	echo "Updated PR #${EXISTING_PR}"
else
	CREATE_ARGS=(
		--base "${BASE_BRANCH}"
		--head "${PR_BRANCH}"
		--title "${TITLE}"
		--body "${BODY}"
	)
	if [[ "${APPLY_LABEL}" == "true" ]]; then
		CREATE_ARGS+=(--label "${PR_LABEL}")
	fi
	gh pr create "${CREATE_ARGS[@]}"
fi
