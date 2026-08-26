/**
 * Package CHANGELOG.md helpers: parse Keep a Changelog files, fold Unreleased
 * into dated or version headings, and diff version sections between git refs.
 */

/**
 * External dependencies
 */
const fs = require('fs');
const path = require('path');

/**
 * @typedef {Object} ChangelogVersionSection
 * @property {string} key     Normalized version id (__unreleased__ for Unreleased)
 * @property {string} heading Raw ## line
 * @property {string} body    Content under the heading
 */

/**
 * @param {string} raw Heading text after ##
 * @return {string} Normalized version key
 */
function normalizeVersionKey(raw) {
	const trimmed = raw.trim();
	if (/^unreleased$/i.test(trimmed) || /^\[unreleased\]$/i.test(trimmed)) {
		return '__unreleased__';
	}
	const bracket = trimmed.match(/^\[([^\]]+)\]/);
	if (bracket) {
		return bracket[1].trim();
	}
	const firstToken = trimmed.split(/\s+/)[0] || trimmed;
	return firstToken.replace(/[()]/g, '');
}

/**
 * @param {string} body
 * @return {boolean}
 */
function unreleasedBodyHasEntries(body) {
	return String(body || '')
		.split('\n')
		.some((line) => /^\s*[-*]\s+\S/.test(line));
}

/**
 * @param {string} content
 * @return {{ preamble: string, sections: ChangelogVersionSection[] }}
 */
