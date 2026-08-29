import {
	cleanEmptyObject,
	generateBlockeraAttributeId,
	getAttributesWithIds,
	hasBlockeraFeatureAttributes,
	isEmptyBlockStatesValue,
	migrateLegacyBlockeraIds,
	normalizeBlockeraBlockStatesValue,
	omitUnusedBlockeraFeatureAttributes,
	remintBlockeraIdentity,
	needsLegacyBlockeraIdMigrate,
	normalizeBlockeraIds,
	stripBlockeraBlockClasses,
	stripBlockeraIdentity,
	withCleanedWpStyle,
	withoutBlockeraIdentityIfUnused,
} from '../get-attributes-with-ids';

describe('Blockera attribute ids', () => {
	it('generates a 6-character lowercase alphanumeric id', () => {
		const id = generateBlockeraAttributeId();

		expect(id).toMatch(/^[0-9a-z]{6}$/);
		expect(id).toBe(id.toLowerCase());
	});

	it('does not collide across many rapid calls', () => {
		const seen = new Set();

		for (let i = 0; i < 2000; i++) {
			seen.add(generateBlockeraAttributeId());
		}

		expect(seen.size).toBe(2000);
	});

	it('does not overwrite an existing blockeraId unless forced', () => {
		const state = { blockeraId: 'existing' };

		expect(getAttributesWithIds(state, 'blockeraId')).toEqual(
			expect.objectContaining({ blockeraId: 'existing' })
		);
		expect(
			getAttributesWithIds(state, 'blockeraId', true).blockeraId
		).toMatch(/^[0-9a-z]{6}$/);
	});

	it('assigns a missing blockeraId', () => {
		const next = getAttributesWithIds({}, 'blockeraId');

		expect(next.blockeraId).toMatch(/^[0-9a-z]{6}$/);
	});

	it('maps legacy identifier names to blockeraId', () => {
		const next = getAttributesWithIds({}, 'blockeraPropsId');

		expect(next.blockeraId).toMatch(/^[0-9a-z]{6}$/);
		expect(next.blockeraPropsId).toBeUndefined();
		expect(next.blockeraCompatId).toBeUndefined();
	});

	it('uses blockeraId for the unique class token when none exists', () => {
		const next = getAttributesWithIds(
			{ className: 'is-style-plain' },
			'blockeraId'
		);
		const unique = `blockera-block-${next.blockeraId}`;

		expect(next.className.split(/\s+/)).toEqual(
			expect.arrayContaining(['is-style-plain', 'blockera-block', unique])
		);
	});

	it('does not rewrite an existing unique class', () => {
		const next = getAttributesWithIds(
			{
				blockeraId: 'abc123',
				className: 'blockera-block blockera-block-zzzzzz extra',
			},
			'blockeraId'
		);

		expect(next.className).toBe(
			'blockera-block blockera-block-zzzzzz extra'
		);
	});
});

describe('normalizeBlockeraIds', () => {
	it('leaves legacy keys when blockeraId is missing', () => {
		const state = {
			blockeraPropsId: 'd03e38bb-a490-42dc-8a2c-9016a8e40f6c',
			blockeraCompatId: 'rdnm2t',
			blockeraFontSize: { value: '20px' },
		};

		expect(normalizeBlockeraIds(state)).toBe(state);
		expect(needsLegacyBlockeraIdMigrate(state)).toBe(true);
	});

	it('does not overwrite an existing blockeraId', () => {
		const next = normalizeBlockeraIds({
			blockeraId: 'keepme',
			blockeraPropsId: 'oldid',
		});

		expect(next.blockeraId).toBe('keepme');
		expect(next.blockeraPropsId).toBeUndefined();
	});

	it('keeps a unique class that differs from the id', () => {
		const next = normalizeBlockeraIds({
			blockeraId: 'abc123',
			blockeraPropsId: 'oldid',
			className: 'blockera-block blockera-block-oldtoken extra',
		});

		expect(next.blockeraId).toBe('abc123');
		expect(next.className).toBe(
			'blockera-block blockera-block-oldtoken extra'
		);
	});

	it('adds unique class when missing', () => {
		const next = normalizeBlockeraIds({
			blockeraId: 'abc123',
			className: 'is-style-plain',
		});

		expect(next.className.split(/\s+/)).toEqual(
			expect.arrayContaining([
				'is-style-plain',
				'blockera-block',
				'blockera-block-abc123',
			])
		);
	});

	it('strips Blockera classes in basic mode and keeps attrs', () => {
		const next = normalizeBlockeraIds({
			blockeraId: 'abc123',
			blockeraPropsId: 'oldid',
			blockeraBlockMode: 'basic',
			blockeraFontSize: { value: '20px' },
			className: 'blockera-block blockera-block-abc123 extra',
		});

		expect(next.blockeraId).toBe('abc123');
		expect(next.blockeraFontSize).toEqual({ value: '20px' });
		expect(next.className).toBe('extra');
		expect(stripBlockeraBlockClasses('blockera-block blockera-block-x a')).toBe(
			'a'
		);
	});
});

