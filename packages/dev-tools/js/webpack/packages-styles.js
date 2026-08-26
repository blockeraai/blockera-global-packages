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
// packages/dev-tools/js/webpack → shared packages/ (submodule)
const sharedPackagesDir = path.resolve(__dirname, '..', '..', '..');
// Host-local packages live next to the submodule (e.g. packages/site-toolkit).
const consumerPackagesDir = path.resolve(process.cwd(), 'packages');

function addStyleFiles(packagesRoot, files) {
	files.forEach((currentEntry) => {
		const relativeFromPackages = path
			.relative(packagesRoot, currentEntry)
			.split(path.sep)
			.join('/');
		const packageName = relativeFromPackages.split('/')[0];

		if (!packageName || -1 !== packageName.indexOf('dev-')) {
			return;
		}

		const key = `${packageName}-styles`;

		styleEntries[key] = [...(styleEntries[key] || []), currentEntry];
	});
}

addStyleFiles(
	sharedPackagesDir,
	glob.sync(path.join(sharedPackagesDir, '**/*.scss'))
);

if (consumerPackagesDir !== sharedPackagesDir) {
	addStyleFiles(
		consumerPackagesDir,
		glob.sync(path.join(consumerPackagesDir, '**/*.scss'), {
			ignore: ['**/global-packages/**', '**/node_modules/**'],
		})
	);
}

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
