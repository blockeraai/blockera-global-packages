#!/usr/bin/env bash
# Drop wp-cli/wp-cli-bundle from composer.json and composer.lock without installing.
# Used by setup-php (before composer install) and remove-wp-cli-vendor (safety net).
set -euo pipefail

json_has_wp_cli_bundle() {
	[[ -f composer.json ]] && jq -e '.["require-dev"]["wp-cli/wp-cli-bundle"]' composer.json >/dev/null 2>&1
}

lock_has_wp_cli_bundle() {
	[[ -f composer.lock ]] && grep -Fq '"name": "wp-cli/wp-cli-bundle"' composer.lock
}

strip_wp_cli_composer_files() {
	if json_has_wp_cli_bundle; then
		echo "strip-wp-cli-composer-files: removing wp-cli/wp-cli-bundle from composer files"
		composer remove wp-cli/wp-cli-bundle --dev --no-install
		if [[ -f composer.lock ]]; then
			composer update --lock
		fi
		return 0
	fi

	if lock_has_wp_cli_bundle; then
		echo "strip-wp-cli-composer-files: composer.lock still lists wp-cli/wp-cli-bundle but composer.json does not" >&2
		return 1
	fi

	return 0
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
	strip_wp_cli_composer_files
fi
