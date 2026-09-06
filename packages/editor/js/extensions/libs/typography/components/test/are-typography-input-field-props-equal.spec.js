import { areTypographyInputFieldPropsEqual } from '../are-typography-input-field-props-equal';

describe('areTypographyInputFieldPropsEqual', () => {
	const onChange = () => {};

	it('skips when the field value is unchanged', () => {
		const prev = {
			value: '16px',
			defaultValue: '',
			onChange,
			block: { clientId: 'a', blockName: 'core/paragraph' },
			style: { margin: '0px' },
		};
		const next = {
			value: '16px',
			defaultValue: '',
			onChange,
			block: { clientId: 'a', blockName: 'core/paragraph' },
			style: { margin: '1px' },
		};

		expect(areTypographyInputFieldPropsEqual(prev, next)).toBe(true);
	});

	it('re-renders when the field value changes', () => {
		const prev = {
			value: '16px',
			onChange,
			block: { clientId: 'a', blockName: 'core/paragraph' },
		};
		const next = {
			value: '18px',
			onChange,
			block: { clientId: 'a', blockName: 'core/paragraph' },
		};

		expect(areTypographyInputFieldPropsEqual(prev, next)).toBe(false);
	});
});
