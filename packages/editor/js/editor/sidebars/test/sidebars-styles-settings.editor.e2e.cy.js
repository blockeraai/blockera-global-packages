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

/**
 * Gutenberg also renders a Styles close toggle inside the complementary area
 * (`aria-controls="edit-site:global-styles"`). That copy is often not
 * `:visible` on CI once the overlay is clipped or animating from width 0.
 * Blockera's deactivate-to-Settings handler listens on the header pin, so
 * target that node and force-click (jQuery `:visible` is too strict here).
 */
const STYLES_HEADER_PIN =
	'.editor-header .interface-pinned-items button[aria-controls="edit-site:global-styles"]';

function stylesPin() {
	return cy.get(STYLES_HEADER_PIN, { timeout: 20000 });
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
			// Keep PinnedItems.Slot mounted: Gutenberg hides it when icon
			// labels are on and the viewport is not `large` (common in CI).
			win.wp.data
				.dispatch('core/preferences')
				.set('core', 'showIconLabels', false);
			win.wp.data
				.dispatch('core/interface')
				.pinItem('core', 'edit-site/global-styles');
		});

		cy.getByDataTest('blockera-primary-sidebar-content').should(
			'have.class',
			'is-visible'
		);
		cy.get('.editor-sidebar__panel-tabs', { timeout: 20000 }).should(
			'exist'
		);
		stylesPin().should('exist');
	});

	it('should switch back to Settings when Styles is clicked while Styles is already open', () => {
		cy.window().should((win) => {
			expect(complementaryArea(win)).to.eq('edit-post/document');
			expect(persistenceSelect(win).isPrimarySidebarOpen()).to.eq(true);
		});

		stylesPin().click({ force: true });

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

		stylesPin().should('have.class', 'is-pressed').click({ force: true });

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
