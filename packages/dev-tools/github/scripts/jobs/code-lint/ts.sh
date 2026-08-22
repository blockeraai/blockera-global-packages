#!/usr/bin/env bash
# Run TypeScript typecheck for a Blockera consumer.
#
# Defaults:
#   BLOCKERA_TYPECHECK_TS_CMD=npm run typecheck
#
# Skips when tsconfig.json is missing.
set -euo pipefail

CMD="${BLOCKERA_TYPECHECK_TS_CMD:-npm run typecheck}"

if [ ! -f tsconfig.json ]; then
	echo "code-lint/ts: no tsconfig.json; skipping"
	exit 0
fi

echo "code-lint/ts: ${CMD}"
eval "${CMD}"
