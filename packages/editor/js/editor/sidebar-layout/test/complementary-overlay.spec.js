/**
 * Internal dependencies
 */
import {
	complementaryOverlayGeometry,
	findComplementaryHandleHost,
	isSlideHostOpening,
	overlayContentClassTokens,
	overlayHostClassTokens,
	paneShareFromHeights,
	shouldMeasureComplementaryOverlay,
	shouldPinComplementaryOverlayToRightEdge,
	shouldSyncOverlayFromHostResize,
	shouldSyncOverlayFromPaneShare,
	shouldWriteComplementaryOverlay,
	strongerOverlaySyncReason,
} from '../useComplementaryOverlay';

describe('complementary overlay host', () => {
	afterEach(() => {
		document.body.innerHTML = '';
	});

	it('prefers the editor settings tab bar over the panel body', () => {
		document.body.innerHTML = `
			<div class="interface-interface-skeleton__sidebar">
				<div class="editor-sidebar__panel-tabs"></div>
				<div class="components-panel"></div>
			</div>
		`;

		expect(findComplementaryHandleHost()?.className).toBe(
			'editor-sidebar__panel-tabs'
		);
	});

	it('falls back to the widgets settings tab bar', () => {
		document.body.innerHTML = `
			<div class="interface-interface-skeleton__sidebar">
				<div class="edit-widgets-sidebar__panel-tabs"></div>
			</div>
		`;

		expect(findComplementaryHandleHost()?.className).toBe(
			'edit-widgets-sidebar__panel-tabs'
		);
	});
});

describe('shouldSyncOverlayFromHostResize', () => {
	it('syncs while the dock clip is animating even if width is unchanged', () => {
		expect(shouldSyncOverlayFromHostResize(300, 300, true)).toBe(true);
	});

	it('syncs the first observation before a width has been recorded', () => {
		expect(shouldSyncOverlayFromHostResize(Number.NaN, 300, false)).toBe(
			true
		);
	});

	it('skips canvas height ticks that do not change dock width', () => {
		expect(shouldSyncOverlayFromHostResize(300, 300, false)).toBe(false);
		expect(shouldSyncOverlayFromHostResize(300, 300.2, false)).toBe(false);
	});

	it('syncs when the dock width changes for open/close or category columns', () => {
		expect(shouldSyncOverlayFromHostResize(300, 580, false)).toBe(true);
	});
});

describe('shouldWriteComplementaryOverlay', () => {
	const docked = {
		top: 80,
		left: 900,
		width: 300,
		height: 500,
		clipPath: '',
	};

	it('skips docked idle updates that only change inspector height', () => {
		expect(
			shouldWriteComplementaryOverlay(false, false, docked, {
				...docked,
				height: 720,
			})
		).toBe(false);
	});

	it('skips docked idle clip ticks that come from height', () => {
		expect(
			shouldWriteComplementaryOverlay(false, false, docked, {
				...docked,
				height: 720,
				clipPath: 'inset(0px 0px 20px 0px)',
			})
		).toBe(false);
	});

	it('clears leftover slide clip once after the dock finishes opening', () => {
		expect(
			shouldWriteComplementaryOverlay(false, false, {
				...docked,
				clipPath: 'inset(0px 180px 0px 0px)',
			}, docked)
		).toBe(true);
	});

	it('writes while the dock clip is animating even if size is unchanged', () => {
		expect(
			shouldWriteComplementaryOverlay(true, false, docked, docked)
		).toBe(false);
		expect(
			shouldWriteComplementaryOverlay(true, false, docked, {
				...docked,
				left: 720,
			})
		).toBe(true);
	});

	it('writes floating pane height and position', () => {
		expect(
			shouldWriteComplementaryOverlay(false, true, docked, {
				...docked,
				height: 480,
			})
		).toBe(true);
	});

	it('writes docked pane-stack updates that only change overlay height', () => {
		expect(
			shouldWriteComplementaryOverlay(
				false,
				false,
				docked,
				{
					...docked,
					height: 250,
				},
				0.5,
				'pane-stack'
			)
		).toBe(true);
	});

	it('writes docked idle updates when the overlay width or left changes', () => {
		expect(
			shouldWriteComplementaryOverlay(false, false, docked, {
				...docked,
				width: 580,
			})
		).toBe(true);
		expect(
			shouldWriteComplementaryOverlay(false, false, docked, {
				...docked,
				left: 620,
			})
		).toBe(true);
	});
});

