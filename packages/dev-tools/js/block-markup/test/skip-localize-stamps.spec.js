/**
 * Internal dependencies
 */
const {
	extractBlockeraOneStamp,
	getSkipLocalizeStamps,
	isSkipLocalizeStamp,
	parseGutenbergComment,
} = require('../skip-localize-stamps');

describe('skip-localize-stamps', () => {
	const skipById = ['meta-separator'];
	const skipByRoleId = ['container/meta-separator'];

	it('reads skip stamps from localize.skipStamps', () => {
		expect(
			getSkipLocalizeStamps({
				enabled: true,
				skipStamps: {
					enabled: true,
					stamps: ['meta-separator'],
				},
			})
		).toEqual(['meta-separator']);
		expect(getSkipLocalizeStamps({ skipStamps: { enabled: false } })).toEqual(
			[]
		);
		expect(getSkipLocalizeStamps({ enabled: false })).toEqual([]);
		expect(
			getSkipLocalizeStamps({
				skipStamps: {
					enabled: true,
					stamps: ['', 'meta-separator'],
				},
			})
		).toEqual(['meta-separator']);
	});

	it('extracts a blockeraOne stamp from a Gutenberg comment', () => {
		expect(
			extractBlockeraOneStamp(
				' wp:paragraph {"metadata":{"name":"Separator","blockeraOne":"container/meta-separator:default"}} '
			)
		).toBe('container/meta-separator:default');
		expect(
			extractBlockeraOneStamp(
				" wp:paragraph {'metadata':{'blockeraOne':'container/meta-separator:default'}} "
			)
		).toBe('container/meta-separator:default');
		expect(extractBlockeraOneStamp(' wp:paragraph ')).toBe('');
	});

	it('matches skip list by stamp id, role/id, or full stamp', () => {
		expect(
			isSkipLocalizeStamp('container/meta-separator:default', skipById)
		).toBe(true);
		expect(isSkipLocalizeStamp('container/meta-separator', skipById)).toBe(
			true
		);
		expect(
			isSkipLocalizeStamp(
				'container/meta-separator:default',
				skipByRoleId
			)
		).toBe(true);
		expect(
			isSkipLocalizeStamp('container/meta-item-prefix:default', skipById)
		).toBe(false);
	});

	it('parses open, self-closing, and closer Gutenberg comments', () => {
		expect(
			parseGutenbergComment(
				' wp:paragraph {"metadata":{"blockeraOne":"container/meta-separator:default"}} ',
				skipById
			)
		).toEqual({ closer: false, selfClosing: false, skipText: true });
		expect(
			parseGutenbergComment(
				' wp:post-terms {"metadata":{"blockeraOne":"container/meta-item-block:default"}} /',
				skipById
			)
		).toEqual({ closer: false, selfClosing: true, skipText: false });
		expect(parseGutenbergComment(' /wp:paragraph ', skipById)).toEqual({
			closer: true,
		});
		expect(parseGutenbergComment('?php echo 1; ?', skipById)).toBeNull();
	});
});
