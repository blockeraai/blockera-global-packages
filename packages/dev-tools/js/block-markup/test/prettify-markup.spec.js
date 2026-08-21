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
	collapseBrokenCloseTags,
	collapsePhrasingContentTags,
	collapseTextOnlyTags,
	collapseMultilineStartTags,
	collapseWrappedTags,
	quoteJsonHtmlAttributes,
	indentSvgElements,
	wrapMixedInlineParents,
	breakFormControlTags,
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

	it('puts wrapped attributes back on the same line as the text', () => {
		const markup = [
			'<p',
			'\tclass="custom-class blockera-block blockera-block--2 has-background"',
			'\tstyle="background-color:#e8ffcb;padding-top:20px;padding-right:20px;padding-bottom:20px;padding-left:20px;"',
			'>Paragraph with custom class.</p>',
		].join('\n');

		expect(collapseTextOnlyTags(markup)).toBe(
			'<p class="custom-class blockera-block blockera-block--2 has-background" style="background-color:#e8ffcb;padding-top:20px;padding-right:20px;padding-bottom:20px;padding-left:20px;">Paragraph with custom class.</p>'
		);
	});

	it('does not collapse nested markup in the text-only pass', () => {
		const markup = '<p>\n\tHello <em>world</em>\n</p>';
		expect(collapseTextOnlyTags(markup)).toBe(markup);
	});

	it('does not collapse preformatted tags', () => {
		const markup = '<pre>\nline one\nline two\n</pre>';
		expect(collapseTextOnlyTags(markup)).toBe(markup);
	});
});

describe('collapsePhrasingContentTags', () => {
	it('keeps a p with strong and text on one line', () => {
		const markup = [
			'<p class="wp-block-paragraph">',
			'\tAdvanced: Uses <strong>counter()</strong> and and before from parent with custom text:',
			'</p>',
		].join('\n');

		expect(collapsePhrasingContentTags(markup)).toBe(
			'<p class="wp-block-paragraph">Advanced: Uses <strong>counter()</strong> and and before from parent with custom text:</p>'
		);
	});

	it('keeps a p with a sibling span on one line', () => {
		const markup = ['<p>', '\tText', '\t<span>x</span>', '</p>'].join('\n');

		expect(collapsePhrasingContentTags(markup)).toBe(
			'<p>Text <span>x</span></p>'
		);
	});

	it('does not collapse a div that wraps a paragraph', () => {
		const markup = [
			'<div class="wp-block-group">',
			'\t<p>Hi</p>',
			'</div>',
		].join('\n');

		expect(collapsePhrasingContentTags(markup)).toBe(markup);
	});
});

describe('collapseBrokenCloseTags', () => {
	it('joins a closing span whose > wrapped to the next line', () => {
		const markup =
			'<span class="wp-block-accordion-heading__toggle-title">Item 1 No style (Open)</span\n>';

		expect(collapseBrokenCloseTags(markup)).toBe(
			'<span class="wp-block-accordion-heading__toggle-title">Item 1 No style (Open)</span>'
		);
	});
});

describe('collapseMultilineStartTags', () => {
	it('compacts a wrapped self-closing link', () => {
		const markup = [
			'<link',
			'\trel="stylesheet"',
			'\thref="./frontend.css"',
			'/>',
		].join('\n');

		expect(collapseMultilineStartTags(markup)).toBe(
			'<link rel="stylesheet" href="./frontend.css" />'
		);
	});

	it('compacts a wrapped opening div and leaves children alone', () => {
		const markup = [
			'<div',
			'\tclass="wp-block-group blockera-block blockera-block-wrapper"',
			'>',
			'\t<p>Hi</p>',
			'</div>',
		].join('\n');

		expect(collapseMultilineStartTags(markup)).toBe(
			'<div class="wp-block-group blockera-block blockera-block-wrapper">\n\t<p>Hi</p>\n</div>'
		);
	});
});

