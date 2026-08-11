/**
 * Shared ESLint ignorePatterns (eslintrc).
 *
 * Consumers get these via `js/eslint/config.js`. To extend in a thin root
 * `.eslintrc.js`:
 *
 *   const base = require('.../eslint/config');
 *   const ignorePatterns = require('.../eslint/ignore');
 *   module.exports = {
 *     ...base,
 *     ignorePatterns: [...ignorePatterns, 'extra/**'],
 *   };
 */
module.exports = [
	// Lint top-level dotfiles (negates default ignore of .* paths).
	'!.*',
	'/node_modules/*',
	// Shared packages live in the submodule; lint them in blockera-global-packages.
	'/packages/global-packages/**',
	'/packages/dev-cypress/*',
	'/packages/dev-playwright/*',
	'/.patch/*',
	'**/.patch/*',
	'build/*',
	'dist/*',
	'node_modules/*',
	'vendor/*',
	'assets/*',
	'source-codes/**',
	'**/test/*',
	'**/stories/*',
	'/bin/plugin/**',
	'/bin/*.js',
	'tests/**/input.html',
];
