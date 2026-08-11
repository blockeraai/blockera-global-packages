#!/usr/bin/env bash
# Run PHPUnit only for theme packages ending with -one / blockera-one-*.
#
# Optional env:
#   BLOCKERA_PHP_UNIT_ONE_LIST_CMD   default: node packages/global-packages/.../list-phpunit-one-test-dirs.js
#   BLOCKERA_PHP_UNIT_ONE_ENV_CWD    default: wp-content/themes/blockera-one
#   BLOCKERA_PHP_UNIT_ONE_PREPEND    PHPUnit --prepend file (ABSPATH before Composer autoload)
set -euo pipefail

LIST_CMD="${BLOCKERA_PHP_UNIT_ONE_LIST_CMD:-node packages/global-packages/packages/dev-tools/github/scripts/list-phpunit-one-test-dirs.js}"
ENV_CWD="${BLOCKERA_PHP_UNIT_ONE_ENV_CWD:-wp-content/themes/blockera-one}"
PREPEND="${BLOCKERA_PHP_UNIT_ONE_PREPEND:-packages/blockera-one/php/tests/prepend-abspath.php}"

dirs=()
while IFS= read -r dir; do
	[[ -z "${dir}" ]] && continue
	dirs+=("${dir}")
done < <(eval "${LIST_CMD}")

if [[ "${#dirs[@]}" -eq 0 ]]; then
	echo "run-phpunit-one-units: no PHPUnit tests under packages/*-one or packages/blockera-one-*; skipping."
	exit 0
fi

echo "run-phpunit-one-units: running for -one package dirs:"
printf '  %s\n' "${dirs[@]}"

# Use --testsuite (not bare directory args): PHPUnit loads path arguments before
# phpunit.xml bootstrap, which breaks WP test base classes (AppTestCase).
# Theme phpunit.xml.dist `units` suite is already scoped to *-one packages.
#
# --prepend MUST come before -c: PHPUnit's bin uses getopt('', ['prepend:']) which
# stops at the first unknown option (-c), so a trailing --prepend is ignored and
# Composer-autoloaded functions.php exits before tests run.
phpunit_args=()
if [[ -n "${PREPEND}" && -f "${PREPEND}" ]]; then
	echo "run-phpunit-one-units: --prepend ${PREPEND}"
	phpunit_args+=( --prepend "${PREPEND}" )
fi
phpunit_args+=( -c phpunit.xml.dist --verbose --testsuite units )

# `--` so wp-env does not swallow PHPUnit flags like --prepend.
wp-env run --env-cwd="${ENV_CWD}" tests-wordpress -- \
	vendor/bin/phpunit "${phpunit_args[@]}"
