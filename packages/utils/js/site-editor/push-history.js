// @flow

/**
 * Gutenberg-router-compatible SPA history writer for the Site Editor.
 *
 * `@wordpress/router` keeps a private `createBrowserHistory()` singleton
 * (`history@5`). That instance is not exported, so outside code cannot call
 * `useHistory().navigate()` without unlocking private APIs and being inside
 * `RouterProvider`.
 *
 * This helper updates the URL with `pushState` using the `history@5` state
 * shape (`usr` / `key` / `idx`) and dispatches `popstate` so that singleton
 * re-reads location and rematches routes (when no navigation blockers are
 * active). Side-effecting by design — the only public way to talk to the
 * router from outside its React tree.
 *
 * Isolated here so a future `history` package upgrade has a single fix site.
 */

/**
 * External dependencies
 */
import { addQueryArgs } from '@wordpress/url';

/**
 * Internal dependencies
 */
import { withLiteralQueryChars } from './query-chars';

type QueryValue = string | void;

type RouterHistoryState = {
	usr?: mixed,
	key?: string,
	idx?: number,
	...
};

type PushSiteEditorHistoryOptions = {
	/**
	 * Query keys removed when empty / `'undefined'` after the merge
	 * (keeps URLs clean).
	 */
	scrubKeys?: $ReadOnlyArray<string>,
};

/**
 * Merge `nextQuery` onto the current URL and push it via SPA history.
 *
 * @param {Object} nextQuery Query args to merge (value `undefined` removes).
 * @param {Object} [options]
 * @param {Array<string>} [options.scrubKeys] Keys stripped when empty / `'undefined'`.
 */
export function pushSiteEditorHistory(
	nextQuery: { [string]: QueryValue },
	options?: PushSiteEditorHistoryOptions
): void {
	if (typeof window === 'undefined') {
		return;
	}

	const absoluteUrl = addQueryArgs(window.location.href, nextQuery);
	let nextUrl = absoluteUrl;

	try {
		const parsed = new URL(absoluteUrl);
		(options?.scrubKeys || []).forEach((key) => {
			const value = parsed.searchParams.get(key);
			if (!value || value === 'undefined') {
				parsed.searchParams.delete(key);
			}
		});
		nextUrl = withLiteralQueryChars(
			`${parsed.pathname}${parsed.search}${parsed.hash}`
		);
	} catch (_e) {
		nextUrl = withLiteralQueryChars(absoluteUrl);
	}

	const prevState: RouterHistoryState =
		typeof window.history.state === 'object' && window.history.state
			? window.history.state
			: {};
	const nextIdx =
		typeof prevState.idx === 'number' ? prevState.idx + 1 : 0;

	window.history.pushState(
		{
			...prevState,
			usr: prevState.usr ?? null,
			key: Math.random().toString(36).slice(2, 10),
			idx: nextIdx,
		},
		'',
		nextUrl
	);
	window.dispatchEvent(new Event('popstate'));
}
