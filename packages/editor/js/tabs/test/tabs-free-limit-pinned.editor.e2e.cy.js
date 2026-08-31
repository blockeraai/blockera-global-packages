/**
 * Pro pinned-tab limit (free tier) — one spec per file to limit Chrome renderer
 * memory in CI.
 *
 * @see workspace-limit-2.editor.e2e.cy.js
 * @see workspace-limit-3.editor.e2e.cy.js
 * @see tabs-title.editor.e2e.cy.js — tab title, rename, view/copy links
 */
import { createPost } from '@blockera/dev-cypress/js/helpers';
import { WORKSPACE_TABS_TEST_ID } from 'blockera-editor-tabs-test-ids';

describe('Workspace tabs: Pinned limit (free tier)', () => {
	const unpinnedTabRoots = `.blockera-tabs-bar-tabs__normal-tabs [test-id^="${WORKSPACE_TABS_TEST_ID.tabRootPrefix}"]`;

	/**
	 * Default pinned tab limit is 0 (`resolveTabsConfig`). Pin stays in the
	 * context menu; clicking it opens the upgrade prompt instead of pinning.
	 * With Pro active, `blockera.editor.tabs` raises limits and this prompt
	 * does not appear.
	 *
	 * @see packages/editor/js/tabs/utils/tabsConfig.ts
	 * @see packages/editor/js/tabs/hooks/useTabs.ts — pinTab / togglePinTab
	 * @see packages/editor/js/tabs/components/TabsBar.tsx — UpgradePrompt
	 */
	it('should show the Pin item and the upgrade prompt when pinning exceeds the free pinned limit', () => {
		cy.tabsResetWorkspaceStorage();
		createPost({ postType: 'post' });
		cy.tabsExpectUnpinnedCount(1);
		cy.tabsExpectPinnedCount(0);

		cy.get(unpinnedTabRoots).eq(0).rightclick();
		cy.getByTestId(WORKSPACE_TABS_TEST_ID.contextMenuPin)
			.should('be.visible')
			.click();

		cy.tabsExpectPinnedCount(0);
		cy.tabsExpectUnpinnedCount(1);
		cy.tabsExpectLimitUpgradePrompt({ timeout: 20000 });
		cy.get('.blockera-component-upgrade-prompt').should(
			'contain.text',
			'Unlimited Pinned Tabs'
		);
	});
});
