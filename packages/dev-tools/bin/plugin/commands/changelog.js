/**
 * Changelog section helpers used by zip accumulate (not GitHub milestone notes).
 */

/**
 * External dependencies
 */
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const PRODUCT_SECTION_ORDER = [
	'Breaking Changes',
	'New Features',
	'Improvements',
	'Bug Fixes',
	'Security',
	'Accessibility',
	'Performance',
	'Documentation',
	'Code Quality',
	'Tools',
	'Experiments',
	'Automated Tests',
	'Development Notes',
	'Various',
];

/**
 * Map Keep a Changelog headings (and legacy aliases) → product-friendly sections.
 *
 * @type {Record<string,string>}
 */
const KEEP_A_CHANGELOG_TO_PRODUCT = {
	Added: 'New Features',
	Changed: 'Improvements',
	Deprecated: 'Improvements',
	Removed: 'Breaking Changes',
	Fixed: 'Bug Fixes',
	Security: 'Security',
	'New Features': 'New Features',
	Features: 'New Features',
	Enhancements: 'Improvements',
	Improvements: 'Improvements',
	'Bug Fixes': 'Bug Fixes',
	'Breaking Changes': 'Breaking Changes',
	'Automated Tests': 'Automated Tests',
	'Development Notes': 'Development Notes',
};

/**
 * Normalize a ### heading to a product-friendly section name.
 *
 * @param {string} heading Raw heading text without ###.
 * @return {string} Product section name.
 */
function toProductSection(heading) {
	const trimmed = heading.trim();
	return KEEP_A_CHANGELOG_TO_PRODUCT[trimmed] || trimmed;
}

/**
 * Combines repeated sections in a changelog string into product-friendly order.
 *
 * @param {string} changelog the changelog text.
 *
 * @return {string} the combined changelog same sections.
 */
function combineChangelogSections(changelog) {
	const lines = changelog.split('\n');
	/** @type {Record<string, string[]>} */
	const sections = {};
	let currentSection = '';

	lines.forEach((line) => {
		const sectionMatch = line.match(/^### (.+)$/);
		if (sectionMatch) {
			currentSection = toProductSection(sectionMatch[1]);
			if (!sections[currentSection]) {
				sections[currentSection] = [];
			}
			return;
		}
		if (currentSection && line.trim() !== '') {
			sections[currentSection].push(line);
		}
	});

	let combinedChangelog = '';
	const emitted = new Set();

	PRODUCT_SECTION_ORDER.forEach((section) => {
		if (!sections[section]?.length) {
			return;
		}
		emitted.add(section);
		combinedChangelog += `\n### ${section}\n\n`;
		combinedChangelog += sections[section].join('\n');
		combinedChangelog += '\n';
	});

	Object.keys(sections).forEach((section) => {
		if (emitted.has(section) || !sections[section].length) {
			return;
		}
		combinedChangelog += `\n### ${section}\n\n`;
		combinedChangelog += sections[section].join('\n');
		combinedChangelog += '\n';
	});

	return combinedChangelog.trim();
}

async function getCommitCountSinceLastRelease() {
	try {
		const isShallow = await execPromise(
			'git rev-parse --is-shallow-repository'
		)
			.then((result) => result.stdout.trim() === 'true')
			.catch(() => false);

		if (isShallow) {
			await execPromise('git fetch --prune --unshallow');
		} else {
			await execPromise('git fetch --prune');
		}

		const { stdout: latestRelease } = await execPromise(
			'git for-each-ref --sort=-committerdate --format="%(refname:short)" refs/remotes/origin/release/ | head -n 1'
		);

		if (!latestRelease) {
			return 0;
		}

		const { stdout: commitCount } = await execPromise(
			`git rev-list --count ${latestRelease.trim()}..HEAD`
		);

		return parseInt(commitCount.trim(), 10);
	} catch (error) {
		console.error('Error getting commit count:', error);
		return 0;
	}
}

module.exports = {
	combineChangelogSections,
	getCommitCountSinceLastRelease,
	toProductSection,
};
