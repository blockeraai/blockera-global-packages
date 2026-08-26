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
});
