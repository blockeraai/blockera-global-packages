const {
	categoryForSpecFile,
	listCategoriesFromSpecPaths,
	resolveOptions,
	specsForCategory,
} = require('../list-test-categories');

const e2eOptions = resolveOptions({
	suffix: 'e2e.cy.js',
	generalCategory: 'general',
});

describe('list-test-categories PR spec paths', () => {
	const innerBlocks =
		'packages/editor-pro/js/extensions/libs/block-states/test/block-states-inner-blocks.e2e.cy.js';
	const styleEngine =
		'packages/editor-pro/js/style-engine/test/style-engine.e2e.cy.js';
	const panels =
		'packages/blockera-pro-admin/js/test/blockera-settings-account.panels.e2e.cy.js';

	test('uncategorized name.e2e.cy.js files map to general, not e2e.cy', () => {
		expect(categoryForSpecFile(innerBlocks, e2eOptions)).toBe('general');
		expect(categoryForSpecFile(styleEngine, e2eOptions)).toBe('general');
	});

	test('name.category.e2e.cy.js keeps the infix category', () => {
		expect(categoryForSpecFile(panels, e2eOptions)).toBe('panels');
	});

	test('PR filter lists one general matrix category for uncategorized -pro specs', () => {
		expect(
			listCategoriesFromSpecPaths([innerBlocks, styleEngine], {
				suffix: 'e2e.cy.js',
				generalCategory: 'general',
			})
		).toEqual(['general']);
	});

	test('specsForCategory returns the listed files for general', () => {
		expect(
			specsForCategory([innerBlocks, styleEngine, panels], 'general', {
				suffix: 'e2e.cy.js',
				generalCategory: 'general',
			})
		).toEqual([innerBlocks, styleEngine]);
	});
});
