#!/usr/bin/env bash
# Stop the wp-env used by performance benchmarks.
set -euo pipefail

STOP_CMD="${BLOCKERA_PERF_STOP_CMD:-npm run env:stop}"
echo "performance/stop: ${STOP_CMD}"
eval "${STOP_CMD}" || true
