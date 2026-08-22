/**
 * @jest-environment jsdom
 */

/**
 * Internal dependencies
 */
import { SITE_EDITOR_ROOT_PATH } from '../is-url';
import {
	getSiteEditorPath,
	isSiteEditorRootPath,
	navigateToSiteEditorPath,
} from '../path';

describe('getSiteEditorPath / isSiteEditorRootPath', () => {
	test('reads the p query arg', () => {
		window.history.replaceState(
			{},
			'',
			'/wp-admin/site-editor.php?p=/styles'
		);
		expect(getSiteEditorPath()).toBe('/styles');
		expect(isSiteEditorRootPath()).toBe(false);
	});

	test('strips a nested query from p', () => {
		window.history.replaceState(
			{},
			'',
			'/wp-admin/site-editor.php?p=/template?postType=wp_template'
		);
		expect(getSiteEditorPath()).toBe('/template');
	});

	test('defaults to root when p is missing', () => {
		window.history.replaceState({}, '', '/wp-admin/site-editor.php');
		expect(getSiteEditorPath()).toBe(SITE_EDITOR_ROOT_PATH);
		expect(isSiteEditorRootPath()).toBe(true);
	});

	test('treats / as root even with a leftover query on the path argument', () => {
		expect(isSiteEditorRootPath('/?canvas=edit')).toBe(true);
		expect(isSiteEditorRootPath('/styles')).toBe(false);
	});
});

describe('navigateToSiteEditorPath', () => {
	test('pushes the path as the p query arg', () => {
		window.history.replaceState(
			{ idx: 0 },
			'',
			'/wp-admin/site-editor.php?p=/'
		);
		const pushStateSpy = jest.spyOn(window.history, 'pushState');

		navigateToSiteEditorPath('/identity');

		const [, , url] = pushStateSpy.mock.calls[0];
		const parsed = new URL(String(url), 'http://localhost');
		expect(parsed.searchParams.get('p')).toBe('/identity');

		pushStateSpy.mockRestore();
	});
});
