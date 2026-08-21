/**
 * Internal dependencies
 */
const { mergeBlockMarkupConfig, deepMerge, isPlainObject } = require('../merge-config');
const { baseConfig } = require('../base-config');

describe('isPlainObject / deepMerge', () => {
	it('detects plain objects', () => {
		expect(isPlainObject({})).toBe(true);
		expect(isPlainObject([])).toBe(false);
		expect(isPlainObject(null)).toBe(false);
	});

	it('replaces arrays and recurses objects', () => {
		expect(deepMerge({ a: [1] }, { a: [2, 3] })).toEqual({ a: [2, 3] });
		expect(deepMerge({ a: { b: 1, c: 2 } }, { a: { b: 9 } })).toEqual({
			a: { b: 9, c: 2 },
		});
	});
});

describe('mergeBlockMarkupConfig', () => {
	it('inherits base tokens when the product omits them', () => {
		const { config } = mergeBlockMarkupConfig({});
		expect(config.sanitize.blocks['core/query'].attrs.queryId.enabled).toBe(
			true
		);
		expect(config.steps.templates).toEqual(['prettier', 'sanitize']);
		expect(config.steps.patterns).toEqual(baseConfig.steps.patterns);
	});

	it('replaces steps arrays and warns on unknown steps', () => {
		const { config, warnings } = mergeBlockMarkupConfig({
			steps: { patterns: ['prettier', 'invented'] },
		});
		expect(config.steps.patterns).toEqual(['prettier']);
		expect(warnings.some((warning) => warning.includes('invented'))).toBe(
			true
		);
	});

	it('ignores unknown sanitize tokens', () => {
		const { config, warnings } = mergeBlockMarkupConfig({
			sanitize: {
				blocks: {
					'core/made-up': { enabled: true },
				},
			},
		});
		expect(config.sanitize.blocks['core/made-up']).toBeUndefined();
		expect(warnings.length).toBeGreaterThan(0);
	});

	it('ignores unknown localize.html tokens', () => {
		const { config, warnings } = mergeBlockMarkupConfig({
			localize: {
				html: { madeUp: { enabled: true } },
			},
		});
		expect(config.localize.html.madeUp).toBeUndefined();
		expect(warnings.some((warning) => warning.includes('madeUp'))).toBe(
			true
		);
	});

	it('merges a disabled queryId token onto the base block', () => {
		const { config } = mergeBlockMarkupConfig({
			sanitize: {
				blocks: {
					'core/query': {
						attrs: { queryId: { enabled: false } },
					},
				},
			},
		});
		expect(config.sanitize.blocks['core/query'].enabled).toBe(true);
		expect(config.sanitize.blocks['core/query'].attrs.queryId.enabled).toBe(
			false
		);
	});
});
