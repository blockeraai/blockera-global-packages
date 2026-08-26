#!/usr/bin/env node
/**
 * List PHPUnit `tests` / `Tests` directories under selected packages.
 * Prints one cwd-relative directory path per line.
 *
 * Usage:
 *   node list-phpunit-package-test-dirs.js
 *
 * Env:
 *   BLOCKERA_PHPUNIT_SCAN_ROOT        default: packages
 *   BLOCKERA_PHPUNIT_PACKAGE_SUFFIX   e.g. -one / -pro (empty = all packages)
 *   BLOCKERA_PHPUNIT_PACKAGE_PREFIX   e.g. blockera-one-
 *   BLOCKERA_PHPUNIT_PACKAGE_NAMES    extra comma-separated package names
 */
const fs = require('fs');
const path = require('path');
const { isMatchingPackage } = require('./lib/package-match');

const ROOT = process.cwd();
const SCAN_ROOT = process.env.BLOCKERA_PHPUNIT_SCAN_ROOT || 'packages';
const PACKAGES_DIR = path.isAbsolute(SCAN_ROOT)
	? SCAN_ROOT
	: path.join(ROOT, SCAN_ROOT);

const excludedDirs = new Set([
	'node_modules',
	'vendor',
	'dist',
	'Fixtures',
	'fixtures',
]);

function splitList(raw) {
	if (!raw) {
		return [];
	}
	return String(raw)
		.split(',')
		.map((item) => item.trim())
		.filter(Boolean);
}

function isTargetPackage(packageName) {
	const suffix = process.env.BLOCKERA_PHPUNIT_PACKAGE_SUFFIX;
	const prefix = process.env.BLOCKERA_PHPUNIT_PACKAGE_PREFIX;
	const extraNames = splitList(process.env.BLOCKERA_PHPUNIT_PACKAGE_NAMES);

	if (!suffix && !prefix && extraNames.length === 0) {
		return true;
	}

	return isMatchingPackage(packageName, { suffix, prefix, extraNames });
}

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
		if (!entry.isDirectory() || !isTargetPackage(entry.name)) {
			continue;
		}

		collectTestDirs(path.join(PACKAGES_DIR, entry.name), dirs);
	}

	dirs.sort();
	process.stdout.write(dirs.join('\n') + (dirs.length ? '\n' : ''));
}

main();
