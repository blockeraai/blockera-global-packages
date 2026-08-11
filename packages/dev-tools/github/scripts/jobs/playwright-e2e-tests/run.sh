#!/usr/bin/env bash
# Install Playwright, start wp-env, build, and run one matrix category.
#
# Required env:
#   BLOCKERA_PLAYWRIGHT_CATEGORY
#
# Defaults match the Blockera plugin base. Override via env:
#   BLOCKERA_PLAYWRIGHT_PRODUCT_STYLE      plugin|theme (default: plugin)
#   BLOCKERA_PLAYWRIGHT_INSTALL_CMD
#   BLOCKERA_PLAYWRIGHT_COMPOSER_INSTALL / BLOCKERA_PLAYWRIGHT_COMPOSER_CMD
#   BLOCKERA_PLAYWRIGHT_WP_ENV_CONFIG_DIR
#   BLOCKERA_PLAYWRIGHT_WP_ENV_START_CMD
#   BLOCKERA_PLAYWRIGHT_BUILD_CMD
#   BLOCKERA_PLAYWRIGHT_TEST_CMD           default: npx playwright test --config playwright.config.js
#   BLOCKERA_PLAYWRIGHT_STOP_CMD
#   BLOCKERA_PLAYWRIGHT_PR_ENV_FILE
#   BLOCKERA_PLAYWRIGHT_GENERAL_CATEGORY
#   BLOCKERA_PLAYWRIGHT_VISUAL_SPEC        plugin visual entry (default: tests/visual.block-screenshots.ply.js)
#   BLOCKERA_PLAYWRIGHT_VISUAL_BATCHES_CMD
#   BLOCKERA_PLAYWRIGHT_WP_READY_URL
#   BLOCKERA_PLAYWRIGHT_VERIFY_MU_PLUGINS  true|false (default: true)
#   BLOCKERA_PLAYWRIGHT_MU_PLUGIN_PREFIX   path under ABSPATH (default: wp-content/plugins/blockera/)
#   BLOCKERA_PLAYWRIGHT_MU_PLUGIN_FIXTURES comma-separated relative fixture paths
#   VISUAL_SNAPSHOT_BATCH_SIZE
set -euo pipefail

CATEGORY="${BLOCKERA_PLAYWRIGHT_CATEGORY:-}"
if [[ -z "${CATEGORY}" ]]; then
	echo "playwright-e2e/run: BLOCKERA_PLAYWRIGHT_CATEGORY is required" >&2
	exit 1
fi

PRODUCT_STYLE="${BLOCKERA_PLAYWRIGHT_PRODUCT_STYLE:-plugin}"
INSTALL_CMD="${BLOCKERA_PLAYWRIGHT_INSTALL_CMD:-npx playwright install chromium --with-deps}"
COMPOSER_INSTALL="${BLOCKERA_PLAYWRIGHT_COMPOSER_INSTALL:-true}"
COMPOSER_CMD="${BLOCKERA_PLAYWRIGHT_COMPOSER_CMD:-composer install --no-dev -o --apcu-autoloader -a}"
WP_ENV_CONFIG_DIR="${BLOCKERA_PLAYWRIGHT_WP_ENV_CONFIG_DIR:-.github/wp-env-configs}"
WP_ENV_START_CMD="${BLOCKERA_PLAYWRIGHT_WP_ENV_START_CMD:-bash packages/global-packages/packages/dev-tools/github/scripts/retry-wp-env-start.sh}"
BUILD_CMD="${BLOCKERA_PLAYWRIGHT_BUILD_CMD:-npm run build}"
TEST_CMD="${BLOCKERA_PLAYWRIGHT_TEST_CMD:-npx playwright test --config playwright.config.js}"
STOP_CMD="${BLOCKERA_PLAYWRIGHT_STOP_CMD:-npm run env:stop}"
PR_ENV_FILE="${BLOCKERA_PLAYWRIGHT_PR_ENV_FILE:-.pr-playwright.env.json}"
GENERAL_CATEGORY="${BLOCKERA_PLAYWRIGHT_GENERAL_CATEGORY:-general-1}"
VISUAL_SPEC="${BLOCKERA_PLAYWRIGHT_VISUAL_SPEC:-tests/visual.block-screenshots.ply.js}"
BATCHES_CMD="${BLOCKERA_PLAYWRIGHT_VISUAL_BATCHES_CMD:-node packages/global-packages/packages/dev-tools/github/scripts/list-visual-snapshot-batches.js}"
WP_READY_URL="${BLOCKERA_PLAYWRIGHT_WP_READY_URL:-http://localhost:8888}"
VERIFY_MU="${BLOCKERA_PLAYWRIGHT_VERIFY_MU_PLUGINS:-true}"
MU_PREFIX="${BLOCKERA_PLAYWRIGHT_MU_PLUGIN_PREFIX:-wp-content/plugins/blockera/}"
DEFAULT_MU_FIXTURES='packages/global-packages/packages/editor/js/extensions/libs/background/test/global-styles/fixtures/background-color-setup-1.php,packages/global-packages/packages/blocks-core/js/libs/wordpress/group/test/global-styles/fixtures/link-inner-blocks-simple-color.php,packages/global-packages/packages/editor/js/extensions/libs/block-card/inner-blocks/test/global-styles/fixtures/link-color-simple.php'
MU_FIXTURES="${BLOCKERA_PLAYWRIGHT_MU_PLUGIN_FIXTURES:-${DEFAULT_MU_FIXTURES}}"

