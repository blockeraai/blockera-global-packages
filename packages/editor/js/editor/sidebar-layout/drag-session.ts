/**
 * Internal dependencies
 */
import { dropSlotIndexFromY, parseDropHeightsAttr } from './layout';
import {
	countSidebarPerf,
	logSidebarPerf,
	markSidebarDragDrop,
	markSidebarDragStart,
} from './sidebar-perf';
import type { SidebarDockId, SidebarSectionId } from './types';

export const DROP_SLOT_COUNT = 3;
export const RETURN_MS = 220;

export type SidebarDropSlot = 0 | 1 | 2;

export type SidebarDragState = {
	sectionId: SidebarSectionId;
	width: number;
	height: number;
	grabX: number;
	grabY: number;
	x: number;
	y: number;
	hoverDock: SidebarDockId | null;
	hoverSlot: SidebarDropSlot | null;
	revealThirdDock: SidebarDockId | null;
	returning: boolean;
};

export type SidebarDragChannel = 'layout' | 'position' | 'all';

type DropHandler = (
	sectionId: SidebarSectionId,
	dock: SidebarDockId,
	slot: SidebarDropSlot
) => void;

type DockHitCache = {
	dock: SidebarDockId;
	left: number;
	right: number;
	top: number;
	bottom: number;
	height: number;
	slotPercents: number[];
	canRevealThird: boolean;
};

let drag: SidebarDragState | null = null;
let dropHandler: DropHandler | null = null;
const layoutListeners = new Set<() => void>();
const positionListeners = new Set<() => void>();
let dockHitCache: DockHitCache[] = [];
let floatingPane: HTMLElement | null = null;
let originLeft = 0;
let originTop = 0;
let originWidth = 0;
let originHeight = 0;
let returnTimer = 0;
let returnRaf = 0;
let returnDone: (() => void) | null = null;
let captureTarget: HTMLElement | null = null;
let capturePointerId: number | null = null;

function notify(channel: 'layout' | 'position'): void {
	if (channel === 'layout') {
		countSidebarPerf('layoutNotifies');
		layoutListeners.forEach((listener) => listener());
		return;
	}

	countSidebarPerf('positionNotifies');
	positionListeners.forEach((listener) => listener());
}

function notifyLayout(): void {
	notify('layout');
	window.requestAnimationFrame(() => {
		refreshDockHitCache();
		bindFloatingPane();
	});
}

function refreshDockHitCache(): void {
	const docks: SidebarDockId[] = ['left', 'right'];
	const next: DockHitCache[] = [];

	for (let i = 0; i < docks.length; i++) {
		const dock = docks[i];
		const node = document.querySelector(
			`[data-test="blockera-sidebar-dock-${dock}"]`
		);
		if (!(node instanceof HTMLElement)) {
			continue;
		}
		const rect = node.getBoundingClientRect();
		next.push({
			dock,
			left: rect.left,
			right: rect.right,
			top: rect.top,
			bottom: rect.bottom,
			height: rect.height,
			slotPercents: parseDropHeightsAttr(
				node.getAttribute('data-drop-heights')
			),
			canRevealThird: node.getAttribute('data-can-reveal-third') === '1',
		});
	}

	dockHitCache = next;
}

function hitTestDock(
	clientX: number,
	clientY: number,
	alreadyRevealedDock: SidebarDockId | null
): {
	dock: SidebarDockId;
	slot: SidebarDropSlot;
	revealThirdDock: SidebarDockId | null;
} | null {
	if (dockHitCache.length === 0) {
		refreshDockHitCache();
	}

	for (let i = 0; i < dockHitCache.length; i++) {
		const cached = dockHitCache[i];
		if (
			clientX < cached.left ||
			clientX > cached.right ||
			clientY < cached.top ||
			clientY > cached.bottom ||
			cached.height <= 0
		) {
			continue;
		}

		const result = dropSlotIndexFromY(
			clientY,
			cached.top,
			cached.height,
			cached.slotPercents,
			alreadyRevealedDock === cached.dock,
			cached.canRevealThird
		);

		return {
			dock: cached.dock,
			slot: result.slot,
			revealThirdDock: result.revealThird ? cached.dock : null,
		};
	}

	return null;
}

