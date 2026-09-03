/**
 * Internal dependencies
 */
import {
	findComplementaryHandleHost,
	isSlideHostOpening,
	shouldSyncOverlayFromHostResize,
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
