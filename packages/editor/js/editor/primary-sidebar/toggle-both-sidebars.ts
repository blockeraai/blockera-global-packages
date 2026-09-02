/**
 * WordPress dependencies
 */
import { dispatch, select } from '@wordpress/data';

/**
 * Internal dependencies
 */
import { store as blockeraEditorStore } from '../store-persistence';
import { closeDock, openDock } from '../sidebar-layout/dock-bridge';

/**
 * "Toggle both" shortcut behavior (Blockera-only reads):
 * - If both sidebars are closed → open both docks.
 * - If either or both are open → close both docks.
 */
export function toggleBothSidebars(): void {
	const storeSelect = select(blockeraEditorStore) as {
		areBothSidebarsClosed: () => boolean;
	};

	if (storeSelect.areBothSidebarsClosed()) {
		openDock('left');
		openDock('right');
	} else {
		closeDock('left');
		closeDock('right');
	}
}
