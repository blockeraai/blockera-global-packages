#!/usr/bin/env bash
# Detect Cypress E2E matrix categories and write categories=<json> to GITHUB_OUTPUT.
#
# Defaults match the Blockera plugin base. Override via env:
#   BLOCKERA_E2E_LIST_CATEGORIES_CMD  default: node packages/global-packages/packages/dev-tools/github/scripts/list-e2e-test-categories.js
#   BLOCKERA_E2E_PR_ENV_FILE          default: .pr-cypress.env.json
set -euo pipefail

LIST_CMD="${BLOCKERA_E2E_LIST_CATEGORIES_CMD:-node packages/global-packages/packages/dev-tools/github/scripts/list-e2e-test-categories.js}"
PR_ENV_FILE="${BLOCKERA_E2E_PR_ENV_FILE:-.pr-cypress.env.json}"

if [[ -z "${GITHUB_OUTPUT:-}" ]]; then
	echo "cypress-e2e/detect: GITHUB_OUTPUT is unset" >&2
	exit 1
fi

echo "cypress-e2e/detect: ${LIST_CMD}"
categories="$(eval "${LIST_CMD}")"

if [[ -f "${PR_ENV_FILE}" ]]; then
	echo "cypress-e2e/detect: filtering via ${PR_ENV_FILE}"
	spec_patterns="$(jq -r '.e2e.specPattern[]' "${PR_ENV_FILE}")"
	filtered_categories="$(
		echo "${spec_patterns}" \
			| sed -E 's|.*/([^/]+)\..*|\1|' \
			| sed -E 's|^[^.]*\.||' \
			| sed -E 's|\.e2e\.cy$||' \
			| sort -u
	)"
	filtered_categories_json="$(echo "${filtered_categories}" | tr ' ' '\n' | jq -R -n '[inputs]' | jq -c '.')"
	echo "categories=${filtered_categories_json}" >>"${GITHUB_OUTPUT}"
	echo "Filtered categories: ${filtered_categories}"
else
	categories_json="$(echo "${categories}" | jq -c '.')"
	echo "categories=${categories_json}" >>"${GITHUB_OUTPUT}"
	echo "Detected categories: ${categories_json}"
fi
