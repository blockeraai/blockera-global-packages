/**
 * Pretty-print Gutenberg HTML with Prettier.
 *
 * Pattern PHP files: format after the file-header `?>`.
 * Template HTML files (no header): format the whole file.
 * Skip when the formatted region already contains PHP if configured.
 */

const path = require('path');
const { createRequire } = require('module');
const { baseConfig } = require('./base-config');

const PHP_CLOSE = '?>';
const PHP_OPEN = '<?php';

const DEFAULT_HTML_PRETTIER_OPTIONS = {
	parser: 'html',
	useTabs: true,
	tabWidth: 4,
	printWidth: 80,
	endOfLine: 'lf',
};

/**
 * Index of the first character of markup (after `?>`, or 0).
 *
 * @param {string} content File contents.
 * @return {number} Markup start index.
 */
function getMarkupStart(content) {
	const close = content.indexOf(PHP_CLOSE);
	return close === -1 ? 0 : close + PHP_CLOSE.length;
}

/**
 * @deprecated Use getMarkupStart. -1 when there is no header (legacy).
 *
 * @param {string} content File contents.
 * @return {number} Markup start or -1.
 */
function getPatternMarkupStart(content) {
	const close = content.indexOf(PHP_CLOSE);
	return close === -1 ? -1 : close + PHP_CLOSE.length;
}

/**
 * Whether the markup region already contains PHP.
 *
 * @param {string} content File contents.
 * @return {boolean} True when PHP is in the formatted region.
 */
function hasPhpInMarkup(content) {
	const headerClose = content.indexOf(PHP_CLOSE);
	if (headerClose === -1) {
		return content.indexOf(PHP_OPEN) !== -1;
	}

	return content.indexOf(PHP_OPEN, headerClose + PHP_CLOSE.length) !== -1;
}

/**
 * Legacy alias: headerless files used to be treated as "already PHP".
 *
 * @param {string} content File contents.
 * @return {boolean} True when markup already has PHP.
 */
function hasPhpInPatternMarkup(content) {
	return hasPhpInMarkup(content);
}

/**
 * @param {string} [productRoot] Product root with node_modules.
 * @param {string} id Module id.
 * @return {*} Required module.
 */
function requireFromProductOrProcess(productRoot, id) {
	if (productRoot) {
		try {
			return createRequire(path.join(productRoot, 'package.json'))(id);
		} catch (error) {
			// Product has no matching module; fall through.
		}
	}

	return require(id);
}

/**
 * @param {string} [productRoot] Product root with node_modules/prettier.
 * @return {{ format: Function, htmlPlugin: Object }|null} Formatter or null.
 */
function loadPrettier(productRoot) {
	try {
		const standalone = requireFromProductOrProcess(
			productRoot,
			'prettier/standalone'
		);
		const htmlPlugin = requireFromProductOrProcess(
			productRoot,
			'prettier/plugins/html'
		);

		if (!standalone || typeof standalone.format !== 'function' || !htmlPlugin) {
			return null;
		}

		return { format: standalone.format, htmlPlugin };
	} catch (error) {
		return null;
	}
}

/**
 * @param {string} [productRoot] Product root.
 * @return {Object|null} Config object or null.
 */
function loadProductPrettierConfig(productRoot) {
	if (!productRoot) {
		return null;
	}

	try {
		return createRequire(path.join(productRoot, 'package.json'))(
			'./.prettierrc.js'
		);
	} catch (error) {
		return null;
	}
}

/**
 * @param {Object|null} resolved Product prettier config.
 * @return {Object} Options for prettier.format().
 */
function htmlPrettierOptions(resolved) {
	if (!resolved) {
		return { ...DEFAULT_HTML_PRETTIER_OPTIONS };
	}

	return {
		parser: 'html',
		useTabs: resolved.useTabs ?? DEFAULT_HTML_PRETTIER_OPTIONS.useTabs,
		tabWidth: resolved.tabWidth ?? DEFAULT_HTML_PRETTIER_OPTIONS.tabWidth,
		printWidth:
			resolved.printWidth ?? DEFAULT_HTML_PRETTIER_OPTIONS.printWidth,
		endOfLine:
			resolved.endOfLine && resolved.endOfLine !== 'auto'
				? resolved.endOfLine
				: DEFAULT_HTML_PRETTIER_OPTIONS.endOfLine,
	};
}

/**
 * @param {string} line One markup line.
 * @return {'open'|'close'|'self'|null} Comment kind, or null to leave as-is.
 */
function classifyWpCommentLine(line) {
	const trimmed = line.trim();
	if (!trimmed.startsWith('<!--') || !trimmed.endsWith('-->')) {
		return null;
	}

	if (trimmed.indexOf('<!--') !== trimmed.lastIndexOf('<!--')) {
		return null;
	}

	const inner = trimmed.slice(4, -3).trim();
	if (inner.startsWith('/wp:')) {
		return 'close';
	}
	if (!inner.startsWith('wp:')) {
		return null;
	}

	return inner.endsWith('/') ? 'self' : 'open';
}

/**
 * Kind of the next non-empty line, or null when none / not a wp comment.
 *
 * @param {string[]} lines Markup lines.
 * @param {number} fromIndex Current line index.
 * @return {'open'|'close'|'self'|null} Next comment kind.
 */
