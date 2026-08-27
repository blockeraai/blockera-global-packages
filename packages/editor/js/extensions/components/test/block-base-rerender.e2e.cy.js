/**
 * BlockBase re-render budget.
 *
 * Enables `window.__BLOCKERA_BLOCK_BASE_RENDER_DEBUG__` before the editor
 * boots so {@link trackBlockBaseRender} records every BlockBaseImpl render
 * onto the parent window (canvas iframe instances report up).
 *
 * The suite fails if idle time or an unrelated block edit keeps re-rendering
 * every mounted BlockBase — the original performance issue.
 */
import {
	appendBlocks,
	closeWelcomeGuide,
	disableGutenbergFeatures,
	getWPDataObject,
	removeScopedStorageKeys,
	setAbsoluteBlockToolbar,
} from '@blockera/dev-cypress/js/helpers';

const PARAGRAPH_MARKUP =
	`<!-- wp:paragraph -->
<p>One</p>
<!-- /wp:paragraph -->
<!-- wp:paragraph -->
<p>Two</p>
<!-- /wp:paragraph -->
<!-- wp:paragraph -->
<p>Three</p>
<!-- /wp:paragraph -->`;

function createPostWithBlockBaseRenderDebug() {
	const testURL = Cypress.env('testURL');
	let path = '/wp-admin/post-new.php?post_type=post';

	if (
		(testURL.endsWith('/') && !path.startsWith('/')) ||
		(!testURL.endsWith('/') && path.startsWith('/'))
	) {
		path = `${testURL}${path}`;
	} else if (!testURL.endsWith('/') && !path.startsWith('/')) {
		path = `${testURL}/${path}`;
	} else if (testURL.endsWith('/') && path.startsWith('/')) {
		path = `${testURL.slice(0, -1)}${path}`;
	} else {
		path = `${testURL}${path}`;
	}

	return cy
		.visit(path, {
			onBeforeLoad(win) {
				removeScopedStorageKeys(
					win.localStorage,
					'blockeraEditorZoomPercent'
				);
				win.__BLOCKERA_BLOCK_BASE_RENDER_DEBUG__ = true;
				win.__BLOCKERA_BLOCK_BASE_RENDER_STATS__ = {
					total: 0,
					byClientId: {},
					log: [],
				};
			},
		})
		.then(() => {
			// eslint-disable-next-line
			cy.wait(2000);
			closeWelcomeGuide();
			disableGutenbergFeatures();
			setAbsoluteBlockToolbar();
			return getWPDataObject();
		});
}

function readBlockBaseRenderStats() {
	return cy.window().then((win) => win.__BLOCKERA_BLOCK_BASE_RENDER_STATS__);
}

function snapshotStats(alias) {
	return readBlockBaseRenderStats().then((stats) => {
		cy.log(
			`[BlockBase renders] ${alias} total=${stats?.total ?? 0} blocks=${
				Object.keys(stats?.byClientId || {}).length
			}`
		);
		cy.wrap(JSON.parse(JSON.stringify(stats || {}))).as(alias);
	});
}

function paragraphClientIds() {
	return cy.window().then((win) => {
		const blocks = win.wp.data
			.select('core/block-editor')
			.getBlocks()
			.filter((block) => block.name === 'core/paragraph');
		return blocks.map((block) => block.clientId);
	});
}

describe('BlockBase re-render performance', () => {
	beforeEach(() => {
		createPostWithBlockBaseRenderDebug();
		appendBlocks(PARAGRAPH_MARKUP);
		cy.getBlock('core/paragraph').first().click();
		cy.getByAriaControls('styles-view').click();
	});

	it('does not keep re-rendering every BlockBase while the editor is idle', () => {
		cy.wait(800);
		snapshotStats('idleStart');

		cy.wait(1000);
		snapshotStats('idleEnd');

		cy.get('@idleStart').then((start) => {
			cy.get('@idleEnd').then((end) => {
				const delta = (end.total || 0) - (start.total || 0);
				cy.log(`[BlockBase renders] idle delta=${delta}`);
				expect(
					delta,
					`idle BlockBase renders (${delta}) should stay near zero`
				).to.be.at.most(6);
			});
		});
	});

	it('does not re-render unselected paragraphs when the selected block is edited', () => {
		paragraphClientIds().then((ids) => {
			expect(ids).to.have.length(3);
			const selectedId = ids[0];
			const otherIds = ids.slice(1);

			cy.wait(500);
			snapshotStats('beforeEdit');

			cy.setColorControlValue('Text Color', 'aaaaaa');

			cy.wait(500);
			snapshotStats('afterEdit');

			cy.get('@beforeEdit').then((before) => {
				cy.get('@afterEdit').then((after) => {
					cy.log(
						`[BlockBase renders] selected ${selectedId}: ${
							before.byClientId?.[selectedId]?.count || 0
						} → ${after.byClientId?.[selectedId]?.count || 0}`
					);

					otherIds.forEach((id) => {
						const beforeCount = before.byClientId?.[id]?.count || 0;
						const afterCount = after.byClientId?.[id]?.count || 0;
						const delta = afterCount - beforeCount;
						cy.log(
							`[BlockBase renders] unselected ${id}: ${beforeCount} → ${afterCount} (delta ${delta})`
						);
						expect(
							delta,
							`unselected BlockBase ${id} re-rendered ${delta} times during a sibling edit`
						).to.be.at.most(2);
					});

					const selectedDelta =
						(after.byClientId?.[selectedId]?.count || 0) -
						(before.byClientId?.[selectedId]?.count || 0);
					expect(
						selectedDelta,
						`selected BlockBase re-rendered ${selectedDelta} times for one color change`
					).to.be.at.most(24);
				});
			});
		});
	});
});
