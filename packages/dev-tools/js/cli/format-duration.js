/**
 * Compact duration for bootstrap steps and webpack ready lines.
 *
 * @param {number} ms Elapsed milliseconds.
 * @return {string} `80ms` or `1.2s`.
 */
function formatDuration(ms) {
	const elapsed = Math.max(0, Math.round(ms));

	if (elapsed < 1000) {
		return `${elapsed}ms`;
	}

	return `${(elapsed / 1000).toFixed(1)}s`;
}

module.exports = { formatDuration };
