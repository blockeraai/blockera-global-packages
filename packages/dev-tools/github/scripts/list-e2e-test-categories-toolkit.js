/**
 * Site-toolkit Cypress E2E category discovery (`*.toolkit.e2e.cy.js`).
 * Only scans packages/site-toolkit — shared global-packages specs belong to other consumers.
 */
const fs = require('fs');
const path = require('path');

const excludedDirs = ['node_modules', 'vendor', 'dist'];
const SCAN_ROOT = 'packages/site-toolkit';

const getFiles = (dir, pattern) => {
	if (!fs.existsSync(dir)) {
		return [];
	}

	const files = fs.readdirSync(dir);
	let allFiles = [];

	files.forEach((file) => {
		const filePath = path.join(dir, file);
		const stats = fs.statSync(filePath);

		if (stats.isDirectory()) {
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

	const categorizedFiles = getFiles(
		SCAN_ROOT,
		/\.toolkit(\.[a-z0-9-]+)?\.e2e\.cy\.js$/i
	);

	categorizedFiles.forEach((file) => {
		const match = file.match(/\.([^.]+)\.e2e\.cy\.js$/);
		if (match && match[1]) {
			categories.add(match[1]);
		}
	});

	const sortedCategories = Array.from(categories).sort();
	console.log(JSON.stringify(sortedCategories));
};

main();
