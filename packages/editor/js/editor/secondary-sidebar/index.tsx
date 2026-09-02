/**
 * WordPress dependencies
 */
import { useEffect, useMemo, useRef, useState } from '@wordpress/element';
import { useDispatch, useSelect } from '@wordpress/data';
import { __ } from '@wordpress/i18n';
import {
	useShortcut,
	store as keyboardShortcutsStore,
} from '@wordpress/keyboard-shortcuts';
import { store as editorStore } from '@wordpress/editor';
import { Fill } from '@wordpress/components';

/**
 * Internal dependencies
 */
import { store as blockeraEditorStore } from '../store-persistence';
import { getDefaults } from '../store-persistence/reducer';
import { ResizeHandle } from '../shared/ResizeHandle';
import SecondarySidebar from './components/SecondarySidebar';
import ToggleButton from './components/ToggleButton';
import { useIsCanvasEditMode } from './hooks/useIsCanvasEditMode';
import { DEFAULT_SIDEBAR_LAYOUT, SIDEBAR_CLIP_TRANSITION_MS } from '../sidebar-layout/constants';
import { getVisibleDockSections } from '../sidebar-layout/layout';
import { useSidebarDrag } from '../sidebar-layout/useSidebarDrag';
import type { SidebarLayout } from '../sidebar-layout/types';
import './style.scss';
import '../shared/style.scss';

/**
 * Renders toggle + sidebar only when in Site Editor canvas edit mode (or outside Site Editor).
 */
function SecondarySidebarContent() {
	const isCanvasEdit = useIsCanvasEditMode();

	if (!isCanvasEdit) {
		return null;
	}

	return <SecondarySidebarContentUI />;
}

/**
 * Component that injects the combined sidebar into the editor interface using slots.
 * Uses the slot system to render the sidebar content and controls visibility through CSS.
 */
export default function SecondarySidebarInjector() {
	return <SecondarySidebarContent />;
}

/**
 * UI implementation: all sidebar state, effects, and slot fills.
 * Only mounted when isCanvasEdit is true (or forceShowSidebar).
 */
