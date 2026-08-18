// Edit packages/global-packages/packages/dev-tools/root-configs/.eslintrc.blockera-site-toolkit.js
// project:bootstrap copies this to the host repo root for --project=blockera-site-toolkit.
const base = require('./packages/global-packages/packages/dev-tools/js/eslint/config');

module.exports = {
	...base,
	rules: {
		...base.rules,
		'@wordpress/i18n-text-domain': [
			'error',
			{
				allowedTextDomain: ['blockera', 'blockera-site-toolkit'],
			},
		],
	},
};
