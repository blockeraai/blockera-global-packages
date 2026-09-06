/**
 * Inspector InputControl / UnitInput / ControlContextProvider render budgets.
 *
 * Sets `window.__BLOCKERA_RENDER_DEBUG__` before boot so the production
 * bundle counts those components. Cypress CI uses the same production build.
 */
import {
	appendBlocks,
	createPostWithRenderDebug,
	expectComponentRenderDeltaAtMost,
	snapshotRenderStats,
} from '@blockera/dev-cypress/js/helpers';

describe('Inspector input re-render performance', () => {
	beforeEach(() => {
		createPostWithRenderDebug({ mode: 'all' });
		appendBlocks(
			`<!-- wp:paragraph -->
<p>Render count</p>
<!-- /wp:paragraph -->`
		);
		cy.getBlock('core/paragraph').click();
		cy.getByAriaControls('styles-view').click();
		cy.getParentContainer('Font Size').as('fontSize');
	});

	it('does not keep re-rendering inspector inputs while idle', () => {
		cy.wait(800);
		snapshotRenderStats('idleStart');

		cy.wait(1000);
		snapshotRenderStats('idleEnd');

		expectComponentRenderDeltaAtMost({
			startAlias: 'idleStart',
			endAlias: 'idleEnd',
			component: 'InputControl',
			max: 8,
		});
		expectComponentRenderDeltaAtMost({
			startAlias: 'idleStart',
			endAlias: 'idleEnd',
			component: 'UnitInput',
			max: 8,
		});
		expectComponentRenderDeltaAtMost({
			startAlias: 'idleStart',
			endAlias: 'idleEnd',
			component: 'ControlContextProvider',
			max: 24,
		});
	});

	it('keeps Font Size typing within InputControl and UnitInput budgets', () => {
		cy.wait(500);
		snapshotRenderStats('beforeType');

		cy.get('@fontSize').within(() => {
			cy.get('input').clear({ force: true });
			cy.get('input').type('15', { force: true, delay: 0 });
		});

		cy.wait(500);
		snapshotRenderStats('afterType');

		expectComponentRenderDeltaAtMost({
			startAlias: 'beforeType',
			endAlias: 'afterType',
			component: 'InputControl',
			max: 40,
		});
		expectComponentRenderDeltaAtMost({
			startAlias: 'beforeType',
			endAlias: 'afterType',
			component: 'UnitInput',
			max: 40,
		});
		expectComponentRenderDeltaAtMost({
			startAlias: 'beforeType',
			endAlias: 'afterType',
			component: 'ControlContextProvider',
			max: 80,
		});
	});
});
