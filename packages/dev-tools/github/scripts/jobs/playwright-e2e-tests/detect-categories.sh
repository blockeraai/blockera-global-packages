#!/usr/bin/env bash
# Detect Playwright E2E matrix categories and write categories=<json> to GITHUB_OUTPUT.
# Expands "block-screenshots" into block-screenshots-N batch categories when present.
#
#   BLOCKERA_PLAYWRIGHT_LIST_CATEGORIES_CMD  default: list-test-categories.js --suffix ply.js
#   BLOCKERA_PLAYWRIGHT_VISUAL_BATCHES_CMD
#   BLOCKERA_PLAYWRIGHT_PR_ENV_FILE
#   BLOCKERA_PLAYWRIGHT_PACKAGE_SUFFIX / _PREFIX   PR path filter (optional)
#   BLOCKERA_PLAYWRIGHT_EXCLUDE_FILES              comma-separated paths skipped in PR filter
#   VISUAL_SNAPSHOT_BATCH_SIZE
set -euo pipefail

LIST_CMD="${BLOCKERA_PLAYWRIGHT_LIST_CATEGORIES_CMD:-node packages/global-packages/packages/dev-tools/github/scripts/list-test-categories.js --suffix ply.js --env-prefix BLOCKERA_PLAYWRIGHT}"
BATCHES_CMD="${BLOCKERA_PLAYWRIGHT_VISUAL_BATCHES_CMD:-node packages/global-packages/packages/dev-tools/github/scripts/list-visual-snapshot-batches.js}"
PR_ENV_FILE="${BLOCKERA_PLAYWRIGHT_PR_ENV_FILE:-.pr-playwright.env.json}"
PACKAGE_SUFFIX="${BLOCKERA_PLAYWRIGHT_PACKAGE_SUFFIX:-}"
PACKAGE_PREFIX="${BLOCKERA_PLAYWRIGHT_PACKAGE_PREFIX:-}"
EXCLUDE_FILES="${BLOCKERA_PLAYWRIGHT_EXCLUDE_FILES:-}"
GENERAL_CATEGORY="${BLOCKERA_PLAYWRIGHT_GENERAL_CATEGORY:-general-1}"

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

is_excluded_file() {
	local path="$1"
	local item
	IFS=',' read -r -a items <<<"${EXCLUDE_FILES}"
	for item in "${items[@]}"; do
		item="${item#"${item%%[![:space:]]*}"}"
		item="${item%"${item##*[![:space:]]}"}"
		[[ -z "${item}" ]] && continue
		if [[ "${path}" == "${item}" || "$(basename "${path}")" == "$(basename "${item}")" ]]; then
			return 0
		fi
	done
	return 1
}

is_allowed_playwright_path() {
	local path="$1"
	is_excluded_file "${path}" && return 1
	if [[ -z "${PACKAGE_SUFFIX}" && -z "${PACKAGE_PREFIX}" ]]; then
		return 0
	fi
	[[ "${path}" =~ ^tests/ ]] && return 0
	local pkg
	pkg="$(echo "${path}" | sed -nE 's|^packages/([^/]+)/.*|\1|p')"
	[[ -z "${pkg}" ]] && return 1
	[[ -n "${PACKAGE_SUFFIX}" && "${pkg}" == *"${PACKAGE_SUFFIX}" ]] && return 0
	[[ -n "${PACKAGE_PREFIX}" && "${pkg}" == "${PACKAGE_PREFIX}"* ]] && return 0
	return 1
}

if [[ -f "${PR_ENV_FILE}" ]]; then
	echo "playwright-e2e/detect: filtering via ${PR_ENV_FILE}"
	filtered_categories="$(
		jq -r '.testMatch[]' "${PR_ENV_FILE}" | while read -r pattern; do
			[[ -z "${pattern}" ]] && continue
			is_allowed_playwright_path "${pattern}" || continue
			base="$(basename "${pattern}" .ply.js)"
			if [[ "${base}" == *.* ]]; then
				echo "${base#*.}"
			else
				echo "${GENERAL_CATEGORY}"
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
