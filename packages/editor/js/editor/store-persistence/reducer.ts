/**
 * Internal dependencies
 */
import editorPersistenceDefaultsJson from '../../../php/data/editor-persistence-defaults.json';
import type { PersistenceLayer } from './persistence';
import type { SidebarDockId, SidebarLayout, SidebarSectionId } from '../sidebar-layout/types';
import {
	getDockSections,
	heightsAfterMove,
	listViewHeightFromLayout,
	migrateLayoutState,
	moveSection,
	normalizeSidebarLayout,
} from '../sidebar-layout/layout';

/**
 * Blockera dependencies
 */
import { localStorage } from '@blockera/storage';

/**
 * Type definition for store state.
 */
export type StoreState = {
	secondarySidebarOpen: boolean;
	/** Session UI only (not persisted): mirrors WP complementary area for primary/settings sidebar. */
	primarySidebarOpen: boolean;
	primarySidebarWidth: string;
	secondarySidebarWidth: string;
	listViewHeight: string;
	sidebarLayout: SidebarLayout;
	leftDockPaneHeights: string[];
	rightDockPaneHeights: string[];
};

/**
 * Shared defaults file: packages/editor/php/data/editor-persistence-defaults.json
 * (loaded at build time here; PHP reads the same file for window.blockeraEditorPersistenceDefaults).
 */
export function getDefaults(): StoreState {
	const base: StoreState = {
		...editorPersistenceDefaultsJson,
		primarySidebarOpen: false,
		sidebarLayout:
			editorPersistenceDefaultsJson.sidebarLayout as SidebarLayout,
	};
	const fromPhp = (window as any).blockeraEditorPersistenceDefaults as
		Partial<StoreState> | undefined;

	const merged = fromPhp
		? {
				...base,
				...fromPhp,
				primarySidebarOpen: false,
			}
		: base;

	return {
		...merged,
		...migrateLayoutState(merged),
		primarySidebarOpen: false,
	};
}

/**
 * Get initial state from preloaded data if available, otherwise use PHP defaults.
 * This prevents flash of incorrect state before persistence loads.
 */
function getInitialState(): StoreState {
	const defaults = getDefaults();

	// Check for preloaded data synchronously
	const preloadedData = (window as any).blockeraEditorPersistenceData as
		(StoreState & { _modified?: string }) | undefined;

	// Also check localStorage as fallback (in case preloaded data is stale).
	// Site + user scoped via @blockera/storage.
	let localData: (StoreState & { _modified?: string }) | null = null;
	try {
		localData = localStorage.getJSON(
			'BLOCKERA_EDITOR_PERSISTENCE_RESTORE'
		) as (StoreState & { _modified?: string }) | null;
	} catch (e) {
		// Ignore localStorage errors
	}

	// Compare timestamps to determine which is more recent
	const preloadedTimestamp = preloadedData?._modified
		? Date.parse(preloadedData._modified)
		: 0;
	const localTimestamp = localData?._modified
		? Date.parse(localData._modified)
		: 0;

	// Prefer the most recent data source
	let selectedData: (StoreState & { _modified?: string }) | undefined;
	if (
		localTimestamp > preloadedTimestamp &&
		localData &&
		Object.keys(localData).length > 0
	) {
		selectedData = localData;
	} else if (preloadedData && Object.keys(preloadedData).length > 0) {
		selectedData = preloadedData;
	}

	if (selectedData) {
		// Extract clean state (without _modified timestamp) and merge with defaults
		// Persisted data takes precedence over defaults
		const { _modified, ...cleanState } = selectedData as any;
		const merged = {
			...defaults,
			...cleanState,
			primarySidebarOpen: false,
		} as StoreState;
		return {
			...merged,
			...migrateLayoutState(merged),
		};
	}

	// Return PHP defaults (no persisted data found)
	return defaults;
}

/**
 * Initial state for the editor store.
 * Uses preloaded data if available to avoid flash of incorrect state.
 */
