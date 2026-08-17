#!/usr/bin/env bash
# wp-env Docker builds pull Alpine indexes during `apk add`; dl-cdn.alpinelinux.org
# occasionally returns transient errors in CI, which surfaces as "no such package".
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
	-- npm run env:start
