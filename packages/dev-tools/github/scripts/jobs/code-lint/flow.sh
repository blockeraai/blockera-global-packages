#!/usr/bin/env bash
# Run Flow typecheck for a Blockera consumer.
#
# Defaults:
#   BLOCKERA_TYPECHECK_FLOW_CMD=npm run flow
#
# Skips when .flowconfig is missing.
set -euo pipefail

CMD="${BLOCKERA_TYPECHECK_FLOW_CMD:-npm run flow}"

if [ ! -f .flowconfig ]; then
	echo "code-lint/flow: no .flowconfig; skipping"
	exit 0
fi

echo "code-lint/flow: ${CMD}"
eval "${CMD}"
