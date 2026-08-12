// @flow

/**
 * Subscribe to Site Editor SPA navigations (core router + Blockera pushes).
 *
 * `@wordpress/router` updates the URL via `history.push` / `replace` without
 * always firing `popstate`. Patching `pushState` / `replaceState` once and
 * emitting a custom event lets listeners see those navigations too.
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

/** Fired after SPA history changes (patched push/replace + popstate). */
export const SITE_EDITOR_NAVIGATE_EVENT = 'blockera-site-editor-navigate';

let historyPatched: boolean = false;
let originalPushState: Function | null = null;
let originalReplaceState: Function | null = null;

/**
 * Patch history once; notify listeners on SPA navigations (incl. core router).
 *
 * @return {Function} Unsubscribe the `popstate` listener added by this call.
 */
export function ensureSiteEditorHistoryPatch(): () => void {
	if (typeof window === 'undefined') {
		return () => {};
	}

	const emit = () => {
		window.dispatchEvent(new CustomEvent(SITE_EDITOR_NAVIGATE_EVENT));
	};

	if (!historyPatched) {
		originalPushState = window.history.pushState;
		originalReplaceState = window.history.replaceState;

		window.history.pushState = function (this: History, ...args) {
			const push = originalPushState;
			const result = push ? push.apply(window.history, args) : undefined;
			emit();
			return result;
		};
		window.history.replaceState = function (this: History, ...args) {
			const replace = originalReplaceState;
			const result = replace
				? replace.apply(window.history, args)
				: undefined;
			emit();
			return result;
		};

		historyPatched = true;
	}

	window.addEventListener('popstate', emit);

	return () => {
		window.removeEventListener('popstate', emit);
	};
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
