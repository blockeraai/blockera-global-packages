const path = require('path');
const {
	camelCaseDash,
} = require('@wordpress/dependency-extraction-webpack-plugin/lib/util');

/**
 * Shared root webpack.config.js factory for Blockera plugin/theme consumers.
 *
 * @param {Object} options
 * @param {Object} options.dependencies Consumer package.json dependencies map.
 * @param {Function} options.packagesConfig packagesWebpackConfig(env, argv) from this package.
 * @param {(packageName: string) => string} options.resolvePackageDir Relative package dir from project root.
 * @param {(versions: Object) => Object} options.getExternals Build webpack externals from version map.
 * @param {string[]} [options.exportDefaultPackages]
 * @param {string} [options.devtoolNamespace]
 * @return {(env: Object, argv: Object) => Object} Webpack config factory.
 */
function createRootWebpackConfig(options) {
	const {
		dependencies,
		packagesConfig,
		resolvePackageDir,
		getExternals,
		exportDefaultPackages = [],
		devtoolNamespace = 'blockera',
	} = options;

	return (env = {}, argv) => {
		if (!argv || env?.cypress) {
			return require(
				path.resolve(
					process.cwd(),
					'packages/global-packages/packages/dev-cypress/js/webpack.config.js'
				)
			);
		}

		const BLOCKERA_NAMESPACE = '@blockera/';
		const blockeraPackages = Object.keys(dependencies)
			.filter((packageName) => packageName.startsWith(BLOCKERA_NAMESPACE))
			.map((packageName) => packageName.replace(BLOCKERA_NAMESPACE, ''));

		const blockeraPackagesVersion = Object.fromEntries(
			blockeraPackages.map((packageName) => {
				const packageDir = resolvePackageDir(packageName);
				const { version } = require(
					path.resolve(process.cwd(), packageDir, 'package.json')
				);

				return [packageName, version.replace(/\./g, '_')];
			})
		);

		const blockeraEntries = blockeraPackages.reduce((memo, packageName) => {
			if (-1 !== packageName.indexOf('dev-')) {
				return memo;
			}

			if (!blockeraPackagesVersion[packageName]) {
				return memo;
			}

			const version = blockeraPackagesVersion[packageName];
			const packageDir = resolvePackageDir(packageName);

			let name = packageName.startsWith('blockera')
				? camelCaseDash(packageName + '_' + version)
				: camelCaseDash('blockera-' + packageName + '_' + version);

			if ('icons' === packageName) {
				name = packageName.startsWith('blockera')
					? camelCaseDash(packageName)
					: camelCaseDash('blockera-' + packageName);
			}

			return {
				...memo,
				[packageName]: {
					import: packageDir,
					library: {
						name,
						type: 'var',
						export: exportDefaultPackages.includes(packageName)
							? 'default'
							: undefined,
					},
				},
			};
		}, {});

		return packagesConfig(env, {
			...argv,
			projectRoot: process.cwd(),
			entry: blockeraEntries,
			devtoolNamespace,
			mode: argv?.mode || 'production',
			externals: getExternals(blockeraPackagesVersion),
		});
	};
}

module.exports = createRootWebpackConfig;