describe('migrateLegacyBlockeraIds', () => {
	it('mints a 6-character id and rewrites the unique class', () => {
		const next = migrateLegacyBlockeraIds({
			blockeraPropsId: 'd03e38bb-a490-42dc-8a2c-9016a8e40f6c',
			blockeraCompatId: 'rdnm2t',
			blockeraFontColor: { value: '#e82121' },
			className: 'blockera-block blockera-block--ohw5i7 extra',
		});

		expect(next.blockeraId).toMatch(/^[0-9a-z]{6}$/);
		expect(next.blockeraPropsId).toBeUndefined();
		expect(next.blockeraCompatId).toBeUndefined();
		expect(next.blockeraFontColor).toEqual({ value: '#e82121' });
		expect(next.className.split(/\s+/)).toEqual(
			expect.arrayContaining([
				'extra',
				'blockera-block',
				`blockera-block-${next.blockeraId}`,
			])
		);
		expect(next.className).not.toContain('blockera-block--ohw5i7');
		expect(needsLegacyBlockeraIdMigrate(next)).toBe(false);
	});

	it('returns the same object when already canonical', () => {
		const state = {
			blockeraId: 'abc123',
			className: 'blockera-block blockera-block-abc123',
		};

		expect(migrateLegacyBlockeraIds(state)).toBe(state);
	});
});

describe('remintBlockeraIdentity', () => {
	it('mints a new id and rewrites the unique class', () => {
		const next = remintBlockeraIdentity({
			blockeraId: 'abc123',
			blockeraBackgroundColor: { value: 'var:preset|color|accent-4' },
			className: 'blockera-block blockera-block-abc123 extra',
		});

		expect(next.blockeraId).toMatch(/^[0-9a-z]{6}$/);
		expect(next.blockeraId).not.toBe('abc123');
		expect(next.blockeraPropsId).toBeUndefined();
		expect(next.blockeraCompatId).toBeUndefined();
		expect(next.className.split(/\s+/)).toEqual(
			expect.arrayContaining([
				'extra',
				'blockera-block',
				`blockera-block-${next.blockeraId}`,
			])
		);
		expect(next.className).not.toContain('blockera-block-abc123');
		expect(next.blockeraBackgroundColor).toEqual({
			value: 'var:preset|color|accent-4',
		});
	});

	it('rewrites unique class even when force-assign would keep it', () => {
		const forced = getAttributesWithIds(
			{
				blockeraId: 'abc123',
				className: 'blockera-block blockera-block-abc123 extra',
			},
			'blockeraId',
			true
		);

		expect(forced.className).toContain('blockera-block-abc123');

		const reminted = remintBlockeraIdentity(forced);

		expect(reminted.className).not.toContain('blockera-block-abc123');
		expect(reminted.className).toContain(
			`blockera-block-${reminted.blockeraId}`
		);
	});

	it('stamps unique class when none exists', () => {
		const next = remintBlockeraIdentity({
			blockeraId: 'abc123',
			className: 'is-style-plain',
		});

		expect(next.blockeraId).not.toBe('abc123');
		expect(next.className.split(/\s+/)).toEqual(
			expect.arrayContaining([
				'is-style-plain',
				'blockera-block',
				`blockera-block-${next.blockeraId}`,
			])
		);
	});

	it('returns an empty object for a non-object', () => {
		expect(remintBlockeraIdentity(null)).toEqual({});
	});
});

