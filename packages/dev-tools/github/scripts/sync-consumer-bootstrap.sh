#!/usr/bin/env bash
# Sync the consumer-local bootstrap action that must exist BEFORE the submodule
# is available. Everything else is invoked in-place from:
#   packages/global-packages/packages/dev-tools/github/
#
# Usage (from consumer root, after submodule init):
#   bash packages/global-packages/packages/dev-tools/github/scripts/sync-consumer-bootstrap.sh
#   bash packages/global-packages/packages/dev-tools/github/scripts/sync-consumer-bootstrap.sh /path/to/consumer
set -euo pipefail

CONSUMER_ROOT="${1:-$(pwd)}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ACTION_SRC="$(cd "${SCRIPT_DIR}/../actions/ensure-global-packages" && pwd)"
ACTION_DEST="${CONSUMER_ROOT}/.github/actions/ensure-global-packages"

if [ ! -f "${ACTION_SRC}/action.yml" ] || [ ! -f "${ACTION_SRC}/ensure.sh" ]; then
	echo "sync-consumer-bootstrap: missing ensure-global-packages action at ${ACTION_SRC}" >&2
	exit 1
fi

# Keep ensure.sh identical to the toolkit script source of truth.
cp "${SCRIPT_DIR}/ensure-global-packages-sparse.sh" "${ACTION_SRC}/ensure.sh"
chmod +x "${ACTION_SRC}/ensure.sh"

mkdir -p "${ACTION_DEST}"
cp "${ACTION_SRC}/action.yml" "${ACTION_DEST}/action.yml"
cp "${ACTION_SRC}/ensure.sh" "${ACTION_DEST}/ensure.sh"
chmod +x "${ACTION_DEST}/ensure.sh"

# Remove legacy bootstrap copies under .github/scripts/ (logic lives in toolkit).
if [ -d "${CONSUMER_ROOT}/.github/scripts" ]; then
	rm -f \
		"${CONSUMER_ROOT}/.github/scripts/ensure-global-packages-sparse.sh" \
		"${CONSUMER_ROOT}/.github/scripts/ensure-global-packages-pre-push.sh" \
		"${CONSUMER_ROOT}/.github/scripts/ensure-global-packages-mirror-branch.sh" \
		"${CONSUMER_ROOT}/.github/scripts/bump-global-packages-submodule.sh" \
		"${CONSUMER_ROOT}/.github/scripts/retry-npm-ci.sh" \
		"${CONSUMER_ROOT}/.github/scripts/sync-global-packages-resolve-targets.sh" \
		"${CONSUMER_ROOT}/.github/scripts/sync-global-packages-run-bump.sh" \
		"${CONSUMER_ROOT}/.github/scripts/sync-global-packages-commit-bump.sh" \
		"${CONSUMER_ROOT}/.github/scripts/sync-global-packages-open-or-update-pr.sh"
	rmdir "${CONSUMER_ROOT}/.github/scripts" 2>/dev/null || true
fi

echo "sync-consumer-bootstrap: OK → ${ACTION_DEST}"
