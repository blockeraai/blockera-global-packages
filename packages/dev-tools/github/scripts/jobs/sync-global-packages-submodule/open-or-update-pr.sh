#!/usr/bin/env bash
# Force-push chore/bump-global-packages and open/update the bump PR.
#
# Required env:
#   GH_TOKEN (or gh auth)
#   BASE_BRANCH, SHORT_SHA, FULL_SHA, SOURCE_BRANCH
#   SOURCE_MESSAGE   (multiline OK)
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

TITLE="submodule: bump global-packages to ${SHORT_SHA}"

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
