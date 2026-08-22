/**
 * Recursively list files under a directory, skipping heavy vendor trees.
 *
 * @param {string} dir
 * @param {Object} [options]
 * @param {string[]} [options.excludedDirs]
 * @param {(filePath: string, fileName: string) => boolean} [options.fileFilter]
 * @return {string[]}
 */
const fs = require('fs');
const path = require('path');

const DEFAULT_EXCLUDED_DIRS = ['node_modules', 'vendor', 'dist'];

function walkFiles(dir, options = {}) {
	const excludedDirs = options.excludedDirs || DEFAULT_EXCLUDED_DIRS;
	const fileFilter = options.fileFilter || (() => true);

	if (!fs.existsSync(dir)) {
		return [];
	}

	const results = [];
	const entries = fs.readdirSync(dir, { withFileTypes: true });

	for (const entry of entries) {
		const filePath = path.join(dir, entry.name);

		if (entry.isDirectory()) {
			if (!excludedDirs.includes(entry.name)) {
				results.push(...walkFiles(filePath, options));
			}
			continue;
		}

		if (fileFilter(filePath, entry.name)) {
			results.push(filePath);
		}
	}

	return results;
}

module.exports = {
	DEFAULT_EXCLUDED_DIRS,
	walkFiles,
};
