/**
 * Webpack plugin: normalize block-markup files on each compile,
 * and register the source directories as watch dependencies.
 *
 * Reads theme-root `.block-markup.config.js`. No-ops when no source files exist.
 */

const fs = require('fs');
const path = require('path');

/**
 * @param {Object} [overrides] Optional config overrides.
 */
class NormalizeBlockMarkupWebpackPlugin {
	constructor(overrides = {}) {
		this.overrides = overrides;
	}

	apply(compiler) {
		const pluginName = 'NormalizeBlockMarkupWebpackPlugin';

		let cachedConfig = null;

		const getConfig = () => {
			const { loadBlockMarkupConfig } = require('../block-markup/load-config');
			cachedConfig = loadBlockMarkupConfig({
				...this.overrides,
				quiet: true,
			});
			return cachedConfig;
		};

		compiler.hooks.beforeCompile.tapPromise(pluginName, async () => {
			const { normalizeBlockMarkup } = require('../block-markup/normalize');

			let config;
			try {
				config = getConfig();
			} catch (error) {
				return;
			}

			if (config.webpack === false || !hasConfiguredSourceFiles(config)) {
				return;
			}

			await normalizeBlockMarkup(config);
		});

		compiler.hooks.afterCompile.tap(pluginName, (compilation) => {
			let config;
			try {
				config = cachedConfig || getConfig();
			} catch (error) {
				return;
			}

			compilation.fileDependencies.add(config.configPath);

			for (const source of config.sources) {
				for (const dir of source.dirs) {
					if (!fs.existsSync(dir)) {
						continue;
					}

					compilation.contextDependencies.add(dir);
					addSourceFileDependencies(compilation, dir);
				}
			}
		});
	}
}

/**
 * Recursively register markup source files for webpack watch.
 *
 * @param {import('webpack').Compilation} compilation Webpack compilation.
 * @param {string} dir Directory to watch.
 */
function addSourceFileDependencies(compilation, dir) {
	compilation.contextDependencies.add(dir);

	let entries;
	try {
		entries = fs.readdirSync(dir, { withFileTypes: true });
	} catch (error) {
		return;
	}

	for (const entry of entries) {
		if (entry.name.startsWith('.')) {
			continue;
		}

		const entryPath = path.join(dir, entry.name);

		if (entry.isDirectory()) {
			addSourceFileDependencies(compilation, entryPath);
			continue;
		}

		if (
			entry.isFile() &&
			(entry.name.endsWith('.php') || entry.name.endsWith('.html'))
		) {
			compilation.fileDependencies.add(entryPath);
		}
	}
}

/**
 * @param {Object} config Resolved block-markup config.
 * @return {boolean} True when any source has files.
 */
function hasConfiguredSourceFiles(config) {
	const { hasSourceFiles } = require('../block-markup/normalize');

	for (const source of config.sources || []) {
		if (hasSourceFiles(source.dirs, source.glob)) {
			return true;
		}
	}

	return false;
}

/**
 * Whether the product has configured source files.
 *
 * @param {Object} [overrides] Optional overrides.
 * @return {boolean} True when source files exist.
 */
function hasConfiguredSources(overrides = {}) {
	try {
		const { loadBlockMarkupConfig } = require('../block-markup/load-config');
		const config = loadBlockMarkupConfig({ ...overrides, quiet: true });
		if (config.webpack === false) {
			return false;
		}
		return hasConfiguredSourceFiles(config);
	} catch (error) {
		return false;
	}
}

module.exports = NormalizeBlockMarkupWebpackPlugin;
module.exports.hasConfiguredSources = hasConfiguredSources;
module.exports.hasConfiguredPatterns = hasConfiguredSources;
