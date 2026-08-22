/**
 * Internal dependencies
 */
const {
	hasUnsanitizedPatternMetadata,
	stripCopiedPatternMetadata,
	sanitizeMetadataInRawConfig,
	isMetadataSanitizeEnabled,
} = require('../sanitize-block-metadata');
const { mergeBlockMarkupConfig } = require('../merge-config');

describe('sanitize-block-metadata', () => {
	it('detects copied editor keys', () => {
		expect(
			hasUnsanitizedPatternMetadata(
				'<!-- wp:group {"metadata":{"patternName":"blockera-one/hero-book"}} -->'
			)
		).toBe(true);
		expect(
			hasUnsanitizedPatternMetadata(
				'<!-- wp:group {"metadata":{"name":"Body","blockeraOne":{"stamp":"container/body"}}} -->'
			)
		).toBe(false);
		expect(hasUnsanitizedPatternMetadata('<!-- wp:group -->')).toBe(false);
		expect(hasUnsanitizedPatternMetadata('')).toBe(false);
	});

	it('detects copied description / categories inside metadata', () => {
		expect(
			hasUnsanitizedPatternMetadata(
				'<!-- wp:group {"metadata":{"description":"Hero"}} -->'
			)
		).toBe(true);
	});

	it('is off when sanitize.metadata.enabled is false', () => {
		const { config } = mergeBlockMarkupConfig({
			sanitize: { metadata: { enabled: false } },
		});

		expect(isMetadataSanitizeEnabled(config.sanitize)).toBe(false);
		expect(
			hasUnsanitizedPatternMetadata(
				'<!-- wp:group {"metadata":{"patternName":"x"}} -->',
				config.sanitize
			)
		).toBe(false);
	});

	it('strips copied keys and title when patternName is present', () => {
		const configJson = {
			metadata: {
				patternName: 'blockera-one/hero',
				name: 'Hero',
				blockeraOne: { stamp: 'section/hero:default' },
			},
			align: 'full',
		};

		expect(stripCopiedPatternMetadata(configJson)).toBe(true);
		expect(configJson.metadata).toEqual({
			blockeraOne: { stamp: 'section/hero:default' },
		});
	});

	it('keeps List View name when patternName is absent', () => {
		const configJson = {
			metadata: {
				name: 'Body',
				blockeraOne: { stamp: 'container/body' },
			},
		};

		expect(stripCopiedPatternMetadata(configJson)).toBe(false);
		expect(configJson.metadata.name).toBe('Body');
	});

	it('drops metadata when only copied keys remain', () => {
		const configJson = {
			metadata: { patternName: 'x', name: 'Hero' },
		};

		stripCopiedPatternMetadata(configJson);
		expect(configJson.metadata).toBeUndefined();
	});

	it('keeps metadata.name when stripTitleWithPatternName is false', () => {
		const { config } = mergeBlockMarkupConfig({
			sanitize: {
				metadata: { stripTitleWithPatternName: false },
			},
		});
		const configJson = {
			metadata: {
				patternName: 'x',
				name: 'Hero',
				blockeraOne: { stamp: 'section/hero:default' },
			},
		};

		stripCopiedPatternMetadata(configJson, config.sanitize);
		expect(configJson.metadata).toEqual({
			name: 'Hero',
			blockeraOne: { stamp: 'section/hero:default' },
		});
	});

	it('strips metadata from a raw PHP-containing attrs blob', () => {
		const raw =
			'{"url":"<?php echo esc_url( get_template_directory_uri() ); ?>/assets/images/c.webp","metadata":{"patternName":"x","name":"Hero","blockeraOne":{"stamp":"section/hero:default"}}}';

		const next = sanitizeMetadataInRawConfig(raw);

		expect(next).toContain(
			'"url":"<?php echo esc_url( get_template_directory_uri() ); ?>/assets/images/c.webp"'
		);
		expect(next).toContain('"blockeraOne":{"stamp":"section/hero:default"}');
		expect(next).not.toContain('"patternName"');
		expect(next).not.toContain('"name":"Hero"');
	});
});
