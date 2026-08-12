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
			'/wp-admin/site-editor.php?p=/&boFilter=archive'
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

		const parsed = new URL(String(url), 'http://localhost');
		expect(parsed.searchParams.get('p')).toBe('/identity');
		expect(parsed.searchParams.get('boFilter')).toBe('archive');

		expect(dispatchSpy).toHaveBeenCalledWith(
			expect.objectContaining({ type: 'popstate' })
		);
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
			{ boFilter: 'undefined', partsArea: '' },
			{ scrubKeys: ['boFilter', 'partsArea'] }
		);

		const [, , url] = pushStateSpy.mock.calls[0];
		const parsed = new URL(String(url), 'http://localhost');

		expect(parsed.searchParams.has('boFilter')).toBe(false);
		expect(parsed.searchParams.has('partsArea')).toBe(false);
		expect(parsed.searchParams.get('p')).toBe('/');
	});

	test('leaves unscrubbed empty keys in the URL', () => {
		pushSiteEditorHistory({ canvas: '' });

		const [, , url] = pushStateSpy.mock.calls[0];
		const parsed = new URL(String(url), 'http://localhost');

		expect(parsed.searchParams.has('canvas')).toBe(true);
	});
});