export function applyFloatingPaneFromDrag(): void {
	if (!drag || !floatingPane || drag.returning) {
		return;
	}

	floatingPane.style.position = 'fixed';
	floatingPane.style.left = `${drag.x - drag.grabX}px`;
	floatingPane.style.top = `${drag.y - drag.grabY}px`;
	floatingPane.style.width = `${drag.width}px`;
	floatingPane.style.height = `${drag.height}px`;
	floatingPane.style.zIndex = '100000';
	floatingPane.style.margin = '0';
}

function bindFloatingPane(): void {
	if (!drag) {
		floatingPane = null;
		return;
	}

	const node = document.querySelector(
		`[data-test="blockera-sidebar-pane-${drag.sectionId}"]`
	);
	floatingPane = node instanceof HTMLElement ? node : null;
	applyFloatingPaneFromDrag();
	if (capturePointerId !== null) {
		const handle = document.querySelector(
			`[data-test="blockera-sidebar-pane-drag-${drag.sectionId}"]`
		);
		if (handle instanceof HTMLElement) {
			captureTarget = handle;
			try {
				if (!handle.hasPointerCapture(capturePointerId)) {
					handle.setPointerCapture(capturePointerId);
				}
			} catch {
				// Capture can fail after a remount; the next move still uses window listeners.
			}
		}
	}
}

function onPointerMove(event: PointerEvent): void {
	if (!drag || drag.returning) {
		return;
	}

	countSidebarPerf('pointerMoves');

	const hit = hitTestDock(event.clientX, event.clientY, drag.revealThirdDock);
	const nextHoverDock = hit?.dock ?? null;
	const nextHoverSlot = hit?.slot ?? null;
	const nextReveal = hit?.revealThirdDock ?? null;
	const layoutChanged =
		drag.hoverDock !== nextHoverDock ||
		drag.hoverSlot !== nextHoverSlot ||
		drag.revealThirdDock !== nextReveal;

	drag.x = event.clientX;
	drag.y = event.clientY;
	drag.hoverDock = nextHoverDock;
	drag.hoverSlot = nextHoverSlot;
	drag.revealThirdDock = nextReveal;

	applyFloatingPaneFromDrag();
	if (drag.sectionId === 'complementary') {
		notify('position');
	}

	if (layoutChanged) {
		countSidebarPerf('hoverChanges');
		logSidebarPerf('hover', {
			dock: nextHoverDock,
			slot: nextHoverSlot,
			revealThird: nextReveal,
		});
		if (nextReveal) {
			logSidebarPerf('placeholder', {
				dock: nextReveal,
				revealThird: true,
			});
		}
		notifyLayout();
	}
}

function clearPointerListeners(): void {
	if (
		captureTarget &&
		capturePointerId !== null &&
		captureTarget.hasPointerCapture?.(capturePointerId)
	) {
		captureTarget.releasePointerCapture(capturePointerId);
	}
	captureTarget = null;
	capturePointerId = null;
	window.removeEventListener('pointermove', onPointerMove);
	window.removeEventListener('pointerup', onPointerUp);
	window.removeEventListener('pointercancel', onPointerUp);
	document.body.classList.remove('is-blockera-sidebar-dragging');
	document.body.style.removeProperty('user-select');
	document.body.style.removeProperty('cursor');
}

function stopReturnMotion(): void {
	if (returnTimer) {
		window.clearTimeout(returnTimer);
		returnTimer = 0;
	}

	if (returnRaf) {
		window.cancelAnimationFrame(returnRaf);
		returnRaf = 0;
	}

	if (returnDone && floatingPane) {
		floatingPane.removeEventListener('transitionend', returnDone);
	}

	returnDone = null;
}

function endDragSession(): void {
	stopReturnMotion();
	drag = null;
	floatingPane = null;
	dockHitCache = [];
	dropHandler = null;
	notifyLayout();
	notify('position');
}

function tickReturnOverlay(): void {
	if (!drag?.returning) {
		return;
	}

	notify('position');
	returnRaf = window.requestAnimationFrame(tickReturnOverlay);
}

