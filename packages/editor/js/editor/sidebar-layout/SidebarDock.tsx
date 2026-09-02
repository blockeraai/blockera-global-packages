/**
 * WordPress dependencies
 */
import { memo, useCallback, useRef } from '@wordpress/element';
import { useDispatch, useSelect } from '@wordpress/data';
import { useViewportMatch } from '@wordpress/compose';

/**
 * Blockera dependencies
 */
import { useEditorMode } from '@blockera/utils';

/**
 * Internal dependencies
 */
import { store as blockeraEditorStore } from '../store-persistence';
import InserterLibraryPanel from '../secondary-sidebar/components/InserterLibraryPanel';
import ListViewPanel from '../secondary-sidebar/components/ListViewPanel';
import ComplementaryAnchor from './ComplementaryAnchor';
import PaneSplitHandle from './PaneSplitHandle';
import SectionPane from './SectionPane';
import { DEFAULT_SIDEBAR_LAYOUT, PANE_GAP_PX } from './constants';
import { startSidebarDrag } from './drag-session';
import {
	dropSlotPlan,
	equalHeights,
	getVisibleDockSections,
	parsePercent,
	remainingPaneHeights,
} from './layout';
import { countDockRender, logSidebarPerf } from './sidebar-perf';
import { useSidebarDrag } from './useSidebarDrag';
import type { SidebarDockId, SidebarLayout, SidebarSectionId } from './types';
import './style.scss';

type SidebarDockProps = {
	dock: SidebarDockId;
	isDockOpen: boolean;
};

const MemoInserterLibraryPanel = memo(InserterLibraryPanel);
const MemoListViewPanel = memo(ListViewPanel);
const FALLBACK_LEFT_HEIGHTS = ['50%', '50%'];
const FALLBACK_RIGHT_HEIGHTS = ['100%'];

function floatingPaneStyle(drag: ReturnType<typeof useSidebarDrag>) {
	if (!drag) {
		return undefined;
	}

	return {
		position: 'fixed' as const,
		width: drag.width,
		height: drag.height,
		zIndex: 100000,
		margin: 0,
	};
}

/**
 * Vertical stack of movable sidebar sections for one dock.
 */
