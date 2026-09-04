/**
 * Blockera dependencies
 */
import {
	openSiteEditor,
	closeWelcomeGuide,
} from '@blockera/dev-cypress/js/helpers';

const DEFAULT_SIDEBAR_LAYOUT = {
	inserter: { dock: 'left', order: 0 },
	listView: { dock: 'left', order: 1 },
	complementary: { dock: 'right', order: 0 },
};

function persistenceDispatch(win) {
	return win.wp.data.dispatch('blockera/editor-persistence');
}

function persistenceSelect(win) {
	return win.wp.data.select('blockera/editor-persistence');
}

function complementaryArea(win) {
	return win.wp.data
		.select('core/interface')
		.getActiveComplementaryArea('core');
}

function stylesPin() {
	return cy
		.get('button[aria-controls="edit-site:global-styles"]')
		.filter(':visible')
		.first();
}

describe('Site Editor Styles pin and Settings panel', () => {
	beforeEach(() => {
		openSiteEditor();
		closeWelcomeGuide();

		cy.get('.editor-header', { timeout: 30000 }).should('exist');

		cy.window({ timeout: 30000 }).should((win) => {
			expect(
				persistenceDispatch(win)?.setSidebarLayout,
				'layout actions'
			).to.be.a('function');
			const dispatch = persistenceDispatch(win);
			dispatch.setSidebarLayout(DEFAULT_SIDEBAR_LAYOUT);
			dispatch.setDockPaneHeights('left', ['50%', '50%']);
			dispatch.setDockPaneHeights('right', ['100%']);
			dispatch.setPrimarySidebarOpen(true);
			win.wp.data
				.dispatch('core/interface')
				.enableComplementaryArea('core', 'edit-post/document');
		});

		cy.getByDataTest('blockera-primary-sidebar-content').should(
			'have.class',
			'is-visible'
		);
		cy.get('.editor-sidebar__panel-tabs', { timeout: 20000 }).should(
			'exist'
		);
	});

	it('should switch back to Settings when Styles is clicked while Styles is already open', () => {
		cy.window().should((win) => {
			expect(complementaryArea(win)).to.eq('edit-post/document');
			expect(persistenceSelect(win).isPrimarySidebarOpen()).to.eq(true);
		});

		stylesPin().should('be.visible').click();

		cy.window().should((win) => {
			expect(complementaryArea(win)).to.eq('edit-site/global-styles');
		});
		cy.get('.editor-global-styles-sidebar', { timeout: 20000 }).should(
			'exist'
		);
		cy.getByDataTest('blockera-primary-sidebar-content').should(
			'have.class',
			'is-visible'
		);

		stylesPin().should('have.class', 'is-pressed').click();

		cy.window().should((win) => {
			expect(complementaryArea(win)).to.be.oneOf([
				'edit-post/document',
				'edit-post/block',
			]);
			expect(persistenceSelect(win).isPrimarySidebarOpen()).to.eq(true);
		});
		cy.get('.editor-sidebar__panel-tabs').should('exist');
		cy.get('.editor-global-styles-sidebar').should('not.exist');
		cy.get(
			'.interface-interface-skeleton__sidebar.blockera-complementary-overlay .interface-complementary-area'
		).should('exist');
		cy.getByDataTest('blockera-primary-sidebar-content')
			.should('have.class', 'is-visible')
			.and(($el) => {
				expect($el[0].getBoundingClientRect().width).to.be.greaterThan(
					200
				);
			});
	});
});
