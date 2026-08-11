#!/usr/bin/env bash
# Shared root + path defaults for performance scripts.
# Callers must invoke these scripts from the consumer plugin root (or set
# BLOCKERA_PERF_ROOT_DIR / GITHUB_WORKSPACE). Do not walk dirname of this file —
# scripts live under the global-packages submodule.
#
# shellcheck disable=SC2034 # variables are used by sourcing scripts
ROOT_DIR="${BLOCKERA_PERF_ROOT_DIR:-${GITHUB_WORKSPACE:-$(pwd)}}"
cd "$ROOT_DIR"

PERF_TOOLKIT_DIR="${BLOCKERA_PERF_TOOLKIT_DIR:-packages/global-packages/packages/dev-tools/github/performance}"
PERF_SCRIPTS_DIR="${PERF_TOOLKIT_DIR}/scripts"
PERF_MU_PLUGINS_DIR="${PERF_TOOLKIT_DIR}/mu-plugins"
PERF_RESULTS_DEFAULT="${BLOCKERA_PERF_RESULTS_DIR:-${PERF_RESULTS_DIR:-.github/performance/results}}"
SCENARIOS_FILE_DEFAULT="${SCENARIOS_FILE:-.github/performance/scenarios.json}"
PLUGIN_SLUG_DEFAULT="${BLOCKERA_PERF_PLUGIN_SLUG:-blockera}"
