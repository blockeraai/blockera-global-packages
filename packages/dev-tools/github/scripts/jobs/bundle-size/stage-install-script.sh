#!/usr/bin/env bash
# Stage retry-npm-ci.sh outside the git worktree.
#
# preactjs/compressed-size-action runs install on the PR head, then
# `git reset --hard` to the base branch and installs again. A path inside
# the repo can disappear or change on that reset. Copying to RUNNER_TEMP
# keeps the retry wrapper available for both installs.
#
# Outputs:
#   command  — value for compressed-size-action `install-script`
#
# Env:
#   BLOCKERA_BUNDLE_SIZE_NPM_CI_DIR  staging dir (default: $RUNNER_TEMP/blockera-bundle-size-npm-ci)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STAGE="${BLOCKERA_BUNDLE_SIZE_NPM_CI_DIR:-${RUNNER_TEMP:?}/blockera-bundle-size-npm-ci}"

mkdir -p "${STAGE}/lib"
cp "${SCRIPT_DIR}/../../retry-npm-ci.sh" "${STAGE}/retry-npm-ci.sh"
cp "${SCRIPT_DIR}/../../lib/retry.sh" "${STAGE}/lib/retry.sh"

COMMAND="bash ${STAGE}/retry-npm-ci.sh"
echo "bundle-size/stage-install-script: ${COMMAND}"

if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
	echo "command=${COMMAND}" >>"${GITHUB_OUTPUT}"
fi
