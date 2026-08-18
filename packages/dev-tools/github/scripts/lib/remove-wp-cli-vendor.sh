#!/usr/bin/env bash
# wp-env CI images ship WP-CLI globally (/usr/local/bin/wp). Drop any Composer
# copy so plugin autoloaders cannot redeclare cli\* symbols from vendor/wp-cli/*.
#
# Intended after setup-php strips wp-cli from composer.json/lock and installs deps;
# composer caches may still restore vendor/wp-cli from an older lock snapshot.
set -euo pipefail

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

if [[ "${removed}" == "false" ]]; then
	echo "remove-wp-cli-vendor: nothing to remove"
fi
