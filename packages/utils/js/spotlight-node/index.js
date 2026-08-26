// @flow

/**
 * External dependencies
 */
import { useCallback } from '@wordpress/element';

/**
 * Internal dependencies
 */
import {
	DEFAULT_INSET,
	DEFAULT_PAGE_TOP_MAX_PX,
	SKIP_TOP_EPSILON_PX,
	resolveSpotlightScrollTop,
	scrollRoomNeeded,
	shouldScrollSpotlightNode,
} from './scroll';

export {
	DEFAULT_INSET,
	DEFAULT_PAGE_TOP_MAX_PX,
	SKIP_TOP_EPSILON_PX,
	resolveSpotlightScrollTop,
	scrollDeltaForTopOffset,
	scrollRoomNeeded,
	shouldScrollSpotlightNode,
} from './scroll';

export const SPOTLIGHT_NODE_CLASS = 'blockera-spotlight-node';
export const SPOTLIGHT_NODE_STYLE_ID = 'blockera-spotlight-node-style';
export const SPOTLIGHT_SCROLL_PAD_ATTR = 'data-blockera-spotlight-scroll-pad';

export const DEFAULT_SPEED = 500;
export const DEFAULT_PADDING = 20;
export const DEFAULT_COLOR =
	'var(--blockera-controls-primary-color, var(--wp-components-color-accent, var(--wp-admin-theme-color, #3858e9)))';
export const DEFAULT_OPACITY = 0.5;
export const DEFAULT_SCROLL = true;
export const DEFAULT_FLASH = true;
export const DEFAULT_PAD = true;
export const DEFAULT_TIMEOUT = 2000;
export const DEFAULT_OBSERVE_MS = 0;
export const CONTENT_MOVE_PX = 40;

const CANVAS_IFRAME_SELECTOR =
	'iframe[name="editor-canvas"], iframe.editor-canvas__iframe, iframe.block-editor-iframe__iframe';

const SPOTLIGHT_CSS = `@keyframes blockera-spotlight-node {
	0% { opacity: 0; }
	18% { opacity: var(--blockera-spotlight-node-peak, 0.5); }
	100% { opacity: 0; }
}
.${SPOTLIGHT_NODE_CLASS} {
	position: fixed;
	pointer-events: none;
	z-index: 2147483646;
	box-sizing: border-box;
	border-radius: 4px;
	background: color-mix(
		in srgb,
		var(--blockera-spotlight-node-color, ${DEFAULT_COLOR}) 20%,
		transparent
	);
	box-shadow: inset 0 0 0 2px
		color-mix(
			in srgb,
			var(--blockera-spotlight-node-color, ${DEFAULT_COLOR}) 42%,
			transparent
		);
	animation: blockera-spotlight-node var(--blockera-spotlight-node-speed, ${DEFAULT_SPEED}ms)
		ease-out forwards;
}
@media (prefers-reduced-motion: reduce) {
	.${SPOTLIGHT_NODE_CLASS} {
		animation: none;
		opacity: 0;
	}
}`;

export type SpotlightNodeOptions = {
	speed?: number,
	padding?: number,
	color?: string,
	opacity?: number,
	scroll?: boolean,
	flash?: boolean,
	inset?: number,
	pageTopMaxPx?: number,
	behavior?: 'smooth' | 'auto',
	timeout?: number,
	observeMs?: number,
	pad?: boolean,
};

export type SpotlightNodeTarget =
	HTMLElement | Element | string | { clientId: string };

type SpotlightView = {
	matchMedia?: (query: string) => { matches: boolean },
	getComputedStyle: (el: Element) => {
		borderRadius: string,
		overflowY: string,
	},
	innerHeight: number,
	requestAnimationFrame?: (cb: () => mixed) => number,
	document: Document,
};

type Win = any;

type Normalized = {|
	speed: number,
	padding: number,
	color: string,
	opacity: number,
	scroll: boolean,
	flash: boolean,
	inset: number,
	pageTopMaxPx: number,
	behavior: 'smooth' | 'auto',
	timeout: number,
	observeMs: number,
	pad: boolean,
|};

