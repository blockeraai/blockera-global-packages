/**
 * Internal dependencies
 */
import { shouldFlushGlobalStylesEntityNow } from '../should-flush-global-styles-entity';

const populatedBackground = {
	blockeraBackground: {
		value: {
			'image-0': {
				type: 'image',
				image: 'https://placehold.co/600x400',
			},
		},
	},
	background: {
		backgroundImage: { url: 'https://placehold.co/600x400' },
		backgroundPosition: '40% 60%',
	},
};

describe('shouldFlushGlobalStylesEntityNow', () => {
	it('flushes when a Blockera repeater is cleared (any feature)', () => {
		expect(
			shouldFlushGlobalStylesEntityNow(
				{
					blockeraBackground: { value: {} },
					background: {},
				},
				populatedBackground
			)
		).toBe(true);

		expect(
			shouldFlushGlobalStylesEntityNow(
				{
					blockeraBorder: { value: {} },
				},
				{
					blockeraBorder: {
						value: { all: { width: '2px', color: '#111' } },
					},
				}
			)
		).toBe(true);
	});

	it('flushes when WP trees already hold a user-origin null reset', () => {
		expect(
			shouldFlushGlobalStylesEntityNow(
				{
					background: {
						backgroundImage: null,
						backgroundPosition: null,
					},
				},
				populatedBackground
			)
		).toBe(true);
	});

	it('does not flush populated edits (keystroke / position type)', () => {
		expect(
			shouldFlushGlobalStylesEntityNow(
				{
					blockeraBackground: {
						value: {
							'image-0': {
								type: 'image',
								image: 'https://placehold.co/600x400',
								'image-position': { top: '40%', left: '6%' },
							},
						},
					},
					background: {
						backgroundImage: { url: 'https://placehold.co/600x400' },
						backgroundPosition: '40% 6%',
					},
				},
				populatedBackground
			)
		).toBe(false);
	});

	it('does not flush empty unused features that were never stored', () => {
		expect(
			shouldFlushGlobalStylesEntityNow(
				{
					...populatedBackground,
					blockeraBoxShadow: { value: {} },
				},
				populatedBackground
			)
		).toBe(false);
	});

	it('flushes when a stored Blockera feature key is omitted', () => {
		expect(
			shouldFlushGlobalStylesEntityNow(
				{ background: populatedBackground.background },
				populatedBackground
			)
		).toBe(true);
	});
});
