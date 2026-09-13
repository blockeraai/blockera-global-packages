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

/**
 * Clears the expanded-width class from the dock that contains `fromNode`.
 * Closing remounts the Gutenberg library, so the class must drop even before
 * the new menu is observed.
 */
export function clearInserterCategoryPanelClass(
	fromNode: HTMLElement | null
): void {
	const dock = fromNode?.closest('.blockera-sidebar-dock');
	if (dock instanceof HTMLElement) {
		applyInserterCategoryPanelClass(dock, true);
	}
}

/**
 * Watch the inserter pane subtree so remounting the library (close) still
 * clears the expanded dock width. Observing only the menu node misses that
 * because the old menu is replaced, not class-toggled.
 */
export function observeInserterCategoryPanelClass(
	dock: HTMLElement
): () => void {
	const apply = () => {
		applyInserterCategoryPanelClass(dock);
	};
	const observer = new MutationObserver(apply);
	const inserterPane = dock.querySelector(INSERTER_PANE_SELECTOR);
	observer.observe(inserterPane ?? dock, {
		subtree: true,
		childList: true,
		attributes: true,
		attributeFilter: ['class'],
	});
	apply();

	return () => {
		observer.disconnect();
		applyInserterCategoryPanelClass(dock, true);
	};
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

		return observeInserterCategoryPanelClass(dock);
	}, [dockRef, enabled]);
}
