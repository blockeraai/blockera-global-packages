const postcssScss = require('postcss-scss');
const wpConfig = require('@wordpress/stylelint-config');
const ignoreFiles = require('./ignore');

module.exports = {
	...wpConfig,
	plugins: [...(wpConfig.plugins || []), 'stylelint-scss'],
	rules: {
		...(wpConfig.rules || {}),
		'function-url-quotes': 'always',
		'no-descending-specificity': null,
		'selector-class-pattern': null,
		'color-hex-length': 'long',
		'comment-empty-line-before': null,
		'value-keyword-case': null,
		'rule-empty-line-before': null,
		'at-rule-no-unknown': null,
		'scss/at-rule-no-unknown': true,
		'at-rule-empty-line-before': [
			'always',
			{
				except: ['blockless-after-blockless', 'first-nested'],
				ignore: ['after-comment'],
			},
		],
	},
	// Setting ignoreFiles replaces Stylelint's default node_modules ignore —
	// node_modules/** is included in ./ignore.js.
	ignoreFiles: [...(wpConfig.ignoreFiles || []), ...ignoreFiles],
	customSyntax: postcssScss, // MUST be last to prevent override
};
