#!/usr/bin/env bash
# Prepare fixture plugins, start wp-env, and assert coordinator version resolution.
#
# Required env:
#   COORDINATOR_WP_ENV_SCENARIO           e.g. plugin-a-newer
#   COORDINATOR_WP_ENV_EXPECTED_WINNER    e.g. plugin-a
#   COORDINATOR_WP_ENV_EXPECTED_VERSION   e.g. 2.0.0
#
# Optional env:
#   COORDINATOR_WP_ENV_PHP_VERSION        default: 8.2
#   COORDINATOR_WP_ENV_PLUGIN_A_VERSION   if set, must match plugin-a name-utils composer.json
#   COORDINATOR_WP_ENV_PLUGIN_B_VERSION   if set, must match plugin-b name-utils composer.json
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_DIR="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
GP_ROOT="$(cd "${PACKAGE_DIR}/../.." && pwd)"
PLUGINS_DIR="${SCRIPT_DIR}/plugins"
SCENARIOS_DIR="${SCRIPT_DIR}/scenarios"

SCENARIO="${COORDINATOR_WP_ENV_SCENARIO:?COORDINATOR_WP_ENV_SCENARIO is required}"
EXPECTED_WINNER="${COORDINATOR_WP_ENV_EXPECTED_WINNER:?COORDINATOR_WP_ENV_EXPECTED_WINNER is required}"
EXPECTED_VERSION="${COORDINATOR_WP_ENV_EXPECTED_VERSION:?COORDINATOR_WP_ENV_EXPECTED_VERSION is required}"
PHP_VERSION="${COORDINATOR_WP_ENV_PHP_VERSION:-8.2}"

SCENARIO_DIR="${SCENARIOS_DIR}/${SCENARIO}"
if [[ ! -d "${SCENARIO_DIR}" ]]; then
	echo "ERROR: scenario directory not found: ${SCENARIO_DIR}" >&2
	exit 1
fi

copy_name_utils() {
	local side="$1"
	local dest="${PLUGINS_DIR}/${side}/packages/name-utils"
	cp "${SCENARIO_DIR}/${side}/composer.json" "${dest}/composer.json"
	cp "${SCENARIO_DIR}/${side}/php/functions.php" "${dest}/php/functions.php"
	if [[ -f "${SCENARIO_DIR}/${side}/php/NameFormatter.php" ]]; then
		cp "${SCENARIO_DIR}/${side}/php/NameFormatter.php" "${dest}/php/NameFormatter.php"
	fi
}

copy_coordinator() {
	local dest="$1/packages/autoloader-coordinator"
	rm -rf "${dest}"
	mkdir -p "${dest}"
	cp "${PACKAGE_DIR}/loader.php" \
		"${PACKAGE_DIR}/bootstrap.php" \
		"${PACKAGE_DIR}/class-shared-autoload-coordinator.php" \
		"${PACKAGE_DIR}/composer.json" \
		"${dest}/"
}

echo "coordinator-wp-env: scenario=${SCENARIO} expected=${EXPECTED_VERSION} from ${EXPECTED_WINNER}"

copy_name_utils plugin-a
copy_name_utils plugin-b

if [[ -n "${COORDINATOR_WP_ENV_PLUGIN_A_VERSION:-}" || -n "${COORDINATOR_WP_ENV_PLUGIN_B_VERSION:-}" ]]; then
	plugin_a_version="$(jq -r '.version' "${PLUGINS_DIR}/plugin-a/packages/name-utils/composer.json")"
	plugin_b_version="$(jq -r '.version' "${PLUGINS_DIR}/plugin-b/packages/name-utils/composer.json")"
	if [[ -n "${COORDINATOR_WP_ENV_PLUGIN_A_VERSION:-}" && "${plugin_a_version}" != "${COORDINATOR_WP_ENV_PLUGIN_A_VERSION}" ]]; then
		echo "ERROR: plugin-a version ${plugin_a_version} != ${COORDINATOR_WP_ENV_PLUGIN_A_VERSION}" >&2
		exit 1
	fi
	if [[ -n "${COORDINATOR_WP_ENV_PLUGIN_B_VERSION:-}" && "${plugin_b_version}" != "${COORDINATOR_WP_ENV_PLUGIN_B_VERSION}" ]]; then
		echo "ERROR: plugin-b version ${plugin_b_version} != ${COORDINATOR_WP_ENV_PLUGIN_B_VERSION}" >&2
		exit 1
	fi
fi

copy_coordinator "${PLUGINS_DIR}/plugin-a"
copy_coordinator "${PLUGINS_DIR}/plugin-b"

echo "coordinator-wp-env: composer install plugin-a"
(
	cd "${PLUGINS_DIR}/plugin-a"
	composer install --no-interaction --no-progress --no-scripts
	composer dump-autoload --no-interaction --optimize
)
echo "coordinator-wp-env: composer install plugin-b"
(
	cd "${PLUGINS_DIR}/plugin-b"
	composer install --no-interaction --no-progress --no-scripts
	composer dump-autoload --no-interaction --optimize
)

if ! grep -q "functions.php" "${PLUGINS_DIR}/plugin-a/vendor/composer/autoload_files.php" \
	|| ! grep -q "functions.php" "${PLUGINS_DIR}/plugin-b/vendor/composer/autoload_files.php"; then
	echo "ERROR: functions.php not in composer autoload files" >&2
	exit 1
