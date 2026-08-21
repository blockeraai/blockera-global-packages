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

/** oEmbed URLs must stay on their own line inside this wrapper (see core/embed save.js). */
const OEMBED_URL_WRAPPER_CLASS = 'wp-block-embed__wrapper';

/**
 * @param {string} [attrs] Raw tag attributes.
 * @return {boolean} True when attrs mark an oEmbed URL wrapper.
 */
function isOembedUrlWrapperAttrs(attrs) {
	return Boolean(attrs && attrs.includes(OEMBED_URL_WRAPPER_CLASS));
}

const VOID_TAGS = {
	area: true,
	base: true,
	br: true,
	col: true,
	embed: true,
	hr: true,
	img: true,
	input: true,
	link: true,
	meta: true,
	source: true,
	track: true,
	wbr: true,
};

/** HTML phrasing content — treated as text when deciding whether to wrap. */
const PHRASING_TAGS = {
	a: true,
	abbr: true,
	b: true,
	bdi: true,
	bdo: true,
	br: true,
	cite: true,
	code: true,
	data: true,
	dfn: true,
	em: true,
	i: true,
	img: true,
	kbd: true,
	mark: true,
	q: true,
	s: true,
	samp: true,
	small: true,
	span: true,
	strong: true,
	sub: true,
	sup: true,
	time: true,
	u: true,
	var: true,
	wbr: true,
};

/** Form controls — always start on their own line when glued to a sibling. */
const FORM_CONTROL_TAGS = {
	button: true,
	datalist: true,
	fieldset: true,
	form: true,
	input: true,
	legend: true,
	meter: true,
	optgroup: true,
	option: true,
	output: true,
	progress: true,
	select: true,
	textarea: true,
};

/**
 * Flatten attribute whitespace so Prettier's printWidth wraps do not
 * leave `class` / `style` on their own lines.
 *
 * @param {string} [attrs] Raw attributes including leading whitespace.
 * @return {string} ` class="…" style="…"` or empty.
 */
function compactTagAttrs(attrs) {
	if (!attrs) {
		return '';
	}

	const compact = attrs.replace(/\s+/g, ' ').trim();
	return compact ? ` ${compact}` : '';
}

/**
 * Prettier can split `</span>` to `</span` + newline + `>` when the
 * line is over printWidth. Join those back into a real close tag.
 *
 * @param {string} markup HTML.
 * @return {string} Markup with intact closing tags.
 */
function collapseBrokenCloseTags(markup) {
	return markup.replace(/<\/([a-zA-Z][\w:-]*)\s*\r?\n\s*>/g, '</$1>');
}

/**
 * Put a multiline start or self-closing tag back on one line.
 * Applies to every tag (`div`, `link`, `p`, …), not only text-only pairs.
 *
 * @param {string} markup HTML.
 * @return {string} Markup with compacted start tags.
 */
function collapseMultilineStartTags(markup) {
	return markup.replace(
		/<([a-zA-Z][\w:-]*)(\s[^>]*)?>/g,
		(full, tag, attrs) => {
			if (!/\r|\n/.test(full)) {
				return full;
			}

			let raw = attrs || '';
			const selfClosing = /\/\s*$/.test(raw);
			if (selfClosing) {
				raw = raw.replace(/\/\s*$/, '');
			}

			return `<${tag}${compactTagAttrs(raw)}${selfClosing ? ' /' : ''}>`;
		}
	);
}

/**
 * Keep text-only tags on one line. Prettier wraps long text and attrs
 * to printWidth; Gutenberg fixtures expect
 * `<p class="…">Only text here.</p>`.
 *
 * @param {string} markup HTML.
 * @return {string} Markup with text-only tags collapsed.
 */
