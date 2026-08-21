/**
 * External dependencies
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

/**
 * Internal dependencies
 */
const {
	escapeText,
	escapeImagePath,
	escapeBlockAttrs,
	normalizePatternContent,
	normalizePatterns,
	checkPatterns,
	hasPatternPhpFiles,
	hasUnsanitizedPatternMetadata,
	hasUnsanitizedBlockRoleAttrs,
	needsTranslation,
	normalizePatternsDirs,
	hasPhpInPatternMarkup,
	prettifyPatternMarkup,
} = require('../normalize-patterns');
const {
	getBlockNameFromComment,
	stripBlockRoleAttrs,
	sanitizeBlockRolesInRawConfig,
} = require('../sanitize-block-roles');

describe('escapeText', () => {
	it('wraps plain text with esc_html_e and the given text domain', () => {
		expect(escapeText('Tell your story', 'blockera-one')).toBe(
			"<?php esc_html_e( 'Tell your story', 'blockera-one' ); ?>"
		);
	});

	it('uses esc_attr_e for attributes', () => {
		expect(escapeText('Picture of a flower', 'blockera-pro', true)).toBe(
			"<?php esc_attr_e( 'Picture of a flower', 'blockera-pro' ); ?>"
		);
	});

	it('preserves leading space as &nbsp; and escapes single quotes', () => {
		expect(escapeText(" It's here", 'blockera-one')).toBe(
			"&nbsp;<?php esc_html_e( 'It\\'s here', 'blockera-one' ); ?>"
		);
	});

	it('leaves already-localized PHP untouched', () => {
		const php = "<?php esc_html_e( 'Hi', 'blockera-one' ); ?>";
		expect(escapeText(php, 'blockera-one')).toBe(php);
	});
});