fi

cd "${GP_ROOT}"
cp "${SCRIPT_DIR}/wp-env.json" .wp-env.json
jq --arg php "${PHP_VERSION}" '. + {"phpVersion": $php}' .wp-env.json >.wp-env.json.tmp
mv .wp-env.json.tmp .wp-env.json
cat .wp-env.json

echo "coordinator-wp-env: starting wp-env"
if [[ -f packages/dev-tools/github/scripts/retry-wp-env-start.sh ]]; then
	bash packages/dev-tools/github/scripts/retry-wp-env-start.sh
else
	npx --yes @wordpress/env start --update
fi

wait_for_wordpress() {
	local attempt=0
	local max_attempts=60
	while [[ "${attempt}" -lt "${max_attempts}" ]]; do
		if curl -sf http://localhost:8888 >/dev/null 2>&1; then
			if npx --yes @wordpress/env run cli wp core version >/dev/null 2>&1; then
				echo "WordPress is ready"
				return 0
			fi
		fi
		attempt=$((attempt + 1))
		sleep 2
	done
	echo "ERROR: WordPress did not become ready" >&2
	npx --yes @wordpress/env logs || true
	return 1
}

wait_for_wordpress

http_code="$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8888 || true)"
if [[ "${http_code}" != "200" && "${http_code}" != "302" ]]; then
	echo "ERROR: WordPress returned HTTP ${http_code}" >&2
	npx --yes @wordpress/env logs || true
	exit 1
fi

echo "coordinator-wp-env: activating plugins"
npx --yes @wordpress/env run cli wp plugin activate plugin-a plugin-b
active_plugins="$(npx --yes @wordpress/env run cli wp plugin list --status=active --field=name)"
if ! echo "${active_plugins}" | grep -q "plugin-a" || ! echo "${active_plugins}" | grep -q "plugin-b"; then
	echo "ERROR: plugins not activated" >&2
	npx --yes @wordpress/env run cli wp plugin list
	exit 1
fi

npx --yes @wordpress/env run cli wp eval "
	if (! class_exists('Blockera\\\\SharedAutoload\\\\Coordinator')) {
		echo 'ERROR: Coordinator class not found';
		exit(1);
	}
	\$coordinator = \\Blockera\\SharedAutoload\\Coordinator::getInstance();
	if (! \$coordinator instanceof \\Blockera\\SharedAutoload\\Coordinator) {
		echo 'ERROR: Coordinator instance invalid';
		exit(1);
	}
	echo 'Coordinator class verified';
"

npx --yes @wordpress/env run cli wp eval "
	\$dependencies = apply_filters('blockera/autoloader-coordinator/plugins/dependencies', []);
	if (empty(\$dependencies) || ! isset(\$dependencies['plugin-a']) || ! isset(\$dependencies['plugin-b'])) {
		echo 'ERROR: Missing plugin registration';
		exit(1);
	}
	echo 'Plugins registered: ' . implode(', ', array_keys(\$dependencies));
"

npx --yes @wordpress/env run cli wp eval "
	delete_transient('blockera_pkgs_files');
	delete_transient('blockera_pkg_manifest');
	echo 'Cache cleared';
"

npx --yes @wordpress/env run cli wp eval "
	if (! function_exists('blockera_name_utils_get_version') || ! function_exists('blockera_name_utils_get_loaded_from')) {
		echo 'ERROR: name-utils helper functions missing';
		exit(1);
	}
	\$version = blockera_name_utils_get_version();
	\$loaded_from = blockera_name_utils_get_loaded_from();
	if (\$version !== '${EXPECTED_VERSION}' || \$loaded_from !== '${EXPECTED_WINNER}') {
		echo 'ERROR: Version resolution failed';
		echo 'Expected: ${EXPECTED_VERSION} from ${EXPECTED_WINNER}';
		echo 'Got: ' . \$version . ' from ' . \$loaded_from;
		exit(1);
	}
	echo 'Version resolution correct: ' . \$version . ' from ' . \$loaded_from;
"

npx --yes @wordpress/env run cli wp eval "
	if (! class_exists('\\\\Blockera\\\\NameUtils\\\\NameFormatter')) {
		echo 'ERROR: NameFormatter class not found';
		exit(1);
	}
	\$version = \\Blockera\\NameUtils\\NameFormatter::get_version();
	\$loaded_from = \\Blockera\\NameUtils\\NameFormatter::get_loaded_from();
	if (\$version !== '${EXPECTED_VERSION}' || \$loaded_from !== '${EXPECTED_WINNER}') {
		echo 'ERROR: Class loading failed';
		echo 'Expected: ${EXPECTED_VERSION} from ${EXPECTED_WINNER}';
		echo 'Got: ' . \$version . ' from ' . \$loaded_from;
		exit(1);
	}
	echo 'Class loading correct: ' . \$version . ' from ' . \$loaded_from;
"

response="$(curl -s http://localhost:8888 || true)"
if echo "${response}" | grep -qi "fatal error\|parse error"; then
	echo "ERROR: PHP errors detected in homepage" >&2
	echo "${response}" | grep -i "fatal\|parse" | head -10 >&2
	exit 1
fi

echo "coordinator-wp-env: scenario ${SCENARIO} passed"