function parseChangelogDocument(content) {
	const source = String(content || '');
	if (!source.trim()) {
		return { preamble: '', sections: [] };
	}

	const lines = source.split('\n');
	const preambleLines = [];
	let index = 0;
	while (index < lines.length && !/^##\s+/.test(lines[index])) {
		preambleLines.push(lines[index]);
		index += 1;
	}

	/** @type {ChangelogVersionSection[]} */
	const sections = [];
	/** @type {ChangelogVersionSection|null} */
	let current = null;

	const pushCurrent = () => {
		if (!current) {
			return;
		}
		current.body = current.body.replace(/^\n+/, '').replace(/\n+$/, '');
		sections.push(current);
		current = null;
	};

	for (; index < lines.length; index += 1) {
		const line = lines[index];
		const heading = line.match(/^##\s+(.*)$/);
		if (heading) {
			pushCurrent();
			current = {
				key: normalizeVersionKey(heading[1]),
				heading: line,
				body: '',
			};
			continue;
		}
		if (current) {
			current.body += (current.body ? '\n' : '') + line;
		}
	}
	pushCurrent();

	return {
		preamble: preambleLines.join('\n').replace(/\n+$/, ''),
		sections,
	};
}

/**
 * Split a changelog file into version sections (including Unreleased).
 *
 * @param {string} content
 * @return {ChangelogVersionSection[]}
 */
function parseVersionSections(content) {
	return parseChangelogDocument(content).sections;
}

/**
 * @param {{ preamble?: string, sections: ChangelogVersionSection[] }} document
 * @return {string}
 */
function serializeChangelogDocument(document) {
	const parts = [];
	const preamble = (document.preamble || '').replace(/\n+$/, '');
	if (preamble) {
		parts.push(preamble);
	}

	const sections = [...(document.sections || [])];
	const unreleasedIndex = sections.findIndex(
		(section) => section.key === '__unreleased__'
	);
	if (unreleasedIndex === -1) {
		sections.unshift({
			key: '__unreleased__',
			heading: '## Unreleased',
			body: '',
		});
	} else if (unreleasedIndex > 0) {
		const [unreleased] = sections.splice(unreleasedIndex, 1);
		sections.unshift(unreleased);
	}

	for (const section of sections) {
		parts.push(section.heading);
		if (section.body) {
			parts.push(section.body);
		}
	}

	return parts.join('\n\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

/**
 * @param {string[]} existingKeys
 * @param {string} date
 * @param {string} [suffix]
 * @return {string}
 */
function uniqueCutKey(existingKeys, date, suffix) {
	const used = new Set(existingKeys);
	if (!used.has(date)) {
		return date;
	}
	if (suffix) {
		const withSuffix = `${date}+${suffix}`;
		if (!used.has(withSuffix)) {
			return withSuffix;
		}
	}
	let n = 2;
	while (used.has(`${date}.${n}`)) {
		n += 1;
	}
	return `${date}.${n}`;
}

/**
 * Move Unreleased bullets into a dated cut (GP) or version heading (consumer).
 *
 * @param {string} content
 * @param {{ date?: string, suffix?: string, heading?: string }} [options]
 * @return {{ content: string, folded: boolean, key: string }}
 */
function foldUnreleasedContent(content, options = {}) {
	const document = parseChangelogDocument(content);
	const unreleased = document.sections.find(
		(section) => section.key === '__unreleased__'
	);
	if (!unreleased || !unreleasedBodyHasEntries(unreleased.body)) {
		return { content: String(content || ''), folded: false, key: '' };
	}

	const body = unreleased.body.trim();
	unreleased.body = '';
	unreleased.heading = '## Unreleased';

	if (options.heading) {
		const heading = options.heading;
		const key = normalizeVersionKey(heading.replace(/^##\s+/, ''));
		const existing = document.sections.find(
			(section) => section.key === key && section.key !== '__unreleased__'
		);
		if (existing) {
			existing.body = [existing.body.trim(), body].filter(Boolean).join('\n\n');
		} else {
			const unreleasedIndex = document.sections.findIndex(
				(section) => section.key === '__unreleased__'
			);
			document.sections.splice(unreleasedIndex + 1, 0, {
				key,
				heading,
				body,
			});
		}
		return {
			content: serializeChangelogDocument(document),
			folded: true,
			key,
		};
	}

	const date = options.date || new Date().toISOString().split('T')[0];
	const existingKeys = document.sections
		.filter((section) => section.key !== '__unreleased__')
		.map((section) => section.key);
	const key = uniqueCutKey(existingKeys, date, options.suffix);
	const unreleasedIndex = document.sections.findIndex(
		(section) => section.key === '__unreleased__'
	);
	document.sections.splice(unreleasedIndex + 1, 0, {
		key,
		heading: `## [${key}]`,
		body,
	});

	return {
		content: serializeChangelogDocument(document),
		folded: true,
		key,
	};
}

/**
 * @param {string} filePath
 * @return {boolean}
 */
function isPackageChangelogMdPath(filePath) {
	const normalized = String(filePath || '').replace(/\\/g, '/');
	return /(^|\/)packages\/.+\/CHANGELOG\.md$/.test(normalized);
}

/**
 * Walk package CHANGELOG.md files without glob dependencies (bump job has no npm).
 *
 * @param {string} root
 * @param {{ skipGlobalPackages?: boolean }} [options]
 * @return {string[]}
 */
function collectPackageChangelogPaths(root, options = {}) {
	const packagesDir = path.join(root, 'packages');
	if (!fs.existsSync(packagesDir)) {
		return [];
	}

	const skipGlobalPackages = options.skipGlobalPackages !== false;
	/** @type {string[]} */
	const found = [];

	const visit = (dir, depth) => {
		let entries;
		try {
			entries = fs.readdirSync(dir, { withFileTypes: true });
		} catch (error) {
			return;
		}
		for (const entry of entries) {
			if (entry.name === 'node_modules' || entry.name === '.git') {
				continue;
			}
			const full = path.join(dir, entry.name);
			if (entry.isDirectory()) {
				if (
					skipGlobalPackages &&
					entry.name === 'global-packages' &&
					path.basename(dir) === 'packages'
				) {
					continue;
				}
				if (depth < 4) {
					visit(full, depth + 1);
				}
				continue;
			}
			if (entry.name === 'CHANGELOG.md') {
				const relative = path.relative(root, full).replace(/\\/g, '/');
				if (isPackageChangelogMdPath(relative)) {
					found.push(full);
				}
			}
		}
	};

	visit(packagesDir, 0);
	return found.sort();
}

/**
 * @param {string} cwd
 * @param {{ date?: string, suffix?: string, heading?: string, skipGlobalPackages?: boolean }} [options]
 * @return {{ changed: boolean, files: string[], keys: string[] }}
 */
function foldUnreleasedTree(cwd, options = {}) {
	const files = collectPackageChangelogPaths(cwd, options);
	const changedFiles = [];
	const keys = [];

	for (const filePath of files) {
		const previous = fs.readFileSync(filePath, 'utf8');
		const folded = foldUnreleasedContent(previous, options);
		if (!folded.folded || folded.content === previous) {
			continue;
		}
		fs.writeFileSync(filePath, folded.content);
		changedFiles.push(filePath);
		keys.push(folded.key);
	}

	return {
		changed: changedFiles.length > 0,
		files: changedFiles,
		keys,
	};
}

/**
 * @param {string} content
 * @param {string} [fileLabel]
 */
function assertUnreleasedEmpty(content, fileLabel = 'CHANGELOG.md') {
	const unreleased = parseVersionSections(content).find(
		(section) => section.key === '__unreleased__'
	);
	if (unreleased && unreleasedBodyHasEntries(unreleased.body)) {
		throw new Error(
			`${fileLabel} still has ## Unreleased entries. Fold Unreleased on the global-packages bump (dated cut) before this product zip.`
		);
	}
}

/**
 * @param {string} cwd
 * @param {{ skipGlobalPackages?: boolean }} [options]
 */
function assertTreeUnreleasedEmpty(cwd, options = {}) {
	const files = collectPackageChangelogPaths(cwd, options);
	for (const filePath of files) {
		assertUnreleasedEmpty(
			fs.readFileSync(filePath, 'utf8'),
			path.relative(cwd, filePath)
		);
	}
}

/**
 * Return ### bodies for version sections that are new or whose body changed.
 * Includes Unreleased so consumer package inboxes still accumulate until zip fold.
 *
 * @param {string} oldContent
 * @param {string} newContent
 * @return {string}
 */
function extractChangedSections(oldContent, newContent) {
	const oldMap = new Map(
		parseVersionSections(oldContent).map((section) => [
			section.key,
			section.body.trim(),
		])
	);
	const parts = [];

	for (const section of parseVersionSections(newContent)) {
		const previous = oldMap.get(section.key);
		if (previous === undefined || previous !== section.body.trim()) {
			let body = section.body.trim();
			if (!body) {
				continue;
			}
			if (section.key === '__unreleased__') {
				const oldBody = previous || '';
				body = diffUnreleasedBody(oldBody, body);
				if (!body) {
					continue;
				}
			}
			parts.push(ensureSectionHeadings(body));
		}
	}

	return parts.join('\n\n');
}

/**
 * @param {string} oldBody
 * @param {string} newBody
 * @return {string}
 */
function diffUnreleasedBody(oldBody, newBody) {
	const oldLines = new Set(
		String(oldBody)
			.split('\n')
			.map((line) => line.trim())
			.filter(Boolean)
	);
	const kept = String(newBody)
		.split('\n')
		.filter((line) => {
			const trimmed = line.trim();
			if (!trimmed) {
				return true;
			}
			if (/^###\s+/.test(trimmed)) {
				return true;
			}
			return !oldLines.has(trimmed);
		});

	return kept.join('\n').replace(/^\n+/, '').replace(/\n+$/, '');
}

/**
 * @param {string} body
 * @return {string}
 */
function ensureSectionHeadings(body) {
	const trimmed = String(body || '').trim();
	if (!trimmed) {
		return '';
	}
	if (/^###\s+/m.test(trimmed)) {
		return trimmed;
	}
	if (/(^|\n)\s*[-*]\s+\S/.test(trimmed)) {
		return `### Improvements\n${trimmed}`;
	}
	return trimmed;
}

/**
 * @param {string} existing
 * @param {string} version
 * @param {string} publishDate
 * @param {string} mergedBody
 * @return {string}
 */
function prependRootChangelog(existing, version, publishDate, mergedBody) {
	const heading = `## [${version}] - ${publishDate}`;
	const remainder = String(existing || '')
		.split(/(?=^## )/m)
		.filter((part) => {
			const keyLine = part.match(/^##\s+(.*)$/m);
			if (!keyLine) {
				return part.trim() !== '';
			}
			const key = normalizeVersionKey(keyLine[1]);
			return key !== String(version) && key !== '__unreleased__';
		})
		.join('')
		.trim();
	const body = mergedBody ? `${heading}\n\n${mergedBody}` : heading;
	return (remainder ? `${body}\n\n${remainder}` : body).trim() + '\n';
}

/**
 * @param {string} markdown
 * @return {Set<string>}
 */
function extractBulletKeys(markdown) {
	/** @type {Set<string>} */
	const keys = new Set();
	for (const line of String(markdown || '').split('\n')) {
		const match = line.match(/^\s*[-*]\s+(.+)$/);
		if (match) {
			keys.add(match[1].trim().replace(/[.]+$/, '').toLowerCase());
		}
	}
	return keys;
}

/**
 * Drop bullets already present in a previous product changelog.
 *
 * @param {string} markdown
 * @param {string} existingMarkdown
 * @return {string}
 */
function dedupeChangelogMarkdown(markdown, existingMarkdown) {
	const seen = extractBulletKeys(existingMarkdown);
	const emitted = new Set();
	const lines = String(markdown || '').split('\n');
	const kept = [];

	for (const line of lines) {
		const match = line.match(/^(\s*[-*]\s+)(.+)$/);
		if (!match) {
			kept.push(line);
			continue;
		}
		const key = match[2].trim().replace(/[.]+$/, '').toLowerCase();
		if (seen.has(key) || emitted.has(key)) {
			continue;
		}
		emitted.add(key);
		kept.push(line);
	}

	return kept
		.join('\n')
		.replace(/\n{3,}/g, '\n\n')
		.replace(/(^|\n)### [^\n]+\n+(?=\n*### |\s*$)/g, '$1')
		.trim();
}

module.exports = {
	normalizeVersionKey,
	unreleasedBodyHasEntries,
	parseChangelogDocument,
	parseVersionSections,
	serializeChangelogDocument,
	uniqueCutKey,
	foldUnreleasedContent,
	isPackageChangelogMdPath,
	collectPackageChangelogPaths,
	foldUnreleasedTree,
	assertUnreleasedEmpty,
	assertTreeUnreleasedEmpty,
	extractChangedSections,
	ensureSectionHeadings,
	prependRootChangelog,
	extractBulletKeys,
	dedupeChangelogMarkdown,
};
