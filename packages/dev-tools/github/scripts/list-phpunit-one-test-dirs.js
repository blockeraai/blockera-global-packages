#!/usr/bin/env node
/**
 * List PHPUnit test directories under theme packages (*-one / blockera-one-*).
 * Prints one absolute-or-relative directory path per line (cwd-relative).
 *
 * Usage:
 *   node .github/scripts/list-phpunit-one-test-dirs.js
 */

const fs = require('fs');
const path = require('path');

// Consumer repo root (CI / local cwd), not the toolkit package path.
const ROOT = process.cwd();
const PACKAGES_DIR = path.join(ROOT, 'packages');

const excludedDirs = new Set([
	'node_modules',
	'vendor',
	'dist',
	'Fixtures',
	'fixtures',
]);

/**
 * @param {string} packageName
 */
function isOnePackage(packageName) {
	return (
		packageName.endsWith('-one') || packageName.startsWith('blockera-one-')
	);
}

/**
 * @param {string} dir
 * @param {string[]} out
 */
function collectTestDirs(dir, out) {
	if (!fs.existsSync(dir)) {
		return;
	}

	const entries = fs.readdirSync(dir, { withFileTypes: true });

	for (const entry of entries) {
		if (!entry.isDirectory() || excludedDirs.has(entry.name)) {
			continue;
		}

		const fullPath = path.join(dir, entry.name);

		if (entry.name === 'tests' || entry.name === 'Tests') {
			out.push(path.relative(ROOT, fullPath).split(path.sep).join('/'));
			continue;
		}

		collectTestDirs(fullPath, out);
	}
}

function main() {
	const dirs = [];

	if (!fs.existsSync(PACKAGES_DIR)) {
		process.stdout.write('');
		return;
	}

	for (const entry of fs.readdirSync(PACKAGES_DIR, { withFileTypes: true })) {
		if (!entry.isDirectory() || !isOnePackage(entry.name)) {
			continue;
		}

		collectTestDirs(path.join(PACKAGES_DIR, entry.name), dirs);
	}

	dirs.sort();
	process.stdout.write(dirs.join('\n') + (dirs.length ? '\n' : ''));
}

main();
