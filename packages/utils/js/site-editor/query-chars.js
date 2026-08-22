// @flow

/**
 * Keep Site Editor query values readable: Gutenberg `buildQueryString`
 * percent-encodes `/` and `:`. RFC 3986 allows both in the query.
 *
 * Rewrite the search string only — never the pathname.
 */

/**
 * Decode `%2F` → `/` and `%3A` → `:` in the query (and hash-less search-only
 * URLs). Leaves `%`, `&`, `=`, and `#` encoding intact.
 *
 * @param {string} url Absolute or relative URL (or search-only `?…`).
 * @return {string} Same URL with literal slashes and colons in the query.
 */
export function withLiteralQueryChars(url: string): string {
	if (typeof url !== 'string' || url.indexOf('%') === -1) {
		return url;
	}

	const hashIndex = url.indexOf('#');
	const beforeHash = hashIndex === -1 ? url : url.slice(0, hashIndex);
	const hash = hashIndex === -1 ? '' : url.slice(hashIndex);
	const queryIndex = beforeHash.indexOf('?');

	if (queryIndex === -1) {
		return url;
	}

	const path = beforeHash.slice(0, queryIndex);
	const search = beforeHash
		.slice(queryIndex)
		.replace(/%2F/gi, '/')
		.replace(/%3A/gi, ':');

	return path + search + hash;
}
