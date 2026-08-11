const fs = require('fs');
const path = require('path');

const excludedDirs = ['node_modules', 'vendor', 'dist'];

// Core Blockera visual suite synced into the theme; not a blockera-one package test.
// Theme-specific Playwright specs under tests/ are still discovered.
const excludedTestFiles = new Set([
	path.normalize('tests/visual.block-screenshots.ply.js'),
]);

const getFiles = (dir, pattern) => {
	const files = fs.readdirSync(dir);
	let allFiles = [];

	files.forEach((file) => {
		const filePath = path.join(dir, file);
		const stats = fs.statSync(filePath);

		if (stats.isDirectory()) {
			// Skip excluded directories
			if (!excludedDirs.includes(file)) {
				allFiles = [...allFiles, ...getFiles(filePath, pattern)];
			}
		} else if (pattern.test(filePath)) {
			allFiles.push(filePath);
		}
	});

	return allFiles;
};

const main = () => {
	const categories = new Set();

	// Same package convention as blockera-pro (-pro): only theme packages (*-one / blockera-one-*).
	const categorizedFiles = getFiles(
		'packages',
		/\/(blockera-one-.*|.*-one)\/.*\.(.*?)\.ply\.js/
	);
	categorizedFiles.forEach((file) => {
		const match = file.match(/\.(.*?)\.ply\.js/);
		if (match && match[1]) {
			categories.add(match[1]);
		}
	});

	const generalFiles = getFiles(
		'packages',
		/\/(blockera-one-.*|.*-one)\/.*\/[\w-]+\.ply\.js/
	);
	if (generalFiles.length) {
		categories.add('general-1');
	}

	// Root tests/ may hold theme-specific Playwright suites (include them).
	const baseCategorizedFiles = getFiles('tests', /\.(.*?)\.ply\.js/).filter(
		(file) => !excludedTestFiles.has(path.normalize(file))
	);
	baseCategorizedFiles.forEach((file) => {
		const match = file.match(/\.(.*?)\.ply\.js/);
		if (match && match[1]) {
			categories.add(match[1]);
		}
	});

	const generalBaseFiles = getFiles('tests', /\/[\w-]+\.ply\.js/).filter(
		(file) => !excludedTestFiles.has(path.normalize(file))
	);
	if (generalBaseFiles.length) {
		categories.add('general-1');
	}

	// sort the categories
	let sortedCategories = Array.from(categories).sort();

	// Find all general-related categories
	const generalCategories = sortedCategories.filter(
		(category) => category === 'general' || category.startsWith('general-')
	);

	// Sort general categories to ensure they're in order (general, general-1, general-2, etc.)
	const sortedGeneralCategories = generalCategories.sort();

	if (sortedGeneralCategories.length > 0) {
		// Remove all general categories from the original array and add the sorted ones at the beginning
		sortedCategories = [
			...sortedGeneralCategories,
			...sortedCategories.filter(
				(category) => !category.startsWith('general')
			),
		];
	}

	console.log(JSON.stringify(sortedCategories));
};

main();
