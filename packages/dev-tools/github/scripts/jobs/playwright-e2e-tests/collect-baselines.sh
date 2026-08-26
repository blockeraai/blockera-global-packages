#!/usr/bin/env bash
# Copy untracked visual baseline PNGs into artifacts/new-baselines for upload.
#
# Override via env:
#   BLOCKERA_PLAYWRIGHT_BASELINES_GLOB   default: tests/__snapshots__/*.png
#   BLOCKERA_PLAYWRIGHT_BASELINES_DIR    default: artifacts/new-baselines
set -euo pipefail

BASELINES_GLOB="${BLOCKERA_PLAYWRIGHT_BASELINES_GLOB:-tests/__snapshots__/*.png}"
OUT_DIR="${BLOCKERA_PLAYWRIGHT_BASELINES_DIR:-artifacts/new-baselines}"

mkdir -p "${OUT_DIR}"
count=0
while IFS= read -r -d '' f; do
	cp "${f}" "${OUT_DIR}/$(basename "${f}")"
	count=$((count + 1))
done < <(git ls-files -z --others --exclude-standard -- "${BASELINES_GLOB}" 2>/dev/null || true)

echo "playwright-e2e/collect: ${count} new baseline PNG(s) → ${OUT_DIR}/"
