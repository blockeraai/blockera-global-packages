#!/usr/bin/env bash
# Decide whether bundle-size should run for this event.
# Writes run=true|false to GITHUB_OUTPUT (and prints the value).
#
# Defaults: scripts/jobs/bundle-size/paths.default (Blockera base).
#
# Overrides:
#   BLOCKERA_BUNDLE_SIZE_PATHS_FILE  path to a newline-delimited patterns file
#   BLOCKERA_BUNDLE_SIZE_PATHS       newline-delimited patterns (wins over file)
#   BLOCKERA_BUNDLE_SIZE_FORCE       true → always run
#   BLOCKERA_BUNDLE_SIZE_BASE_SHA    override base SHA for git diff
#   BLOCKERA_BUNDLE_SIZE_HEAD_SHA    override head SHA for git diff
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEFAULT_PATHS_FILE="${SCRIPT_DIR}/paths.default"

if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
	out() { echo "$1" >>"${GITHUB_OUTPUT}"; }
else
	out() { :; }
fi

set_run() {
	local value="$1"
	echo "bundle-size/should-run: run=${value}"
	out "run=${value}"
}

if [[ "${BLOCKERA_BUNDLE_SIZE_FORCE:-false}" == "true" ]]; then
	set_run true
	exit 0
fi

# Manual / non-PR runs always execute.
EVENT_NAME="${GITHUB_EVENT_NAME:-}"
if [[ "${EVENT_NAME}" != "pull_request" && "${EVENT_NAME}" != "pull_request_target" ]]; then
	set_run true
	exit 0
fi

PATHS_FILE="${BLOCKERA_BUNDLE_SIZE_PATHS_FILE:-${DEFAULT_PATHS_FILE}}"
PATHS_BLOB="${BLOCKERA_BUNDLE_SIZE_PATHS:-}"

if [[ -n "${PATHS_BLOB}" ]]; then
	PATTERNS_FILE="$(mktemp)"
	printf '%s\n' "${PATHS_BLOB}" >"${PATTERNS_FILE}"
	trap 'rm -f "${PATTERNS_FILE}"' EXIT
elif [[ -f "${PATHS_FILE}" ]]; then
	PATTERNS_FILE="${PATHS_FILE}"
else
	echo "bundle-size/should-run: missing paths file: ${PATHS_FILE}" >&2
	exit 1
fi

BASE_SHA="${BLOCKERA_BUNDLE_SIZE_BASE_SHA:-}"
HEAD_SHA="${BLOCKERA_BUNDLE_SIZE_HEAD_SHA:-${GITHUB_SHA:-}}"

if [[ -z "${BASE_SHA}" && -n "${GITHUB_EVENT_PATH:-}" && -f "${GITHUB_EVENT_PATH}" ]]; then
	BASE_SHA="$(jq -r '.pull_request.base.sha // empty' "${GITHUB_EVENT_PATH}")"
	if [[ -z "${HEAD_SHA}" || "${HEAD_SHA}" == "null" ]]; then
		HEAD_SHA="$(jq -r '.pull_request.head.sha // empty' "${GITHUB_EVENT_PATH}")"
	fi
fi

if [[ -z "${BASE_SHA}" || -z "${HEAD_SHA}" || "${BASE_SHA}" == "null" || "${HEAD_SHA}" == "null" ]]; then
	echo "bundle-size/should-run: missing base/head SHA; running by default"
	set_run true
	exit 0
fi

# Ensure both commits exist locally when checkout was shallow.
git fetch --no-tags --prune --depth=1 origin "${BASE_SHA}" "${HEAD_SHA}" 2>/dev/null || true

CHANGED="$(git diff --name-only "${BASE_SHA}" "${HEAD_SHA}" || true)"
if [[ -z "${CHANGED}" ]]; then
	echo "bundle-size/should-run: no changed files"
	set_run false
	exit 0
fi

MATCHED="$(
	PATHS_FILE="${PATTERNS_FILE}" CHANGED_FILES="${CHANGED}" python3 - <<'PY'
import fnmatch
import os
import sys

patterns = []
with open(os.environ["PATHS_FILE"], encoding="utf-8") as fh:
    for raw in fh:
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        patterns.append(line)

files = [f for f in os.environ.get("CHANGED_FILES", "").splitlines() if f]
if not patterns or not files:
    sys.exit(0)

def matches(path: str, pattern: str) -> bool:
    # GitHub Actions path filters treat leading "**." like any-depth suffix match.
    candidates = {pattern}
    if pattern.startswith("**/"):
        candidates.add(pattern[3:])
    if pattern.startswith("**."):
        candidates.add("*." + pattern[3:])
        candidates.add("**/*." + pattern[3:])
    if "/" not in pattern and "*" in pattern:
        candidates.add("**/" + pattern)
    return any(fnmatch.fnmatch(path, cand) for cand in candidates)

for path in files:
    for pattern in patterns:
        if matches(path, pattern):
            print(path)
            sys.exit(0)
PY
)"

if [[ -n "${MATCHED}" ]]; then
	echo "bundle-size/should-run: matched '${MATCHED}'"
	set_run true
else
	echo "bundle-size/should-run: no path matches defaults"
	set_run false
fi
