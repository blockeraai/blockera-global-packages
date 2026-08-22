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

module.exports = { escapeText };
