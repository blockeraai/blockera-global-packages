import { getNormalizedStyle } from '../index';

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

	it('unsets empty WP background so mergeObject does not keep leftover size', () => {
		expect(
			getNormalizedStyle(
				{
					background: {},
					blockeraOpacity: { value: '99' },
				},
				{}
			)
		).toEqual({
			background: undefined,
			blockeraOpacity: { value: '99' },
		});
	});

	it('unsets WP background when every nested field is undefined', () => {
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
			background: undefined,
		});
	});

	it('keeps WP backgroundSize when the image layer is still set', () => {
		expect(
			getNormalizedStyle(
				{
					background: {
						backgroundSize: 'contain',
						backgroundImage: { url: 'https://placehold.co/600x400' },
					},
				},
				{}
			)
		).toEqual({
			background: {
				backgroundSize: 'contain',
				backgroundImage: { url: 'https://placehold.co/600x400' },
			},
		});
	});
});
