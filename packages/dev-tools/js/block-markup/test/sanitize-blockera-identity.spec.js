/**
 * Internal dependencies
 */
const {
	hasUnsanitizedBlockeraIdentity,
	sanitizeBlockeraIdentityAttrs,
	isCanonicalBlockeraIdentity,
	isBlockeraIdentitySanitizeEnabled,
	applyIdentityClassReplacements,
	hasBlockeraFeatureAttributes,
} = require('../sanitize-blockera-identity');
const { mergeBlockMarkupConfig } = require('../merge-config');
const { escapeBlockAttrs } = require('../escape-block-attrs');

describe('sanitize-blockera-identity', () => {
	it('inherits the base token', () => {
		const { config } = mergeBlockMarkupConfig({});
		expect(config.sanitize.blockeraIdentity.enabled).toBe(true);
		expect(isBlockeraIdentitySanitizeEnabled(config.sanitize)).toBe(true);
	});

	it('detects leftover propsId, compatId, and block mode', () => {
		expect(
			hasUnsanitizedBlockeraIdentity(
				'<!-- wp:paragraph {"blockeraPropsId":"abc","blockeraFontSize":{"value":"16px"}} -->'
			)
		).toBe(true);
		expect(
			hasUnsanitizedBlockeraIdentity(
				'<!-- wp:paragraph {"blockeraCompatId":"xyz","blockeraFontSize":{"value":"16px"}} -->'
			)
		).toBe(true);
		expect(
			hasUnsanitizedBlockeraIdentity(
				'<!-- wp:paragraph {"blockeraBlockMode":"basic","blockeraId":"abc123","blockeraFontSize":{"value":"16px"},"className":"blockera-block blockera-block-abc123"} -->'
			)
		).toBe(true);
	});

	it('detects legacy double-hyphen unique class', () => {
		expect(
			hasUnsanitizedBlockeraIdentity(
				'<!-- wp:paragraph {"blockeraId":"abc123","blockeraFontSize":{"value":"16px"},"className":"blockera-block blockera-block--ohw5i7"} -->'
			)
		).toBe(true);
	});

	it('detects identity without feature attributes', () => {
		expect(
			hasUnsanitizedBlockeraIdentity(
				'<!-- wp:group {"blockeraId":"abc123","className":"blockera-block blockera-block-abc123"} -->'
			)
		).toBe(true);
	});

	it('treats canonical feature blocks as clean', () => {
		const markup =
			'<!-- wp:paragraph {"blockeraId":"abc123","blockeraFontSize":{"value":"16px"},"className":"blockera-block blockera-block-abc123"} -->';
		expect(hasUnsanitizedBlockeraIdentity(markup)).toBe(false);
		expect(
			isCanonicalBlockeraIdentity({
				blockeraId: 'abc123',
				blockeraFontSize: { value: '16px' },
				className: 'blockera-block blockera-block-abc123',
			})
		).toBe(true);
	});

	it('treats stamp-only blocks without identity as clean', () => {
		expect(
			hasUnsanitizedBlockeraIdentity(
				'<!-- wp:group {"metadata":{"blockeraOne":{"stamp":"section/header:simple"}}} -->'
			)
		).toBe(false);
	});

	it('is off when sanitize.blockeraIdentity.enabled is false', () => {
		const { config } = mergeBlockMarkupConfig({
			sanitize: { blockeraIdentity: { enabled: false } },
		});

		expect(
			hasUnsanitizedBlockeraIdentity(
				'<!-- wp:paragraph {"blockeraPropsId":"abc"} -->',
				config.sanitize
			)
		).toBe(false);
	});

	it('strips unused identity and records HTML remaps', () => {
		const attrs = {
			blockeraId: 'abc123',
			className: 'blockera-block blockera-block-abc123 is-style-default',
			metadata: { blockeraOne: { stamp: 'container/body' } },
		};
		const replacements = [];

		expect(sanitizeBlockeraIdentityAttrs(attrs, replacements)).toBe(true);
		expect(attrs.blockeraId).toBeUndefined();
		expect(attrs.className).toBe('is-style-default');
		expect(attrs.metadata.blockeraOne.stamp).toBe('container/body');
		expect(replacements).toEqual([
			{ from: 'blockera-block-abc123', to: '' },
		]);
	});

	it('rewrites mismatched unique class to match a canonical id', () => {
		const attrs = {
			blockeraId: 'abc123',
			blockeraFontSize: { value: '16px' },
			className: 'blockera-block blockera-block-uxsj71',
		};
		const replacements = [];

		expect(sanitizeBlockeraIdentityAttrs(attrs, replacements)).toBe(true);
		expect(attrs.blockeraId).toBe('abc123');
		expect(attrs.className).toBe('blockera-block blockera-block-abc123');
		expect(replacements).toEqual([
			{ from: 'blockera-block-uxsj71', to: 'blockera-block-abc123' },
		]);
	});

	it('mints a canonical id for UUID identity with features', () => {
		const attrs = {
			blockeraId: '61e0c2af-4c61-4c61-a17b-c19fa5d39992',
			blockeraFontSize: { value: '20px' },
			className:
				'blockera-block blockera-block-61e0c2af-4c61-4c61-a17b-c19fa5d39992',
		};
		const replacements = [];

		expect(sanitizeBlockeraIdentityAttrs(attrs, replacements)).toBe(true);
		expect(attrs.blockeraId).toMatch(/^[0-9a-z]{6}$/);
		expect(attrs.className).toBe(
			`blockera-block blockera-block-${attrs.blockeraId}`
		);
		expect(replacements[0].from).toBe(
			'blockera-block-61e0c2af-4c61-4c61-a17b-c19fa5d39992'
		);
		expect(replacements[0].to).toBe(
			`blockera-block-${attrs.blockeraId}`
		);
	});

	it('does not remint an already canonical block', () => {
		const attrs = {
			blockeraId: 'abc123',
			blockeraFontSize: { value: '16px' },
			className: 'blockera-block blockera-block-abc123 extra',
		};

		expect(sanitizeBlockeraIdentityAttrs(attrs, [])).toBe(false);
		expect(attrs.blockeraId).toBe('abc123');
	});

	it('deletes leftover keys through escapeBlockAttrs', () => {
		const next = escapeBlockAttrs(
			' wp:paragraph {"blockeraPropsId":"uuid","blockeraCompatId":"zz","blockeraBlockMode":"basic","blockeraFontSize":{"value":"16px"},"className":"blockera-block blockera-block-oldtok"} ',
			'blockera-one'
		);

		expect(next).not.toContain('blockeraPropsId');
		expect(next).not.toContain('blockeraCompatId');
		expect(next).not.toContain('blockeraBlockMode');
		expect(next).toMatch(/"blockeraId":"[0-9a-z]{6}"/);
	});

	it('applies unique-class remaps on HTML class lists', () => {
		expect(
			applyIdentityClassReplacements(
				'wp-block-group blockera-block blockera-block-oldtok extra',
				[{ from: 'blockera-block-oldtok', to: 'blockera-block-abc123' }]
			)
		).toBe(
			'wp-block-group blockera-block blockera-block-abc123 extra'
		);

		expect(
			applyIdentityClassReplacements(
				'wp-block-group blockera-block blockera-block-oldtok extra',
				[{ from: 'blockera-block-oldtok', to: '' }]
			)
		).toBe('wp-block-group extra');
	});

	it('treats empty feature wrappers as unused', () => {
		expect(
			hasBlockeraFeatureAttributes({
				blockeraId: 'abc123',
				blockeraBackground: { value: {} },
			})
		).toBe(false);
		expect(
			hasBlockeraFeatureAttributes({
				blockeraFontSize: { value: '16px' },
			})
		).toBe(true);
	});
});
