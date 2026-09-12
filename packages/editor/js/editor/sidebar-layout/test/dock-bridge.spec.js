/**
 * Internal dependencies
 */
import {
	shouldSkipEditorSidebarApiSync,
	shouldSkipEditorStoreSidebarSync,
} from '../dock-bridge';

describe('shouldSkipEditorSidebarApiSync', () => {
	it('runs the first tick so complementary state can prime', () => {
		expect(
			shouldSkipEditorSidebarApiSync(
				false,
				false,
				false,
				'edit-site/global-styles',
				'edit-site/global-styles'
			)
		).toBe(false);
	});

	it('skips Global Styles ticks that do not toggle inserter, list view, or settings', () => {
		expect(
			shouldSkipEditorSidebarApiSync(
				true,
				false,
				false,
				'edit-site/global-styles',
				'edit-site/global-styles'
			)
		).toBe(true);
	});

	it('still handles Gutenberg inserter or list view open requests', () => {
		expect(
			shouldSkipEditorSidebarApiSync(
				true,
				true,
				false,
				'edit-site/global-styles',
				'edit-site/global-styles'
			)
		).toBe(false);
		expect(
			shouldSkipEditorSidebarApiSync(
				true,
				false,
				true,
				'edit-site/global-styles',
				'edit-site/global-styles'
			)
		).toBe(false);
	});

	it('still handles complementary area enable and disable', () => {
		expect(
			shouldSkipEditorSidebarApiSync(
				true,
				false,
				false,
				null,
				'edit-site/global-styles'
			)
		).toBe(false);
		expect(
			shouldSkipEditorSidebarApiSync(
				true,
				false,
				false,
				'edit-post/document',
				null
			)
		).toBe(false);
	});
});

describe('shouldSkipEditorStoreSidebarSync', () => {
	it('skips primed editor-store ticks that are not inserter or list view', () => {
		expect(
			shouldSkipEditorStoreSidebarSync(true, false, false)
		).toBe(true);
	});

	it('still handles Gutenberg inserter or list view open requests', () => {
		expect(shouldSkipEditorStoreSidebarSync(true, true, false)).toBe(
			false
		);
		expect(shouldSkipEditorStoreSidebarSync(true, false, true)).toBe(
			false
		);
	});

	it('runs the first tick so complementary state can prime', () => {
		expect(
			shouldSkipEditorStoreSidebarSync(false, false, false)
		).toBe(false);
	});
});
