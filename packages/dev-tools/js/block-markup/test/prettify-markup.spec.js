/**
 * Internal dependencies
 */
const {
	classifyWpCommentLine,
	getMarkupStart,
	getPatternMarkupStart,
	hasPhpInMarkup,
	hasPhpInPatternMarkup,
	indentGutenbergBlockComments,
	collapseTextOnlyTags,
	prettifyMarkup,
	prettifyPatternMarkup,
} = require('../prettify-markup');

describe('getMarkupStart', () => {
	it('starts after the PHP header close, or at 0 for headerless HTML', () => {
		expect(getMarkupStart('<?php\n?>\n<!-- wp:group -->')).toBe(
			'<?php\n?>'.length
		);
		expect(getMarkupStart('<!-- wp:group -->')).toBe(0);
		expect(getPatternMarkupStart('<!-- wp:group -->')).toBe(-1);
	});
});

describe('hasPhpInMarkup', () => {
	it('detects PHP only in the file header as eligible to prettify', () => {
		const content = `<?php
/**
 * Title: Sample
 */
?>
<!-- wp:group --><div class="wp-block-group"></div><!-- /wp:group -->
`;
		expect(hasPhpInPatternMarkup(content)).toBe(false);
		expect(hasPhpInMarkup(content)).toBe(false);
	});

	it('treats headerless HTML as eligible to prettify', () => {
		expect(
			hasPhpInMarkup(
				'<!-- wp:group --><div class="wp-block-group"></div><!-- /wp:group -->\n'
			)
		).toBe(false);
	});

	it('detects PHP inside the markup region after a file header', () => {
		const content = `<?php
/**
 * Title: Sample
 */
?>
<!-- wp:heading --><h2><?php esc_html_e( 'Hi', 'x' ); ?></h2><!-- /wp:heading -->
`;
		expect(hasPhpInMarkup(content)).toBe(true);
	});
});

describe('classifyWpCommentLine', () => {
	it('classifies open, close, and self-closing Gutenberg comments', () => {
		expect(classifyWpCommentLine('<!-- wp:group -->')).toBe('open');
		expect(classifyWpCommentLine('\t<!-- /wp:group -->')).toBe('close');
		expect(classifyWpCommentLine('<!-- wp:spacer /-->')).toBe('self');
		expect(classifyWpCommentLine('<div class="wp-block-group">')).toBeNull();
		expect(
			classifyWpCommentLine('<!-- wp:group --><!-- /wp:group -->')
		).toBeNull();
	});
});

describe('indentGutenbergBlockComments', () => {
	it('indents nested comments one level per ancestor', () => {
		const markup = [
			'<!-- wp:group -->',
			'<!-- wp:paragraph -->',
			'<p>Hi</p>',
			'<!-- /wp:paragraph -->',
			'<!-- /wp:group -->',
			'',
		].join('\n');

		expect(indentGutenbergBlockComments(markup)).toContain(
			'\t<!-- wp:paragraph -->'
		);
	});
});

describe('collapseTextOnlyTags', () => {
	it('joins wrapped text onto one line and keeps the tag indent', () => {
		const markup =
			'\t<p>\n' +
			'\t\tSorry, but nothing was found. Please try a search with different\n' +
			'\t\tkeywords.\n' +
			'\t</p>';

		expect(collapseTextOnlyTags(markup)).toBe(
			'\t<p>Sorry, but nothing was found. Please try a search with different keywords.</p>'
		);
	});

	it('does not collapse tags that contain nested markup', () => {
		const markup = '<p>\n\tHello <em>world</em>\n</p>';
		expect(collapseTextOnlyTags(markup)).toBe(markup);
	});

	it('does not collapse preformatted tags', () => {
		const markup = '<pre>\nline one\nline two\n</pre>';
		expect(collapseTextOnlyTags(markup)).toBe(markup);
	});
});

describe('prettifyMarkup', () => {
	it('prettifies headerless template HTML', async () => {
		const input =
			'<!-- wp:group {"align":"wide"} --><div class="wp-block-group alignwide"><!-- wp:paragraph --><p>Hi</p><!-- /wp:paragraph --></div><!-- /wp:group -->\n';

		const output = await prettifyMarkup(input);

		expect(output).toContain('\n<div class="wp-block-group alignwide">');
		expect(output).not.toContain('esc_html_e');
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

		expect(output).toContain('\t<!-- wp:query-title');
		expect(output).not.toContain('<?php esc_');
	});

	it('indents HTML inside comment-only parents (query-no-results)', async () => {
		const input = `<!-- wp:query-no-results -->
<!-- wp:paragraph -->
<p>Sorry, but nothing was found. Please try a search with different keywords.</p>
<!-- /wp:paragraph -->
<!-- /wp:query-no-results -->
`;

		const output = await prettifyMarkup(input);

		expect(output).toContain(
			'<!-- wp:query-no-results -->\n' +
				'\t<!-- wp:paragraph -->\n' +
				'\t<p>Sorry, but nothing was found. Please try a search with different keywords.</p>\n' +
				'\t<!-- /wp:paragraph -->\n' +
				'<!-- /wp:query-no-results -->'
		);
	});

	it('does not extra-indent HTML inside a wrapper-element parent', async () => {
		const input = `<!-- wp:group -->
<div class="wp-block-group"><!-- wp:paragraph --><p>Hi</p><!-- /wp:paragraph --></div>
<!-- /wp:group -->
`;

		const output = await prettifyMarkup(input);

		expect(output).toContain('<div class="wp-block-group">');
		expect(output).not.toMatch(/^\t<div /m);
		expect(output).toContain('\t<!-- wp:paragraph -->');
	});

	it('returns the original content when prettier is disabled', async () => {
		const input = '<!-- wp:group --><div></div><!-- /wp:group -->';
		expect(
			await prettifyMarkup(input, { prettier: { enabled: false } })
		).toBe(input);
	});

	it('skips formatting when markup already contains PHP', async () => {
		const input = `<?php
/**
 * Title: Sample
 */
?>
<!-- wp:heading --><h2><?php esc_html_e( 'Hi', 'x' ); ?></h2><!-- /wp:heading -->
`;
		expect(await prettifyMarkup(input)).toBe(input);
	});

	it('skips extra comment-only indent when that token is off', async () => {
		const input = `<!-- wp:query-no-results -->
<!-- wp:paragraph -->
<p>Sorry, but nothing was found.</p>
<!-- /wp:paragraph -->
<!-- /wp:query-no-results -->
`;

		const output = await prettifyMarkup(input, {
			prettier: { indentGutenbergComments: false },
		});

		expect(output).toContain(
			'<!-- wp:query-no-results -->\n<!-- wp:paragraph -->'
		);
		expect(output).not.toMatch(/^\t<!-- wp:paragraph -->/m);
	});
});
