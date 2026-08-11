const fs = require('fs');
const path = require('path');

const excludedDirs = ['node_modules', 'vendor', 'dist'];

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
		/\/(blockera-one-.*|.*-one)\/.*\.(.*?)\.visual\.cy\.js/
	);
	categorizedFiles.forEach((file) => {
		const match = file.match(/\.(.*?)\.visual\.cy\.js/);
		if (match && match[1]) {
			categories.add(match[1]);
		}
	});

	const generalFiles = getFiles(
		'packages',
		/\/(blockera-one-.*|.*-one)\/.*\/[\w-]+\.visual\.cy\.js/
	);
	if (generalFiles.length) {
		categories.add('general');
	}

	// Root tests/ may hold theme-specific visual suites.
	const baseFiles = getFiles('tests', /\/[\w-]+\.visual\.cy\.js/);
	if (baseFiles.length) {
		categories.add('general');
	}

	const baseCategorizedFiles = getFiles('tests', /\.(.*?)\.visual\.cy\.js/);
	baseCategorizedFiles.forEach((file) => {
		const match = file.match(/\.(.*?)\.visual\.cy\.js/);
		if (match && match[1]) {
			categories.add(match[1]);
		}
	});

	// sort the categories
	let sortedCategories = Array.from(categories).sort();

	if (sortedCategories.includes('general')) {
		sortedCategories = [
			'general',
			...sortedCategories.filter((category) => category !== 'general'),
		];
	}

	console.log(JSON.stringify(sortedCategories));
};

main();
