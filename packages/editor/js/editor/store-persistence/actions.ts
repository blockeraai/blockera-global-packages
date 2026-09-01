/**
 * Internal dependencies
 */
import type { SidebarLayout } from '../sidebar-layout/types';

/**
 * Action to set whether the secondary sidebar is open.
 *
 * @param {boolean} open Whether the sidebar should be open.
 * @return {Object} Action object.
 */
export function setSecondarySidebarOpen(open: boolean) {
	return {
		type: 'SET_SECONDARY_SIDEBAR_OPEN',
		open,
	};
}

/**
 * Action to toggle the secondary sidebar open state.
 *
 * @return {Object} Action object.
 */
export function toggleSecondarySidebar() {
	return {
		type: 'TOGGLE_SECONDARY_SIDEBAR_OPEN',
	};
}

/**
 * Action to set whether the primary (settings) sidebar is open (Blockera mirror; session-only).
 *
 * @param {boolean} open Whether the primary sidebar should be considered open.
 * @return {Object} Action object.
 */
export function setPrimarySidebarOpen(open: boolean) {
	return {
		type: 'SET_PRIMARY_SIDEBAR_OPEN',
		open,
	};
}

/**
 * Action to set the primary sidebar width.
 *
 * @param {string} width The width value (e.g., '300px').
 * @return {Object} Action object.
 */
export function setPrimarySidebarWidth(width: string) {
	return {
		type: 'SET_PRIMARY_SIDEBAR_WIDTH',
		width,
	};
}

/**
 * Action to set the secondary sidebar width.
 *
 * @param {string} width The width value (e.g., '350px').
 * @return {Object} Action object.
 */
export function setSecondarySidebarWidth(width: string) {
	return {
		type: 'SET_SECONDARY_SIDEBAR_WIDTH',
		width,
	};
}

/**
 * Action to set the list view height.
 *
 * @param {string} height The height value as percentage (e.g., '50%').
 * @return {Object} Action object.
 */
export function setListViewHeight(height: string) {
	return {
		type: 'SET_LIST_VIEW_HEIGHT',
		height,
	};
}

/**
 * Action to set movable sidebar section placement.
 *
 * @param {Object} layout Dock and order for inserter, list view, and settings.
 * @return {Object} Action object.
 */
export function setSidebarLayout(layout: SidebarLayout) {
	return {
		type: 'SET_SIDEBAR_LAYOUT',
		layout,
	};
}

/**
 * Action to set stacked pane heights for one dock.
 *
 * @param {'left'|'right'} dock Which dock.
 * @param {string[]} heights Percentage strings that match pane count.
 * @return {Object} Action object.
 */
export function setDockPaneHeights(dock: 'left' | 'right', heights: string[]) {
	return {
		type: 'SET_DOCK_PANE_HEIGHTS',
		dock,
		heights,
	};
}

/**
 * Action to move a sidebar section to a dock insert index.
 *
 * @param {string} sectionId Section to move.
 * @param {'left'|'right'} dock Target dock.
 * @param {number} insertIndex Band index in the target dock.
 * @return {Object} Action object.
 */
export function moveSidebarSection(
	sectionId: 'inserter' | 'listView' | 'complementary',
	dock: 'left' | 'right',
	insertIndex: number
) {
	return {
		type: 'MOVE_SIDEBAR_SECTION',
		sectionId,
		dock,
		insertIndex,
	};
}
