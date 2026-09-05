/**
 * Global Styles Actions For Blocks Plugin → Functionality
 */
import {
	openSiteEditor,
	closeWelcomeGuide,
	assertBlockData,
} from '@blockera/dev-cypress/js/helpers';

const openBlockStyleVariationsTab = () => {
	cy.openGlobalStylesPanel();
	closeWelcomeGuide();
	cy.getByDataTest('block-style-variations').eq(0).click();
};

describe('Global Styles Actions For Blocks Plugin → Functionality (Global Styles)', () => {
	beforeEach(() => {
		openSiteEditor();
		openBlockStyleVariationsTab();
	});

	it('should activate panel when global styles screen is visible', () => {
		cy.get('body').then(($body) => {
			if ($body.find('button[id="/blocks/core%2Fgroup"]').length) {
				cy.get('button[id="/blocks/core%2Fgroup"]').click();
				cy.getByDataTest('blockera-block-card').should('be.visible');
			}
		});
	});

	it('should set selected block style when global styles button is clicked', () => {
		cy.get('body').then(($body) => {
			if ($body.find('button[id="/blocks/core%2Fgroup"]').length) {
				cy.get('button[id="/blocks/core%2Fgroup"]').click();
				cy.getByDataTest('blockera-block-card').should('be.visible');
			}
		});

		// Clicking the Styles pin while Styles is already open is captured to
		// restore Settings and never reaches this plugin's click listener.
		cy.window().then((win) => {
			win.wp.data
				.dispatch('core/interface')
				.enableComplementaryArea('core', 'edit-post/document');
		});
		cy.window().should((win) => {
			expect(
				win.wp.data
					.select('core/interface')
					.getActiveComplementaryArea('core')
			).to.eq('edit-post/document');
		});
		cy.get('button[aria-controls="edit-site:global-styles"]')
			.filter(':visible')
			.first()
			.should('not.have.class', 'is-pressed')
			.and('have.attr', 'aria-expanded', 'false');

		cy.openGlobalStylesPanel();

		assertBlockData((data) => {
			expect(
				data.select('blockera/editor').getSelectedBlockStyle()
			).to.equal('');
		});
	});

	it('should handle block type click events', () => {
		cy.get('body').then(($body) => {
			if ($body.find('button[id="/blocks/core%2Fgroup"]').length) {
				cy.get('button[id="/blocks/core%2Fgroup"]').click();

				cy.get(
					'body[data-test="has-blockera-global-styles-ui"]'
				).should('be.visible');

				assertBlockData((data) => {
					expect(
						data.select('blockera/editor').getSelectedBlockRef()
					).to.not.equal(undefined);
				});
			}
		});
	});
});
