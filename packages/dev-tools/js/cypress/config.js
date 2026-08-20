const { defineConfig } = require('cypress');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const DEV_CYPRESS = './packages/global-packages/packages/dev-cypress/js';

const DEFAULT_E2E_SPEC_PATTERN = [
	'packages/**/*.e2e.cy.js',
	'tests/**/*.e2e.cy.js',
	'packages/**/*.visual.cy.js',
	'tests/**/*.visual.cy.js',
];

const DEFAULT_E2E_EXCLUDE_SPEC_PATTERN = [
	'packages/**/*.build.e2e.js',
	// Playwright performance suite — never run via Cypress CI.
	'tests/performance/**',
];

const DEFAULT_ALWAYS_EXCLUDE_SPEC_PATTERN = [
	'packages/**/*.build.e2e.js',
	'tests/performance/**',
];

/**
 * Shared Cypress config factory for Blockera consumers.
 *
 * @param {Object} options
 * @param {string} [options.rootDir] Consumer project root (for env JSON + dotenv).
 * @param {string} [options.projectId] Cypress Cloud project id.
 * @param {string[]} [options.e2eSpecPattern]
 * @param {string[]} [options.e2eExcludeSpecPattern]
 * @param {string[]} [options.alwaysExcludeSpecPattern] Merged after env overrides.
 * @param {string|string[]} [options.componentSpecPattern]
 * @param {string[]} [options.componentExcludeSpecPattern]
 * @param {Object} [options.env] Extra defaults merged into Cypress env.
 * @return {Object} Cypress `defineConfig` result.
 *
 * Env (process): `BLOCKERA_CYPRESS_IGNORE_PR_FILTER=true` skips merging
 * `.pr-cypress.env.json` (used by CI pre-test before PR-filtered category specs).
 */
function createCypressConfig(options = {}) {
	const rootDir = options.rootDir || process.cwd();
	const projectId = options.projectId || 'blockera';
	const alwaysExcludeSpecPattern =
		options.alwaysExcludeSpecPattern || DEFAULT_ALWAYS_EXCLUDE_SPEC_PATTERN;

	dotenv.config({ path: path.resolve(rootDir, '.env') });

	// GitHub Actions and most CI providers set CI=true; local runs omit it.
	const isCi = Boolean(process.env.CI);

	let env = {
		wpUsername: 'admin',
		wpPassword: 'password',
		testURL: 'http://localhost:8888',
		muPluginActivateMaxAttempts: isCi ? 3 : 1,
		e2e: {
			specPattern: options.e2eSpecPattern || DEFAULT_E2E_SPEC_PATTERN,
			excludeSpecPattern:
				options.e2eExcludeSpecPattern ||
				DEFAULT_E2E_EXCLUDE_SPEC_PATTERN,
		},
		...(options.env || {}),
	};

	const cypressEnvPath = path.resolve(rootDir, 'cypress.env.json');
	const prCypressEnvPath = path.resolve(rootDir, '.pr-cypress.env.json');
	const ignorePrCypressFilter =
		process.env.BLOCKERA_CYPRESS_IGNORE_PR_FILTER === 'true';

	// Localize Cypress env from consumer-root JSON files (not shared package dir).
	env = {
		...env,
		...(fs.existsSync(cypressEnvPath) ? require(cypressEnvPath) : {}),
		...(fs.existsSync(prCypressEnvPath) && !ignorePrCypressFilter
			? require(prCypressEnvPath)
			: {}),
		...process.env,
	};

	// require() resolves relative to this file; Cypress string paths resolve from cwd.
	const resolveDevCypress = (...segments) =>
		path.resolve(rootDir, DEV_CYPRESS, ...segments);

	const setupE2ENodeEvents = (on, config) => {
		require(resolveDevCypress('plugins', 'index.js'))(on, config, 'e2e');

		const getCompareSnapshotsPlugin = require('cypress-image-diff-js/plugin');
		getCompareSnapshotsPlugin(on, config);

		return config;
	};

	const setupComponentNodeEvents = (on, config) => {
		require(resolveDevCypress('plugins', 'index.js'))(
			on,
			config,
			'component'
		);

		return config;
	};

	return defineConfig({
		chromeWebSecurity: false,
		defaultCommandTimeout: 15000,
		e2e: {
			setupNodeEvents: setupE2ENodeEvents,
			specPattern: env.e2e.specPattern,
			excludeSpecPattern: Array.from(
				new Set([
					...(Array.isArray(env.e2e.excludeSpecPattern)
						? env.e2e.excludeSpecPattern
						: []),
					// Always exclude even if cypress.env.json / .pr overrides e2e.
					...alwaysExcludeSpecPattern,
				])
			),
			supportFile: `${DEV_CYPRESS}/support/e2e.js`,
		},
		env,
		fixturesFolder: `${DEV_CYPRESS}/fixtures`,
		pageLoadTimeout: 120000,
		projectId,
		// CI only: runMode 2 => up to 3 attempts per test (1 run + 2 retries).
		retries: {
			openMode: 0,
			runMode: isCi ? 2 : 0,
		},
		coverage: isCi,
		screenshotOnRunFailure: false,
		screenshotsFolder: `${DEV_CYPRESS}/screenshots`,
		videosFolder: `${DEV_CYPRESS}/videos`,
		viewportHeight: 1440,
		viewportWidth: 2560,
		component: {
			setupNodeEvents: setupComponentNodeEvents,
			devServer: {
				framework: 'react',
				bundler: 'webpack',
				webpackConfig: require(resolveDevCypress('webpack.config.js')),
			},
			specPattern:
				options.componentSpecPattern || 'packages/**/test/*.cy.js',
			excludeSpecPattern: options.componentExcludeSpecPattern || [
				'**/*.e2e.cy.js',
				'**/*.visual.cy.js',
			],
			supportFile: `${DEV_CYPRESS}/support/component.js`,
			viewportHeight: 900,
			viewportWidth: 1280,
		},
		numTestsKeptInMemory: 2,
		experimentalMemoryManagement: true,
	});
}

module.exports = createCypressConfig;
