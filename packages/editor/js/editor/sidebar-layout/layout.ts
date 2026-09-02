/**
 * Internal dependencies
 */
import {
	DEFAULT_SIDEBAR_LAYOUT,
	MIN_PANE_PERCENT,
	REVEAL_THIRD_ZONE_PX,
	SIDEBAR_SECTION_IDS,
} from './constants';
import type {
	SidebarDockId,
	SidebarLayout,
	SidebarSectionId,
} from './types';

export function parsePercent(value: string | undefined, fallback = 50): number {
	if (!value) {
		return fallback;
	}

	const parsed = parseFloat(value);
	return Number.isFinite(parsed) ? parsed : fallback;
}

export function formatPercent(value: number): string {
	return `${Math.round(value * 100) / 100}%`;
}

export function equalHeights(count: number): string[] {
	if (count <= 0) {
		return [];
	}

	if (count === 1) {
		return ['100%'];
	}

	const share = Math.round((100 / count) * 100) / 100;
	const heights: string[] = [];
	let remaining = 100;

	for (let i = 0; i < count - 1; i++) {
		heights.push(formatPercent(share));
		remaining -= share;
	}

	heights.push(formatPercent(remaining));
	return heights;
}

export function remainingPaneHeights(
	sections: SidebarSectionId[],
	heights: string[],
	draggedId: SidebarSectionId | null
): string[] {
	const remaining: string[] = [];
	const fallback = equalHeights(sections.length);

	for (let i = 0; i < sections.length; i++) {
		if (draggedId && sections[i] === draggedId) {
			continue;
		}

		remaining.push(heights[i] ?? fallback[i] ?? '100%');
	}

	return remaining;
}

function paneHeightsFromOccupancy(
	occupancyHeights: string[],
	count: number
): string[] {
	if (occupancyHeights.length >= count) {
		return occupancyHeights.slice(0, count);
	}

	if (count === 2) {
		return ['50%', '50%'];
	}

	return equalHeights(count);
}

export type DropSlotPlan = {
	heights: string[];
	canRevealThird: boolean;
};

export function dropSlotPlan(options: {
	occupancy: number;
	isSource: boolean;
	remainingHeights: string[];
	occupancyHeights: string[];
	revealThird: boolean;
}): DropSlotPlan {
	const {
		occupancy,
		isSource,
		remainingHeights,
		occupancyHeights,
		revealThird,
	} = options;

	if (isSource) {
		if (occupancy <= 1) {
			return { heights: ['100%'], canRevealThird: false };
		}

		if (occupancy === 2) {
			return {
				heights: paneHeightsFromOccupancy(occupancyHeights, 2),
				canRevealThird: false,
			};
		}

		return {
			heights: paneHeightsFromOccupancy(occupancyHeights, 3),
			canRevealThird: false,
		};
	}

	if (occupancy <= 0) {
		return { heights: ['100%'], canRevealThird: false };
	}

	if (occupancy === 1) {
		return { heights: ['50%', '50%'], canRevealThird: false };
	}

	if (occupancy === 2) {
		const two =
			remainingHeights.length === 2
				? remainingHeights
				: paneHeightsFromOccupancy(occupancyHeights, 2);

		if (revealThird) {
			return { heights: equalHeights(3), canRevealThird: true };
		}

		return { heights: two, canRevealThird: true };
	}

	return {
		heights: paneHeightsFromOccupancy(occupancyHeights, 3),
		canRevealThird: false,
	};
}

export function parseDropHeightsAttr(value: string | null | undefined): number[] {
	if (!value) {
		return [100];
	}

	const parts = value
		.split(',')
		.map((part) => parseFloat(part.trim()))
		.filter((part) => Number.isFinite(part) && part > 0);

	return parts.length > 0 ? parts : [100];
}

export function dropSlotIndexFromY(
	clientY: number,
	dockTop: number,
	dockHeight: number,
	slotPercents: number[],
	alreadyRevealed: boolean,
	canRevealThird = true
): { slot: 0 | 1 | 2; revealThird: boolean } {
	if (dockHeight <= 0) {
		return { slot: 0, revealThird: false };
	}

	const percents =
		slotPercents.length > 0 ? slotPercents : [100];

	if (percents.length === 1) {
		return { slot: 0, revealThird: false };
	}

	const inRevealZone =
		clientY >= dockTop + dockHeight - REVEAL_THIRD_ZONE_PX;
	const revealed = canRevealThird && alreadyRevealed;

	if (canRevealThird && !revealed && inRevealZone) {
		return { slot: 2, revealThird: true };
	}

	const bands = revealed
		? equalHeights(3).map((height) => parsePercent(height))
		: percents;

	const y = clientY - dockTop;
	let acc = 0;

	for (let i = 0; i < bands.length; i++) {
		acc += (bands[i] / 100) * dockHeight;
		const isLast = i === bands.length - 1;

		if (y < acc || isLast) {
			const slot = Math.min(2, i) as 0 | 1 | 2;
			return {
				slot,
				revealThird: revealed && slot === 2,
			};
		}
	}

	return { slot: 0, revealThird: false };
}

