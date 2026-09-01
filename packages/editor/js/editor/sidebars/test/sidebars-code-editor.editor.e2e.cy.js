
/**
 * Blockera dependencies
 */
import {
	createPost,
	closeWelcomeGuide,
} from '@blockera/dev-cypress/js/helpers';

describe('Secondary sidebar in code editor', () => {
	const openCodeEditor = () => {
		cy.get('[aria-label="Options"]').first().click();
		cy.get('span').contains('Code editor').click();
		cy.get('.editor-post-text-editor', { timeout: 20000 }).should('exist');
	};

	const exitCodeEditor = () => {
		cy.get('button').contains('Exit code editor').click();
		cy.get('.edit-post-visual-editor', { timeout: 20000 }).should('exist');
	};

	beforeEach(() => {
		createPost();
		closeWelcomeGuide();

		cy.get('.editor-header', { timeout: 30000 }).should('exist');

		cy.get('body').then(($body) => {
			if ($body.find('.editor-post-text-editor').length) {
				cy.contains('button', 'Exit code editor').click();
				cy.get(
					'.edit-post-visual-editor, .editor-visual-editor',
					{ timeout: 20000 }
				).should('exist');
			}
		});

		cy.window().then((win) => {
			win.wp.data.dispatch('core/editor')?.setEditorMode?.('visual');
			const dispatch = win.wp.data.dispatch(
				'blockera/editor-persistence'
			);
			if (dispatch?.setSidebarLayout) {
				dispatch.setSidebarLayout({
					inserter: { dock: 'left', order: 0 },
					listView: { dock: 'left', order: 1 },
					complementary: { dock: 'right', order: 0 },
				});
				dispatch.setDockPaneHeights('left', ['50%', '50%']);
				dispatch.setDockPaneHeights('right', ['100%']);
			}
			const sel = win.wp.data.select('blockera/editor-persistence');
			if (sel && !sel.isSecondarySidebarOpen()) {
				cy.getByDataTest('blockera-secondary-sidebar-toggle').click({
					force: true,
				});
			}
		});

		cy.getByDataTest('blockera-sidebar-pane-listView', {
			timeout: 30000,
		}).should('exist');
	});

	it('should keep both panels visible with empty notices on every inserter and list view tab', () => {
		cy.getByDataTest('blockera-sidebar-pane-inserter').should('exist');
		cy.getByDataTest('blockera-sidebar-pane-listView').should('exist');
		cy.get('.blockera-list-view-controls', { timeout: 20000 }).should(
			'exist'
		);
		cy.get(
			'.blockera-combined-sidebar__list-view .editor-list-view-sidebar__list-view-panel-content'
		).should('exist');
		cy.getByDataTest('blockera-code-editor-inserter-notice').should(
			'not.exist'
		);
		cy.getByDataTest('blockera-code-editor-list-view-notice').should(
			'not.exist'
		);

		openCodeEditor();

		cy.getByDataTest('blockera-secondary-sidebar-content')
			.should('exist')
			.and('have.class', 'is-visible');
		cy.get('.blockera-combined-sidebar').should(
			'have.class',
			'is-text-editor'
		);

		cy.get(
			'.blockera-combined-sidebar__inserter .block-editor-block-types-list'
		).should('not.exist');
		cy.get('.block-editor-list-view-tree').should('not.exist');
		cy.get(
			'.blockera-combined-sidebar__list-view .editor-list-view-sidebar__list-view-panel-content'
		).should('not.exist');
		cy.get('.editor-list-view-sidebar__outline-info').should('not.exist');
		cy.get('.blockera-list-view-controls').should('not.exist');

		cy.getByDataTest('blockera-code-editor-inserter-notice')
			.should('be.visible')
			.and('contain', 'Not available in code editor.');
		cy.getByDataTest('blockera-code-editor-list-view-notice')
			.should('be.visible')
			.and('contain', 'Not available in code editor.');

		cy.get('.blockera-combined-sidebar__inserter [data-test="blocks-tab"]')
			.should('have.class', 'is-active-tab')
			.and('not.be.disabled');
		cy.get(
			'.blockera-combined-sidebar__inserter [data-test="patterns-tab"]'
		).should('not.be.disabled');
		cy.get(
			'.blockera-combined-sidebar__inserter [data-test="media-tab"]'
		).should('not.be.disabled');

		cy.get(
			'.blockera-combined-sidebar__inserter [data-test="patterns-tab"]'
		).click();
		cy.get(
			'.blockera-combined-sidebar__inserter [data-test="patterns-tab"]'
		).should('have.class', 'is-active-tab');
		cy.getByDataTest('blockera-code-editor-inserter-notice').should(
			'be.visible'
		);
		cy.get('.block-editor-inserter__block-patterns-tabs-container').should(
			'not.exist'
		);

		cy.get(
			'.blockera-combined-sidebar__inserter [data-test="media-tab"]'
		).click();
		cy.get(
			'.blockera-combined-sidebar__inserter [data-test="media-tab"]'
		).should('have.class', 'is-active-tab');
		cy.getByDataTest('blockera-code-editor-inserter-notice').should(
			'be.visible'
		);

		cy.get(
			'.blockera-combined-sidebar__inserter [data-test="blocks-tab"]'
		).click();
		cy.get(
			'.blockera-combined-sidebar__inserter [data-test="blocks-tab"]'
		).should('have.class', 'is-active-tab');
		cy.getByDataTest('blockera-code-editor-inserter-notice').should(
			'be.visible'
		);

		cy.getByDataTest('outline-tab').click();
		cy.getByDataTest('blockera-code-editor-list-view-notice').should(
			'be.visible'
		);
		cy.get('.editor-list-view-sidebar__outline-info').should('not.exist');

		cy.getByDataTest('list-view-tab').click();
		cy.getByDataTest('blockera-code-editor-list-view-notice').should(
			'be.visible'
		);
		cy.get('.block-editor-list-view-tree').should('not.exist');

		exitCodeEditor();

		cy.get('.blockera-combined-sidebar').should(
			'not.have.class',
			'is-text-editor'
		);
		cy.getByDataTest('blockera-code-editor-inserter-notice').should(
			'not.exist'
		);
		cy.getByDataTest('blockera-code-editor-list-view-notice').should(
			'not.exist'
		);
		cy.get(
			'.blockera-combined-sidebar__inserter .block-editor-block-types-list'
		).should('exist');
		cy.get('.blockera-list-view-controls').should('exist');
		cy.get(
			'.blockera-combined-sidebar__list-view .editor-list-view-sidebar__list-view-panel-content'
		).should('exist');

		cy.get('.block-editor-tabbed-sidebar__tab')
			.contains('Patterns')
			.click();
		cy.get('.block-editor-inserter__block-patterns-tabs-container', {
			timeout: 20000,
		}).should('exist');
		cy.get(
			'.blockera-combined-sidebar__inserter [data-test="patterns-tab"]'
		).should('not.exist');
	});
});
