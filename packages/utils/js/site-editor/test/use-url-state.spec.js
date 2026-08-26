/**
 * @jest-environment jsdom
 */

/**
 * External dependencies
 */
import { act, renderHook } from '@testing-library/react';

/**
 * Internal dependencies
 */
import { useSiteEditorUrlState } from '../use-url-state';

const readPath = () =>
	new URL(window.location.href).searchParams.get('p') || '/';

describe('useSiteEditorUrlState', () => {
	test('returns the derived value on mount', () => {
		window.history.replaceState(
			{},
			'',
			'/wp-admin/site-editor.php?p=/styles'
		);

		const { result, unmount } = renderHook(() =>
			useSiteEditorUrlState(readPath)
		);

		expect(result.current).toBe('/styles');
		unmount();
	});

	test('re-reads after patched pushState navigation', () => {
		window.history.replaceState({}, '', '/wp-admin/site-editor.php?p=/');

		const { result, unmount } = renderHook(() =>
			useSiteEditorUrlState(readPath)
		);
		expect(result.current).toBe('/');

		act(() => {
			window.history.pushState(
				{},
				'',
				'/wp-admin/site-editor.php?p=/styles'
			);
		});
		expect(result.current).toBe('/styles');

		unmount();
	});

	test('uses the latest reader without re-subscribing', () => {
		window.history.replaceState({}, '', '/wp-admin/site-editor.php?p=/');

		const { result, rerender, unmount } = renderHook(
			({ read }) => useSiteEditorUrlState(read),
			{ initialProps: { read: () => 'first' } }
		);
		expect(result.current).toBe('first');

		// The value only refreshes on navigation, not on rerender.
		rerender({ read: () => 'second' });
		expect(result.current).toBe('first');

		act(() => {
			window.history.pushState(
				{},
				'',
				'/wp-admin/site-editor.php?p=/styles'
			);
		});
		expect(result.current).toBe('second');

		unmount();
	});

	test('does not sync outside the Site Editor', () => {
		window.history.replaceState({}, '', '/wp-admin/post.php?post=1');

		let value = 'initial';
		const { result, unmount } = renderHook(() =>
			useSiteEditorUrlState(() => value)
		);
		expect(result.current).toBe('initial');

		value = 'changed';
		act(() => {
			window.history.pushState({}, '', '/wp-admin/post.php?post=2');
		});
		expect(result.current).toBe('initial');

		unmount();
	});
});
