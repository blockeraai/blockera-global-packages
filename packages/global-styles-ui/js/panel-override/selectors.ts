/**
 * DOM integration points for overriding the WordPress Global Styles panel.
 *
 * WordPress 7.1+ classes use `global-styles-ui-*` / `editor-global-styles-sidebar*`
 * (editor package). Pre-7.1 `edit-site-global-styles-*` hooks are not supported.
 */
export type GlobalStylesPanelSelectors = {
	navigatorScreen: string;
	navigatorProvider: string;
	screenRoot: string;
	activeStyleTile: string;
	globalStylesScreen: string;
	screenBody: string;
	screenHeader: string;
	headerDescription: string;
	sidebarHeaderTitle: string;
	blockTypesSearch: string;
	blockTypesItemList: string;
	blockPreviewPanel: string;
	blocksButton: string;
	blockScreenListItem: string;
	blockTypesSearchInput: string;
	styleBookIframe: string;
	presetPanelMount: string;
	navigatorBackButton: string;
	globalStylesSidebarButton: string;
};

const SELECTORS: GlobalStylesPanelSelectors = {
	navigatorScreen: '.global-styles-ui-sidebar__navigator-screen',
	navigatorProvider: '.global-styles-ui-sidebar__navigator-provider',
	screenRoot: '.global-styles-ui-screen-root',
	activeStyleTile: '.global-styles-ui-screen-root__active-style-tile',
	// Blocks list screen marker (SearchControl). Not present on per-block style screens.
	globalStylesScreen: '.global-styles-ui-block-types-search',
	screenBody: '.global-styles-ui-screen-body',
	screenHeader: '.global-styles-ui-header',
	headerDescription: '.global-styles-ui-header__description',
	sidebarHeaderTitle: '.editor-global-styles-sidebar__header-title',
	blockTypesSearch: '.global-styles-ui-block-types-search',
	blockTypesItemList: '.global-styles-ui-block-types-item-list',
	blockPreviewPanel: '.global-styles-ui__block-preview-panel',
	blocksButton: 'button[id="/blocks"]',
	blockScreenListItem:
		'button[id^="/blocks/core%2F"]:not([id*="/variations/"])',
	blockTypesSearchInput:
		'.global-styles-ui-block-types-search input[type="search"]',
	styleBookIframe: 'iframe.editor-style-book__iframe',
	presetPanelMount:
		'.global-styles-ui-sidebar__navigator-screen .global-styles-ui-screen-body div[data-wp-component="VStack"]',
	navigatorBackButton: 'button[data-wp-component="Navigator.BackButton"]',
	globalStylesSidebarButton:
		'button[aria-controls="edit-site:global-styles"]',
};

/**
 * Backward-compatible alias used by the editor package `getTargets` API.
 */
export type GlobalStylesPanelTargets = GlobalStylesPanelSelectors & {
	/** @deprecated Use `navigatorScreen`. Kept for legacy editor integrations. */
	screen: string;
};

const toPanelTargets = (
	selectors: GlobalStylesPanelSelectors
): GlobalStylesPanelTargets => ({
	...selectors,
	screen: selectors.navigatorScreen,
});

/**
 * Selector map for Global Styles panel DOM integration (WordPress 7.1+).
 *
 * @param {string} [_version] Unused. Callers may still pass WordPress version.
 */
export const getGlobalStylesPanelSelectors = (
	_version = ''
): GlobalStylesPanelSelectors => ({ ...SELECTORS });

/**
 * Editor-facing selector bundle (extends legacy `getTargets` return shape).
 */
export const getGlobalStylesPanelTargets = (
	version = ''
): GlobalStylesPanelTargets =>
	toPanelTargets(getGlobalStylesPanelSelectors(version));

/**
 * Query the first element matching a Global Styles panel selector.
 */
export const queryGlobalStylesPanelElement = <
	K extends keyof GlobalStylesPanelSelectors,
>(
	key: K
): Element | null => document.querySelector(SELECTORS[key]);

/**
 * Selector string for a Global Styles panel node (WordPress 7.1+).
 */
export const getDualGlobalStylesSelector = (
	key: keyof GlobalStylesPanelSelectors
): string => SELECTORS[key];

/**
 * Style Book block example id (`example-{blockName}`) — stable across WP versions.
 */
export const getStyleBookBlockExampleSelector = (blockName: string): string =>
	`[id="example-${blockName}"]`;

/**
 * Returns the visible Global Styles navigator screen (WP mounts one per route).
 */
export const queryActiveGlobalStylesNavigatorScreen = (): Element | null => {
	const screens = document.querySelectorAll(
		getDualGlobalStylesSelector('navigatorScreen')
	);

	for (const screen of screens) {
		if (!(screen instanceof HTMLElement)) {
			continue;
		}

		if (screen.hasAttribute('hidden')) {
			continue;
		}

		if (screen.getAttribute('aria-hidden') === 'true') {
			continue;
		}

		const { display, visibility } = getComputedStyle(screen);

		if (display === 'none' || visibility === 'hidden') {
			continue;
		}

		return screen;
	}

	return queryGlobalStylesPanelElement('navigatorScreen');
};

/**
 * Locate the Style Book iframe (WordPress 7.1 editor package).
 */
export const queryStyleBookIframe = (): HTMLIFrameElement | null => {
	const iframe = document.querySelector(
		getDualGlobalStylesSelector('styleBookIframe')
	);

	return iframe instanceof HTMLIFrameElement ? iframe : null;
};
