import {
	getCompatibleAttributes,
	shouldRunWpToBlockeraHydrate,
	syncGroupLayoutFromWp,
	unwrapBlockeraStoredValue,
} from '../get-compatible-attributes';

const unwrappedFontSizeAddon = {
	isValueAddon: true,
	valueType: 'variable',
	name: 'Missing FS',
	settings: {
		id: 'missing-fs-empty',
		name: 'Missing FS',
		type: 'font-size',
		var: '--wp--preset--font-size--missing-fs-empty',
	},
};

describe('getCompatibleAttributes', () => {
	it('stamps identity without WP merge when skipping WP→Blockera', () => {
		const next = getCompatibleAttributes({
			args: {},
			isActive: true,
			runWpToBlockera: false,
			stampIdentity: true,
			availableAttributes: { blockeraId: { type: 'string' } },
			defaultAttributes: {
				blockeraFontSize: { type: 'object', default: { value: '' } },
			},
			attributes: {
				blockeraFontSize: unwrappedFontSizeAddon,
			},
		});

		expect(next.blockeraId).toMatch(/^[0-9a-z]{6}$/);
		expect(next.blockeraFontSize).toEqual(unwrappedFontSizeAddon);
		expect(next.blockeraFontSize.value).toBeUndefined();
	});

	it('does not stamp identity when skip WP and stampIdentity is false', () => {
		const next = getCompatibleAttributes({
			args: {},
			isActive: true,
			runWpToBlockera: false,
			stampIdentity: false,
			availableAttributes: { blockeraId: { type: 'string' } },
			defaultAttributes: {
				blockeraFontSize: { type: 'object', default: { value: '' } },
			},
			attributes: {
				blockeraFontSize: unwrappedFontSizeAddon,
			},
		});

		expect(next.blockeraId).toBeUndefined();
		expect(next.blockeraFontSize).toEqual(unwrappedFontSizeAddon);
	});

	it('syncs group display from WP layout when skipping WP→Blockera', () => {
		const next = getCompatibleAttributes({
			args: {
				blockId: 'core/group',
				activeBlockVariation: { name: 'group-row' },
				blockAttributes: {
					blockeraDisplay: { default: { value: '' } },
				},
			},
			isActive: true,
			runWpToBlockera: false,
			stampIdentity: false,
			availableAttributes: { blockeraId: { type: 'string' } },
			defaultAttributes: {
				blockeraDisplay: { type: 'object', default: { value: '' } },
			},
			attributes: {
				layout: { type: 'flex' },
				blockeraDisplay: { value: '' },
				blockeraFontSize: unwrappedFontSizeAddon,
			},
		});

		expect(next.blockeraDisplay).toEqual({ value: 'flex' });
		expect(next.blockeraFontSize).toEqual(unwrappedFontSizeAddon);
	});
});

describe('syncGroupLayoutFromWp', () => {
	it('clears leftover flex display on constrained group', () => {
		const next = syncGroupLayoutFromWp(
			{
				layout: { type: 'constrained' },
				blockeraDisplay: 'flex',
			},
			{
				blockId: 'core/group',
				activeBlockVariation: { name: 'group' },
				blockAttributes: {
					blockeraDisplay: { default: { value: '' } },
				},
			}
		);

		expect(unwrapBlockeraStoredValue(next.blockeraDisplay)).toBe('');
	});

	it('sets flex direction from group-stack without cloning non-group attrs', () => {
		const foreign = { layout: { type: 'flex' } };
		expect(
			syncGroupLayoutFromWp(foreign, { blockId: 'core/paragraph' })
		).toBe(foreign);

		const next = syncGroupLayoutFromWp(
			{
				layout: { type: 'flex', orientation: 'vertical' },
				blockeraDisplay: { value: '' },
				blockeraFlexLayout: {
					value: {
						direction: 'row',
						justifyContent: '',
						alignItems: '',
					},
				},
			},
			{
				blockId: 'core/group',
				activeBlockVariation: { name: 'group-stack' },
				blockAttributes: {
					blockeraDisplay: { default: { value: '' } },
				},
			}
		);

		expect(unwrapBlockeraStoredValue(next.blockeraDisplay)).toBe('flex');
		expect(unwrapBlockeraStoredValue(next.blockeraFlexLayout)?.direction).toBe(
			'column'
		);
	});

	it('copies WP grid min column width when skip-hydrate layout sync runs', () => {
		const next = syncGroupLayoutFromWp(
			{
				layout: { type: 'grid', minimumColumnWidth: '23rem' },
				blockeraDisplay: { value: 'grid' },
				blockeraGridMinimumColumnWidth: { value: '' },
			},
			{
				blockId: 'core/group',
				blockAttributes: {
					blockeraDisplay: { default: { value: '' } },
				},
			}
		);

		expect(
			unwrapBlockeraStoredValue(next.blockeraGridMinimumColumnWidth)
		).toBe('23rem');
	});
});

describe('shouldRunWpToBlockeraHydrate', () => {
	it('runs when the block has no Blockera feature attrs', () => {
		expect(
			shouldRunWpToBlockeraHydrate({
				isActive: true,
				hasFeatures: false,
			})
		).toBe(true);
	});

	it('skips when Blockera feature attrs already exist', () => {
		expect(
			shouldRunWpToBlockeraHydrate({
				isActive: true,
				hasFeatures: true,
			})
		).toBe(false);
	});

	it('runs on return-to-advanced even when features exist', () => {
		expect(
			shouldRunWpToBlockeraHydrate({
				isActive: true,
				pendingReturn: true,
				hasFeatures: true,
			})
		).toBe(true);
	});

	it('does not run when the engine is inactive', () => {
		expect(
			shouldRunWpToBlockeraHydrate({
				isActive: false,
				hasFeatures: false,
			})
		).toBe(false);
	});
});
