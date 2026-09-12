/**
 * External dependencies
 */
const fs = require('fs');
const { createRequire } = require('module');
const { join, resolve } = require('path');

/**
 * Resolve build tooling from the consumer project (blockera / blockera-pro / theme).
 * This file lives in blockera-global-packages; a plain require('webpack') would load
 * a second webpack copy and crash DefinePlugin with "parser.getLocation is not a function".
 */
const consumerRequire = createRequire(join(process.cwd(), 'package.json'));

const webpack = consumerRequire('webpack');
const dotenv = consumerRequire('dotenv');
const TerserPlugin = consumerRequire('terser-webpack-plugin');
const MiniCssExtractPlugin = consumerRequire('mini-css-extract-plugin');
const CopyPlugin = consumerRequire('copy-webpack-plugin');

/**
 * WordPress dependencies
 */
const defaultConfig = consumerRequire(
	'@wordpress/scripts/config/webpack.config'
);
const postcssPlugins = consumerRequire('@wordpress/postcss-plugins-preset');
const DependencyExtractionWebpackPlugin = consumerRequire(
	'@wordpress/dependency-extraction-webpack-plugin'
);

/**
 * Internal dependencies
 */
const styleDependencies = require('./packages-styles');
const MergeThemeJsonWebpackPlugin = require('./merge-theme-json-plugin');
const NormalizeBlockMarkupWebpackPlugin = require('./normalize-block-markup-plugin');

/**
 * Keep `*-styles` bundles only for packages this consumer is compiling.
 * The glob in packages-styles.js sees every shared package; consumers such as
 * site-toolkit do not depend on blockera-admin and should not compile it.
 *
 * @param {Object} styleEntry Style webpack entries from packages-styles.
 * @param {string[]} jsEntryKeys Package slugs from the consumer JS entries.
 * @return {Object} Filtered style entries.
 */
function filterStyleEntries(styleEntry, jsEntryKeys) {
	const allowed = new Set(jsEntryKeys);

	return Object.fromEntries(
		Object.entries(styleEntry).filter(([key]) => {
			const match = key.match(/^(.*)-styles$/);

			if (!match) {
				return true;
			}

			return allowed.has(match[1]);
		})
	);
}

dotenv.config({ path: resolve(process.cwd(), '.env') });

/** Only theme products ship `theme-config/`; plugins skip the merge plugin. */
const shouldMergeThemeJson = MergeThemeJsonWebpackPlugin.hasThemeConfig();

/** Normalize block-markup when `.block-markup.config.js` has source files. */
const shouldNormalizeBlockMarkup =
	NormalizeBlockMarkupWebpackPlugin.hasConfiguredSources();

/**
 * Removes all svg rules from WordPress webpack config because it brakes the SVGR and SVGO plugins
 * Related to: https://github.com/gregberge/svgr/issues/361
 */
defaultConfig.module.rules
	.filter((rule) => rule.test)
	.forEach((rule) => {
		// Convert the test to a string, remove 'svg', and then create a new RegExp
		const source = rule.test.source;
		const modifiedSource = source
			.replace(/\|?svg\|?/g, (match) => {
				if (match.startsWith('|') && match.endsWith('|')) {
					return '|';
				}
				return '';
			})
			.replace(/^\|/, '')
			.replace(/\|$/, '');

		// If the modified source is empty or invalid, remove the rule
		if (modifiedSource) {
			rule.test = new RegExp(modifiedSource);
		} else {
			// Handle the case where the pattern is completely removed and leaves an empty string
			rule.test = null;
		}
	});

const scssLoaders = ({ isLazy }) => [
	{
		loader: 'style-loader',
		options: { injectType: isLazy ? 'lazyStyleTag' : 'styleTag' },
	},
	'css-loader',
	{
		loader: 'postcss-loader',
		options: {
			postcssOptions: {
				ident: 'postcss',
				plugins: postcssPlugins,
			},
		},
	},
	'sass-loader',
];

