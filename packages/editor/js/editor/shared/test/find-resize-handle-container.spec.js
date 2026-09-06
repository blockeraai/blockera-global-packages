/**
 * Internal dependencies
 */
import {
	findResizeHandleContainer,
	readHorizontalSidebarStartWidth,
	setSidebarResizingClass,
} from '../find-resize-handle-container';

describe('findResizeHandleContainer', () => {
	afterEach(() => {
		document.body.innerHTML = '';
		document.body.style.removeProperty('--blockera-primary-sidebar-width');
		document.body.style.removeProperty('--blockera-secondary-sidebar-width');
	});

	it('portals the primary (right dock) handle into the complementary overlay', () => {
		document.body.innerHTML = `
			<div class="blockera-primary-sidebar-content"></div>
			<div
				class="interface-interface-skeleton__sidebar blockera-complementary-overlay"
				data-blockera-overlay-dock="right"
			></div>
		`;

		expect(findResizeHandleContainer('left')?.classList.contains(
			'blockera-complementary-overlay'
		)).toBe(true);
	});

	it('uses the complementary overlay for the right dock when overlay dock is not set yet', () => {
		document.body.innerHTML = `
			<div class="blockera-primary-sidebar-content"></div>
			<div class="interface-interface-skeleton__sidebar blockera-complementary-overlay"></div>
		`;

		expect(
			findResizeHandleContainer('left')?.classList.contains(
				'blockera-complementary-overlay'
			)
		).toBe(true);
	});
	it('keeps the primary handle on dock content when settings overlay is on the left', () => {
		document.body.innerHTML = `
			<div class="blockera-primary-sidebar-content"></div>
			<div
				class="interface-interface-skeleton__sidebar blockera-complementary-overlay"
				data-blockera-overlay-dock="left"
			></div>
		`;

		expect(findResizeHandleContainer('left')?.className).toBe(
			'blockera-primary-sidebar-content'
		);
	});

	it('portals the secondary (left dock) handle into a left settings overlay', () => {
		document.body.innerHTML = `
			<div class="blockera-secondary-sidebar-content"></div>
			<div
				class="interface-interface-skeleton__sidebar blockera-complementary-overlay"
				data-blockera-overlay-dock="left"
			></div>
		`;

		expect(findResizeHandleContainer('right')?.classList.contains(
			'blockera-complementary-overlay'
		)).toBe(true);
	});
});

describe('readHorizontalSidebarStartWidth', () => {
	afterEach(() => {
		document.body.innerHTML = '';
		document.body.style.removeProperty('--blockera-primary-sidebar-width');
	});

	it('prefers the persisted body CSS variable over overlay inline width', () => {
		document.body.style.setProperty(
			'--blockera-primary-sidebar-width',
			'420px'
		);
		const container = document.createElement('div');
		container.style.setProperty('--sidebar-width-raw', '300px');
		document.body.appendChild(container);

		expect(readHorizontalSidebarStartWidth('left', container)).toBe(420);
	});
});

describe('setSidebarResizingClass', () => {
	afterEach(() => {
		document.body.innerHTML = '';
	});

	it('marks the slide host so dock width transitions stay off during drag', () => {
		document.body.innerHTML = `
			<div class="interface-interface-skeleton__primary-sidebar-blockera"></div>
			<div class="interface-interface-skeleton__sidebar blockera-complementary-overlay">
				<div class="interface-complementary-area__fill">
					<div class="interface-complementary-area"></div>
				</div>
			</div>
		`;
		const overlay = document.querySelector(
			'.blockera-complementary-overlay'
		);

		setSidebarResizingClass('left', overlay, true);

		expect(
			document.querySelector(
				'.interface-interface-skeleton__primary-sidebar-blockera'
			)?.classList.contains('is-resizing')
		).toBe(true);
		expect(overlay?.classList.contains('is-resizing')).toBe(true);

		setSidebarResizingClass('left', overlay, false);

		expect(
			document.querySelector(
				'.interface-interface-skeleton__primary-sidebar-blockera'
			)?.classList.contains('is-resizing')
		).toBe(false);
	});
});