describe('collapseWrappedTags', () => {
	it('compacts start tags and text-only pairs together', () => {
		const markup = [
			'<div',
			'\tclass="wp-block-group"',
			'>',
			'<p>',
			'\tHello world',
			'</p>',
			'</div>',
		].join('\n');

		expect(collapseWrappedTags(markup)).toBe(
			'<div class="wp-block-group">\n<p>Hello world</p>\n</div>'
		);
	});

	it('keeps accordion toggle spans on one line including the close >', () => {
		const markup = [
			'<span class="wp-block-accordion-heading__toggle-title">Item 1 No style (Open)</span',
			'><span class="wp-block-accordion-heading__toggle-icon" aria-hidden="true">+</span',
			'>',
		].join('\n');

		expect(collapseWrappedTags(markup)).toBe(
			'<span class="wp-block-accordion-heading__toggle-title">Item 1 No style (Open)</span><span class="wp-block-accordion-heading__toggle-icon" aria-hidden="true">+</span>'
		);
	});
});

describe('indentSvgElements', () => {
	it('puts svg and path on their own indented lines inside a button', () => {
		const markup =
			'\t\t\t<a class="wp-element-button">Button 2<svg viewBox="0 0 24 24" class="icon"><path d="M12 4Z"></path></svg></a>';

		expect(indentSvgElements(markup)).toBe(
			'\t\t\t<a class="wp-element-button">Button 2\n' +
				'\t\t\t\t<svg viewBox="0 0 24 24" class="icon">\n' +
				'\t\t\t\t\t<path d="M12 4Z"></path>\n' +
				'\t\t\t\t</svg>\n' +
				'\t\t\t</a>'
		);
	});

	it('indents multiple svg children', () => {
		const markup =
			'<svg viewBox="0 0 10 10"><path d="M0"></path><path d="M1"></path></svg>';

		expect(indentSvgElements(markup)).toBe(
			'<svg viewBox="0 0 10 10">\n' +
				'\t<path d="M0"></path>\n' +
				'\t<path d="M1"></path>\n' +
				'</svg>'
		);
	});

	it('rebases a prettier-overindented svg to the parent tag', () => {
		const markup =
			'\t\t\t<a class="wp-element-button">Button 2\n' +
			'\t\t\t\t\t\t\t\t<svg viewBox="0 0 24 24" class="icon">\n' +
			'\t\t\t\t<path d="M12 4Z"></path>\n' +
			'\t\t\t\t</svg>\n' +
			'\t\t\t</a>';

		expect(indentSvgElements(markup)).toBe(
			'\t\t\t<a class="wp-element-button">Button 2\n' +
				'\t\t\t\t<svg viewBox="0 0 24 24" class="icon">\n' +
				'\t\t\t\t\t<path d="M12 4Z"></path>\n' +
				'\t\t\t\t</svg>\n' +
				'\t\t\t</a>'
		);
	});
});

describe('wrapMixedInlineParents', () => {
	it('wraps text and svg inside an inline a and aligns the close tag', () => {
		const markup =
			'\t\t\t<a class="wp-element-button">\n' +
			'\t\t\t\t<svg viewBox="0 0 24 24" class="icon">\n' +
			'\t\t\t\t\t<path d="M12 4Z"></path>\n' +
			'\t\t\t\t</svg>\n' +
			'\t\t\t\tButton 2</a>';

		expect(wrapMixedInlineParents(markup)).toBe(
			'\t\t\t<a class="wp-element-button">\n' +
				'\t\t\t\t<svg viewBox="0 0 24 24" class="icon">\n' +
				'\t\t\t\t\t<path d="M12 4Z"></path>\n' +
				'\t\t\t\t</svg>\n' +
				'\t\t\t\tButton 2\n' +
				'\t\t\t</a>'
		);
	});

	it('moves leading text off the opening a when a svg sibling follows', () => {
		const markup =
			'\t\t\t<a class="wp-element-button">Button 2\n' +
			'\t\t\t\t<svg viewBox="0 0 24 24" class="icon">\n' +
			'\t\t\t\t\t<path d="M12 4Z"></path>\n' +
			'\t\t\t\t</svg>\n' +
			'\t\t\t</a>';

		expect(wrapMixedInlineParents(markup)).toBe(
			'\t\t\t<a class="wp-element-button">\n' +
				'\t\t\t\tButton 2\n' +
				'\t\t\t\t<svg viewBox="0 0 24 24" class="icon">\n' +
				'\t\t\t\t\t<path d="M12 4Z"></path>\n' +
				'\t\t\t\t</svg>\n' +
				'\t\t\t</a>'
		);
	});

	it('leaves phrasing-only links on one line', () => {
		const markup = '\t<a class="wp-element-button">Button <strong>2</strong></a>';

		expect(wrapMixedInlineParents(markup)).toBe(markup);
	});
});

