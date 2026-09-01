/**
 * Internal dependencies
 */
import {
	dropIndexFromY,
	dropSlotIndexFromY,
	dropSlotPlan,
	equalHeights,
	getDockSections,
	getVisibleDockSections,
	heightsAfterMove,
	moveSection,
	remainingPaneHeights,
	splitHeightsAtBoundary,
} from '../layout';
import { DEFAULT_SIDEBAR_LAYOUT, REVEAL_THIRD_ZONE_PX } from '../constants';

describe('sidebar layout helpers', () => {
	it('returns dock sections in order', () => {
		expect(getDockSections(DEFAULT_SIDEBAR_LAYOUT, 'left')).toEqual([
			'inserter',
			'listView',
		]);
		expect(getDockSections(DEFAULT_SIDEBAR_LAYOUT, 'right')).toEqual([
			'complementary',
		]);
	});

	it('moves list view to the top of the right dock', () => {
		const next = moveSection(
			DEFAULT_SIDEBAR_LAYOUT,
			'listView',
			'right',
			0
		);
		expect(getDockSections(next, 'left')).toEqual(['inserter']);
		expect(getDockSections(next, 'right')).toEqual([
			'listView',
			'complementary',
		]);
	});

	it('moves list view below complementary on the right', () => {
		const next = moveSection(
			DEFAULT_SIDEBAR_LAYOUT,
			'listView',
			'right',
			1
		);
		expect(getDockSections(next, 'right')).toEqual([
			'complementary',
			'listView',
		]);
	});

	it('allows all three sections on one dock', () => {
		const withList = moveSection(
			DEFAULT_SIDEBAR_LAYOUT,
			'listView',
			'right',
			1
		);
		const allRight = moveSection(withList, 'inserter', 'right', 0);
		expect(getDockSections(allRight, 'left')).toEqual([]);
		expect(getDockSections(allRight, 'right')).toEqual([
			'inserter',
			'complementary',
			'listView',
		]);
	});

	it('maps pointer Y to insert bands', () => {
		expect(dropIndexFromY(10, 0, 100, 2)).toBe(0);
		expect(dropIndexFromY(60, 0, 100, 2)).toBe(1);
		expect(dropIndexFromY(10, 0, 100, 3)).toBe(0);
		expect(dropIndexFromY(50, 0, 100, 3)).toBe(1);
		expect(dropIndexFromY(90, 0, 100, 3)).toBe(2);
	});

	it('equalizes heights after a cross-dock move', () => {
		const result = heightsAfterMove({
			fromDock: 'left',
			toDock: 'right',
			fromSectionsBefore: ['inserter', 'listView'],
			toSectionsBefore: ['complementary'],
			fromHeights: ['50%', '50%'],
			toHeights: ['100%'],
			toSectionsAfter: ['listView', 'complementary'],
		});
		expect(result.fromHeights).toEqual(['100%']);
		expect(result.toHeights).toEqual(['50%', '50%']);
	});

	it('splits a two-pane dock at the boundary', () => {
		expect(splitHeightsAtBoundary(['50%', '50%'], 0, 30)).toEqual([
			'30%',
			'70%',
		]);
	});

	it('builds equal heights that sum to 100', () => {
		expect(equalHeights(1)).toEqual(['100%']);
		expect(equalHeights(2)).toEqual(['50%', '50%']);
		expect(equalHeights(3)).toEqual(['33.33%', '33.33%', '33.34%']);
	});

	it('hides complementary from a dock when settings are closed', () => {
		expect(
			getVisibleDockSections(DEFAULT_SIDEBAR_LAYOUT, 'right', false)
		).toEqual([]);
		expect(
			getVisibleDockSections(DEFAULT_SIDEBAR_LAYOUT, 'right', true)
		).toEqual(['complementary']);
	});

	it('inserts into a drop slot and pushes the existing section', () => {
		const next = moveSection(
			DEFAULT_SIDEBAR_LAYOUT,
			'listView',
			'right',
			2
		);
		expect(getDockSections(next, 'right')).toEqual([
			'complementary',
			'listView',
		]);
	});

	it('swaps when dropping onto a slot in a full three-section dock', () => {
		const full = {
			inserter: { dock: 'right', order: 0 },
			listView: { dock: 'right', order: 1 },
			complementary: { dock: 'right', order: 2 },
		};
		const swapped = moveSection(full, 'inserter', 'right', 2);
		expect(getDockSections(swapped, 'right')).toEqual([
			'complementary',
			'listView',
			'inserter',
		]);
	});

	it('keeps remaining pane heights when one section is dragged away', () => {
		expect(
			remainingPaneHeights(
				['inserter', 'listView'],
				['70%', '30%'],
				'listView'
			)
		).toEqual(['70%']);
		expect(
			remainingPaneHeights(
				['inserter', 'listView'],
				['70%', '30%'],
				'complementary'
			)
		).toEqual(['70%', '30%']);
	});

	it('plans drop slots from occupancy and source vs foreign dock', () => {
		expect(
			dropSlotPlan({
				occupancy: 1,
				isSource: true,
				remainingHeights: [],
				occupancyHeights: ['100%'],
				revealThird: false,
			})
		).toEqual({ heights: ['100%'], canRevealThird: false });

		expect(
			dropSlotPlan({
				occupancy: 2,
				isSource: true,
				remainingHeights: ['100%'],
				occupancyHeights: ['50%', '50%'],
				revealThird: true,
			})
		).toEqual({ heights: ['50%', '50%'], canRevealThird: false });

		expect(
			dropSlotPlan({
				occupancy: 2,
				isSource: true,
				remainingHeights: ['70%'],
				occupancyHeights: ['70%', '30%'],
				revealThird: false,
			})
		).toEqual({ heights: ['70%', '30%'], canRevealThird: false });

		expect(
			dropSlotPlan({
				occupancy: 3,
				isSource: true,
				remainingHeights: ['40%', '20%'],
				occupancyHeights: ['40%', '40%', '20%'],
				revealThird: false,
			})
		).toEqual({
			heights: ['40%', '40%', '20%'],
			canRevealThird: false,
		});

		expect(
			dropSlotPlan({
				occupancy: 0,
				isSource: false,
				remainingHeights: [],
				occupancyHeights: [],
				revealThird: false,
			})
		).toEqual({ heights: ['100%'], canRevealThird: false });

		expect(
			dropSlotPlan({
				occupancy: 1,
				isSource: false,
				remainingHeights: ['100%'],
				occupancyHeights: ['100%'],
				revealThird: true,
			})
		).toEqual({ heights: ['50%', '50%'], canRevealThird: false });

		expect(
			dropSlotPlan({
				occupancy: 2,
				isSource: false,
				remainingHeights: ['70%', '30%'],
				occupancyHeights: ['70%', '30%'],
				revealThird: false,
			})
		).toEqual({ heights: ['70%', '30%'], canRevealThird: true });

		expect(
			dropSlotPlan({
				occupancy: 2,
				isSource: false,
				remainingHeights: ['70%', '30%'],
				occupancyHeights: ['70%', '30%'],
				revealThird: true,
			})
		).toEqual({ heights: equalHeights(3), canRevealThird: true });

		expect(
			dropSlotPlan({
				occupancy: 3,
				isSource: false,
				remainingHeights: ['40%', '40%', '20%'],
				occupancyHeights: ['40%', '40%', '20%'],
				revealThird: false,
			})
		).toEqual({
			heights: ['40%', '40%', '20%'],
			canRevealThird: false,
		});
	});

	it('maps pointer Y in the last 20px to the third drop slot when allowed', () => {
		expect(
			dropSlotIndexFromY(
				100 - REVEAL_THIRD_ZONE_PX,
				0,
				100,
				[50, 50],
				false,
				true
			)
		).toEqual({ slot: 2, revealThird: true });
		expect(
			dropSlotIndexFromY(60, 0, 100, [50, 50], false, true)
		).toEqual({
			slot: 1,
			revealThird: false,
		});
		expect(
			dropSlotIndexFromY(10, 0, 100, [70, 30], false, true)
		).toEqual({
			slot: 0,
			revealThird: false,
		});
		expect(
			dropSlotIndexFromY(75, 0, 100, [70, 30], false, true)
		).toEqual({
			slot: 1,
			revealThird: false,
		});
	});

	it('does not reveal a third slot when the dock cannot grow to three', () => {
		expect(
			dropSlotIndexFromY(
				100 - REVEAL_THIRD_ZONE_PX,
				0,
				100,
				[50, 50],
				false,
				false
			)
		).toEqual({ slot: 1, revealThird: false });
		expect(
			dropSlotIndexFromY(90, 0, 100, [100], false, false)
		).toEqual({ slot: 0, revealThird: false });
		expect(
			dropSlotIndexFromY(90, 0, 100, [], false, false)
		).toEqual({ slot: 0, revealThird: false });
	});

	it('keeps the third slot only while the pointer stays in the last third', () => {
		expect(
			dropSlotIndexFromY(90, 0, 100, [50, 50], true, true)
		).toEqual({
			slot: 2,
			revealThird: true,
		});
		expect(
			dropSlotIndexFromY(50, 0, 100, [50, 50], true, true)
		).toEqual({
			slot: 1,
			revealThird: false,
		});
	});
});
