/**
 * Internal dependencies
 */
import {
	ICON_GRID_INITIAL_WINDOW,
	getIconGridResetEndIndex,
} from '../constants';

describe('getIconGridResetEndIndex', () => {
	it('caps windowed grids to the initial window', () => {
		expect(
			getIconGridResetEndIndex(380, {
				windowEnabled: true,
				limitToPreview: false,
			})
		).toBe(ICON_GRID_INITIAL_WINDOW);
	});

	it('uses the full cap for All-tab preview and unwindowed grids', () => {
		expect(
			getIconGridResetEndIndex(200, {
				windowEnabled: true,
				limitToPreview: true,
			})
		).toBe(200);

		expect(
			getIconGridResetEndIndex(49, {
				windowEnabled: false,
				limitToPreview: false,
			})
		).toBe(49);
	});

	it('does not exceed a cap smaller than the initial window', () => {
		expect(
			getIconGridResetEndIndex(40, {
				windowEnabled: true,
				limitToPreview: false,
			})
		).toBe(40);
	});
});
