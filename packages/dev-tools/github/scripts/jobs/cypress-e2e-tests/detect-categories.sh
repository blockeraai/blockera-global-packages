#!/usr/bin/env bash
# Detect Cypress E2E matrix categories and write categories=<json> to GITHUB_OUTPUT.
#
# Default list command scans `*.e2e.cy.js`. Consumers pass filters via env
# (BLOCKERA_E2E_SCAN_ROOTS, PACKAGE_SUFFIX, …) — not product-style names.
#
#   BLOCKERA_E2E_LIST_CATEGORIES_CMD  default: node …/list-test-categories.js --suffix e2e.cy.js --env-prefix BLOCKERA_E2E
#   BLOCKERA_E2E_PR_ENV_FILE          default: .pr-cypress.env.json
#   BLOCKERA_E2E_SHARD_SIZE          optional; see list-test-categories.js
set -euo pipefail

LIST_CMD="${BLOCKERA_E2E_LIST_CATEGORIES_CMD:-node packages/global-packages/packages/dev-tools/github/scripts/list-test-categories.js --suffix e2e.cy.js --env-prefix BLOCKERA_E2E}"
PR_ENV_FILE="${BLOCKERA_E2E_PR_ENV_FILE:-.pr-cypress.env.json}"

if [[ -z "${GITHUB_OUTPUT:-}" ]]; then
	echo "cypress-e2e/detect: GITHUB_OUTPUT is unset" >&2
	exit 1
fi

if [[ -f "${PR_ENV_FILE}" ]]; then
	echo "cypress-e2e/detect: filtering via ${PR_ENV_FILE}"
	categories="$(eval "${LIST_CMD} --pr-env \"${PR_ENV_FILE}\"")"
else
	echo "cypress-e2e/detect: ${LIST_CMD}"
	categories="$(eval "${LIST_CMD}")"
fi

categories_json="$(echo "${categories}" | jq -c '.')"
echo "categories=${categories_json}" >>"${GITHUB_OUTPUT}"
echo "Detected categories: ${categories_json}"
