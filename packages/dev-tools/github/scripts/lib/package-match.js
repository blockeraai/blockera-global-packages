/**
 * Match package folder names from consumer-supplied suffix / prefix / extras.
 *
 * Shared scripts do not know product styles; callers pass the match rules.
 *
 * @param {string} name Package directory name.
 * @param {Object} match
 * @param {string} [match.suffix]
 * @param {string} [match.prefix]
 * @param {string[]} [match.extraNames]
 * @return {boolean} Whether the package name matches the supplied rules.
 */
function isMatchingPackage(name, match = {}) {
	if (!match || (!match.suffix && !match.prefix && !match.extraNames)) {
		return true;
	}

	if (match.suffix && name.endsWith(match.suffix)) {
		return true;
	}

	if (match.prefix && name.startsWith(match.prefix)) {
		return true;
	}

	if (Array.isArray(match.extraNames) && match.extraNames.includes(name)) {
		return true;
	}

	return false;
}

module.exports = {
	isMatchingPackage,
};
