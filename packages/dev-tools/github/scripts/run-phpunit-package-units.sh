#!/usr/bin/env bash
# Run PHPUnit for package test dirs discovered by list-phpunit-package-test-dirs.js.
#
# Optional env:
#   BLOCKERA_PHP_UNIT_PACKAGE_LIST_CMD  default: node …/list-phpunit-package-test-dirs.js
#   BLOCKERA_PHPUNIT_PACKAGE_SUFFIX / _PREFIX / _NAMES  forwarded to the list script
#   BLOCKERA_PHP_UNIT_PACKAGE_ENV_CWD   default: .
#   BLOCKERA_PHP_UNIT_PACKAGE_PREPEND   PHPUnit --prepend file
set -euo pipefail

LIST_CMD="${BLOCKERA_PHP_UNIT_PACKAGE_LIST_CMD:-node packages/global-packages/packages/dev-tools/github/scripts/list-phpunit-package-test-dirs.js}"
ENV_CWD="${BLOCKERA_PHP_UNIT_PACKAGE_ENV_CWD:-.}"
PREPEND="${BLOCKERA_PHP_UNIT_PACKAGE_PREPEND:-}"

dirs=()
while IFS= read -r dir; do
	[[ -z "${dir}" ]] && continue
	dirs+=("${dir}")
done < <(eval "${LIST_CMD}")

if [[ "${#dirs[@]}" -eq 0 ]]; then
	echo "run-phpunit-package-units: no PHPUnit test dirs matched; skipping."
	exit 0
fi

echo "run-phpunit-package-units: running for package dirs:"
printf '  %s\n' "${dirs[@]}"

phpunit_args=()
if [[ -n "${PREPEND}" && -f "${PREPEND}" ]]; then
	echo "run-phpunit-package-units: --prepend ${PREPEND}"
	phpunit_args+=( --prepend "${PREPEND}" )
fi
phpunit_args+=( -c phpunit.xml.dist --verbose --testsuite units )

wp-env run --env-cwd="${ENV_CWD}" tests-wordpress -- \
	vendor/bin/phpunit "${phpunit_args[@]}"
