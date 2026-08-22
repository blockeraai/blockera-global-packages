// @flow

/**
 * WordPress Site Editor (`site-editor.php`) URL helpers.
 */

export const SITE_EDITOR_PATH = 'site-editor.php';

/** Default Site Editor router path (`p` query arg) for the design/home root. */
export const SITE_EDITOR_ROOT_PATH = '/';

/**
 * Whether the current window location is the WordPress Site Editor.
 *
 * @return {boolean} True when pathname includes `site-editor.php`.
 */
export function isSiteEditorUrl(): boolean {
	if (typeof window === 'undefined') {
		return false;
	}

	return window.location.pathname.includes(SITE_EDITOR_PATH);
}
