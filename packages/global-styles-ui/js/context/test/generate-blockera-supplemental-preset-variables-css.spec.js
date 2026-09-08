import {
	generateBlockeraSupplementalPresetVariablesCss,
	resetBlockeraSupplementalPresetVariablesCssCacheForTests,
} from '../generate-blockera-supplemental-preset-variables-css';

describe('generateBlockeraSupplementalPresetVariablesCss', () => {
	beforeEach(() => {
		resetBlockeraSupplementalPresetVariablesCssCacheForTests();
	});

	it('skips core-engine buckets such as color', () => {
		const css = generateBlockeraSupplementalPresetVariablesCss({
			color: {
				palette: {
					custom: [{ slug: 'accent', color: '#f00', isVisible: true }],
				},
			},
			typography: {
				blockeraLineHeights: {
					custom: [{ slug: 'relaxed', size: '1.5', isVisible: true }],
				},
			},
		});

		expect(css).not.toContain('--wp--preset--color--');
		expect(css).toContain('--wp--preset--line-height--relaxed');
	});

	it('updates one infix and slug without dropping sibling infixes', () => {
		const widthSizes = {
			custom: [{ slug: 'wide', size: '1200px', isVisible: true }],
		};
		const first = generateBlockeraSupplementalPresetVariablesCss({
			typography: {
				blockeraLineHeights: {
					custom: [{ slug: 'relaxed', size: '1.5', isVisible: true }],
				},
			},
			blockeraWidthSizes: widthSizes,
		});
		const second = generateBlockeraSupplementalPresetVariablesCss({
			typography: {
				blockeraLineHeights: {
					custom: [{ slug: 'relaxed', size: '2', isVisible: true }],
				},
			},
			blockeraWidthSizes: widthSizes,
		});

		expect(first).toContain('--wp--preset--line-height--relaxed: 1.5');
		expect(second).toContain('--wp--preset--line-height--relaxed: 2');
		expect(second).toContain('--wp--preset--width-size--wide: 1200px');
		expect(first).toContain('--wp--preset--width-size--wide: 1200px');
	});

	it('returns the same string while settings identity is unchanged', () => {
		const settings = {
			typography: {
				blockeraLineHeights: {
					custom: [{ slug: 'relaxed', size: '1.5', isVisible: true }],
				},
			},
		};

		const first = generateBlockeraSupplementalPresetVariablesCss(settings);
		const second = generateBlockeraSupplementalPresetVariablesCss(settings);

		expect(second).toBe(first);
	});
});
