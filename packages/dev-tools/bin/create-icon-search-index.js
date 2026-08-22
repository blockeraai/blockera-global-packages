#!/usr/bin/env node
/**
 * Build Fuse.js icon search indexes.
 *
 * Usage:
 *   node create-icon-search-index.js           # both indexes
 *   node create-icon-search-index.js --index 1
 *   node create-icon-search-index.js --index 2
 */
const { buildIconSearchIndex } = require('./create-icon-search-index-lib');

const INDEXES = {
	1: {
		librariesFileName: 'search-libraries.json',
		destinationFileName: 'search-index.json',
	},
	2: {
		librariesFileName: 'search-libraries-2.json',
		destinationFileName: 'search-index-2.json',
	},
};

function parseIndexes(argv) {
	const selected = [];

	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === '--index') {
			selected.push(String(argv[++i]));
		} else if (arg.startsWith('--index=')) {
			selected.push(arg.slice('--index='.length));
		} else if (arg === '--help' || arg === '-h') {
			process.stdout.write(`Usage:
  node create-icon-search-index.js
  node create-icon-search-index.js --index 1
  node create-icon-search-index.js --index 2
`);
			process.exit(0);
		} else {
			throw new Error(`Unknown argument: ${arg}`);
		}
	}

	return selected.length ? selected : Object.keys(INDEXES);
}

try {
	for (const id of parseIndexes(process.argv.slice(2))) {
		const config = INDEXES[id];
		if (!config) {
			throw new Error(`Unknown --index ${id}. Expected 1 or 2.`);
		}
		buildIconSearchIndex(config);
	}
} catch (error) {
	console.error(error.message || error);
	process.exit(1);
}
