#!/usr/bin/env bash
# Husky pre-commit: TypeScript and Flow when JS/TS is staged.
# Types depend on the whole program, so this is not lint-staged per-file.
#
# Skip: BLOCKERA_SKIP_TYPECHECK=1
set -euo pipefail

if [ "${BLOCKERA_SKIP_TYPECHECK:-}" = "1" ]; then
	echo "husky - skipping TypeScript/Flow (BLOCKERA_SKIP_TYPECHECK=1)"
	exit 0
fi

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "${ROOT}"

staged="$(git diff --cached --name-only --diff-filter=ACM || true)"
if ! echo "${staged}" | grep -Eq '\.(ts|tsx|js|jsx)$'; then
	exit 0
fi

if [ -f tsconfig.json ]; then
	echo "husky - TypeScript (tsc --noEmit)"
	npx tsc --noEmit
fi

if [ -f .flowconfig ]; then
	echo "husky - Flow (flow status)"
	npx flow status
fi
