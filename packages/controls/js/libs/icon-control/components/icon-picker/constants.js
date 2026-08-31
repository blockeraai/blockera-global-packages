export const ALL_PREVIEW_SIZE = 200;
export const ICON_CHUNK_SIZE = 500;
export const PLACEHOLDER_HEIGHT_RATIO = 2;
export const SEARCH_FREE_LIMIT = 49;
export const SEARCH_PRO_LIMIT = 400;
export const ICON_GRID_GAP = 26;
export const ICON_GRID_WINDOW_BUFFER_ROWS = 2;
// First paint before cell metrics exist; larger than this mounts hundreds of search cells.
export const ICON_GRID_INITIAL_WINDOW = 120;
export const LIBRARY_ICON_CELL_SELECTOR =
	'[data-blockera-icon][data-blockera-library]';

/**
 * Cap the initial visible slice so windowed grids do not paint `cap` cells first.
 *
 * @param {number}  cap
 * @param {Object}  options
 * @param {boolean} options.windowEnabled
 * @param {boolean} options.limitToPreview
 * @return {number} Inclusive end index for the first window.
 */
export function getIconGridResetEndIndex(
	cap,
	{ windowEnabled = true, limitToPreview = false } = {}
) {
	if (windowEnabled && !limitToPreview) {
		return Math.min(cap, ICON_GRID_INITIAL_WINDOW);
	}

	return cap;
}
