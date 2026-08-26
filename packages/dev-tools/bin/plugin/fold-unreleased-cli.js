#!/usr/bin/env node
/**
 * Fold ## Unreleased in package CHANGELOG.md files (GP bump job; no plugin config).
 *
 * Usage:
 *   node fold-unreleased-cli.js [--cwd <dir>] [--date YYYY-MM-DD] [--suffix <sha>]
 *
 * Machine lines: changed=true|false
 */
const fs = require('fs');
const path = require('path');
const { foldUnreleasedTree } = require('./commands/changelog-md');

function argValue(flag) {
	const index = process.argv.indexOf(flag);
	if (index === -1 || !process.argv[index + 1]) {
		return '';
	}
	return process.argv[index + 1];
}

const cwd = path.resolve(argValue('--cwd') || process.cwd());
const date = argValue('--date') || new Date().toISOString().split('T')[0];
const suffix = argValue('--suffix');
const nestedGp = fs.existsSync(path.join(cwd, 'packages', 'global-packages'));

const result = foldUnreleasedTree(cwd, {
	date,
	suffix,
	skipGlobalPackages: nestedGp,
});

console.log(`changed=${result.changed ? 'true' : 'false'}`);
console.log(`files=${result.files.length}`);
if (result.keys.length) {
	console.log(`keys=${result.keys.join(',')}`);
}
