// @flow

/**
 * Site Editor router `p` path helpers.
 */

/**
 * External dependencies
 */
import { getQueryArg } from '@wordpress/url';

/**
 * Internal dependencies
 */
import { SITE_EDITOR_ROOT_PATH } from './is-url';
import { pushSiteEditorHistory } from './push-history';

/**
 * Current Site Editor router path from the `p` query arg (e.g. `/styles`).
 *
 * @return {string} Normalized `p` path, or `SITE_EDITOR_ROOT_PATH` when missing.
 */
export function getSiteEditorPath(): string {
	if (typeof window === 'undefined') {
		return SITE_EDITOR_ROOT_PATH;
	}

	const p = getQueryArg(window.location.href, 'p');
	if (typeof p === 'string' && p.length > 0) {
		return p.split('?')[0] || SITE_EDITOR_ROOT_PATH;
	}

	return SITE_EDITOR_ROOT_PATH;
}

/**
 * Whether `path` is the Site Editor home/root (`/`).
 *
 * @param {string} [path] Router path; defaults to the current `p` arg.
 * @return {boolean} True when the normalized path is `/`.
 */
export function isSiteEditorRootPath(
	path: string = getSiteEditorPath()
): boolean {
	const normalized = path.split('?')[0] || SITE_EDITOR_ROOT_PATH;

	return normalized === SITE_EDITOR_ROOT_PATH;
}

/**
 * Navigate to a Site Editor `p` path (e.g. `/identity`, `/homepage`).
 *
 * Uses the same `p` query pattern as core. See `pushSiteEditorHistory`.
 *
 * @param {string} path Site Editor `p` path.
 */
export function navigateToSiteEditorPath(path: string): void {
	pushSiteEditorHistory({ p: path });
}
