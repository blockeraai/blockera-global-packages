/**
 * WordPress dependencies
 */
import { useLayoutEffect } from '@wordpress/element';
import type { RefObject } from 'react';

/**
 * Internal dependencies
 */
import { subscribeSidebarDrag } from './drag-session';
import { INSERTER_CATEGORY_PANEL_CLASS } from './inserter-category-panel-class';
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
		!sidebarContent?.classList.contains(INSERTER_CATEGORY_PANEL_CLASS)
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

type OverlayBoxSnapshot = {
	top: number;
	left: number;
	width: number;
	height: number;
	clipPath: string;
};

/**
 * Docked idle overlays must not restyle on height or clip ticks. Global Styles
 * color/preset updates grow the inspector; rewriting overlay geometry forces a
 * full settings layout during the measured interaction. Open/close, dock move,
 * and floating panes still write. Clip from a slide animation is cleared once.
 */
export type ComplementaryOverlaySyncReason =
	| 'idle'
	| 'init'
	| 'slide'
	| 'drag'
	| 'resize-width'
	| 'window-resize'
	| 'inserter'
	| 'class';

const MEASURE_REASON_RANK: Record<ComplementaryOverlaySyncReason, number> = {
	idle: 0,
	class: 1,
	'resize-width': 2,
	inserter: 3,
	'window-resize': 4,
	drag: 5,
	slide: 6,
	init: 7,
};

/**
 * Coalesce overlay rAF callbacks so a width/drag tick is not dropped for an
 * idle inspector frame that queued first.
 */
export function strongerOverlaySyncReason(
	current: ComplementaryOverlaySyncReason,
	next: ComplementaryOverlaySyncReason
): ComplementaryOverlaySyncReason {
	return MEASURE_REASON_RANK[next] > MEASURE_REASON_RANK[current]
		? next
		: current;
}

const OVERLAY_HOST_CLASS_TOKENS = ['is-resizing'];
const OVERLAY_CONTENT_CLASS_TOKENS = ['is-hidden', 'is-visible'];

/**
 * Dock class mutations that are not open/close or resize must not schedule a
 * layout read. Global Styles does not toggle these tokens.
 */
export function overlayClassTokens(
	className: string,
	tokens: readonly string[]
): string {
	if (!className) {
		return '';
	}

	const present: string[] = [];
	const parts = className.split(/\s+/);
	for (let i = 0; i < tokens.length; i++) {
		const token = tokens[i];
		if (parts.includes(token)) {
			present.push(token);
		}
	}

	return present.join(' ');
}

export function overlayHostClassTokens(className: string): string {
	return overlayClassTokens(className, OVERLAY_HOST_CLASS_TOKENS);
}

export function overlayContentClassTokens(className: string): string {
	return overlayClassTokens(className, OVERLAY_CONTENT_CLASS_TOKENS);
}

/**
 * Idle Global Styles edits must not call getBoundingClientRect. Measure only
 * for the first layout, slide/drag, dock width, viewport, inserter column,
 * visibility class, leftover clip, or a floating pane.
 */
export function shouldMeasureComplementaryOverlay(
	trackingSlide: boolean,
	isFloating: boolean,
	hasLaidOut: boolean,
	leftoverClip: boolean,
	reason: ComplementaryOverlaySyncReason
): boolean {
	if (trackingSlide || isFloating || leftoverClip || !hasLaidOut) {
		return true;
	}

	return reason !== 'idle';
}

