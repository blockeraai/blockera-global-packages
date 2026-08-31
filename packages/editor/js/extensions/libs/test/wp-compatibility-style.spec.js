/**
 * Internal dependencies
 */
import {
	cleanEmptyObject,
	mergeWPCompatibility,
	sanitizeWPCompatibilityAttributes,
	withCleanedWpStyle,
} from '../utils';

const paragraphDetail = { blockId: 'core/paragraph' };

describe('cleanEmptyObject (Gutenberg style trees)', () => {
	it('removes nested keys that are only undefined', () => {
		expect(cleanEmptyObject({ color: { text: undefined } })).toEqual(
			undefined
		);
	});

	it('removes empty objects such as typography: {}', () => {
		expect(cleanEmptyObject({ typography: {} })).toEqual(undefined);
	});

	it('removes PHP empty-array style.color and nested elements.link.color', () => {
		expect(
			cleanEmptyObject({
				color: [],
				elements: { link: { color: [] } },
			})
		).toEqual(undefined);
	});

	it('keeps sibling branches that still have values', () => {
		expect(
			cleanEmptyObject({
				color: { text: undefined },
				typography: { fontSize: '10px' },
			})
		).toEqual({
			typography: { fontSize: '10px' },
		});
	});

	it('does not remove falsy nested keys', () => {
		expect(cleanEmptyObject({ color: { text: false } })).not.toEqual(
			undefined
		);
		expect(cleanEmptyObject({ color: { text: '' } })).not.toEqual(
			undefined
		);
	});

	it('returns the same object when nothing is empty', () => {
		const style = { color: { text: '#111111' } };

		expect(cleanEmptyObject(style)).toBe(style);
	});
});

describe('withCleanedWpStyle', () => {
	it('unsets style when only empty objects remain', () => {
		const next = withCleanedWpStyle({
			content: 'Hello',
			style: { typography: {} },
		});

		expect(next.style).toBeUndefined();
		expect(next.content).toBe('Hello');
	});

	it('unsets style when PHP empty-array color trees remain', () => {
		const next = withCleanedWpStyle({
			content: 'Hello',
			style: { color: [], elements: { link: { color: [] } } },
		});

		expect(next.style).toBeUndefined();
	});

	it('leaves attributes without style unchanged', () => {
		const attrs = { content: 'Hello' };

		expect(withCleanedWpStyle(attrs)).toBe(attrs);
	});

	it('returns the same attributes object when style is already clean', () => {
		const attrs = {
			content: 'Hello',
			style: { color: { text: '#111111' } },
		};

		expect(withCleanedWpStyle(attrs)).toBe(attrs);
	});
});

describe('mergeWPCompatibility', () => {
	it('drops leftover empty style.typography after a font-color reset patch', () => {
		const next = mergeWPCompatibility(
			{
				content: 'Hello',
				style: {
					color: { text: '#666666' },
					typography: {},
				},
			},
			{
				textColor: undefined,
				style: {
					color: {
						text: undefined,
					},
				},
			},
			paragraphDetail
		);

		expect(next.style).toBeUndefined();
		expect(next.content).toBe('Hello');
	});

	it('keeps remaining typography values when color is cleared', () => {
		const next = mergeWPCompatibility(
			{
				style: {
					color: { text: '#666666' },
					typography: { fontSize: '18px' },
				},
			},
			{
				style: {
					color: {
						text: undefined,
					},
				},
			},
			paragraphDetail
		);

		expect(next.style).toEqual({
			typography: { fontSize: '18px' },
		});
	});
});

describe('sanitizeWPCompatibilityAttributes', () => {
	it('cleans empty style objects imported from WordPress', () => {
		const next = sanitizeWPCompatibilityAttributes(
			{
				content: 'Hello',
				style: { typography: {} },
			},
			paragraphDetail
		);

		expect(next.style).toBeUndefined();
		expect(next.content).toBe('Hello');
	});

	it('cleans PHP empty-array style.color imported from WordPress', () => {
		const next = sanitizeWPCompatibilityAttributes(
			{
				content: 'Hello',
				style: { color: [], elements: { link: { color: [] } } },
			},
			paragraphDetail
		);

		expect(next.style).toBeUndefined();
	});
});
