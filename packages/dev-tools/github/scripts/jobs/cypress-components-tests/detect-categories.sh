#!/usr/bin/env bash
# Detect Cypress component matrix categories (wrapper around lib/detect-test-categories.sh).
#
# Default list command scans `*.cy.js` (see EXCLUDE_SUFFIXES for e2e/visual).
# Consumers pass filters via env (BLOCKERA_CT_SCAN_ROOTS, SHARD_SIZE, …).
#
#   BLOCKERA_CT_LIST_CATEGORIES_CMD  default: node …/list-test-categories.js --suffix cy.js --env-prefix BLOCKERA_CT
#   BLOCKERA_CT_PR_ENV_FILE          optional; unset skips PR filter
#   BLOCKERA_CT_SHARD_SIZE          optional; see list-test-categories.js
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESOLVE="${SCRIPT_DIR}/../../lib/resolve-dev-tools-root.sh"
DEV_TOOLS="$(bash "${RESOLVE}")"

export BLOCKERA_DETECT_LIST_CMD="${BLOCKERA_CT_LIST_CATEGORIES_CMD:-node ${DEV_TOOLS}/github/scripts/list-test-categories.js --suffix cy.js --env-prefix BLOCKERA_CT}"
export BLOCKERA_DETECT_PR_ENV_FILE="${BLOCKERA_CT_PR_ENV_FILE:-}"
export BLOCKERA_DETECT_LOG_LABEL="${BLOCKERA_DETECT_LOG_LABEL:-cypress-components/detect}"

bash "${SCRIPT_DIR}/../../lib/detect-test-categories.sh"
