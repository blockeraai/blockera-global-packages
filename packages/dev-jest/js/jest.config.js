/* eslint-disable sort-keys */
const fs = require('fs');
const path = require('path');

const DEV_JEST_JS = __dirname;
const GLOBAL_PACKAGES_ROOT = path.resolve(__dirname, '../../..');
const GLOBAL_PACKAGES_DIR = path.join(GLOBAL_PACKAGES_ROOT, 'packages');

/**
 * When this config is consumed from a Blockera product (plugin/theme), Jest must
 * use that consumer root so experimental.config.json resolves. Falls back to the
 * global-packages monorepo root when run in isolation.
 */
function resolveRootDir() {
	if (
		process.env.BLOCKERA_CONSUMER_ROOT &&
		fs.existsSync(process.env.BLOCKERA_CONSUMER_ROOT)
	) {
		return path.resolve(process.env.BLOCKERA_CONSUMER_ROOT);
	}

	const cwd = process.cwd();
	if (fs.existsSync(path.join(cwd, 'experimental.config.json'))) {
		return cwd;
	}

	return GLOBAL_PACKAGES_ROOT;
}

function resolvePackagesRoot(rootDir) {
	const linked = path.join(rootDir, 'packages');
	// Prefer consumer-linked packages/ when the shared packages are present there.
	if (
		fs.existsSync(path.join(linked, 'dev-jest')) ||
		fs.existsSync(path.join(linked, 'editor'))
	) {
		return linked;
	}

	return GLOBAL_PACKAGES_DIR;
}

const rootDir = resolveRootDir();
const packagesRoot = resolvePackagesRoot(rootDir);

module.exports = {
	rootDir,
	roots: [packagesRoot],
	preset: '@wordpress/jest-preset-default',
	collectCoverageFrom: [`${packagesRoot}/**/*.js`],
	setupFiles: [
		path.join(DEV_JEST_JS, 'setup-text-encoding.js'),
		path.join(DEV_JEST_JS, 'setup-jsdom-css.js'),
	],
	setupFilesAfterEnv: [
		require.resolve('@wordpress/jest-preset-default/scripts/setup-globals.js'),
	],
	modulePathIgnorePatterns: [],
	testPathIgnorePatterns: [
		'/node_modules/',
		'/source-codes/',
	],
	testMatch: ['**/test/**/*.spec.js', '**/tests/**/*.spec.js'],
	transformIgnorePatterns: [
		'/node_modules/(?!(.*@wordpress/theme|parsel-js|client-zip|marked)).*\\.(js|jsx|mjs|cjs|ts|tsx)$',
	],
	transform: {
		'\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
			path.join(DEV_JEST_JS, 'assets-transformer.js'),
		'\\.svg$': path.join(DEV_JEST_JS, 'svg-transformer.js'),
		'\\.css$': path.join(DEV_JEST_JS, 'css-raw-transformer.js'),
		'^.+\\.(js|jsx|mjs|cjs)$': 'babel-jest',
		'^.+\\.[jt]sx?$': 'babel-jest',
	},
	globals: {
		'ts-jest': {
			isolatedModules: true,
		},
	},
	moduleNameMapper: {
		'^@blockera/experimental-config$': path.join(
			rootDir,
			'experimental.config.json'
		),
		'^@wordpress/theme/build-module/index\\.mjs$': path.join(
			DEV_JEST_JS,
			'__mocks__/wordpress-theme.js'
		),
		'^@wordpress/theme/build-module/private-apis\\.mjs$': path.join(
			DEV_JEST_JS,
			'__mocks__/wordpress-theme.js'
		),
		// Match extensionless `./bootstrap` imports as well as explicit `.js`.
		'.*/editor/header-ui/components/breakpoints/bootstrap(\\.js)?$':
			path.join(DEV_JEST_JS, '__mocks__/bootstrap-breakpoints.js'),
		// Force module uuid to resolve with the CJS entry point, because Jest does not support package.json.exports. See https://github.com/uuidjs/uuid/issues/451
		uuid: require.resolve('uuid'),
		'\\.svg$': path.join(DEV_JEST_JS, '__mocks__/svg-mock.js'),
		// Map CSS files with ?raw suffix to the actual CSS file path
		// Jest will strip the ?raw query string, then the css-raw-transformer will handle it
		'^(.+\\.css)\\?raw$': '$1',
	},
};