function collapseTextOnlyTags(markup) {
	return markup.replace(
		/<([a-zA-Z][\w:-]*)(\s[^>]*)?>\s*([^<]*?)\s*<\/\1\s*>/g,
		(full, tag, attrs, inner) => {
			if (SKIP_TEXT_ONLY_COLLAPSE[tag.toLowerCase()]) {
				return full;
			}

			if (isOembedUrlWrapperAttrs(attrs)) {
				return full;
			}

			if (!/\r|\n/.test(full) || !/\S/.test(inner)) {
				return full;
			}

			const text = inner
				.replace(/[ \t]*\r?\n[ \t]*/g, ' ')
				.replace(/[ \t]{2,}/g, ' ')
				.trim();

			return `<${tag}${compactTagAttrs(attrs)}>${text}</${tag}>`;
		}
	);
}

/**
 * @param {string} inner Markup between a tag pair.
 * @return {boolean} True when every child tag is phrasing content.
 */
function innerIsPhrasingOnly(inner) {
	if (inner.indexOf('<!--') !== -1) {
		return false;
	}

	const tagRe = /<\/?([a-zA-Z][\w:-]*)/g;
	let match;

	while ((match = tagRe.exec(inner))) {
		if (!PHRASING_TAGS[match[1].toLowerCase()]) {
			return false;
		}
	}

	return true;
}

/**
 * @param {string} markup HTML.
 * @return {Array<{ tag: string, attrs: string, start: number, openEnd: number, closeStart: number, end: number }>}
 */
function findElementRanges(markup) {
	const elements = [];
	const stack = [];
	const tokenRe = /<\/?([a-zA-Z][\w:-]*)(\s[^>]*)?>/g;
	let token;

	while ((token = tokenRe.exec(markup))) {
		const tag = token[1].toLowerCase();
		const isClose = token[0].startsWith('</');
		const isSelf =
			VOID_TAGS[tag] || /\/\s*>$/.test(token[0]);

		if (isClose) {
			for (let i = stack.length - 1; i >= 0; i--) {
				if (stack[i].tag !== tag) {
					continue;
				}

				const open = stack[i];
				stack.length = i;
				elements.push({
					tag: open.tag,
					attrs: open.attrs,
					start: open.start,
					openEnd: open.end,
					closeStart: token.index,
					end: token.index + token[0].length,
				});
				break;
			}
			continue;
		}

		if (isSelf) {
			continue;
		}

		stack.push({
			tag,
			attrs: token[2] || '',
			start: token.index,
			end: token.index + token[0].length,
		});
	}

	return elements;
}

/**
 * Keep tags whose children are only text + inline (phrasing) tags
 * on one line. Block children (`div`, `p`, `ul`, …) still wrap.
 *
 * @param {string} markup HTML.
 * @return {string} Markup with phrasing parents collapsed.
 */
function collapsePhrasingContentTags(markup) {
	let next = markup;
	let replaced = true;

	while (replaced) {
		replaced = false;
		const elements = findElementRanges(next);

		for (let i = 0; i < elements.length; i++) {
			const el = elements[i];
			if (SKIP_TEXT_ONLY_COLLAPSE[el.tag]) {
				continue;
			}

			if (isOembedUrlWrapperAttrs(el.attrs)) {
				continue;
			}

			const inner = next.slice(el.openEnd, el.closeStart);
			const full = next.slice(el.start, el.end);

			if (!/\r|\n/.test(full) || !/\S/.test(inner)) {
				continue;
			}

			if (!innerIsPhrasingOnly(inner)) {
				continue;
			}

			const compactInner = inner
				.replace(/^\s+|\s+$/g, '')
				.replace(/\s*\n\s*/g, ' ');

			next =
				next.slice(0, el.start) +
				`<${el.tag}${compactTagAttrs(el.attrs)}>${compactInner}</${el.tag}>` +
				next.slice(el.end);
			replaced = true;
			break;
		}
	}

	return next;
}

/**
 * Nearest previous non-empty line.
 *
 * @param {string} markup HTML.
 * @param {number} lineStart Start index of the current line.
 * @return {string} Previous non-empty line, or empty.
 */