export default function SidebarDock({ dock, isDockOpen }: SidebarDockProps) {
	const dockRef = useRef<HTMLDivElement | null>(null);
	const isLargeViewport = useViewportMatch('medium');
	const isTextEditorMode = useEditorMode() === 'text';
	const drag = useSidebarDrag();
	countDockRender(dock);

	const lastPlaceholder = useRef('');

	const { layout, heights, isComplementaryOpen } = useSelect(
		(select) => {
			const storeSelect = select(blockeraEditorStore) as {
				getSidebarLayout: () => SidebarLayout;
				getLeftDockPaneHeights: () => string[];
				getRightDockPaneHeights: () => string[];
			};
			const interfaceSelect = select('core/interface') as
				| {
						getActiveComplementaryArea?: (
							scope: string
						) => string | null;
				  }
				| undefined;

			return {
				layout:
					storeSelect.getSidebarLayout?.() ?? DEFAULT_SIDEBAR_LAYOUT,
				heights:
					dock === 'left'
						? storeSelect.getLeftDockPaneHeights?.() ??
							FALLBACK_LEFT_HEIGHTS
						: storeSelect.getRightDockPaneHeights?.() ??
							FALLBACK_RIGHT_HEIGHTS,
				isComplementaryOpen:
					!!interfaceSelect?.getActiveComplementaryArea?.('core'),
			};
		},
		[dock]
	);

	const { moveSidebarSection, setDockPaneHeights } = useDispatch(
		blockeraEditorStore
	) as {
		moveSidebarSection: (
			sectionId: SidebarSectionId,
			targetDock: SidebarDockId,
			insertIndex: number
		) => void;
		setDockPaneHeights: (targetDock: SidebarDockId, next: string[]) => void;
	};

	const sections = getVisibleDockSections(
		layout,
		dock,
		isComplementaryOpen
	);
	const visibleSections = drag
		? sections.filter((id) => id !== drag.sectionId)
		: sections;
	const occupancy = sections.length;
	const isSource = !!drag && sections.includes(drag.sectionId);
	const remainingHeights = remainingPaneHeights(
		sections,
		heights,
		drag?.sectionId ?? null
	);

	const occupancyHeights =
		heights.length === occupancy ? heights : equalHeights(occupancy);
	const paneHeights =
		visibleSections.length === heights.length
			? heights
			: remainingHeights.length === visibleSections.length
				? remainingHeights
				: equalHeights(visibleSections.length);

	const canDrag = isLargeViewport;
	const showDropSlots = !!drag && isLargeViewport && !drag.returning;
	const isEmptyDuringDrag = showDropSlots && visibleSections.length === 0;
	const stackedSections =
		showDropSlots && isSource ? sections : visibleSections;
	const stackedHeights =
		showDropSlots && isSource ? occupancyHeights : paneHeights;
	const revealThird = showDropSlots && drag?.revealThirdDock === dock;
	const slotPlan = dropSlotPlan({
		occupancy,
		isSource,
		remainingHeights,
		occupancyHeights,
		revealThird: !!revealThird,
	});
	const baseSlotPlan = dropSlotPlan({
		occupancy,
		isSource,
		remainingHeights,
		occupancyHeights,
		revealThird: false,
	});
	const dropHeightsAttr = (
		baseSlotPlan.heights.length === 0
			? ['100%']
			: baseSlotPlan.heights
	)
		.map((height) => String(parsePercent(height)))
		.join(',');

	if (showDropSlots) {
		const placeholderKey = `${dock}:${slotPlan.heights.join(',')}:${
			drag?.hoverSlot ?? ''
		}:${revealThird ? 1 : 0}`;
		if (lastPlaceholder.current !== placeholderKey) {
			lastPlaceholder.current = placeholderKey;
			logSidebarPerf('placeholder', {
				dock,
				heights: slotPlan.heights,
				hoverSlot: drag?.hoverSlot ?? null,
				revealThird,
			});
		}
	} else {
		lastPlaceholder.current = '';
	}

	const startPaneDragFromEvent = useCallback(
		(
			sectionId: SidebarSectionId,
			event: React.PointerEvent<HTMLButtonElement>
		) => {
			if (!canDrag || event.button !== 0) {
				return;
			}
			const pane =
				event.currentTarget.closest('.blockera-sidebar-pane') ??
				document.querySelector(
					`[data-test="blockera-sidebar-pane-${sectionId}"]`
				);
			if (!(pane instanceof HTMLElement)) {
				return;
			}
			event.preventDefault();
			event.stopPropagation();
			const rect = pane.getBoundingClientRect();
			startSidebarDrag({
				sectionId,
				width: rect.width,
				height: rect.height,
				grabX: event.clientX - rect.left,
				grabY: event.clientY - rect.top,
				x: event.clientX,
				y: event.clientY,
				pointerId: event.pointerId,
				captureTarget: event.currentTarget,
				onDrop: (id, targetDock, slot) =>
					moveSidebarSection(id, targetDock, slot),
			});
		},
		[canDrag, moveSidebarSection]
	);

	const onInserterPointerDown = useCallback(
		(event: React.PointerEvent<HTMLButtonElement>) =>
			startPaneDragFromEvent('inserter', event),
		[startPaneDragFromEvent]
	);
	const onListViewPointerDown = useCallback(
		(event: React.PointerEvent<HTMLButtonElement>) =>
			startPaneDragFromEvent('listView', event),
		[startPaneDragFromEvent]
	);
	const onComplementaryPointerDown = useCallback(
		(event: React.PointerEvent<HTMLButtonElement>) =>
			startPaneDragFromEvent('complementary', event),
		[startPaneDragFromEvent]
	);

	if (!showDropSlots && (!isDockOpen || sections.length === 0)) {
		return null;
	}

	const useFlexFill = visibleSections.length === 1 && !showDropSlots;

	const renderPane = (sectionId: SidebarSectionId, height: string) => {
		const isFloating = drag?.sectionId === sectionId;
		const floatingStyle = isFloating ? floatingPaneStyle(drag) : undefined;

		if (sectionId === 'inserter') {
			return (
				<SectionPane
					sectionId="inserter"
					height={useFlexFill ? '100%' : height}
					canDrag={canDrag}
					isFloating={isFloating}
					floatingStyle={floatingStyle}
					onPointerDown={onInserterPointerDown}
				>
					<MemoInserterLibraryPanel />
				</SectionPane>
			);
		}

		if (sectionId === 'listView') {
			return (
				<SectionPane
					sectionId="listView"
					height={useFlexFill ? '100%' : height}
					canDrag={canDrag}
					isFloating={isFloating}
					floatingStyle={floatingStyle}
					onPointerDown={onListViewPointerDown}
				>
					<MemoListViewPanel />
				</SectionPane>
			);
		}

		return (
			<ComplementaryAnchor
				isActive={isComplementaryOpen}
				canDrag={canDrag}
				height={useFlexFill ? '100%' : height}
				isFloating={isFloating}
				floatingStyle={floatingStyle}
				onPointerDown={onComplementaryPointerDown}
			/>
		);
	};

	return (
		<div
			ref={dockRef}
			className={`blockera-sidebar-dock blockera-combined-sidebar blockera-sidebar-dock--${dock}${
				useFlexFill ? ' is-single-pane' : ''
			}${isTextEditorMode ? ' is-text-editor' : ''}${
				showDropSlots ? ' is-rearranging' : ''
			}`}
			data-test={`blockera-sidebar-dock-${dock}`}
			data-drop-heights={dropHeightsAttr}
			data-can-reveal-third={baseSlotPlan.canRevealThird ? '1' : '0'}
			style={{ ['--blockera-pane-gap' as string]: `${PANE_GAP_PX}px` }}
		>
			{showDropSlots && slotPlan.heights.length > 0 && (
				<div
					className="blockera-sidebar-drop-slots"
					data-test={`blockera-sidebar-drop-slots-${dock}`}
				>
					{slotPlan.heights.map((height, slot) => {
						const isActive =
							drag?.hoverDock === dock && drag?.hoverSlot === slot;
						return (
							<div
								key={slot}
								className={`blockera-sidebar-drop-slot${
									isActive ? ' is-active' : ''
								}`}
								data-test={`blockera-sidebar-drop-slot-${dock}-${slot}`}
								style={{
									flexGrow: parsePercent(height),
									flexShrink: 1,
									flexBasis: 0,
								}}
							/>
						);
					})}
				</div>
			)}
			{!isEmptyDuringDrag &&
				stackedSections.map((sectionId, index) => {
					const height =
						stackedHeights[index] ??
						`${100 / stackedSections.length}%`;
					const isDraggedSlot = drag?.sectionId === sectionId;

					return (
						<div
							key={sectionId}
							className="blockera-sidebar-dock__slot"
							style={
								useFlexFill
									? { flex: '1 1 auto' }
									: {
											flex: `0 0 ${height}`,
											['--blockera-pane-height' as string]:
												height,
										}
							}
						>
							{index > 0 && !showDropSlots && (
								<PaneSplitHandle
									dockRef={dockRef}
									heights={stackedHeights}
									boundaryIndex={index - 1}
									isVisible={isDockOpen}
									onResize={(next) =>
										setDockPaneHeights(dock, next)
									}
								/>
							)}
							{!isDraggedSlot && renderPane(sectionId, height)}
						</div>
					);
				})}
			{drag?.sectionId &&
				sections.includes(drag.sectionId) && (
					<div className="blockera-sidebar-pane-float-layer">
						{renderPane(
							drag.sectionId,
							occupancyHeights[
								sections.indexOf(drag.sectionId)
							] ??
								paneHeights[0] ??
								'100%'
						)}
					</div>
				)}
		</div>
	);
}
