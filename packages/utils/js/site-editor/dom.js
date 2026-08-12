// @flow

/**
 * Site Editor DOM helpers (core sidebar chrome).
 */

export const SITE_EDITOR_SIDEBAR_SCREEN_WRAPPER_SELECTOR =
	'.edit-site-layout__sidebar .edit-site-sidebar__screen-wrapper';

/**
 * Trigger SPA navigation by clicking a hidden core Design nav item.
 *
 * @param {string} uid Element `id` (core `SidebarNavigationItem` uid).
 */
export function clickCoreNavItem(uid: string): void {
	if (typeof document === 'undefined') {
		return;
	}

	const el = document.getElementById(uid);
	if (el instanceof HTMLElement) {
		el.click();
	}
}

/**
 * Strip core slide classes from the sidebar screen wrapper.
 *
 * Core `SidebarContentWrapper` may apply a stale
 * `SidebarNavigationContext` direction (`slide-from-right` / `slide-from-left`)
 * when `shouldAnimate` is true. Callers that animate their own screens should
 * clear these so core's classes do not fight custom enter animations.
 */
export function clearCoreSidebarSlideClasses(): void {
	if (typeof document === 'undefined') {
		return;
	}

	const wrapper = document.querySelector(
		SITE_EDITOR_SIDEBAR_SCREEN_WRAPPER_SELECTOR
	);

	if (!(wrapper instanceof HTMLElement)) {
		return;
	}

	wrapper.classList.remove('slide-from-right', 'slide-from-left');
}