function nextNonEmptyCommentKind(lines, fromIndex) {
	for (let i = fromIndex + 1; i < lines.length; i++) {
		if (!lines[i].trim()) {
			continue;
		}

		return classifyWpCommentLine(lines[i]);
	}

	return null;
}

/**
 * Comment-only parents (`wp:query-no-results`, `wp:query-pagination`, …)
 * have no wrapper HTML. Prettier leaves their inner HTML at column 0.
 * Each such ancestor adds one indent unit to HTML lines.
 *
 * @param {boolean[]} commentOnlyStack Open-block comment-only flags.
 * @return {number} Extra indent levels for HTML.
 */
function commentOnlyAncestorCount(commentOnlyStack) {
	let extra = 0;

	for (let i = 0; i < commentOnlyStack.length; i++) {
		if (commentOnlyStack[i]) {
			extra += 1;
		}
	}

	return extra;
}

/**
 * @param {string} markup HTML.
 * @param {string} [indentUnit='\t'] Indent string.
 * @return {string} Markup with nested block comments (and HTML inside
 *                  comment-only parents) indented.
 */
function indentGutenbergBlockComments(markup, indentUnit = '\t') {
	const lines = markup.split('\n');
	let depth = 0;
	const commentOnlyStack = [];

	const next = lines.map((line, index) => {
		const kind = classifyWpCommentLine(line);

		if (kind === 'close') {
			depth = Math.max(0, depth - 1);
			commentOnlyStack.pop();
			return indentUnit.repeat(depth) + line.trim();
		}

		if (kind === 'open') {
			const indented = indentUnit.repeat(depth) + line.trim();
			commentOnlyStack.push(nextNonEmptyCommentKind(lines, index) !== null);
			depth += 1;
			return indented;
		}

		if (kind === 'self') {
			return indentUnit.repeat(depth) + line.trim();
		}

		const extra = commentOnlyAncestorCount(commentOnlyStack);

		if (!line.trim() || extra === 0) {
			return line;
		}

		return indentUnit.repeat(extra) + line;
	});

	return next.join('\n');
}

const SKIP_TEXT_ONLY_COLLAPSE = {
	pre: true,
	textarea: true,
	script: true,
	style: true,
};

/**
 * Keep text-only tags on one line. Prettier wraps long text to printWidth;
 * Gutenberg patterns expect `<p>Only text here.</p>` without inner breaks.
 *
 * @param {string} markup HTML.
 * @return {string} Markup with text-only tags collapsed.
 */
function collapseTextOnlyTags(markup) {
	return markup.replace(
		/<([a-zA-Z][\w:-]*)(\s[^>]*)?>\s*([^<]*?)\s*<\/\1>/g,
		(full, tag, attrs, inner) => {
			if (SKIP_TEXT_ONLY_COLLAPSE[tag.toLowerCase()]) {
				return full;
			}

			if (!/\r|\n/.test(full) || !/\S/.test(inner)) {
				return full;
			}

			const text = inner
				.replace(/[ \t]*\r?\n[ \t]*/g, ' ')
				.replace(/[ \t]{2,}/g, ' ')
				.trim();

			return `<${tag}${attrs || ''}>${text}</${tag}>`;
		}
	);
}

/**
 * Indent HTML with Prettier.
 *
 * @param {string} content File contents.
 * @param {Object} [options] Normalize options.
 * @return {Promise<string>} Original or prettified contents.
 */
async function prettifyMarkup(content, options = {}) {
	const prettierConfig = options.prettier || baseConfig.prettier;

	if (prettierConfig.enabled === false) {
		return content;
	}

	const skipPhp =
		prettierConfig.skipWhenMarkupHasPhp !== false && hasPhpInMarkup(content);

	if (skipPhp) {
		return content;
	}

	const start = getMarkupStart(content);
	const markup = content.slice(start);
	if (!markup.trim()) {
		return content;
	}

	const resolved = loadProductPrettierConfig(options.productRoot);
	const prettierOptions = htmlPrettierOptions(resolved);
	const indentUnit = prettierOptions.useTabs
		? '\t'
		: ' '.repeat(prettierOptions.tabWidth);

	const prettier = loadPrettier(options.productRoot);
	let formatted = markup;
	if (prettier) {
		try {
			formatted = await prettier.format(markup, {
				...prettierOptions,
				plugins: [prettier.htmlPlugin],
			});
		} catch (error) {
			formatted = markup;
		}
	}

	if (prettierConfig.indentGutenbergComments !== false) {
		formatted = indentGutenbergBlockComments(formatted, indentUnit);
	}

	if (prettierConfig.collapseTextOnlyTags !== false) {
		formatted = collapseTextOnlyTags(formatted);
	}

	if (start === 0) {
		return formatted;
	}

	const header = content.slice(0, start).replace(/[\r\n]+$/, '');
	return header + '\n' + formatted;
}

/**
 * @param {string} content File contents.
 * @param {Object} [options] Normalize options.
 * @return {Promise<string>} Original or prettified contents.
 */
function prettifyPatternMarkup(content, options = {}) {
	return prettifyMarkup(content, options);
}

module.exports = {
	DEFAULT_HTML_PRETTIER_OPTIONS,
	classifyWpCommentLine,
	getMarkupStart,
	getPatternMarkupStart,
	hasPhpInMarkup,
	hasPhpInPatternMarkup,
	indentGutenbergBlockComments,
	collapseTextOnlyTags,
	prettifyMarkup,
	prettifyPatternMarkup,
};
