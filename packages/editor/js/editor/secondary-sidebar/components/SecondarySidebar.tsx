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

type SecondarySidebarProps = {
	/** Keep dock mounted during wrapper close animation (parent drives clip). */
	isDockOpen?: boolean;
};

/**
 * Left dock: inserter, list view, and/or settings as stacked panes.
 */
export default function SecondarySidebar({
	isDockOpen,
}: SecondarySidebarProps) {
	const drag = useSidebarDrag();
	const isSidebarVisible = useSelect((select) => {
		const storeSelect = select(blockeraEditorStore) as {
			isSecondarySidebarOpen: () => boolean;
		};
		return storeSelect.isSecondarySidebarOpen();
	}, []);

	const dockOpen = isDockOpen ?? (isSidebarVisible || !!drag);

	return <SidebarDock dock="left" isDockOpen={dockOpen} />;
}