describe('breakFormControlTags', () => {
	it('moves a glued button onto its own line after a self-closing img', () => {
		const markup =
			'\t<img src="https://placehold.co/600x400" alt="" class="wp-image-id" /><button class="lightbox-trigger" type="button">\n' +
			'\t\t<svg viewBox="0 0 12 12"></svg>\n' +
			'\t</button>';

		expect(breakFormControlTags(markup)).toBe(
			'\t<img src="https://placehold.co/600x400" alt="" class="wp-image-id" />\n' +
				'\t<button class="lightbox-trigger" type="button">\n' +
				'\t\t<svg viewBox="0 0 12 12"></svg>\n' +
				'\t</button>'
		);
	});

	it('moves a glued input onto its own line after a sibling close tag', () => {
		const markup = '\t<label>Name</label><input type="text" name="n" />';

		expect(breakFormControlTags(markup)).toBe(
			'\t<label>Name</label>\n\t<input type="text" name="n" />'
		);
	});

	it('indents a button nested after a parent open tag', () => {
		const markup = '\t<figure class="wp-lightbox-container"><button type="button">Go</button></figure>';

		expect(breakFormControlTags(markup)).toBe(
			'\t<figure class="wp-lightbox-container">\n' +
				'\t\t<button type="button">Go</button></figure>'
		);
	});

	it('leaves a form control that already starts a line', () => {
		const markup = '\t<button type="button">Go</button>\n';

		expect(breakFormControlTags(markup)).toBe(markup);
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

	it('keeps a text-only p with long attrs on one line', async () => {
		const input =
			'<!-- wp:paragraph --><p class="custom-class blockera-block blockera-block--2 has-background" style="background-color:#e8ffcb;padding-top:20px;padding-right:20px;padding-bottom:20px;padding-left:20px;">Paragraph with custom class.</p><!-- /wp:paragraph -->\n';

		const output = await prettifyMarkup(input);

		expect(output).toContain(
			'<p class="custom-class blockera-block blockera-block--2 has-background" style="background-color:#e8ffcb;padding-top:20px;padding-right:20px;padding-bottom:20px;padding-left:20px;">Paragraph with custom class.</p>'
		);
		expect(output).not.toMatch(/<p\s*\n/);
	});

	it('does not wrap the closing > of a long text-only span', async () => {
		const input =
			'<button type="button"><span class="wp-block-accordion-heading__toggle-title">Item 1 No style (Open)</span><span class="wp-block-accordion-heading__toggle-icon" aria-hidden="true">+</span></button>\n';

		const output = await prettifyMarkup(input);

		expect(output).toContain(
			'<span class="wp-block-accordion-heading__toggle-title">Item 1 No style (Open)</span>'
		);
		expect(output).toContain(
			'<span class="wp-block-accordion-heading__toggle-icon" aria-hidden="true">+</span>'
		);
		expect(output).not.toMatch(/<\/span\s*\n\s*>/);
	});

	it('keeps long link and div start tags on one line', async () => {
		const input =
			'<link rel="stylesheet" href="./frontend-global-styles.css" /><link rel="stylesheet" href="./frontend.css" /><div class="wp-block-group blockera-block blockera-block-wrapper blockera-block-1"><p>Hi</p></div>\n';

		const output = await prettifyMarkup(input);

		expect(output).toContain(
			'<link rel="stylesheet" href="./frontend-global-styles.css" />'
		);
		expect(output).toContain(
			'<link rel="stylesheet" href="./frontend.css" />'
		);
		expect(output).toContain(
			'<div class="wp-block-group blockera-block blockera-block-wrapper blockera-block-1">'
		);
		expect(output).not.toMatch(/<(?:link|div)\s*\n/);
	});

	it('keeps a paragraph with inline strong on one line', async () => {
		const input =
			'<p class="wp-block-paragraph">Advanced: Uses <strong>counter()</strong> and and before from parent with custom text:</p>\n';

		const output = await prettifyMarkup(input);

		expect(output).toContain(
			'<p class="wp-block-paragraph">Advanced: Uses <strong>counter()</strong> and and before from parent with custom text:</p>'
		);
		expect(output).not.toMatch(/<p[^>]*>\s*\n/);
	});

	it('indents svg and path inside a button link', async () => {
		const input =
			'<a class="wp-element-button">Button 2<svg viewBox="0 0 24 24" width="24" height="24" class="icon"><path d="M12 4c-4.4 0-8 3.6-8 8Z"></path></svg></a>\n';

		const output = await prettifyMarkup(input);

		expect(output).toContain('<svg viewBox="0 0 24 24" width="24" height="24" class="icon">');
		expect(output).toMatch(/<svg[\s\S]*\n\t+<path /);
		expect(output).toMatch(/\n\t*<\/svg>/);
		expect(output).not.toMatch(/<\/path><\/svg>/);
		expect(output).toMatch(
			/<a class="wp-element-button">\n\tButton 2\n\t<svg[\s\S]*\n<\/a>/
		);
		expect(output).not.toMatch(/<\/svg><\/a>/);
	});

	it('puts the closing a on its own line when text follows a svg child', async () => {
		const input =
			'<div class="wp-block-button">\n\t<a class="wp-element-button">\n\t\t<svg viewBox="0 0 24 24"><path d="M12 4Z"></path></svg>\n\t\tButton 2</a>\n</div>\n';

		const output = await prettifyMarkup(input);

		expect(output).toMatch(
			/\t<a class="wp-element-button">\n\t\t<svg[\s\S]*\n\t\tButton 2\n\t<\/a>/
		);
		expect(output).not.toMatch(/Button 2<\/a>/);
	});

	it('puts a lightbox button on its own line after an image', async () => {
		const input =
			'<figure class="wp-block-image wp-lightbox-container"><img src="https://placehold.co/600x400" alt="" class="wp-image-id" /><button class="lightbox-trigger" type="button"><svg viewBox="0 0 12 12"><path d="M2 0Z"></path></svg></button></figure>\n';

		const output = await prettifyMarkup(input);

		expect(output).not.toMatch(/\/><button/);
		expect(output).toMatch(
			/<img[^>]*\/>\n\t<button class="lightbox-trigger" type="button">/
		);
	});

	it('indents accordion snapshots that use nested quotes in data-wp-context', async () => {
		const input =
			'<div data-wp-context="{ "autoclose": false, "accordionItems": [] }" class="wp-block-accordion"><div data-wp-context="{ "id": "accordion-item-3", "openByDefault": true }" class="wp-block-accordion-item"><p>The content is here</p></div></div>\n';

		const output = await prettifyMarkup(input);

		expect(output).toMatch(
			/data-wp-context='\{\s*"autoclose": false,\s*"accordionItems": \[\]\s*\}'/
		);
		expect(output).toMatch(/<div[\s\S]*class="wp-block-accordion-item"/);
		expect(output).toContain('<p>The content is here</p>');
		expect(output.split('\n').length).toBeGreaterThan(3);
	});
});

describe('quoteJsonHtmlAttributes', () => {
	it('switches broken JSON attribute wrappers to single quotes', () => {
		expect(
			quoteJsonHtmlAttributes(
				'<div data-wp-context="{ "id": "accordion-item-3" }"></div>'
			)
		).toBe(
			'<div data-wp-context=\'{ "id": "accordion-item-3" }\'></div>'
		);
	});
});

describe('prettifyMarkup php header', () => {
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

	it('skips svg indent when that token is off', async () => {
		const input =
			'<a class="wp-element-button">Button 2<svg viewBox="0 0 24 24" class="icon"><path d="M12 4Z"></path></svg></a>\n';

		const output = await prettifyMarkup(input, {
			prettier: { indentSvgElements: false, wrapMixedInlineParents: false },
		});

		expect(output).toContain('</path></svg>');
	});

	it('skips mixed inline wrapping when that token is off', async () => {
		const input =
			'<div class="wp-block-button">\n\t<a class="wp-element-button">\n\t\t<svg viewBox="0 0 24 24"><path d="M12 4Z"></path></svg>\n\t\tButton 2</a>\n</div>\n';

		const output = await prettifyMarkup(input, {
			prettier: { wrapMixedInlineParents: false },
		});

		expect(output).toMatch(/Button 2<\/a>/);
	});

	it('skips form-control wrapping when that token is off', async () => {
		const input =
			'<figure class="wp-lightbox-container"><img src="https://placehold.co/600x400" alt="" /><button class="lightbox-trigger" type="button">Go</button></figure>\n';

		const output = await prettifyMarkup(input, {
			prettier: { breakFormControlTags: false },
		});

		expect(output).toMatch(/\/><button/);
	});
});