export function shouldWriteComplementaryOverlay(
	trackingSlide: boolean,
	isFloating: boolean,
	previous: OverlayBoxSnapshot,
	next: OverlayBoxSnapshot,
	widthEpsilon = 0.5
): boolean {
	if (trackingSlide || isFloating) {
		return (
			previous.top !== next.top ||
			previous.left !== next.left ||
			previous.width !== next.width ||
			previous.height !== next.height ||
			previous.clipPath !== next.clipPath
		);
	}

	const nextClip = '';
	if (previous.clipPath !== nextClip) {
		return true;
	}

	if (!Number.isFinite(previous.width)) {
		return true;
	}

	return (
		previous.top !== next.top ||
		previous.left !== next.left ||
		Math.abs(previous.width - next.width) >= widthEpsilon
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
	anchorRect: DOMRect,
	hostRect: DOMRect | null | undefined,
	categoryPanelOpen: boolean
): DOMRect {
	if (!hostRect) {
		return anchorRect;
	}

	const clipRect = new DOMRect(
		hostRect.left,
		anchorRect.top,
		hostRect.width,
		anchorRect.height
	);

	if (!categoryPanelOpen) {
		return clipRect;
	}

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
	hostRect: DOMRect | null | undefined,
	categoryPanelOpen = false
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
			overlayClipRectFromSlideHost(
				anchor,
				overlayBox,
				hostRect,
				categoryPanelOpen
			)
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
		let pendingReason: ComplementaryOverlaySyncReason = 'idle';
		let overlayNode = sidebar;
		let categoryPanelOpen = false;

		const getOverlayNode = (): HTMLElement | null => {
			if (overlayNode?.isConnected) {
				return overlayNode;
			}
			overlayNode = findSidebar();
			return overlayNode;
		};

		const sync = (reason: ComplementaryOverlaySyncReason = 'idle') => {
			const anchor = anchorRef.current;
			const node = getOverlayNode();
			if (!anchor || !node) {
				return;
			}

			const isFloating = anchor.classList.contains('is-floating');
			if (
				!shouldMeasureComplementaryOverlay(
					trackingSlide,
					isFloating,
					Number.isFinite(lastWidth),
					lastClipPath !== '',
					reason
				)
			) {
				return;
			}

			const anchorRect = anchor.getBoundingClientRect();
			const slideHostForAnchor = findSlideHost(anchor);
			const hostRect = isFloating
				? undefined
				: slideHostForAnchor?.getBoundingClientRect();
			if (hostRect) {
				lastHostWidth = hostRect.width;
			}
			const { overlayBox, clipPath: measuredClipPath } =
				complementaryOverlayGeometry(
					anchor,
					anchorRect,
					hostRect,
					categoryPanelOpen
				);
			const clipPath =
				trackingSlide || isFloating ? measuredClipPath : '';
			if (
				!shouldWriteComplementaryOverlay(
					trackingSlide,
					isFloating,
					{
						top: lastTop,
						left: lastLeft,
						width: lastWidth,
						height: lastHeight,
						clipPath: lastClipPath,
					},
					{
						top: overlayBox.top,
						left: overlayBox.left,
						width: overlayBox.width,
						height: overlayBox.height,
						clipPath,
					}
				)
			) {
				lastHeight = overlayBox.height;
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
				if (node.dataset.blockeraOverlayDock !== dockSide) {
					node.dataset.blockeraOverlayDock = dockSide;
				}
			} else if (node.dataset.blockeraOverlayDock) {
				delete node.dataset.blockeraOverlayDock;
			}

			countSidebarPerf('overlaySyncs');
			if (!node.classList.contains(OVERLAY_CLASS)) {
				node.classList.add(OVERLAY_CLASS);
			}
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

		const syncOnFrame = (
			reason: ComplementaryOverlaySyncReason = 'idle'
		) => {
			pendingReason = strongerOverlaySyncReason(pendingReason, reason);
			if (frame) {
				return;
			}
			frame = window.requestAnimationFrame(() => {
				frame = 0;
				const nextReason = pendingReason;
				pendingReason = 'idle';
				sync(nextReason);
				if (trackingSlide) {
					syncOnFrame('slide');
				}
			});
		};

		const startSlideTracking = () => {
			if (trackingSlide) {
				return;
			}
			trackingSlide = true;
			syncOnFrame('slide');
		};

		const stopSlideTracking = () => {
			trackingSlide = false;
			sync('slide');
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
			syncOnFrame(trackingSlide ? 'slide' : 'resize-width');
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

		sync('init');
		maybeStartTrackingForOpen();

		if (slideHost) {
			observer.observe(slideHost);
		}
		slideHost?.addEventListener('transitionstart', onTransitionStart);
		slideHost?.addEventListener('transitionend', onTransitionEnd);
		slideHost?.addEventListener('transitioncancel', onTransitionEnd);
		const slideContent = slideHost?.querySelector(SLIDE_CONTENT_SELECTOR);
		let lastHostClassTokens = overlayHostClassTokens(
			slideHost?.className ?? ''
		);
		let lastContentClassTokens = overlayContentClassTokens(
			slideContent?.className ?? ''
		);
		const classObserver = new MutationObserver(() => {
			const hostTokens = overlayHostClassTokens(
				slideHost?.className ?? ''
			);
			const contentTokens = overlayContentClassTokens(
				slideContent?.className ?? ''
			);
			if (
				hostTokens === lastHostClassTokens &&
				contentTokens === lastContentClassTokens
			) {
				return;
			}
			lastHostClassTokens = hostTokens;
			lastContentClassTokens = contentTokens;
			syncOnFrame('class');
			if (contentTokens.includes('is-hidden')) {
				maybeStartTrackingForOpen();
			}
		});
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
		const readCategoryPanelOpen = (): boolean =>
			!!dock
				?.querySelector('.block-editor-inserter__menu')
				?.classList.contains('show-panel');
		categoryPanelOpen = readCategoryPanelOpen();
		const showPanelObserver = new MutationObserver(() => {
			const nextOpen = readCategoryPanelOpen();
			if (nextOpen === categoryPanelOpen) {
				return;
			}
			categoryPanelOpen = nextOpen;
			syncOnFrame('inserter');
		});
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
				syncOnFrame('slide');
			}
		};
		const onWindowResize = () => {
			syncOnFrame('window-resize');
		};
		window.addEventListener('resize', onWindowResize);
		window.addEventListener('scroll', onSlideScroll, true);
		const unsubscribePosition = subscribeSidebarDrag(
			() => syncOnFrame('drag'),
			'position'
		);
		const unsubscribeLayout = subscribeSidebarDrag(
			() => sync('drag'),
			'layout'
		);

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
			window.removeEventListener('resize', onWindowResize);
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
