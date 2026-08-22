#!/usr/bin/env bash
# Run JavaScript coding standards for a Blockera consumer.
#
# Defaults:
#   BLOCKERA_LINT_JS_CMD=npm run lint:js
#
# Override on the workflow step with env:, e.g.:
#   env:
#     BLOCKERA_LINT_JS_CMD: npm run lint:js:ci
set -euo pipefail

CMD="${BLOCKERA_LINT_JS_CMD:-npm run lint:js}"

echo "code-lint/js: ${CMD}"
eval "${CMD}"
