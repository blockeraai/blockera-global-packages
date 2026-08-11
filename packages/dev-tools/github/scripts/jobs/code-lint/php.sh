#!/usr/bin/env bash
# Run PHP coding standards (PHPCS) for a Blockera consumer.
#
# Defaults:
#   BLOCKERA_PHPCS_CMD=phpcs --report-full --report-checkstyle=./.cache/phpcs-report.xml --standard=phpcs.xml
#   BLOCKERA_PHPCS_REPORT=./.cache/phpcs-report.xml
#
# On PHPCS failure, prints annotations via cs2pr when available, then exits non-zero.
# Always fails if version-controlled files were modified during the run.
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
git diff --exit-code