if [[ "${PRODUCT_STYLE}" == "theme" && -z "${BLOCKERA_PLAYWRIGHT_MU_PLUGIN_PREFIX:-}" ]]; then
	MU_PREFIX="wp-content/themes/blockera-one/"
fi

cleanup() {
	echo "playwright-e2e/run: ${STOP_CMD}"
	eval "${STOP_CMD}" || true
}
trap cleanup EXIT

echo "playwright-e2e/run: category=${CATEGORY} style=${PRODUCT_STYLE}"

echo "playwright-e2e/run: ${INSTALL_CMD}"
eval "${INSTALL_CMD}"

if [[ "${COMPOSER_INSTALL}" == "true" ]]; then
	echo "playwright-e2e/run: ${COMPOSER_CMD}"
	eval "${COMPOSER_CMD}"
fi

WP_ENV_CONFIG="${WP_ENV_CONFIG_DIR}/base.json"
if [[ -f "${WP_ENV_CONFIG_DIR}/${CATEGORY}.json" ]]; then
	WP_ENV_CONFIG="${WP_ENV_CONFIG_DIR}/${CATEGORY}.json"
fi
echo "playwright-e2e/run: using ${WP_ENV_CONFIG}"
cp "${WP_ENV_CONFIG}" .wp-env.json
cat .wp-env.json

cat >playwright.env.json <<EOF
{
  "APP_MODE": "production",
  "WP_BASE_URL": "${WP_READY_URL}"
}
EOF
cat playwright.env.json

{
	echo "APP_MODE=production"
	echo "DB=wp_tests"
} >.env
cat .env

echo "playwright-e2e/run: ${WP_ENV_START_CMD}"
eval "${WP_ENV_START_CMD}"

echo "playwright-e2e/run: WordPress version $(npx wp-env run cli wp core version)"

echo "playwright-e2e/run: ${BUILD_CMD}"
eval "${BUILD_CMD}"

npx wp-env run cli -- wp eval 'if (!file_exists(WPMU_PLUGIN_DIR)) { wp_mkdir_p(WPMU_PLUGIN_DIR); }'

if [[ "${VERIFY_MU}" == "true" ]]; then
	# Build a PHP foreach list from comma-separated fixture paths.
	php_list=""
	IFS=',' read -r -a fixture_arr <<<"${MU_FIXTURES}"
	for f in "${fixture_arr[@]}"; do
		f="$(echo "${f}" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
		[[ -z "${f}" ]] && continue
		php_list+="\"${f}\","
	done
	php_list="${php_list%,}"
	echo "playwright-e2e/run: verifying mu-plugin fixtures under ${MU_PREFIX}"
	npx wp-env run cli -- wp eval "foreach ([${php_list}] as \$f) { \$p = ABSPATH . '${MU_PREFIX}' . \$f; if (!file_exists(\$p)) { echo 'Missing: ' . \$p; exit(1); } } echo 'Mu-plugin fixtures OK';"
fi

echo "playwright-e2e/run: waiting for ${WP_READY_URL}..."
for i in $(seq 1 36); do
	if curl -sf -o /dev/null "${WP_READY_URL}"; then
		echo "WordPress is ready"
		break
	fi
	echo "Attempt ${i}/36 - WordPress not ready yet, waiting 5s..."
	sleep 5
