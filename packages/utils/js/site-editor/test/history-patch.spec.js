/**
 * @jest-environment jsdom
 */

/**
 * External dependencies
 */
import { renderHook } from '@testing-library/react';

/**
 * Internal dependencies
 */
import {
	SITE_EDITOR_NAVIGATE_EVENT,
	ensureSiteEditorHistoryPatch,
	useSiteEditorNavigate,
} from '../history-patch';

describe('ensureSiteEditorHistoryPatch', () => {
	test('emits the navigate event on pushState and replaceState', () => {
		window.history.replaceState({}, '', '/wp-admin/site-editor.php?p=/');
		const listener = jest.fn();
		window.addEventListener(SITE_EDITOR_NAVIGATE_EVENT, listener);

		const unpatch = ensureSiteEditorHistoryPatch();
		listener.mockClear();

		window.history.pushState({}, '', '/wp-admin/site-editor.php?p=/styles');
		expect(listener).toHaveBeenCalled();

		listener.mockClear();
		window.history.replaceState(
			{},
			'',
			'/wp-admin/site-editor.php?p=/homepage'
		);
		expect(listener).toHaveBeenCalled();

		unpatch();
		window.removeEventListener(SITE_EDITOR_NAVIGATE_EVENT, listener);
	});

	test('unsubscribe removes the popstate emit added by this call', () => {
		const listener = jest.fn();
		window.addEventListener(SITE_EDITOR_NAVIGATE_EVENT, listener);

		const unpatch = ensureSiteEditorHistoryPatch();
		listener.mockClear();
		unpatch();

		window.dispatchEvent(new Event('popstate'));
		expect(listener).not.toHaveBeenCalled();

		window.removeEventListener(SITE_EDITOR_NAVIGATE_EVENT, listener);
	});

	test('rewrites encoded query chars on the current location', () => {
		window.history.replaceState(
			{ keep: true },
			'',
			'/wp-admin/site-editor.php?p=%2Fwp_template%2Fblockera-one%2F%2Farchive&blockera-builder=children%3Acategory'
		);

		ensureSiteEditorHistoryPatch();

		expect(window.location.search).toBe(
			'?p=/wp_template/blockera-one//archive&blockera-builder=children:category'
		);
		expect(window.history.state).toEqual({ keep: true });
	});
});

describe('useSiteEditorNavigate', () => {
	test('calls listener on subscribe and after patched pushState', () => {
		window.history.replaceState({}, '', '/wp-admin/site-editor.php?p=/');
		const listener = jest.fn();

		const { unmount } = renderHook(() => useSiteEditorNavigate(listener));

		expect(listener).toHaveBeenCalledTimes(1);

		window.history.pushState({}, '', '/wp-admin/site-editor.php?p=/styles');
		expect(listener).toHaveBeenCalledTimes(2);

		unmount();
	});

	test('does not subscribe outside the Site Editor', () => {
		window.history.replaceState({}, '', '/wp-admin/post.php?post=1');
		const listener = jest.fn();

		const { unmount } = renderHook(() => useSiteEditorNavigate(listener));

		expect(listener).not.toHaveBeenCalled();
		unmount();
	});
});
