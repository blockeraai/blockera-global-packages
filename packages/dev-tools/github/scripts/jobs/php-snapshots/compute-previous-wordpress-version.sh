#!/usr/bin/env bash
# Resolve the previous stable WordPress series version for matrix includes.
# Writes previous-wordpress-version=<x.y.z> to GITHUB_OUTPUT.
set -euo pipefail

API_URL="${BLOCKERA_PHP_SNAPSHOTS_WP_STABLE_API:-http://api.wordpress.org/core/stable-check/1.0/}"
TMP="$(mktemp)"

curl -fsS -H "Accept: application/json" -o "${TMP}" "${API_URL}"

LATEST_WP_VERSION="$(jq --raw-output 'with_entries(select(.value=="latest"))|keys[]' "${TMP}")"
IFS='.' read -r LATEST_WP_MAJOR LATEST_WP_MINOR LATEST_WP_PATCH <<<"${LATEST_WP_VERSION}"

if [[ "${LATEST_WP_MINOR}" == "0" ]]; then
	PREVIOUS_WP_SERIES="$((LATEST_WP_MAJOR - 1)).9"
else
	PREVIOUS_WP_SERIES="${LATEST_WP_MAJOR}.$((LATEST_WP_MINOR - 1))"
fi

PREVIOUS_WP_VERSION="$(
	jq --raw-output --arg series "${PREVIOUS_WP_SERIES}" \
		'with_entries(select(.key|startswith($series)))|keys[-1]' "${TMP}"
)"

rm -f "${TMP}"

echo "previous-wordpress-version=${PREVIOUS_WP_VERSION}"
if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
	echo "previous-wordpress-version=${PREVIOUS_WP_VERSION}" >>"${GITHUB_OUTPUT}"
fi
