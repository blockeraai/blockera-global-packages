#!/usr/bin/env bash
# Delete leftover PR-only config files (e.g. .pr-*) and optionally commit+push.
#
# Defaults match the Blockera plugin base. Override via env:
#   BLOCKERA_PR_CONFIG_NAME            find -name pattern (default: .pr-*)
#   BLOCKERA_PR_CONFIG_EXCLUDE_NAMES   space-separated ! -name patterns
#                                      (default: *.env-example* *.example.* *-example*)
#   BLOCKERA_PR_CONFIG_ROOT            search root (default: .)
#   BLOCKERA_PR_CONFIG_GIT_NAME        default: blockerabot
#   BLOCKERA_PR_CONFIG_GIT_EMAIL       default: blockeraai+githubbot@gmail.com
#   BLOCKERA_PR_CONFIG_COMMIT_MSG      default: chore: remove PR config files
#   BLOCKERA_PR_CONFIG_PUSH_REMOTE     default: origin
#   BLOCKERA_PR_CONFIG_PUSH_BRANCH     default: master
#   BLOCKERA_PR_CONFIG_PUSH            true|false (default: true)
set -euo pipefail

ROOT="${BLOCKERA_PR_CONFIG_ROOT:-.}"
NAME_PATTERN="${BLOCKERA_PR_CONFIG_NAME:-.pr-*}"
# Keep patterns literal: unquoted expansion would pathname-expand against cwd files.
EXCLUDE_NAMES="${BLOCKERA_PR_CONFIG_EXCLUDE_NAMES:-*.env-example* *.example.* *-example*}"
GIT_NAME="${BLOCKERA_PR_CONFIG_GIT_NAME:-blockerabot}"
GIT_EMAIL="${BLOCKERA_PR_CONFIG_GIT_EMAIL:-blockeraai+githubbot@gmail.com}"
COMMIT_MSG="${BLOCKERA_PR_CONFIG_COMMIT_MSG:-chore: remove PR config files}"
PUSH_REMOTE="${BLOCKERA_PR_CONFIG_PUSH_REMOTE:-origin}"
PUSH_BRANCH="${BLOCKERA_PR_CONFIG_PUSH_BRANCH:-master}"
DO_PUSH="${BLOCKERA_PR_CONFIG_PUSH:-true}"

cd "${ROOT}"

FIND_ARGS=(
	.
	\( -name node_modules -o -name .git -o -name vendor -o -name dist -o -name build \) -prune
	-o
	-type f
	-name "${NAME_PATTERN}"
)

set -f
# shellcheck disable=SC2086
for exclude in ${EXCLUDE_NAMES}; do
	FIND_ARGS+=(! -name "${exclude}")
done
set +f

FIND_ARGS+=(-delete)

echo "remove-pr-config: deleting matches of '${NAME_PATTERN}' under ${ROOT} (excluding example templates)"
find "${FIND_ARGS[@]}" 2>/dev/null || true

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
