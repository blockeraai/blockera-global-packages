const path = require('path');
const {
	camelCaseDash,
} = require('@wordpress/dependency-extraction-webpack-plugin/lib/util');
const {
	shouldUseQuietWatchLogging,
	withQuietWatchLogging,
} = require('./watch-status-plugin');

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
 * @param {(packageName: string) => string} [options.mapPackageName]
 *        Remap dependency slug after stripping `@blockera/` (e.g. Pro: guard → features-manager).
 * @param {(packageName: string) => string} [options.resolveCanonicalPackageName]
 *        Map public/entry slug back to the filesystem package slug for resolvePackageDir.
 * @param {(packageName: string) => boolean} [options.shouldIncludeEntry]
 *        Return false to omit a package from webpack entries (still kept in version map).
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
		mapPackageName = (packageName) => packageName,
		resolveCanonicalPackageName = (packageName) => packageName,
		shouldIncludeEntry = () => true,
	} = options;

	return (env = {}, argv) => {
		// Match Pro's historic `if (!argv)` Cypress branch, plus env.cypress for other consumers.
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
			.map((packageName) => packageName.replace(BLOCKERA_NAMESPACE, ''))
			.map(mapPackageName);

		const blockeraPackagesVersion = Object.fromEntries(
			blockeraPackages.map((packageName) => {
				const canonicalName = resolveCanonicalPackageName(packageName);
				const packageDir = resolvePackageDir(canonicalName);
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

			if (!shouldIncludeEntry(packageName)) {
				return memo;
			}

			if (!blockeraPackagesVersion[packageName]) {
				return memo;
			}

			const version = blockeraPackagesVersion[packageName];
			const canonicalName = resolveCanonicalPackageName(packageName);
			const packageDir = resolvePackageDir(canonicalName);

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

		if (blockeraEntries.icons) {
			const iconsCanonical = resolveCanonicalPackageName('icons');
			const iconsPackageDir = resolvePackageDir(iconsCanonical);

			blockeraEntries['icons-picker'] = {
				import: `${iconsPackageDir.replace(/\/$/, '')}/js/picker.js`,
				library: {
					name: 'blockeraIconsPicker',
					type: 'var',
				},
			};
		}

		const config = packagesConfig(env, {
			...argv,
			projectRoot: process.cwd(),
			entry: blockeraEntries,
			devtoolNamespace,
			mode: argv?.mode || 'production',
			externals: getExternals(blockeraPackagesVersion),
		});

		// `npm start` only (`--mode development`). Skip build and start:debug.
		if (shouldUseQuietWatchLogging(argv)) {
			return withQuietWatchLogging(config);
		}

		return config;
	};
}

module.exports = createRootWebpackConfig;
