const fs = require('fs');
const path = require('path');
const { fab } = require('@fortawesome/free-brands-svg-icons');

/**
 * @param {string} str CamelCase export name.
 * @return {string} kebab-case id.
 */
function getIconKebabId(str) {
	return str.replace(/[A-Z0-9]/g, (match, index) => {
		if (index === 0) {
			return match.toLowerCase();
		}
		if (/[0-9]/.test(match)) {
			return `-${match}`;
		}
		return `-${match.toLowerCase()}`;
	});
}

/**
 * @param {string} key kebab-case FA export id.
 * @return {string}
 */
function normalizeFaBrandsKey(key) {
	switch (key) {
		case 'fa-5-0-0px':
			return 'fa-500px';
		case 'fa-1-1ty':
			return 'fa-11ty';
		case 'fa-4-2-group':
			return 'fa-42-group';
		case 'fa-css-3':
			return 'fa-css3';
		case 'fa-css-3-alt':
			return 'fa-css3-alt';
		case 'fa-html-5':
			return 'fa-html5';
		case 'fa-draft-2digital':
			return 'fa-draft2digital';
		case 'fa-ns-8':
			return 'fa-ns8';
		case 'fa-page-4':
			return 'fa-page4';
		case 'fa-typo-3':
			return 'fa-typo3';
		case 'fa-w-3c':
			return 'fa-w3c';
		default:
			return key;
	}
}

/**
 * Theme Check requires the exact `WordPress` token in titles.
 *
 * @param {string} iconName kebab id, optionally `fa-` prefixed.
 * @return {string}
 */
function faIconNameToTitle(iconName) {
	return iconName
		.replace(/^fa-/, '')
		.split('-')
		.map((part) => {
			if (
				9 === part.length &&
				part.startsWith('word') &&
				part.endsWith('press')
			) {
				return 'WordPress';
			}
			return part.charAt(0).toUpperCase() + part.slice(1);
		})
		.join(' ');
}

const processIcons = (icons, prefix) => {
	return Object.keys(icons)
		.filter(
			(key) =>
				key !== 'prefix' &&
				key !== 'fas' &&
				key !== 'fab' &&
				key !== 'far'
		)
		.map((key) => {
			const iconName = normalizeFaBrandsKey(getIconKebabId(key));

			return {
				iconName,
				title: faIconNameToTitle(iconName),
				library: 'fabrands',
				prefix,
				tags: [],
			};
		});
};

const searchData = processIcons(fab, 'fab');

const outputPath = path.join(__dirname, '..', 'search-data.json');
fs.writeFileSync(outputPath, JSON.stringify(searchData, null, 2));

console.log(`Generated search-data.json with ${searchData.length} icons`);
