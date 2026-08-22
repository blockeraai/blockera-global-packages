/**
 * Shared helpers for Fuse.js icon search-index generation.
 * Runs from consumer or global-packages root via `process.cwd()`.
 */

/**
 * External dependencies
 */
const fs = require('fs');
const path = require('path');
const Fuse = require('fuse.js');

/**
 * @param {string} [root] Project root (defaults to cwd).
 * @return {string} Absolute path to the icons package js directory.
 */
function resolveIconsJsDir(root = process.cwd()) {
	const candidates = [
		// Consumer checkouts (plugin/theme with sparse submodule).
		path.join(root, 'packages/global-packages/packages/icons/js'),
		// global-packages monorepo root.
		path.join(root, 'packages/icons/js'),
	];

	for (const candidate of candidates) {
		if (fs.existsSync(candidate)) {
			return candidate;
		}
	}

	throw new Error(
		`Cannot find icons/js under ${root} (tried packages/global-packages/packages/icons/js and packages/icons/js)`
	);
}

/**
 * Build a Fuse search index from configured icon libraries.
 *
 * @param {Object} options
 * @param {string} options.librariesFileName e.g. search-libraries.json
 * @param {string} options.destinationFileName e.g. search-index.json
 */
function buildIconSearchIndex({ librariesFileName, destinationFileName }) {
	const root = process.cwd();
	const iconsJsDir = resolveIconsJsDir(root);

	const searchLibrariesPath = path.join(iconsJsDir, librariesFileName);
	let searchLibraries = [];
	try {
		searchLibraries = require(searchLibrariesPath);
	} catch (err) {
		console.error(
			`Failed to load search libraries from ${searchLibrariesPath}:`,
			err
		);
		process.exit(1);
	}

	const searchConfigPath = path.join(iconsJsDir, 'search-config.json');
	let searchConfig = {};
	try {
		searchConfig = require(searchConfigPath);
	} catch (err) {
		console.error(
			`Failed to load search config from ${searchConfigPath}:`,
			err
		);
		process.exit(1);
	}

	const jsonFiles = searchLibraries.map((library) =>
		path.join(iconsJsDir, `library-${library}`, 'search-data.json')
	);

	const icons = [];

	for (const absPath of jsonFiles) {
		let data;
		try {
			data = require(absPath);
		} catch (err) {
			console.error(`Failed to require ${absPath}:`, err);
			continue;
		}
		if (Array.isArray(data)) {
			icons.push(...data);
		} else if (data && typeof data === 'object') {
			icons.push(data);
		}
	}

	console.log('Library Search Data Files:', jsonFiles);
	console.log('Total Icons:', icons.length);

	const keys = searchConfig.keys || [
		{
			name: 'title',
			weight: 0.5,
		},
		{
			name: 'tags',
			weight: 0.2,
		},
	];

	const index = Fuse.createIndex(keys, icons);
	const destinationFile = path.join(iconsJsDir, destinationFileName);

	try {
		fs.writeFileSync(
			destinationFile,
			JSON.stringify(index.toJSON(), null, 2)
		);
		console.log(`Search index written to ${destinationFile}`);
	} catch (err) {
		console.error(
			`Failed to write search index to ${destinationFile}:`,
			err
		);
		process.exit(1);
	}
}

module.exports = {
	buildIconSearchIndex,
	resolveIconsJsDir,
};
