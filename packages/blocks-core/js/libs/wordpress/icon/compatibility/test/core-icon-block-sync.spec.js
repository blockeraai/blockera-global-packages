/**
 * Internal dependencies
 */
import {
	applyCoreIconWidthHeightCompatibility,
	isEmptyWidthValue,
	shouldPersistAutoHeight,
} from '../core-icon-width-height';

describe('applyCoreIconWidthHeightCompatibility', () => {
	const masterNormal = {
		isMasterBlock: true,
		isMasterNormalState: true,
	};

	it('sets height auto when width is set and height is empty', () => {
		const result = applyCoreIconWidthHeightCompatibility(
			{ blockeraWidth: { value: '48px' } },
			'blockeraWidth',
			'48px',
			masterNormal
		);

		expect(result.blockeraHeight).toEqual({ value: 'auto' });
	});

	it('sets height auto when height is already auto', () => {
		const result = applyCoreIconWidthHeightCompatibility(
			{ blockeraHeight: { value: 'auto' } },
			'blockeraWidth',
			'64px',
			masterNormal
		);

		expect(result.blockeraHeight).toEqual({ value: 'auto' });
	});

	it('keeps a custom height when width changes', () => {
		const result = applyCoreIconWidthHeightCompatibility(
			{ blockeraHeight: { value: '32px' } },
			'blockeraWidth',
			'64px',
			masterNormal
		);

		expect(result.blockeraHeight).toEqual({ value: '32px' });
	});

	it('keeps a value-addon height when width changes', () => {
		const heightAddon = {
			isValueAddon: true,
			valueType: 'variable',
			name: 'Content Width',
		};

		const result = applyCoreIconWidthHeightCompatibility(
			{ blockeraHeight: { value: heightAddon } },
			'blockeraWidth',
			'64px',
			masterNormal
		);

		expect(result.blockeraHeight.value).toEqual(heightAddon);
	});

	it('does not set height when width is empty', () => {
		const result = applyCoreIconWidthHeightCompatibility(
			{},
			'blockeraWidth',
			'',
			masterNormal
		);

		expect(result.blockeraHeight).toBeUndefined();
	});

	it('does not set height for other feature ids', () => {
		const result = applyCoreIconWidthHeightCompatibility(
			{},
			'blockeraIcon',
			{ icon: 'image', library: 'wp' },
			masterNormal
		);

		expect(result.blockeraHeight).toBeUndefined();
	});

	it('skips inner blocks', () => {
		const result = applyCoreIconWidthHeightCompatibility(
			{},
			'blockeraWidth',
			'48px',
			{ isMasterBlock: false, isMasterNormalState: true }
		);

		expect(result.blockeraHeight).toBeUndefined();
	});

	it('skips non-base breakpoints and non-normal states', () => {
		const result = applyCoreIconWidthHeightCompatibility(
			{},
			'blockeraWidth',
			'40px',
			{
				isMasterBlock: true,
				isMasterNormalState: false,
			}
		);

		expect(result.blockeraHeight).toBeUndefined();
	});
});

describe('isEmptyWidthValue / shouldPersistAutoHeight', () => {
	it('treats empty and wrapped-empty as empty width', () => {
		expect(isEmptyWidthValue('')).toBe(true);
		expect(isEmptyWidthValue({ value: '' })).toBe(true);
		expect(isEmptyWidthValue('48px')).toBe(false);
	});

	it('allows persist for empty and auto height only', () => {
		expect(shouldPersistAutoHeight('')).toBe(true);
		expect(shouldPersistAutoHeight({ value: 'auto' })).toBe(true);
		expect(shouldPersistAutoHeight('32px')).toBe(false);
	});
});
