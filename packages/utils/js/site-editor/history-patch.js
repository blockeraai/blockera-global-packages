// @flow

/**
 * Subscribe to Site Editor SPA navigations (core router + Blockera pushes).
 *
 * `@wordpress/router` keeps a private `history@5` singleton and updates the URL
 * via `history.push` / `replace` without always firing `popstate`. Patching
 * `pushState` / `replaceState` once and emitting a custom event lets listeners
 * see those navigations too.
 *
 * The same patch keeps `/` and `:` literal in the query (Gutenberg
 * `buildQueryString` percent-encodes them). The current address bar is
 * rewritten once on install so the first paint is clean, not only after the
 * next SPA write.
 *
 * Side-effecting by design. The `pushState` / `replaceState` patch is
 * process-wide and is not undone on unsubscribe (only the `popstate`
 * listener is removed).
 */

/**
 * External dependencies
 */
import { useEffect } from '@wordpress/element';

/**
 * Internal dependencies
 */
import { isSiteEditorUrl } from './is-url';
import { withLiteralQueryChars } from './query-chars';

/** Fired after SPA history changes (patched push/replace + popstate). */
export const SITE_EDITOR_NAVIGATE_EVENT = 'blockera-site-editor-navigate';

let historyPatched: boolean = false;
let originalPushState: Function | null = null;
let originalReplaceState: Function | null = null;

function currentLocationHref(): string {
	return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

/**
 * Rewrite the current address bar without a navigation event.
 */
function replaceCurrentLocationQueryChars(): void {
	if (typeof window === 'undefined') {
		return;
	}

	const href = currentLocationHref();
	const next = withLiteralQueryChars(href);
	if (next === href) {
		return;
	}

	const replace = originalReplaceState || window.history.replaceState;
	replace.call(window.history, window.history.state, '', next);
}

function wrapHistoryWrite(original: Function | null): Function {
	return function (this: History, ...args) {
		if (typeof args[2] === 'string') {
			args[2] = withLiteralQueryChars(args[2]);
		}
		const result = original
			? original.apply(window.history, args)
			: undefined;
		window.dispatchEvent(new CustomEvent(SITE_EDITOR_NAVIGATE_EVENT));
		return result;
	};
}

/**
 * Wrap `pushState` / `replaceState` once and clean the current URL.
 */
function installSiteEditorHistoryPatch(): void {
	if (typeof window === 'undefined') {
		return;
	}

	if (!historyPatched) {
		originalPushState = window.history.pushState;
		originalReplaceState = window.history.replaceState;
		window.history.pushState = wrapHistoryWrite(originalPushState);
		window.history.replaceState = wrapHistoryWrite(originalReplaceState);
		historyPatched = true;
	}

	replaceCurrentLocationQueryChars();
}

/**
 * Patch history once; notify listeners on SPA navigations (incl. core router).
 *
 * @return {Function} Unsubscribe the `popstate` listener added by this call.
 */
export function ensureSiteEditorHistoryPatch(): () => void {
	if (typeof window === 'undefined') {
		return () => {};
	}

	installSiteEditorHistoryPatch();

	const emit = () => {
		window.dispatchEvent(new CustomEvent(SITE_EDITOR_NAVIGATE_EVENT));
	};

	window.addEventListener('popstate', emit);

	return () => {
		window.removeEventListener('popstate', emit);
	};
}

if (typeof window !== 'undefined' && isSiteEditorUrl()) {
	installSiteEditorHistoryPatch();
}

/**
 * Subscribe to Site Editor URL changes (core router + Blockera SPA navigate).
 *
 * No-ops when the current window is not the Site Editor. Calls `listener`
 * once on subscribe, then on every patched history change.
 *
 * @param {Function} listener Called on mount and after each SPA navigation.
 */
export function useSiteEditorNavigate(listener: () => void): void {
	useEffect(() => {
		if (!isSiteEditorUrl()) {
			return;
		}

		const removePop = ensureSiteEditorHistoryPatch();
		const onNavigate = () => listener();
		window.addEventListener(SITE_EDITOR_NAVIGATE_EVENT, onNavigate);
		onNavigate();

		return () => {
			window.removeEventListener(SITE_EDITOR_NAVIGATE_EVENT, onNavigate);
			removePop();
		};
	}, [listener]);
}
