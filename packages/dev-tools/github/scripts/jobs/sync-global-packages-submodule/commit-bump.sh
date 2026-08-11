#!/usr/bin/env bash
# Commit a staged packages/global-packages gitlink bump.
#
# Required env:
#   SHORT_SHA
#
# Optional:
#   BLOCKERA_SYNC_GP_COMMIT_MSG_PREFIX  default: submodule: bump global-packages to
set -euo pipefail

SHORT_SHA="${SHORT_SHA:-}"
if [[ -z "${SHORT_SHA}" ]]; then
	echo "sync-gp/commit: SHORT_SHA is required" >&2
	exit 1
fi

PREFIX="${BLOCKERA_SYNC_GP_COMMIT_MSG_PREFIX:-submodule: bump global-packages to}"
MSG="${PREFIX} ${SHORT_SHA}"

git commit -m "${MSG}"

if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
	echo "commit=$(git rev-parse --short HEAD)" >>"${GITHUB_OUTPUT}"
fi

echo "sync-gp/commit: ${MSG}"
