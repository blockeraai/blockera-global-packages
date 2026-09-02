/**
 * WordPress dependencies
 */
import { useEffect, useMemo, useRef, useState } from '@wordpress/element';
import { useSelect, useDispatch, subscribe } from '@wordpress/data';
import { __ } from '@wordpress/i18n';
import {
	useShortcut,
	store as keyboardShortcutsStore,
} from '@wordpress/keyboard-shortcuts';
import { Fill } from '@wordpress/components';
/**
 * Internal dependencies
 */
import { store as blockeraEditorStore } from '../store-persistence';
import { getDefaults } from '../store-persistence/reducer';
import { ResizeHandle } from '../shared/ResizeHandle';
import {
	applyBlockeraPrimarySidebarShortcutSwap,
	isCoreToggleSidebarDefaultCombo,
} from './sidebar-shortcut-swap';
import { toggleBothSidebars } from './toggle-both-sidebars';
import SidebarDock from '../sidebar-layout/SidebarDock';
import { DEFAULT_SIDEBAR_LAYOUT, SIDEBAR_CLIP_TRANSITION_MS } from '../sidebar-layout/constants';
import { getVisibleDockSections } from '../sidebar-layout/layout';
import { useSidebarDrag } from '../sidebar-layout/useSidebarDrag';
import { useIsCanvasEditMode } from '../secondary-sidebar/hooks/useIsCanvasEditMode';
import type { SidebarLayout } from '../sidebar-layout/types';

/**
 * Component that watches the primary sidebar (right panel) state and sets CSS variable
 * to hide it when opened. Handles both edit-post (document sidebar) and edit-site (global-styles sidebar).
 * Also owns the main (WordPress) sidebar keyboard shortcut: unregisters core's Cmd+Shift+, and
 * re-registers it as Cmd+Shift+. so the secondary sidebar can use Cmd+Shift+,.
 */
