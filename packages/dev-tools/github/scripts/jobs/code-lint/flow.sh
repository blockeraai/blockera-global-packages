#!/usr/bin/env bash
# Run Flow typecheck for a Blockera consumer.
#
# Defaults:
#   BLOCKERA_TYPECHECK_FLOW_CMD=npx flow check
#
# Use `flow check` (one-shot) rather than `flow status` (long-lived server).
# Skips when .flowconfig is missing.
set -euo pipefail

CMD="${BLOCKERA_TYPECHECK_FLOW_CMD:-npx flow check}"

if [ ! -f .flowconfig ]; then
	echo "code-lint/flow: no .flowconfig; skipping"
	exit 0
fi

echo "code-lint/flow: ${CMD}"
eval "${CMD}"
