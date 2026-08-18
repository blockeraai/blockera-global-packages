#!/usr/bin/env bash
# Drop wp-cli/wp-cli-bundle from composer.json and composer.lock without installing.
# Used by setup-php (before composer install) and remove-wp-cli-vendor (safety net).
#
# Uses jq only — never composer remove/update here. Composer resolution during strip
# can fail when platform.php differs from the lock (e.g. PHP 8.1 matrix + lcobucci/jwt 3.x).
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

strip_wp_cli_from_lock_jq() {
	local tmp
	tmp=$(mktemp)
	jq '
		if .["packages-dev"] then
			.["packages-dev"] = [ .["packages-dev"][] | select(.name | test("^wp-cli/") | not) ]
		else . end
	' composer.lock >"$tmp"
	mv "$tmp" composer.lock
}

strip_wp_cli_composer_files() {
	if json_has_wp_cli_bundle; then
		echo "strip-wp-cli-composer-files: removing wp-cli/wp-cli-bundle from composer.json"
		strip_wp_cli_from_json_jq
	fi

	if lock_has_wp_cli_bundle; then
		echo "strip-wp-cli-composer-files: pruning wp-cli packages from composer.lock"
		strip_wp_cli_from_lock_jq
	fi

	if json_has_wp_cli_bundle || lock_has_wp_cli_bundle; then
		echo "strip-wp-cli-composer-files: wp-cli/wp-cli-bundle is still present in composer files" >&2
		return 1
	fi

	return 0
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
	strip_wp_cli_composer_files
fi