export default function PrimarySidebarController() {
	// Unregister core's main sidebar shortcut (Cmd+Shift+,) and re-register as Cmd+Shift+.
	// so Blockera can use Cmd+Shift+, for the secondary sidebar. Core's useShortcut
	// for 'core/editor/toggle-sidebar' will then respond to Cmd+Shift+. instead.
	// Site Editor re-registers core's shortcut after this runs; subscribe below and
	// re-apply when the store shows the default comma binding again.
	useEffect(() => {
		applyBlockeraPrimarySidebarShortcutSwap();

		const unsubscribe = subscribe(() => {
			if (!isCoreToggleSidebarDefaultCombo()) {
				return;
			}
			applyBlockeraPrimarySidebarShortcutSwap();
		}, keyboardShortcutsStore);

		return unsubscribe;
	}, []);

	const { registerShortcut } = useDispatch(keyboardShortcutsStore);

	// Cmd+Shift+/ — toggle both sidebars (registry + useShortcut; no raw window listeners).
	useEffect(() => {
		registerShortcut({
			name: 'blockera/sidebars/toggle-both',
			category: 'blockera',
			description: __(
				'Show or hide both sidebars (left and right).',
				'blockera'
			),
			keyCombination: {
				modifier: 'primaryShift',
				character: '/',
			},
		});
	}, [registerShortcut]);

	useShortcut('blockera/sidebars/toggle-both', (event) => {
		event.preventDefault();
		toggleBothSidebars();
	});

	// Cache DOM element reference to avoid repeated queries
	const sidebarContainerRef = useRef<HTMLElement | null>(null);
	const sidebarContentRef = useRef<HTMLDivElement | null>(null);
	const closeAnimationTimeoutRef = useRef<ReturnType<
		typeof setTimeout
	> | null>(null);
	const isInitialMountRef = useRef(true);
	const initialSidebarVisibleRef = useRef<boolean | null>(null);
	// Track if this is the initial mount for Gutenberg complementary width sync
	const isComplementaryInitialMountRef = useRef(true);
	// Track previous sidebar state to detect closing vs switching
	const previousSidebarRef = useRef<string | null | undefined>(undefined);

	// Get dispatch function for updating sidebar width
	const { setPrimarySidebarWidth, setPrimarySidebarOpen } = useDispatch(
		blockeraEditorStore
	) as unknown as {
		setPrimarySidebarWidth: (width: string) => void;
		setPrimarySidebarOpen: (open: boolean) => void;
	};

	// Watch the active complementary area from the interface store
	// This tracks both edit-post/document and edit-site/global-styles sidebars
	const activeComplementaryArea = useSelect((select) => {
		const interfaceSelect = select('core/interface') as {
			getActiveComplementaryArea: (
				scope: string
			) => string | null | undefined;
		};

		return interfaceSelect.getActiveComplementaryArea('core');
	}, []);

	// Get primary sidebar width from store
	const primarySidebarWidth = useSelect((select) => {
		const storeSelect = select(blockeraEditorStore) as any;
		return storeSelect.getPrimarySidebarWidth();
	}, []);

	const defaultPrimarySidebarWidth = useMemo(
		() => getDefaults().primarySidebarWidth,
		[]
	);

	const blockeraPrimarySidebarOpen = useSelect((select) => {
		return (select(blockeraEditorStore) as any).isPrimarySidebarOpen();
	}, []);

	const sidebarLayout = useSelect((select) => {
		const storeSelect = select(blockeraEditorStore) as {
			getSidebarLayout?: () => SidebarLayout;
		};
		return storeSelect.getSidebarLayout?.() ?? DEFAULT_SIDEBAR_LAYOUT;
	}, []);

	const isCanvasEdit = useIsCanvasEditMode();
	const drag = useSidebarDrag();

	const visibleRightSections = getVisibleDockSections(
		sidebarLayout,
		'right',
		!!activeComplementaryArea
	);

	const hasRightDockContent =
		isCanvasEdit && (visibleRightSections.length > 0 || !!drag);
	const hasRightDockContentRef = useRef(hasRightDockContent);
	hasRightDockContentRef.current = hasRightDockContent;
	const openAnimationFramesRef = useRef<number[]>([]);

	const cancelOpenAnimation = () => {
		openAnimationFramesRef.current.forEach((id) => {
			cancelAnimationFrame(id);
		});
		openAnimationFramesRef.current = [];
	};

	if (initialSidebarVisibleRef.current === null) {
		initialSidebarVisibleRef.current = hasRightDockContent;
	}

	const [shouldRenderContent, setShouldRenderContent] = useState(
		hasRightDockContent
	);
	const [isContentJustRendered, setIsContentJustRendered] = useState(false);
	const [isContentVisible, setIsContentVisible] = useState(
		() => initialSidebarVisibleRef.current === true
	);

	// Update CSS variables on body whenever width changes
	// Body always exists, so this is simple and reliable
	useEffect(() => {
		if (!primarySidebarWidth) {
			return;
		}

		// Set CSS variable on body (always exists, variables inherit to all children)
		document.body.style.setProperty(
			'--blockera-primary-sidebar-width',
			primarySidebarWidth
		);
	}, [primarySidebarWidth]);

	// Any complementary area (including third-party plugin sidebars like Spectra).
	const isAnySidebarOpen = !!activeComplementaryArea;

	// Keep Blockera session flag in sync with the real complementary area (for areBothSidebarsClosed / toggle-both).
	useEffect(() => {
		if (blockeraPrimarySidebarOpen === isAnySidebarOpen) {
			return;
		}
		setPrimarySidebarOpen(isAnySidebarOpen);
	}, [blockeraPrimarySidebarOpen, isAnySidebarOpen, setPrimarySidebarOpen]);

	// Initialize sidebar container reference (runs once, retries if not found)
	useEffect(() => {
		const findContainer = () => {
			if (!sidebarContainerRef.current) {
				sidebarContainerRef.current = document.querySelector(
					'.interface-interface-skeleton__sidebar'
				) as HTMLElement | null;
			}
			return sidebarContainerRef.current;
		};

		// Try immediately
		if (!findContainer()) {
			// If not found, retry after a short delay (DOM might not be ready)
			const timeoutId = setTimeout(() => {
				findContainer();
			}, 100);

			return () => clearTimeout(timeoutId);
		}
	}, []);

	// Handle mount and sidebar state changes
	useEffect(() => {
		// Try to find container if not already found (might be added to DOM later)
		if (!sidebarContainerRef.current) {
			sidebarContainerRef.current = document.querySelector(
				'.interface-interface-skeleton__sidebar'
			) as HTMLElement | null;
		}

		if (!sidebarContainerRef.current) {
			return;
		}

		// On mount: set --sidebar-width from store
		if (isComplementaryInitialMountRef.current) {
			sidebarContainerRef.current.style.removeProperty('--sidebar-width');
			sidebarContainerRef.current.style.removeProperty(
				'--sidebar-width-raw'
			);
			previousSidebarRef.current = activeComplementaryArea;
			isComplementaryInitialMountRef.current = false;
			return;
		}

		// After mount: handle sidebar state changes
		const previousSidebar = previousSidebarRef.current;
		const wasAnySidebarOpen = !!previousSidebar;

		// Case 1: Switching between any open complementary areas — keep width.
		if (wasAnySidebarOpen && isAnySidebarOpen) {
			previousSidebarRef.current = activeComplementaryArea;
			return;
		}

		// Case 2: Closing sidebar (no complementary area active).
		// When the complementary overlay is active, close animation is driven by
		// the Blockera dock wrapper clip; collapsing --sidebar-width here would
		// hide the overlay instantly before the clip finishes.
		if (wasAnySidebarOpen && !isAnySidebarOpen) {
			if (
				!document.body.classList.contains(
					'has-blockera-complementary-overlay'
				)
			) {
				sidebarContainerRef.current.style.setProperty(
					'--sidebar-width',
					'0'
				);
				sidebarContainerRef.current.style.removeProperty(
					'--sidebar-width-raw'
				);
			}
			previousSidebarRef.current = activeComplementaryArea;
			return;
		}

		// Case 3: Opening any sidebar (core or third-party) — restore width from store.
		// When settings lives in the Blockera right dock, wrapper clip + overlay sync
		// drive the open animation; animating --sidebar-width here fights that.
		if (!wasAnySidebarOpen && isAnySidebarOpen) {
			if (sidebarLayout.complementary.dock === 'right') {
				previousSidebarRef.current = activeComplementaryArea;
				return;
			}

			// Ensure starting point is 0 for smooth animation
			// Use requestAnimationFrame to ensure browser can animate the transition
			const beforeComputed = window
				.getComputedStyle(sidebarContainerRef.current)
				.getPropertyValue('--sidebar-width');
			const fillElement = sidebarContainerRef.current?.querySelector(
				'.interface-complementary-area__fill'
			) as HTMLElement | null;

			// For site editor, ensure the fill element exists and has transition before animating
			// The fill element might not exist immediately when opening in site editor
			if (!fillElement) {
				// Wait for the fill element to be available
				requestAnimationFrame(() => {
					const delayedFillElement =
						sidebarContainerRef.current?.querySelector(
							'.interface-complementary-area__fill'
						) as HTMLElement | null;
					if (delayedFillElement && sidebarContainerRef.current) {
						// Force reflow to ensure 0 width is applied before transitioning to store width
						if (
							beforeComputed !== '0px' &&
							beforeComputed !== '0'
						) {
							sidebarContainerRef.current.style.setProperty(
								'--sidebar-width',
								'0'
							);
							sidebarContainerRef.current.style.removeProperty(
								'--sidebar-width-raw'
							);
							// Force reflow by reading offsetHeight
							void sidebarContainerRef.current.offsetHeight;
						}
						// Use requestAnimationFrame to ensure smooth transition
						requestAnimationFrame(() => {
							if (sidebarContainerRef.current) {
								sidebarContainerRef.current.style.removeProperty(
									'--sidebar-width'
								);
								sidebarContainerRef.current.style.removeProperty(
									'--sidebar-width-raw'
								);
							}
						});
					} else if (sidebarContainerRef.current) {
						// Fallback: set directly if fill element still doesn't exist
						if (
							beforeComputed !== '0px' &&
							beforeComputed !== '0'
						) {
							sidebarContainerRef.current.style.setProperty(
								'--sidebar-width',
								'0'
							);
							sidebarContainerRef.current.style.removeProperty(
								'--sidebar-width-raw'
							);
							// Force reflow by reading offsetHeight
							void sidebarContainerRef.current.offsetHeight;
						}
						requestAnimationFrame(() => {
							if (sidebarContainerRef.current) {
								sidebarContainerRef.current.style.removeProperty(
									'--sidebar-width'
								);
								sidebarContainerRef.current.style.removeProperty(
									'--sidebar-width-raw'
								);
							}
						});
					}
				});
			} else {
				// Fill element exists, proceed with normal animation
				// Force reflow to ensure 0 width is applied before transitioning to store width
				if (beforeComputed !== '0px' && beforeComputed !== '0') {
					sidebarContainerRef.current.style.setProperty(
						'--sidebar-width',
						'0'
					);
					sidebarContainerRef.current.style.removeProperty(
						'--sidebar-width-raw'
					);
					// Force reflow by reading offsetHeight
					void sidebarContainerRef.current.offsetHeight;
				}

				// Use requestAnimationFrame to ensure smooth transition
				requestAnimationFrame(() => {
					requestAnimationFrame(() => {
						if (sidebarContainerRef.current) {
							sidebarContainerRef.current.style.removeProperty(
								'--sidebar-width'
							);
							sidebarContainerRef.current.style.removeProperty(
								'--sidebar-width-raw'
							);
						}
					});
				});
			}
		}

		// Update previous sidebar state for next comparison
		previousSidebarRef.current = activeComplementaryArea;
	}, [activeComplementaryArea, isAnySidebarOpen, primarySidebarWidth, sidebarLayout]);

	// Drive wrapper clip via React state so re-renders cannot reset is-visible.
	useEffect(() => {
		if (hasRightDockContent) {
			const isInitialMount = isInitialMountRef.current;

			if (isInitialMount) {
				isInitialMountRef.current = false;
				if (initialSidebarVisibleRef.current) {
					setIsContentVisible(true);
					setIsContentJustRendered(false);
				}
			}
		} else {
			cancelOpenAnimation();
			setIsContentVisible(false);
			if (isInitialMountRef.current) {
				isInitialMountRef.current = false;
			}
			setIsContentJustRendered(false);
		}
	}, [hasRightDockContent]);

	useEffect(() => () => cancelOpenAnimation(), []);

	// Wrapper clip is only open when store says dock has content AND visibility allows it.
	const wrapperVisible = hasRightDockContent && isContentVisible;

	useEffect(() => {
		if (closeAnimationTimeoutRef.current) {
			clearTimeout(closeAnimationTimeoutRef.current);
			closeAnimationTimeoutRef.current = null;
		}

		if (hasRightDockContent) {
			const isInitialMount = isInitialMountRef.current;
			const initialSidebarVisible = initialSidebarVisibleRef.current;

			setShouldRenderContent(true);

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

		return () => {
			if (closeAnimationTimeoutRef.current) {
				clearTimeout(closeAnimationTimeoutRef.current);
				closeAnimationTimeoutRef.current = null;
			}
		};
	}, [hasRightDockContent, shouldRenderContent]);

	// Handle resize callback - updates store width
	const handleResize = (width: string) => {
		setPrimarySidebarWidth(width);
	};

	return (
		<>
			{isCanvasEdit && (
				<Fill name="blockera/slots/editor-primary-sidebar">
					{shouldRenderContent && (
						<div
							data-test="blockera-primary-sidebar-content"
							ref={(el) => {
								sidebarContentRef.current = el;

								const shouldAnimate =
									isContentJustRendered &&
									(!isInitialMountRef.current ||
										(isInitialMountRef.current &&
											!initialSidebarVisibleRef.current));
								if (el && shouldAnimate) {
									cancelOpenAnimation();
									const outerFrame = requestAnimationFrame(() => {
										const innerFrame = requestAnimationFrame(
											() => {
												openAnimationFramesRef.current =
													openAnimationFramesRef.current.filter(
														(id) =>
															id !== innerFrame
													);
												if (
													sidebarContentRef.current ===
														el &&
													hasRightDockContentRef.current
												) {
													setIsContentVisible(true);
													setIsContentJustRendered(
														false
													);
												}
											}
										);
										openAnimationFramesRef.current.push(
											innerFrame
										);
										openAnimationFramesRef.current =
											openAnimationFramesRef.current.filter(
												(id) => id !== outerFrame
											);
									});
									openAnimationFramesRef.current.push(
										outerFrame
									);
								}
							}}
							className={`blockera-primary-sidebar-content ${
								wrapperVisible ? 'is-visible' : 'is-hidden'
							}`}
						>
							<ResizeHandle
								side="left"
								isVisible={hasRightDockContent}
								minWidth={280}
								maxWidth={600}
								defaultValue={defaultPrimarySidebarWidth}
								onResize={handleResize}
							/>
							<SidebarDock
								dock="right"
								isDockOpen={shouldRenderContent}
							/>
						</div>
					)}
				</Fill>
			)}
		</>
	);
}
