/**
 * Shared Stylelint ignoreFiles globs.
 *
 * Stylelint has no .stylelintignore extends — patterns live here and are
 * applied via js/stylelint/config.js. Consumers can append in a thin root
 * .stylelintrc.js if needed.
 */
module.exports = [
	// Former .stylelintignore defaults (gitignore → glob).
	'build/**',
	'dist/**',
	'test/**',
	'vendor/**',
	'wordpress*/**',
	'source-codes/**',
	'source-code-block-editor/**',
	'source-code-wordpress/**',
	'**/*.js',
	'node_modules/**',
	'tests/**/*.css',

	// Package / tooling paths (previously only in stylelint config).
	'coverage/**/*.css',
	'packages/dev-cypress/**/*.css',
	'packages/dev-cypress/**/*.scss',
	'packages/global-packages/packages/dev-cypress/**/*.css',
	'packages/global-packages/packages/dev-cypress/**/*.scss',
	'packages/dev-storybook/**/*.css',
	'packages/dev-storybook/**/*.scss',
	'packages/blockera-admin/js/style.scss',
	'packages/global-packages/packages/blockera-admin/js/style.scss',
];
