/**
 * @jest-environment jsdom
 */

/**
 * Internal dependencies
 */
import { withLiteralQueryChars } from '../query-chars';

describe('withLiteralQueryChars', () => {
	test('decodes slashes and colons in the query only', () => {
		expect(
			withLiteralQueryChars(
				'/wp-admin/site-editor.php?p=%2Fwp_template%2Fblockera-one%2F%2Farchive&blockera-builder=children%3Acategory'
			)
		).toBe(
			'/wp-admin/site-editor.php?p=/wp_template/blockera-one//archive&blockera-builder=children:category'
		);
	});

	test('leaves pathname and hash encoding alone', () => {
		expect(
			withLiteralQueryChars('/path%2Fname?p=%2Ftemplate#frag%2Fx')
		).toBe('/path%2Fname?p=/template#frag%2Fx');
	});

	test('returns the same string when there is nothing to decode', () => {
		expect(withLiteralQueryChars('/wp-admin/site-editor.php?p=/')).toBe(
			'/wp-admin/site-editor.php?p=/'
		);
	});
});
