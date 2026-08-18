#!/usr/bin/env bash
# wp-env CI images ship WP-CLI globally (/usr/local/bin/wp). Drop any Composer
# copy so plugin autoloaders cannot redeclare cli\* symbols from vendor/wp-cli/*.
#
# Intended after setup-php strips wp-cli from composer.json/lock and installs deps.
# Composer caches may restore vendor/wp-cli and stale autoload maps; reconcile once.
set -euo pipefail

COMPOSER_INSTALL_OPTS="${BLOCKERA_COMPOSER_INSTALL_OPTS:--o --apcu-autoloader -a}"

lock_has_wp_cli_bundle() {
	[[ -f composer.lock ]] && rg -q '"name": "wp-cli/wp-cli-bundle"' composer.lock
}

autoload_references_wp_cli() {
	[[ -f vendor/composer/autoload_files.php ]] && rg -q '/wp-cli/' vendor/composer/autoload_files.php
}

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

if lock_has_wp_cli_bundle; then
	if [[ "${removed}" == "true" ]]; then
		echo "remove-wp-cli-vendor: wp-cli/wp-cli-bundle still listed in composer.lock; skipping reconcile" >&2
	fi
	exit 0
fi

if [[ "${removed}" == "true" ]] || autoload_references_wp_cli; then
	echo "remove-wp-cli-vendor: reconciling vendor/autoload with lock (composer install --no-cache)"
	# Intentional word-splitting for composer option flags.
	# shellcheck disable=SC2086
	composer install --no-interaction --no-cache ${COMPOSER_INSTALL_OPTS}
	exit 0
fi

echo "remove-wp-cli-vendor: nothing to remove"
