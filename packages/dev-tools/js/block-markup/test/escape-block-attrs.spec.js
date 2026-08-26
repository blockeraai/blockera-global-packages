/**
 * Internal dependencies
 */
const { escapeBlockAttrs, getLocalizeBlockAttrs } = require('../escape-block-attrs');
const { mergeBlockMarkupConfig } = require('../merge-config');
const { baseConfig } = require('../base-config');

describe('escapeBlockAttrs', () => {
	it('wraps allowed block JSON string attributes with i18n', () => {
		const block =
			' wp:search {"label":"Search","placeholder":"Type here...","buttonText":"Go"} /';

		const result = escapeBlockAttrs(block, 'blockera-one');

		expect(result).toContain(
			"<?php esc_html_e( 'Search', 'blockera-one' ); ?>"
		);
		expect(result).toContain(
			"<?php esc_attr_e( 'Type here...', 'blockera-one' ); ?>"
		);
		expect(result).toContain(
			"<?php esc_html_e( 'Go', 'blockera-one' ); ?>"
		);
	});

	it('skips string wrapping when localize is disabled', () => {
		const block = ' wp:search {"label":"Search"} /';
		const result = escapeBlockAttrs(block, 'blockera-one', {
			localize: { enabled: false },
		});

		expect(result).toContain('"label":"Search"');
		expect(result).not.toContain('esc_html_e');
	});

	it('strips Gutenberg copied pattern metadata and keeps blockeraOne', () => {
		const block =
			' wp:group {"metadata":{"blockeraOne":{"stamp":"section/page-header:simple"},"patternName":"blockera-one/builder-archive-page-header-simple","name":"Archive Page Header","description":"Simple archive page header with title and term description.","categories":["blockera-one/template-builder"]},"align":"wide"} ';

		const result = escapeBlockAttrs(block, 'blockera-one');

		expect(result).toContain(
			'"metadata":{"blockeraOne":{"stamp":"section/page-header:simple"}}'
		);
		expect(result).not.toContain('"patternName"');
		expect(result).not.toContain('"Archive Page Header"');
		expect(result).toContain('"align":"wide"');
	});

	it('drops metadata entirely when only copied keys remain', () => {
		const block =
			' wp:group {"metadata":{"categories":["banner"],"patternName":"blockera-one/hero-book","name":"Hero book"},"align":"full"} ';

		expect(escapeBlockAttrs(block, 'blockera-one')).toBe(
			' wp:group {"align":"full"} '
		);
	});

	it('omits empty attrs when metadata was the only property', () => {
		const block =
			' wp:group {"metadata":{"patternName":"blockera-one/hero-book","name":"Hero book"}} ';

		expect(escapeBlockAttrs(block, 'blockera-one')).toBe(' wp:group ');
	});

	it('strips metadata when PHP image URLs make the attrs JSON unparseable', () => {
		const block =
			' wp:cover {"url":"<?php echo esc_url( get_template_directory_uri() ); ?>/assets/images/cover.webp","metadata":{"patternName":"blockera-one/hero-book","name":"Hero book","blockeraOne":{"stamp":"section/hero:default"}}} ';

		const result = escapeBlockAttrs(block, 'blockera-one');

		expect(result).toContain(
			'"url":"<?php echo esc_url( get_template_directory_uri() ); ?>/assets/images/cover.webp"'
		);
		expect(result).toContain(
			'"metadata":{"blockeraOne":{"stamp":"section/hero:default"}}'
		);
		expect(result).not.toContain('"patternName"');
	});

	it('keeps a List View metadata.name when patternName is absent', () => {
		const block =
			' wp:group {"metadata":{"name":"Body","blockeraOne":{"stamp":"container/body"}},"align":"wide"} ';

		expect(escapeBlockAttrs(block, 'blockera-one')).toContain(
			'"metadata":{"name":"Body","blockeraOne":{"stamp":"container/body"}}'
		);
	});

	it('strips queryId from core/query and keeps the query envelope', () => {
		const block =
			' wp:query {"queryId":4,"query":{"perPage":9,"inherit":true},"align":"full"} ';

		const result = escapeBlockAttrs(block, 'blockera-one');

		expect(result).toContain('"query":{"perPage":9,"inherit":true}');
		expect(result).not.toContain('"queryId"');
	});

	it('strips query.perPage from a posts-listing Query Loop', () => {
		const block =
			' wp:query {"query":{"perPage":9,"inherit":true},"metadata":{"blockeraOne":{"stamp":"section/posts-listing:list"}}} ';

		const result = escapeBlockAttrs(block, 'blockera-one');

		expect(result).toContain('"query":{"inherit":true}');
		expect(result).not.toContain('"perPage"');
	});

	it('strips queryId from an explicit wp:core/query token', () => {
		const block = ' wp:core/query {"queryId":12,"query":{"inherit":true}} ';

		expect(escapeBlockAttrs(block, 'blockera-one')).toBe(
			' wp:core/query {"query":{"inherit":true}} '
		);
	});

	it('omits attrs when queryId was the only property on core/query', () => {
		expect(escapeBlockAttrs(' wp:query {"queryId":4} ', 'blockera-one')).toBe(
			' wp:query '
		);
	});

	it('does not strip queryId from a sibling query-* block', () => {
		const block =
			' wp:query-pagination {"queryId":4,"paginationArrow":"arrow"} ';

		expect(escapeBlockAttrs(block, 'blockera-one')).toContain('"queryId":4');
	});

	it('does not strip queryId from an unregistered block role', () => {
		const block = ' wp:group {"queryId":4,"align":"wide"} ';

		expect(escapeBlockAttrs(block, 'blockera-one')).toContain('"queryId":4');
	});

	it('does not strip queryId when the token is disabled', () => {
		const { config } = mergeBlockMarkupConfig({
			sanitize: {
				blocks: {
					'core/query': {
						attrs: { queryId: { enabled: false } },
					},
				},
			},
		});
		const block = ' wp:query {"queryId":4,"query":{"inherit":true}} ';

		expect(
			escapeBlockAttrs(block, 'blockera-one', {
				sanitize: config.sanitize,
			})
		).toContain('"queryId":4');
	});

	it('does not strip queryId when the whole core/query block is disabled', () => {
		const { config } = mergeBlockMarkupConfig({
			sanitize: {
				blocks: { 'core/query': { enabled: false } },
			},
		});
		const block = ' wp:query {"queryId":4,"query":{"inherit":true}} ';

		expect(
			escapeBlockAttrs(block, 'blockera-one', {
				sanitize: config.sanitize,
			})
		).toContain('"queryId":4');
	});

	it('returns comments without JSON attrs unchanged', () => {
		expect(escapeBlockAttrs(' wp:group ', 'blockera-one')).toBe(' wp:group ');
	});
});

describe('getLocalizeBlockAttrs', () => {
	it('lists enabled localize.blockAttrs from the base config', () => {
		const attrs = getLocalizeBlockAttrs(baseConfig.localize);
		expect(attrs.map((attr) => attr.name)).toEqual(
			expect.arrayContaining(['label', 'placeholder', 'content'])
		);
	});

	it('returns an empty list when localize is disabled', () => {
		expect(getLocalizeBlockAttrs({ enabled: false })).toEqual([]);
	});
});
