/**
 * Blockera dependencies
 */
import {
	createPost,
	closeWelcomeGuide,
} from '@blockera/dev-cypress/js/helpers';

const DEFAULT_SIDEBAR_LAYOUT = {
	inserter: { dock: 'left', order: 0 },
	listView: { dock: 'left', order: 1 },
	complementary: { dock: 'right', order: 0 },
};

const ALL_RIGHT_LAYOUT = {
	inserter: { dock: 'right', order: 0 },
	complementary: { dock: 'right', order: 1 },
	listView: { dock: 'right', order: 2 },
};

function persistenceDispatch(win) {
	return win.wp.data.dispatch('blockera/editor-persistence');
}

function persistenceSelect(win) {
	return win.wp.data.select('blockera/editor-persistence');
}

function applySidebarLayout(win, layout, leftHeights, rightHeights) {
	const dispatch = persistenceDispatch(win);
	dispatch.setSidebarLayout(layout);
	dispatch.setDockPaneHeights('left', leftHeights);
	dispatch.setDockPaneHeights('right', rightHeights);
}

function applyDefaultSidebarLayout(win) {
	applySidebarLayout(win, DEFAULT_SIDEBAR_LAYOUT, ['50%', '50%'], ['100%']);
}

function applyAllRightLayout(win) {
	applySidebarLayout(win, ALL_RIGHT_LAYOUT, [], [
		'33.33%',
		'33.33%',
		'33.34%',
	]);
}

function ensureSecondarySidebarOpen(win) {
	const sel = persistenceSelect(win);
	if (sel && !sel.isSecondarySidebarOpen()) {
		win.document
			.querySelector('[data-test="blockera-secondary-sidebar-toggle"]')
			?.click();
	}
}

function openInserterTab(dock, tabLabel) {
	cy.getByDataTest(`blockera-sidebar-dock-${dock}`)
		.find('.block-editor-inserter__menu')
		.contains('button[role="tab"]', tabLabel)
		.click();
}

function openFirstCategory(dock) {
	cy.getByDataTest(`blockera-sidebar-dock-${dock}`)
		.find('.block-editor-inserter__category-tablist button')
		.first()
		.click();
}

function assertCategoryTabFlexDirection(dock, expectedFlexDirection) {
	cy.getByDataTest(`blockera-sidebar-dock-${dock}`)
		.find('.block-editor-inserter__category-tablist [role="tab"]')
		.first()
		.should(($tab) => {
			expect(window.getComputedStyle($tab[0]).flexDirection).to.equal(
				expectedFlexDirection
			);
		});
}

function assertCategoryColumnOnDock(dock, expectedPanelSide) {
	const contentSelector =
		dock === 'left'
			? '[data-test="blockera-secondary-sidebar-content"]'
			: '[data-test="blockera-primary-sidebar-content"]';

	cy.get(contentSelector)
		.find('.block-editor-inserter__menu.show-panel')
		.should('exist');

	cy.get(contentSelector).should(($contentEl) => {
		const contentNode = $contentEl[0];
		const contentRect = contentNode.getBoundingClientRect();
		const panels = contentNode.querySelectorAll(
			'.block-editor-inserter__category-panel'
		);
		let visiblePanel = null;

		for (const panel of panels) {
			const zIndex = Number.parseInt(
				window.getComputedStyle(panel).zIndex,
				10
			);

			if (!Number.isNaN(zIndex) && zIndex >= 0) {
				visiblePanel = panel;
				break;
			}
		}

		expect(visiblePanel, 'visible category panel').to.exist;

		const panelRect = visiblePanel.getBoundingClientRect();
		expect(panelRect.height).to.be.closeTo(contentRect.height, 12);

		const firstColumn = contentNode.querySelector(
			'.block-editor-inserter__main-area .block-editor-tabbed-sidebar'
		);

		expect(firstColumn, 'inserter first column').to.exist;

		const columnRect = firstColumn.getBoundingClientRect();

		if (expectedPanelSide === 'right') {
			expect(panelRect.left).to.be.at.least(columnRect.right - 4);
		} else {
			expect(panelRect.right).to.be.at.most(columnRect.left + 4);
		}
	});
}

describe('Inserter category column layout', () => {
	beforeEach(() => {
		createPost();
		closeWelcomeGuide();

		cy.get('.editor-header', { timeout: 30000 }).should('exist');

		cy.window({ timeout: 30000 }).should((win) => {
			expect(
				persistenceDispatch(win)?.setSidebarLayout,
				'layout actions'
			).to.be.a('function');
			win.wp.data
				.dispatch('core/interface')
				.enableComplementaryArea('core', 'edit-post/document');
		});
	});

	it('should show a full-height patterns column to the right on the left dock', () => {
		cy.window().should((win) => {
			applyDefaultSidebarLayout(win);
			ensureSecondarySidebarOpen(win);
		});

		openInserterTab('left', 'Patterns');
		openFirstCategory('left');
		assertCategoryTabFlexDirection('left', 'row');
		assertCategoryColumnOnDock('left', 'right');
	});

	it('should show a full-height media column to the right on the left dock', () => {
		cy.window().should((win) => {
			applyDefaultSidebarLayout(win);
			ensureSecondarySidebarOpen(win);
		});

		openInserterTab('left', 'Media');
		openFirstCategory('left');
		assertCategoryColumnOnDock('left', 'right');
	});

	it('should show a full-height patterns column to the left on the right dock', () => {
		cy.window().should((win) => {
			applyAllRightLayout(win);
		});

		cy.getByDataTest('blockera-sidebar-pane-drag-inserter').should('exist');

		openInserterTab('right', 'Patterns');
		openFirstCategory('right');
		assertCategoryTabFlexDirection('right', 'row-reverse');
		assertCategoryColumnOnDock('right', 'left');
	});

	it('should show a full-height media column to the left on the right dock', () => {
		cy.window().should((win) => {
			applyAllRightLayout(win);
		});

		cy.getByDataTest('blockera-sidebar-pane-drag-inserter').should('exist');

		openInserterTab('right', 'Media');
		openFirstCategory('right');
		assertCategoryTabFlexDirection('right', 'row-reverse');
		assertCategoryColumnOnDock('right', 'left');
	});
});
