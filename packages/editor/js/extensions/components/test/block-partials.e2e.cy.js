/**
 * Block partials UI plus BlockBase render-count budgets.
 *
 * Enables `window.__BLOCKERA_BLOCK_BASE_RENDER_DEBUG__` before the editor
 * boots (same pattern as the BlockBase re-render spec). After the card /
 * variation UI is shown, idle BlockBase commits must stay near zero.
 */
import {
	appendBlocks,
	createPostWithRenderDebug,
	snapshotBlockBaseRenderStats,
} from '@blockera/dev-cypress/js/helpers';

function expectIdleBlockBaseRenders(max = 6) {
	cy.wait(800);
	snapshotBlockBaseRenderStats('idleStart');

	cy.wait(1000);
	snapshotBlockBaseRenderStats('idleEnd');

	cy.get('@idleStart').then((start) => {
		cy.get('@idleEnd').then((end) => {
			const delta = (end.total || 0) - (start.total || 0);
			cy.log(`[BlockBase renders] idle delta=${delta}`);
			expect(
				delta,
				`idle BlockBase renders (${delta}) should stay near zero after block partials UI`
			).to.be.at.most(max);
		});
	});
}

describe('Block Partials Testing ...', () => {
	beforeEach(() => {
		createPostWithRenderDebug({ mode: 'blockBase' });
	});

	it('should be able to hide WordPress original block card and display blockera block card', () => {
		cy.getBlock('default').type('This is test paragraph', { delay: 0 });

		cy.get('[aria-label="Settings"]').eq(1).click({ force: true });
		cy.getByAriaControls('styles-view').click();

		cy.get('.block-editor-block-card').should(
			'have.css',
			'display',
			'none'
		);

		cy.getByDataTest('blockera-block-card').within(() => {
			cy.get('.blockera-extension-block-card__title__input span').should(
				'have.attr',
				'placeholder',
				'Paragraph'
			);
		});

		cy.getByDataTest('blockera-block-card').should(
			'have.css',
			'display',
			'flex'
		);

		expectIdleBlockBaseRenders();
	});

	it('should be able to hide WordPress original block variation transform and display blockera block variation transform', () => {
		cy.getBlock('default').type('This is test paragraph', { delay: 0 });

		appendBlocks(`<!-- wp:group {"blockeraCompatId":"81683555276","blockeraDisplay":"flex","blockeraFlexLayout":{"direction":"column","alignItems":"","justifyContent":""},"layout":{"type":"flex","orientation":"vertical"}} -->
<div class="wp-block-group"></div>
<!-- /wp:group -->`);

		cy.getBlock('core/group').click();

		cy.get('.block-editor-block-variation-transforms').should(
			'have.css',
			'display',
			'none'
		);

		cy.get('.blockera-block-variation-transforms')
			.should('exist')
			.should('be.visible');

		expectIdleBlockBaseRenders();
	});

	it('should be able to hide WordPress original block variations and display blockera block variations', () => {
		appendBlocks(`<!-- wp:social-links {"className":"is-style-default"} -->
<ul class="wp-block-social-links is-style-default"><!-- wp:social-link {"service":"wordpress"} /--></ul>
<!-- /wp:social-links -->`);

		cy.getBlock('core/social-links').click();

		cy.getByDataTest('style-variations-button').eq(0).click();

		cy.get('.blockera-component-popover.variations-picker-popover')
			.last()
			.within(() => {
				cy.getByDataTest('style-pill-shape').contains('Pill Shape');
			});

		cy.getByAriaLabel('Block Settings').click();
		cy.get('.components-popover')
			.last()
			.within(() => {
				cy.getByDataTest('basic-mode-block').click();
			});
		cy.getByAriaLabel('Styles').click();

		cy.getByAriaLabel('Pill Shape').contains('Pill Shape');

		expectIdleBlockBaseRenders();
	});
});
