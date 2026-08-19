/**
 * Shared truncation helper for "sticky" PR comments.
 *
 * It:
 * - finds a marker block using a regex
 * - truncates the "core" part to fit `maxChars` with a notice and marker re-appended
 * - optionally preserves an H1/title prefix when the title is provided
 */

function splitMarker( body, markerRegex, defaultMarker ) {
	const text = body || '';
	const match = text.match( markerRegex );
	if ( ! match || match.index === undefined ) {
		return { core: text, marker: defaultMarker };
	}

	return {
		core: text.slice( 0, match.index ),
		marker: match[0].startsWith( '\n' ) ? match[0] : `\n\n${match[0]}`,
	};
}

function truncateCommentBody( {
	body,
	title,
	maxChars,
	markerRegex,
	defaultMarker,
	notice,
} ) {
	const { core, marker } = splitMarker( body, markerRegex, defaultMarker );

	let next = core;
	if ( title && ! next.startsWith( title ) ) {
		next = `${title}\n\n${next}`;
	}

	if ( next.length + marker.length <= maxChars ) {
		return `${next}${marker}`;
	}

	const budget = Math.max( 0, maxChars - notice.length - marker.length );
	let cut = next.slice( 0, budget );
	const lastNewline = cut.lastIndexOf( '\n' );

	// When a title is present, avoid chopping too close to the title text.
	const threshold = title ? title.length + 2 : 0;
	if ( lastNewline > threshold ) {
		cut = cut.slice( 0, lastNewline );
	}

	return `${cut}${notice}${marker}`;
}

module.exports = { splitMarker, truncateCommentBody };

