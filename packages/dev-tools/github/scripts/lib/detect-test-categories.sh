#!/usr/bin/env bash
# Detect CI matrix categories and write categories=<json> to GITHUB_OUTPUT.
#
# Required:
#   BLOCKERA_DETECT_LIST_CMD     node …/list-test-categories.js …
# Optional:
#   BLOCKERA_DETECT_PR_ENV_FILE  when the file exists, append --pr-env
#   BLOCKERA_DETECT_LOG_LABEL    default: detect-test-categories
set -euo pipefail

LIST_CMD="${BLOCKERA_DETECT_LIST_CMD:-}"
PR_ENV_FILE="${BLOCKERA_DETECT_PR_ENV_FILE:-}"
LOG_LABEL="${BLOCKERA_DETECT_LOG_LABEL:-detect-test-categories}"

if [[ -z "${LIST_CMD}" ]]; then
	echo "${LOG_LABEL}: BLOCKERA_DETECT_LIST_CMD is required" >&2
	exit 1
fi

if [[ -z "${GITHUB_OUTPUT:-}" ]]; then
	echo "${LOG_LABEL}: GITHUB_OUTPUT is unset" >&2
	exit 1
fi

if [[ -n "${PR_ENV_FILE}" && -f "${PR_ENV_FILE}" ]]; then
	echo "${LOG_LABEL}: filtering via ${PR_ENV_FILE}"
	categories="$(eval "${LIST_CMD} --pr-env \"${PR_ENV_FILE}\"")"
else
	echo "${LOG_LABEL}: ${LIST_CMD}"
	categories="$(eval "${LIST_CMD}")"
fi

categories_json="$(echo "${categories}" | jq -c '.')"
echo "categories=${categories_json}" >>"${GITHUB_OUTPUT}"
echo "Detected categories: ${categories_json}"