function returnPaneToOrigin(): void {
	if (!drag) {
		return;
	}

	drag.returning = true;
	logSidebarPerf('cancel', { sectionId: drag.sectionId });
	clearPointerListeners();
	notifyLayout();
	bindFloatingPane();

	const pane = floatingPane;
	if (!pane) {
		endDragSession();
		return;
	}

	pane.classList.add('is-returning');
	pane.style.transition = `left ${RETURN_MS}ms cubic-bezier(0.22, 1, 0.36, 1), top ${RETURN_MS}ms cubic-bezier(0.22, 1, 0.36, 1), width ${RETURN_MS}ms cubic-bezier(0.22, 1, 0.36, 1), height ${RETURN_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`;
	pane.getBoundingClientRect();
	pane.style.left = `${originLeft}px`;
	pane.style.top = `${originTop}px`;
	pane.style.width = `${originWidth}px`;
	pane.style.height = `${originHeight}px`;
	tickReturnOverlay();

	const done = () => {
		if (returnDone !== done) {
			return;
		}
		stopReturnMotion();
		endDragSession();
	};

	returnDone = done;
	pane.addEventListener('transitionend', done);
	returnTimer = window.setTimeout(done, RETURN_MS + 40);
}

function onPointerUp(event: PointerEvent): void {
	if (!drag || drag.returning) {
		return;
	}

	const sectionId = drag.sectionId;
	const hit =
		drag.hoverDock !== null && drag.hoverSlot !== null
			? {
					dock: drag.hoverDock,
					slot: drag.hoverSlot,
					revealThirdDock: drag.revealThirdDock,
				}
			: hitTestDock(event.clientX, event.clientY, drag.revealThirdDock);

	if (!hit) {
		markSidebarDragDrop({
			sectionId,
			dock: null,
			slot: null,
			cancelled: true,
		});
		returnPaneToOrigin();
		return;
	}

	const handler = dropHandler;
	markSidebarDragDrop({
		sectionId,
		dock: hit.dock,
		slot: hit.slot,
	});
	clearPointerListeners();
	drag = null;
	floatingPane = null;
	dockHitCache = [];
	notifyLayout();
	notify('position');

	if (handler) {
		handler(sectionId, hit.dock, hit.slot);
	}

	dropHandler = null;
}

export function subscribeSidebarDrag(
	listener: () => void,
	channel: SidebarDragChannel = 'all'
): () => void {
	if (channel === 'layout' || channel === 'all') {
		layoutListeners.add(listener);
	}
	if (channel === 'position' || channel === 'all') {
		positionListeners.add(listener);
	}

	return () => {
		layoutListeners.delete(listener);
		positionListeners.delete(listener);
	};
}

export function getSidebarDrag(): SidebarDragState | null {
	return drag;
}

export function startSidebarDrag(options: {
	sectionId: SidebarSectionId;
	width: number;
	height: number;
	grabX: number;
	grabY: number;
	x: number;
	y: number;
	pointerId?: number;
	captureTarget?: HTMLElement | null;
	onDrop: DropHandler;
}): void {
	if (drag) {
		endDragSession();
	}

	dropHandler = options.onDrop;
	originLeft = options.x - options.grabX;
	originTop = options.y - options.grabY;
	originWidth = options.width;
	originHeight = options.height;
	drag = {
		sectionId: options.sectionId,
		width: options.width,
		height: options.height,
		grabX: options.grabX,
		grabY: options.grabY,
		x: options.x,
		y: options.y,
		hoverDock: null,
		hoverSlot: null,
		revealThirdDock: null,
		returning: false,
	};
	markSidebarDragStart({
		sectionId: options.sectionId,
		width: options.width,
		height: options.height,
	});
	document.body.classList.add('is-blockera-sidebar-dragging');
	document.body.style.userSelect = 'none';
	document.body.style.cursor = 'grabbing';
	refreshDockHitCache();
	window.addEventListener('pointermove', onPointerMove, { passive: true });
	window.addEventListener('pointerup', onPointerUp);
	window.addEventListener('pointercancel', onPointerUp);
	if (
		options.captureTarget &&
		typeof options.pointerId === 'number'
	) {
		try {
			options.captureTarget.setPointerCapture(options.pointerId);
			captureTarget = options.captureTarget;
			capturePointerId = options.pointerId;
		} catch {
			captureTarget = null;
			capturePointerId = null;
		}
	}
	notifyLayout();
}

export function getActiveSidebarDrag(): SidebarSectionId | null {
	return drag?.sectionId ?? null;
}
