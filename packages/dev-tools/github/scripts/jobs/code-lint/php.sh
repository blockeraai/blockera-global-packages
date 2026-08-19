#!/usr/bin/env bash
# Run PHP coding standards (PHPCS) for a Blockera consumer.
#
# Defaults:
#   BLOCKERA_PHPCS_CMD=phpcs --report-full --report-checkstyle=./.cache/phpcs-report.xml --standard=phpcs.xml
#   BLOCKERA_PHPCS_REPORT=./.cache/phpcs-report.xml
#   BLOCKERA_COMPOSER_POLICY_LABEL=code-lint/php
#
# On PHPCS failure, prints annotations via cs2pr when available, then exits non-zero.
# Fails if non-composer version-controlled files were modified (setup-php may rewrite composer files).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../../lib/verify-setup-php-composer-policy.sh
source "${SCRIPT_DIR}/../../lib/verify-setup-php-composer-policy.sh"

CMD="${BLOCKERA_PHPCS_CMD:-phpcs --report-full --report-checkstyle=./.cache/phpcs-report.xml --standard=phpcs.xml}"
REPORT="${BLOCKERA_PHPCS_REPORT:-./.cache/phpcs-report.xml}"
export BLOCKERA_COMPOSER_POLICY_LABEL="${BLOCKERA_COMPOSER_POLICY_LABEL:-code-lint/php}"

export PATH="${PWD}/vendor/bin:${PATH}"
mkdir -p .cache

echo "code-lint/php: ${CMD}"
set +e
eval "${CMD}"
status=$?
set -e

if [[ "${status}" -ne 0 ]]; then
	if command -v cs2pr >/dev/null 2>&1 && [[ -f "${REPORT}" ]]; then
		cs2pr "${REPORT}" || true
	fi
	exit "${status}"
fi

echo "code-lint/php: ensuring version-controlled files were not modified"
# setup-php rewrites composer.json (platform.php, drop wp-cli) and composer.lock
# before install; exclude those CI-only files from the PHPCS cleanliness check.
if ! git diff --exit-code -- . ':(exclude)composer.json' ':(exclude)composer.lock'; then
	exit 1
fi

echo "code-lint/php: verifying composer files match setup-php CI policy"
verify_setup_php_composer_policy
