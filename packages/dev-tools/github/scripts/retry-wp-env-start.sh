#!/usr/bin/env bash
# wp-env Docker builds pull Alpine indexes during `apk add`; dl-cdn.alpinelinux.org
# occasionally returns transient errors in CI, which surfaces as "no such package".
set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

bash "${SCRIPT_DIR}/lib/retry.sh" \
	--max "${WP_ENV_START_RETRIES:-4}" \
	--delay "${WP_ENV_START_RETRY_DELAY_SEC:-20}" \
	--label "wp-env start" \
	-- npm run env:start
