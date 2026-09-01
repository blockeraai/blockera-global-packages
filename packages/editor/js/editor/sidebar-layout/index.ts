export { default as SidebarDock } from './SidebarDock';
export { DEFAULT_SIDEBAR_LAYOUT } from './constants';
export {
	getDockSections,
	getVisibleDockSections,
	moveSection,
	dropIndexFromY,
	migrateLayoutState,
} from './layout';
export type {
	SidebarDockId,
	SidebarLayout,
	SidebarSectionId,
} from './types';
