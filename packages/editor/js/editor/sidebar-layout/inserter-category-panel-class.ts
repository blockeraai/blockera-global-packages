/**
 * WordPress dependencies
 */
import { useLayoutEffect } from '@wordpress/element';
import type { RefObject } from 'react';

export const INSERTER_CATEGORY_PANEL_CLASS = 'has-inserter-category-panel';

const MENU_SELECTOR = '.block-editor-inserter__menu';
const SHOW_PANEL_CLASS = 'show-panel';
const INSERTER_PANE_SELECTOR = '[data-test="blockera-sidebar-pane-inserter"]';
const CONTENT_SELECTOR =
	'.blockera-primary-sidebar-content, .blockera-secondary-sidebar-content';
const SLIDE_HOST_SELECTOR =
	'.interface-interface-skeleton__primary-sidebar-blockera, .interface-interface-skeleton__secondary-sidebar-blockera';

function toggleClass(
	element: Element | null | undefined,
	isOpen: boolean
): void {
	if (!(element instanceof HTMLElement)) {
		return;
	}

	element.classList.toggle(INSERTER_CATEGORY_PANEL_CLASS, isOpen);
}

/**
 * Mirror Gutenberg's inserter `show-panel` onto dock hosts so layout CSS does
 * not use :has() on every inspector mutation.
 */
export function applyInserterCategoryPanelClass(
	dock: HTMLElement | null,
	forceClosed = false
): boolean {
	if (!dock) {
		return false;
	}

	const isOpen =
		!forceClosed &&
		!!dock.querySelector(MENU_SELECTOR)?.classList.contains(SHOW_PANEL_CLASS);

	toggleClass(dock, isOpen);
	toggleClass(dock.closest(CONTENT_SELECTOR), isOpen);
	toggleClass(dock.closest(SLIDE_HOST_SELECTOR), isOpen);

	return isOpen;
}

export function useInserterCategoryPanelClass(
	dockRef: RefObject<HTMLElement | null>,
	enabled: boolean
): void {
	useLayoutEffect(() => {
		const dock = dockRef.current;
		if (!dock || !enabled) {
			applyInserterCategoryPanelClass(dock, true);
			return;
		}

		const apply = () => {
			applyInserterCategoryPanelClass(dock);
		};

		const menuObserver = new MutationObserver(apply);
		const attachMenuObserver = () => {
			menuObserver.disconnect();
			const menu = dock.querySelector(MENU_SELECTOR);
			if (menu) {
				menuObserver.observe(menu, {
					attributes: true,
					attributeFilter: ['class'],
				});
			}
			apply();
		};

		attachMenuObserver();
		const inserterPane = dock.querySelector(INSERTER_PANE_SELECTOR);
		const mountObserver = new MutationObserver(attachMenuObserver);
		if (inserterPane) {
			mountObserver.observe(inserterPane, { childList: true });
		}

		return () => {
			menuObserver.disconnect();
			mountObserver.disconnect();
			applyInserterCategoryPanelClass(dock, true);
		};
	}, [dockRef, enabled]);
}
