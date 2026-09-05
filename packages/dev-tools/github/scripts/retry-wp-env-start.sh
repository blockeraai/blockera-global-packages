#!/usr/bin/env bash
# wp-env Docker builds hit transient registry errors: Alpine `apk add` against
# dl-cdn.alpinelinux.org, and Debian `apt-get install` 404s when a cached layer
# still points at an old debian-security package. Retries `run-wp-env-start.js`
# (apt-get update injected into generated WordPress Dockerfiles).
set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RETRY_SH="${SCRIPT_DIR}/lib/retry.sh"

if [[ ! -f "${RETRY_SH}" ]]; then
	echo "retry-wp-env-start: missing ${RETRY_SH}" >&2
	exit 1
fi

bash "${RETRY_SH}" \
	--max "${WP_ENV_START_RETRIES:-4}" \
	--delay "${WP_ENV_START_RETRY_DELAY_SEC:-20}" \
	--label "wp-env start" \
	-- node "${SCRIPT_DIR}/run-wp-env-start.js"
