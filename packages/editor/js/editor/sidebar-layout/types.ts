export type SidebarDockId = 'left' | 'right';

export type SidebarSectionId = 'inserter' | 'listView' | 'complementary';

export type SidebarSectionPlacement = {
	dock: SidebarDockId;
	order: number;
};

export type SidebarLayout = Record<SidebarSectionId, SidebarSectionPlacement>;