function getPreviousNonEmptyLine(markup, lineStart) {
	let search = lineStart;

	while (search > 0) {
		const prevEnd = search - 1;
		const prevStart = markup.lastIndexOf('\n', prevEnd - 1) + 1;
		const prevLine = markup.slice(prevStart, prevEnd);

		if (prevLine.trim()) {
			return prevLine;
		}

		search = prevStart;
		if (prevStart === 0) {
			break;
		}
	}

	return '';
}

/**
 * Indent of the nearest previous non-empty line.
 *
 * @param {string} markup HTML.
 * @param {number} lineStart Start index of the current line.
 * @return {string} Leading tabs/spaces.
 */
function getPreviousLineIndent(markup, lineStart) {
	const prevLine = getPreviousNonEmptyLine(markup, lineStart);
	const indentMatch = prevLine.match(/^[\t ]*/);
	return indentMatch ? indentMatch[0] : '';
}

/**
 * Last tag on a line, used to decide sibling vs nested indent.
 *
 * @param {string} beforeOnLine Text before the glued tag.
 * @return {{ name: string, close: boolean, self: boolean } | null}
 */
function lastTagOnLine(beforeOnLine) {
	const tagRe = /<\/?([a-zA-Z][\w:-]*)[^>]*>/g;
	let token;
	let last = null;

	while ((token = tagRe.exec(beforeOnLine))) {
		const name = token[1].toLowerCase();
		const close = token[0].startsWith('</');
		const self = VOID_TAGS[name] || /\/\s*>$/.test(token[0]);

		last = { name, close, self };
	}

	return last;
}

/**
 * @param {string} markup HTML.
 * @param {number} offset Index of a tag.
 * @return {{ parentIndent: string, glued: boolean, asChild: boolean, sliceFrom: number }}
 */
function getSvgPlacement(markup, offset) {
	const lineStart = markup.lastIndexOf('\n', offset - 1) + 1;
	const beforeOnLine = markup.slice(lineStart, offset);
	const glued = beforeOnLine.trim().length > 0;

	if (glued) {
		const indentMatch = beforeOnLine.match(/^[\t ]*/);
		return {
			parentIndent: indentMatch ? indentMatch[0] : '',
			glued: true,
			asChild: true,
			sliceFrom: offset,
		};
	}

	const prevLine = getPreviousNonEmptyLine(markup, lineStart);
	const last = lastTagOnLine(prevLine);
	const asChild = Boolean(last && !last.close && !last.self);

	return {
		parentIndent: getPreviousLineIndent(markup, lineStart),
		glued: false,
		asChild,
		sliceFrom: lineStart,
	};
}

/**
 * Indent an `<svg>` tree: opening tag, each child, then close.
 *
 * @param {string} svgHtml `<svg>…</svg>` fragment.
 * @param {string} baseIndent Indent of the svg line.
 * @param {string} indentUnit One indent step.
 * @return {string} Formatted svg.
 */
function formatSvgTree(svgHtml, baseIndent, indentUnit) {
	const squeezed = collapseMultilineStartTags(
		svgHtml.replace(/>\s+</g, '><')
	);
	const tokenRe = /<\/?([a-zA-Z][\w:-]*)(\s[^>]*)?>/g;
	let token;
	let depth = 0;
	const lines = [];

	while ((token = tokenRe.exec(squeezed))) {
		const tag = token[1].toLowerCase();
		const isClose = token[0].startsWith('</');
		const isSelf = VOID_TAGS[tag] || /\/\s*>$/.test(token[0]);
		const after = squeezed.slice(token.index + token[0].length);
		const emptyClose = new RegExp('^</' + tag + '\\s*>', 'i').exec(after);

		if (isClose) {
			depth = Math.max(0, depth - 1);
			lines.push(baseIndent + indentUnit.repeat(depth) + token[0]);
			continue;
		}

		let line = baseIndent + indentUnit.repeat(depth) + token[0];
		if (emptyClose) {
			line += emptyClose[0];
			tokenRe.lastIndex = token.index + token[0].length + emptyClose[0].length;
			lines.push(line);
			continue;
		}

		lines.push(line);
		if (!isSelf) {
			depth += 1;
		}
	}

	return lines.join('\n');
}

