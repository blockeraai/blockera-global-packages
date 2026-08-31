const fs = require('fs');
const path = require('path');
const { defineConfig } = require('@playwright/test');
const baseConfig = require('@wordpress/scripts/config/playwright.config.js');

/**
 * Shared Playwright config factory for Blockera consumers.
 *
 * @param {Object} options
 * @param {string} [options.rootDir] Consumer project root (env JSON paths).
 * @param {string[]} [options.testIgnoreDefaults] Always-ignored paths (merged with PR env).
 * @return {Object} Playwright `defineConfig` result.
 */
function createPlaywrightConfig(options = {}) {
	const rootDir = options.rootDir || process.cwd();
	const testIgnoreDefaults = options.testIgnoreDefaults || [
		// Performance suite has its own Playwright configs under tests/performance/.
		'**/tests/performance/**',
	];

	const envPath = path.resolve(rootDir, './playwright.env.json');
	const prEnvPath = path.resolve(rootDir, './.pr-playwright.env.json');

	if (fs.existsSync(envPath)) {
		const playwrightEnv = require(envPath);
		process.env = {
			...process.env,
			...playwrightEnv,
		};
	}

	// Optional PR-scoped filter (committed on feature branches only).
	let prPlaywrightEnv = {};
	if (fs.existsSync(prEnvPath)) {
		prPlaywrightEnv = require(prEnvPath);
	}

	return defineConfig({
		...baseConfig,
		// Flaky = failed a run then passed on retry; must not fail CI unless opted in.
		failOnFlakyTests: false,
		// Baselines live next to the spec as `screenshots/{arg}-actual.png`
		// (not `__snapshots__/{arg}-{projectName}`). That matches Playwright
		// failure artifacts (`*-actual.png`) so CI downloads can be copied
		// into `screenshots/` without renaming `-actual` → `-chromium`.
		snapshotPathTemplate:
			'{testDir}/{testFileDir}/screenshots/{arg}-actual{ext}',
		expect: {
			...baseConfig.expect,
			toHaveScreenshot: {
				...(baseConfig.expect?.toHaveScreenshot || {}),
				pathTemplate:
					'{testDir}/{testFileDir}/screenshots/{arg}-actual{ext}',
			},
		},
		// Snapshot update mode:
		// - `all` / UPDATE_SNAPSHOTS=1: rewrite baselines (intentional refresh only).
		// - `missing` (CI + local default): compare against committed baselines; on mismatch
		//   fail and write *-actual.png into test-results. If a baseline file is absent,
		//   take the screenshot, write *-actual.png (for artifact download), write the
		//   baseline path, and still fail — so CI does not silently invent goldens.
		// - Do NOT use `none` on CI: Playwright short-circuits missing baselines without
		//   capturing/writing the actual image, so artifacts have nothing to commit.
		updateSnapshots: (() => {
			if (
				process.env.UPDATE_SNAPSHOTS === '1' ||
				process.env.UPDATE_SNAPSHOTS === 'all'
			) {
				return 'all';
			}

			if (process.env.UPDATE_SNAPSHOTS === 'none') {
				return 'none';
			}

			return 'missing';
		})(),
		testDir: './',
		testMatch: prPlaywrightEnv.testMatch ?? '**/*.ply.js',
		testIgnore: [
			...testIgnoreDefaults,
			...(Array.isArray(prPlaywrightEnv.testIgnore)
				? prPlaywrightEnv.testIgnore
				: []),
		],
		reporter: process.env.CI
			? [
					['list'],
					['github'],
					[
						'html',
						{ outputFolder: 'playwright-report', open: 'never' },
					],
					[
						'./packages/global-packages/packages/dev-playwright/js/config/flaky-tests-report.ts',
					],
					[
						'json',
						{
							outputFile: 'artifacts/playwright-e2e-summary.json',
						},
					],
				]
			: 'list',
		webServer: {
			...baseConfig.webServer,
			command: 'npm run env:start',
		},
	});
}

module.exports = createPlaywrightConfig;