describe('withoutBlockeraIdentityIfUnused', () => {
	const schemaDefaults = {
		blockeraFontSize: { type: 'object', default: { value: '' } },
		blockeraBackgroundClip: {
			type: 'object',
			default: { value: 'none' },
		},
		blockeraInnerBlocks: { type: 'object', default: { value: {} } },
		blockeraZIndex: { type: 'object', default: { value: '' } },
		blockeraHidden: { type: 'object', default: { value: '' } },
	};

	it('keeps non-Blockera class names and drops empty className', () => {
		const withExtra = stripBlockeraIdentity({
			blockeraId: 'abc123',
			className:
				'is-style-text-subtitle blockera-block blockera-block-abc123',
		});

		expect(withExtra.blockeraId).toBeUndefined();
		expect(withExtra.className).toBe('is-style-text-subtitle');

		const onlyBlockera = stripBlockeraIdentity({
			blockeraId: 'abc123',
			className: 'blockera-block blockera-block-abc123',
		});

		expect(onlyBlockera.className).toBeUndefined();
	});

	it('strips identity when the last feature is empty', () => {
		const next = withoutBlockeraIdentityIfUnused(
			{
				blockeraId: 'abc123',
				blockeraFontSize: { value: '' },
				blockeraBackgroundClip: { value: 'none' },
				blockeraInnerBlocks: { value: {} },
				className: 'blockera-block blockera-block-abc123 extra',
			},
			schemaDefaults
		);

		expect(next.blockeraId).toBeUndefined();
		expect(next.className).toBe('extra');
		expect(next.blockeraFontSize).toEqual({ value: '' });
		expect(next.blockeraBackgroundClip).toEqual({ value: 'none' });
		expect(next.blockeraInnerBlocks).toEqual({ value: {} });
		expect(hasBlockeraFeatureAttributes(next, schemaDefaults)).toBe(false);
	});

	it('rewraps unwrapped unused values to registered { value } defaults', () => {
		const next = omitUnusedBlockeraFeatureAttributes(
			{
				blockeraFontColor: '',
				blockeraBackgroundClip: 'none',
				blockeraBorder: {
					type: 'all',
					all: { width: '', style: '', color: '' },
				},
				blockeraCustomCSS: '& {\n    \n}\n',
				content: 'Hello',
			},
			{
				...schemaDefaults,
				blockeraFontColor: { type: 'object', default: { value: '' } },
				blockeraBorder: {
					type: 'object',
					default: {
						value: {
							type: 'all',
							all: { width: '', style: '', color: '' },
						},
					},
				},
				blockeraCustomCSS: {
					type: 'object',
					default: { value: '& {\n    \n}\n' },
				},
			}
		);

		expect(next.blockeraFontColor).toEqual({ value: '' });
		expect(next.blockeraBackgroundClip).toEqual({ value: 'none' });
		expect(next.blockeraBorder).toEqual({
			value: {
				type: 'all',
				all: { width: '', style: '', color: '' },
			},
		});
		expect(next.blockeraCustomCSS).toEqual({
			value: '& {\n    \n}\n',
		});
		expect(next.content).toBe('Hello');
	});

	it('resets unused values to schema defaults after a font-color reset (dual-shape + empty inner blocks)', () => {
		const defaultCustomCss = '& {\n    \n}\n';
		const flexDefault = {
			value: {
				direction: 'row',
				alignItems: '',
				justifyContent: '',
			},
		};
		const schema = {
			...schemaDefaults,
			blockeraFontColor: { type: 'object', default: { value: '' } },
			blockeraCustomCSS: {
				type: 'object',
				default: { value: defaultCustomCss },
			},
			blockeraFlexLayout: {
				type: 'object',
				default: flexDefault,
			},
			blockeraCursor: { type: 'object', default: { value: 'default' } },
		};

		const next = withoutBlockeraIdentityIfUnused(
			{
				blockeraId: 'ol4b0z',
				blockeraFontColor: '',
				blockeraBackgroundClip: 'none',
				blockeraCustomCSS: defaultCustomCss,
				blockeraCursor: 'default',
				blockeraFlexLayout: {
					value: {
						direction: 'row',
						alignItems: '',
						justifyContent: '',
					},
					direction: 'row',
					alignItems: '',
					justifyContent: '',
				},
				blockeraInnerBlocks: {
					value: {
						'elements/link': {
							attributes: {},
						},
					},
				},
				className: 'blockera-block blockera-block-ol4b0z',
			},
			schema
		);

		expect(next.blockeraId).toBeUndefined();
		expect(next.className).toBeUndefined();
		expect(next.blockeraFontColor).toEqual({ value: '' });
		expect(next.blockeraBackgroundClip).toEqual({ value: 'none' });
		expect(next.blockeraCustomCSS).toEqual({ value: defaultCustomCss });
		expect(next.blockeraCursor).toEqual({ value: 'default' });
		expect(next.blockeraFlexLayout).toEqual(flexDefault);
		expect(next.blockeraInnerBlocks).toEqual({ value: {} });
		expect(hasBlockeraFeatureAttributes(next, schema)).toBe(false);
	});

	it('resets unused keys to schema defaults while keeping a real feature and identity', () => {
		const next = withoutBlockeraIdentityIfUnused(
			{
				blockeraId: 'abc123',
				blockeraFontSize: { value: '18px' },
				blockeraBackgroundClip: { value: 'none' },
				blockeraInnerBlocks: {
					value: {
						'elements/link': {
							attributes: {},
						},
					},
				},
				className: 'blockera-block blockera-block-abc123',
			},
			schemaDefaults
		);

		expect(next.blockeraId).toBe('abc123');
		expect(next.className).toBe('blockera-block blockera-block-abc123');
		expect(next.blockeraFontSize).toEqual({ value: '18px' });
		expect(next.blockeraBackgroundClip).toEqual({ value: 'none' });
		expect(next.blockeraInnerBlocks).toEqual({ value: {} });
		expect(hasBlockeraFeatureAttributes(next, schemaDefaults)).toBe(true);
	});

	it('does not treat text-shadow repeater items as empty inner-block slots', () => {
		const textShadow = {
			value: {
				0: {
					isVisible: true,
					x: '1px',
					y: '1px',
					blur: '1px',
					color: '#000000ab',
					order: 0,
				},
			},
		};
		const schema = {
			...schemaDefaults,
			blockeraTextShadow: { type: 'object', default: { value: {} } },
		};

		const next = omitUnusedBlockeraFeatureAttributes(
			{
				blockeraId: 'abc123',
				blockeraTextShadow: textShadow,
			},
			schema
		);

		expect(next.blockeraTextShadow).toEqual(textShadow);
		expect(hasBlockeraFeatureAttributes(next, schema)).toBe(true);
	});

	it('keeps reset inner-block item slots as { attributes: {} } when siblings have values', () => {
		const next = omitUnusedBlockeraFeatureAttributes(
			{
				blockeraInnerBlocks: {
					value: {
						'elements/container': {
							attributes: {},
						},
						'elements/avatar': {
							attributes: { blockeraWidth: '40px' },
						},
					},
				},
			},
			schemaDefaults
		);

		expect(next.blockeraInnerBlocks).toEqual({
			value: {
				'elements/container': {
					attributes: {},
				},
				'elements/avatar': {
					attributes: { blockeraWidth: '40px' },
				},
			},
		});
	});

	it('does not fill schema defaults into a reset inner-block slot', () => {
		const next = omitUnusedBlockeraFeatureAttributes(
			{
				blockeraInnerBlocks: {
					value: {
						'elements/container': {
							attributes: {
								blockeraBackgroundColor: '',
							},
						},
						'elements/avatar': {
							attributes: { blockeraWidth: '40px' },
						},
					},
				},
			},
			{
				...schemaDefaults,
				blockeraBackgroundColor: {
					type: 'object',
					default: { value: '' },
				},
				blockeraWidth: { type: 'object', default: { value: '' } },
			}
		);

		expect(
			next.blockeraInnerBlocks.value['elements/container']
		).toEqual({ attributes: {} });
		expect(
			next.blockeraInnerBlocks.value['elements/container'].attributes
		).not.toHaveProperty('blockeraBackgroundColor');
	});

	it('keeps reset inner-block item slots inside block states without dropping the map', () => {
		const value = {
			value: {
				hover: {
					breakpoints: {
						desktop: {
							attributes: {
								blockeraBackgroundColor: '#fabbbb',
								blockeraInnerBlocks: {
									'elements/container': {
										attributes: {
											blockeraBackgroundColor: '',
										},
									},
								},
							},
						},
					},
					isVisible: true,
				},
			},
		};

		const next = omitUnusedBlockeraFeatureAttributes(
			{
				blockeraBlockStates: value,
			},
			{
				...schemaDefaults,
				blockeraBackgroundColor: {
					type: 'object',
					default: { value: '' },
				},
			}
		);

		expect(next.blockeraBlockStates).toEqual({
			value: {
				hover: {
					breakpoints: {
						desktop: {
							attributes: {
								blockeraBackgroundColor: '#fabbbb',
								blockeraInnerBlocks: {
									'elements/container': {
										attributes: {},
									},
								},
							},
						},
					},
					isVisible: true,
				},
			},
		});
	});

	it('maps PHP empty-array defaults to { value: {} } so Gutenberg can omit them', () => {
		const phpArraySchema = {
			blockeraBackground: { type: 'object', default: { value: [] } },
			blockeraBoxShadow: { type: 'object', default: { value: [] } },
			blockeraInnerBlocks: { type: 'object', default: { value: [] } },
			blockeraAttributes: { type: 'object', default: { value: [] } },
		};

		const next = omitUnusedBlockeraFeatureAttributes(
			{
				blockeraBackground: { value: [] },
				blockeraBoxShadow: [],
				blockeraInnerBlocks: { value: [] },
				blockeraAttributes: { value: [] },
				content: 'Hello',
			},
			phpArraySchema
		);

		expect(next.blockeraBackground).toEqual({ value: {} });
		expect(next.blockeraBoxShadow).toEqual({ value: {} });
		expect(next.blockeraInnerBlocks).toEqual({ value: {} });
		expect(next.blockeraAttributes).toEqual({ value: {} });
		expect(next.content).toBe('Hello');
		expect(hasBlockeraFeatureAttributes(next, phpArraySchema)).toBe(false);
	});

	it('maps registered empty-object array defaults the same way', () => {
		const registeredArraySchema = {
			blockeraBackground: {
				type: 'object',
				default: { value: {} },
			},
		};

		const next = omitUnusedBlockeraFeatureAttributes(
			{
				blockeraBackground: { value: [] },
			},
			registeredArraySchema
		);

		expect(next.blockeraBackground).toEqual({ value: {} });
	});

	it('normalizes unused keys to registered defaults so Gutenberg can omit them', () => {
		const next = omitUnusedBlockeraFeatureAttributes(
			{
				blockeraFontSize: { value: '' },
				blockeraBackgroundClip: { value: 'none' },
				content: 'Hello',
			},
			schemaDefaults
		);

		expect(next.blockeraFontSize).toEqual({ value: '' });
		expect(next.blockeraBackgroundClip).toEqual({ value: 'none' });
		expect(next.content).toBe('Hello');
	});

	it('keeps identity when a feature value remains', () => {
		const state = {
			blockeraId: 'abc123',
			blockeraFontSize: { value: '18px' },
			className: 'blockera-block blockera-block-abc123',
		};

		expect(withoutBlockeraIdentityIfUnused(state, schemaDefaults)).toBe(
			state
		);
		expect(hasBlockeraFeatureAttributes(state, schemaDefaults)).toBe(true);
	});

	it('treats 0 and false as feature values', () => {
		expect(
			hasBlockeraFeatureAttributes(
				{
					blockeraId: 'abc123',
					blockeraZIndex: { value: 0 },
				},
				schemaDefaults
			)
		).toBe(true);
		expect(
			hasBlockeraFeatureAttributes(
				{
					blockeraId: 'abc123',
					blockeraHidden: { value: false },
				},
				schemaDefaults
			)
		).toBe(true);
	});

	it('keeps blockeraId in basic mode even with empty features', () => {
		const next = withoutBlockeraIdentityIfUnused(
			{
				blockeraId: 'abc123',
				blockeraBlockMode: 'basic',
				blockeraFontSize: { value: '' },
				blockeraBackgroundClip: { value: 'none' },
				className: 'extra',
			},
			schemaDefaults
		);

		expect(next.blockeraId).toBe('abc123');
		expect(next.blockeraBlockMode).toBe('basic');
		expect(next.className).toBe('extra');
		expect(next.blockeraFontSize).toEqual({ value: '' });
		expect(next.blockeraBackgroundClip).toEqual({ value: 'none' });
	});

	it('resets wrapped empty transform origins to the wrapped registered default', () => {
		const originSchema = {
			blockeraTransformSelfOrigin: {
				type: 'object',
				default: { value: { top: '', left: '' } },
			},
			blockeraTransformChildOrigin: {
				type: 'object',
				default: { value: { top: '', left: '' } },
			},
			blockeraDisplay: { type: 'object', default: { value: '' } },
		};

		const next = withoutBlockeraIdentityIfUnused(
			{
				blockeraId: '8y64ys',
				blockeraTransformSelfOrigin: { value: { top: '', left: '' } },
				blockeraTransformChildOrigin: { value: { top: '', left: '' } },
				blockeraDisplay: { value: 'flex' },
				className: 'blockera-block blockera-block-8y64ys',
			},
			originSchema
		);

		expect(next.blockeraId).toBe('8y64ys');
		expect(next.blockeraTransformSelfOrigin).toEqual({
			value: { top: '', left: '' },
		});
		expect(next.blockeraTransformChildOrigin).toEqual({
			value: { top: '', left: '' },
		});
		expect(next.blockeraDisplay).toEqual({ value: 'flex' });
		expect(hasBlockeraFeatureAttributes(next, originSchema)).toBe(true);
	});

	it('resets legacy unwrapped empty transform origins to the wrapped registered default', () => {
		const originSchema = {
			blockeraTransformSelfOrigin: {
				type: 'object',
				default: { value: { top: '', left: '' } },
			},
			blockeraTransformChildOrigin: {
				type: 'object',
				default: { value: { top: '', left: '' } },
			},
			blockeraDisplay: { type: 'object', default: { value: 'flex' } },
		};

		const next = omitUnusedBlockeraFeatureAttributes(
			{
				blockeraTransformSelfOrigin: { top: '', left: '' },
				blockeraTransformChildOrigin: { top: '', left: '' },
				blockeraDisplay: { value: 'flex' },
			},
			originSchema
		);

		expect(next.blockeraTransformSelfOrigin).toEqual({
			value: { top: '', left: '' },
		});
		expect(next.blockeraTransformChildOrigin).toEqual({
			value: { top: '', left: '' },
		});
		expect(next.blockeraDisplay).toEqual({ value: 'flex' });
	});

	it('treats wrapped empty transform origins as unused even without a schema', () => {
		const next = withoutBlockeraIdentityIfUnused({
			blockeraId: 'abc123',
			blockeraTransformSelfOrigin: { value: { top: '', left: '' } },
			blockeraTransformChildOrigin: { value: { top: '', left: '' } },
			blockeraFontColor: { value: '#111111' },
			className: 'blockera-block blockera-block-abc123',
		});

		expect(next.blockeraTransformSelfOrigin).toBeUndefined();
		expect(next.blockeraTransformChildOrigin).toBeUndefined();
		expect(next.blockeraFontColor).toEqual({ value: '#111111' });
		expect(next.blockeraId).toBe('abc123');
	});

	it('keeps a real transform origin value', () => {
		const originSchema = {
			blockeraTransformSelfOrigin: {
				type: 'object',
				default: { value: { top: '', left: '' } },
			},
		};

		const next = omitUnusedBlockeraFeatureAttributes(
			{
				blockeraTransformSelfOrigin: {
					value: { top: '50%', left: '50%' },
				},
			},
			originSchema
		);

		expect(next.blockeraTransformSelfOrigin).toEqual({
			value: { top: '50%', left: '50%' },
		});
	});
});

