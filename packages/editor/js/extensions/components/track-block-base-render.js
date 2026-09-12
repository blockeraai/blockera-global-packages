// @flow

/**
 * Blockera dependencies
 */
import {
	BLOCK_BASE_RENDER_DEBUG_KEY,
	BLOCK_BASE_RENDER_STATS_KEY,
	shouldTrackComponentRender,
	trackComponentRender,
} from '@blockera/utils';

export {
	BLOCK_BASE_RENDER_DEBUG_KEY,
	BLOCK_BASE_RENDER_STATS_KEY,
	shouldTrackComponentRender,
};

/**
 * Count BlockBase renders when e2e sets
 * `window.__BLOCKERA_BLOCK_BASE_RENDER_DEBUG__` or
 * `window.__BLOCKERA_RENDER_DEBUG__` before mount.
 *
 * @param {Object} details
 * @return {void}
 */
export function trackBlockBaseRender(details: {
	clientId: string,
	name: string,
	isSelected: boolean,
	insideBlockInspector: boolean,
}): void {
	trackComponentRender('BlockBase', details);
}
