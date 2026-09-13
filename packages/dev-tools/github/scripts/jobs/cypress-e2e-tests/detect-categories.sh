#!/usr/bin/env bash
# Detect Cypress E2E matrix categories (wrapper around lib/detect-test-categories.sh).
#
# Default list command scans `*.e2e.cy.js`. Consumers pass filters via env
# (BLOCKERA_E2E_SCAN_ROOTS, PACKAGE_SUFFIX, …) — not product-style names.
#
#   BLOCKERA_E2E_LIST_CATEGORIES_CMD  default: node …/list-test-categories.js --suffix e2e.cy.js --env-prefix BLOCKERA_E2E
#   BLOCKERA_E2E_PR_ENV_FILE          default: .pr-cypress.env.json
#   BLOCKERA_E2E_SHARD_SIZE          optional; see list-test-categories.js
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESOLVE="${SCRIPT_DIR}/../../lib/resolve-dev-tools-root.sh"
DEV_TOOLS="$(bash "${RESOLVE}")"

export BLOCKERA_DETECT_LIST_CMD="${BLOCKERA_E2E_LIST_CATEGORIES_CMD:-node ${DEV_TOOLS}/github/scripts/list-test-categories.js --suffix e2e.cy.js --env-prefix BLOCKERA_E2E}"
export BLOCKERA_DETECT_PR_ENV_FILE="${BLOCKERA_E2E_PR_ENV_FILE:-.pr-cypress.env.json}"
export BLOCKERA_DETECT_LOG_LABEL="${BLOCKERA_DETECT_LOG_LABEL:-cypress-e2e/detect}"

bash "${SCRIPT_DIR}/../../lib/detect-test-categories.sh"
