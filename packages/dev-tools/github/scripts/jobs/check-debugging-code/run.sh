#!/usr/bin/env bash
# Fail when unauthorized debugging leftovers are present.
#
# Defaults match the Blockera plugin base. Override via env:
#   BLOCKERA_DEBUG_CHECK_IGNORE_MARKER   default: @debug-ignore
#   BLOCKERA_DEBUG_CHECK_PHP_PATTERN
#   BLOCKERA_DEBUG_CHECK_JS_PATTERN
#   BLOCKERA_DEBUG_CHECK_TEST_PATTERN
#   BLOCKERA_DEBUG_CHECK_SKIP_PATHS      newline-delimited substrings
#                                       default: test/ .github/ bin/ dev-tools/github/ dev-phpunit/
#   BLOCKERA_DEBUG_CHECK_SKIP_PHP|JS|TESTS  true|false (default: false)
set -euo pipefail

IGNORE_MARKER="${BLOCKERA_DEBUG_CHECK_IGNORE_MARKER:-@debug-ignore}"
SKIP_PHP="${BLOCKERA_DEBUG_CHECK_SKIP_PHP:-false}"
SKIP_JS="${BLOCKERA_DEBUG_CHECK_SKIP_JS:-false}"
SKIP_TESTS="${BLOCKERA_DEBUG_CHECK_SKIP_TESTS:-false}"

# Defaults assigned separately — patterns contain ')' which breaks ${VAR:-default}.
PHP_PATTERN="${BLOCKERA_DEBUG_CHECK_PHP_PATTERN:-}"
if [[ -z "${PHP_PATTERN}" ]]; then
	PHP_PATTERN='(die\(|var_dump\(|print_r\(|error_log\(|wp_die\(|exit\()'
fi

JS_PATTERN="${BLOCKERA_DEBUG_CHECK_JS_PATTERN:-}"
if [[ -z "${JS_PATTERN}" ]]; then
	JS_PATTERN='(console\.(log|debug|info|warn|error)|debugger|alert\()'
fi

TEST_PATTERN="${BLOCKERA_DEBUG_CHECK_TEST_PATTERN:-}"
if [[ -z "${TEST_PATTERN}" ]]; then
	TEST_PATTERN='\.(skip|only)\('
fi

SKIP_PATHS_BLOB="${BLOCKERA_DEBUG_CHECK_SKIP_PATHS:-}"
if [[ -z "${SKIP_PATHS_BLOB}" ]]; then
	# Tooling CLIs intentionally use exit()/console.* — skip those trees.
	SKIP_PATHS_BLOB=$'test/\n.github/\nbin/\ndev-tools/github/\ndev-phpunit/'
fi

ERROR_FLAG="$(mktemp)"
echo "0" >"${ERROR_FLAG}"
trap 'rm -f "${ERROR_FLAG}"' EXIT

should_skip_path() {
	local file="$1"
	local fragment
	while IFS= read -r fragment; do
		[[ -z "${fragment}" ]] && continue
		if [[ "${file}" == *"${fragment}"* ]]; then
			return 0
		fi
	done <<<"${SKIP_PATHS_BLOB}"
	return 1
}

is_comment_line() {
	local lang="$1"
	local line="$2"
	case "${lang}" in
	php)
		echo "${line}" | grep -qE '^\s*(//|#|/\*|\*/|\*)'
		;;
	js)
		echo "${line}" | grep -qE '^\s*(//|/\*|\*/|\*)'
		;;
	*)
		return 1
		;;
	esac
}

has_ignore_marker() {
	local file="$1"
	local line_number="$2"
	local start_line=$((line_number > 10 ? line_number - 10 : 1))
	local i prev_line

	for ((i = line_number; i >= start_line; i--)); do
		prev_line="$(sed -n "${i}p" "${file}")"
		if echo "${prev_line}" | grep -qE '^\s*(//|#|/\*.*\*/)'; then
			if echo "${prev_line}" | grep -q "${IGNORE_MARKER}"; then
				return 0
			fi
		elif [[ "${i}" -ne "${line_number}" ]] && ! echo "${prev_line}" | grep -qE '^\s*$'; then
			break
		fi
	done
	return 1
}

report_hit() {
	local kind="$1"
	local file="$2"
	local line_number="$3"
	local line="$4"
	echo "⚠️ Found ${kind}:"
	echo "📁 File: ${file}:${line_number}"
	echo "📝 Code: $(echo "${line}" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
	echo "----------------------------------------"
	echo "1" >"${ERROR_FLAG}"
}

scan_files() {
	local kind="$1"
	local lang="$2"
	local pattern="$3"
	shift 3

	local file line_number line
	while IFS= read -r file; do
		should_skip_path "${file}" && continue

		while IFS=: read -r line_number line; do
			# PHP: allow method definitions named exit(
			if [[ "${lang}" == "php" ]] && echo "${line}" | grep -qE '(^|[^a-zA-Z_])function\s+exit\('; then
				continue
			fi
			if is_comment_line "${lang}" "${line}"; then
				continue
			fi
			if has_ignore_marker "${file}" "${line_number}"; then
				continue
			fi
			report_hit "${kind}" "${file}" "${line_number}" "${line}"
		done < <(grep -n -E "${pattern}" "${file}" || true)
	done < <(
		# Prune dependency / reference / build / local scratch trees.
		find . \( \
			-name node_modules -o \
			-name vendor -o \
			-name source-codes -o \
			-name dist -o \
			-name coverage -o \
			-name Scratch -o \
			-name .patch -o \
			-name .git \
		\) -prune -o -type f "$@" -print
	)
}

echo "Checking PHP files for debugging code..."
echo "============================================"
if [[ "${SKIP_PHP}" != "true" ]]; then
	scan_files "PHP debugging code" php "${PHP_PATTERN}" -name '*.php'
else
	echo "skipping PHP (BLOCKERA_DEBUG_CHECK_SKIP_PHP=true)"
fi

echo "Checking JavaScript/TypeScript files for debugging code..."
echo "============================================"
if [[ "${SKIP_JS}" != "true" ]]; then
	scan_files "JavaScript debugging code" js "${JS_PATTERN}" \( -name '*.js' -o -name '*.jsx' -o -name '*.ts' -o -name '*.tsx' \)
else
	echo "skipping JS/TS (BLOCKERA_DEBUG_CHECK_SKIP_JS=true)"
fi

echo "Checking test files for .skip/.only..."
echo "============================================"
if [[ "${SKIP_TESTS}" != "true" ]]; then
	# Test files live under test/ paths; only skip tooling dirs by default.
	if [[ -z "${BLOCKERA_DEBUG_CHECK_SKIP_PATHS:-}" ]]; then
		SKIP_PATHS_BLOB=$'.github/\nbin/\ndev-tools/github/\ndev-phpunit/'
	fi
	scan_files "test skip/only" js "${TEST_PATTERN}" \( -name '*.test.*' -o -name '*.spec.*' -o -name '*.cy.js' \)
else
	echo "skipping test skip/only (BLOCKERA_DEBUG_CHECK_SKIP_TESTS=true)"
fi

if [[ "$(cat "${ERROR_FLAG}")" -eq 1 ]]; then
	echo "❌ Found debugging code that needs to be removed or marked with ${IGNORE_MARKER}"
	exit 1
fi

echo "✅ No unauthorized debugging code found"
