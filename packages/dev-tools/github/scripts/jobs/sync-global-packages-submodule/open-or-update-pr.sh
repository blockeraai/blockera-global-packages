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
PR_LABEL="${BLOCKERA_SYNC_GP_PR_LABEL:-dependencies}"
GP_REPO="${BLOCKERA_SYNC_GP_GLOBAL_PACKAGES_REPO:-blockeraai/blockera-global-packages}"

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
	if [[ "${COMMITS}" -eq 1 ]]; then
		TITLE="submodule: bump global-packages (1 commit) [${SHORT_SHA}]"
	elif [[ "${COMMITS}" -gt 1 ]]; then
		TITLE="submodule: bump global-packages (${COMMITS} commits) [${SHORT_SHA}]"
	else
		TITLE="submodule: bump global-packages [${SHORT_SHA}]"
	fi
fi

EXISTING_PR="$(gh pr list --head "${PR_BRANCH}" --base "${BASE_BRANCH}" --json number --jq '.[0].number // empty')"
if [[ -n "${EXISTING_PR}" ]]; then
	gh pr edit "${EXISTING_PR}" --title "${TITLE}" --body "${BODY}"
	echo "Updated PR #${EXISTING_PR}"
else
	gh pr create \
		--base "${BASE_BRANCH}" \
		--head "${PR_BRANCH}" \
		--title "${TITLE}" \
		--body "${BODY}" \
		--label "${PR_LABEL}"
fi
