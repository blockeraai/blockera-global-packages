#!/usr/bin/env bash
# Run a command with retries. Used by CI wrappers (npm ci, wp-env start, …).
#
# Usage:
#   bash retry.sh [--max N] [--delay SEC] [--label TEXT] -- <command> [args...]
#
# Env fallbacks (used when flags are omitted):
#   RETRY_MAX         default: 4
#   RETRY_DELAY_SEC   default: 20
set -u

MAX="${RETRY_MAX:-4}"
DELAY="${RETRY_DELAY_SEC:-20}"
LABEL=""
ARGS=()

while [[ $# -gt 0 ]]; do
	case "$1" in
		--max)
			MAX="$2"
			shift 2
			;;
		--delay)
			DELAY="$2"
			shift 2
			;;
		--label)
			LABEL="$2"
			shift 2
			;;
		--)
			shift
			ARGS=("$@")
			break
			;;
		*)
			ARGS=("$@")
			break
			;;
	esac
done

if [[ ${#ARGS[@]} -eq 0 ]]; then
	echo "retry: command is required" >&2
	exit 1
fi

if [[ -z "${LABEL}" ]]; then
	LABEL="${ARGS[*]}"
fi

for ((i = 1; i <= MAX; i++)); do
	echo "${LABEL}: attempt ${i} of ${MAX}"
	if "${ARGS[@]}"; then
		exit 0
	fi
	if ((i < MAX)); then
		echo "${LABEL} failed; retrying in ${DELAY}s..."
		sleep "${DELAY}"
	fi
done

exit 1
