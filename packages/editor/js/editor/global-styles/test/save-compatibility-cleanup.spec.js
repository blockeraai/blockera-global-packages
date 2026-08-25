import { cleanupDefaultAttributes } from '../save-compatibility-cleanup';

const defaultAttributes = {
	blockeraTextIndent: { type: 'object', default: { value: '' } },
	blockeraFontSize: { type: 'object', default: { value: '' } },
	blockeraId: { type: 'string', default: '' },
	blockeraPropsId: { type: 'string', default: '' },
	className: { type: 'string' },
};

describe('cleanupDefaultAttributes', () => {
	it('keeps WP typography and hydrated Blockera mirrors, strips defaults and native block attrs', () => {
		expect(
			cleanupDefaultAttributes(
				{
					typography: { textIndent: '2px' },
					blockeraTextIndent: { value: '2px' },
					blockeraFontSize: { value: '' },
					blockeraId: '',
					blockeraPropsId: '',
					className: 'wp-block-paragraph',
					align: 'left',
				},
				defaultAttributes
			)
		).toEqual({
			typography: { textIndent: '2px' },
			blockeraTextIndent: { value: '2px' },
		});
	});

	it('strips global-styles-panel wrapped empty defaults', () => {
		expect(
			cleanupDefaultAttributes(
				{
					blockeraFontSize: { value: { value: '' } },
					color: { text: '#111111' },
				},
				defaultAttributes
			)
		).toEqual({
			color: { text: '#111111' },
		});
	});
});