done
curl -sf -o /dev/null "${WP_READY_URL}" || {
	echo "WordPress failed to become ready" >&2
	exit 1
}

is_allowed_playwright_path() {
	local path="$1"
	if [[ "${PRODUCT_STYLE}" != "theme" ]]; then
		return 0
	fi
	[[ "${path}" =~ ^tests/ ]] && return 0
	[[ "${path}" =~ ^packages/(blockera-one-[^/]+|[^/]+-one)/ ]]
}

expand_glob_to_files() {
	local pattern="$1"
	if [[ "${pattern}" == *"**"* ]]; then
		local base_dir file_pattern
		base_dir="$(echo "${pattern}" | sed -E 's|/\*\*.*||')"
		file_pattern="$(echo "${pattern}" | sed -E 's|.*\*\*/||')"
		while IFS= read -r -d '' file; do
			if [[ "${PRODUCT_STYLE}" == "theme" && "$(basename "${file}")" == "visual.block-screenshots.ply.js" ]]; then
				continue
			fi
			test_files+=("${file}")
		done < <(find "${base_dir}" -type f -name "${file_pattern}" -print0 2>/dev/null)
	elif [[ -f "${pattern}" ]]; then
		test_files+=("${pattern}")
	fi
}

test_files=()

# Visual snapshot batches: synthetic categories block-screenshots-1..N.
if [[ "${CATEGORY}" =~ ^block-screenshots-([0-9]+)$ ]]; then
	batch_num="${BASH_REMATCH[1]}"
	fixtures_csv="$(eval "${BATCHES_CMD} --batch \"${batch_num}\" --fixtures-csv")"

	echo "Visual snapshot batch ${batch_num}"
	echo "VISUAL_SNAPSHOT_FIXTURES=${fixtures_csv}"
	export VISUAL_SNAPSHOT_FIXTURES="${fixtures_csv}"

	if [[ -z "${fixtures_csv}" ]]; then
		echo "No fixtures in batch ${batch_num}; skipping."
		exit 0
	fi

	if [[ "${PRODUCT_STYLE}" == "theme" ]]; then
		while IFS= read -r -d '' file; do
			test_files+=("${file}")
		done < <(find packages \( -path 'packages/*-one/*' -o -path 'packages/blockera-one-*/*' \) -type f -name '*.block-screenshots.ply.js' -print0 2>/dev/null)
		if [[ ${#test_files[@]} -eq 0 ]]; then
			echo "No -one package block-screenshots specs; skipping."
			exit 0
		fi
	else
		test_files+=("${VISUAL_SPEC}")
	fi
elif [[ -f "${PR_ENV_FILE}" ]]; then
	while IFS= read -r pattern; do
		[[ -z "${pattern}" ]] && continue
		is_allowed_playwright_path "${pattern}" || continue
		if [[ "${PRODUCT_STYLE}" == "theme" && "${pattern}" == "tests/visual.block-screenshots.ply.js" ]]; then
			continue
		fi

		base="$(basename "${pattern}" .ply.js)"
		if [[ "${base}" == *.* ]]; then
			file_category="${base#*.}"
		else
			file_category="${GENERAL_CATEGORY}"
		fi

		# Batched block-screenshots-* jobs are handled above.
		if [[ "${file_category}" == "block-screenshots" ]]; then
			continue
		fi

		if [[ "${file_category}" != "${CATEGORY}" ]]; then
			continue
		fi

		if [[ -f "${pattern}" ]]; then
			test_files+=("${pattern}")
		else
			echo "Warning: listed file not found: ${pattern}"
		fi
	done < <(jq -r '.testMatch[]' "${PR_ENV_FILE}")

	if jq -e '.testIgnore | type == "array" and length > 0' "${PR_ENV_FILE}" >/dev/null 2>&1; then
		ignore_files="$(jq -r '.testIgnore[]' "${PR_ENV_FILE}")"
		filtered_files=()
		for file in "${test_files[@]}"; do
			skip=false
			while IFS= read -r ignore; do
				[[ -z "${ignore}" ]] && continue
				if [[ "${file}" == "${ignore}" ]]; then
					skip=true
					break
				fi
			done <<<"${ignore_files}"
			if [[ "${skip}" == false ]]; then
				filtered_files+=("${file}")
			fi
		done
		test_files=("${filtered_files[@]}")
	fi
elif [[ "${CATEGORY}" != "${GENERAL_CATEGORY}" ]]; then
	test_patterns=()

	if find tests/e2e/specs -type f -name "*.${CATEGORY}.ply.js" 2>/dev/null | grep -q .; then
		test_patterns+=("tests/e2e/specs/**/*.${CATEGORY}.ply.js")
	fi

	if [[ "${PRODUCT_STYLE}" == "theme" ]]; then
		if find tests -type f -name "*.${CATEGORY}.ply.js" ! -name 'visual.block-screenshots.ply.js' 2>/dev/null | grep -q .; then
			test_patterns+=("tests/**/*.${CATEGORY}.ply.js")
		fi
	else
		if find tests -type f -name "*.${CATEGORY}.ply.js" 2>/dev/null | grep -q .; then
			test_patterns+=("tests/**/*.${CATEGORY}.ply.js")
		fi
		if find packages -type f -name "*.${CATEGORY}.ply.js" 2>/dev/null | grep -q .; then
			test_patterns+=("packages/**/*.${CATEGORY}.ply.js")
		fi
	fi

	for pattern in "${test_patterns[@]}"; do
		expand_glob_to_files "${pattern}"
	done

	if [[ "${PRODUCT_STYLE}" == "theme" ]]; then
		while IFS= read -r -d '' file; do
			test_files+=("${file}")
		done < <(find packages \( -path 'packages/*-one/*' -o -path 'packages/blockera-one-*/*' \) -type f -name "*.${CATEGORY}.ply.js" -print0 2>/dev/null)
	fi
else
	# general: files without a category segment in the name
	while IFS= read -r -d '' file; do
		test_files+=("${file}")
	done < <(find tests/e2e/specs -type f -name "*.ply.js" ! -name "*.*.ply.js" -print0 2>/dev/null)

	if [[ "${PRODUCT_STYLE}" == "theme" ]]; then
		while IFS= read -r -d '' file; do
			[[ "$(basename "${file}")" == "visual.block-screenshots.ply.js" ]] && continue
			test_files+=("${file}")
		done < <(find tests -type f -name "*.ply.js" ! -name "*.*.ply.js" ! -path "tests/e2e/specs/*" -print0 2>/dev/null)

		while IFS= read -r -d '' file; do
			test_files+=("${file}")
		done < <(find packages \( -path 'packages/*-one/*' -o -path 'packages/blockera-one-*/*' \) -type f -name "*.ply.js" ! -name "*.*.ply.js" -print0 2>/dev/null)
	else
		while IFS= read -r -d '' file; do
			test_files+=("${file}")
		done < <(find packages -type f -name "*.ply.js" ! -name "*.*.ply.js" -print0 2>/dev/null)

		while IFS= read -r -d '' file; do
			test_files+=("${file}")
		done < <(find tests -type f -name "*.ply.js" ! -name "*.*.ply.js" ! -path "tests/e2e/specs/*" -print0 2>/dev/null)
	fi
fi

if [[ ${#test_files[@]} -eq 0 ]]; then
	echo "No test files found for category: ${CATEGORY}"
	exit 0
fi

echo "Running tests for category: ${CATEGORY}"
echo "Found ${#test_files[@]} test file(s):"
printf '  %s\n' "${test_files[@]}"

quoted_files=()
for f in "${test_files[@]}"; do
	quoted_files+=("$(printf '%q' "${f}")")
done

test_exit_code=0
if ! eval "${TEST_CMD} ${quoted_files[*]}"; then
	test_exit_code=1
fi

# Flaky tests that pass after retries must not fail the job.
if [[ "${test_exit_code}" -ne 0 && -f artifacts/playwright-e2e-summary.json ]]; then
	if node -e "
		const fs = require('fs');
		const r = JSON.parse(fs.readFileSync('artifacts/playwright-e2e-summary.json', 'utf8'));
		const unexpected = r.stats && r.stats.unexpected;
		const errors = (r.errors && r.errors.length) || 0;
		process.exit(unexpected === 0 && errors === 0 ? 0 : 1);
	"; then
		echo "Playwright exited non-zero but the JSON report shows no unexpected failures; treating run as success."
		test_exit_code=0
	fi
fi

exit "${test_exit_code}"
