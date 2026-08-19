/**
 * getTextAlignSelectOptions: Blockera text-align tokens + icons.
 */

import { TEXT_ALIGN_VALUES } from '../constants';
import { getTextAlignSelectOptions } from '../utils';

describe('getTextAlignSelectOptions', () => {
	it('covers left, center, right, justify, and none', () => {
		expect(TEXT_ALIGN_VALUES.map((item) => item.value)).toEqual([
			'left',
			'center',
			'right',
			'justify',
			'initial',
		]);
		expect(getTextAlignSelectOptions().map((item) => item.value)).toEqual(
			TEXT_ALIGN_VALUES.map((item) => item.value)
		);
	});

	it('attaches an icon to every option', () => {
		const options = getTextAlignSelectOptions(16);

		expect(options).toHaveLength(5);
		for (const option of options) {
			expect(option.icon).toBeTruthy();
			expect(option.label).toBeTruthy();
		}
	});
});