type Session = {
	id: number,
	overlay: ?HTMLElement,
	overlayTimer: ?TimeoutID,
	observeTimer: ?TimeoutID,
	observer: ?MutationObserver,
	views: Array<Win>,
	rafIds: Array<number>,
};

let session: Session | null = null;
let sessionSeq = 0;

function escapeCssAttr(value: string): string {
	return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function getSearchDocuments(): Array<Document> {
	const docs: Array<Document> = [];
	if (typeof document !== 'undefined') {
		docs.push(document);
	}
	if (typeof document === 'undefined') {
		return docs;
	}
	const iframe = document.querySelector(CANVAS_IFRAME_SELECTOR);
	if (
		iframe instanceof HTMLIFrameElement &&
		iframe.contentDocument &&
		iframe.contentDocument !== document
	) {
		docs.push(iframe.contentDocument);
	}
	return docs;
}

function queryInDocuments(selector: string): ?Element {
	const docs = getSearchDocuments();
	for (let i = 0; i < docs.length; i++) {
		try {
			const el = docs[i].querySelector(selector);
			if (el) {
				return el;
			}
		} catch (e) {
			// Invalid selector.
		}
	}
	return null;
}

/**
 * Resolve a DOM node from an element, CSS selector, or block client id.
 */
export function resolveSpotlightNodeTarget(
	target: ?SpotlightNodeTarget
): ?Element {
	if (!target) {
		return null;
	}
	if (typeof Element !== 'undefined' && target instanceof Element) {
		return target;
	}
	if (typeof target === 'string') {
		return queryInDocuments(target);
	}
	if (
		typeof target === 'object' &&
		target !== null &&
		typeof target.clientId === 'string' &&
		target.clientId
	) {
		return queryInDocuments(
			`[data-block="${escapeCssAttr(target.clientId)}"]`
		);
	}
	return null;
}

function prefersReducedMotion(view: SpotlightView): boolean {
	return (
		typeof view.matchMedia === 'function' &&
		view.matchMedia('(prefers-reduced-motion: reduce)').matches
	);
}

function appendToDocument(doc: Document, node: HTMLElement): void {
	const mount = doc.body || doc.documentElement;
	if (mount) {
		mount.appendChild(node);
	}
}

function ensureSpotlightStyles(doc: Document): void {
	if (doc.getElementById(SPOTLIGHT_NODE_STYLE_ID)) {
		return;
	}
	const style = doc.createElement('style');
	style.id = SPOTLIGHT_NODE_STYLE_ID;
	style.textContent = SPOTLIGHT_CSS;
	const mount = doc.head || doc.documentElement;
	if (mount) {
		mount.appendChild(style);
	}
}

function trackView(view: Win): void {
	const current = session;
	if (!current) {
		return;
	}
	if (current.views.indexOf(view) === -1) {
		current.views.push(view);
	}
}

function clearScrollPad(view: Win): void {
	const html = view.document?.documentElement;
	if (!html || !html.hasAttribute(SPOTLIGHT_SCROLL_PAD_ATTR)) {
		return;
	}
	html.removeAttribute(SPOTLIGHT_SCROLL_PAD_ATTR);
	html.style.paddingBottom = '';
}

/**
 * Remove any in-flight overlay, observe, and canvas scroll pad.
 */
export function clearSpotlightNode(): void {
	const current = session;
	if (!current) {
		return;
	}
	session = null;
	if (current.overlayTimer != null) {
		window.clearTimeout(current.overlayTimer);
	}
	if (current.observeTimer != null) {
		window.clearTimeout(current.observeTimer);
	}
	if (current.observer) {
		current.observer.disconnect();
	}
	for (let i = 0; i < current.rafIds.length; i++) {
		if (typeof window.cancelAnimationFrame === 'function') {
			window.cancelAnimationFrame(current.rafIds[i]);
		}
	}
	if (current.overlay) {
		current.overlay.remove();
	}
	for (let i = 0; i < current.views.length; i++) {
		clearScrollPad(current.views[i]);
	}
}

function startSession(): Session {
	clearSpotlightNode();
	sessionSeq += 1;
	const next: Session = {
		id: sessionSeq,
		overlay: null,
		overlayTimer: null,
		observeTimer: null,
		observer: null,
		views: [],
		rafIds: [],
	};
	session = next;
	return next;
}

function isLive(id: number): boolean {
	return !!session && session.id === id;
}

function normalizeOptions(options?: SpotlightNodeOptions): Normalized {
	return {
		speed:
			typeof options?.speed === 'number' && options.speed > 0
				? options.speed
				: DEFAULT_SPEED,
		padding:
			typeof options?.padding === 'number' && options.padding >= 0
				? options.padding
				: DEFAULT_PADDING,
		color:
			typeof options?.color === 'string' && options.color
				? options.color
				: DEFAULT_COLOR,
		opacity:
			typeof options?.opacity === 'number'
				? Math.min(1, Math.max(0, options.opacity))
				: DEFAULT_OPACITY,
		scroll:
			typeof options?.scroll === 'boolean'
				? options.scroll
				: DEFAULT_SCROLL,
		flash:
			typeof options?.flash === 'boolean' ? options.flash : DEFAULT_FLASH,
		inset:
			typeof options?.inset === 'number' && options.inset >= 0
				? options.inset
				: DEFAULT_INSET,
		pageTopMaxPx:
			typeof options?.pageTopMaxPx === 'number' &&
			options.pageTopMaxPx >= 0
				? options.pageTopMaxPx
				: DEFAULT_PAGE_TOP_MAX_PX,
		behavior: options?.behavior === 'auto' ? 'auto' : 'smooth',
		timeout:
			typeof options?.timeout === 'number' && options.timeout > 0
				? options.timeout
				: DEFAULT_TIMEOUT,
		observeMs:
			typeof options?.observeMs === 'number' && options.observeMs >= 0
				? options.observeMs
				: DEFAULT_OBSERVE_MS,
		pad: typeof options?.pad === 'boolean' ? options.pad : DEFAULT_PAD,
	};
}

function nodeDocumentY(el: Element, view: SpotlightView): number {
	const html = view.document.documentElement;
	const scrollTop = html ? html.scrollTop : 0;
	return el.getBoundingClientRect().top + scrollTop;
}

function isDocumentScroller(scroller: Element, view: SpotlightView): boolean {
	return (
		scroller === view.document.scrollingElement ||
		scroller === view.document.documentElement ||
		scroller === view.document.body
	);
}

function findScrollableAncestor(el: Element, view: SpotlightView): Element {
	let node: any = el.parentElement;
	while (node && node !== el.ownerDocument.documentElement) {
		const overflowY = view.getComputedStyle(node).overflowY;
		const canScroll =
			overflowY === 'auto' ||
			overflowY === 'scroll' ||
			overflowY === 'overlay';
		if (canScroll && node.scrollHeight > node.clientHeight) {
			return node;
		}
		node = node.parentElement;
	}
	return (
		el.ownerDocument.scrollingElement ||
		el.ownerDocument.documentElement ||
		el
	);
}

function getScrollportTop(scroller: Element, view: SpotlightView): number {
	if (isDocumentScroller(scroller, view)) {
		return 0;
	}
	return scroller.getBoundingClientRect().top;
}

function ensureBottomScrollRoom(
	scroller: Element,
	win: Win,
	delta: number
): void {
	const maxScroll = Math.max(
		0,
		scroller.scrollHeight - scroller.clientHeight
	);
	const room = scrollRoomNeeded(delta, maxScroll);
	if (room <= 0) {
		return;
	}
	const html = win.document.documentElement;
	const prevPad =
		parseFloat(html.getAttribute(SPOTLIGHT_SCROLL_PAD_ATTR) || '0') || 0;
	const nextPad = prevPad + room;
	html.setAttribute(SPOTLIGHT_SCROLL_PAD_ATTR, String(nextPad));
	html.style.paddingBottom = `${nextPad}px`;
	trackView(win);
}

function flashOverlay(
	el: Element,
	view: SpotlightView,
	opts: Normalized,
	id: number
): void {
	if (!isLive(id) || prefersReducedMotion(view) || !opts.flash) {
		return;
	}
	const doc = el.ownerDocument;
	ensureSpotlightStyles(doc);
	if (session && session.overlay) {
		const prev = session.overlay;
		prev.remove();
		const live = session;
		if (live && live.overlay === prev) {
			live.overlay = null;
		}
	}

	const rect = el.getBoundingClientRect();
	const overlay = doc.createElement('div');
	overlay.className = SPOTLIGHT_NODE_CLASS;
	overlay.setAttribute('aria-hidden', 'true');
	overlay.setAttribute('data-test', 'blockera-spotlight-node');

	const radius = view.getComputedStyle(el).borderRadius;
	if (radius && radius !== '0px') {
		overlay.style.borderRadius = radius;
	}

	overlay.style.left = `${Math.round(rect.left) - opts.padding}px`;
	overlay.style.top = `${Math.round(rect.top) - opts.padding}px`;
	overlay.style.width = `${Math.max(1, Math.round(rect.width) + opts.padding * 2)}px`;
	overlay.style.height = `${Math.max(8, Math.round(rect.height) + opts.padding * 2)}px`;
	overlay.style.setProperty('--blockera-spotlight-node-color', opts.color);
	overlay.style.setProperty(
		'--blockera-spotlight-node-peak',
		String(opts.opacity)
	);
	overlay.style.setProperty(
		'--blockera-spotlight-node-speed',
		`${opts.speed}ms`
	);
	overlay.style.animationDuration = `${opts.speed}ms`;

	appendToDocument(doc, overlay);

	if (session && session.id === id) {
		session.overlay = overlay;
		session.overlayTimer = setTimeout(() => {
			const live = session;
			if (!isLive(id) || !live || live.overlay !== overlay) {
				return;
			}
			overlay.remove();
			live.overlay = null;
			live.overlayTimer = null;
		}, opts.speed + 50);
	}
	overlay.addEventListener(
		'animationend',
		() => {
			const live = session;
			if (!isLive(id) || !live || live.overlay !== overlay) {
				return;
			}
			overlay.remove();
			live.overlay = null;
		},
		{ once: true }
	);
}

function afterScrollSettles(
	scroller: Element,
	view: SpotlightView,
	reduceMotion: boolean,
	nextTop: number,
	timeout: number,
	id: number,
	then: () => void
): void {
	if (reduceMotion) {
		then();
		return;
	}
	let done = false;
	const started = Date.now();
	const finish = () => {
		if (done || !isLive(id)) {
			return;
		}
		done = true;
		scroller.removeEventListener('scrollend', onScrollEnd);
		const win = view.document.defaultView;
		if (win) {
			win.removeEventListener('scrollend', onScrollEnd);
		}
		const frame =
			typeof view.requestAnimationFrame === 'function'
				? view.requestAnimationFrame.bind(view)
				: window.requestAnimationFrame.bind(window);
		const raf = frame(() => {
			if (isLive(id)) {
				then();
			}
		});
		if (session && session.id === id) {
			session.rafIds.push(raf);
		}
	};
	const landed = () =>
		Math.abs(scroller.scrollTop - nextTop) <= SKIP_TOP_EPSILON_PX + 1;
	const onScrollEnd = () => {
		if (landed()) {
			finish();
		}
	};
	if (landed()) {
		finish();
		return;
	}
	let lastTop = scroller.scrollTop;
	let stableFrames = 0;
	let seenMove = false;
	const poll = () => {
		if (done || !isLive(id)) {
			return;
		}
		const top = scroller.scrollTop;
		if (Math.abs(top - lastTop) > 1) {
			seenMove = true;
			stableFrames = 0;
			lastTop = top;
		} else {
			stableFrames += 1;
		}
		if (
			landed() ||
			(seenMove && stableFrames >= 3) ||
			Date.now() - started > timeout
		) {
			finish();
			return;
		}
		const frame =
			typeof view.requestAnimationFrame === 'function'
				? view.requestAnimationFrame.bind(view)
				: window.requestAnimationFrame.bind(window);
		const raf = frame(poll);
		if (session && session.id === id) {
			session.rafIds.push(raf);
		}
	};
	scroller.addEventListener('scrollend', onScrollEnd);
	const win = view.document.defaultView;
	if (win) {
		win.addEventListener('scrollend', onScrollEnd);
	}
	poll();
}

function scrollNodeIntoView(
	el: Element,
	opts: Normalized,
	id: number
): { didScroll: boolean, nextTop: number, scroller: Element } {
	const doc = el.ownerDocument;
	const view: SpotlightView = (doc.defaultView || window: any);
	const win: Win = (doc.defaultView || window: any);
	const scroller = findScrollableAncestor(el, view);
	const rect = el.getBoundingClientRect();
	const portTop = getScrollportTop(scroller, view);
	const portBottom = isDocumentScroller(scroller, view)
		? view.innerHeight
		: scroller.getBoundingClientRect().bottom;
	const willScroll = shouldScrollSpotlightNode(
		rect.top,
		rect.bottom,
		portTop,
		portBottom
	);
	const docY = nodeDocumentY(el, view);
	const nextTop = resolveSpotlightScrollTop(
		rect.top,
		rect.bottom,
		portTop,
		portBottom,
		scroller.scrollTop,
		docY,
		opts.inset,
		opts.pageTopMaxPx
	);
	const delta = nextTop - scroller.scrollTop;
	const didScroll = willScroll && Math.abs(delta) >= SKIP_TOP_EPSILON_PX;
	if (!didScroll || !isLive(id)) {
		return { didScroll: false, nextTop, scroller };
	}

	if (opts.pad) {
		ensureBottomScrollRoom(scroller, win, delta);
	}
	const reduceMotion = prefersReducedMotion(view);
	const behavior =
		reduceMotion || opts.behavior === 'auto' ? 'auto' : 'smooth';
	const html = view.document.documentElement;
	const scrollerEl: any = scroller;
	if (typeof scrollerEl.scrollTo === 'function') {
		scrollerEl.scrollTo({ top: nextTop, behavior });
	} else {
		scrollerEl.scrollTop = nextTop;
	}
	if (
		html &&
		html !== scroller &&
		typeof (html: any).scrollTo === 'function'
	) {
		(html: any).scrollTo({ top: nextTop, behavior });
	}
	return { didScroll: true, nextTop, scroller };
}

function runFlash(
	el: Element,
	opts: Normalized,
	id: number,
	didScroll: boolean,
	scroller: Element,
	nextTop: number
): void {
	const view: SpotlightView = (el.ownerDocument.defaultView || window: any);
	if (!opts.flash) {
		return;
	}
	if (!didScroll) {
		flashOverlay(el, view, opts, id);
		return;
	}
	afterScrollSettles(
		scroller,
		view,
		prefersReducedMotion(view),
		nextTop,
		opts.timeout,
		id,
		() => {
			const live = el.isConnected ? el : null;
			if (live) {
				flashOverlay(live, view, opts, id);
			}
		}
	);
}

function armObserve(
	target: SpotlightNodeTarget,
	opts: Normalized,
	id: number,
	lastDocY: number
): void {
	if (opts.observeMs <= 0 || !session || session.id !== id) {
		return;
	}
	const startEl = resolveSpotlightNodeTarget(target);
	if (!startEl) {
		return;
	}
	const doc = startEl.ownerDocument;
	let currentDocY = lastDocY;
	let lastKey = '';

	const check = () => {
		if (!isLive(id)) {
			return;
		}
		const node = resolveSpotlightNodeTarget(target);
		if (!node || !node.isConnected) {
			return;
		}
		const view: SpotlightView = (node.ownerDocument.defaultView ||
			window: any);
		const rect = node.getBoundingClientRect();
		const docY = nodeDocumentY(node, view);
		const drifted = shouldScrollSpotlightNode(
			rect.top,
			rect.bottom,
			0,
			view.innerHeight
		);
		const contentMoved =
			!Number.isFinite(currentDocY) ||
			Math.abs(docY - currentDocY) > CONTENT_MOVE_PX;
		const key = `${Math.round(rect.top)}:${Math.round(docY)}`;
		if (drifted && contentMoved && key !== lastKey) {
			lastKey = key;
			const result = scrollNodeIntoView(node, opts, id);
			currentDocY = nodeDocumentY(node, view);
			if (result.didScroll) {
				runFlash(node, opts, id, true, result.scroller, result.nextTop);
			}
		}
	};

	const observer = new MutationObserver(() => {
		if (!isLive(id)) {
			return;
		}
		const view: SpotlightView = (doc.defaultView || window: any);
		const frame =
			typeof view.requestAnimationFrame === 'function'
				? view.requestAnimationFrame.bind(view)
				: window.requestAnimationFrame.bind(window);
		const raf = frame(check);
		if (session && session.id === id) {
			session.rafIds.push(raf);
		}
	});
	const root = doc.documentElement;
	if (root) {
		observer.observe(root, {
			childList: true,
			subtree: true,
			attributes: true,
		});
	}
	if (session && session.id === id) {
		session.observer = observer;
		session.observeTimer = setTimeout(() => {
			const live = session;
			if (!isLive(id) || !live) {
				return;
			}
			observer.disconnect();
			live.observer = null;
			live.observeTimer = null;
		}, opts.observeMs);
	}
}

/**
 * Scroll a node fully into view (optional) then flash a rectangle over it.
 * Returns a cleanup that cancels overlay, observe, and scroll pad.
 */
export function spotlightNode(
	target: ?SpotlightNodeTarget,
	options?: SpotlightNodeOptions
): () => void {
	const opts = normalizeOptions(options);
	const current = startSession();
	const id = current.id;
	const stop = () => {
		if (session && session.id === id) {
			clearSpotlightNode();
		}
	};

	const el = resolveSpotlightNodeTarget(target);
	if (!el || !el.isConnected) {
		stop();
		return () => {};
	}

	let didScroll = false;
	let nextTop = 0;
	let scroller = el;
	if (opts.scroll) {
		const result = scrollNodeIntoView(el, opts, id);
		didScroll = result.didScroll;
		nextTop = result.nextTop;
		scroller = result.scroller;
	}

	if (opts.flash) {
		// Scroll+flash: skip the overlay when the node is already fully in view.
		// Flash-only (`scroll: false`) still overlays in place.
		const skipFlashInView = opts.scroll && !didScroll;
		if (!skipFlashInView) {
			runFlash(el, opts, id, didScroll, scroller, nextTop);
		} else {
			stop();
			return () => {};
		}
	}

	if (didScroll && opts.observeMs > 0 && target) {
		const view: SpotlightView = (el.ownerDocument.defaultView ||
			window: any);
		armObserve(target, opts, id, nodeDocumentY(el, view));
	}

	if (!opts.flash && !didScroll && opts.observeMs <= 0) {
		stop();
		return () => {};
	}

	return stop;
}

export function spotlightNodeBySelector(
	selector: string,
	options?: SpotlightNodeOptions
): () => void {
	return spotlightNode(selector, options);
}

export function spotlightNodeByClientId(
	clientId: string,
	options?: SpotlightNodeOptions
): () => void {
	return spotlightNode({ clientId }, options);
}

/**
 * Returns a callback that spotlights a target. Does not run on mount.
 */
export function useSpotlightNode(
	options?: SpotlightNodeOptions
): (target: ?SpotlightNodeTarget) => () => void {
	const speed = options?.speed;
	const padding = options?.padding;
	const color = options?.color;
	const opacity = options?.opacity;
	const scroll = options?.scroll;
	const flash = options?.flash;
	const inset = options?.inset;
	const pageTopMaxPx = options?.pageTopMaxPx;
	const behavior = options?.behavior;
	const timeout = options?.timeout;
	const observeMs = options?.observeMs;
	const pad = options?.pad;

	return useCallback(
		(target: ?SpotlightNodeTarget) => {
			return spotlightNode(target, {
				speed,
				padding,
				color,
				opacity,
				scroll,
				flash,
				inset,
				pageTopMaxPx,
				behavior,
				timeout,
				observeMs,
				pad,
			});
		},
		[
			speed,
			padding,
			color,
			opacity,
			scroll,
			flash,
			inset,
			pageTopMaxPx,
			behavior,
			timeout,
			observeMs,
			pad,
		]
	);
}
