const crypto = require('crypto');

/**
 * Stable short hash for SVG id prefixes.
 * Uses Node crypto so consumers do not need a `string-hash` dependency
 * (Pro and other thin checkouts may not list it in package.json).
 *
 * @param {string|undefined|null} value Input used to derive a stable prefix.
 * @return {string} Short hex digest suitable for SVG id prefixes.
 */
function hash(value) {
	return crypto
		.createHash('sha1')
		.update(String(value ?? ''))
		.digest('hex')
		.slice(0, 10);
}

module.exports = {
	plugins: [
		{
			name: 'preset-default',
			params: {
				overrides: {
					removeViewBox: false,
				},
			},
		},
		{
			name: 'prefixIds',
			params: {
				prefix(element, filepath) {
					return `blockera-svg-${hash(filepath?.path)}`;
				},
			},
		},
	],
};
