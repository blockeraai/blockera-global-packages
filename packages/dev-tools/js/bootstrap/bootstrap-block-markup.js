/**
 * Block Markup bootstrap section: list tracked patterns/templates dirs when
 * NormalizeBlockMarkupWebpackPlugin would be active (config + webpack + files).
 */

const path = require('path');

const { loadBlockMarkupConfig } = require('../block-markup/load-config');
const { hasSourceFiles } = require('../block-markup/normalize');

/**
 * @param {string} productRoot Product root.
 * @param {string} absoluteDir Absolute directory path.
 * @return {string} Relative path with trailing slash.
 */
function formatRelativeDir(productRoot, absoluteDir) {
	const rel = path.relative(productRoot, absoluteDir).replace(/\\/g, '/');

	if (!rel || rel === '.') {
		return './';
	}

	return rel.endsWith('/') ? rel : `${rel}/`;
}

/**
 * Whether the Block Markup bootstrap section should run for this product root.
 *
 * @param {string} [root] Product root.
 * @return {boolean} True when webpack block-markup normalization is configured.
 */
function isBlockMarkupBootstrapActive(root = process.cwd()) {
	try {
		const config = loadBlockMarkupConfig({ quiet: true }, root);

		if (config.webpack === false) {
			return false;
		}

		for (const source of config.sources || []) {
			if (hasSourceFiles(source.dirs, source.glob)) {
				return true;
			}
		}

		return false;
	} catch (error) {
		return false;
	}
}

/**
 * @param {Object} config Loaded block-markup config.
 * @param {'patterns'|'templates'} kind Source kind.
 * @param {string} stepName Step title for bootstrap output.
 * @return {{ name: string, inners: { name: string }[], durationMs: number }|null}
 */
function collectSourceStep(config, kind, stepName) {
	const source = (config.sources || []).find((item) => item.kind === kind);

	if (!source) {
		return null;
	}

	const started = Date.now();
	const activeDirs = source.dirs.filter((dir) =>
		hasSourceFiles(dir, source.glob)
	);

	if (!activeDirs.length) {
		return null;
	}

	return {
		name: stepName,
		inners: activeDirs.map((dir) => ({
			name: formatRelativeDir(config.productRoot, dir),
		})),
		durationMs: Date.now() - started,
	};
}

/**
 * @param {Object} config Loaded block-markup config.
 * @return {{ name: string, inners: { name: string }[], durationMs: number }|null}
 */
function collectPatternsStep(config) {
	return collectSourceStep(config, 'patterns', 'Track patterns');
}

/**
 * @param {Object} config Loaded block-markup config.
 * @return {{ name: string, inners: { name: string }[], durationMs: number }|null}
 */
function collectTemplatesStep(config) {
	return collectSourceStep(config, 'templates', 'Track templates');
}

/**
 * @param {string} [root] Product root.
 * @return {{ steps: { name: string, inners: { name: string }[], durationMs: number }[] }}
 */
function collectBlockMarkupBootstrapSteps(root = process.cwd()) {
	const config = loadBlockMarkupConfig({ quiet: true }, root);
	const steps = [];

	const patterns = collectPatternsStep(config);

	if (patterns) {
		steps.push(patterns);
	}

	const templates = collectTemplatesStep(config);

	if (templates) {
		steps.push(templates);
	}

	return { steps };
}

module.exports = {
	isBlockMarkupBootstrapActive,
	collectPatternsStep,
	collectTemplatesStep,
	collectBlockMarkupBootstrapSteps,
	formatRelativeDir,
};
