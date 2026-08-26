/**
 * Match a PHP i18n echo used as a text node (`esc_html_e( '…', 'domain' );`).
 */
const LOCALIZED_PHP_TEXT =
	/^<\?php\s+(?:esc_html_e|esc_html__|esc_attr_e|esc_attr__|_e|__)\s*\(\s*'((?:\\'|[^'])*)'\s*,\s*'(?:\\'|[^'])*'\s*\)\s*;\s*\?>$/;

/**
 * Unwrap an i18n PHP echo back to its string argument.
 *
 * @param {string} raw Text or PHP snippet.
 * @return {string|null} Decoded string or null when `raw` is not an i18n echo.
 */
function unwrapLocalizedPhp(raw) {
	if (!raw) {
		return null;
	}

	const match = raw.trim().match(LOCALIZED_PHP_TEXT);

	if (!match) {
		return null;
	}

	return match[1].replace(/\\'/g, "'").replace(/\\\\/g, '\\');
}

/**
 * Wrap a string in a WordPress i18n + escaping PHP call.
 *
 * @param {string} text Raw text (or already-localized PHP).
 * @param {string} textDomain Text domain.
 * @param {boolean} [isAttr=false] Use attrFn when true, else htmlFn.
 * @param {Object} [textConfig] localize.text from resolved config.
 * @return {string} Original text or PHP echo wrapper.
 */
function escapeText(text, textDomain, isAttr = false, textConfig = {}) {
	const trimmedText = text && text.trim();

	if (!textDomain || !trimmedText || trimmedText.startsWith('<?php')) {
		return text;
	}

	const htmlFn = textConfig.htmlFn || 'esc_html_e';
	const attrFn = textConfig.attrFn || 'esc_attr_e';
	const escFunction = isAttr ? attrFn : htmlFn;
	const spaceChar = text.startsWith(' ') ? '&nbsp;' : '';
	const resultText = text.replace(/'/g, "\\'").trim();

	return `${spaceChar}<?php ${escFunction}( '${resultText}', '${textDomain}' ); ?>`;
}

module.exports = { escapeText, unwrapLocalizedPhp };
