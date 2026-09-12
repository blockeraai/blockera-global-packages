/**
 * Internal dependencies
 */
import {
	getBlockeraBlockStatesValue,
	getIframeBlockTypeSchemaSignature,
	iframeBlockTypesSchemaFingerprint,
	isEmptyGlobalStylesSlice,
} from '../utils';

describe('getBlockeraBlockStatesValue', () => {
	it('returns an empty object for missing values', () => {
		expect(getBlockeraBlockStatesValue(undefined)).toEqual({});
		expect(getBlockeraBlockStatesValue(null)).toEqual({});
		expect(getBlockeraBlockStatesValue('hover')).toEqual({});
	});

	it('passes through an already-unwrapped states map', () => {
		const states = {
			hover: {
				isVisible: true,
				breakpoints: {
					desktop: { attributes: { blockeraFontSize: '20px' } },
				},
			},
		};

		expect(getBlockeraBlockStatesValue(states)).toBe(states);
	});

	it('unwraps the store `{ value: states }` shape', () => {
		const hover = {
			isVisible: true,
			breakpoints: {
				desktop: { attributes: { blockeraFontSize: '20px' } },
			},
		};

		expect(
			getBlockeraBlockStatesValue({
				value: { hover },
			})
		).toEqual({ hover });
	});

	it('unwraps a double `{ value: { value: states } }` wrap', () => {
		const hover = {
			isVisible: true,
			breakpoints: {
				desktop: { attributes: { blockeraFontSize: '20px' } },
			},
		};

		expect(
			getBlockeraBlockStatesValue({
				value: { value: { hover } },
			})
		).toEqual({ hover });
	});
});

describe('iframe block type schema fingerprint', () => {
	it('uses attribute keys and variation names without serializing schema defaults', () => {
		const blockType = {
			name: 'core/paragraph',
			attributes: {
				content: { type: 'string', default: 'Hello' },
				blockeraId: { type: 'string', default: '' },
			},
			variations: [{ name: 'plain' }, { name: 'lead' }],
		};

		const signature = getIframeBlockTypeSchemaSignature(blockType);

		expect(signature).toContain('core/paragraph');
		expect(signature).toContain('blockeraId');
		expect(signature).toContain('content');
		expect(signature).toContain('lead');
		expect(signature).toContain('plain');
		expect(signature).not.toContain('Hello');
	});

	it('changes when variation names change', () => {
		const base = {
			name: 'core/group',
			attributes: { blockeraId: { type: 'string' } },
			variations: [{ name: 'a' }],
		};

		expect(getIframeBlockTypeSchemaSignature(base)).not.toBe(
			getIframeBlockTypeSchemaSignature({
				...base,
				variations: [{ name: 'b' }],
			})
		);
	});

	it('joins block signatures in a stable order', () => {
		const a = {
			name: 'core/a',
			attributes: { blockeraId: {} },
		};
		const b = {
			name: 'core/b',
			attributes: { blockeraId: {} },
		};

		expect(iframeBlockTypesSchemaFingerprint([a, b])).toBe(
			iframeBlockTypesSchemaFingerprint([b, a])
		);
	});
});

describe('isEmptyGlobalStylesSlice', () => {
	it('treats missing and empty objects as empty', () => {
		expect(isEmptyGlobalStylesSlice(undefined)).toBe(true);
		expect(isEmptyGlobalStylesSlice(null)).toBe(true);
		expect(isEmptyGlobalStylesSlice({})).toBe(true);
		expect(isEmptyGlobalStylesSlice([])).toBe(true);
	});

	it('treats a slice with keys as non-empty', () => {
		expect(isEmptyGlobalStylesSlice({ color: { text: '#000' } })).toBe(
			false
		);
	});
});