module.exports = (env, argv) => {
	const isProduction = argv.mode === 'production';
	// Consumer project root (e.g. blockera / blockera-pro). Shared packages live in
	// blockera-global-packages, so never derive this from __dirname.
	const pluginRoot = argv.projectRoot
		? resolve(argv.projectRoot)
		: process.cwd();

	const experimentalConfigDefaultPath = resolve(
		pluginRoot,
		'experimental.config.json'
	);
	const experimentalConfigLocalPath = resolve(
		pluginRoot,
		'local.experimental.config.json'
	);
	const experimentalConfigResolvedPath =
		!isProduction && fs.existsSync(experimentalConfigLocalPath)
			? experimentalConfigLocalPath
			: experimentalConfigDefaultPath;

	const styleEntry = filterStyleEntries(
		styleDependencies.entry,
		Object.keys(argv.entry || {})
	);

	return {
		mode: argv.mode,
		name: 'packages',
		entry: {
			...argv.entry,
			...styleEntry,
		},
		output: {
			devtoolNamespace: argv.devtoolNamespace,
			filename: isProduction
				? './dist/[name]/[name].min.js'
				: './dist/[name]/[name].js',
			path: pluginRoot,
		},
		module: {
			rules: [
				// Handle CSS files with ?raw query parameter (import as raw string)
				// This must come BEFORE the default CSS rules
				{
					test: /\.css$/i,
					resourceQuery: /raw/,
					type: 'asset/source',
				},
				...defaultConfig.module.rules,
				{
					test: /\.lazy\.scss$/,
					use: scssLoaders({ isLazy: true }),
					include: resolve(__dirname),
				},
				{
					test: /\.svg$/i,
					issuer: /\.[jt]sx?$/,
					use: ['@svgr/webpack'],
				},
				{
					test: /\.(txt|html)$/,
					type: 'asset/source',
				},
				{
					test: /[\\/]node_modules[\\/]@fortawesome[\\/]free-brands-svg-icons[\\/]/,
					loader: resolve(
						__dirname,
						'fortawesome-wp-icon-name-loader.js'
					),
				},
				{
					test: /[\\/]react-color[\\/](?:lib|es)[\\/]components[\\/]common[\\/]Checkboard\.js$/,
					enforce: 'pre',
					loader: resolve(
						__dirname,
						'react-color-checkboard-loader.js'
					),
				},
			],
		},
		plugins: [
			new DependencyExtractionWebpackPlugin({ injectPolyfill: true }),
			// Theme projects only (theme-config/ present). Plugins skip this.
			shouldMergeThemeJson ? new MergeThemeJsonWebpackPlugin() : null,
			// Normalize pattern PHP + template HTML when sources are present.
			shouldNormalizeBlockMarkup
				? new NormalizeBlockMarkupWebpackPlugin()
				: null,
			new CopyPlugin({
				patterns: [
					{
						// __dirname is packages/dev-tools/js/webpack; go up 3 levels to packages, then into editor
						from: resolve(
							__dirname,
							'..',
							'..',
							'..',
							'editor',
							'js',
							'preview-mode',
							'header',
							'style.css'
						),
						to: 'dist/editor/preview-header.css',
					},
				],
			}),
			new MiniCssExtractPlugin({
				filename: isProduction
					? './dist/[name]/style.min.css'
					: './dist/[name]/style.css',
				ignoreOrder: true,
			}),
			new webpack.DefinePlugin({
				'process.env': JSON.stringify(process.env),
			}),
		].filter(Boolean),
		resolve: {
			...defaultConfig.resolve,
			// Prefer the consumer's node_modules so deps are not pulled from
			// blockera-global-packages when compiling shared package sources.
			modules: [resolve(pluginRoot, 'node_modules'), 'node_modules'],
			alias: {
				...(defaultConfig.resolve?.alias || {}),
				'@blockera/experimental-config': experimentalConfigResolvedPath,
			},
			extensions: [
				'.tsx',
				'.ts',
				...(defaultConfig.resolve?.extensions || [
					'.jsx',
					'.js',
					'.json',
				]),
			],
		},
		optimization: {
			minimize: isProduction,
			minimizer: [
				new TerserPlugin(),
				...styleDependencies.optimization.minimizer,
			],
		},
		...(isProduction
			? {}
			: {
					devtool: 'source-map',
				}),
		externals: argv.externals,
	};
};