/**
 * Keep SVG (and its children) on their own indented lines instead of
 * collapsing them like inline phrasing content.
 *
 * @param {string} markup HTML.
 * @param {string} [indentUnit='\t'] Indent string.
 * @return {string} Markup with formatted svg trees.
 */
function indentSvgElements(markup, indentUnit = '\t') {
	const svgRe = /<svg\b[\s\S]*?<\/svg>/gi;
	let out = '';
	let last = 0;
	let match;

	while ((match = svgRe.exec(markup))) {
		const { parentIndent, glued, asChild, sliceFrom } = getSvgPlacement(
			markup,
			match.index
		);
		const svgIndent =
			glued || asChild ? parentIndent + indentUnit : parentIndent;
		const formatted = formatSvgTree(match[0], svgIndent, indentUnit);
		const afterIndex = match.index + match[0].length;
		const gluedAfter =
			afterIndex < markup.length && !/^\s/.test(markup[afterIndex]);

		out +=
			markup.slice(last, sliceFrom) +
			(glued ? '\n' : '') +
			formatted +
			(gluedAfter ? '\n' + parentIndent : '');
		last = afterIndex;
	}

	return out + markup.slice(last);
}

/**
 * @param {string} whitespace Leading tabs/spaces.
 * @param {string} indentUnit One indent step.
 * @return {number} Indent depth.
 */
function countIndent(whitespace, indentUnit) {
	if (!whitespace) {
		return 0;
	}

	if (indentUnit === '\t') {
		return (whitespace.match(/\t/g) || []).length;
	}

	return Math.floor(whitespace.length / indentUnit.length);
}

/**
 * Rebase a multiline fragment so its first line sits at `targetIndent`.
 *
 * @param {string} html Tag tree.
 * @param {string} targetIndent Desired first-line indent.
 * @param {string} indentUnit One indent step.
 * @return {string} Re-indented HTML.
 */
function reindentBlock(html, targetIndent, indentUnit) {
	const trimmed = html.replace(/^\s+|\s+$/g, '');
	const lines = trimmed.split('\n');
	const firstWs = (lines[0].match(/^[\t ]*/) || [''])[0];
	const firstDepth = countIndent(firstWs, indentUnit);

	let baseDepth = firstDepth;

	if (baseDepth === 0) {
		let minChild = Infinity;

		for (let i = 1; i < lines.length; i++) {
			if (!lines[i].trim()) {
				continue;
			}

			const childDepth = countIndent(
				(lines[i].match(/^[\t ]*/) || [''])[0],
				indentUnit
			);

			if (childDepth < minChild) {
				minChild = childDepth;
			}
		}

		if (minChild !== Infinity) {
			baseDepth = minChild;
		}
	}

	return lines
		.map((line, index) => {
			const ws = (line.match(/^[\t ]*/) || [''])[0];
			const rest = line.slice(ws.length);
			const relative =
				index === 0 && firstDepth === 0
					? 0
					: Math.max(0, countIndent(ws, indentUnit) - baseDepth);

			return targetIndent + indentUnit.repeat(relative) + rest;
		})
		.join('\n');
}

/**
 * Split inner HTML into top-level text vs element chunks.
 *
 * @param {string} inner Parent innerHTML.
 * @return {Array<{ type: 'text' | 'block', value: string }>}
 */
function splitTopLevelChunks(inner) {
	const all = findElementRanges(inner);
	const top = all
		.filter(
			(el) =>
				!all.some(
					(other) => other.start < el.start && other.end > el.end
				)
		)
		.sort((a, b) => a.start - b.start);

	const chunks = [];
	let cursor = 0;

	for (let i = 0; i < top.length; i++) {
		const el = top[i];
		const text = inner.slice(cursor, el.start);

		if (text.trim()) {
			chunks.push({ type: 'text', value: text.trim() });
		}

		const html = inner.slice(el.start, el.end);

		if (PHRASING_TAGS[el.tag] && innerIsPhrasingOnly(html)) {
			chunks.push({ type: 'text', value: html.trim() });
		} else {
			chunks.push({ type: 'block', value: html });
		}

		cursor = el.end;
	}

	const tail = inner.slice(cursor);

	if (tail.trim()) {
		chunks.push({ type: 'text', value: tail.trim() });
	}

	return chunks;
}