describe('escapeImagePath', () => {
	it('rewrites absolute assets URLs with a custom URI expression', () => {
		const src =
			'https://site-blockera.test/wp-content/themes/blockera-one/assets/images/book.webp';

		expect(
			escapeImagePath(src, {
				uriPhpExpression: 'get_template_directory_uri()',
				imagePathRoots: ['assets', 'patterns/images'],
			})
		).toBe(
			'<?php echo esc_url( get_template_directory_uri() ); ?>/assets/images/book.webp'
		);
	});

	it('rewrites patterns/images URLs with a plugin URI expression', () => {
		const src =
			'https://example.test/wp-content/plugins/blockera-pro/patterns/images/avatar.webp';

		expect(
			escapeImagePath(src, {
				uriPhpExpression: "plugins_url( '/', BLOCKERA_PRO_FILE )",
				imagePathRoots: ['assets', 'patterns/images'],
			})
		).toBe(
			"<?php echo esc_url( plugins_url( '/', BLOCKERA_PRO_FILE ) ); ?>/patterns/images/avatar.webp"
		);
	});

	it('leaves already-dynamic src untouched', () => {
		const src =
			'<?php echo esc_url( get_template_directory_uri() ); ?>/assets/images/book.webp';
		expect(
			escapeImagePath(src, {
				uriPhpExpression: 'get_template_directory_uri()',
			})
		).toBe(src);
	});
});

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

	it('strips Gutenberg copied pattern metadata and keeps blockeraOne', () => {
		const block =
			' wp:group {"metadata":{"blockeraOne":"section/page-header:simple","patternName":"blockera-one/builder-archive-page-header-simple","name":"Archive Page Header","description":"Simple archive page header with title and term description.","categories":["blockera-one/template-builder"]},"blockeraDisplay":{"value":"flex"},"align":"wide"} ';

		const result = escapeBlockAttrs(block, 'blockera-one');

		expect(result).toContain(
			'"metadata":{"blockeraOne":"section/page-header:simple"}'
		);
		expect(result).not.toContain('"patternName"');
		expect(result).not.toContain('"Archive Page Header"');
		expect(result).not.toContain('"categories"');
		expect(result).toContain('"blockeraDisplay":{"value":"flex"}');
		expect(result).toContain('"align":"wide"');
	});

	it('drops metadata entirely when only copied keys remain', () => {
		const block =
			' wp:group {"metadata":{"categories":["banner"],"patternName":"blockera-one/hero-book","name":"Hero book"},"align":"full"} ';

		const result = escapeBlockAttrs(block, 'blockera-one');

		expect(result).toBe(' wp:group {"align":"full"} ');
		expect(result).not.toContain('"metadata"');
	});

	it('omits empty attrs when metadata was the only property', () => {
		const block =
			' wp:group {"metadata":{"patternName":"blockera-one/hero-book","name":"Hero book"}} ';

		expect(escapeBlockAttrs(block, 'blockera-one')).toBe(' wp:group ');
	});

	it('strips metadata when PHP image URLs make the attrs JSON unparseable', () => {
		const block =
			' wp:cover {"url":"<?php echo esc_url( get_template_directory_uri() ); ?>/assets/images/cover.webp","metadata":{"patternName":"blockera-one/hero-book","name":"Hero book","blockeraOne":"section/hero:default"}} ';

		const result = escapeBlockAttrs(block, 'blockera-one');

		expect(result).toContain(
			'"url":"<?php echo esc_url( get_template_directory_uri() ); ?>/assets/images/cover.webp"'
		);
		expect(result).toContain(
			'"metadata":{"blockeraOne":"section/hero:default"}'
		);
		expect(result).not.toContain('"patternName"');
		expect(result).not.toContain('"name":"Hero book"');
	});

	it('keeps a List View metadata.name when patternName is absent', () => {
		const block =
			' wp:group {"metadata":{"name":"Body","blockeraOne":"container/body"},"align":"wide"} ';

		const result = escapeBlockAttrs(block, 'blockera-one');

		expect(result).toContain(
			'"metadata":{"name":"Body","blockeraOne":"container/body"}'
		);
	});

	it('strips queryId from core/query and keeps the query envelope', () => {
		const block =
			' wp:query {"queryId":4,"query":{"perPage":9,"inherit":true},"metadata":{"blockeraOne":"section/posts-listing:full-width"},"align":"full"} ';

		const result = escapeBlockAttrs(block, 'blockera-one');

		expect(result).toContain('"query":{"perPage":9,"inherit":true}');
		expect(result).toContain(
			'"metadata":{"blockeraOne":"section/posts-listing:full-width"}'
		);
		expect(result).toContain('"align":"full"');
		expect(result).not.toContain('"queryId"');
	});

	it('strips queryId from an explicit wp:core/query token', () => {
		const block = ' wp:core/query {"queryId":12,"query":{"inherit":true}} ';

		const result = escapeBlockAttrs(block, 'blockera-one');

		expect(result).toBe(' wp:core/query {"query":{"inherit":true}} ');
		expect(result).not.toContain('"queryId"');
	});

	it('omits attrs when queryId was the only property on core/query', () => {
		expect(escapeBlockAttrs(' wp:query {"queryId":4} ', 'blockera-one')).toBe(
			' wp:query '
		);
	});

	it('does not strip queryId from a sibling query-* block', () => {
		const block =
			' wp:query-pagination {"queryId":4,"paginationArrow":"arrow"} ';

		const result = escapeBlockAttrs(block, 'blockera-one');

		expect(result).toContain('"queryId":4');
		expect(result).toContain('"paginationArrow":"arrow"');
	});

	it('does not strip queryId from an unregistered block role', () => {
		const block = ' wp:group {"queryId":4,"align":"wide"} ';

		const result = escapeBlockAttrs(block, 'blockera-one');

		expect(result).toContain('"queryId":4');
		expect(result).toContain('"align":"wide"');
	});

	it('strips queryId from core/query when PHP image URLs make attrs unparseable', () => {
		const block =
			' wp:query {"queryId":4,"query":{"inherit":true},"url":"<?php echo esc_url( get_template_directory_uri() ); ?>/assets/images/cover.webp"} ';

		const result = escapeBlockAttrs(block, 'blockera-one');

		expect(result).toContain('"query":{"inherit":true}');
		expect(result).toContain(
			'"url":"<?php echo esc_url( get_template_directory_uri() ); ?>/assets/images/cover.webp"'
		);
		expect(result).not.toContain('"queryId"');
	});
});

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

	it('removes a primitive queryId from a raw PHP-containing attrs blob', () => {
		const raw =
			'{"queryId":4,"query":{"inherit":true},"url":"<?php echo esc_url( get_template_directory_uri() ); ?>/assets/images/cover.webp"}';

		expect(sanitizeBlockRolesInRawConfig(raw, 'core/query')).toBe(
			'{"query":{"inherit":true},"url":"<?php echo esc_url( get_template_directory_uri() ); ?>/assets/images/cover.webp"}'
		);
		expect(sanitizeBlockRolesInRawConfig(raw, 'core/group')).toBe(raw);
	});
});

