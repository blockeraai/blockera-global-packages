#!/usr/bin/env bash
# wp-env CI images ship WP-CLI globally (/usr/local/bin/wp). Drop any Composer
# copy so plugin autoloaders cannot redeclare cli\* symbols from vendor/wp-cli/*.
#
# Intended after setup-php strips wp-cli from composer.json/lock and installs deps.
# Composer caches may restore vendor/wp-cli and stale autoload maps; reconcile once.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=strip-wp-cli-composer-files.sh
source "${SCRIPT_DIR}/strip-wp-cli-composer-files.sh"

COMPOSER_INSTALL_OPTS="${BLOCKERA_COMPOSER_INSTALL_OPTS:--o --apcu-autoloader -a}"

autoload_references_wp_cli() {
	[[ -f vendor/composer/autoload_files.php ]] && grep -Fq '/wp-cli/' vendor/composer/autoload_files.php
}

strip_wp_cli_composer_files

removed=false

if [[ -d vendor/wp-cli ]]; then
	echo "remove-wp-cli-vendor: removing vendor/wp-cli"
	rm -rf vendor/wp-cli
	removed=true
fi

if [[ -e vendor/bin/wp ]]; then
	echo "remove-wp-cli-vendor: removing vendor/bin/wp"
	rm -f vendor/bin/wp
	removed=true
fi

if [[ "${removed}" == "true" ]] || autoload_references_wp_cli; then
	if lock_has_wp_cli_bundle; then
		echo "remove-wp-cli-vendor: refusing composer install while lock lists wp-cli/wp-cli-bundle" >&2
		exit 1
	fi
	echo "remove-wp-cli-vendor: reconciling vendor/autoload with lock (composer install --no-cache)"
	# Intentional word-splitting for composer option flags.
	# shellcheck disable=SC2086
	composer install --no-interaction --no-cache ${COMPOSER_INSTALL_OPTS}
	exit 0
fi

echo "remove-wp-cli-vendor: nothing to remove"
