import { getNormalizedStyle } from '../index';

const WP_BACKGROUND_USER_RESET = {
	backgroundImage: null,
	backgroundSize: null,
	backgroundPosition: null,
	backgroundRepeat: null,
};

describe('getNormalizedStyle', () => {
	it('drops Blockera keys whose stored shape is { value: undefined }', () => {
		expect(
			getNormalizedStyle(
				{
					blockeraDisplay: { value: undefined },
					blockeraOpacity: { value: '99' },
				},
				{}
			)
		).toEqual({
			blockeraOpacity: { value: '99' },
		});
	});

	it('deletes `style` on the passed object (callers must clone)', () => {
		const incoming = {
			style: { color: { text: '#111' } },
			blockeraOpacity: { value: '99' },
		};

		getNormalizedStyle(incoming, {});

		expect(incoming.style).toBeUndefined();
	});

	it('writes a user-origin WP background reset instead of omitting the tree', () => {
		expect(
			getNormalizedStyle(
				{
					background: {},
					blockeraOpacity: { value: '99' },
				},
				{}
			)
		).toEqual({
			background: WP_BACKGROUND_USER_RESET,
			blockeraOpacity: { value: '99' },
		});
	});

	it('resets WP background when every nested field is undefined', () => {
		expect(
			getNormalizedStyle(
				{
					background: {
						backgroundImage: undefined,
						backgroundSize: undefined,
					},
				},
				{}
			)
		).toEqual({
			background: WP_BACKGROUND_USER_RESET,
		});
	});

	it('resets WP background when only an empty nested image object remains', () => {
		expect(
			getNormalizedStyle(
				{
					background: {
						backgroundImage: {},
					},
				},
				{}
			)
		).toEqual({
			background: WP_BACKGROUND_USER_RESET,
		});
	});

	it('resets WP background when clone leftover image has id but no url', () => {
		expect(
			getNormalizedStyle(
				{
					background: {
						backgroundImage: { id: 0 },
					},
				},
				{}
			)
		).toEqual({
			background: WP_BACKGROUND_USER_RESET,
		});
	});

	it('unsets empty Blockera background so mergeObject does not keep leftover layers', () => {
		const defaultStyles = {
			blockeraBackground: {
				type: 'object',
				default: {},
			},
		};

		expect(
			getNormalizedStyle(
				{ blockeraBackground: { value: {} } },
				defaultStyles
			)
		).toEqual({
			blockeraBackground: undefined,
		});

		expect(
			getNormalizedStyle({ blockeraBackground: {} }, defaultStyles)
		).toEqual({
			blockeraBackground: undefined,
		});
	});

	it('pairs an empty Blockera repeater with a user-origin WP background reset', () => {
		const defaultStyles = {
			blockeraBackground: {
				type: 'object',
				default: {},
			},
		};

		expect(
			getNormalizedStyle(
				{
					background: {},
					blockeraBackground: { value: {} },
				},
				defaultStyles
			)
		).toEqual({
			background: WP_BACKGROUND_USER_RESET,
			blockeraBackground: undefined,
		});
	});

	it('writes a user-origin WP gradient reset when gradient is explicit null', () => {
		expect(
			getNormalizedStyle(
				{
					color: { gradient: null },
					blockeraOpacity: { value: '99' },
				},
				{}
			)
		).toEqual({
			color: { gradient: null },
			blockeraOpacity: { value: '99' },
		});
	});

	it('omits color when gradient is only undefined (not a user reset)', () => {
		expect(
			getNormalizedStyle(
				{
					color: { gradient: undefined },
					blockeraOpacity: { value: '99' },
				},
				{}
			)
		).toEqual({
			blockeraOpacity: { value: '99' },
		});
	});

	it('keeps sibling color fields when resetting gradient', () => {
		expect(
			getNormalizedStyle(
				{
					color: {
						text: '#111111',
						gradient: null,
					},
				},
				{}
			)
		).toEqual({
			color: {
				text: '#111111',
				gradient: null,
			},
		});
	});

	it('keeps WP backgroundPosition when the image layer is still set', () => {
		expect(
			getNormalizedStyle(
				{
					background: {
						backgroundPosition: '40% 60%',
						backgroundImage: { url: 'https://placehold.co/600x400' },
					},
				},
				{}
			)
		).toEqual({
			background: {
				backgroundPosition: '40% 60%',
				backgroundImage: { url: 'https://placehold.co/600x400' },
			},
		});
	});
});
