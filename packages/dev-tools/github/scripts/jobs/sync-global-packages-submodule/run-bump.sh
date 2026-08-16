#!/usr/bin/env bash
# Configure git user, run the bootstrap bump script, and write bump outputs.
#
# Required env:
#   SOURCE_REF                         sha/branch to pin
#
# Optional env:
#   BLOCKERA_GLOBAL_PACKAGES_TOKEN
#   BLOCKERA_SYNC_GP_BUMP_SCRIPT       default: packages/global-packages/packages/dev-tools/github/scripts/bump-global-packages-submodule.sh
#   BLOCKERA_SYNC_GP_GIT_NAME          default: blockerabot
#   BLOCKERA_SYNC_GP_GIT_EMAIL         default: blockeraai+githubbot@gmail.com
#   BLOCKERA_SYNC_GP_SUBMODULE_PATH    default: packages/global-packages
set -euo pipefail

if [[ -z "${GITHUB_OUTPUT:-}" ]]; then
	echo "sync-gp/bump: GITHUB_OUTPUT is unset" >&2
	exit 1
fi

SOURCE_REF="${SOURCE_REF:-}"
if [[ -z "${SOURCE_REF}" ]]; then
	echo "sync-gp/bump: SOURCE_REF is required" >&2
	exit 1
fi

BUMP_SCRIPT="${BLOCKERA_SYNC_GP_BUMP_SCRIPT:-packages/global-packages/packages/dev-tools/github/scripts/bump-global-packages-submodule.sh}"
GIT_NAME="${BLOCKERA_SYNC_GP_GIT_NAME:-blockerabot}"
GIT_EMAIL="${BLOCKERA_SYNC_GP_GIT_EMAIL:-blockeraai+githubbot@gmail.com}"
SUBMODULE_PATH="${BLOCKERA_SYNC_GP_SUBMODULE_PATH:-packages/global-packages}"

git config user.name "${GIT_NAME}"
git config user.email "${GIT_EMAIL}"

if [[ ! -f "${BUMP_SCRIPT}" ]]; then
	echo "sync-gp/bump: missing ${BUMP_SCRIPT}" >&2
	exit 1
fi

chmod +x "${BUMP_SCRIPT}"
OUTPUT="$(bash "${BUMP_SCRIPT}" "${SOURCE_REF}")"
echo "${OUTPUT}"

SHORT_SHA="$(echo "${OUTPUT}" | sed -n 's/^short_sha=//p' | tail -n1)"
FULL_SHA="$(echo "${OUTPUT}" | sed -n 's/^sha=//p' | tail -n1)"
COMMITS="$(echo "${OUTPUT}" | sed -n 's/^commits=//p' | tail -n1)"
COMMIT_SUBJECT="$(echo "${OUTPUT}" | sed -n 's/^commit_subject=//p' | tail -n1)"
echo "short_sha=${SHORT_SHA}" >>"${GITHUB_OUTPUT}"
echo "sha=${FULL_SHA}" >>"${GITHUB_OUTPUT}"
echo "commits=${COMMITS}" >>"${GITHUB_OUTPUT}"
echo "commit_subject=${COMMIT_SUBJECT}" >>"${GITHUB_OUTPUT}"

if git diff --cached --quiet -- "${SUBMODULE_PATH}"; then
	echo "changed=false" >>"${GITHUB_OUTPUT}"
	echo "Submodule already at ${SHORT_SHA}; nothing to do."
else
	echo "changed=true" >>"${GITHUB_OUTPUT}"
fi