describe('shouldMeasureComplementaryOverlay', () => {
	it('skips layout reads on idle Global Styles ticks after the first layout', () => {
		expect(
			shouldMeasureComplementaryOverlay(
				false,
				false,
				true,
				false,
				'idle'
			)
		).toBe(false);
	});

	it('measures the first layout, leftover clip, slide, drag, width, viewport, inserter, and class ticks', () => {
		expect(
			shouldMeasureComplementaryOverlay(
				false,
				false,
				false,
				false,
				'idle'
			)
		).toBe(true);
		expect(
			shouldMeasureComplementaryOverlay(
				false,
				false,
				true,
				true,
				'idle'
			)
		).toBe(true);
		expect(
			shouldMeasureComplementaryOverlay(
				true,
				false,
				true,
				false,
				'idle'
			)
		).toBe(true);
		expect(
			shouldMeasureComplementaryOverlay(
				false,
				true,
				true,
				false,
				'idle'
			)
		).toBe(true);
		expect(
			shouldMeasureComplementaryOverlay(
				false,
				false,
				true,
				false,
				'resize-width'
			)
		).toBe(true);
		expect(
			shouldMeasureComplementaryOverlay(
				false,
				false,
				true,
				false,
				'window-resize'
			)
		).toBe(true);
		expect(
			shouldMeasureComplementaryOverlay(
				false,
				false,
				true,
				false,
				'inserter'
			)
		).toBe(true);
		expect(
			shouldMeasureComplementaryOverlay(
				false,
				false,
				true,
				false,
				'class'
			)
		).toBe(true);
		expect(
			shouldMeasureComplementaryOverlay(
				false,
				false,
				true,
				false,
				'drag'
			)
		).toBe(true);
		expect(
			shouldMeasureComplementaryOverlay(
				false,
				false,
				true,
				false,
				'pane-stack'
			)
		).toBe(true);
	});
});

describe('overlay class tokens and sync reason rank', () => {
	it('ignores inspector class names that are not open, close, or resize', () => {
		expect(
			overlayHostClassTokens(
				'interface-interface-skeleton__primary-sidebar-blockera extra'
			)
		).toBe('');
		expect(
			overlayHostClassTokens(
				'interface-interface-skeleton__primary-sidebar-blockera is-resizing'
			)
		).toBe('is-resizing');
		expect(
			overlayContentClassTokens(
				'blockera-primary-sidebar-content is-visible wp-something'
			)
		).toBe('is-visible');
		expect(
			overlayContentClassTokens(
				'blockera-primary-sidebar-content is-hidden'
			)
		).toBe('is-hidden');
	});

	it('keeps a width or drag tick when coalesced with an idle inspector frame', () => {
		expect(strongerOverlaySyncReason('idle', 'resize-width')).toBe(
			'resize-width'
		);
		expect(strongerOverlaySyncReason('resize-width', 'idle')).toBe(
			'resize-width'
		);
		expect(strongerOverlaySyncReason('drag', 'slide')).toBe('slide');
		expect(strongerOverlaySyncReason('resize-width', 'pane-stack')).toBe(
			'pane-stack'
		);
	});
});

describe('pane share of the settings dock', () => {
	it('is the pane height divided by the dock height', () => {
		expect(paneShareFromHeights(250, 500)).toBe(0.5);
		expect(paneShareFromHeights(500, 0)).toBeNaN();
	});

	it('syncs when stacking changes the pane share, not when the whole dock grows', () => {
		expect(shouldSyncOverlayFromPaneShare(1, 0.5)).toBe(true);
		expect(shouldSyncOverlayFromPaneShare(0.5, 0.5)).toBe(false);
		expect(shouldSyncOverlayFromPaneShare(0.5, 0.51)).toBe(false);
		expect(shouldSyncOverlayFromPaneShare(Number.NaN, 0.5)).toBe(false);
	});
});