/**
 * @param {string} markup HTML.
 * @param {{ openEnd: number, closeStart: number }} el Element range.
 * @return {boolean} True when open/close already wrap indented children.
 */
function isMixedParentAlreadyWrapped(markup, el) {
	const inner = markup.slice(el.openEnd, el.closeStart);

	if (!/^\r?\n/.test(inner) || !/\r?\n[\t ]*$/.test(inner)) {
		return false;
	}

	const closeLineStart = markup.lastIndexOf('\n', el.closeStart - 1) + 1;

	return markup.slice(closeLineStart, el.closeStart).trim() === '';
}

/**
 * When an inline parent (`a`, `span`, …) contains text plus a non-inline
 * child (`svg`, `div`, …), wrap children and put the closing tag on its
 * own line, aligned with the opening tag.
 *
 * @param {string} markup HTML.
 * @param {string} [indentUnit='\t'] Indent string.
 * @return {string} Markup with mixed inline parents wrapped.
 */
function wrapMixedInlineParents(markup, indentUnit = '\t') {
	let next = markup;
	let guard = 0;

	while (guard < 1000) {
		guard += 1;
		const mixed = findElementRanges(next)
			.filter((el) => {
				if (SKIP_TEXT_ONLY_COLLAPSE[el.tag] || VOID_TAGS[el.tag]) {
					return false;
				}

				if (!PHRASING_TAGS[el.tag]) {
					return false;
				}

				const inner = next.slice(el.openEnd, el.closeStart);

				if (
					innerIsPhrasingOnly(inner) ||
					inner.replace(/<[^>]+>/g, '').trim().length === 0
				) {
					return false;
				}

				return !isMixedParentAlreadyWrapped(next, el);
			})
			.sort((a, b) => b.start - a.start);

		if (!mixed.length) {
			break;
		}

		const el = mixed[0];
		const inner = next.slice(el.openEnd, el.closeStart);
		const chunks = splitTopLevelChunks(inner);

		if (!chunks.length) {
			break;
		}

		const lineStart = next.lastIndexOf('\n', el.start - 1) + 1;
		const parentIndent = (
			next.slice(lineStart, el.start).match(/^[\t ]*/) || ['']
		)[0];
		const childIndent = parentIndent + indentUnit;
		const wrappedInner = chunks
			.map((chunk) =>
				chunk.type === 'text'
					? childIndent + chunk.value
					: reindentBlock(chunk.value, childIndent, indentUnit)
			)
			.join('\n');
		const replacement =
			next.slice(el.start, el.openEnd) +
			'\n' +
			wrappedInner +
			'\n' +
			parentIndent +
			`</${el.tag}>`;

		next = next.slice(0, el.start) + replacement + next.slice(el.end);
	}

	return next;
}

/**
 * Put `button`, `input`, and other form controls on their own line
 * when Prettier left them glued to the previous tag (`/><button`).
 *
 * @param {string} markup HTML.
 * @param {string} [indentUnit='\t'] Indent string.
 * @return {string} Markup with form controls broken to new lines.
 */
function breakFormControlTags(markup, indentUnit = '\t') {
	const names = Object.keys(FORM_CONTROL_TAGS).join('|');
	const tagRe = new RegExp(`<(${names})\\b`, 'gi');
	let out = '';
	let last = 0;
	let match;

	while ((match = tagRe.exec(markup))) {
		const lineStart = markup.lastIndexOf('\n', match.index - 1) + 1;
		const beforeOnLine = markup.slice(lineStart, match.index);

		if (!beforeOnLine.trim()) {
			continue;
		}

		const lineIndent = (beforeOnLine.match(/^[\t ]*/) || [''])[0];
		const previous = lastTagOnLine(beforeOnLine);
		const nested =
			previous && !previous.close && !previous.self
				? indentUnit
				: '';

		out += markup.slice(last, match.index) + '\n' + lineIndent + nested;
		last = match.index;
	}

	return out + markup.slice(last);
}

