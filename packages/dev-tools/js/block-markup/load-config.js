/**
 * Load product `.block-markup.config.js` and merge onto the GP base config.
 */

const fs = require('fs');
const path = require('path');

const { mergeBlockMarkupConfig } = require('./merge-config');

// <product>/packages/global-packages/packages/dev-tools/js/block-markup → product root
const PRODUCT_ROOT = path.resolve(
	__dirname,
	'..',
	'..',
	'..',
	'..',
	'..',
	'..'
);
const CONFIG_FILE_NAME = '.block-markup.config.js';
const DEFAULT_IMAGE_PATH_ROOTS = ['assets', 'patterns/images'];

/**
 * @return {string} Absolute product root.
 */
function getProductRoot() {
	return PRODUCT_ROOT;
}

/**
 * @param {string} [productRoot] Product root override.
 * @return {string} Config file path.
 */
function getBlockMarkupConfigPath(productRoot = PRODUCT_ROOT) {
	return path.join(productRoot, CONFIG_FILE_NAME);
}

/**
 * Normalize a dir config value. Unset → []. No implicit `patterns/` fallback.
 *
 * @param {string|string[]|undefined} dirs New multi-dir config.
 * @param {string|string[]|undefined} legacyDir Legacy singular alias.
 * @return {string[]} Relative directory paths.
 */
function normalizeDirsRelative(dirs, legacyDir) {
	const raw = dirs ?? legacyDir;

	if (raw === undefined || raw === null || raw === '') {
		return [];
	}

	if (Array.isArray(raw)) {
		return raw.filter(Boolean);
	}

	if (typeof raw === 'string') {
		return [raw];
	}

	return [];
}

/**
 * @param {string[]} relativeDirs Relative or absolute directories.
 * @param {string} productRoot Product root.
 * @return {string[]} Absolute directory paths.
 */
function resolveDirs(relativeDirs, productRoot) {
	return relativeDirs.map((dir) =>
		path.isAbsolute(dir) ? dir : path.join(productRoot, dir)
	);
}

/**
 * Whether a step is enabled on a source.
 *
 * @param {string[]} steps Source steps.
 * @param {string} name Step name.
 * @return {boolean} True when present.
 */
function sourceHasStep(steps, name) {
	return Array.isArray(steps) && steps.indexOf(name) !== -1;
}

/**
 * Load, merge, and resolve `.block-markup.config.js`.
 *
 * @param {Object} [overrides] CLI / webpack overrides.
 * @param {string} [productRoot] Product root override.
 * @return {Object} Options ready for normalizeBlockMarkup().
 */
function loadBlockMarkupConfig(overrides = {}, productRoot = PRODUCT_ROOT) {
	const configPath = getBlockMarkupConfigPath(productRoot);

	if (!fs.existsSync(configPath)) {
		throw new Error(
			`Missing ${CONFIG_FILE_NAME} at ${configPath}. Create it with textDomain, uriPhpExpression, and optional patternsDirs / templatesDirs.`
		);
	}

	delete require.cache[require.resolve(configPath)];
	const fileConfig = require(configPath);

	const { config, warnings } = mergeBlockMarkupConfig(fileConfig, overrides);

	const textDomain = overrides.textDomain ?? fileConfig.textDomain;
	const uriPhpExpression =
		overrides.uriPhpExpression ?? fileConfig.uriPhpExpression;
	const imagePathRoots =
		overrides.imagePathRoots ??
		fileConfig.imagePathRoots ??
		DEFAULT_IMAGE_PATH_ROOTS;

	const patternsRelative = normalizeDirsRelative(
		overrides.patternsDirs ?? fileConfig.patternsDirs,
		overrides.patternsDir ?? fileConfig.patternsDir
	);
	const templatesRelative = normalizeDirsRelative(
		overrides.templatesDirs ?? fileConfig.templatesDirs,
		overrides.templatesDir ?? fileConfig.templatesDir
	);

	if (!textDomain) {
		throw new Error(`${CONFIG_FILE_NAME}: textDomain is required.`);
	}

	if (!uriPhpExpression) {
		throw new Error(`${CONFIG_FILE_NAME}: uriPhpExpression is required.`);
	}

	const patternsDirs = resolveDirs(patternsRelative, productRoot);
	const templatesDirs = resolveDirs(templatesRelative, productRoot);

	let patternSteps = config.steps.patterns;
	let templateSteps = config.steps.templates;

	if (overrides.prettierOnly || config.prettierOnly) {
		patternSteps = ['prettier'];
		templateSteps = ['prettier'];
	}

	const sources = [];

	if (patternsDirs.length > 0) {
		sources.push({
			kind: 'patterns',
			dirs: patternsDirs,
			glob: config.globs.patterns,
			steps: patternSteps,
		});
	}

	if (templatesDirs.length > 0) {
		sources.push({
			kind: 'templates',
			dirs: templatesDirs,
			glob: config.globs.templates,
			steps: templateSteps,
		});
	}

	const quiet = Boolean(overrides.quiet);

	if (!quiet) {
		for (let i = 0; i < warnings.length; i++) {
			// @debug-ignore — CLI warning for unknown block-markup tokens
			// eslint-disable-next-line no-console
			console.warn(`block-markup: ${warnings[i]}`);
		}
	}

	return {
		productRoot,
		configPath,
		textDomain,
		uriPhpExpression,
		imagePathRoots,
		patternsDirs,
		templatesDirs,
		/** @deprecated Prefer patternsDirs. */
		patternsDir: patternsDirs[0],
		prettier: config.prettier,
		sanitize: config.sanitize,
		localize: config.localize,
		steps: config.steps,
		globs: config.globs,
		sources,
		warnings,
		force: Boolean(overrides.force),
		quiet,
		debug: Boolean(overrides.debug),
		check: Boolean(overrides.check),
		prettierOnly: Boolean(overrides.prettierOnly || config.prettierOnly),
		webpack:
			overrides.webpack !== false &&
			fileConfig.webpack !== false &&
			config.webpack !== false,
	};
}

module.exports = {
	CONFIG_FILE_NAME,
	DEFAULT_IMAGE_PATH_ROOTS,
	PRODUCT_ROOT,
	getProductRoot,
	getBlockMarkupConfigPath,
	normalizeDirsRelative,
	resolveDirs,
	sourceHasStep,
	loadBlockMarkupConfig,
};
