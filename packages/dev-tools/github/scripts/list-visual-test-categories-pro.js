// Pro Cypress visual category discovery (**-pro packages).
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

	const categorizedFiles = getFiles(
		'packages',
		/\/(blockera-pro-.*|.*-pro)\/.*\.(.*?)\.visual\.cy\.js/
	);
	categorizedFiles.forEach((file) => {
		const match = file.match(/\.(.*?)\.visual\.cy\.js/);
		if (match && match[1]) {
			categories.add(match[1]);
		}
	});

	const generalFiles = getFiles(
		'packages',
		/\/(.*-pro*|validator|guard|console)\/.*\/[\w-]+\.visual\.cy\.js/
	);
	if (generalFiles.length) {
		categories.add('general');
	}

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