describe('prettifyPatternMarkup', () => {
	it('detects PHP only in the file header as eligible to prettify', () => {
		const content = `<?php
/**
 * Title: Sample
 */
?>
<!-- wp:group --><div class="wp-block-group"></div><!-- /wp:group -->
`;
		expect(hasPhpInPatternMarkup(content)).toBe(false);
	});

	it('detects PHP already injected into pattern markup', () => {
		const content = `<?php
/**
 * Title: Sample
 */
?>
<!-- wp:heading -->
<h2><?php esc_html_e( 'Hello', 'blockera-one' ); ?></h2>
<!-- /wp:heading -->
`;
		expect(hasPhpInPatternMarkup(content)).toBe(true);
	});

	it('indents compact Gutenberg HTML before localization', async () => {
		const input = `<?php
/**
 * Title: Sample
 */
?>
<!-- wp:group {"align":"wide"} -->
<div class="wp-block-group alignwide"><!-- wp:query-title {"type":"archive"} /--><!-- wp:term-description /--></div>
<!-- /wp:group -->
`;

		const output = await prettifyPatternMarkup(input);

		expect(output).toContain('\n<div class="wp-block-group alignwide">');
		expect(output).toContain('\t<!-- wp:query-title');
		expect(output).toContain('<!-- wp:term-description');
		expect(output).toContain('</div>');
		expect(output).not.toContain('<?php esc_');
	});

	it('re-indents comment-only nested blocks that Prettier flattens', async () => {
		const input = `<?php
/**
 * Title: Pagination
 */
?>
<!-- wp:query-pagination {"paginationArrow":"arrow","align":"wide"} -->
    <!-- wp:query-pagination-previous /-->
    <!-- wp:query-pagination-next /-->
<!-- /wp:query-pagination -->
`;

		const output = await prettifyPatternMarkup(input);

		expect(output).toContain(
			'<!-- wp:query-pagination {"paginationArrow":"arrow","align":"wide"} -->\n' +
				'\t<!-- wp:query-pagination-previous /-->\n' +
				'\t<!-- wp:query-pagination-next /-->\n' +
				'<!-- /wp:query-pagination -->'
		);
	});

	it('does not prettify markup that already contains PHP', async () => {
		const input = `<?php
/**
 * Title: Sample
 */
?>
<!-- wp:group --><div class="wp-block-group"><h2><?php esc_html_e( 'Hello', 'blockera-one' ); ?></h2></div><!-- /wp:group -->
`;

		expect(await prettifyPatternMarkup(input)).toBe(input);
	});
});

