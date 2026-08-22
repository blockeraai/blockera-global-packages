/**
 * Theme Check WordPress_Spelling_Check flags a quoted `wordpress` token.
 * Font Awesome Brands ships `iconName: 'wordpress'`; hyphenate the id so
 * the allowed-neighbor rule (`-`) accepts it. `wordpress-simple` is unchanged.
 *
 * @param {string} source Module source.
 * @return {string}
 */
module.exports = function fortawesomeWpIconNameLoader(source) {
	return source.replace(
		/iconName\s*[:=]\s*(['"])wordpress\1/g,
		(match, quote) => match.replace(quote + 'wordpress' + quote, quote + 'wordpress-logo' + quote)
	);
};