describe('isSlideHostOpening', () => {
	afterEach(() => {
		document.body.innerHTML = '';
		jest.restoreAllMocks();
	});

	it('returns false for a null host', () => {
		expect(isSlideHostOpening(null)).toBe(false);
	});

	it('returns true when inner content is still hidden', () => {
		document.body.innerHTML = `
			<div class="interface-interface-skeleton__primary-sidebar-blockera" style="--sidebar-width: 300px">
				<div class="blockera-primary-sidebar-content is-hidden"></div>
			</div>
		`;

		const host = document.querySelector(
			'.interface-interface-skeleton__primary-sidebar-blockera'
		);

		expect(isSlideHostOpening(host)).toBe(true);
	});

	it('returns true when the host clip is narrower than its target width', () => {
		document.body.innerHTML = `
			<div class="interface-interface-skeleton__primary-sidebar-blockera" style="--sidebar-width: 300px">
				<div class="blockera-primary-sidebar-content is-visible"></div>
			</div>
		`;

		const host = document.querySelector(
			'.interface-interface-skeleton__primary-sidebar-blockera'
		);
		jest.spyOn(host, 'getBoundingClientRect').mockReturnValue({
			width: 120,
			height: 800,
			top: 0,
			left: 0,
			right: 120,
			bottom: 800,
			x: 0,
			y: 0,
			toJSON: () => ({}),
		});

		expect(isSlideHostOpening(host)).toBe(true);
	});

	it('returns false when the host clip has reached its target width', () => {
		document.body.innerHTML = `
			<div class="interface-interface-skeleton__primary-sidebar-blockera" style="--sidebar-width: 300px">
				<div class="blockera-primary-sidebar-content is-visible"></div>
			</div>
		`;

		const host = document.querySelector(
			'.interface-interface-skeleton__primary-sidebar-blockera'
		);
		jest.spyOn(host, 'getBoundingClientRect').mockReturnValue({
			width: 300,
			height: 800,
			top: 0,
			left: 0,
			right: 300,
			bottom: 800,
			x: 0,
			y: 0,
			toJSON: () => ({}),
		});

		expect(isSlideHostOpening(host)).toBe(false);
	});
});

describe('complementary overlay geometry', () => {
	it('pins overlay left to the slide host while the pane is docked', () => {
		const anchor = document.createElement('div');
		const overlay = complementaryOverlayGeometry(
			anchor,
			new DOMRect(400, 80, 300, 500),
			new DOMRect(900, 0, 300, 800)
		);

		expect(overlay.overlayBox.left).toBe(900);
		expect(overlay.overlayBox.top).toBe(80);
		expect(overlay.overlayBox.width).toBe(300);
		expect(overlay.overlayBox.height).toBe(500);
	});

	it('follows the floating pane on both axes and drops dock clip', () => {
		const anchor = document.createElement('div');
		anchor.classList.add('is-floating');
		const overlay = complementaryOverlayGeometry(
			anchor,
			new DOMRect(240, 120, 300, 480),
			new DOMRect(900, 0, 300, 800)
		);

		expect(overlay.overlayBox.left).toBe(240);
		expect(overlay.overlayBox.top).toBe(120);
		expect(overlay.overlayBox.width).toBe(300);
		expect(overlay.overlayBox.height).toBe(480);
		expect(overlay.clipPath).toBe('');
	});
});

describe('shouldPinComplementaryOverlayToRightEdge', () => {
	it('pins docked settings on the right dock', () => {
		expect(shouldPinComplementaryOverlayToRightEdge(false, 'right')).toBe(
			true
		);
	});

	it('does not pin a floating pane from the right dock', () => {
		expect(shouldPinComplementaryOverlayToRightEdge(true, 'right')).toBe(
			false
		);
	});

	it('does not pin the left dock', () => {
		expect(shouldPinComplementaryOverlayToRightEdge(false, 'left')).toBe(
			false
		);
	});
});