describe('normalizePatternContent', () => {
	const baseOptions = {
		textDomain: 'blockera-one',
		uriPhpExpression: 'get_template_directory_uri()',
		imagePathRoots: ['assets', 'patterns/images'],
	};

	it('normalizes heading text, alt, aria-label, and image src', async () => {
		const input = `<?php
/**
 * Title: Sample
 */
?>
<!-- wp:group -->
<div class="wp-block-group" aria-label="Post navigation">
	<h2 class="wp-block-heading">The Stories Book</h2>
	<img src="https://site.test/wp-content/themes/blockera-one/assets/images/book.webp" alt="Book cover"/>
</div>
<!-- /wp:group -->
`;

		const output = await normalizePatternContent(input, baseOptions);

		expect(output).toContain(
			"<?php esc_html_e( 'The Stories Book', 'blockera-one' ); ?>"
		);
		expect(output).toContain(
			"<?php esc_attr_e( 'Book cover', 'blockera-one' ); ?>"
		);
		expect(output).toContain(
			"<?php esc_attr_e( 'Post navigation', 'blockera-one' ); ?>"
		);
		expect(output).toContain(
			'<?php echo esc_url( get_template_directory_uri() ); ?>/assets/images/book.webp'
		);
	});

	it('rewrites block comment url fields', async () => {
		const input = `<?php
/**
 * Title: Cover
 */
?>
<!-- wp:cover {"url":"https://site.test/wp-content/themes/blockera-one/assets/images/cover.webp","dimRatio":0} -->
<div class="wp-block-cover"></div>
<!-- /wp:cover -->
`;

		const output = await normalizePatternContent(input, baseOptions);

		expect(output).toContain(
			'"url":"<?php echo esc_url( get_template_directory_uri() ); ?>/assets/images/cover.webp"'
		);
	});

	it('is idempotent for already-normalized content', async () => {
		const input = `<?php
/**
 * Title: Normalized
 */
?>
<!-- wp:heading -->
<h2 class="wp-block-heading"><?php esc_html_e( 'Hello', 'blockera-one' ); ?></h2>
<!-- /wp:heading -->
`;

		const output = await normalizePatternContent(input, baseOptions);
		expect(output).toBe(input);
	});

	it('respects an injected plugin text domain and URI expression', async () => {
		const input = `<?php
/**
 * Title: Pro
 */
?>
<!-- wp:paragraph -->
<p>Premium copy</p>
<!-- /wp:paragraph -->
<img src="https://site.test/wp-content/plugins/blockera-pro/assets/images/pro.webp" alt="Pro"/>
`;

		const output = await normalizePatternContent(input, {
			textDomain: 'blockera-pro',
			uriPhpExpression: "plugins_url( '/', BLOCKERA_PRO_FILE )",
			imagePathRoots: ['assets'],
		});

		expect(output).toContain(
			"<?php esc_html_e( 'Premium copy', 'blockera-pro' ); ?>"
		);
		expect(output).toContain(
			"<?php echo esc_url( plugins_url( '/', BLOCKERA_PRO_FILE ) ); ?>/assets/images/pro.webp"
		);
	});

	it('strips core/query queryId from already-normalized content', async () => {
		const input = `<?php
/**
 * Title: Listing
 */
?>
<!-- wp:query {"queryId":4,"query":{"perPage":9,"inherit":true},"align":"full"} -->
<div class="wp-block-query alignfull">
	<h2 class="wp-block-heading"><?php esc_html_e( 'Hello', 'blockera-one' ); ?></h2>
</div>
<!-- /wp:query -->
`;

		const output = await normalizePatternContent(input, baseOptions);

		expect(output).not.toContain('"queryId"');
		expect(output).toContain('"query":{"perPage":9,"inherit":true}');
		expect(output).toContain('"align":"full"');
		expect(output).toContain(
			"<?php esc_html_e( 'Hello', 'blockera-one' ); ?>"
		);
	});

	it('strips copied pattern metadata from already-normalized content', async () => {
		const input = `<?php
/**
 * Title: Normalized
 */
?>
<!-- wp:group {"metadata":{"categories":["banner"],"patternName":"blockera-one/hero-book","name":"Hero book"},"align":"full"} -->
<div class="wp-block-group alignfull">
	<h2 class="wp-block-heading"><?php esc_html_e( 'Hello', 'blockera-one' ); ?></h2>
</div>
<!-- /wp:group -->
`;

		const output = await normalizePatternContent(input, baseOptions);

		expect(output).toContain('"align":"full"');
		expect(output).not.toContain('"patternName"');
		expect(output).not.toContain('"metadata"');
		expect(output).toContain(
			"<?php esc_html_e( 'Hello', 'blockera-one' ); ?>"
		);
	});

	it('keeps comment-only pagination children indented after rewrite', async () => {
		const input = `<?php
/**
 * Title: Pagination
 */
?>
<!-- wp:query-pagination {"paginationArrow":"arrow","align":"wide"} -->
    <!-- wp:query-pagination-previous /-->
    <!-- wp:query-pagination-next /-->
<!-- /wp:query-pagination -->
`;

		const output = await normalizePatternContent(input, baseOptions);

		expect(output).toContain('\t<!-- wp:query-pagination-previous /-->');
		expect(output).toContain('\t<!-- wp:query-pagination-next /-->');
		expect(output).toContain('<!-- /wp:query-pagination -->');
	});

	it('prettifies compact HTML then wraps strings', async () => {
		const input = `<?php
/**
 * Title: Sample
 */
?>
<!-- wp:group {"align":"wide"} -->
<div class="wp-block-group alignwide"><!-- wp:paragraph --><p>Hello</p><!-- /wp:paragraph --></div>
<!-- /wp:group -->
`;

		const output = await normalizePatternContent(input, baseOptions);

		expect(output).toContain('\t<!-- wp:paragraph -->');
		expect(output).toContain(
			"\t<p><?php esc_html_e( 'Hello', 'blockera-one' ); ?></p>"
		);
	});
});

