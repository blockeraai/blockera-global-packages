#!/usr/bin/env bash
# npm registry downloads occasionally time out in CI (ETIMEDOUT).
set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

npm config set fetch-retries 5
npm config set fetch-retry-mintimeout 20000
npm config set fetch-retry-maxtimeout 120000

bash "${SCRIPT_DIR}/lib/retry.sh" \
	--max "${NPM_CI_RETRIES:-4}" \
	--delay "${NPM_CI_RETRY_DELAY_SEC:-30}" \
	--label "npm ci" \
	-- npm ci --legacy-peer-deps --prefer-offline --no-audit
