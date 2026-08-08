/**
 * External dependencies
 */
const path = require('path');
const { createRequire } = require('module');
const glob = require('glob');

const consumerRequire = createRequire(path.join(process.cwd(), 'package.json'));
const CssMinimizerPlugin = consumerRequire('css-minimizer-webpack-plugin');

const styleEntries = {};
const editorIframeStyles = {};
// packages/dev-tools/js/webpack → packages/
const packagesDir = path.resolve(__dirname, '..', '..', '..');
const styleFiles = glob.sync(path.join(packagesDir, '**/*.scss'));

styleFiles.forEach((currentEntry) => {
	const relativeFromPackages = path
		.relative(packagesDir, currentEntry)
		.split(path.sep)
		.join('/');
	const packageName = relativeFromPackages.split('/')[0];

	if (!packageName || -1 !== packageName.indexOf('dev-')) {
		return;
	}

	Object.assign(styleEntries, {
		[`${packageName}-styles`]: [
			...(styleEntries[`${packageName}-styles`] || []),
			currentEntry,
		],
	});
});

module.exports = {
	entry: {
		...Object.fromEntries(
			Object.entries(styleEntries).filter(([, entry]) => entry.length)
		),
		...editorIframeStyles,
	},
	optimization: {
		minimizer: [new CssMinimizerPlugin()],
	},
};
