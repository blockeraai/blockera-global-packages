#!/usr/bin/env bash
# Copy bootstrap CI scripts from this shared package into a consumer repo.
#
# Bootstrap scripts must live in the consumer (submodule is not available until
# ensure-global-packages-sparse.sh runs). Everything else is used in-place from:
#   packages/global-packages/packages/dev-tools/github/
#
# Usage (from consumer root, after submodule init):
#   bash packages/global-packages/packages/dev-tools/github/scripts/sync-consumer-bootstrap.sh
#   bash packages/global-packages/packages/dev-tools/github/scripts/sync-consumer-bootstrap.sh /path/to/consumer
set -euo pipefail

CONSUMER_ROOT="${1:-$(pwd)}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEST="${CONSUMER_ROOT}/.github/scripts"

mkdir -p "${DEST}"

BOOTSTRAP_SCRIPTS=(
	ensure-global-packages-sparse.sh
	ensure-global-packages-pre-push.sh
	ensure-global-packages-mirror-branch.sh
	bump-global-packages-submodule.sh
	retry-npm-ci.sh
)

for name in "${BOOTSTRAP_SCRIPTS[@]}"; do
	src="${SCRIPT_DIR}/${name}"
	if [ ! -f "${src}" ]; then
		echo "sync-consumer-bootstrap: missing ${src}" >&2
		exit 1
	fi
	cp "${src}" "${DEST}/${name}"
	chmod +x "${DEST}/${name}"
	echo "synced ${name}"
done

echo "sync-consumer-bootstrap: OK → ${DEST}"
