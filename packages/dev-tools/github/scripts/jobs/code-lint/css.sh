#!/usr/bin/env bash
# Run CSS/SCSS coding standards for a Blockera consumer.
#
# Defaults:
#   BLOCKERA_LINT_CSS_CMD=npm run lint:css
#   BLOCKERA_SCSS_ROOT=./packages
#   BLOCKERA_SCSS_GLOB=*.scss
#
# Skips the lint command when no matching SCSS files are found.
set -euo pipefail

CMD="${BLOCKERA_LINT_CSS_CMD:-npm run lint:css}"
SCSS_ROOT="${BLOCKERA_SCSS_ROOT:-./packages}"
SCSS_GLOB="${BLOCKERA_SCSS_GLOB:-*.scss}"

count="$(find "${SCSS_ROOT}" -name "${SCSS_GLOB}" 2>/dev/null | wc -l | tr -d ' ')"
if [[ "${count}" == "0" ]]; then
	echo "code-lint/css: no files matching ${SCSS_ROOT}/**/${SCSS_GLOB}; skipping"
	exit 0
fi

echo "code-lint/css: ${count} file(s); ${CMD}"
eval "${CMD}"
