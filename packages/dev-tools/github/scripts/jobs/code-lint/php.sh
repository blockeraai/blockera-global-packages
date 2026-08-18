#!/usr/bin/env bash
# Run PHP coding standards (PHPCS) for a Blockera consumer.
#
# Defaults:
#   BLOCKERA_PHPCS_CMD=phpcs --report-full --report-checkstyle=./.cache/phpcs-report.xml --standard=phpcs.xml
#   BLOCKERA_PHPCS_REPORT=./.cache/phpcs-report.xml
#
# On PHPCS failure, prints annotations via cs2pr when available, then exits non-zero.
# Fails if non-composer version-controlled files were modified (setup-php may rewrite composer files).
set -euo pipefail

CMD="${BLOCKERA_PHPCS_CMD:-phpcs --report-full --report-checkstyle=./.cache/phpcs-report.xml --standard=phpcs.xml}"
REPORT="${BLOCKERA_PHPCS_REPORT:-./.cache/phpcs-report.xml}"

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

if [[ -f composer.json ]]; then
	echo "code-lint/php: verifying composer files match setup-php CI policy"
	if jq -e '.["require-dev"]["wp-cli/wp-cli-bundle"]' composer.json >/dev/null 2>&1; then
		echo "code-lint/php: wp-cli/wp-cli-bundle must be absent from composer.json after setup-php" >&2
		exit 1
	fi
	if [[ -f composer.lock ]] && ! composer validate --no-check-publish --quiet; then
		echo "code-lint/php: composer.json and composer.lock are out of sync after setup-php" >&2
		composer validate --no-check-publish || true
		exit 1
	fi
fi

if [[ -f composer.lock ]] && grep -Fq '"name": "wp-cli/wp-cli-bundle"' composer.lock; then
	echo "code-lint/php: wp-cli/wp-cli-bundle must be absent from composer.lock after setup-php" >&2
	exit 1
fi
