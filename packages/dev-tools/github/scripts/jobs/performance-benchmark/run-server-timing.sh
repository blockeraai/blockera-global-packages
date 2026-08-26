#!/usr/bin/env bash
# Run Server-Timing suite + compare gate. Writes has_report to GITHUB_OUTPUT.
#
# Defaults (Blockera base):
#   BLOCKERA_PERF_SETUP_SERVER_TIMING_CMD  packages/.../performance/scripts/setup-server-timing.sh
#   BLOCKERA_PERF_SETUP_CONTENT_CMD        packages/.../performance/scripts/setup-content.sh
#   BLOCKERA_PERF_RUN_BENCHMARKS_CMD       packages/.../performance/scripts/run-benchmarks.sh
#   BLOCKERA_PERF_COMPARE_CMD              node tests/performance/compare-results.js
#   BLOCKERA_PERF_RESULTS_DIR              .github/performance/results
set -euo pipefail

PERF_SCRIPTS="${BLOCKERA_PERF_SCRIPTS_DIR:-packages/global-packages/packages/dev-tools/github/performance/scripts}"
RESULTS_DIR="${BLOCKERA_PERF_RESULTS_DIR:-${PERF_RESULTS_DIR:-.github/performance/results}}"
SETUP_ST_CMD="${BLOCKERA_PERF_SETUP_SERVER_TIMING_CMD:-bash ${PERF_SCRIPTS}/setup-server-timing.sh}"
SETUP_CONTENT_CMD="${BLOCKERA_PERF_SETUP_CONTENT_CMD:-bash ${PERF_SCRIPTS}/setup-content.sh}"
RUN_CMD="${BLOCKERA_PERF_RUN_BENCHMARKS_CMD:-bash ${PERF_SCRIPTS}/run-benchmarks.sh}"
COMPARE_CMD="${BLOCKERA_PERF_COMPARE_CMD:-node tests/performance/compare-results.js}"
REPORT="${RESULTS_DIR}/report.md"

out() {
	if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
		echo "$1" >>"${GITHUB_OUTPUT}"
	fi
}

echo "performance/server-timing: ${SETUP_ST_CMD}"
eval "${SETUP_ST_CMD}"

echo "performance/server-timing: ${SETUP_CONTENT_CMD}"
eval "${SETUP_CONTENT_CMD}"

echo "performance/server-timing: ${RUN_CMD}"
eval "${RUN_CMD}"

set +e
eval "${COMPARE_CMD}"
code=$?
set -e

if [[ ! -f "${REPORT}" ]]; then
	mkdir -p "${RESULTS_DIR}"
	printf '%s\n' \
		'<!-- blockera-perf-benchmark -->' \
		'# 📈 Server-Timing Performance Report' \
		'' \
		'_Compare step failed before writing a full report. Check workflow logs/artifacts._' \
		'' >"${REPORT}"
fi

if [[ -n "${GITHUB_STEP_SUMMARY:-}" && -f "${REPORT}" ]]; then
	cat "${REPORT}" >>"${GITHUB_STEP_SUMMARY}"
fi

out "has_report=true"
out "report_path=${REPORT}"
out "compare_outcome=$([ "${code}" -eq 0 ] && echo success || echo failure)"
exit "${code}"
