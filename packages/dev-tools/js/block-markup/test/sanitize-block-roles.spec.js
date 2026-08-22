/**
 * Internal dependencies
 */
const {
	getBlockNameFromComment,
	stripBlockRoleAttrs,
	sanitizeBlockRolesInRawConfig,
	hasUnsanitizedBlockRoleAttrs,
	getEnabledBlockRoleAttrs,
} = require('../sanitize-block-roles');
const { mergeBlockMarkupConfig } = require('../merge-config');

describe('sanitize-block-roles', () => {
	it('resolves comment tokens to Gutenberg block names', () => {
		expect(getBlockNameFromComment(' wp:query {"queryId":4} ')).toBe(
			'core/query'
		);
		expect(getBlockNameFromComment(' wp:core/query {')).toBe('core/query');
		expect(getBlockNameFromComment(' wp:query-pagination {')).toBe(
			'core/query-pagination'
		);
		expect(getBlockNameFromComment(' wp:foo/bar {')).toBe('foo/bar');
		expect(getBlockNameFromComment(' wp:group ')).toBe('core/group');
		expect(getBlockNameFromComment('')).toBeNull();
	});

	it('strips only registered attrs for the given block role', () => {
		const queryAttrs = { queryId: 4, query: { inherit: true } };
		expect(stripBlockRoleAttrs(queryAttrs, 'core/query')).toBe(true);
		expect(queryAttrs).toEqual({ query: { inherit: true } });

		const pagination = { queryId: 4, paginationArrow: 'arrow' };
		expect(stripBlockRoleAttrs(pagination, 'core/query-pagination')).toBe(
			false
		);
		expect(pagination.queryId).toBe(4);
	});

	it('does not strip when sanitize is disabled', () => {
		const attrs = { queryId: 4 };
		expect(
			stripBlockRoleAttrs(attrs, 'core/query', { enabled: false })
		).toBe(false);
		expect(attrs.queryId).toBe(4);
		expect(getEnabledBlockRoleAttrs({ enabled: false }, 'core/query')).toEqual(
			[]
		);
	});

	it('hasUnsanitizedBlockRoleAttrs detects leftover core/query queryId', () => {
		expect(
			hasUnsanitizedBlockRoleAttrs(
				'<!-- wp:query {"queryId":4,"query":{"inherit":true}} -->'
			)
		).toBe(true);
		expect(
			hasUnsanitizedBlockRoleAttrs(
				'<!-- wp:query {"query":{"inherit":true}} -->'
			)
		).toBe(false);
		expect(
			hasUnsanitizedBlockRoleAttrs(
				'<!-- wp:query-pagination {"queryId":4} -->'
			)
		).toBe(false);
		expect(hasUnsanitizedBlockRoleAttrs('<!-- wp:group -->')).toBe(false);
	});

	it('hasUnsanitizedBlockRoleAttrs respects a disabled queryId token', () => {
		const { config } = mergeBlockMarkupConfig({
			sanitize: {
				blocks: {
					'core/query': {
						attrs: { queryId: { enabled: false } },
					},
				},
			},
		});
		const content = '<!-- wp:query {"queryId":4,"query":{"inherit":true}} -->';

		expect(hasUnsanitizedBlockRoleAttrs(content)).toBe(true);
		expect(hasUnsanitizedBlockRoleAttrs(content, config.sanitize)).toBe(
			false
		);
	});

	it('hasUnsanitizedBlockRoleAttrs is off when the whole block is disabled', () => {
		const { config } = mergeBlockMarkupConfig({
			sanitize: {
				blocks: { 'core/query': { enabled: false } },
			},
		});

		expect(
			hasUnsanitizedBlockRoleAttrs(
				'<!-- wp:query {"queryId":4} -->',
				config.sanitize
			)
		).toBe(false);
	});

	it('removes a primitive queryId from a raw PHP-containing attrs blob', () => {
		const raw =
			'{"queryId":4,"query":{"inherit":true},"url":"<?php echo esc_url( get_template_directory_uri() ); ?>/assets/images/cover.webp"}';

		expect(sanitizeBlockRolesInRawConfig(raw, 'core/query')).toBe(
			'{"query":{"inherit":true},"url":"<?php echo esc_url( get_template_directory_uri() ); ?>/assets/images/cover.webp"}'
		);
		expect(sanitizeBlockRolesInRawConfig(raw, 'core/group')).toBe(raw);
	});
});
