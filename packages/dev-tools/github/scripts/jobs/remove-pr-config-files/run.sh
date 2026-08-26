#!/usr/bin/env bash
# Delete leftover PR-only config files and optionally commit+push.
#
# Defaults: see github/scripts/lib/pr-config-files.sh
#   BLOCKERA_PR_CONFIG_NAME            space-separated find -name patterns
#   BLOCKERA_PR_CONFIG_EXCLUDE_NAMES   space-separated ! -name patterns
#   BLOCKERA_PR_CONFIG_ROOT            search root (default: .)
#   BLOCKERA_PR_CONFIG_GIT_NAME        default: blockerabot
#   BLOCKERA_PR_CONFIG_GIT_EMAIL       default: blockeraai+githubbot@gmail.com
#   BLOCKERA_PR_CONFIG_COMMIT_MSG      default: chore: remove PR config files
#   BLOCKERA_PR_CONFIG_PUSH_REMOTE     default: origin
#   BLOCKERA_PR_CONFIG_PUSH_BRANCH     default: master
#   BLOCKERA_PR_CONFIG_PUSH            true|false (default: true)
set -euo pipefail

ROOT="${BLOCKERA_PR_CONFIG_ROOT:-.}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GIT_NAME="${BLOCKERA_PR_CONFIG_GIT_NAME:-blockerabot}"
GIT_EMAIL="${BLOCKERA_PR_CONFIG_GIT_EMAIL:-blockeraai+githubbot@gmail.com}"
COMMIT_MSG="${BLOCKERA_PR_CONFIG_COMMIT_MSG:-chore: remove PR config files}"
PUSH_REMOTE="${BLOCKERA_PR_CONFIG_PUSH_REMOTE:-origin}"
PUSH_BRANCH="${BLOCKERA_PR_CONFIG_PUSH_BRANCH:-master}"
DO_PUSH="${BLOCKERA_PR_CONFIG_PUSH:-true}"

# shellcheck source=../../lib/pr-config-files.sh
source "${SCRIPT_DIR}/../../lib/pr-config-files.sh"

cd "${ROOT}"

echo "remove-pr-config: deleting PR-only config files under ${ROOT} (excluding example templates)"
pr_config_find -delete >/dev/null

git config user.name "${GIT_NAME}"
git config user.email "${GIT_EMAIL}"

if [[ -z "$(git status --porcelain)" ]]; then
	echo "No PR config files found to remove and It is OK ✅"
	exit 0
fi

git add .
git commit -m "${COMMIT_MSG}"

if [[ "${DO_PUSH}" == "true" ]]; then
	echo "remove-pr-config: git push ${PUSH_REMOTE} ${PUSH_BRANCH}"
	git push "${PUSH_REMOTE}" "${PUSH_BRANCH}"
else
	echo "remove-pr-config: push skipped (BLOCKERA_PR_CONFIG_PUSH=${DO_PUSH})"
fi
