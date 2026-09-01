/**
 * WordPress dependencies
 */
import { useSelect } from '@wordpress/data';

/**
 * Internal dependencies
 */
import { store as blockeraEditorStore } from '../../store-persistence';
import SidebarDock from '../../sidebar-layout/SidebarDock';
import { useSidebarDrag } from '../../sidebar-layout/useSidebarDrag';

/**
 * Left dock: inserter, list view, and/or settings as stacked panes.
 */
export default function SecondarySidebar() {
	const drag = useSidebarDrag();
	const isSidebarVisible = useSelect((select) => {
		const storeSelect = select(blockeraEditorStore) as {
			isSecondarySidebarOpen: () => boolean;
		};
		return storeSelect.isSecondarySidebarOpen();
	}, []);

	return (
		<SidebarDock dock="left" isDockOpen={isSidebarVisible || !!drag} />
	);
}
