#!/usr/bin/env bash
# Detect Playwright E2E matrix categories and write categories=<json> to GITHUB_OUTPUT.
# Expands "block-screenshots" into block-screenshots-N batch categories when present.
#
# Defaults match the Blockera plugin base. Override via env:
#   BLOCKERA_PLAYWRIGHT_LIST_CATEGORIES_CMD
#   BLOCKERA_PLAYWRIGHT_VISUAL_BATCHES_CMD
#   BLOCKERA_PLAYWRIGHT_PR_ENV_FILE
#   BLOCKERA_PLAYWRIGHT_PRODUCT_STYLE   plugin|theme (default: plugin)
#   VISUAL_SNAPSHOT_BATCH_SIZE          forwarded to the batches script
set -euo pipefail

LIST_CMD="${BLOCKERA_PLAYWRIGHT_LIST_CATEGORIES_CMD:-node packages/global-packages/packages/dev-tools/github/scripts/list-playwright-test-categories.js}"
BATCHES_CMD="${BLOCKERA_PLAYWRIGHT_VISUAL_BATCHES_CMD:-node packages/global-packages/packages/dev-tools/github/scripts/list-visual-snapshot-batches.js}"
PR_ENV_FILE="${BLOCKERA_PLAYWRIGHT_PR_ENV_FILE:-.pr-playwright.env.json}"
PRODUCT_STYLE="${BLOCKERA_PLAYWRIGHT_PRODUCT_STYLE:-plugin}"

if [[ -z "${GITHUB_OUTPUT:-}" ]]; then
	echo "playwright-e2e/detect: GITHUB_OUTPUT is unset" >&2
	exit 1
fi

echo "playwright-e2e/detect: ${LIST_CMD}"
categories="$(eval "${LIST_CMD}")"

echo "playwright-e2e/detect: ${BATCHES_CMD}"
# shellcheck disable=SC2086
visual_batches="$(eval "${BATCHES_CMD}")"

expand_visual_batches() {
	local input_json="$1"
	echo "${input_json}" | jq -c --argjson batches "${visual_batches}" '
		if index("block-screenshots") then
			(map(select(. != "block-screenshots")) + $batches) | unique | sort
		else
			.
		end
	'
}

is_allowed_playwright_path() {
	local path="$1"
	if [[ "${PRODUCT_STYLE}" != "theme" ]]; then
		return 0
	fi
	[[ "${path}" =~ ^tests/ ]] && return 0
	[[ "${path}" =~ ^packages/(blockera-one-[^/]+|[^/]+-one)/ ]]
}

if [[ -f "${PR_ENV_FILE}" ]]; then
	echo "playwright-e2e/detect: filtering via ${PR_ENV_FILE} (style=${PRODUCT_STYLE})"
	filtered_categories="$(
		jq -r '.testMatch[]' "${PR_ENV_FILE}" | while read -r pattern; do
			[[ -z "${pattern}" ]] && continue
			is_allowed_playwright_path "${pattern}" || continue
			# Theme CI does not run the core Blockera visual suite entry.
			if [[ "${PRODUCT_STYLE}" == "theme" && "${pattern}" == "tests/visual.block-screenshots.ply.js" ]]; then
				continue
			fi
			base="$(basename "${pattern}" .ply.js)"
			if [[ "${base}" == *.* ]]; then
				echo "${base#*.}"
			else
				echo "general-1"
			fi
		done | sort -u
	)"

	filtered_categories_json="$(echo "${filtered_categories}" | jq -R -n '[inputs]' | jq -c '.')"
	filtered_categories_json="$(expand_visual_batches "${filtered_categories_json}")"
	echo "categories=${filtered_categories_json}" >>"${GITHUB_OUTPUT}"
	echo "Filtered categories: ${filtered_categories_json}"
else
	categories_json="$(echo "${categories}" | jq -c '.')"
	categories_json="$(expand_visual_batches "${categories_json}")"
	echo "categories=${categories_json}" >>"${GITHUB_OUTPUT}"
	echo "Detected categories: ${categories_json}"
fi