describe('normalizePatterns / checkPatterns', () => {
	let tempDir;

	beforeEach(() => {
		tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'patterns-normalize-'));
	});

	afterEach(() => {
		fs.rmSync(tempDir, { recursive: true, force: true });
	});

	function writePattern(name, content) {
		const filePath = path.join(tempDir, name);
		fs.writeFileSync(filePath, content, 'utf8');
		return filePath;
	}

	it('hasPatternPhpFiles detects php files', () => {
		expect(hasPatternPhpFiles(tempDir)).toBe(false);
		writePattern('a.php', '<?php\n?>\n<p>Hi</p>\n');
		expect(hasPatternPhpFiles(tempDir)).toBe(true);
	});

	it('needsTranslation is true when text domain is missing', () => {
		expect(needsTranslation('<?php\n?>\n<p>Hi</p>', 'blockera-one')).toBe(
			true
		);
		expect(
			needsTranslation(
				"<?php esc_html_e( 'Hi', 'blockera-one' ); ?>",
				'blockera-one'
			)
		).toBe(false);
	});

	it('writes normalized files and is then clean under checkPatterns', async () => {
		writePattern(
			'hero.php',
			`<?php
/**
 * Title: Hero
 */
?>
<!-- wp:heading -->
<h2 class="wp-block-heading">The Stories Book</h2>
<!-- /wp:heading -->
`
		);

		const writeResult = await normalizePatterns({
			patternsDir: tempDir,
			textDomain: 'blockera-one',
			uriPhpExpression: 'get_template_directory_uri()',
			quiet: true,
		});

		expect(writeResult.ok).toBe(true);
		expect(writeResult.changedFiles).toHaveLength(1);
		expect(fs.readFileSync(writeResult.changedFiles[0], 'utf8')).toContain(
			"esc_html_e( 'The Stories Book', 'blockera-one' )"
		);

		const checkResult = await checkPatterns({
			patternsDir: tempDir,
			textDomain: 'blockera-one',
			uriPhpExpression: 'get_template_directory_uri()',
			quiet: true,
		});

		expect(checkResult.ok).toBe(true);
		expect(checkResult.changedFiles).toHaveLength(0);
	});

	it('checkPatterns fails when files still need normalization', async () => {
		writePattern(
			'dirty.php',
			`<?php
/**
 * Title: Dirty
 */
?>
<!-- wp:paragraph -->
<p>Needs work</p>
<!-- /wp:paragraph -->
`
		);

		const checkResult = await checkPatterns({
			patternsDir: tempDir,
			textDomain: 'blockera-one',
			uriPhpExpression: 'get_template_directory_uri()',
			quiet: true,
		});

		expect(checkResult.ok).toBe(false);
		expect(checkResult.changedFiles.length).toBeGreaterThan(0);
		expect(
			fs.readFileSync(path.join(tempDir, 'dirty.php'), 'utf8')
		).toContain('Needs work');
	});

	it('hasUnsanitizedBlockRoleAttrs detects a leftover core/query queryId', () => {
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

	it('hasUnsanitizedPatternMetadata detects copied editor keys', () => {
		expect(
			hasUnsanitizedPatternMetadata(
				'<!-- wp:group {"metadata":{"patternName":"blockera-one/hero-book"}} -->'
			)
		).toBe(true);
		expect(
			hasUnsanitizedPatternMetadata(
				'<!-- wp:group {"metadata":{"blockeraOne":"section/page-header:default"}} -->'
			)
		).toBe(false);
		expect(
			hasUnsanitizedPatternMetadata(
				'<!-- wp:group {"metadata":{"name":"Body","blockeraOne":"container/body"}} -->'
			)
		).toBe(false);
		expect(hasUnsanitizedPatternMetadata('<!-- wp:group -->')).toBe(false);
	});

	it('prettifies compact HTML that has no PHP in the markup yet', async () => {
		writePattern(
			'compact.php',
			`<?php
/**
 * Title: Compact
 */
?>
<!-- wp:group --><div class="wp-block-group"><!-- wp:query-title {"type":"archive"} /--><!-- wp:term-description /--></div><!-- /wp:group -->
`
		);

		const result = await normalizePatterns({
			patternsDir: tempDir,
			textDomain: 'blockera-one',
			uriPhpExpression: 'get_template_directory_uri()',
			quiet: true,
		});

		expect(result.ok).toBe(true);
		expect(result.changedFiles).toHaveLength(1);
		expect(fs.readFileSync(result.changedFiles[0], 'utf8')).toContain(
			'\t<!-- wp:query-title'
		);
		expect(fs.readFileSync(result.changedFiles[0], 'utf8')).not.toContain(
			'<?php esc_'
		);
	});

	it('skips already normalized files without static URLs', async () => {
		writePattern(
			'done.php',
			`<?php
/**
 * Title: Done
 */
?>
<!-- wp:heading -->
<h2><?php esc_html_e( 'Hello', 'blockera-one' ); ?></h2>
<!-- /wp:heading -->
`
		);

		const result = await normalizePatterns({
			patternsDir: tempDir,
			textDomain: 'blockera-one',
			uriPhpExpression: 'get_template_directory_uri()',
			quiet: true,
		});

		expect(result.ok).toBe(true);
		expect(result.changedFiles).toHaveLength(0);
	});

	it('sanitizes core/query queryId on already-normalized files', async () => {
		writePattern(
			'listing.php',
			`<?php
/**
 * Title: Listing
 */
?>
<!-- wp:query {"queryId":4,"query":{"perPage":9,"inherit":true},"align":"full"} -->
<div class="wp-block-query alignfull">
	<h2><?php esc_html_e( 'Hello', 'blockera-one' ); ?></h2>
</div>
<!-- /wp:query -->
`
		);

		const result = await normalizePatterns({
			patternsDir: tempDir,
			textDomain: 'blockera-one',
			uriPhpExpression: 'get_template_directory_uri()',
			quiet: true,
		});

		expect(result.ok).toBe(true);
		expect(result.changedFiles).toHaveLength(1);
		const written = fs.readFileSync(result.changedFiles[0], 'utf8');
		expect(written).not.toContain('"queryId"');
		expect(written).toContain('"query":{"perPage":9,"inherit":true}');
		expect(written).toContain('"align":"full"');
		expect(written).toContain("esc_html_e( 'Hello', 'blockera-one' )");
	});

	it('sanitizes copied pattern metadata on already-normalized files', async () => {
		writePattern(
			'hero.php',
			`<?php
/**
 * Title: Hero
 */
?>
<!-- wp:group {"metadata":{"patternName":"blockera-one/hero-book","name":"Hero book"},"align":"full"} -->
<div class="wp-block-group alignfull">
	<h2><?php esc_html_e( 'Hello', 'blockera-one' ); ?></h2>
</div>
<!-- /wp:group -->
`
		);

		const result = await normalizePatterns({
			patternsDir: tempDir,
			textDomain: 'blockera-one',
			uriPhpExpression: 'get_template_directory_uri()',
			quiet: true,
		});

		expect(result.ok).toBe(true);
		expect(result.changedFiles).toHaveLength(1);
		expect(fs.readFileSync(result.changedFiles[0], 'utf8')).not.toContain(
			'"patternName"'
		);
		expect(fs.readFileSync(result.changedFiles[0], 'utf8')).toContain(
			'"align":"full"'
		);
	});

	it('normalizePatternsDirs accepts legacy patternsDir string', () => {
		expect(normalizePatternsDirs({ patternsDir: '/a/patterns' })).toEqual([
			'/a/patterns',
		]);
	});

	it('normalizePatternsDirs prefers patternsDirs array', () => {
		expect(
			normalizePatternsDirs({
				patternsDirs: ['/a/patterns', '/a/patterns-woocommerce'],
				patternsDir: '/legacy',
			})
		).toEqual(['/a/patterns', '/a/patterns-woocommerce']);
	});

	it('hasPatternPhpFiles is true when any directory in the array has PHP', () => {
		const emptyDir = path.join(tempDir, 'empty');
		const withPhp = path.join(tempDir, 'with-php');
		fs.mkdirSync(emptyDir);
		fs.mkdirSync(withPhp);
		fs.writeFileSync(path.join(withPhp, 'a.php'), '<?php\n?>\n', 'utf8');

		expect(hasPatternPhpFiles([emptyDir, withPhp])).toBe(true);
		expect(hasPatternPhpFiles([emptyDir])).toBe(false);
	});

	it('normalizes across patternsDirs (dirty + clean directories)', async () => {
		const dirtyDir = path.join(tempDir, 'patterns');
		const cleanDir = path.join(tempDir, 'patterns-woocommerce');
		fs.mkdirSync(dirtyDir);
		fs.mkdirSync(cleanDir);

		fs.writeFileSync(
			path.join(dirtyDir, 'dirty.php'),
			`<?php
/**
 * Title: Dirty
 */
?>
<!-- wp:paragraph -->
<p>Needs work</p>
<!-- /wp:paragraph -->
`,
			'utf8'
		);

		fs.writeFileSync(
			path.join(cleanDir, 'clean.php'),
			`<?php
/**
 * Title: Clean
 */
?>
<!-- wp:heading -->
<h2><?php esc_html_e( 'Already done', 'blockera-one' ); ?></h2>
<!-- /wp:heading -->
`,
			'utf8'
		);

		const result = await normalizePatterns({
			patternsDirs: [dirtyDir, cleanDir],
			textDomain: 'blockera-one',
			uriPhpExpression: 'get_template_directory_uri()',
			quiet: true,
		});

		expect(result.ok).toBe(true);
		expect(result.changedFiles).toHaveLength(1);
		expect(result.changedFiles[0]).toContain('dirty.php');
		expect(fs.readFileSync(result.changedFiles[0], 'utf8')).toContain(
			"esc_html_e( 'Needs work', 'blockera-one' )"
		);
		expect(
			fs.readFileSync(path.join(cleanDir, 'clean.php'), 'utf8')
		).toContain("esc_html_e( 'Already done', 'blockera-one' )");
	});

	it('legacy patternsDir string still normalizes a single directory', async () => {
		writePattern(
			'legacy.php',
			`<?php
/**
 * Title: Legacy
 */
?>
<!-- wp:paragraph -->
<p>Legacy text</p>
<!-- /wp:paragraph -->
`
		);

		const result = await normalizePatterns({
			patternsDir: tempDir,
			textDomain: 'blockera-one',
			uriPhpExpression: 'get_template_directory_uri()',
			quiet: true,
		});

		expect(result.ok).toBe(true);
		expect(result.changedFiles).toHaveLength(1);
		expect(fs.readFileSync(result.changedFiles[0], 'utf8')).toContain(
			"esc_html_e( 'Legacy text', 'blockera-one' )"
		);
	});
});
