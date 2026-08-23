#!/usr/bin/env bash
# GitHub dist zipballs (api.github.com) occasionally 504 in CI.
#
# Optional env:
#   COMPOSER_CMD                      default: composer install --no-dev -o --apcu-autoloader -a
#   COMPOSER_INSTALL_RETRIES          default: 4
#   COMPOSER_INSTALL_RETRY_DELAY_SEC  default: 20
set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RETRY_SH="${SCRIPT_DIR}/lib/retry.sh"
CMD="${COMPOSER_CMD:-composer install --no-dev -o --apcu-autoloader -a}"

if [[ ! -f "${RETRY_SH}" ]]; then
	echo "retry-composer-install: missing ${RETRY_SH}" >&2
	exit 1
fi

bash "${RETRY_SH}" \
	--max "${COMPOSER_INSTALL_RETRIES:-4}" \
	--delay "${COMPOSER_INSTALL_RETRY_DELAY_SEC:-20}" \
	--label "composer install" \
	-- bash -c "${CMD}"
