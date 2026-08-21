/**
 * Pretty-print pattern HTML with Prettier before i18n/PHP is injected.
 *
 * Pattern PHP files always have a `<?php … ?>` file header. Prettier only runs
 * on the markup after that header, and only when that markup does not yet
 * contain PHP (`esc_html_e`, `esc_url`, …). After localization, skip.
 *
 * Uses `prettier/standalone` + the HTML plugin (CJS) so this works in Jest and
 * Node. The product's `@wordpress/prettier-config` whitespace options are
 * applied when `.prettierrc.js` can be loaded; plugins are ignored.
 */

const path = require('path');
const { createRequire } = require('module');

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
 * Index of the first character after the file-header `?>`.
 *
 * @param {string} content Pattern file contents.
 * @return {number} Markup start index, or -1 when there is no header close.
 */
function getPatternMarkupStart(content) {
	const close = content.indexOf(PHP_CLOSE);
	return close === -1 ? -1 : close + PHP_CLOSE.length;
}

/**
 * Whether the pattern body (after the PHP file header) already contains PHP.
 *
 * @param {string} content Pattern file contents.
 * @return {boolean} True when markup already has PHP (or cannot be split).
 */
function hasPhpInPatternMarkup(content) {
	const start = getPatternMarkupStart(content);
	if (start === -1) {
		return true;
	}
	return content.indexOf(PHP_OPEN, start) !== -1;
}

/**
 * Require a module from the product root, then from this process.
 *
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
 * Load Prettier standalone + HTML plugin (Jest-safe CJS entry points).
 *
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
 * Load the product Prettier config without prettier.resolveConfig (ESM).
 *
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
 * Whitespace options from the product Prettier config (ignore plugins).
 *
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
 * Classify a single-line Gutenberg block comment.
 *
 * Prettier's HTML parser does not nest `<!-- wp:… -->` comments, so
 * comment-only parents (query-pagination, query-no-results, …) flatten.
 *
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
 * Re-indent Gutenberg block comments from `<!-- wp:` / `<!-- /wp:` nesting.
 *
 * HTML lines are left for Prettier. Only comment-only lines are rewritten.
 *
 * @param {string} markup Pattern HTML (after the PHP header).
 * @param {string} [indentUnit='\t'] Indent string (tab or spaces).
 * @return {string} Markup with nested block comments indented.
 */
function indentGutenbergBlockComments(markup, indentUnit = '\t') {
	const lines = markup.split('\n');
	let depth = 0;

	const next = lines.map((line) => {
		const kind = classifyWpCommentLine(line);
		if (!kind) {
			return line;
		}

		if (kind === 'close') {
			depth = Math.max(0, depth - 1);
		}

		const indented = indentUnit.repeat(depth) + line.trim();

		if (kind === 'open') {
			depth += 1;
		}

		return indented;
	});

	return next.join('\n');
}

/**
 * Indent pattern HTML with Prettier. No-op when markup already contains PHP.
 *
 * @param {string} content Pattern file contents.
 * @param {Object} [options] Normalize options.
 * @param {string} [options.productRoot] Product root for resolving Prettier.
 * @return {Promise<string>} Original or prettified contents.
 */
async function prettifyPatternMarkup(content, options = {}) {
	if (hasPhpInPatternMarkup(content)) {
		return content;
	}

	const start = getPatternMarkupStart(content);
	if (start === -1) {
		return content;
	}

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

	formatted = indentGutenbergBlockComments(formatted, indentUnit);

	const header = content.slice(0, start).replace(/[\r\n]+$/, '');
	return header + '\n' + formatted;
}

module.exports = {
	DEFAULT_HTML_PRETTIER_OPTIONS,
	classifyWpCommentLine,
	getPatternMarkupStart,
	hasPhpInPatternMarkup,
	indentGutenbergBlockComments,
	prettifyPatternMarkup,
};
