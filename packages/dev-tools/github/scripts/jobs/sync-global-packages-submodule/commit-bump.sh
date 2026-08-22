#!/usr/bin/env bash
# Commit a staged packages/global-packages gitlink bump.
#
# Required env:
#   SHORT_SHA
#
# Optional:
#   COMMIT_SUBJECT                      full subject from the bump script
#   COMMITS                             upstream commit count (used when COMMIT_SUBJECT is unset)
#   BLOCKERA_SYNC_GP_COMMIT_MSG_PREFIX  default: submodule: update global-packages
#   BLOCKERA_SYNC_GP_GLOBAL_PACKAGES_REPO  default: blockeraai/blockera-global-packages
set -euo pipefail

SHORT_SHA="${SHORT_SHA:-}"
if [[ -z "${SHORT_SHA}" ]]; then
	echo "sync-gp/commit: SHORT_SHA is required" >&2
	exit 1
fi

PREFIX="${BLOCKERA_SYNC_GP_COMMIT_MSG_PREFIX:-submodule: update global-packages}"
GP_REPO="${BLOCKERA_SYNC_GP_GLOBAL_PACKAGES_REPO:-blockeraai/blockera-global-packages}"
RANGE_URL="https://github.com/${GP_REPO}/commit/${SHORT_SHA}"
if [[ -n "${COMMIT_SUBJECT:-}" ]]; then
	MSG="${COMMIT_SUBJECT}"
else
	COMMITS="${COMMITS:-0}"
	if [[ "${COMMITS}" -eq 1 ]]; then
		MSG="${PREFIX} (1 commit) ${RANGE_URL}"
	elif [[ "${COMMITS}" -gt 1 ]]; then
		MSG="${PREFIX} (${COMMITS} commits) ${RANGE_URL}"
	else
		MSG="${PREFIX} ${RANGE_URL}"
	fi
fi

git commit -m "${MSG}"

if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
	echo "commit=$(git rev-parse --short HEAD)" >>"${GITHUB_OUTPUT}"
fi

echo "sync-gp/commit: ${MSG}"