const initialState: StoreState = getInitialState();

/**
 * Type definition for store actions.
 */
type StoreAction =
	| { type: 'SET_SECONDARY_SIDEBAR_OPEN'; open?: boolean }
	| { type: 'TOGGLE_SECONDARY_SIDEBAR_OPEN' }
	| { type: 'SET_PRIMARY_SIDEBAR_OPEN'; open: boolean }
	| { type: 'SET_PRIMARY_SIDEBAR_WIDTH'; width: string }
	| { type: 'SET_SECONDARY_SIDEBAR_WIDTH'; width: string }
	| { type: 'SET_LIST_VIEW_HEIGHT'; height: string }
	| { type: 'SET_SIDEBAR_LAYOUT'; layout: SidebarLayout }
	| {
			type: 'SET_DOCK_PANE_HEIGHTS';
			dock: 'left' | 'right';
			heights: string[];
	  }
	| {
			type: 'MOVE_SIDEBAR_SECTION';
			sectionId: SidebarSectionId;
			dock: SidebarDockId;
			insertIndex: number;
	  }
	| {
			type: 'SET_PERSISTENCE_LAYER';
			persistenceLayer: PersistenceLayer<StoreState>;
			persistedData: StoreState & { _modified?: string };
	  };

/**
 * Base reducer for the editor store.
 *
 * @param {StoreState} state  Current state.
 * @param {StoreAction} action Action object.
 * @return {StoreState} Updated state.
 */
function baseReducer(
	state: StoreState = initialState,
	action: StoreAction
): StoreState {
	switch (action.type) {
		case 'SET_SECONDARY_SIDEBAR_OPEN':
			return {
				...state,
				secondarySidebarOpen:
					action.open !== undefined ? action.open : true,
			};
		case 'TOGGLE_SECONDARY_SIDEBAR_OPEN':
			return {
				...state,
				secondarySidebarOpen: !state.secondarySidebarOpen,
			};
		case 'SET_PRIMARY_SIDEBAR_OPEN':
			return {
				...state,
				primarySidebarOpen: action.open,
			};
		case 'SET_PRIMARY_SIDEBAR_WIDTH':
			return {
				...state,
				primarySidebarWidth: action.width,
			};
		case 'SET_SECONDARY_SIDEBAR_WIDTH':
			return {
				...state,
				secondarySidebarWidth: action.width,
			};
		case 'SET_LIST_VIEW_HEIGHT':
			return {
				...state,
				listViewHeight: action.height,
				leftDockPaneHeights:
					state.leftDockPaneHeights.length === 2
						? [
								`${100 - parseFloat(action.height)}%`,
								action.height,
							]
						: state.leftDockPaneHeights,
			};
		case 'SET_SIDEBAR_LAYOUT':
			return {
				...state,
				...migrateLayoutState({
					...state,
					sidebarLayout: normalizeSidebarLayout(action.layout),
				}),
			};
		case 'SET_DOCK_PANE_HEIGHTS': {
			const migrated = migrateLayoutState({
				sidebarLayout: state.sidebarLayout,
				leftDockPaneHeights:
					action.dock === 'left'
						? action.heights
						: state.leftDockPaneHeights,
				rightDockPaneHeights:
					action.dock === 'right'
						? action.heights
						: state.rightDockPaneHeights,
				listViewHeight: state.listViewHeight,
			});
			return {
				...state,
				...migrated,
			};
		}
		case 'MOVE_SIDEBAR_SECTION': {
			const currentLayout = normalizeSidebarLayout(state.sidebarLayout);
			const nextLayout = moveSection(
				currentLayout,
				action.sectionId,
				action.dock,
				action.insertIndex
			);
			const fromDock = currentLayout[action.sectionId].dock;
			const toDock = action.dock;
			const fromSectionsBefore = getDockSections(
				currentLayout,
				fromDock
			);
			const toSectionsBefore = getDockSections(currentLayout, toDock);
			const toSectionsAfter = getDockSections(nextLayout, toDock);
			const moved = heightsAfterMove({
				fromDock,
				toDock,
				fromSectionsBefore,
				toSectionsBefore,
				fromHeights:
					fromDock === 'left'
						? state.leftDockPaneHeights
						: state.rightDockPaneHeights,
				toHeights:
					toDock === 'left'
						? state.leftDockPaneHeights
						: state.rightDockPaneHeights,
				toSectionsAfter,
			});
			const leftDockPaneHeights =
				fromDock === 'left'
					? moved.fromHeights
					: toDock === 'left'
						? moved.toHeights
						: state.leftDockPaneHeights;
			const rightDockPaneHeights =
				fromDock === 'right'
					? moved.fromHeights
					: toDock === 'right'
						? moved.toHeights
						: state.rightDockPaneHeights;

			return {
				...state,
				sidebarLayout: nextLayout,
				leftDockPaneHeights,
				rightDockPaneHeights,
				listViewHeight: listViewHeightFromLayout(
					nextLayout,
					leftDockPaneHeights
				),
			};
		}
		case 'SET_PERSISTENCE_LAYER':
			// Merge persisted data with defaults to ensure all fields exist
			// Exclude _modified field from state (it's only for persistence layer)
			const { _modified, ...persistedStateData } = action.persistedData;
			const defaults = getDefaults();
			const mergedState = {
				...defaults,
				...persistedStateData,
			};
			return {
				...mergedState,
				...migrateLayoutState(mergedState),
			};
		default:
			return state;
	}
}

