export type ResizeHandleSide = 'left' | 'right' | 'top';

const OVERLAY_SELECTOR =
	'.interface-interface-skeleton__sidebar.blockera-complementary-overlay';
const PRIMARY_CONTENT_SELECTOR = '.blockera-primary-sidebar-content';
const SECONDARY_CONTENT_SELECTOR = '.blockera-secondary-sidebar-content';
const PRIMARY_SLIDE_HOST_SELECTOR =
	'.interface-interface-skeleton__primary-sidebar-blockera';
const SECONDARY_SLIDE_HOST_SELECTOR =
	'.interface-interface-skeleton__secondary-sidebar-blockera';
const CORE_SIDEBAR_SELECTOR = '.interface-interface-skeleton__sidebar';
const LIST_VIEW_SELECTOR = '.blockera-combined-sidebar__list-view';

/**
 * Gutenberg's complementary overlay is position:fixed above the Blockera dock.
 * Portaling the width handle into that overlay keeps it hittable.
 */
export function findComplementaryOverlay(
	dock?: 'left' | 'right'
): HTMLElement | null {
	const overlay = document.querySelector(OVERLAY_SELECTOR) as HTMLElement | null;
	if (!overlay) {
		return null;
	}

	if (!dock) {
		return overlay;
	}

	const overlayDock = overlay.dataset.blockeraOverlayDock;
	if (!overlayDock) {
		return dock === 'right' ? overlay : null;
	}

	return overlayDock === dock ? overlay : null;
}

export function findSidebarSlideHost(
	side: ResizeHandleSide
): HTMLElement | null {
	if (side === 'left') {
		return document.querySelector(
			PRIMARY_SLIDE_HOST_SELECTOR
		) as HTMLElement | null;
	}

	if (side === 'right') {
		return document.querySelector(
			SECONDARY_SLIDE_HOST_SELECTOR
		) as HTMLElement | null;
	}

	return null;
}

/**
 * Host for the resize handle portal.
 * Width handles prefer the complementary overlay when it covers that dock.
 */
export function findResizeHandleContainer(
	side: ResizeHandleSide
): HTMLElement | null {
	if (side === 'top') {
		return document.querySelector(LIST_VIEW_SELECTOR) as HTMLElement | null;
	}

	if (side === 'left') {
		return (
			findComplementaryOverlay('right') ||
			(document.querySelector(
				PRIMARY_CONTENT_SELECTOR
			) as HTMLElement | null) ||
			(document.querySelector(CORE_SIDEBAR_SELECTOR) as HTMLElement | null)
		);
	}

	return (
		findComplementaryOverlay('left') ||
		(document.querySelector(
			SECONDARY_CONTENT_SELECTOR
		) as HTMLElement | null)
	);
}

export function readHorizontalSidebarStartWidth(
	side: 'left' | 'right',
	container: HTMLElement
): number {
	const cssVar =
		side === 'left'
			? '--blockera-primary-sidebar-width'
			: '--blockera-secondary-sidebar-width';
	const fromBody =
		document.body.style.getPropertyValue(cssVar) ||
		window.getComputedStyle(document.body).getPropertyValue(cssVar);
	const parsedBody = Number.parseFloat(fromBody);
	if (Number.isFinite(parsedBody) && parsedBody > 0) {
		return parsedBody;
	}

	const rawWidth = container.style.getPropertyValue('--sidebar-width-raw');
	if (rawWidth) {
		const parsedRaw = Number.parseFloat(rawWidth);
		if (Number.isFinite(parsedRaw) && parsedRaw > 0) {
			return parsedRaw;
		}
	}

	const computed = window
		.getComputedStyle(container)
		.getPropertyValue('--sidebar-width');
	return Number.parseFloat(computed) || (side === 'left' ? 300 : 350);
}

export function setSidebarResizingClass(
	side: ResizeHandleSide,
	container: HTMLElement | null,
	isResizing: boolean
): void {
	const toggle = (el: HTMLElement | null) => {
		if (!el) {
			return;
		}
		el.classList.toggle('is-resizing', isResizing);
	};

	toggle(container);
	toggle(findSidebarSlideHost(side));

	if (side !== 'left' || !container) {
		return;
	}

	const fillElement = container.querySelector(
		'.interface-complementary-area__fill'
	) as HTMLElement | null;
	toggle(fillElement);
	toggle(
		fillElement?.querySelector(
			'.interface-complementary-area'
		) as HTMLElement | null
	);
}
