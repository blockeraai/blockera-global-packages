/**
 * @jest-environment jsdom
 */

/**
 * Internal dependencies
 */
import { SITE_EDITOR_PATH, isSiteEditorUrl } from '../is-url';

describe('isSiteEditorUrl', () => {
	test('is true when pathname includes site-editor.php', () => {
		window.history.replaceState({}, '', '/wp-admin/site-editor.php?p=/');
		expect(isSiteEditorUrl()).toBe(true);
		expect(SITE_EDITOR_PATH).toBe('site-editor.php');
	});

	test('is false on other admin screens', () => {
		window.history.replaceState({}, '', '/wp-admin/post.php?post=1');
		expect(isSiteEditorUrl()).toBe(false);
	});
});
