// @flow

export const DEFAULT_INSET = 50;
export const DEFAULT_PAGE_TOP_MAX_PX = 300;
export const SKIP_TOP_EPSILON_PX = 1;

/**
 * Scroll only when any part of the node is outside the viewport.
 * A node fully inside the port is left alone.
 */
export function shouldScrollSpotlightNode(
	blockTop: number,
	blockBottom: number,
	portTop: number,
	portBottom: number
): boolean {
	return blockTop < portTop || blockBottom > portBottom;
}

/**
 * Delta so `blockTop` lands `inset` below `portTop`.
 */
export function scrollDeltaForTopOffset(
	blockTop: number,
	portTop: number,
	inset: number = DEFAULT_INSET
): number {
	return blockTop - portTop - inset;
}

/**
 * Extra bottom padding so `delta` is not clamped by maxScroll.
 */
export function scrollRoomNeeded(delta: number, maxScroll: number): number {
	return Math.max(0, Math.ceil(delta - Math.max(0, maxScroll)));
}

/**
 * Next scrollTop. Nodes whose document Y is under `pageTopMaxPx` go to
 * page top. Others move only enough to bring the whole node in with
 * `inset` from the edge it came from. A node taller than the port pins
 * its top at that inset.
 */
export function resolveSpotlightScrollTop(
	blockTop: number,
	blockBottom: number,
	portTop: number,
	portBottom: number,
	scrollTop: number,
	docY: number,
	inset: number = DEFAULT_INSET,
	pageTopMaxPx: number = DEFAULT_PAGE_TOP_MAX_PX
): number {
	if (docY < pageTopMaxPx) {
		return 0;
	}
	const viewHeight = portBottom - portTop;
	const blockHeight = Math.max(0, blockBottom - blockTop);
	if (blockHeight + inset > viewHeight) {
		return Math.max(
			0,
			scrollTop + scrollDeltaForTopOffset(blockTop, portTop, inset)
		);
	}
	if (blockTop < portTop) {
		return Math.max(
			0,
			scrollTop + scrollDeltaForTopOffset(blockTop, portTop, inset)
		);
	}
	if (blockBottom > portBottom) {
		return Math.max(
			0,
			scrollTop + (blockBottom - (portBottom - inset))
		);
	}
	return scrollTop;
}