/**
 * Undo Prettier printWidth wraps on start tags and text-only elements.
 *
 * @param {string} markup HTML.
 * @return {string} Compacted markup.
 */
function collapseWrappedTags(markup) {
	return collapsePhrasingContentTags(
		collapseTextOnlyTags(
			collapseMultilineStartTags(collapseBrokenCloseTags(markup))
		)
	);
}

/**
 * Put bare oEmbed URLs on their own line inside `.wp-block-embed__wrapper`.
 * Prettier collapses them to one line; WordPress needs `\n${url}\n` to autoembed.
 *
 * @param {string} markup HTML.
 * @param {string} [indentUnit='\t'] One indent level.
 * @return {string} Markup with expanded oEmbed wrappers.
 */
function expandOembedUrlWrappers(markup, indentUnit = '\t') {
	const urlPattern = 'https?:\\/\\/[^\\s<]+';

	return markup.replace(
		new RegExp(
			`^(\\t*)<div(\\s[^>]*\\b${OEMBED_URL_WRAPPER_CLASS}\\b[^>]*)>(${urlPattern})<\\/div>`,
			'gm'
		),
		(match, indent, attrs, url) =>
			`${indent}<div${attrs}>\n${indent}${indentUnit}${url}\n${indent}</div>`
	);
}

/**
 * Interactivity API snapshots often emit invalid HTML:
 * `data-wp-context="{ "id": "x" }"`. Prettier then throws
 * "Opening tag not terminated" and we would keep the minified file.
 * Switch those attribute wrappers to single quotes so the parser can run.
 *
 * @param {string} markup HTML.
 * @return {string} Markup with parseable JSON attributes.
 */
function quoteJsonHtmlAttributes(markup) {
	return markup.replace(
		/(\s[\w:.-]+=)"(\{[^{}]*\})"/g,
		(full, prefix, json) => {
			if (json.indexOf("'") !== -1) {
				return `${prefix}"${json.replace(/"/g, '&quot;')}"`;
			}

			return `${prefix}'${json}'`;
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
	let formatted =
		prettierConfig.quoteJsonHtmlAttributes !== false
			? quoteJsonHtmlAttributes(markup)
			: markup;
	if (prettier) {
		try {
			formatted = await prettier.format(formatted, {
				...prettierOptions,
				plugins: [prettier.htmlPlugin],
			});
		} catch (error) {
			if (options.debug || options.quiet === false) {
				const firstLine = String(error.message).split('\n')[0];
				// @debug-ignore — CLI warning when prettier cannot parse markup
				// eslint-disable-next-line no-console
				console.warn(`block-markup prettier: ${firstLine}`);
			}
			formatted = markup;
		}
	}

	if (prettierConfig.indentGutenbergComments !== false) {
		formatted = indentGutenbergBlockComments(formatted, indentUnit);
	}

	if (prettierConfig.collapseTextOnlyTags !== false) {
		formatted = collapseWrappedTags(formatted);
	}

	if (prettierConfig.indentSvgElements !== false) {
		formatted = indentSvgElements(formatted, indentUnit);
	}

	if (prettierConfig.wrapMixedInlineParents !== false) {
		formatted = wrapMixedInlineParents(formatted, indentUnit);
	}

	if (prettierConfig.breakFormControlTags !== false) {
		formatted = breakFormControlTags(formatted, indentUnit);
	}

	formatted = expandOembedUrlWrappers(formatted, indentUnit);

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
	collapseBrokenCloseTags,
	collapseMultilineStartTags,
	collapsePhrasingContentTags,
	collapseTextOnlyTags,
	collapseWrappedTags,
	expandOembedUrlWrappers,
	quoteJsonHtmlAttributes,
	indentSvgElements,
	wrapMixedInlineParents,
	breakFormControlTags,
	prettifyMarkup,
	prettifyPatternMarkup,
};