describe('blockeraBlockStates and breakpoint cleanup', () => {
	const statesSchema = {
		blockeraBlockStates: { type: 'object', default: { value: [] } },
		blockeraMinHeight: { type: 'object', default: { value: '' } },
		blockeraSpacing: {
			type: 'object',
			default: { value: {} },
		},
		blockeraTransformSelfOrigin: {
			type: 'object',
			default: { value: { top: '', left: '' } },
		},
	};

	const emptyNormalTabletMobile = {
		value: {
			normal: {
				breakpoints: {
					tablet: { attributes: [] },
					mobile: { attributes: [] },
				},
				isVisible: true,
			},
		},
	};

	const emptyNormalBreakpointSlots = {
		value: {
			normal: {
				breakpoints: {
					tablet: { attributes: {} },
					mobile: { attributes: {} },
				},
				isVisible: true,
			},
		},
	};

	it('treats empty breakpoint attribute arrays as unused states', () => {
		expect(
			isEmptyBlockStatesValue(emptyNormalTabletMobile, statesSchema)
		).toBe(true);

		const next = omitUnusedBlockeraFeatureAttributes(
			{ blockeraBlockStates: emptyNormalTabletMobile },
			statesSchema
		);

		expect(next.blockeraBlockStates).toEqual({ value: {} });
		expect(hasBlockeraFeatureAttributes(next, statesSchema)).toBe(false);
	});

	it('treats empty breakpoint attribute objects as unused states', () => {
		const value = {
			value: {
				normal: {
					breakpoints: {
						tablet: { attributes: {} },
						mobile: { attributes: {} },
					},
					isVisible: true,
				},
			},
		};

		expect(isEmptyBlockStatesValue(value, statesSchema)).toBe(true);
		expect(
			omitUnusedBlockeraFeatureAttributes(
				{ blockeraBlockStates: value },
				statesSchema
			).blockeraBlockStates
		).toEqual(emptyNormalBreakpointSlots);
	});

	it('treats mixed empty array and object breakpoint attributes as unused', () => {
		const value = {
			value: {
				normal: {
					breakpoints: {
						tablet: { attributes: [] },
						mobile: { attributes: {} },
					},
					isVisible: true,
				},
			},
		};

		expect(isEmptyBlockStatesValue(value, statesSchema)).toBe(true);
	});

	it('keeps states when a breakpoint has a real attribute', () => {
		const value = {
			value: {
				normal: {
					breakpoints: {
						mobile: {
							attributes: { blockeraMinHeight: '50vh' },
						},
					},
					isVisible: true,
				},
			},
		};

		expect(isEmptyBlockStatesValue(value, statesSchema)).toBe(false);

		const next = omitUnusedBlockeraFeatureAttributes(
			{ blockeraBlockStates: value },
			statesSchema
		);

		expect(next.blockeraBlockStates).toEqual(value);
	});

	it('keeps a reset breakpoint as empty attributes when sibling states still have values', () => {
		const value = {
			value: {
				normal: {
					breakpoints: {
						tablet: { attributes: { blockeraWidth: '' } },
					},
					isVisible: true,
				},
				hover: {
					breakpoints: {
						desktop: { attributes: { blockeraWidth: '40px' } },
						tablet: { attributes: { blockeraWidth: '10px' } },
					},
					isVisible: true,
				},
			},
		};

		const next = omitUnusedBlockeraFeatureAttributes(
			{ blockeraBlockStates: value },
			{
				...statesSchema,
				blockeraWidth: { type: 'object', default: { value: '' } },
			}
		);

		expect(next.blockeraBlockStates.value.normal.breakpoints.tablet).toEqual(
			{ attributes: {} }
		);
		expect(
			next.blockeraBlockStates.value.hover.breakpoints.desktop.attributes
				.blockeraWidth
		).toBe('40px');
	});

	it('keeps empty breakpoint slots after reset-all across states', () => {
		const value = {
			value: {
				normal: {
					breakpoints: {
						tablet: { attributes: { blockeraWidth: '' } },
					},
					isVisible: true,
				},
				hover: {
					breakpoints: {
						desktop: { attributes: { blockeraWidth: '' } },
						tablet: { attributes: { blockeraWidth: '' } },
					},
					isVisible: true,
				},
			},
		};

		const next = omitUnusedBlockeraFeatureAttributes(
			{
				blockeraWidth: { value: '' },
				blockeraBlockStates: value,
			},
			{
				...statesSchema,
				blockeraWidth: { type: 'object', default: { value: '' } },
			}
		);

		expect(
			next.blockeraBlockStates.value.normal.breakpoints.tablet.attributes
		).toEqual({});
		expect(
			next.blockeraBlockStates.value.hover.breakpoints.desktop.attributes
		).toEqual({});
		expect(
			next.blockeraBlockStates.value.hover.breakpoints.tablet.attributes
		).toEqual({});
		expect(hasBlockeraFeatureAttributes(next, statesSchema)).toBe(false);
	});

	it('keeps states when isVisible is false', () => {
		const value = {
			value: {
				hover: {
					breakpoints: {
						desktop: { attributes: {} },
					},
					isVisible: false,
				},
			},
		};

		expect(isEmptyBlockStatesValue(value, statesSchema)).toBe(false);
		expect(
			omitUnusedBlockeraFeatureAttributes(
				{ blockeraBlockStates: value },
				statesSchema
			).blockeraBlockStates
		).toEqual({
			value: {
				hover: {
					breakpoints: {
						desktop: { attributes: {} },
					},
					isVisible: false,
				},
			},
		});
	});

	it('keeps states with a css-class or content', () => {
		const withClass = {
			value: {
				'custom-class': {
					breakpoints: { desktop: { attributes: [] } },
					isVisible: true,
					'css-class': '.hero',
				},
			},
		};
		const withContent = {
			value: {
				normal: {
					breakpoints: {},
					isVisible: true,
					content: 'Hello',
				},
			},
		};

		expect(isEmptyBlockStatesValue(withClass, statesSchema)).toBe(false);
		expect(isEmptyBlockStatesValue(withContent, statesSchema)).toBe(false);
	});

	it('drops PHP leftover empty-array breakpoints from markup while keeping reset {} slots', () => {
		const value = {
			value: {
				normal: {
					breakpoints: {
						tablet: { attributes: [] },
						mobile: {
							attributes: {
								blockeraMinHeight: '50vh',
								blockeraTransformSelfOrigin: {
									value: { top: '', left: '' },
								},
							},
						},
					},
					isVisible: true,
				},
			},
		};

		const next = omitUnusedBlockeraFeatureAttributes(
			{
				blockeraId: '8y64ys',
				blockeraBlockStates: value,
			},
			statesSchema
		);

		expect(next.blockeraBlockStates).toEqual({
			value: {
				normal: {
					breakpoints: {
						mobile: {
							attributes: {
								blockeraMinHeight: '50vh',
							},
						},
					},
					isVisible: true,
				},
			},
		});
		expect(hasBlockeraFeatureAttributes(next, statesSchema)).toBe(true);
	});

	it('strips identity when empty blockStates was the only feature', () => {
		const next = withoutBlockeraIdentityIfUnused(
			{
				blockeraId: '790o6z',
				blockeraBlockStates: emptyNormalTabletMobile,
				className: 'blockera-block blockera-block-790o6z',
			},
			statesSchema
		);

		expect(next.blockeraId).toBeUndefined();
		expect(next.className).toBeUndefined();
		expect(next.blockeraBlockStates).toEqual({ value: {} });
		expect(hasBlockeraFeatureAttributes(next, statesSchema)).toBe(false);
	});

	it('is idempotent and returns the same reference when already clean', () => {
		const clean = {
			value: {
				normal: {
					breakpoints: {
						mobile: {
							attributes: { blockeraMinHeight: '50vh' },
						},
					},
					isVisible: true,
				},
			},
		};

		expect(normalizeBlockeraBlockStatesValue(clean, statesSchema)).toBe(
			clean
		);

		const normalizedEmpty = normalizeBlockeraBlockStatesValue(
			emptyNormalTabletMobile,
			statesSchema
		);

		expect(normalizedEmpty).toEqual({ value: {} });
		expect(
			normalizeBlockeraBlockStatesValue(normalizedEmpty, statesSchema)
		).toEqual({ value: {} });
	});
});

