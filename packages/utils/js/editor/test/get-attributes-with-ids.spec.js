import {
	generateBlockeraAttributeId,
	getAttributesWithIds,
	hasBlockeraFeatureAttributes,
	migrateLegacyBlockeraIds,
	remintBlockeraIdentity,
	needsLegacyBlockeraIdMigrate,
	normalizeBlockeraIds,
	stripBlockeraBlockClasses,
	stripBlockeraIdentity,
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
		blockeraFontSize: { type: 'object', default: '' },
		blockeraBackgroundClip: {
			type: 'object',
			default: 'none',
		},
		blockeraInnerBlocks: { type: 'object', default: {} },
		blockeraZIndex: { type: 'object', default: '' },
		blockeraHidden: { type: 'object', default: '' },
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
		expect(hasBlockeraFeatureAttributes(next, schemaDefaults)).toBe(false);
	});

	it('keeps identity when a feature value remains', () => {
		const state = {
			blockeraId: 'abc123',
			blockeraFontSize: { value: '18px' },
			blockeraBackgroundClip: { value: 'none' },
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
		const state = {
			blockeraId: 'abc123',
			blockeraBlockMode: 'basic',
			blockeraFontSize: { value: '' },
			blockeraBackgroundClip: { value: 'none' },
			className: 'extra',
		};

		expect(withoutBlockeraIdentityIfUnused(state, schemaDefaults)).toBe(
			state
		);
		expect(state.blockeraId).toBe('abc123');
	});
});
