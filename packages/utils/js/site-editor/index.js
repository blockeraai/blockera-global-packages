// @flow

/**
 * WordPress Site Editor (`site-editor.php`) helpers.
 *
 * URL detection, Gutenberg-router-compatible SPA history (write + subscribe),
 * `p` path helpers, and core sidebar DOM utilities.
 */

export {
	SITE_EDITOR_PATH,
	SITE_EDITOR_ROOT_PATH,
	isSiteEditorUrl,
} from './is-url';
export { pushSiteEditorHistory } from './push-history';
export { withLiteralQueryChars } from './query-chars';
export {
	SITE_EDITOR_NAVIGATE_EVENT,
	ensureSiteEditorHistoryPatch,
	useSiteEditorNavigate,
} from './history-patch';
export { useSiteEditorUrlState } from './use-url-state';
export {
	getSiteEditorPath,
	isSiteEditorRootPath,
	navigateToSiteEditorPath,
} from './path';
export {
	SITE_EDITOR_SIDEBAR_SCREEN_WRAPPER_SELECTOR,
	clickCoreNavItem,
	clearCoreSidebarSlideClasses,
} from './dom';
