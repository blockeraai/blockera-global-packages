#!/usr/bin/env bash
# Resolve source/target/mode for a global-packages pin sync. Writes to GITHUB_OUTPUT.
#
# Expected env (from the workflow):
#   EVENT_NAME, DISPATCH_SHA, DISPATCH_BRANCH, DISPATCH_MESSAGE
#   INPUT_SOURCE_REF, INPUT_TARGET_BRANCH, INPUT_MODE
#   GITHUB_REPOSITORY
#
# Override via env:
#   BLOCKERA_SYNC_GP_DEFAULT_BRANCH   default: master
set -euo pipefail

if [[ -z "${GITHUB_OUTPUT:-}" ]]; then
	echo "sync-gp/resolve: GITHUB_OUTPUT is unset" >&2
	exit 1
fi

DEFAULT_BRANCH="${BLOCKERA_SYNC_GP_DEFAULT_BRANCH:-master}"
EVENT_NAME="${EVENT_NAME:-}"
DISPATCH_SHA="${DISPATCH_SHA:-}"
DISPATCH_BRANCH="${DISPATCH_BRANCH:-}"
DISPATCH_MESSAGE="${DISPATCH_MESSAGE:-}"
INPUT_SOURCE_REF="${INPUT_SOURCE_REF:-}"
INPUT_TARGET_BRANCH="${INPUT_TARGET_BRANCH:-}"
INPUT_MODE="${INPUT_MODE:-auto}"

if [[ "${EVENT_NAME}" == "repository_dispatch" ]]; then
	SOURCE_REF="${DISPATCH_SHA}"
	SOURCE_BRANCH="${DISPATCH_BRANCH}"
	SOURCE_MESSAGE="${DISPATCH_MESSAGE}"
elif [[ "${EVENT_NAME}" == "schedule" ]]; then
	SOURCE_REF="${DEFAULT_BRANCH}"
	SOURCE_BRANCH="${DEFAULT_BRANCH}"
	SOURCE_MESSAGE="scheduled sync"
else
	SOURCE_REF="${INPUT_SOURCE_REF}"
	SOURCE_BRANCH="${INPUT_SOURCE_REF}"
	SOURCE_MESSAGE="manual sync"
fi

# Husky mirrors consumer branches as <repo>/<branch> in global-packages.
REPO_NAME="${GITHUB_REPOSITORY##*/}"
REPO_PREFIX="${REPO_NAME}/"

TARGET_BRANCH="${INPUT_TARGET_BRANCH:-}"
SKIP_SYNC="false"
if [[ -z "${TARGET_BRANCH}" ]]; then
	if [[ "${SOURCE_BRANCH}" == "master" || "${SOURCE_BRANCH}" == "main" ]]; then
		TARGET_BRANCH="${DEFAULT_BRANCH}"
	elif [[ "${SOURCE_BRANCH}" == "${REPO_PREFIX}"* ]]; then
		TARGET_BRANCH="${SOURCE_BRANCH#"${REPO_PREFIX}"}"
	else
		echo "Source branch '${SOURCE_BRANCH}' is not prefixed with '${REPO_PREFIX}'; skipping."
		SKIP_SYNC="true"
		TARGET_BRANCH=""
	fi
fi

MODE="${INPUT_MODE:-auto}"
if [[ "${MODE}" == "auto" ]]; then
	if [[ "${TARGET_BRANCH}" == "master" || "${TARGET_BRANCH}" == "main" ]]; then
		MODE="pr"
	else
		MODE="push"
	fi
fi

{
	echo "source_ref=${SOURCE_REF}"
	echo "source_branch=${SOURCE_BRANCH}"
	echo "target_branch=${TARGET_BRANCH}"
	echo "mode=${MODE}"
	echo "skip_sync=${SKIP_SYNC}"
	echo "source_message<<EOF"
	printf '%s\n' "${SOURCE_MESSAGE}"
	echo "EOF"
} >>"${GITHUB_OUTPUT}"

if [[ "${SKIP_SYNC}" == "true" && -n "${GITHUB_ENV:-}" ]]; then
	echo "skip=true" >>"${GITHUB_ENV}"
fi

echo "sync-gp/resolve: source=${SOURCE_REF} branch=${SOURCE_BRANCH} target=${TARGET_BRANCH} mode=${MODE} skip=${SKIP_SYNC}"
