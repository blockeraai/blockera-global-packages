#!/usr/bin/env bash
# Format a human release name from NEW_VERSION (e.g. 1.2.3-rc.1 → 1.2.3 RC1 style).
#
# Required env:
#   NEW_VERSION  (or VERSION)
set -euo pipefail

if [[ -z "${GITHUB_OUTPUT:-}" ]]; then
	echo "build-zip/release-name: GITHUB_OUTPUT is unset" >&2
	exit 1
fi

VERSION="${NEW_VERSION:-${VERSION:-}}"
if [[ -z "${VERSION}" ]]; then
	echo "build-zip/release-name: NEW_VERSION is required" >&2
	exit 1
fi

FORMATTED="$(echo "${VERSION}" | cut -d / -f 3 | sed 's/-rc./ RC/')"
echo "version=${FORMATTED}" >>"${GITHUB_OUTPUT}"
echo "build-zip/release-name: ${FORMATTED}"
