// Edit packages/global-packages/packages/dev-tools/root-configs/.eslintrc.blockera-pro.js
// project:bootstrap copies this to the host repo root for --project=blockera-pro.
const base = require('./packages/global-packages/packages/dev-tools/js/eslint/config');
const ignorePatterns = require('./packages/global-packages/packages/dev-tools/js/eslint/ignore');

module.exports = {
	...base,
	ignorePatterns: [
		...ignorePatterns,
		// Pro-only paths (were in root .eslintignore).
		'packages/console/*',
		'wordpress*',
	],
	rules: {
		...base.rules,
		'@wordpress/i18n-text-domain': [
			'error',
			{
				allowedTextDomain: ['blockera', 'blockera-pro'],
			},
		],
	},
};
