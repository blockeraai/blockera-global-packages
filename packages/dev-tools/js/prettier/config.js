const wpConfig = require('@wordpress/prettier-config');

module.exports = {
	...wpConfig,
	endOfLine: 'auto',
	useTabs: true,
	plugins: [
		require.resolve('../theme-json/prettier-plugin-theme-config-sort.js'),
	],
	overrides: [
		{
			// themeConfigSort is read by prettier-plugin-theme-config-sort (IDE-safe).
			// Low printWidth keeps nested objects expanded for readability.
			files: ['theme-config/**/*.json', '**/theme-config/**/*.json'],
			options: {
				parser: 'json',
				themeConfigSort: true,
				printWidth: 1,
				singleQuote: false,
			},
		},
		{
			files: '*.{css,sass,scss}',
			options: {
				singleQuote: false,
			},
		},
		{
			files: '*.svg',
			options: {
				parser: 'html',
				printWidth: 80,
				tabWidth: 2,
				useTabs: true,
			},
		},
		{
			files: '*.xml',
			options: {
				parser: 'html',
				printWidth: 80,
				tabWidth: 2,
				useTabs: true,
			},
		},
	],
};
