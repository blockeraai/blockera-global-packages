// Edit packages/global-packages/packages/dev-tools/root-configs/.eslintrc.blockera-one.js
// project:bootstrap copies this to the host repo root for --project=blockera-one.
const base = require('./packages/global-packages/packages/dev-tools/js/eslint/config');

const ignorePatterns = base.ignorePatterns.concat(['/bin/**']);

module.exports = {
	...base,
	ignorePatterns,
	rules: {
		...base.rules,
		'@wordpress/i18n-text-domain': [
			'error',
			{
				allowedTextDomain: ['blockera', 'blockera-one'],
			},
		],
	},
};
