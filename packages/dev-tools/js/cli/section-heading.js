/**
 * Shared section rule used by bootstrap and webpack watch.
 * Total printed width matches the product logo art (including indent).
 *
 *   ── Bootstrap ─────────────────────────────────────────  booting
 *   ━━ Build · #1 ━━━━━━━━━━━━━━━━━━━━━━━━━  13s  ● watching
 */

const ANSI_PATTERN = /\u001b\[[0-9;]*m/g;

const fs = require('fs');
const path = require('path');

const DEFAULT_LOGO_WIDTH = 36;
const SECTION_HEADING_INDENT = '  ';
const SECTION_HEADING_WIDTH_FILE = 'section-heading-width';

/**
 * @param {string[]} lines Logo art lines.
 * @return {number} Widest line length.
 */
function measureArtWidth(lines) {
	if (!lines || !lines.length) {
		return DEFAULT_LOGO_WIDTH;
	}

	return Math.max(
		DEFAULT_LOGO_WIDTH,
		...lines.map((line) => String(line).length)
	);
}

/**
 * @param {string} text Text that may include ANSI.
 * @return {number} Visible length.
 */
function visibleLength(text) {
	return String(text).replace(ANSI_PATTERN, '').length;
}

/**
 * @param {string} status Right-slot label (`booting`, `booted`, `building`, `built`, `watching`).
 * @param {number} [frame] Pulse frame; used only for `watching`.
 * @param {string} [clock] Elapsed session clock; shown before `watching`.
 * @return {string} Right-slot text.
 */
function formatHeadingRight(status, frame = 0, clock = '') {
	if (status === 'watching') {
		const mark = `${frame % 2 === 0 ? '●' : '○'} watching`;

		return clock ? `${clock}  ${mark}` : mark;
	}

	return String(status);
}

/**
 * @param {string} title Section name (e.g. Bootstrap, Build).
 * @param {Object} [options]
 * @param {string} [options.meta] Optional suffix after a middle dot.
 * @param {number} [options.width] Rule width (not including indent).
 * @param {'light'|'heavy'} [options.weight] Light `──` when done, heavy `━━` when live.
 * @param {string} [options.right] Right-aligned suffix (e.g. `● watching`).
 * @return {string} Padded rule line without indent or color.
 */
function formatSectionHeading(title, options = {}) {
	const { meta, width = DEFAULT_LOGO_WIDTH, weight = 'light', right } = options;
	const label = meta ? `${title} · ${meta}` : title;
	const dash = weight === 'heavy' ? '━' : '─';
	const prefix = `${dash}${dash} `;
	const rightText = right ? `  ${right}` : '';
	const used = prefix.length + label.length + 1 + visibleLength(rightText);
	const dashes = Math.max(2, width - used);

	return `${prefix}${label} ${dash.repeat(dashes)}${rightText}`;
}

/**
 * @param {string} title Section name.
 * @param {number} logoWidth Full logo art width.
 * @param {Object} [options]
 * @return {string} Indented rule whose visible length matches the logo.
 */
function formatIndentedSectionHeading(title, logoWidth, options = {}) {
	const width = Math.max(
		8,
		(logoWidth || DEFAULT_LOGO_WIDTH) - SECTION_HEADING_INDENT.length
	);

	return `${SECTION_HEADING_INDENT}${formatSectionHeading(title, {
		...options,
		width,
	})}`;
}

/**
 * @param {string} root Project root.
 * @param {number} width Logo art width.
 */
function writeSectionHeadingWidth(root, width) {
	fs.writeFileSync(
		path.join(root, '.cache', SECTION_HEADING_WIDTH_FILE),
		`${width}\n`
	);
}

/**
 * @param {string} [root] Project root.
 * @return {number} Logo art width written by bootstrap, or the default.
 */
function readSectionHeadingWidth(root = process.cwd()) {
	try {
		const raw = fs.readFileSync(
			path.join(root, '.cache', SECTION_HEADING_WIDTH_FILE),
			'utf8'
		);
		const width = Number(raw.trim());

		if (Number.isFinite(width) && width > 0) {
			return width;
		}
	} catch (error) {
		// First webpack load without bootstrap; use the default.
	}

	return DEFAULT_LOGO_WIDTH;
}

module.exports = {
	DEFAULT_LOGO_WIDTH,
	SECTION_HEADING_INDENT,
	formatHeadingRight,
	formatIndentedSectionHeading,
	formatSectionHeading,
	measureArtWidth,
	readSectionHeadingWidth,
	writeSectionHeadingWidth,
};