export function normalizeSidebarLayout(
	layout?: SidebarLayout | null
): SidebarLayout {
	if (
		layout?.inserter?.dock &&
		layout?.listView?.dock &&
		layout?.complementary?.dock
	) {
		return layout;
	}

	return DEFAULT_SIDEBAR_LAYOUT;
}

export function getSectionDock(
	layout: SidebarLayout,
	sectionId: SidebarSectionId
): SidebarDockId {
	return normalizeSidebarLayout(layout)[sectionId].dock;
}

export function getDockSections(
	layout: SidebarLayout,
	dock: SidebarDockId
): SidebarSectionId[] {
	const sections: SidebarSectionId[] = [];
	const safeLayout = normalizeSidebarLayout(layout);

	for (let i = 0; i < SIDEBAR_SECTION_IDS.length; i++) {
		const id = SIDEBAR_SECTION_IDS[i];
		if (safeLayout[id].dock === dock) {
			sections.push(id);
		}
	}

	sections.sort((a, b) => safeLayout[a].order - safeLayout[b].order);
	return sections;
}

export function getVisibleDockSections(
	layout: SidebarLayout,
	dock: SidebarDockId,
	isComplementaryOpen: boolean
): SidebarSectionId[] {
	return getDockSections(layout, dock).filter((id) => {
		if (id === 'complementary') {
			return isComplementaryOpen;
		}
		return true;
	});
}

export function moveSection(
	layout: SidebarLayout,
	sectionId: SidebarSectionId,
	targetDock: SidebarDockId,
	insertIndex: number
): SidebarLayout {
	const current = normalizeSidebarLayout(layout);
	const sourceDock = current[sectionId].dock;
	const others: SidebarSectionId[] = [];

	for (let i = 0; i < SIDEBAR_SECTION_IDS.length; i++) {
		const id = SIDEBAR_SECTION_IDS[i];
		if (id !== sectionId) {
			others.push(id);
		}
	}

	const target = others
		.filter((id) => current[id].dock === targetDock)
		.sort((a, b) => current[a].order - current[b].order);

	const next: SidebarLayout = {
		inserter: { ...current.inserter },
		listView: { ...current.listView },
		complementary: { ...current.complementary },
	};

	if (sourceDock === targetDock && target.length === 2) {
		const occupants = getDockSections(current, targetDock);
		const slot = Math.max(0, Math.min(insertIndex, occupants.length - 1));
		const occupant = occupants[slot];

		if (!occupant || occupant === sectionId) {
			return current;
		}

		const draggedOrder = current[sectionId].order;
		const occupantOrder = current[occupant].order;
		next[sectionId] = { dock: targetDock, order: occupantOrder };
		next[occupant] = { dock: targetDock, order: draggedOrder };
		return next;
	}

	const clamped = Math.max(0, Math.min(insertIndex, target.length));
	target.splice(clamped, 0, sectionId);

	for (let i = 0; i < target.length; i++) {
		next[target[i]] = { dock: targetDock, order: i };
	}

	if (sourceDock !== targetDock) {
		const source = others
			.filter((id) => current[id].dock === sourceDock)
			.sort((a, b) => current[a].order - current[b].order);

		for (let i = 0; i < source.length; i++) {
			next[source[i]] = { dock: sourceDock, order: i };
		}
	}

	return next;
}

export function dropIndexFromY(
	clientY: number,
	dockTop: number,
	dockHeight: number,
	insertSlotCount: number
): number {
	if (insertSlotCount <= 1 || dockHeight <= 0) {
		return 0;
	}

	const ratio = (clientY - dockTop) / dockHeight;
	const band = Math.floor(ratio * insertSlotCount);
	return Math.max(0, Math.min(insertSlotCount - 1, band));
}