function SecondarySidebarContentUI() {
	const { setIsInserterOpened, setIsListViewOpened } = useDispatch(
		editorStore
	) as any;
	const { toggleSecondarySidebar, setSecondarySidebarWidth } = useDispatch(
		blockeraEditorStore
	) as unknown as {
		toggleSecondarySidebar: () => void;
		setSecondarySidebarWidth: (width: string) => void;
	};
	const { registerShortcut } = useDispatch(keyboardShortcutsStore);

	// Register Cmd+Shift+, (Ctrl+Shift+, on Windows) for our secondary sidebar toggle.
	// Core's main sidebar shortcut is unregistered and re-bound to Cmd+Shift+. in primary-sidebar.
	useEffect(() => {
		registerShortcut({
			name: 'blockera/sidebars/toggle-secondary-sidebar',
			category: 'blockera',
			description: __(
				'Show or hide the secondary sidebar (left side).',
				'blockera'
			),
			keyCombination: {
				modifier: 'primaryShift',
				character: ',',
			},
		});
	}, [registerShortcut]);

	useShortcut(
		'blockera/sidebars/toggle-secondary-sidebar',
		toggleSecondarySidebar
	);

	// Cache DOM element references to avoid repeated queries
	const sidebarContentRef = useRef<HTMLDivElement | null>(null);
	const defaultSidebarRef = useRef<HTMLElement | null>(null);
	const closeAnimationTimeoutRef = useRef<ReturnType<
		typeof setTimeout
	> | null>(null);
	const isInitialMountRef = useRef(true); // Track if this is the first render/page load

	// Get sidebar visibility state from store
	const isSecondaryOpen = useSelect((select) => {
		const storeSelect = select(blockeraEditorStore) as any;
		return storeSelect.isSecondarySidebarOpen();
	}, []);

	const sidebarLayout = useSelect((select) => {
		const storeSelect = select(blockeraEditorStore) as {
			getSidebarLayout?: () => SidebarLayout;
		};
		return storeSelect.getSidebarLayout?.() ?? DEFAULT_SIDEBAR_LAYOUT;
	}, []);

	const isComplementaryOpen = useSelect((select) => {
		const interfaceSelect = select('core/interface') as
			| {
					getActiveComplementaryArea?: (
						scope: string
					) => string | null;
			  }
			| undefined;
		return !!interfaceSelect?.getActiveComplementaryArea?.('core');
	}, []);

	const drag = useSidebarDrag();

	const hasLeftPanes =
		getVisibleDockSections(sidebarLayout, 'left', isComplementaryOpen)
			.length > 0;

	const isLeftDockActive =
		(isSecondaryOpen && hasLeftPanes) || !!drag;

	// Get secondary sidebar width from store
	const secondarySidebarWidth = useSelect((select) => {
		const storeSelect = select(blockeraEditorStore) as any;
		return storeSelect.getSecondarySidebarWidth();
	}, []);

	const defaultSecondarySidebarWidth = useMemo(
		() => getDefaults().secondarySidebarWidth,
		[]
	);

	// Track initial sidebar state (for determining if we should animate on first open)
	const initialSidebarVisibleRef = useRef<boolean | null>(null);
	if (initialSidebarVisibleRef.current === null) {
		initialSidebarVisibleRef.current = isLeftDockActive;
	}

	// Track if SecondarySidebar content should be rendered in DOM
	// When opening: render immediately to allow animation
	// When closing: keep rendered until animation completes, then remove
	const [shouldRenderContent, setShouldRenderContent] =
		useState(isLeftDockActive);

	// Track if content was just rendered (for toggle animation)
	const [isContentJustRendered, setIsContentJustRendered] = useState(false);
	const [isContentVisible, setIsContentVisible] = useState(
		() => initialSidebarVisibleRef.current === true
	);

	// Monitor the state of default sidebars and keep them disabled
	const { isInserterOpened, isListViewOpened } = useSelect((select) => {
		const editorSelect = select(editorStore) as any;
		return {
			isInserterOpened: editorSelect.isInserterOpened?.() || false,
			isListViewOpened: editorSelect.isListViewOpened?.() || false,
		};
	}, []);

	// Keep default sidebars disabled while our custom sidebar is active
	useEffect(() => {
		if (isInserterOpened) {
			setIsInserterOpened?.(false);
		}

		if (isListViewOpened) {
			setIsListViewOpened?.(false);
		}
	}, [
		isInserterOpened,
		isListViewOpened,
		setIsInserterOpened,
		setIsListViewOpened,
	]);

	// Update CSS variables on body whenever width changes
	// Body always exists, so this is simple and reliable
	useEffect(() => {
		if (!secondarySidebarWidth) {
			return;
		}

		// Set CSS variable on body (always exists, variables inherit to all children)
		document.body.style.setProperty(
			'--blockera-secondary-sidebar-width',
			secondarySidebarWidth
		);
	}, [secondarySidebarWidth]);

	// Drive wrapper clip via React state so re-renders cannot reset is-visible.
	useEffect(() => {
		if (isLeftDockActive) {
			const isInitialMount = isInitialMountRef.current;

			if (isInitialMount) {
				isInitialMountRef.current = false;
				if (initialSidebarVisibleRef.current) {
					setIsContentVisible(true);
					setIsContentJustRendered(false);
				}
			}
		} else {
			setIsContentVisible(false);
			if (isInitialMountRef.current) {
				isInitialMountRef.current = false;
			}
			setIsContentJustRendered(false);
		}
	}, [isLeftDockActive]);

	// Initialize default sidebar reference and body class (runs once)
	// Also set CSS variables early to ensure they're available for animations
	useEffect(() => {
		// Find the default secondary sidebar to hide it
		if (!defaultSidebarRef.current) {
			defaultSidebarRef.current = document.querySelector(
				'.interface-interface-skeleton__secondary-sidebar'
			) as HTMLElement | null;
		}

		// Set CSS variable on body during initialization (body always exists)
		if (secondarySidebarWidth) {
			document.body.style.setProperty(
				'--blockera-secondary-sidebar-width',
				secondarySidebarWidth
			);
		}

		// Add class to body for CSS rules (only once)
		document.body.classList.add('has-blockera-combined-sidebar');

		// Hide the default secondary sidebar
		if (defaultSidebarRef.current) {
			defaultSidebarRef.current.style.display = 'none';
		}

		// Cleanup: restore default sidebar visibility if needed
		return () => {
			if (defaultSidebarRef.current) {
				defaultSidebarRef.current.style.display = '';
			}
			document.body.classList.remove('has-blockera-combined-sidebar');
		};
	}, [secondarySidebarWidth]);

	// Handle SecondarySidebar content rendering and animation timing
	// When opening: render immediately and animate in
	// When closing: animate out, then remove from DOM after the clip transition
	useEffect(() => {
		// Clear any pending close animation timeout
		if (closeAnimationTimeoutRef.current) {
			clearTimeout(closeAnimationTimeoutRef.current);
			closeAnimationTimeoutRef.current = null;
		}

		if (isLeftDockActive) {
			// Opening: render content immediately to allow animation
			const isInitialMount = isInitialMountRef.current;
			const initialSidebarVisible = initialSidebarVisibleRef.current;

			setShouldRenderContent(true);

			// If not initial mount OR if initial mount but sidebar was closed initially (content was never rendered),
			// mark that content was just rendered (will trigger animation)
			if (!isInitialMount || !initialSidebarVisible) {
				setIsContentJustRendered(true);
			}
		} else if (shouldRenderContent) {
			closeAnimationTimeoutRef.current = setTimeout(() => {
				setShouldRenderContent(false);
				closeAnimationTimeoutRef.current = null;
			}, SIDEBAR_CLIP_TRANSITION_MS);
		} else {
			setShouldRenderContent(false);
		}

		// Cleanup: clear timeout on unmount or state change
		return () => {
			if (closeAnimationTimeoutRef.current) {
				clearTimeout(closeAnimationTimeoutRef.current);
				closeAnimationTimeoutRef.current = null;
			}
		};
	}, [isLeftDockActive, shouldRenderContent]);

	// Handle resize callback - updates store width
	const handleResize = (width: string) => {
		setSecondarySidebarWidth(width);
	};

	return (
		<>
			{/* Toggle button in header toolbar */}
			<Fill name="blockera/slots/editor-header-toolbar">
				<ToggleButton
					isVisible={isLeftDockActive}
					onToggle={toggleSecondarySidebar}
				/>
			</Fill>

			<Fill name="blockera/slots/editor-secondary-sidebar">
				{/* Wrapper width animates via :has(.is-visible); inner stays full width. */}
				{/* On initial mount: render with is-visible if sidebar should be visible (no animation) */}
				{/* On toggle open: render with is-hidden first, then ref callback sets is-visible */}
				{shouldRenderContent && (
					<div
						data-test="blockera-secondary-sidebar-content"
						ref={(el) => {
							sidebarContentRef.current = el;

							// Handle toggle open animation when content is mounted
							// Animate if: (not initial mount OR initial mount but sidebar was closed initially) AND content was just rendered
							const shouldAnimate =
								isContentJustRendered &&
								(!isInitialMountRef.current ||
									(isInitialMountRef.current &&
										!initialSidebarVisibleRef.current));
							if (el && isLeftDockActive && shouldAnimate) {
								requestAnimationFrame(() => {
									requestAnimationFrame(() => {
										if (sidebarContentRef.current === el) {
											setIsContentVisible(true);
											setIsContentJustRendered(false);
										}
									});
								});
							}
						}}
						className={`blockera-secondary-sidebar-content ${
							isContentVisible ? 'is-visible' : 'is-hidden'
						}`}
					>
						<ResizeHandle
							side="right"
							isVisible={isLeftDockActive}
							minWidth={280}
							maxWidth={600}
							defaultValue={defaultSecondarySidebarWidth}
							onResize={handleResize}
						/>
						<SecondarySidebar isDockOpen={shouldRenderContent} />
					</div>
				)}
			</Fill>
		</>
	);
}
