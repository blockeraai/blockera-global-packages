/**
 * Canvas iframe breakpoint header — Cypress e2e.
 *
 * Scenarios covered:
 * - Header is hidden on the base breakpoint (Desktop) at 100% zoom.
 * - Header appears when switching to a non-base breakpoint and shows its label.
 * - Header label updates when switching between non-base breakpoints.
 * - Close button resets to the base breakpoint, clears the header, and
 *   selects Desktop in the header breakpoint picker (not only the canvas).
 *
 * Selectors: in-iframe `.blockera-canvas-header`, `test-id="blockera-canvas-header-close"`.
 *
 * Blockera dependencies
 */
import {
	createPostClearingZoomStorage,
	setDeviceType,
} from '@blockera/dev-cypress/js/helpers';

describe('Breakpoints canvas iframe header', () => {
	const activatedClassName = 'is-active-breakpoint';

	beforeEach(() => {
		createPostClearingZoomStorage();

		// Wait for visual editor + Breakpoints header UI (same gate as other breakpoint e2es).
		cy.get('.edit-post-visual-editor', { timeout: 30000 }).should('exist');
		cy.getByDataTest('blockera-canvas-editor', { timeout: 30000 }).should(
			'be.visible'
		);
		cy.getByAriaLabel('Breakpoints').eq(0).should('be.visible');
	});

	const getCanvasHeader = () =>
		cy.getIframeBody().find('.blockera-canvas-header', { timeout: 20000 });

	const assertHeaderLabel = (label) => {
		getCanvasHeader()
			.should('be.visible')
			.find('.blockera-canvas-header__url-bar-content')
			.should('contain', label);
	};

	const assertBreakpointClass = (deviceType, isActive) => {
		cy.getByAriaLabel('Breakpoints')
			.first()
			.within(() => {
				cy.getByAriaLabel(deviceType).should(
					isActive ? 'have.class' : 'not.have.class',
					activatedClassName
				);
			});
	};

	const assertActiveBreakpoint = (deviceType) =>
		assertBreakpointClass(deviceType, true);

	const assertInactiveBreakpoint = (deviceType) =>
		assertBreakpointClass(deviceType, false);

	const closeCanvasHeader = () => {
		cy.getIframeBody()
			.find('[test-id="blockera-canvas-header-close"]', {
				timeout: 20000,
			})
			.should('be.visible')
			.click({ force: true });
	};

	const assertResetToBaseBreakpoint = (previousDeviceType) => {
		assertActiveBreakpoint('Desktop');
		assertInactiveBreakpoint(previousDeviceType);

		cy.getIframeBody().find('.blockera-canvas-header').should('not.exist');

		cy.get('iframe[name="editor-canvas"]').should(
			'have.class',
			'blockera-not-in-breakpoint'
		);
	};

	it('should hide the canvas header on the base breakpoint', () => {
		setDeviceType('Desktop');
		assertActiveBreakpoint('Desktop');

		cy.getIframeBody().find('.blockera-canvas-header').should('not.exist');
	});

	it('should show the canvas header and update its label when switching breakpoints', () => {
		setDeviceType('Tablet');
		assertActiveBreakpoint('Tablet');
		assertHeaderLabel('Tablet');

		cy.get('iframe[name="editor-canvas"]').should(
			'have.class',
			'blockera-in-breakpoint'
		);

		setDeviceType('Mobile Portrait');
		assertActiveBreakpoint('Mobile Portrait');
		assertHeaderLabel('Mobile Portrait');
	});

	it('should reset to the base breakpoint when closing the canvas header from tablet', () => {
		setDeviceType('Tablet');
		assertActiveBreakpoint('Tablet');
		assertHeaderLabel('Tablet');
		getCanvasHeader().should('not.contain', 'Zoom');

		closeCanvasHeader();
		assertResetToBaseBreakpoint('Tablet');
	});

	it('should reset the breakpoint picker when closing the canvas header from mobile', () => {
		setDeviceType('Mobile Portrait');
		assertActiveBreakpoint('Mobile Portrait');
		assertInactiveBreakpoint('Desktop');
		assertHeaderLabel('Mobile Portrait');
		getCanvasHeader().should('not.contain', 'Zoom');

		cy.get('iframe[name="editor-canvas"]').should(
			'have.class',
			'blockera-in-breakpoint'
		);

		closeCanvasHeader();
		assertResetToBaseBreakpoint('Mobile Portrait');
	});
});