/**
 * Module-level persistence layer reference.
 * This ensures the persistence layer is accessible across all reducer calls.
 */
let persistenceLayer: PersistenceLayer<StoreState> | null = null;

/**
 * Sets the persistence layer (called during initialization).
 */
export function setPersistenceLayerReference(
	layer: PersistenceLayer<StoreState> | null
): void {
	persistenceLayer = layer;
}

/**
 * Higher-order reducer that adds persistence layer support.
 * Similar to WordPress preferences store persistence pattern.
 *
 * @param reducer The base reducer.
 * @return Enhanced reducer with persistence.
 */
function withPersistenceLayer(
	reducer: typeof baseReducer
): (state: StoreState | undefined, action: StoreAction) => StoreState {
	return (state: StoreState | undefined, action: StoreAction): StoreState => {
		// Always read from module-level variable (not closure variable)
		// Read fresh value each time (don't cache in closure)
		const currentPersistenceLayer = persistenceLayer;

		// Set up the persistence layer and return persisted data as state
		if (action.type === 'SET_PERSISTENCE_LAYER') {
			persistenceLayer = action.persistenceLayer;
			return reducer(state, action);
		}

		const nextState = reducer(state, action);

		// Save to persistence layer when state changes (except for persistence layer setup)
		// Use module-level variable, not closure variable
		// No need to check initialization flag - persistence is enabled AFTER initial state is set
		// primarySidebarOpen is session-only and must not be written to user meta.
		if (
			currentPersistenceLayer &&
			(action.type === 'SET_SECONDARY_SIDEBAR_OPEN' ||
				action.type === 'TOGGLE_SECONDARY_SIDEBAR_OPEN' ||
				action.type === 'SET_PRIMARY_SIDEBAR_WIDTH' ||
				action.type === 'SET_SECONDARY_SIDEBAR_WIDTH' ||
				action.type === 'SET_LIST_VIEW_HEIGHT' ||
				action.type === 'SET_SIDEBAR_LAYOUT' ||
				action.type === 'SET_DOCK_PANE_HEIGHTS' ||
				action.type === 'MOVE_SIDEBAR_SECTION')
		) {
			const { primarySidebarOpen: _omit, ...persistable } = nextState;
			currentPersistenceLayer.set(persistable as StoreState);
		}

		return nextState;
	};
}

/**
 * Reducer with persistence layer support.
 */
const reducer = withPersistenceLayer(baseReducer);

export default reducer;
