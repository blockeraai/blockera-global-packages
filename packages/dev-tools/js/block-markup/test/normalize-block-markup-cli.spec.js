/**
 * Internal dependencies
 */
const { parseArgs } = require('../normalize-block-markup-cli');

describe('parseArgs', () => {
	it('parses boolean flags and keyed overrides', () => {
		expect(
			parseArgs([
				'--check',
				'--force',
				'--debug',
				'--quiet',
				'--prettier-only',
				'--text-domain=blockera-one',
				'--uri-php=get_stylesheet_directory_uri()',
			])
		).toEqual({
			check: true,
			force: true,
			debug: true,
			quiet: true,
			prettierOnly: true,
			textDomain: 'blockera-one',
			uriPhpExpression: 'get_stylesheet_directory_uri()',
		});
	});

	it('ignores unknown flags', () => {
		expect(parseArgs(['--unknown', 'plain'])).toEqual({});
	});
});
