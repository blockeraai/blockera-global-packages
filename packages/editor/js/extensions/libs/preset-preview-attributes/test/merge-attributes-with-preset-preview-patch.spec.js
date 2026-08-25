import { mergeAttributesWithPresetPreviewPatch } from '../merge-attributes-with-preset-preview-patch';

describe('mergeAttributesWithPresetPreviewPatch', () => {
	it('replaces unwrapped empty border with the overlay object', () => {
		const merged = mergeAttributesWithPresetPreviewPatch(
			{ blockeraBorder: '', className: '' },
			{
				blockeraBorder: {
					all: { width: '2px', style: 'solid', color: '#111' },
					type: 'all',
				},
			}
		);

		expect(merged.blockeraBorder).toEqual({
			all: { width: '2px', style: 'solid', color: '#111' },
			type: 'all',
		});
		expect(merged.blockeraBorder).not.toHaveProperty('value');
	});

	it('does not keep a { value: "" } wrapper when overlaying current attrs', () => {
		const merged = mergeAttributesWithPresetPreviewPatch(
			{ blockeraBorder: { value: '' } },
			{
				blockeraBorder: {
					all: { width: '2px', style: 'solid', color: '#111' },
					type: 'all',
				},
			}
		);

		expect(merged.blockeraBorder.value).toBeUndefined();
		expect(merged.blockeraBorder.type).toBe('all');
		expect(merged.blockeraBorder.all.width).toBe('2px');
	});

	it('clears WP className so hover CSS can use #block-{clientId}', () => {
		const merged = mergeAttributesWithPresetPreviewPatch(
			{ className: 'wp-block-paragraph' },
			{
				blockeraBorder: {
					all: { width: '2px', style: 'solid', color: '#111' },
					type: 'all',
				},
			}
		);

		expect(merged.className).toBe('');
	});

	it('replaces empty transform repeater defaults with the overlay map', () => {
		const overlay = {
			'move-0': {
				type: 'move',
				'move-x': '0px',
				'move-y': '0px',
				'move-z': '0px',
				isVisible: true,
				order: 0,
			},
		};

		expect(
			mergeAttributesWithPresetPreviewPatch(
				{ blockeraTransform: [] },
				{ blockeraTransform: overlay }
			).blockeraTransform
		).toEqual(overlay);

		expect(
			mergeAttributesWithPresetPreviewPatch(
				{ blockeraTransform: { value: [] } },
				{ blockeraTransform: overlay }
			).blockeraTransform
		).toEqual(overlay);
	});
});
