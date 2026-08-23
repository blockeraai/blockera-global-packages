/**
 * @jest-environment jsdom
 */

/**
 * Internal dependencies
 */
import {
	DEFAULT_INSET,
	DEFAULT_PAGE_TOP_MAX_PX,
	resolveSpotlightScrollTop,
	scrollDeltaForTopOffset,
	scrollRoomNeeded,
	shouldScrollSpotlightNode,
} from '../scroll';

const PORT_TOP = 0;
const PORT_BOTTOM = 800;

describe('shouldScrollSpotlightNode', () => {
	it('scrolls when the node is below the fold', () => {
		expect(shouldScrollSpotlightNode(820, 850, PORT_TOP, PORT_BOTTOM)).toBe(
			true
		);
	});

	it('scrolls when the node is above the viewport', () => {
		expect(shouldScrollSpotlightNode(-40, -10, PORT_TOP, PORT_BOTTOM)).toBe(
			true
		);
	});

	it('scrolls when the top is in view but the bottom is clipped', () => {
		expect(shouldScrollSpotlightNode(780, 830, PORT_TOP, PORT_BOTTOM)).toBe(
			true
		);
	});

	it('does not scroll when the whole node is inside the canvas', () => {
		expect(shouldScrollSpotlightNode(0, 30, PORT_TOP, PORT_BOTTOM)).toBe(
			false
		);
		expect(shouldScrollSpotlightNode(11, 40, PORT_TOP, PORT_BOTTOM)).toBe(
			false
		);
		expect(shouldScrollSpotlightNode(50, 80, PORT_TOP, PORT_BOTTOM)).toBe(
			false
		);
		expect(shouldScrollSpotlightNode(650, 680, PORT_TOP, PORT_BOTTOM)).toBe(
			false
		);
		expect(shouldScrollSpotlightNode(770, 800, PORT_TOP, PORT_BOTTOM)).toBe(
			false
		);
		expect(shouldScrollSpotlightNode(990, 1020, 0, 1265)).toBe(false);
	});
});

describe('resolveSpotlightScrollTop', () => {
	it('goes to page top when the node lives in the first 300px of the document', () => {
		expect(DEFAULT_PAGE_TOP_MAX_PX).toBe(300);
		expect(
			resolveSpotlightScrollTop(-6387, -6350, 0, 800, 6562.5, 174.9)
		).toBe(0);
		expect(resolveSpotlightScrollTop(5, 40, 0, 800, 170, 175)).toBe(0);
		expect(resolveSpotlightScrollTop(820, 850, 0, 800, 0, 299)).toBe(0);
	});

	it('scrolls only enough to bring a below-the-fold node in with the inset', () => {
		expect(resolveSpotlightScrollTop(900, 930, 0, 800, 0, 900)).toBe(
			130 + DEFAULT_INSET
		);
		expect(resolveSpotlightScrollTop(820, 850, 0, 800, 200, 1020)).toBe(
			250 + DEFAULT_INSET
		);
	});

	it('scrolls only enough to bring an above-the-fold node in with the inset', () => {
		expect(resolveSpotlightScrollTop(-40, -10, 0, 800, 500, 460)).toBe(
			460 - DEFAULT_INSET
		);
	});

	it('does not move when the whole node is already in the canvas', () => {
		expect(resolveSpotlightScrollTop(50, 80, 0, 800, 200, 350)).toBe(200);
	});

	it('pins a node taller than the canvas at the inset from the top', () => {
		expect(resolveSpotlightScrollTop(900, 2000, 0, 800, 0, 900)).toBe(
			900 - DEFAULT_INSET
		);
	});
});

describe('scrollDeltaForTopOffset', () => {
	it('moves the block top to the given offset below the canvas top', () => {
		expect(scrollDeltaForTopOffset(820, 0)).toBe(820 - DEFAULT_INSET);
		expect(scrollDeltaForTopOffset(50, 0)).toBe(50 - DEFAULT_INSET);
		expect(scrollDeltaForTopOffset(DEFAULT_INSET, 0)).toBe(0);
		expect(scrollDeltaForTopOffset(-40, 0, 0)).toBe(-40);
		expect(scrollDeltaForTopOffset(820, 0, 100)).toBe(720);
	});
});

describe('scrollRoomNeeded', () => {
	it('returns 0 when the document can already absorb the delta', () => {
		expect(scrollRoomNeeded(200, 400)).toBe(0);
		expect(scrollRoomNeeded(25, 25)).toBe(0);
	});

	it('returns the shortfall when maxScroll is smaller than delta', () => {
		expect(scrollRoomNeeded(890, 25)).toBe(865);
		expect(scrollRoomNeeded(100, 0)).toBe(100);
	});
});
