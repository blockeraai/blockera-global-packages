import { getCompatibleAttributes } from '../get-compatible-attributes';

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
});
