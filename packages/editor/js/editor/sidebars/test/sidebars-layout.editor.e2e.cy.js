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

const ONE_LEFT_TWO_RIGHT_LAYOUT = {
	inserter: { dock: 'left', order: 0 },
	listView: { dock: 'right', order: 0 },
	complementary: { dock: 'right', order: 1 },
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

function applyOneLeftTwoRightLayout(win) {
	applySidebarLayout(win, ONE_LEFT_TWO_RIGHT_LAYOUT, ['100%'], [
		'50%',
		'50%',
	]);
}

function startPaneDrag(sectionId) {
	cy.getByDataTest(`blockera-sidebar-pane-drag-${sectionId}`).then(
		($handle) => {
			const rect = $handle[0].getBoundingClientRect();
			cy.wrap($handle).trigger('pointerdown', {
				button: 0,
				pointerId: 1,
				clientX: rect.left + 8,
				clientY: rect.top + 8,
				force: true,
			});
		}
	);
	cy.get(`[data-test="blockera-sidebar-pane-${sectionId}"].is-floating`).should(
		'exist'
	);
}

function pointerMove(clientX, clientY) {
	cy.window().then((win) => {
		win.dispatchEvent(
			new win.PointerEvent('pointermove', {
				clientX,
				clientY,
				pointerId: 1,
				bubbles: true,
			})
		);
	});
}

function pointerUp(clientX = 0, clientY = 0) {
	cy.window().then((win) => {
		win.dispatchEvent(
			new win.PointerEvent('pointerup', {
				clientX,
				clientY,
				pointerId: 1,
				bubbles: true,
			})
		);
	});
}

function hoverDockBottom(dock) {
	cy.getByDataTest(`blockera-sidebar-dock-${dock}`).should(($dock) => {
		expect($dock[0].getBoundingClientRect().height).to.be.greaterThan(40);
	});
	cy.getByDataTest(`blockera-sidebar-dock-${dock}`).then(($dock) => {
		const rect = $dock[0].getBoundingClientRect();
		const clientX = rect.left + rect.width / 2;
		cy.window().then((win) => {
			for (let offset = 2; offset <= 16; offset += 2) {
				win.dispatchEvent(
					new win.PointerEvent('pointermove', {
						clientX,
						clientY: rect.bottom - offset,
						pointerId: 1,
						bubbles: true,
					})
				);
			}
		});
	});
}

function dropOnSlot(dock, slot) {
	const testId = `blockera-sidebar-drop-slot-${dock}-${slot}`;
	cy.getByDataTest(testId).should('exist');
	cy.getByDataTest(testId).then(($slot) => {
		const rect = $slot[0].getBoundingClientRect();
		cy.wrap({
			clientX: rect.left + rect.width / 2,
			clientY: rect.top + rect.height / 2,
		}).as('dropPoint');
	});
	cy.get('@dropPoint').then(({ clientX, clientY }) => {
		pointerMove(clientX, clientY);
	});
	cy.getByDataTest(testId).should('have.class', 'is-active');
	cy.get('@dropPoint').then(({ clientX, clientY }) => {
		pointerUp(clientX, clientY);
	});
}

function dropOnRevealedThird(dock) {
	cy.getByDataTest(`blockera-sidebar-drop-slot-${dock}-0`).should('exist');
	hoverDockBottom(dock);
	cy.getByDataTest(`blockera-sidebar-drop-slot-${dock}-2`).should('exist');
	dropOnSlot(dock, 2);
}

function dropOnDockCenter(dock) {
	cy.getByDataTest(`blockera-sidebar-dock-${dock}`).then(($dock) => {
		const rect = $dock[0].getBoundingClientRect();
		const clientX = rect.left + rect.width / 2;
		const clientY = rect.top + rect.height / 2;
		pointerMove(clientX, clientY);
		pointerUp(clientX, clientY);
	});
}

function assertSlotCount(dock, count) {
	if (count === 0) {
		cy.getByDataTest(`blockera-sidebar-drop-slot-${dock}-0`).should(
			'not.exist'
		);
		return;
	}

	for (let slot = 0; slot < count; slot++) {
		cy.getByDataTest(`blockera-sidebar-drop-slot-${dock}-${slot}`).should(
			'exist'
		);
	}

	cy.getByDataTest(`blockera-sidebar-drop-slot-${dock}-${count}`).should(
		'not.exist'
	);
}

function assertPaneOrder(dock, sectionIds) {
	cy.getByDataTest(`blockera-sidebar-dock-${dock}`)
		.find(
			'[data-test="blockera-sidebar-pane-inserter"], [data-test="blockera-sidebar-pane-listView"], [data-test="blockera-sidebar-pane-complementary"]'
		)
		.should(($panes) => {
			expect(
				[...$panes].map((el) => el.getAttribute('data-test'))
			).to.deep.equal(
				sectionIds.map((id) => `blockera-sidebar-pane-${id}`)
			);
		});
}

describe('Movable sidebar docks', () => {
	beforeEach(() => {
		createPost();
		closeWelcomeGuide();

		cy.get('.editor-header', { timeout: 30000 }).should('exist');

		cy.window({ timeout: 30000 }).should((win) => {
			expect(
				persistenceDispatch(win)?.setSidebarLayout,
				'layout actions'
			).to.be.a('function');
			applyDefaultSidebarLayout(win);
			const sel = persistenceSelect(win);
			if (sel && !sel.isSecondarySidebarOpen()) {
				win.document
					.querySelector(
						'[data-test="blockera-secondary-sidebar-toggle"]'
					)
					?.click();
			}
			win.wp.data
				.dispatch('core/interface')
				.enableComplementaryArea('core', 'edit-post/document');
			expect(
				win.document.querySelector(
					'.interface-interface-skeleton__secondary-sidebar-blockera, [data-test="blockera-secondary-sidebar-content"]'
				)
			).to.exist;
		});
	});

	it('should show one full-height slot on a one-panel source and reveal a third on a two-panel foreign dock', () => {
		startPaneDrag('complementary');

		assertSlotCount('right', 1);
		assertSlotCount('left', 2);

		hoverDockBottom('left');
		cy.getByDataTest('blockera-sidebar-drop-slot-left-2').should('exist');
		cy.getByDataTest('blockera-sidebar-drop-slot-left-2').should(
			'have.class',
			'is-active'
		);
		assertSlotCount('right', 1);

		pointerUp();
	});

	it('should keep two slots on both docks without a third when dragging list view from a two-panel source', () => {
		startPaneDrag('listView');

		assertSlotCount('left', 2);
		assertSlotCount('right', 2);

		hoverDockBottom('left');
		cy.getByDataTest('blockera-sidebar-drop-slot-left-2').should('not.exist');
		hoverDockBottom('right');
		cy.getByDataTest('blockera-sidebar-drop-slot-right-2').should(
			'not.exist'
		);

		pointerUp();
	});

	it('should keep settings content visible while dragging another panel', () => {
		startPaneDrag('listView');

		cy.get(
			'.interface-interface-skeleton__sidebar.blockera-complementary-overlay'
		).should(($sidebar) => {
			const rect = $sidebar[0].getBoundingClientRect();
			expect(rect.height).to.be.greaterThan(40);
			expect(rect.width).to.be.greaterThan(40);
		});
		cy.get(
			'.interface-interface-skeleton__sidebar.blockera-complementary-overlay .interface-complementary-area'
		).should('exist');

		pointerUp();
	});

	it('should keep right-dock drop slots and the dragged pane above settings', () => {
		startPaneDrag('listView');

		assertSlotCount('right', 2);
		cy.getByDataTest('blockera-sidebar-drop-slot-right-1').should(
			($slot) => {
				expect($slot[0].getBoundingClientRect().height).to.be.greaterThan(
					20
				);
			}
		);

		cy.get(
			'.interface-interface-skeleton__primary-sidebar-blockera'
		).should(($el) => {
			expect(getComputedStyle($el[0]).zIndex).to.equal('auto');
		});
		cy.get('[data-test="blockera-sidebar-pane-listView"].is-floating').should(
			($el) => {
				expect(getComputedStyle($el[0]).zIndex).to.equal('100000');
			}
		);

		pointerUp();
	});

	it('should show three slots on a full source dock and one full-height slot on an empty foreign dock', () => {
		cy.window().should((win) => {
			applyAllRightLayout(win);
			expect(persistenceSelect(win).getSidebarLayout().inserter.dock).to
				.equal('right');
		});
		cy.getByDataTest('blockera-sidebar-pane-drag-inserter').should('exist');

		startPaneDrag('inserter');

		assertSlotCount('right', 3);
		assertSlotCount('left', 1);
		cy.getByDataTest('blockera-sidebar-drop-slot-left-1').should('not.exist');

		hoverDockBottom('left');
		cy.getByDataTest('blockera-sidebar-drop-slot-left-1').should('not.exist');

		pointerUp();
	});

	it('should show one slot on a one-panel source and reveal a third on a two-panel foreign dock', () => {
		cy.window().should((win) => {
			applyOneLeftTwoRightLayout(win);
			expect(persistenceSelect(win).getSidebarLayout().listView.dock).to
				.equal('right');
		});
		cy.getByDataTest('blockera-sidebar-pane-drag-inserter').should('exist');

		startPaneDrag('inserter');

		assertSlotCount('left', 1);
		assertSlotCount('right', 2);

		hoverDockBottom('right');
		cy.getByDataTest('blockera-sidebar-drop-slot-right-2').should('exist');

		pointerUp();
	});

	it('should match source drop slot heights to resized panes on a two-panel dock', () => {
		cy.window().then((win) => {
			persistenceDispatch(win).setDockPaneHeights('left', [
				'70%',
				'30%',
			]);
		});

		startPaneDrag('inserter');

		cy.getByDataTest('blockera-sidebar-drop-slot-left-0').should('exist');
		cy.getByDataTest('blockera-sidebar-drop-slot-left-2').should(
			'not.exist'
		);

		cy.getByDataTest('blockera-sidebar-dock-left').then(($dock) => {
			const dockHeight = $dock[0].getBoundingClientRect().height;
			const gap = 4;
			const available = dockHeight - gap;
			cy.getByDataTest('blockera-sidebar-drop-slot-left-0').should(
				($slot) => {
					expect($slot[0].getBoundingClientRect().height).to.be.closeTo(
						available * 0.7,
						4
					);
				}
			);
			cy.getByDataTest('blockera-sidebar-drop-slot-left-1').should(
				($slot) => {
					expect($slot[0].getBoundingClientRect().height).to.be.closeTo(
						available * 0.3,
						4
					);
				}
			);
		});

		pointerUp();
	});

	it('should keep the remaining pane in place when a stacked panel is dragged', () => {
		cy.window().then((win) => {
			persistenceDispatch(win).setDockPaneHeights('left', [
				'70%',
				'30%',
			]);
		});

		cy.getByDataTest('blockera-sidebar-dock-left').then(($dock) => {
			const available =
				$dock[0].getBoundingClientRect().height - 4;
			cy.getByDataTest('blockera-sidebar-pane-listView').should(
				($pane) => {
					expect(
						$pane[0].getBoundingClientRect().height
					).to.be.closeTo(available * 0.3, 12);
				}
			);
		});

		cy.getByDataTest('blockera-sidebar-pane-listView').then(($pane) => {
			cy.wrap($pane[0].getBoundingClientRect().top).as('listViewTop');
		});

		startPaneDrag('inserter');

		cy.get('@listViewTop').then((top) => {
			cy.getByDataTest('blockera-sidebar-pane-listView').should(
				($pane) => {
					expect($pane[0].getBoundingClientRect().top).to.be.closeTo(
						Number(top),
						6
					);
				}
			);
		});

		pointerUp();
	});

	it('should match drop slot heights to resized panes when two panels remain', () => {
		cy.window().then((win) => {
			persistenceDispatch(win).setDockPaneHeights('left', [
				'70%',
				'30%',
			]);
		});

		startPaneDrag('complementary');

		cy.getByDataTest('blockera-sidebar-drop-slot-left-0').should('exist');
		cy.getByDataTest('blockera-sidebar-drop-slot-left-2').should('not.exist');

		cy.getByDataTest('blockera-sidebar-dock-left').then(($dock) => {
			const dockHeight = $dock[0].getBoundingClientRect().height;
			const gap = 4;
			const available = dockHeight - gap;
			cy.getByDataTest('blockera-sidebar-drop-slot-left-0').should(
				($slot) => {
					expect($slot[0].getBoundingClientRect().height).to.be.closeTo(
						available * 0.7,
						4
					);
				}
			);
			cy.getByDataTest('blockera-sidebar-drop-slot-left-1').should(
				($slot) => {
					expect($slot[0].getBoundingClientRect().height).to.be.closeTo(
						available * 0.3,
						4
					);
				}
			);
			cy.getByDataTest('blockera-sidebar-drop-slot-left-1').then(
				($second) => {
					cy.getByDataTest('blockera-sidebar-drop-slot-left-0').should(
						($first) => {
							expect(
								$second[0].getBoundingClientRect().top -
									$first[0].getBoundingClientRect().bottom
							).to.be.closeTo(4, 2);
						}
					);
				}
			);
		});

		pointerUp();
	});

	it('should drop list view onto right slot 0 above settings', () => {
		startPaneDrag('listView');
		assertSlotCount('right', 2);
		dropOnSlot('right', 0);
		assertPaneOrder('right', ['listView', 'complementary']);
	});

	it('should drop list view onto right slot 1 below settings', () => {
		startPaneDrag('listView');
		dropOnSlot('right', 1);
		assertPaneOrder('right', ['complementary', 'listView']);
	});

	it('should drop settings onto left slot 0', () => {
		startPaneDrag('complementary');
		dropOnSlot('left', 0);
		assertPaneOrder('left', ['complementary', 'inserter', 'listView']);
	});

	it('should drop settings onto left slot 1', () => {
		startPaneDrag('complementary');
		dropOnSlot('left', 1);
		assertPaneOrder('left', ['inserter', 'complementary', 'listView']);
	});

	it('should drop settings onto the revealed third slot on the left', () => {
		startPaneDrag('complementary');
		dropOnRevealedThird('left');
		assertPaneOrder('left', ['inserter', 'listView', 'complementary']);
	});

	it('should drop inserter onto an empty left dock as a single panel', () => {
		cy.window().should((win) => {
			applyAllRightLayout(win);
			expect(persistenceSelect(win).getSidebarLayout().inserter.dock).to
				.equal('right');
		});
		cy.getByDataTest('blockera-sidebar-pane-drag-inserter').should('exist');

		startPaneDrag('inserter');
		assertSlotCount('left', 1);
		dropOnDockCenter('left');
		assertPaneOrder('left', ['inserter']);
		assertPaneOrder('right', ['complementary', 'listView']);
	});

	it('should reorder a three-panel source dock onto slot 0', () => {
		cy.window().should((win) => {
			applyAllRightLayout(win);
			expect(persistenceSelect(win).getSidebarLayout().listView.dock).to
				.equal('right');
		});
		cy.getByDataTest('blockera-sidebar-pane-drag-listView').should('exist');

		startPaneDrag('listView');
		assertSlotCount('right', 3);
		dropOnSlot('right', 0);
		assertPaneOrder('right', ['listView', 'complementary', 'inserter']);
	});

	it('should swap a three-panel source dock onto slot 2', () => {
		cy.window().should((win) => {
			applyAllRightLayout(win);
			expect(persistenceSelect(win).getSidebarLayout().inserter.order).to
				.equal(0);
		});
		cy.getByDataTest('blockera-sidebar-pane-drag-inserter').should('exist');

		startPaneDrag('inserter');
		dropOnSlot('right', 2);
		assertPaneOrder('right', ['listView', 'complementary', 'inserter']);
	});

	it('should drop inserter onto the revealed third slot of a two-panel right dock', () => {
		cy.window().should((win) => {
			applyOneLeftTwoRightLayout(win);
			expect(persistenceSelect(win).getSidebarLayout().inserter.dock).to
				.equal('left');
		});
		cy.getByDataTest('blockera-sidebar-pane-drag-inserter').should('exist');

		startPaneDrag('inserter');
		dropOnRevealedThird('right');
		assertPaneOrder('right', ['listView', 'complementary', 'inserter']);
	});

	it('should keep the default left inserter + list view and right settings dock', () => {
		cy.getByDataTest('blockera-sidebar-dock-left')
			.find('[data-test="blockera-sidebar-pane-inserter"]')
			.should('exist');
		cy.getByDataTest('blockera-sidebar-dock-left')
			.find('[data-test="blockera-sidebar-pane-listView"]')
			.should('exist');
		cy.getByDataTest('blockera-sidebar-dock-right')
			.find('[data-test="blockera-sidebar-pane-complementary"]')
			.should('exist');
		cy.get(
			'.editor-sidebar__panel-tabs [data-test="blockera-sidebar-pane-drag-complementary"]'
		)
			.should('be.visible')
			.and(($handle) => {
				expect($handle[0].getBoundingClientRect().width).to.be.greaterThan(
					8
				);
			});
	});

	it('should keep the settings drag handle in the tab bar after switching tabs', () => {
		cy.get(
			'.editor-sidebar__panel-tabs [data-test="blockera-sidebar-pane-drag-complementary"]'
		).should('be.visible');

		cy.window().then((win) => {
			const block = win.wp.blocks.createBlock('core/paragraph', {
				content: 'Settings handle tabs',
			});
			win.wp.data.dispatch('core/block-editor').insertBlock(block);
			win.wp.data.dispatch('core/block-editor').selectBlock(block.clientId);
			win.wp.data
				.dispatch('core/interface')
				.enableComplementaryArea('core', 'edit-post/block');
		});

		cy.get(
			'.editor-sidebar__panel-tabs [data-test="blockera-sidebar-pane-drag-complementary"]'
		).should('be.visible');

		cy.window().then((win) => {
			win.wp.data
				.dispatch('core/interface')
				.enableComplementaryArea('core', 'edit-post/document');
		});

		cy.get(
			'.editor-sidebar__panel-tabs [data-test="blockera-sidebar-pane-drag-complementary"]'
		).should('be.visible');
	});

	it('should split the right dock when list view is moved above settings', () => {
		cy.window().should((win) => {
			persistenceDispatch(win).moveSidebarSection('listView', 'right', 0);
			const layout = persistenceSelect(win).getSidebarLayout();
			expect(layout.listView).to.deep.include({
				dock: 'right',
				order: 0,
			});
			expect(layout.complementary).to.deep.include({
				dock: 'right',
				order: 1,
			});
		});

		cy.getByDataTest('blockera-sidebar-dock-right')
			.find('[data-test="blockera-sidebar-pane-listView"]')
			.should('exist');
		cy.getByDataTest('blockera-sidebar-dock-right')
			.find('[data-test="blockera-sidebar-pane-complementary"]')
			.should('exist');
		cy.getByDataTest('blockera-sidebar-pane-split-0').should('exist');
		cy.getByDataTest('blockera-sidebar-dock-left')
			.find('[data-test="blockera-sidebar-pane-inserter"]')
			.should('exist');
		cy.getByDataTest('blockera-sidebar-dock-left')
			.find('[data-test="blockera-sidebar-pane-listView"]')
			.should('not.exist');
	});

	it('should place list view below settings when insert index is 1', () => {
		cy.window().should((win) => {
			persistenceDispatch(win).moveSidebarSection('listView', 'right', 1);
			const layout = persistenceSelect(win).getSidebarLayout();
			expect(layout.listView).to.deep.include({
				dock: 'right',
				order: 1,
			});
			expect(layout.complementary).to.deep.include({
				dock: 'right',
				order: 0,
			});
		});

		cy.getByDataTest('blockera-sidebar-dock-right').within(() => {
			cy.get(
				'[data-test="blockera-sidebar-pane-complementary"], [data-test="blockera-sidebar-pane-listView"]'
			).should(($panes) => {
				const ids = [...$panes].map((el) =>
					el.getAttribute('data-test')
				);
				expect(ids).to.deep.equal([
					'blockera-sidebar-pane-complementary',
					'blockera-sidebar-pane-listView',
				]);
			});
		});
	});

	it('should stack all three sections in the right dock', () => {
		cy.window().should((win) => {
			const dispatch = persistenceDispatch(win);
			dispatch.moveSidebarSection('listView', 'right', 1);
			dispatch.moveSidebarSection('inserter', 'right', 0);
			const layout = persistenceSelect(win).getSidebarLayout();
			expect(layout.inserter).to.deep.include({
				dock: 'right',
				order: 0,
			});
			expect(layout.complementary).to.deep.include({
				dock: 'right',
				order: 1,
			});
			expect(layout.listView).to.deep.include({
				dock: 'right',
				order: 2,
			});
		});

		cy.getByDataTest('blockera-sidebar-dock-right').within(() => {
			cy.get('[data-test="blockera-sidebar-pane-inserter"]').should(
				'exist'
			);
			cy.get('[data-test="blockera-sidebar-pane-listView"]').should(
				'exist'
			);
			cy.get('[data-test="blockera-sidebar-pane-complementary"]').should(
				'exist'
			);
			cy.getByDataTest('blockera-sidebar-pane-split-0').should('exist');
			cy.getByDataTest('blockera-sidebar-pane-split-1').should('exist');
		});
		cy.getByDataTest('blockera-sidebar-dock-left').should('not.exist');
	});

	it('should keep layout updates far below pointer moves while dragging', () => {
		startPaneDrag('listView');
		cy.getByDataTest('blockera-sidebar-dock-left').then(($dock) => {
			const rect = $dock[0].getBoundingClientRect();
			const x = rect.left + rect.width / 2;
			const startY = rect.top + 24;
			for (let i = 0; i < 20; i++) {
				pointerMove(x, startY + i);
			}
		});
		pointerUp();
		cy.window().should((win) => {
			const snap = win.__BLOCKERA_SIDEBAR_PERF__;
			expect(snap, 'perf snapshot').to.exist;
			expect(snap.pointerMoves).to.be.at.least(15);
			expect(snap.layoutNotifies).to.be.lessThan(snap.pointerMoves);
			expect(
				snap.dockRenders.left + snap.dockRenders.right
			).to.be.lessThan(snap.pointerMoves);
			expect(snap.actions.map((action) => action.name)).to.include.members(
				['start', 'drop']
			);
		});
	});

	it('should ease a panel back when dropped outside placeholders', () => {
		startPaneDrag('listView');
		cy.get('[data-test="blockera-sidebar-pane-listView"].is-floating').should(
			'exist'
		);
		cy.get('.interface-interface-skeleton__content').then(($canvas) => {
			const rect = $canvas[0].getBoundingClientRect();
			const clientX = rect.left + rect.width / 2;
			const clientY = rect.top + rect.height / 2;
			pointerMove(clientX, clientY);
			pointerUp(clientX, clientY);
		});
		cy.get('[data-test="blockera-sidebar-pane-listView"].is-returning').should(
			'exist'
		);
		cy.get('[data-test="blockera-sidebar-pane-listView"].is-floating', {
			timeout: 2000,
		}).should('not.exist');
		cy.getByDataTest('blockera-sidebar-dock-left')
			.find('[data-test="blockera-sidebar-pane-listView"]')
			.should('exist');
		cy.window().should((win) => {
			expect(
				persistenceSelect(win).getSidebarLayout().listView
			).to.deep.include({
				dock: 'left',
				order: 1,
			});
		});
	});

	it('should open the physical right dock from the header when settings is on the left', () => {
		cy.window().then((win) => {
			applySidebarLayout(
				win,
				{
					complementary: { dock: 'left', order: 0 },
					inserter: { dock: 'right', order: 0 },
					listView: { dock: 'right', order: 1 },
				},
				['100%'],
				['50%', '50%']
			);
			win.wp.data
				.dispatch('blockera/editor-persistence')
				.setSecondarySidebarOpen(false);
			win.wp.data
				.dispatch('blockera/editor-persistence')
				.setPrimarySidebarOpen(false);
		});

		cy.getByDataTest('blockera-primary-sidebar-toggle').click({
			force: true,
		});

		cy.window().should((win) => {
			const sel = persistenceSelect(win);
			expect(sel.isPrimarySidebarOpen()).to.eq(true);
			expect(sel.isSecondarySidebarOpen()).to.eq(false);
		});
		cy.getByDataTest('blockera-sidebar-dock-right')
			.find('[data-test="blockera-sidebar-pane-inserter"]')
			.should('exist');
		cy.getByDataTest('blockera-sidebar-dock-left').should('not.exist');
	});

	it('should close the right dock when the blocks panel close button is used there', () => {
		cy.window().then((win) => {
			applyAllRightLayout(win);
			win.wp.data
				.dispatch('blockera/editor-persistence')
				.setSecondarySidebarOpen(false);
			win.wp.data
				.dispatch('blockera/editor-persistence')
				.setPrimarySidebarOpen(true);
			win.wp.data
				.dispatch('core/interface')
				.enableComplementaryArea('core', 'edit-post/document');
		});

		cy.getByDataTest('blockera-sidebar-dock-right').should('exist');
		cy.get(
			'.blockera-combined-sidebar__inserter .block-editor-tabbed-sidebar__close-button'
		).click({ force: true });

		cy.window().should((win) => {
			expect(persistenceSelect(win).isPrimarySidebarOpen()).to.eq(false);
		});
		cy.getByDataTest('blockera-primary-sidebar-content').should(
			'have.class',
			'is-hidden'
		);
	});

	it('should open the dock that currently hosts blocks when Gutenberg opens the inserter', () => {
		cy.window().then((win) => {
			applyAllRightLayout(win);
			win.wp.data
				.dispatch('blockera/editor-persistence')
				.setSecondarySidebarOpen(false);
			win.wp.data
				.dispatch('blockera/editor-persistence')
				.setPrimarySidebarOpen(false);
			win.wp.data.dispatch('core/editor').setIsInserterOpened(true);
		});

		cy.window().should((win) => {
			expect(persistenceSelect(win).isPrimarySidebarOpen()).to.eq(true);
			expect(persistenceSelect(win).isSecondarySidebarOpen()).to.eq(
				false
			);
			expect(win.wp.data.select('core/editor').isInserterOpened()).to.eq(
				false
			);
		});
		cy.getByDataTest('blockera-sidebar-dock-right')
			.find('[data-test="blockera-sidebar-pane-inserter"]')
			.should('exist');
	});

	it('should open the dock that currently hosts settings when complementary area is enabled', () => {
		cy.window().then((win) => {
			applySidebarLayout(
				win,
				{
					complementary: { dock: 'left', order: 0 },
					inserter: { dock: 'right', order: 0 },
					listView: { dock: 'right', order: 1 },
				},
				['100%'],
				['50%', '50%']
			);
			win.wp.data
				.dispatch('core/interface')
				.disableComplementaryArea('core');
			win.wp.data
				.dispatch('blockera/editor-persistence')
				.setSecondarySidebarOpen(false);
			win.wp.data
				.dispatch('blockera/editor-persistence')
				.setPrimarySidebarOpen(false);
		});

		cy.window().should((win) => {
			expect(
				win.wp.data
					.select('core/interface')
					.getActiveComplementaryArea('core') ?? null
			).to.eq(null);
			expect(persistenceSelect(win).isSecondarySidebarOpen()).to.eq(
				false
			);
		});

		cy.window().then((win) => {
			win.wp.data
				.dispatch('core/interface')
				.enableComplementaryArea('core', 'edit-post/document');
		});

		cy.window().should((win) => {
			expect(persistenceSelect(win).isSecondarySidebarOpen()).to.eq(true);
			expect(persistenceSelect(win).isPrimarySidebarOpen()).to.eq(false);
		});
		cy.getByDataTest('blockera-sidebar-dock-left')
			.find('[data-test="blockera-sidebar-pane-complementary"]')
			.should('exist');
	});

	afterEach(() => {
		cy.window().then((win) => {
			if (win.document.querySelector('.blockera-sidebar-pane.is-floating')) {
				win.dispatchEvent(
					new win.PointerEvent('pointerup', {
						clientX: 0,
						clientY: 0,
						pointerId: 1,
						bubbles: true,
					})
				);
			}
		});
		cy.get('.blockera-sidebar-pane.is-floating', { timeout: 4000 }).should(
			'not.exist'
		);
		cy.window().then((win) => {
			if (!win.wp?.data?.dispatch) {
				return;
			}
			const dispatch = persistenceDispatch(win);
			if (dispatch?.setSidebarLayout) {
				applyDefaultSidebarLayout(win);
			}
		});
	});
});
