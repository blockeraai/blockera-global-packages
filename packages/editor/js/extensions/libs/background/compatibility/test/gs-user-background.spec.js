/**
 * Internal dependencies
 */
import {
	getGsUserBackgroundOwnership,
	mergeOwnedGsUserBackground,
} from '../gs-user-background';

const THEME_IMAGE = {
	url: 'https://placehold.co/600x400',
	id: 87,
	source: 'file',
	title: 'background image',
};

const WP_BACKGROUND_USER_RESET = {
	backgroundImage: null,
	backgroundSize: null,
	backgroundPosition: null,
	backgroundRepeat: null,
};

const themeAttributes = () => ({
	blockeraBackground: { value: {} },
	background: {
		backgroundImage: THEME_IMAGE,
		backgroundPosition: '20% 30%',
	},
});

describe('mergeOwnedGsUserBackground', () => {
	it('returns null when userStyles do not own background', () => {
		expect(mergeOwnedGsUserBackground(themeAttributes(), undefined)).toBe(
			null
		);
		expect(mergeOwnedGsUserBackground(themeAttributes(), {})).toBe(null);
		expect(
			mergeOwnedGsUserBackground(themeAttributes(), {
				background: { backgroundPosition: '20% 30%' },
			})
		).toBe(null);
	});

	it('merges user Blockera layers instead of leaving the theme WP image', () => {
		const next = mergeOwnedGsUserBackground(themeAttributes(), {
			blockeraBackground: {
				value: {
					'image-0': {
						type: 'image',
						image: THEME_IMAGE.url,
						'image-position': { top: '40%', left: '60%' },
					},
				},
			},
			background: {
				backgroundImage: THEME_IMAGE,
				backgroundPosition: '40% 60%',
			},
		});

		expect(
			next.blockeraBackground.value['image-0']['image-position']
		).toEqual({
			top: '40%',
			left: '60%',
		});
		expect(next.background.backgroundPosition).toBe('40% 60%');
	});

	it('does not treat an empty/undefined Blockera background as ownership', () => {
		expect(
			mergeOwnedGsUserBackground(themeAttributes(), {
				blockeraBackground: undefined,
			})
		).toBe(null);
		expect(
			mergeOwnedGsUserBackground(themeAttributes(), {
				blockeraBackground: { value: {} },
			})
		).toBe(null);
	});

	it('keeps a user-origin WP null reset so theme.json cannot hydrate back', () => {
		const next = mergeOwnedGsUserBackground(themeAttributes(), {
			blockeraBackground: undefined,
			background: WP_BACKGROUND_USER_RESET,
		});

		expect(next.background).toEqual(WP_BACKGROUND_USER_RESET);
		expect(next.blockeraBackground?.value?.['image-0']).toBeUndefined();
	});

	it('treats a null image reset as image ownership only', () => {
		expect(
			getGsUserBackgroundOwnership({
				background: WP_BACKGROUND_USER_RESET,
			})
		).toEqual({
			hasLayers: false,
			userResetWpImage: true,
			userResetGradient: false,
		});
	});

	it('keeps a user-origin WP null gradient reset', () => {
		const next = mergeOwnedGsUserBackground(
			{
				blockeraBackground: { value: {} },
				color: {
					gradient:
						'linear-gradient(135deg,rgb(135,254,56) 1%,rgb(255,147,147) 97%)',
				},
			},
			{
				blockeraBackground: undefined,
				color: { gradient: null },
			}
		);

		expect(next.color.gradient).toBe(null);
		expect(next.blockeraBackground?.value?.['linear-gradient-0']).toBeUndefined();
	});
});
