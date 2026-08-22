#!/usr/bin/env bash
# @deprecated Use run-phpunit-package-units.sh and set BLOCKERA_PHPUNIT_PACKAGE_* on the consumer.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec bash "${SCRIPT_DIR}/run-phpunit-package-units.sh"
