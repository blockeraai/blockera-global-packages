/**
 * @jest-environment jsdom
 */
/**
 * Internal dependencies
 */
import {
	mergeRootWithInnerOverlay,
	overlayHasFeatureValue,
	overlayInnerAttributes,
} from '../helpers';

describe('overlayInnerAttributes', () => {
	it('treats empty reset slots as no overlay', () => {
		expect(overlayInnerAttributes({})).toEqual({});
		expect(overlayInnerAttributes(undefined)).toEqual({});
		expect(
			overlayInnerAttributes({
				blockeraFontColor: undefined,
			})
		).toEqual({});
	});

	it('keeps leftover nested inner hover after inner-normal reset', () => {
		const nested = {
			blockeraBlockStates: {
				hover: {
					breakpoints: {
						desktop: {
							attributes: { blockeraFontColor: '#777777' },
						},
					},
				},
			},
		};

		expect(overlayInnerAttributes(nested)).toEqual(nested);
	});
});

describe('mergeRootWithInnerOverlay', () => {
	it('keeps inner-normal color when overlay is an empty reset slot', () => {
		const root = {
			blockeraFontColor: '#cccccc',
			blockeraBlockStates: {
				hover: {
					breakpoints: {
						desktop: {
							attributes: { blockeraFontColor: '#bbbbbb' },
						},
					},
				},
			},
		};

		expect(mergeRootWithInnerOverlay(root, {})).toEqual(root);
		expect(
			mergeRootWithInnerOverlay(root, { blockeraFontColor: undefined })
		).toEqual(root);
	});

	it('does not let overlay nested hover states replace inner-normal states', () => {
		const root = {
			blockeraFontColor: '#cccccc',
			blockeraBlockStates: {
				hover: {
					breakpoints: {
						desktop: {
							attributes: { blockeraFontColor: '#bbbbbb' },
						},
					},
				},
			},
		};
		const nested = {
			blockeraFontColor: undefined,
			blockeraBlockStates: {
				hover: {
					breakpoints: {
						desktop: {
							attributes: { blockeraFontColor: '#777777' },
						},
					},
					isSelected: true,
				},
			},
		};

		const merged = mergeRootWithInnerOverlay(root, nested);

		expect(merged.blockeraFontColor).toBe('#cccccc');
		expect(merged.blockeraBlockStates).toEqual(root.blockeraBlockStates);
	});

	it('applies overlay inner-normal color without adopting nested hover states', () => {
		const root = {
			blockeraFontColor: '#cccccc',
			blockeraBlockStates: {
				hover: {
					breakpoints: {
						desktop: {
							attributes: { blockeraFontColor: '#bbbbbb' },
						},
					},
				},
			},
		};
		const nested = {
			blockeraFontColor: '#555555',
			blockeraBlockStates: {
				hover: {
					breakpoints: {
						desktop: {
							attributes: { blockeraFontColor: '#777777' },
						},
					},
				},
			},
		};

		const merged = mergeRootWithInnerOverlay(root, nested);

		expect(merged.blockeraFontColor).toBe('#555555');
		expect(merged.blockeraBlockStates).toEqual(root.blockeraBlockStates);
	});
});

describe('overlayHasFeatureValue', () => {
	it('is false after reset of the current overlay color', () => {
		expect(overlayHasFeatureValue({}, 'blockeraFontColor')).toBe(false);
		expect(
			overlayHasFeatureValue(
				{ blockeraFontColor: undefined },
				'blockeraFontColor'
			)
		).toBe(false);
		expect(
			overlayHasFeatureValue(
				{
					blockeraBlockStates: {
						hover: {
							breakpoints: {
								desktop: {
									attributes: {
										blockeraFontColor: '#777777',
									},
								},
							},
						},
					},
				},
				'blockeraFontColor'
			)
		).toBe(false);
	});

	it('is true when the overlay stores the feature', () => {
		expect(
			overlayHasFeatureValue(
				{ blockeraFontColor: '#555555' },
				'blockeraFontColor'
			)
		).toBe(true);
	});

	it('is false when the attribute name is missing', () => {
		expect(overlayHasFeatureValue({ blockeraFontColor: '#555555' })).toBe(
			false
		);
	});
});
