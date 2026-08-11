#!/usr/bin/env bash
# Merge playground JSON, inject zip URL / PR metadata, export demo_url.
#
# Required env:
#   uploaded_zip_file (or BLOCKERA_DEMO_ZIP_URL), PR_NUMBER, RUN_ID
# Optional (Blockera base defaults):
#   BLOCKERA_DEMO_PLAYGROUND_JSON      default: .github-playground.json
#   BLOCKERA_DEMO_PR_PLAYGROUND_JSON   default: .pr-github-playground.json
#   BLOCKERA_DEMO_PLUGIN_STEP_INDEX    default: 2  (pluginData.url step)
#   BLOCKERA_DEMO_BLOGNAME_STEP_INDEX  default: 3
#   BLOCKERA_DEMO_META_TITLE_DEFAULT   default: Blockera Demo
set -euo pipefail

ZIP_URL="${uploaded_zip_file:-${BLOCKERA_DEMO_ZIP_URL:-}}"
: "${ZIP_URL:?uploaded_zip_file or BLOCKERA_DEMO_ZIP_URL is required}"
: "${PR_NUMBER:?PR_NUMBER is required}"
: "${RUN_ID:?RUN_ID is required}"

BASE_JSON_FILE="${BLOCKERA_DEMO_PLAYGROUND_JSON:-.github-playground.json}"
PR_JSON_FILE="${BLOCKERA_DEMO_PR_PLAYGROUND_JSON:-.pr-github-playground.json}"
PLUGIN_STEP="${BLOCKERA_DEMO_PLUGIN_STEP_INDEX:-2}"
BLOGNAME_STEP="${BLOCKERA_DEMO_BLOGNAME_STEP_INDEX:-3}"
META_TITLE_DEFAULT="${BLOCKERA_DEMO_META_TITLE_DEFAULT:-Blockera Demo}"

if [[ ! -f "${BASE_JSON_FILE}" ]]; then
	echo "create-demo/encode-playground: missing ${BASE_JSON_FILE}" >&2
	exit 1
fi

JSON_STRING="$(cat "${BASE_JSON_FILE}")"

if [[ -f "${PR_JSON_FILE}" ]]; then
	PR_JSON="$(cat "${PR_JSON_FILE}")"
	if echo "${PR_JSON}" | jq -e 'has("steps")' >/dev/null; then
		FINAL_JSON="$(echo "${JSON_STRING}" | jq --argjson pr "${PR_JSON}" '. * ($pr | del(.steps)) + {steps: $pr.steps}')"
	else
		FINAL_JSON="$(echo "${JSON_STRING}" | jq --argjson pr "${PR_JSON}" '. * $pr')"
	fi
else
	FINAL_JSON="${JSON_STRING}"
fi

ENCODED_JSON="$(
	echo "${FINAL_JSON}" | jq \
		--arg new_url "${ZIP_URL}" \
		--arg pr_num "${PR_NUMBER}" \
		--arg run_id "${RUN_ID}" \
		--arg meta_default "${META_TITLE_DEFAULT}" \
		--argjson plugin_step "${PLUGIN_STEP}" \
		--argjson blog_step "${BLOGNAME_STEP}" \
		'
			.steps[$plugin_step].pluginData.url = $new_url
			| .steps[$blog_step].options.blogname += (" (PR " + $pr_num + ")")
			| .meta.title = ((.meta.title // $meta_default) + " [" + $run_id + "]")
			| .steps |= map(
					if .step == "defineWpConfigConsts" then
						.consts.BLOCKERA_PLAYGROUND_RUN_ID = $run_id
					else
						.
					end
				)
		'
)"

BASE64_ENCODED_JSON="$(echo "${ENCODED_JSON}" | base64 | tr -d '\n')"
DEMO_URL="https://playground.wordpress.net/?storage=temp&can-save=no#${BASE64_ENCODED_JSON}"

if [[ -n "${GITHUB_ENV:-}" ]]; then
	echo "demo_url=${DEMO_URL}" >>"${GITHUB_ENV}"
fi
echo "demo_url=${DEMO_URL}"
echo "Encoded URL: ${DEMO_URL}"
