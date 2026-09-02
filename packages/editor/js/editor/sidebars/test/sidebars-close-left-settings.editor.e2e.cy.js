/**
 * Blockera dependencies
 */
import {
	createPost,
	closeWelcomeGuide,
} from '@blockera/dev-cypress/js/helpers';

const SETTINGS_LEFT_LAYOUT = {
	complementary: { dock: 'left', order: 0 },
	inserter: { dock: 'right', order: 0 },
	listView: { dock: 'right', order: 1 },
};

function persistenceDispatch(win) {
	return win.wp.data.dispatch('blockera/editor-persistence');
}

function persistenceSelect(win) {
	return win.wp.data.select('blockera/editor-persistence');
}

function parsePx(value) {
	const parsed = Number.parseFloat(value);
	return Number.isFinite(parsed) ? parsed : 0;
}

function overlayPaneWidth(skeleton) {
	const inline = parsePx(skeleton.style.width);
	if (inline > 0) {
		return inline;
	}

	const fromVar = parsePx(
		skeleton.style.getPropertyValue('--sidebar-width-raw') ||
			skeleton.style.getPropertyValue('--sidebar-width')
	);
	if (fromVar > 0) {
		return fromVar;
	}

	const fill = skeleton.querySelector('.interface-complementary-area');
	return fill?.offsetWidth ?? 0;
}

function sampleCloseFlash(doc) {
	const skeleton = doc.querySelector(
		'.interface-interface-skeleton__sidebar'
	);
	const leftHost = doc.querySelector(
		'.interface-interface-skeleton__secondary-sidebar-blockera'
	);
	const isOverlay = !!skeleton?.classList.contains(
		'blockera-complementary-overlay'
	);
	const overlayRect = isOverlay ? skeleton.getBoundingClientRect() : null;
	const fill = skeleton?.querySelector('.interface-complementary-area');
	const rightHost = doc.querySelector(
		'.interface-interface-skeleton__primary-sidebar-blockera'
	);

	return {
		isOverlay,
		clipW: leftHost?.getBoundingClientRect().width ?? 0,
		overlayLayoutW: isOverlay ? overlayPaneWidth(skeleton) : 0,
		overlayLeft: overlayRect?.left ?? 0,
		fillLayoutW: fill ? fill.offsetWidth : 0,
		nativeFlowW: isOverlay ? 0 : skeleton?.offsetWidth ?? 0,
		rightW: rightHost?.getBoundingClientRect().width ?? 0,
	};
}

describe('Closing the left dock with settings', () => {
	beforeEach(() => {
		createPost();
		closeWelcomeGuide();

		cy.get('.editor-header', { timeout: 30000 }).should('exist');

		cy.window({ timeout: 30000 }).should((win) => {
			expect(
				persistenceDispatch(win)?.setSidebarLayout,
				'layout actions'
			).to.be.a('function');
		});
	});

	it('should not flash empty settings columns when closing the left dock with the right dock open', () => {
		cy.window().then((win) => {
			const dispatch = persistenceDispatch(win);
			dispatch.setSidebarLayout(SETTINGS_LEFT_LAYOUT);
			dispatch.setDockPaneHeights('left', ['100%']);
			dispatch.setDockPaneHeights('right', ['50%', '50%']);
			dispatch.setSecondarySidebarOpen(true);
			dispatch.setPrimarySidebarOpen(true);
			win.wp.data
				.dispatch('core/interface')
				.enableComplementaryArea('core', 'edit-post/document');
		});

		cy.getByDataTest('blockera-sidebar-dock-left').should('exist');
		cy.getByDataTest('blockera-sidebar-dock-right')
			.find('[data-test="blockera-sidebar-pane-listView"]')
			.should('exist');
		cy.get(
			'.interface-interface-skeleton__sidebar.blockera-complementary-overlay .interface-complementary-area'
		).should('exist');
		cy.get(
			'.interface-interface-skeleton__secondary-sidebar-blockera'
		).should(($el) => {
			expect($el[0].getBoundingClientRect().width).to.be.greaterThan(200);
		});
		cy.get(
			'.interface-interface-skeleton__primary-sidebar-blockera'
		).should(($el) => {
			expect($el[0].getBoundingClientRect().width).to.be.greaterThan(200);
		});

		cy.window().then((win) => {
			const samples = [];
			const record = () => {
				samples.push(sampleCloseFlash(win.document));
			};

			record();
			win.__blockeraCloseFlashInterval = win.setInterval(record, 16);
			win.__blockeraCloseFlashSamples = samples;
		});

		cy.getByDataTest('blockera-secondary-sidebar-toggle').click({
			force: true,
		});

		cy.wait(450);

		cy.window().then((win) => {
			win.clearInterval(win.__blockeraCloseFlashInterval);
			win.__blockeraCloseFlashSamples.push(
				sampleCloseFlash(win.document)
			);

			const recorded = win.__blockeraCloseFlashSamples;
			const overlayWhileVisible = recorded.filter(
				(sample) => sample.isOverlay && sample.clipW > 40
			);

			expect(
				overlayWhileVisible.length,
				'settings overlay is present while the left dock is still visible'
			).to.be.greaterThan(0);

			overlayWhileVisible.forEach((sample) => {
				expect(
					sample.overlayLayoutW,
					'settings overlay keeps full pane width while the left dock clips'
				).to.be.greaterThan(200);
				expect(
					sample.overlayLeft,
					'settings overlay stays pinned to the left dock'
				).to.be.greaterThan(-20);
				expect(
					sample.fillLayoutW,
					'settings columns stay full width'
				).to.be.greaterThan(200);

				if (sample.clipW < 200) {
					expect(
						sample.overlayLayoutW,
						'settings overlay is not sized to the shrinking clip'
					).to.be.greaterThan(sample.clipW + 40);
				}
			});

			recorded.forEach((sample) => {
				expect(
					sample.nativeFlowW,
					'Gutenberg settings column stays collapsed beside the right dock'
				).to.be.lessThan(8);
				expect(sample.rightW, 'right dock stays open').to.be.greaterThan(
					200
				);
			});

			expect(persistenceSelect(win).isPrimarySidebarOpen()).to.eq(true);
			expect(persistenceSelect(win).isSecondarySidebarOpen()).to.eq(
				false
			);

			delete win.__blockeraCloseFlashInterval;
			delete win.__blockeraCloseFlashSamples;
		});
	});
});
