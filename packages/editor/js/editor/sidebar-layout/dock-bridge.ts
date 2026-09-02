/**
 * WordPress dependencies
 */
import { dispatch, select, subscribe } from '@wordpress/data';
import { store as editorStore } from '@wordpress/editor';

/**
 * Internal dependencies
 */
import { store as blockeraEditorStore } from '../store-persistence';
import { DEFAULT_SIDEBAR_LAYOUT, SIDEBAR_CLIP_TRANSITION_MS } from './constants';
import { getSectionDock } from './layout';
import type { SidebarDockId, SidebarLayout, SidebarSectionId } from './types';

type BlockeraEditorSelect = {
	getSidebarLayout?: () => SidebarLayout;
	isSecondarySidebarOpen: () => boolean;
	isPrimarySidebarOpen: () => boolean;
};

type BlockeraEditorDispatch = {
	setSecondarySidebarOpen: (open: boolean) => void;
	setPrimarySidebarOpen: (open: boolean) => void;
};

type InterfaceSelect = {
	getActiveComplementaryArea?: (scope: string) => string | null | undefined;
};

type InterfaceDispatch = {
	enableComplementaryArea: (scope: string, id: string) => void;
	disableComplementaryArea: (scope: string) => void;
};

type EditorSelect = {
	isInserterOpened?: () => boolean;
	isListViewOpened?: () => boolean;
};

type EditorDispatch = {
	setIsInserterOpened?: (value: boolean) => void;
	setIsListViewOpened?: (value: boolean) => void;
};

let applyingComplementary = false;
let complementaryCloseTimeout = 0;

function cancelDeferredComplementaryClose(): void {
	if (complementaryCloseTimeout) {
		window.clearTimeout(complementaryCloseTimeout);
		complementaryCloseTimeout = 0;
	}
}

function getLayout(): SidebarLayout {
	const storeSelect = select(blockeraEditorStore) as BlockeraEditorSelect;
	return storeSelect.getSidebarLayout?.() ?? DEFAULT_SIDEBAR_LAYOUT;
}

function persistenceSelect(): BlockeraEditorSelect {
	return select(blockeraEditorStore) as BlockeraEditorSelect;
}

function persistenceDispatch(): BlockeraEditorDispatch {
	return dispatch(blockeraEditorStore) as BlockeraEditorDispatch;
}

function isDockOpen(dock: SidebarDockId): boolean {
	const storeSelect = persistenceSelect();
	return dock === 'left'
		? storeSelect.isSecondarySidebarOpen()
		: storeSelect.isPrimarySidebarOpen();
}

function setDockOpen(dock: SidebarDockId, open: boolean): void {
	if (isDockOpen(dock) === open) {
		return;
	}

	const storeDispatch = persistenceDispatch();
	if (dock === 'left') {
		storeDispatch.setSecondarySidebarOpen(open);
		return;
	}

	storeDispatch.setPrimarySidebarOpen(open);
}

function applyComplementaryForDock(dock: SidebarDockId, open: boolean): void {
	if (getSectionDock(getLayout(), 'complementary') !== dock) {
		return;
	}

	const interfaceSelect = select('core/interface') as InterfaceSelect;
	const interfaceDispatch = dispatch('core/interface') as InterfaceDispatch;
	const active = interfaceSelect.getActiveComplementaryArea?.('core');

	applyingComplementary = true;
	try {
		if (open) {
			if (!active) {
				interfaceDispatch.enableComplementaryArea?.(
					'core',
					'edit-post/document'
				);
			}
		} else if (active) {
			interfaceDispatch.disableComplementaryArea?.('core');
		}
	} finally {
		applyingComplementary = false;
	}
}

/**
 * Opens a physical left or right dock and shows every pane assigned to it.
 */
export function openDock(dock: SidebarDockId): void {
	cancelDeferredComplementaryClose();
	applyComplementaryForDock(dock, true);
	setDockOpen(dock, true);
}

/**
 * Closes a physical left or right dock (all panes in that dock).
 */
export function closeDock(dock: SidebarDockId): void {
	const complementaryOnThisDock =
		getSectionDock(getLayout(), 'complementary') === dock;

	setDockOpen(dock, false);

	if (!complementaryOnThisDock) {
		return;
	}

	cancelDeferredComplementaryClose();
	// Keep Gutenberg settings mounted until the dock clip finishes so the
	// overlay does not flash empty columns while the wrapper width is still
	// animating (including when this dock is the left sidebar).
	complementaryCloseTimeout = window.setTimeout(() => {
		complementaryCloseTimeout = 0;
		if (
			!isDockOpen(dock) &&
			getSectionDock(getLayout(), 'complementary') === dock
		) {
			applyComplementaryForDock(dock, false);
		}
	}, SIDEBAR_CLIP_TRANSITION_MS);
}

/**
 * Toggles a physical left or right dock.
 */
export function toggleDock(dock: SidebarDockId): void {
	const wasOpen = isDockOpen(dock);
	if (wasOpen) {
		closeDock(dock);
	} else {
		openDock(dock);
	}
}

/**
 * Opens the dock that currently hosts the given panel.
 */
export function openSection(sectionId: SidebarSectionId): void {
	openDock(getSectionDock(getLayout(), sectionId));
}

/**
 * Closes the entire dock that currently hosts the given panel.
 */
export function closeSection(sectionId: SidebarSectionId): void {
	closeDock(getSectionDock(getLayout(), sectionId));
}

/**
 * Maps Gutenberg inserter / list view / complementary APIs onto Blockera docks.
 * Keeps core's native secondary sidebars closed.
 */
export function subscribeEditorSidebarApis(): () => void {
	let prevComplementary: string | null | undefined;
	let primedComplementary = false;

	try {
		prevComplementary = (
			select('core/interface') as InterfaceSelect
		).getActiveComplementaryArea?.('core');
	} catch {
		prevComplementary = null;
	}

	return subscribe(() => {
		try {
			const editorSelect = select(editorStore) as EditorSelect;
			const editorDispatch = dispatch(editorStore) as EditorDispatch;
			const interfaceSelect = select('core/interface') as InterfaceSelect;
			const complementary =
				interfaceSelect.getActiveComplementaryArea?.('core') ?? null;

			if (editorSelect?.isInserterOpened?.()) {
				openSection('inserter');
				editorDispatch.setIsInserterOpened?.(false);
			}

			if (editorSelect?.isListViewOpened?.()) {
				openSection('listView');
				editorDispatch.setIsListViewOpened?.(false);
			}

			if (!primedComplementary) {
				primedComplementary = true;
				if (complementary && !applyingComplementary) {
					openSection('complementary');
				}
				prevComplementary = complementary;
			} else if (!applyingComplementary) {
				if (complementary && !prevComplementary) {
					openSection('complementary');
				} else if (!complementary && prevComplementary) {
					closeSection('complementary');
				}
				prevComplementary = complementary;
			} else {
				prevComplementary = complementary;
			}
		} catch {
			// Editor stores may be unavailable outside canvas edit.
		}
	});
}