export function remapHeightsForReorder(
	sectionOrderBefore: SidebarSectionId[],
	heightsBefore: string[],
	sectionOrderAfter: SidebarSectionId[]
): string[] {
	const byId: Partial<Record<SidebarSectionId, string>> = {};

	for (let i = 0; i < sectionOrderBefore.length; i++) {
		byId[sectionOrderBefore[i]] = heightsBefore[i] ?? equalHeights(sectionOrderBefore.length)[i];
	}

	return sectionOrderAfter.map(
		(id, i) => byId[id] ?? equalHeights(sectionOrderAfter.length)[i]
	);
}

export function heightsAfterMove(options: {
	fromDock: SidebarDockId;
	toDock: SidebarDockId;
	fromSectionsBefore: SidebarSectionId[];
	toSectionsBefore: SidebarSectionId[];
	fromHeights: string[];
	toHeights: string[];
	toSectionsAfter: SidebarSectionId[];
}): { fromHeights: string[]; toHeights: string[] } {
	const {
		fromDock,
		toDock,
		fromSectionsBefore,
		toSectionsBefore,
		fromHeights,
		toHeights,
		toSectionsAfter,
	} = options;

	if (fromDock === toDock) {
		const remapped = remapHeightsForReorder(
			fromSectionsBefore,
			fromHeights,
			toSectionsAfter
		);
		return { fromHeights: remapped, toHeights };
	}

	const nextFrom = equalHeights(fromSectionsBefore.length - 1);
	const nextTo =
		toSectionsAfter.length === toSectionsBefore.length + 1
			? equalHeights(toSectionsAfter.length)
			: toHeights;

	return { fromHeights: nextFrom, toHeights: nextTo };
}

export function splitHeightsAtBoundary(
	heights: string[],
	boundaryIndex: number,
	boundaryPercentFromTop: number
): string[] {
	if (heights.length < 2 || boundaryIndex < 0 || boundaryIndex >= heights.length - 1) {
		return heights;
	}

	const numeric = heights.map((h) => parsePercent(h));
	let above = 0;

	for (let i = 0; i < boundaryIndex; i++) {
		above += numeric[i];
	}

	let below = 0;
	for (let i = boundaryIndex + 2; i < numeric.length; i++) {
		below += numeric[i];
	}

	const pairTotal = 100 - above - below;
	const min = Math.min(MIN_PANE_PERCENT, pairTotal / 2);
	let topPane = boundaryPercentFromTop - above;
	topPane = Math.max(min, Math.min(pairTotal - min, topPane));

	const next = numeric.slice();
	next[boundaryIndex] = topPane;
	next[boundaryIndex + 1] = pairTotal - topPane;
	return next.map(formatPercent);
}

export function listViewHeightFromLayout(
	layout: SidebarLayout,
	leftHeights: string[]
): string {
	const left = getDockSections(layout, 'left');
	const listIndex = left.indexOf('listView');

	if (listIndex === -1) {
		return leftHeights[leftHeights.length - 1] ?? '50%';
	}

	return leftHeights[listIndex] ?? '50%';
}

export function migrateLayoutState(raw: {
	sidebarLayout?: SidebarLayout;
	leftDockPaneHeights?: string[];
	rightDockPaneHeights?: string[];
	listViewHeight?: string;
}): {
	sidebarLayout: SidebarLayout;
	leftDockPaneHeights: string[];
	rightDockPaneHeights: string[];
	listViewHeight: string;
} {
	const sidebarLayout = raw.sidebarLayout ?? DEFAULT_SIDEBAR_LAYOUT;
	const leftCount = getDockSections(sidebarLayout, 'left').length;
	const rightCount = getDockSections(sidebarLayout, 'right').length;

	let leftDockPaneHeights = raw.leftDockPaneHeights;
	if (!leftDockPaneHeights || leftDockPaneHeights.length !== leftCount) {
		if (leftCount === 2 && raw.listViewHeight) {
			const bottom = parsePercent(raw.listViewHeight, 50);
			leftDockPaneHeights = [formatPercent(100 - bottom), formatPercent(bottom)];
		} else {
			leftDockPaneHeights = equalHeights(leftCount);
		}
	}

	let rightDockPaneHeights = raw.rightDockPaneHeights;
	if (!rightDockPaneHeights || rightDockPaneHeights.length !== rightCount) {
		rightDockPaneHeights = equalHeights(rightCount);
	}

	return {
		sidebarLayout,
		leftDockPaneHeights,
		rightDockPaneHeights,
		listViewHeight: listViewHeightFromLayout(
			sidebarLayout,
			leftDockPaneHeights
		),
	};
}
