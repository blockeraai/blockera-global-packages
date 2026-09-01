/**
 * Internal dependencies
 */
import type { SidebarLayout, SidebarSectionId } from './types';

export const SIDEBAR_SECTION_IDS: SidebarSectionId[] = [
	'inserter',
	'listView',
	'complementary',
];

export const DEFAULT_SIDEBAR_LAYOUT: SidebarLayout = {
	inserter: { dock: 'left', order: 0 },
	listView: { dock: 'left', order: 1 },
	complementary: { dock: 'right', order: 0 },
};

export const MIN_PANE_PERCENT = 15;

export const REVEAL_THIRD_ZONE_PX = 20;
