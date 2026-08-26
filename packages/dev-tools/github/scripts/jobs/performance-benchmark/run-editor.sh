#!/usr/bin/env bash
# Run Block Editor suite (+ optional master baseline) and compare gate.
#
# Required env:
#   BLOCKERA_PERF_BASELINE   core|master
#
# Defaults (Blockera base):
#   BLOCKERA_PERF_RUN_EDITOR_CMD           packages/.../performance/scripts/run-editor-benchmarks.sh
#   BLOCKERA_PERF_RUN_EDITOR_MASTER_CMD    packages/.../performance/scripts/run-editor-master-baseline.sh
#   BLOCKERA_PERF_COMPARE_EDITOR_CMD       node tests/performance/compare-editor-results.js
#   BLOCKERA_PERF_RESULTS_DIR              .github/performance/results
set -euo pipefail

PERF_SCRIPTS="${BLOCKERA_PERF_SCRIPTS_DIR:-packages/global-packages/packages/dev-tools/github/performance/scripts}"
BASELINE="${BLOCKERA_PERF_BASELINE:-${PERF_BASELINE:-}}"
if [[ -z "${BASELINE}" ]]; then
	echo "performance/editor: BLOCKERA_PERF_BASELINE is required (core|master)" >&2
	exit 1
fi

RESULTS_DIR="${BLOCKERA_PERF_RESULTS_DIR:-${PERF_RESULTS_DIR:-.github/performance/results}}"
RUN_EDITOR_CMD="${BLOCKERA_PERF_RUN_EDITOR_CMD:-bash ${PERF_SCRIPTS}/run-editor-benchmarks.sh}"
RUN_MASTER_CMD="${BLOCKERA_PERF_RUN_EDITOR_MASTER_CMD:-bash ${PERF_SCRIPTS}/run-editor-master-baseline.sh}"
COMPARE_CMD="${BLOCKERA_PERF_COMPARE_EDITOR_CMD:-node tests/performance/compare-editor-results.js}"
REPORT="${RESULTS_DIR}/editor-report-${BASELINE}.md"
MARKER="<!-- blockera-editor-perf-benchmark-${BASELINE} -->"

out() {
	if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
		echo "$1" >>"${GITHUB_OUTPUT}"
	fi
}

export PERF_CURRENT_PREFIX="${PERF_CURRENT_PREFIX:-blockera-editor}"

if [[ "${BASELINE}" == "core" ]]; then
	export PERF_BASELINE="${PERF_BASELINE:-core}"
	export PERF_BASELINE_PREFIX="${PERF_BASELINE_PREFIX:-core-editor}"
	export PERF_SCENARIO_SCOPE="${PERF_SCENARIO_SCOPE:-core-comparable}"
else
	export PERF_BASELINE="${PERF_BASELINE:-current}"
	export PERF_BASELINE_PREFIX="${PERF_BASELINE_PREFIX:-core-editor}"
	export PERF_SCENARIO_SCOPE="${PERF_SCENARIO_SCOPE:-blockera-only}"
fi

echo "performance/editor: baseline=${BASELINE} scope=${PERF_SCENARIO_SCOPE}"
echo "performance/editor: ${RUN_EDITOR_CMD}"
eval "${RUN_EDITOR_CMD}"

if [[ "${BASELINE}" == "master" ]]; then
	export PERF_SCENARIO_SCOPE=blockera-only
	export PERF_MASTER_REF="${PERF_MASTER_REF:-origin/master}"
	echo "performance/editor: ${RUN_MASTER_CMD}"
	eval "${RUN_MASTER_CMD}"
	export PERF_BASELINE=master
	export PERF_BASELINE_PREFIX=master-editor
fi

export PERF_EDITOR_REPORT_NAME="editor-report-${BASELINE}.md"
export PERF_EDITOR_COMPARE_NAME="editor-compare-${BASELINE}.json"
# compare-editor-results.js expects PERF_BASELINE=core|master for labeling
export PERF_BASELINE="${BASELINE}"

set +e
eval "${COMPARE_CMD}"
code=$?
set -e

if [[ ! -f "${REPORT}" ]]; then
	mkdir -p "${RESULTS_DIR}"
	printf '%s\n' \
		"${MARKER}" \
		"# 📈 Block Editor Performance Report (PR vs ${BASELINE})" \
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
