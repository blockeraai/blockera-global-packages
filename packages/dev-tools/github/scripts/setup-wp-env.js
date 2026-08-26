/**
 * Local-only: copy `.github/wp-env-configs/<WP_ENV_CONFIG>.json` to `.wp-env.json`
 * and optionally inject wp-env port overrides from the host `.env`.
 *
 * Exits immediately when `CI` is set (CI job scripts copy wp-env config themselves).
 *
 * Env (host `.env`, loaded via dotenv):
 *   WP_ENV_CONFIG     optional — config basename under `.github/wp-env-configs/` (default: development)
 *   WP_ENV_PORT       optional — dev site host port written to `.wp-env.json` `port` (wp-env default: 8888)
 *   WP_ENV_TESTS_PORT optional — test site host port written to `.wp-env.json` `testsPort` (wp-env default: 8889)
 */
const fs = require('fs');
require('dotenv').config();

// Only run this in local development
if (process.env.CI) {
	process.exit(0);
}

// Get the wp-env config from .env file
const wpEnvConfig = process.env.WP_ENV_CONFIG;

// If no config specified in .env, use base config
const configPath =
	(wpEnvConfig && `.github/wp-env-configs/${wpEnvConfig}.json`) ||
	'.github/wp-env-configs/development.json';

// Check if the specified config exists
if (wpEnvConfig && !fs.existsSync(configPath)) {
	console.error(`❌ Error: Configuration file ${configPath} not found`);
	process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const port = process.env.WP_ENV_PORT;
const testsPort = process.env.WP_ENV_TESTS_PORT;

if (port !== undefined && port !== '') {
	config.port = Number(port);
}

if (testsPort !== undefined && testsPort !== '') {
	config.testsPort = Number(testsPort);
}

fs.writeFileSync('.wp-env.json', `${JSON.stringify(config, null, '\t')}\n`);

console.log(`👉 wp-env configuration: ${configPath}`);

if (config.port !== undefined || config.testsPort !== undefined) {
	console.log(
		`👉 local ports: ${config.port ?? 8888} (dev), ${config.testsPort ?? 8889} (tests) \n`
	);
} else {
	console.log('');
}
