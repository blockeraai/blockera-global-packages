#!/usr/bin/env bash
# Gate PR workflows via .pr-workflows.json → allowedActions (workflow filenames).
# Writes run=true|false to GITHUB_OUTPUT.
#
# Overrides:
#   BLOCKERA_PR_WORKFLOWS_FILE   config path (default: .pr-workflows.json)
#   BLOCKERA_PR_WORKFLOW_FILE    current workflow filename (required on pull_request)
#   BLOCKERA_PR_WORKFLOWS_FORCE  true → always run
set -euo pipefail

CONFIG_FILE="${BLOCKERA_PR_WORKFLOWS_FILE:-.pr-workflows.json}"
WORKFLOW_FILE="${BLOCKERA_PR_WORKFLOW_FILE:-}"

if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
	out() { echo "$1" >>"${GITHUB_OUTPUT}"; }
else
	out() { :; }
fi

set_run() {
	local value="$1"
	echo "pr-workflows/should-run: workflow=${WORKFLOW_FILE:-<unset>} run=${value}"
	out "run=${value}"
}

if [[ "${BLOCKERA_PR_WORKFLOWS_FORCE:-false}" == "true" ]]; then
	set_run true
	exit 0
fi

EVENT_NAME="${GITHUB_EVENT_NAME:-}"
if [[ "${EVENT_NAME}" != "pull_request" && "${EVENT_NAME}" != "pull_request_target" ]]; then
	set_run true
	exit 0
fi

if [[ -z "${WORKFLOW_FILE}" ]]; then
	echo "pr-workflows/should-run: BLOCKERA_PR_WORKFLOW_FILE is required on pull_request" >&2
	exit 1
fi

if [[ ! -f "${CONFIG_FILE}" ]]; then
	echo "pr-workflows/should-run: no ${CONFIG_FILE}; running all workflows"
	set_run true
	exit 0
fi

GATE_EXIT=0
export BLOCKERA_PR_WORKFLOWS_FILE="${CONFIG_FILE}"
export BLOCKERA_PR_WORKFLOW_FILE="${WORKFLOW_FILE}"
python3 - <<'PY' || GATE_EXIT=$?
import json
import os
import sys

config_file = os.environ["BLOCKERA_PR_WORKFLOWS_FILE"]
workflow_file = os.environ["BLOCKERA_PR_WORKFLOW_FILE"]

with open(config_file, encoding="utf-8") as fh:
    data = json.load(fh)

allowed = data.get("allowedActions")
if allowed is None:
    sys.exit(0)

if not isinstance(allowed, list):
    print("pr-workflows/should-run: allowedActions must be an array", file=sys.stderr)
    sys.exit(1)

if not all(isinstance(item, str) for item in allowed):
    print("pr-workflows/should-run: allowedActions items must be strings", file=sys.stderr)
    sys.exit(1)

if workflow_file in allowed:
    sys.exit(0)

sys.exit(2)
PY

case "${GATE_EXIT}" in
	0)
		set_run true
		;;
	2)
		echo "pr-workflows/should-run: ${WORKFLOW_FILE} is not listed in ${CONFIG_FILE} allowedActions"
		set_run false
		;;
	*)
		exit "${GATE_EXIT:-1}"
		;;
esac
