/**
 * WordPress dependencies
 */
import { useLayoutEffect } from '@wordpress/element';
import type { RefObject } from 'react';

/**
 * Internal dependencies
 */
import { subscribeSidebarDrag } from './drag-session';
import { countSidebarPerf } from './sidebar-perf';

const SIDEBAR_SELECTOR = '.interface-interface-skeleton__sidebar';
const OVERLAY_CLASS = 'blockera-complementary-overlay';
const SLIDE_HOST_SELECTOR =
	'.interface-interface-skeleton__secondary-sidebar-blockera, .interface-interface-skeleton__primary-sidebar-blockera';
const SLIDE_CONTENT_SELECTOR =
	'.blockera-primary-sidebar-content, .blockera-secondary-sidebar-content';

function parsePx(value: string, fallback: number): number {
	const parsed = Number.parseFloat(value);
	return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * When a category column is open in the same dock, the complementary placeholder
 * spans the expanded sidebar width. Inset the overlay so it only covers the main
 * column, not the category flyout band.
 */
function overlayRectForCategoryPanel(
	anchor: HTMLElement,
	rect: DOMRect
): DOMRect {
	const dock = anchor.closest('.blockera-sidebar-dock');
	const sidebarContent =
		anchor.closest('.blockera-primary-sidebar-content') ??
		anchor.closest('.blockera-secondary-sidebar-content');

	if (
		!dock ||
		!sidebarContent?.querySelector('.block-editor-inserter__menu.show-panel')
	) {
		return rect;
	}

	const patternWidth = parsePx(
		getComputedStyle(sidebarContent).getPropertyValue(
			'--sidebar-pattern-inserter-width'
		),
		280
	);
	const rawWidth = parsePx(
		getComputedStyle(sidebarContent).getPropertyValue(
			'--sidebar-width-raw'
		),
		300
	);
	const isRightDock = dock.classList.contains('blockera-sidebar-dock--right');
	const isLeftDock = dock.classList.contains('blockera-sidebar-dock--left');

	if (!isRightDock && !isLeftDock) {
		return rect;
	}

	const insetWidth = Math.min(
		rawWidth,
		Math.max(0, rect.width - patternWidth)
	);

	return new DOMRect(
		isRightDock ? rect.left + patternWidth : rect.left,
		rect.top,
		insetWidth,
		rect.height
	);
}

/**
 * Overlay must match the dock wrapper clip (animating width), not the full
 * placeholder pane — getBoundingClientRect on the anchor ignores overflow.
 */
function parseTargetSlideWidth(host: HTMLElement): number {
	const style = getComputedStyle(host);
	const fromVar = parsePx(style.getPropertyValue('--sidebar-width'), 0);
	if (fromVar > 0) {
		return fromVar;
	}

	return parsePx(
		style.getPropertyValue('--blockera-primary-sidebar-width') ||
			style.getPropertyValue('--blockera-secondary-sidebar-width'),
		300
	);
}

/** True while the dock wrapper is opening (clip width still growing). */
export function isSlideHostOpening(host: HTMLElement | null): boolean {
	if (!host) {
		return false;
	}

	const content = host.querySelector(SLIDE_CONTENT_SELECTOR);
	if (content?.classList.contains('is-hidden')) {
		return true;
	}

	const hostWidth = host.getBoundingClientRect().width;
	const targetWidth = parseTargetSlideWidth(host);
	return targetWidth > 1 && hostWidth < targetWidth - 1;
}

function overlayRectFromSlideHost(
	anchor: HTMLElement,
	anchorRect: DOMRect
): DOMRect {
	const slideHost = anchor.closest(SLIDE_HOST_SELECTOR) as HTMLElement | null;
	if (!slideHost) {
		return anchorRect;
	}

	const hostRect = slideHost.getBoundingClientRect();
	const clipRect = new DOMRect(
		hostRect.left,
		anchorRect.top,
		hostRect.width,
		anchorRect.height
	);

	return overlayRectForCategoryPanel(anchor, clipRect);
}

export function findSidebar(): HTMLElement | null {
	return document.querySelector(SIDEBAR_SELECTOR) as HTMLElement | null;
}

function clearOverlay(sidebar: HTMLElement | null): void {
	if (!sidebar) {
		return;
	}

	// Hide before returning the node to document flow to avoid a post-close flash.
	sidebar.style.setProperty('visibility', 'hidden', 'important');
	sidebar.classList.remove(OVERLAY_CLASS);
	sidebar.style.removeProperty('top');
	sidebar.style.removeProperty('left');
	sidebar.style.removeProperty('width');
	sidebar.style.removeProperty('height');
	sidebar.style.setProperty('--sidebar-width', '0');
	sidebar.style.removeProperty('--sidebar-width-raw');
	delete sidebar.dataset.blockeraOverlayDock;
}

export function findComplementaryHandleHost(): HTMLElement | null {
	const sidebar = findSidebar();
	if (!sidebar) {
		return null;
	}

	// ComplementaryArea remounts when the active tab identifier changes.
	// The tab bar is the stable host so the handle survives Page/Block switches.
	return (
		(sidebar.querySelector(
			'.editor-sidebar__panel-tabs'
		) as HTMLElement | null) ??
		(sidebar.querySelector(
			'.edit-widgets-sidebar__panel-tabs'
		) as HTMLElement | null)
	);
}

/**
 * Positions Gutenberg's complementary area over a Blockera pane placeholder
 * without re-parenting React-owned nodes.
 */
export function useComplementaryOverlay(
	anchorRef: RefObject<HTMLElement | null>,
	enabled: boolean
): void {
	useLayoutEffect(() => {
		const sidebar = findSidebar();

		if (!enabled) {
			clearOverlay(sidebar);
			document.body.classList.remove(
				'has-blockera-complementary-overlay'
			);
			return;
		}

		document.body.classList.add('has-blockera-complementary-overlay');

		let frame = 0;
		let trackingSlide = false;
		let lastTop = Number.NaN;
		let lastLeft = Number.NaN;
		let lastWidth = Number.NaN;
		let lastHeight = Number.NaN;

		const sync = () => {
			const anchor = anchorRef.current;
			const node = findSidebar();
			if (!anchor || !node) {
				return;
			}

			const anchorRect = anchor.getBoundingClientRect();
			const rect = overlayRectFromSlideHost(anchor, anchorRect);
			if (
				rect.top === lastTop &&
				rect.left === lastLeft &&
				rect.width === lastWidth &&
				rect.height === lastHeight
			) {
				return;
			}

			lastTop = rect.top;
			lastLeft = rect.left;
			lastWidth = rect.width;
			lastHeight = rect.height;

			const dock = anchor.closest('.blockera-sidebar-dock');
			const dockSide = dock?.classList.contains('blockera-sidebar-dock--right')
				? 'right'
				: dock?.classList.contains('blockera-sidebar-dock--left')
					? 'left'
					: '';
			if (dockSide) {
				node.dataset.blockeraOverlayDock = dockSide;
			} else {
				delete node.dataset.blockeraOverlayDock;
			}

			countSidebarPerf('overlaySyncs');
			node.classList.add(OVERLAY_CLASS);
			node.style.removeProperty('visibility');
			node.style.setProperty('top', `${rect.top}px`, 'important');
			node.style.setProperty('left', `${rect.left}px`, 'important');
			node.style.setProperty('width', `${rect.width}px`, 'important');
			node.style.setProperty('height', `${rect.height}px`, 'important');
			node.style.setProperty('--sidebar-width', `${rect.width}px`);
			node.style.setProperty('--sidebar-width-raw', `${rect.width}px`);
		};

		const syncOnFrame = () => {
			if (frame) {
				return;
			}
			frame = window.requestAnimationFrame(() => {
				frame = 0;
				sync();
				if (trackingSlide) {
					syncOnFrame();
				}
			});
		};

		const startSlideTracking = () => {
			if (trackingSlide) {
				return;
			}
			trackingSlide = true;
			syncOnFrame();
		};

		const stopSlideTracking = () => {
			trackingSlide = false;
			sync();
		};

		const maybeStartTrackingForOpen = () => {
			if (isSlideHostOpening(slideHost)) {
				startSlideTracking();
			}
		};

		const observer = new ResizeObserver(syncOnFrame);
		const slideHost = anchorRef.current?.closest(
			SLIDE_HOST_SELECTOR
		) as HTMLElement | null;

		const onTransitionStart = (event: TransitionEvent) => {
			if (event.propertyName !== 'width') {
				return;
			}
			startSlideTracking();
		};

		const onTransitionEnd = (event: TransitionEvent) => {
			if (event.propertyName !== 'width') {
				return;
			}
			stopSlideTracking();
		};

		sync();
		maybeStartTrackingForOpen();

		if (anchorRef.current) {
			observer.observe(anchorRef.current);
		}
		if (slideHost) {
			observer.observe(slideHost);
		}
		slideHost?.addEventListener('transitionstart', onTransitionStart);
		slideHost?.addEventListener('transitionend', onTransitionEnd);
		slideHost?.addEventListener('transitioncancel', onTransitionEnd);
		const classObserver = new MutationObserver(() => {
			syncOnFrame();
			maybeStartTrackingForOpen();
		});
		if (slideHost) {
			classObserver.observe(slideHost, {
				attributes: true,
				attributeFilter: ['class', 'style'],
				subtree: true,
			});
		}
		const dock = anchorRef.current?.closest('.blockera-sidebar-dock');
		const showPanelObserver = new MutationObserver(syncOnFrame);
		if (dock) {
			showPanelObserver.observe(dock, {
				subtree: true,
				attributes: true,
				attributeFilter: ['class'],
			});
		}
		window.addEventListener('resize', syncOnFrame);
		window.addEventListener('scroll', syncOnFrame, true);
		const unsubscribePosition = subscribeSidebarDrag(
			syncOnFrame,
			'position'
		);
		const unsubscribeLayout = subscribeSidebarDrag(sync, 'layout');

		return () => {
			trackingSlide = false;
			if (frame) {
				window.cancelAnimationFrame(frame);
			}
			observer.disconnect();
			classObserver.disconnect();
			showPanelObserver.disconnect();
			slideHost?.removeEventListener('transitionstart', onTransitionStart);
			slideHost?.removeEventListener('transitionend', onTransitionEnd);
			slideHost?.removeEventListener('transitioncancel', onTransitionEnd);
			window.removeEventListener('resize', syncOnFrame);
			window.removeEventListener('scroll', syncOnFrame, true);
			unsubscribePosition();
			unsubscribeLayout();
			clearOverlay(findSidebar());
			document.body.classList.remove(
				'has-blockera-complementary-overlay'
			);
		};
	}, [anchorRef, enabled]);
}