describe('WordPress style empty-array cleanup', () => {
	const innerBlocksSchema = {
		blockeraInnerBlocks: { type: 'object', default: { value: {} } },
		blockeraFontColor: { type: 'object', default: { value: '' } },
	};

	it('drops PHP empty-array style.color and nested link color', () => {
		expect(cleanEmptyObject({ color: [] })).toEqual(undefined);
		expect(
			cleanEmptyObject({
				color: [],
				elements: { link: { color: [] } },
			})
		).toEqual(undefined);
		expect(
			cleanEmptyObject({
				color: { text: '#111111' },
				elements: { link: { color: [] } },
			})
		).toEqual({
			color: { text: '#111111' },
		});
	});

	it('keeps non-empty style arrays such as duotone', () => {
		const style = { filter: { duotone: ['#000000', '#ffffff'] } };

		expect(cleanEmptyObject(style)).toBe(style);
	});

	it('unsets style on attributes when only empty arrays remain', () => {
		const next = withCleanedWpStyle({
			content: 'Hello',
			style: { color: [], elements: { link: { color: [] } } },
		});

		expect(next.style).toBeUndefined();
		expect(next.content).toBe('Hello');
	});

	it('strips empty style arrays during identity cleanup while keeping inner-block color', () => {
		const next = withoutBlockeraIdentityIfUnused(
			{
				blockeraId: 'b83u76',
				blockeraInnerBlocks: {
					value: {
						'elements/link': {
							attributes: { blockeraFontColor: '#1e2731' },
						},
					},
				},
				className: 'blockera-block blockera-block-b83u76',
				style: { color: [], elements: { link: { color: [] } } },
			},
			innerBlocksSchema
		);

		expect(next.blockeraId).toBe('b83u76');
		expect(next.style).toBeUndefined();
		expect(next.blockeraInnerBlocks).toEqual({
			value: {
				'elements/link': {
					attributes: { blockeraFontColor: '#1e2731' },
				},
			},
		});
		expect(hasBlockeraFeatureAttributes(next, innerBlocksSchema)).toBe(
			true
		);
	});
});


