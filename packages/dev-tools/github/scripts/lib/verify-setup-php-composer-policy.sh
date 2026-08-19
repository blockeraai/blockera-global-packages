#!/usr/bin/env bash
# Verify composer.json/composer.lock match setup-php CI policy after wp-cli strip.
#
# Optional env:
#   BLOCKERA_COMPOSER_POLICY_LABEL — log prefix (default: verify-setup-php-composer-policy)
#
# Checks:
#   - wp-cli/wp-cli-bundle absent from composer.json and composer.lock
#   - composer.json and composer.lock stay in sync (composer validate)
set -euo pipefail

LABEL="${BLOCKERA_COMPOSER_POLICY_LABEL:-verify-setup-php-composer-policy}"

verify_setup_php_composer_policy() {
	if [[ ! -f composer.json ]]; then
		return 0
	fi

	if jq -e '.["require-dev"]["wp-cli/wp-cli-bundle"]' composer.json >/dev/null 2>&1; then
		echo "${LABEL}: wp-cli/wp-cli-bundle must be absent from composer.json after setup-php" >&2
		return 1
	fi

	if [[ -f composer.lock ]] && grep -Fq '"name": "wp-cli/wp-cli-bundle"' composer.lock; then
		echo "${LABEL}: wp-cli/wp-cli-bundle must be absent from composer.lock after setup-php" >&2
		return 1
	fi

	if [[ -f composer.lock ]] && ! composer validate --no-check-publish --quiet; then
		echo "${LABEL}: composer.json and composer.lock are out of sync after setup-php" >&2
		composer validate --no-check-publish || true
		return 1
	fi

	return 0
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
	verify_setup_php_composer_policy
fi
