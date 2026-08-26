/**
 * @jest-environment jsdom
 */

/**
 * Internal dependencies
 */
import { pushSiteEditorHistory } from '../push-history';

describe('pushSiteEditorHistory', () => {
	let pushStateSpy;
	let dispatchSpy;

	beforeEach(() => {
		window.history.replaceState(
			{ usr: 'keep-me', key: 'oldkey', idx: 2, extra: true },
			'',
			'/wp-admin/site-editor.php?p=/&blockera-builder=archive'
		);
		pushStateSpy = jest.spyOn(window.history, 'pushState');
		dispatchSpy = jest.spyOn(window, 'dispatchEvent');
	});

	afterEach(() => {
		pushStateSpy.mockRestore();
		dispatchSpy.mockRestore();
	});

	test('merges query args and pushes router-compatible state', () => {
		pushSiteEditorHistory({ p: '/identity' });

		expect(pushStateSpy).toHaveBeenCalledTimes(1);

		const [state, title, url] = pushStateSpy.mock.calls[0];

		expect(title).toBe('');
		expect(state.idx).toBe(3);
		expect(state.usr).toBe('keep-me');
		expect(state.extra).toBe(true);
		expect(typeof state.key).toBe('string');
		expect(state.key).toHaveLength(8);
		expect(state.key).not.toBe('oldkey');

		expect(String(url)).toContain('p=/identity');
		expect(String(url)).not.toContain('%2F');
		expect(String(url)).toContain('blockera-builder=archive');

		expect(dispatchSpy).toHaveBeenCalledWith(
			expect.objectContaining({ type: 'popstate' })
		);
	});

	test('keeps slashes and colons literal in p and blockera-builder', () => {
		pushSiteEditorHistory({
			p: '/wp_template/blockera-one//archive',
			'blockera-builder': 'archive/posts-loop/post-title',
		});

		const [, , url] = pushStateSpy.mock.calls[0];
		const href = String(url);

		expect(href).toContain('p=/wp_template/blockera-one//archive');
		expect(href).toContain(
			'blockera-builder=archive/posts-loop/post-title'
		);
		expect(href).not.toContain('%2F');
	});

	test('starts idx at 0 when previous state has no idx', () => {
		window.history.replaceState(null, '', '/wp-admin/site-editor.php?p=/');
		pushStateSpy.mockClear();

		pushSiteEditorHistory({ p: '/homepage' });

		const [state] = pushStateSpy.mock.calls[0];
		expect(state.idx).toBe(0);
		expect(state.usr).toBeNull();
	});

	test('scrubs empty and literal undefined query keys', () => {
		pushSiteEditorHistory(
			{ 'blockera-builder': 'undefined', canvas: '' },
			{ scrubKeys: ['blockera-builder', 'canvas'] }
		);

		const [, , url] = pushStateSpy.mock.calls[0];
		const parsed = new URL(String(url), 'http://localhost');

		expect(parsed.searchParams.has('blockera-builder')).toBe(false);
		expect(parsed.searchParams.has('canvas')).toBe(false);
		expect(parsed.searchParams.get('p')).toBe('/');
	});

	test('leaves unscrubbed empty keys in the URL', () => {
		pushSiteEditorHistory({ canvas: '' });

		const [, , url] = pushStateSpy.mock.calls[0];
		const parsed = new URL(String(url), 'http://localhost');

		expect(parsed.searchParams.has('canvas')).toBe(true);
	});
});
