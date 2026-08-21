/**
 * Internal dependencies
 */
const { STEPS, baseConfig } = require('../base-config');

describe('baseConfig', () => {
	it('defines the three pipeline steps and default source lists', () => {
		expect(STEPS).toEqual(['prettier', 'sanitize', 'localize']);
		expect(baseConfig.steps.patterns).toEqual([
			'prettier',
			'sanitize',
			'localize',
		]);
		expect(baseConfig.steps.templates).toEqual(['prettier', 'sanitize']);
		expect(baseConfig.globs.patterns).toBe('**/*.php');
		expect(baseConfig.globs.templates).toBe('**/*.html');
	});

	it('enables queryId, copied metadata, and localize tokens by default', () => {
		expect(
			baseConfig.sanitize.blocks['core/query'].attrs.queryId.enabled
		).toBe(true);
		expect(baseConfig.sanitize.metadata.keys).toEqual([
			'patternName',
			'description',
			'categories',
		]);
		expect(baseConfig.localize.html.textNodes.enabled).toBe(true);
		expect(baseConfig.localize.images.enabled).toBe(true);
	});
});
