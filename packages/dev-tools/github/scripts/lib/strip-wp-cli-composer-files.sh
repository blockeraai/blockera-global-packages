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

strip_wp_cli_from_lock_jq() {
	local tmp
	tmp=$(mktemp)
	jq '
		if .["packages-dev"] then
			.packages-dev = [ .packages-dev[] | select(.name | test("^wp-cli/") | not) ]
		else . end
	' composer.lock >"$tmp"
	mv "$tmp" composer.lock
}

strip_wp_cli_composer_files() {
	if json_has_wp_cli_bundle; then
		echo "strip-wp-cli-composer-files: removing wp-cli/wp-cli-bundle from composer files"
		# --no-install updates json + lock only. Do not run composer update --lock here:
		# it can trigger a full install/resolution pass before ramsey/composer-install.
		composer remove wp-cli/wp-cli-bundle --dev --no-install || true
	fi

	if lock_has_wp_cli_bundle; then
		if json_has_wp_cli_bundle; then
			echo "strip-wp-cli-composer-files: composer remove did not drop wp-cli/wp-cli-bundle from composer files" >&2
			return 1
		fi
		echo "strip-wp-cli-composer-files: pruning wp-cli packages from composer.lock"
		strip_wp_cli_from_lock_jq
	fi

	if lock_has_wp_cli_bundle; then
		echo "strip-wp-cli-composer-files: composer.lock still lists wp-cli/wp-cli-bundle" >&2
		return 1
	fi

	return 0
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
	strip_wp_cli_composer_files
fi
