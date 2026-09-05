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

/**
 * Canvas / Global Styles updates often change dock height (iframe content).
 * Repositioning the complementary overlay on those ticks restyles the whole
 * settings panel during inspector edits. Width still tracks open/close and
 * category columns.
 */
export function shouldSyncOverlayFromHostResize(
	previousWidth: number,
	nextWidth: number,
	trackingSlide: boolean,
	epsilon = 0.5
): boolean {
	if (trackingSlide) {
		return true;
	}

	if (!Number.isFinite(previousWidth)) {
		return true;
	}

	return Math.abs(previousWidth - nextWidth) >= epsilon;
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

function findSlideHost(anchor: HTMLElement): HTMLElement | null {
	const dock = anchor.closest('.blockera-sidebar-dock');
	if (dock?.classList.contains('blockera-sidebar-dock--left')) {
		return anchor.closest(
			'.interface-interface-skeleton__secondary-sidebar-blockera'
		) as HTMLElement | null;
	}
	if (dock?.classList.contains('blockera-sidebar-dock--right')) {
		return anchor.closest(
			'.interface-interface-skeleton__primary-sidebar-blockera'
		) as HTMLElement | null;
	}

	return anchor.closest(SLIDE_HOST_SELECTOR) as HTMLElement | null;
}

function clipPathFromIntersection(
	anchorRect: DOMRect,
	clipRect: DOMRect
): string {
	const top = Math.max(0, clipRect.top - anchorRect.top);
	const right = Math.max(0, anchorRect.right - clipRect.right);
	const bottom = Math.max(0, anchorRect.bottom - clipRect.bottom);
	const left = Math.max(0, clipRect.left - anchorRect.left);
	if (top === 0 && right === 0 && bottom === 0 && left === 0) {
		return '';
	}

	return `inset(${top}px ${right}px ${bottom}px ${left}px)`;
}

function overlayClipRectFromSlideHost(
	anchor: HTMLElement,
	anchorRect: DOMRect
): DOMRect {
	const slideHost = findSlideHost(anchor);
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

/**
 * While the complementary placeholder is docked, overlay left follows the
 * slide host so open/close clip stays correct. While it is floating, follow
 * the placeholder on both axes — host left would pin settings to the dock.
 */
export function complementaryOverlayGeometry(
	anchor: HTMLElement,
	anchorRect: DOMRect,
	hostRect: DOMRect | null | undefined
): { overlayBox: DOMRect; clipPath: string } {
	if (anchor.classList.contains('is-floating')) {
		return {
			overlayBox: new DOMRect(
				anchorRect.left,
				anchorRect.top,
				anchorRect.width,
				anchorRect.height
			),
			clipPath: '',
		};
	}

	const overlayLeft = hostRect ? hostRect.left : anchorRect.left;
	const overlayBox = new DOMRect(
		overlayLeft,
		anchorRect.top,
		anchorRect.width,
		anchorRect.height
	);

	return {
		overlayBox,
		clipPath: clipPathFromIntersection(
			overlayBox,
			overlayClipRectFromSlideHost(anchor, overlayBox)
		),
	};
}

export function findSidebar(): HTMLElement | null {
	return document.querySelector(SIDEBAR_SELECTOR) as HTMLElement | null;
}

function clearOverlay(sidebar: HTMLElement | null): void {
	if (!sidebar) {
		return;
	}

	// Hide and keep the node at 0 flex width. Dropping the overlay width
	// lets Gutenberg's right-side settings column expand for one frame.
	sidebar.style.setProperty('visibility', 'hidden', 'important');
	sidebar.classList.remove(OVERLAY_CLASS);
	sidebar.style.removeProperty('top');
	sidebar.style.removeProperty('left');
	sidebar.style.setProperty('width', '0', 'important');
	sidebar.style.removeProperty('height');
	sidebar.style.removeProperty('clip-path');
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
		let lastClipPath = '';
		let lastHostWidth = Number.NaN;

		const sync = () => {
			const anchor = anchorRef.current;
			const node = findSidebar();
			if (!anchor || !node) {
				return;
			}

			const anchorRect = anchor.getBoundingClientRect();
			const slideHost = findSlideHost(anchor);
			const hostRect = slideHost?.getBoundingClientRect();
			if (hostRect) {
				lastHostWidth = hostRect.width;
			}
			const { overlayBox, clipPath } = complementaryOverlayGeometry(
				anchor,
				anchorRect,
				hostRect
			);
			if (
				overlayBox.top === lastTop &&
				overlayBox.left === lastLeft &&
				overlayBox.width === lastWidth &&
				overlayBox.height === lastHeight &&
				clipPath === lastClipPath
			) {
				return;
			}

			lastTop = overlayBox.top;
			lastLeft = overlayBox.left;
			lastWidth = overlayBox.width;
			lastHeight = overlayBox.height;
			lastClipPath = clipPath;

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
			node.style.setProperty('top', `${overlayBox.top}px`, 'important');
			node.style.setProperty('left', `${overlayBox.left}px`, 'important');
			node.style.setProperty('width', `${overlayBox.width}px`, 'important');
			node.style.setProperty('height', `${overlayBox.height}px`, 'important');
			node.style.setProperty('--sidebar-width', `${overlayBox.width}px`);
			node.style.setProperty('--sidebar-width-raw', `${overlayBox.width}px`);
			if (clipPath) {
				node.style.setProperty('clip-path', clipPath, 'important');
			} else {
				node.style.removeProperty('clip-path');
			}
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

		const slideHost = anchorRef.current
			? findSlideHost(anchorRef.current)
			: null;
		lastHostWidth = slideHost?.getBoundingClientRect().width ?? Number.NaN;

		const maybeStartTrackingForOpen = () => {
			if (isSlideHostOpening(slideHost)) {
				startSlideTracking();
			}
		};

		const observer = new ResizeObserver((entries) => {
			const entry = entries[0];
			if (!entry) {
				syncOnFrame();
				return;
			}

			const borderBox = Array.isArray(entry.borderBoxSize)
				? entry.borderBoxSize[0]
				: entry.borderBoxSize;
			const nextWidth = Number.isFinite(borderBox?.inlineSize)
				? borderBox.inlineSize
				: entry.contentRect.width;

			if (
				!shouldSyncOverlayFromHostResize(
					lastHostWidth,
					nextWidth,
					trackingSlide
				)
			) {
				return;
			}

			lastHostWidth = nextWidth;
			syncOnFrame();
		});

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
		const slideContent = slideHost?.querySelector(SLIDE_CONTENT_SELECTOR);
		if (slideHost) {
			classObserver.observe(slideHost, {
				attributes: true,
				attributeFilter: ['class'],
			});
		}
		if (slideContent) {
			classObserver.observe(slideContent, {
				attributes: true,
				attributeFilter: ['class'],
			});
		}
		const dock = anchorRef.current?.closest('.blockera-sidebar-dock');
		const showPanelObserver = new MutationObserver(syncOnFrame);
		const attachInserterMenuObserver = () => {
			const menu = dock?.querySelector('.block-editor-inserter__menu');
			if (menu) {
				showPanelObserver.observe(menu, {
					attributes: true,
					attributeFilter: ['class'],
				});
			}
		};
		attachInserterMenuObserver();
		const inserterPane = dock?.querySelector(
			'[data-test="blockera-sidebar-pane-inserter"]'
		);
		const inserterMountObserver = new MutationObserver(
			attachInserterMenuObserver
		);
		if (inserterPane) {
			inserterMountObserver.observe(inserterPane, { childList: true });
		}
		const onSlideScroll = () => {
			if (trackingSlide) {
				syncOnFrame();
			}
		};
		window.addEventListener('resize', syncOnFrame);
		window.addEventListener('scroll', onSlideScroll, true);
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
			inserterMountObserver.disconnect();
			slideHost?.removeEventListener('transitionstart', onTransitionStart);
			slideHost?.removeEventListener('transitionend', onTransitionEnd);
			slideHost?.removeEventListener('transitioncancel', onTransitionEnd);
			window.removeEventListener('resize', syncOnFrame);
			window.removeEventListener('scroll', onSlideScroll, true);
			unsubscribePosition();
			unsubscribeLayout();
			clearOverlay(findSidebar());
			document.body.classList.remove(
				'has-blockera-complementary-overlay'
			);
		};
	}, [anchorRef, enabled]);
}
