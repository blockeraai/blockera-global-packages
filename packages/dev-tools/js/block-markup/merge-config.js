/**
 * Deep-merge product / CLI overrides onto the shared block-markup base.
 */

const { STEPS, baseConfig } = require('./base-config');

/**
 * @param {*} value Candidate.
 * @return {boolean} True for a plain object.
 */
function isPlainObject(value) {
	return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Shallow clone arrays; recurse plain objects.
 *
 * @param {*} value Value to clone.
 * @return {*} Clone.
 */
function cloneValue(value) {
	if (Array.isArray(value)) {
		return value.slice();
	}

	if (!isPlainObject(value)) {
		return value;
	}

	const out = {};
	const keys = Object.keys(value);

	for (let i = 0; i < keys.length; i++) {
		const key = keys[i];
		out[key] = cloneValue(value[key]);
	}

	return out;
}

/**
 * Deep-merge override onto base. Arrays replace. Objects recurse.
 *
 * @param {*} base Base value.
 * @param {*} override Override value.
 * @return {*} Merged value.
 */
function deepMerge(base, override) {
	if (override === undefined) {
		return cloneValue(base);
	}

	if (Array.isArray(override)) {
		return override.slice();
	}

	if (!isPlainObject(override) || !isPlainObject(base)) {
		return cloneValue(override);
	}

	const out = cloneValue(base);
	const keys = Object.keys(override);

	for (let i = 0; i < keys.length; i++) {
		const key = keys[i];
		const next = override[key];

		if (Array.isArray(next)) {
			out[key] = next.slice();
			continue;
		}

		if (isPlainObject(next) && isPlainObject(base[key])) {
			out[key] = deepMerge(base[key], next);
			continue;
		}

		out[key] = cloneValue(next);
	}

	return out;
}

/**
 * Filter a steps array to known names.
 *
 * @param {string[]} steps Candidate steps.
 * @param {string[]} warnings Warning sink.
 * @param {string} path Config path for the warning.
 * @return {string[]} Known steps.
 */
function filterKnownSteps(steps, warnings, path) {
	if (!Array.isArray(steps)) {
		return [];
	}

	const known = [];

	for (let i = 0; i < steps.length; i++) {
		const step = steps[i];
		if (STEPS.indexOf(step) === -1) {
			warnings.push(`${path}: unknown step "${step}" ignored.`);
			continue;
		}
		known.push(step);
	}

	return known;
}

/**
 * Drop product keys that do not exist on the base token map.
 *
 * @param {Object} merged Merged map.
 * @param {Object} baseMap Base map.
 * @param {string[]} warnings Warning sink.
 * @param {string} path Config path.
 */
function pruneUnknownKeys(merged, baseMap, warnings, path) {
	if (!isPlainObject(merged) || !isPlainObject(baseMap)) {
		return;
	}

	const keys = Object.keys(merged);

	for (let i = 0; i < keys.length; i++) {
		const key = keys[i];
		if (Object.prototype.hasOwnProperty.call(baseMap, key)) {
			continue;
		}
		warnings.push(`${path}: unknown token "${key}" ignored.`);
		delete merged[key];
	}
}

/**
 * Prune unknown sanitize / localize tokens after merge.
 *
 * @param {Object} merged Merged config.
 * @param {string[]} warnings Warning sink.
 */
function pruneUnknownTokens(merged, warnings) {
	if (merged.steps) {
		merged.steps.patterns = filterKnownSteps(
			merged.steps.patterns,
			warnings,
			'steps.patterns'
		);
		merged.steps.templates = filterKnownSteps(
			merged.steps.templates,
			warnings,
			'steps.templates'
		);
	}

	const baseSanitize = baseConfig.sanitize;
	const sanitize = merged.sanitize;

	if (sanitize && sanitize.blocks) {
		pruneUnknownKeys(
			sanitize.blocks,
			baseSanitize.blocks,
			warnings,
			'sanitize.blocks'
		);

		const blockNames = Object.keys(sanitize.blocks);
		for (let i = 0; i < blockNames.length; i++) {
			const name = blockNames[i];
			const block = sanitize.blocks[name];
			const baseBlock = baseSanitize.blocks[name];
			if (!block || !baseBlock || !block.attrs) {
				continue;
			}
			pruneUnknownKeys(
				block.attrs,
				baseBlock.attrs,
				warnings,
				`sanitize.blocks.${name}.attrs`
			);
		}
	}

	const baseLocalize = baseConfig.localize;
	const localize = merged.localize;

	if (localize && localize.html) {
		pruneUnknownKeys(
			localize.html,
			baseLocalize.html,
			warnings,
			'localize.html'
		);
	}

	if (localize && localize.blockAttrs && localize.blockAttrs.attrs) {
		pruneUnknownKeys(
			localize.blockAttrs.attrs,
			baseLocalize.blockAttrs.attrs,
			warnings,
			'localize.blockAttrs.attrs'
		);
	}

	if (localize && localize.skipStamps && baseLocalize.skipStamps) {
		pruneUnknownKeys(
			localize.skipStamps,
			baseLocalize.skipStamps,
			warnings,
			'localize.skipStamps'
		);
	}
}

/**
 * Merge base + product + CLI overrides.
 *
 * @param {Object} [product] Product `.block-markup.config.js` export.
 * @param {Object} [overrides] CLI / webpack overrides.
 * @return {{ config: Object, warnings: string[] }} Resolved config + warnings.
 */
function mergeBlockMarkupConfig(product = {}, overrides = {}) {
	const warnings = [];
	const merged = deepMerge(deepMerge(baseConfig, product), overrides);

	pruneUnknownTokens(merged, warnings);

	return { config: merged, warnings };
}

module.exports = {
	isPlainObject,
	cloneValue,
	deepMerge,
	mergeBlockMarkupConfig,
};
