import { areAdvancedTypographyFeaturesEqual } from '../are-advanced-typography-features-equal';

describe('areAdvancedTypographyFeaturesEqual', () => {
	const handle = () => {};
	const base = {
		handleOnChangeAttributes: handle,
		activeSearchMode: false,
		isShowLetterSpacing: true,
		isShowWordSpacing: true,
		isShowTextIndent: true,
		isShowTextShadow: false,
		isShowTextTransform: false,
		isShowTextDecoration: false,
		isShowDirection: false,
		isShowTextOrientation: false,
		isShowTextColumns: false,
		isShowTextStroke: false,
		isShowTextWrap: false,
		isShowWordBreak: false,
		extensionConfig: { status: true },
		extensionProps: {},
		attributes: { blockeraFontSize: { default: '' } },
	};

	it('skips when only Font Size on the block attributes object changed', () => {
		const prev = {
			...base,
			values: {
				blockeraFontSize: '16px',
				blockeraLetterSpacing: '',
			},
			block: {
				clientId: 'a',
				blockName: 'core/paragraph',
				attributes: { blockeraFontSize: '16px' },
			},
		};
		const next = {
			...base,
			values: {
				blockeraFontSize: '18px',
				blockeraLetterSpacing: '',
			},
			block: {
				clientId: 'a',
				blockName: 'core/paragraph',
				attributes: { blockeraFontSize: '18px' },
			},
		};

		expect(areAdvancedTypographyFeaturesEqual(prev, next)).toBe(true);
	});

	it('re-renders when an advanced field value changes', () => {
		const prev = {
			...base,
			values: { blockeraLetterSpacing: '' },
			block: { clientId: 'a', blockName: 'core/paragraph' },
		};
		const next = {
			...base,
			values: { blockeraLetterSpacing: '1px' },
			block: { clientId: 'a', blockName: 'core/paragraph' },
		};

		expect(areAdvancedTypographyFeaturesEqual(prev, next)).toBe(false);
	});
});
