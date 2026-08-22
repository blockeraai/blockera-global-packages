#!/usr/bin/env bash
# Drop wp-cli/wp-cli-bundle from composer.json and composer.lock without installing.
# Used by setup-php (before composer install) and remove-wp-cli-vendor (safety net).
#
# setup-php runs this before platform.php is overridden so composer remove --no-install
# resolves against the lock's default platform. Do not jq-prune composer.lock: removing
# wp-cli/* entries without their transitive deps orphans packages like composer/composer.
set -euo pipefail

json_has_wp_cli_bundle() {
	[[ -f composer.json ]] && jq -e '.["require-dev"]["wp-cli/wp-cli-bundle"]' composer.json >/dev/null 2>&1
}

lock_has_wp_cli_bundle() {
	[[ -f composer.lock ]] && grep -Fq '"name": "wp-cli/wp-cli-bundle"' composer.lock
}

strip_wp_cli_from_json_jq() {
	local tmp
	tmp=$(mktemp)
	jq 'del(.["require-dev"]["wp-cli/wp-cli-bundle"])' composer.json >"$tmp"
	mv "$tmp" composer.json
}

strip_wp_cli_composer_files() {
	if ! json_has_wp_cli_bundle && ! lock_has_wp_cli_bundle; then
		return 0
	fi

	echo "strip-wp-cli-composer-files: removing wp-cli/wp-cli-bundle from composer files"

	if json_has_wp_cli_bundle; then
		# composer remove may print "Removal failed" and exit non-zero even after updating the lock.
		composer remove wp-cli/wp-cli-bundle --dev --no-install || true
	fi

	if json_has_wp_cli_bundle; then
		echo "strip-wp-cli-composer-files: retrying composer remove with --ignore-platform-reqs"
		composer remove wp-cli/wp-cli-bundle --dev --no-install --ignore-platform-reqs || true
	fi

	if json_has_wp_cli_bundle; then
		echo "strip-wp-cli-composer-files: stripping wp-cli/wp-cli-bundle from composer.json with jq"
		strip_wp_cli_from_json_jq
	fi

	if lock_has_wp_cli_bundle; then
		echo "strip-wp-cli-composer-files: syncing composer.lock after json strip"
		composer remove wp-cli/wp-cli-bundle --dev --no-install --ignore-platform-reqs || true
	fi

	if json_has_wp_cli_bundle || lock_has_wp_cli_bundle; then
		echo "strip-wp-cli-composer-files: failed to remove wp-cli/wp-cli-bundle from composer files" >&2
		return 1
	fi

	return 0
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
	strip_wp_cli_composer_files
fi
