/**
 * Font Size functionality plus BlockBase / InputControl render budgets.
 *
 * Sets `__BLOCKERA_RENDER_DEBUG__` and `__BLOCKERA_BLOCK_BASE_RENDER_DEBUG__`
 * before boot (`mode: 'all'`) so the production bundle counts both.
 */
import {
	savePage,
	assertBlockData,
	getSelectedBlock,
	redirectToFrontPage,
	createPostWithRenderDebug,
	snapshotBlockBaseRenderStats,
	snapshotRenderStats,
	expectComponentRenderDeltaAtMost,
} from '@blockera/dev-cypress/js/helpers';

function expectBlockBaseTotalDeltaAtMost(startAlias, endAlias, max) {
	cy.get(`@${startAlias}`).then((start) => {
		cy.get(`@${endAlias}`).then((end) => {
			const delta = (end.total || 0) - (start.total || 0);
			cy.log(
				`[BlockBase renders] ${startAlias}→${endAlias} delta=${delta}`
			);
			expect(
				delta,
				`BlockBase re-rendered ${delta} times (budget ${max})`
			).to.be.at.most(max);
		});
	});
}

describe('Font Size → Functionality', () => {
	beforeEach(() => {
		createPostWithRenderDebug({ mode: 'all' });

		cy.getBlock('default').type('This is test paragraph', { delay: 0 });
		cy.getByAriaControls('styles-view').click();
	});

	it('Simple value font size', () => {
		cy.wait(500);
		snapshotBlockBaseRenderStats('beforeType');
		snapshotRenderStats('beforeTypeShared');

		cy.getParentContainer('Font Size').within(() => {
			cy.get('input[type="text"]').clear();
			cy.get('input[type="text"]').type(10, {
				force: true,
			});
		});

		cy.wait(500);
		snapshotBlockBaseRenderStats('afterType');
		snapshotRenderStats('afterTypeShared');

		expectBlockBaseTotalDeltaAtMost('beforeType', 'afterType', 40);
		expectComponentRenderDeltaAtMost({
			startAlias: 'beforeTypeShared',
			endAlias: 'afterTypeShared',
			component: 'InputControl',
			max: 40,
		});

		//Check block
		cy.getBlock('core/paragraph').should('have.css', 'font-size', '10px');

		//Check store
		assertBlockData((data) => {
			expect('10px').to.be.equal(
				getSelectedBlock(data, 'blockeraFontSize')
			);
		});

		//Check frontend
		savePage();

		redirectToFrontPage();

		cy.get('p.blockera-block').should('have.css', 'font-size', '10px');
	});

	it('Variable value', () => {
		cy.wait(500);
		snapshotBlockBaseRenderStats('beforeVar');
		snapshotRenderStats('beforeVarShared');

		cy.getParentContainer('Font Size').within(() => {
			cy.openValueAddon();
		});

		// select variable
		cy.selectValueAddonItem('small');

		cy.wait(500);
		snapshotBlockBaseRenderStats('afterVar');
		snapshotRenderStats('afterVarShared');

		expectBlockBaseTotalDeltaAtMost('beforeVar', 'afterVar', 40);
		expectComponentRenderDeltaAtMost({
			startAlias: 'beforeVarShared',
			endAlias: 'afterVarShared',
			component: 'InputControl',
			max: 40,
		});

		cy.getIframeBody().within(() => {
			cy.get('#blockera-styles-wrapper')
				.invoke('text')
				.should(
					'include',
					'font-size: var(--wp--preset--font-size--small, 0.875rem)'
				);
		});

		//Check store
		assertBlockData((data) => {
			expect({
				settings: {
					name: 'Small',
					id: 'small',
					value: '0.875rem',
					fluid: false,
					reference: {
						type: 'theme',
						theme: 'Twenty Twenty-Five',
					},
					type: 'font-size',
					var: '--wp--preset--font-size--small',
				},
				name: 'Small',
				isValueAddon: true,
				valueType: 'variable',
			}).to.be.deep.equal(getSelectedBlock(data, 'blockeraFontSize'));
		});

		//Check frontend
		savePage();

		redirectToFrontPage();

		cy.get('style#blockera-inline-css')
			.invoke('text')
			.should(
				'include',
				'font-size: var(--wp--preset--font-size--small, 0.875rem)'
			);
	});
});
