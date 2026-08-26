/**
 * Fold package CHANGELOG.md files on the global-packages master branch.
 * Not used by consumer product zip (`update-packages-changelog`).
 *
 * CLI (update-master-package-changelogs):
 *   --semver major|minor|patch   Minimum bump for packages that change (default: major)
 *   --from <sha>                 Range start (default: previous first-parent merge)
 *   --to <sha>                   Range end (default: HEAD merge)
 *
 * Push of a non-merge commit is skipped (changelog follow-up must not re-run).
 */

/**
 * External dependencies
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const glob = require('fast-glob');
const { inc: semverInc } = require('semver');

/**
 * Internal dependencies
 */
const { log } = require('../lib/logger');
const { readJSONFile } = require('../lib/utils');
const { calculateVersionBumpFromChangelog } = require('./common');
const {
	foldUnreleasedContent,
	parseChangelogDocument,
	serializeChangelogDocument,
	unreleasedBodyHasEntries,
	normalizeVersionKey,
} = require('./changelog-md');

/**
 * @param {string[]} args
 * @param {{ cwd?: string }} [options]
 * @return {string} Return value.
 */
function git(args, options = {}) {
	try {
		return execFileSync('git', args, {
			encoding: 'utf8',
			cwd: options.cwd,
			stdio: ['ignore', 'pipe', 'pipe'],
		}).trim();
	} catch (error) {
		return '';
	}
}

/**
 * @param {string} sha
 * @param {{ cwd?: string }} [options]
 * @return {boolean} Return value.
 */
function isMergeCommit(sha, options = {}) {
	return git(['rev-parse', '-q', '--verify', `${sha}^2`], options) !== '';
}

/**
 * Range of work that just landed on master: previous first-parent merge → newest merge.
 * Push of the changelog follow-up commit is not a merge, so callers should skip it.
 *
 * @param {{ cwd?: string, from?: string, to?: string, eventName?: string }} [options]
 * @return {{ from: string, to: string } | null} Merge range, or null to skip.
 */
function resolveMasterMergeRange(options = {}) {
	const cwd = options.cwd || process.cwd();
	const eventName = options.eventName || process.env.GITHUB_EVENT_NAME || '';

	if (options.from && options.to) {
		return { from: options.from, to: options.to };
	}

	if (isMergeCommit('HEAD', { cwd })) {
		return { from: 'HEAD^1', to: 'HEAD' };
	}

	if (eventName === 'push') {
		return null;
	}

	const merges = git(
		['log', '--first-parent', '--merges', '-n', '2', '--format=%H'],
		{ cwd }
	)
		.split('\n')
		.map((line) => line.trim())
		.filter(Boolean);

	if (merges.length >= 2) {
		return { from: merges[1], to: 'HEAD' };
	}

	const parent = git(['rev-parse', '--verify', 'HEAD^'], { cwd });
	if (parent) {
		return { from: 'HEAD^', to: 'HEAD' };
	}

	return null;
}

/**
 * @param {string} changelogPath
 * @param {string} cwd
 * @return {string} Return value.
 */
function packageRelDir(changelogPath, cwd) {
	return path.relative(cwd, path.dirname(changelogPath)).replace(/\\/g, '/');
}

/**
 * @param {string} from
 * @param {string} to
 * @param {string} relDir
 * @param {{ cwd?: string }} [options]
 * @return {string[]} Return value.
 */
function listChangedFiles(from, to, relDir, options = {}) {
	const output = git(
		['diff', '--name-only', `${from}...${to}`, '--', `${relDir}/`],
		options
	);
	if (!output) {
		return [];
	}
	return output
		.split('\n')
		.map((line) => line.trim())
		.filter(Boolean);
}

/**
 * @param {{ hasUnreleasedEntries: boolean, changelogChanged: boolean, packageFilesChanged: boolean }} flags
 * @return {boolean} Return value.
 */
function shouldUpdatePackage(flags) {
	if (flags.hasUnreleasedEntries) {
		return true;
	}
	if (flags.packageFilesChanged && !flags.changelogChanged) {
		return true;
	}
	return false;
}

/**
 * @param {string} subject
 * @return {'Added' | 'Fixed' | 'Changed' | null} Return value.
 */
function sectionForCommitSubject(subject) {
	const trimmed = String(subject || '').trim();
	if (!trimmed) {
		return null;
	}
	if (
		/^(merge\b|update changelog\b|chore\(changelog\)|submodule:)/i.test(
			trimmed
		)
	) {
		return null;
	}

	if (/^(feat|feature)(\(|:|\/|\s)/i.test(trimmed)) {
		return 'Added';
	}
	if (/^(fix|bug)(\(|:|\/|\s)/i.test(trimmed)) {
		return 'Fixed';
	}
	return 'Changed';
}

/**
 * @param {string} subject
 * @return {string} Return value.
 */
function normalizeCommitSubject(subject) {
	return String(subject || '')
		.replace(
			/^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert|improve|improvement|enhancement|feature|security)(\([^)]*\))?(!)?\s*:\s*/i,
			''
		)
		.replace(/\s+/g, ' ')
		.replace(/\s*\.?$/, '')
		.trim();
}

/**
 * @param {string[]} subjects
 * @return {string} Return value.
 */
function changelogBodyFromCommitSubjects(subjects) {
	/** @type {Record<string, string[]>} */
	const groups = { Added: [], Changed: [], Fixed: [] };

	for (const subject of subjects) {
		const section = sectionForCommitSubject(subject);
		if (!section) {
			continue;
		}
		const title = normalizeCommitSubject(subject);
		if (!title) {
			continue;
		}
		const bullet = `- ${title.charAt(0).toUpperCase()}${title.slice(1)}.`;
		if (!groups[section].includes(bullet)) {
			groups[section].push(bullet);
		}
	}

	const parts = [];
	for (const heading of ['Added', 'Changed', 'Fixed']) {
		if (!groups[heading].length) {
			continue;
		}
		parts.push(`### ${heading}\n${groups[heading].join('\n')}`);
	}

	if (!parts.length) {
		return '### Changed\n- Internal updates.';
	}

	return parts.join('\n\n');
}

/**
 * @param {string} from
 * @param {string} to
 * @param {string} relDir
 * @param {{ cwd?: string }} [options]
 * @return {string} Return value.
 */
function changelogBodyFromGitLog(from, to, relDir, options = {}) {
	const output = git(
		[
			'log',
			'--no-merges',
			'--pretty=%s',
			`${from}...${to}`,
			'--',
			`${relDir}/`,
		],
		options
	);
	const subjects = output
		? output
				.split('\n')
				.map((line) => line.trim())
				.filter(Boolean)
		: [];
	return changelogBodyFromCommitSubjects(subjects);
}

/**
 * @param {string} content
 * @param {string} heading
 * @param {string} body
 * @return {string} Return value.
 */
function insertVersionSection(content, heading, body) {
	const document = parseChangelogDocument(content);
	const key = normalizeVersionKey(heading.replace(/^##\s+/, ''));
	document.sections = document.sections.filter(
		(section) => section.key !== '__unreleased__'
	);
	const existing = document.sections.find((section) => section.key === key);
	if (existing) {
		existing.body = [existing.body.trim(), body.trim()]
			.filter(Boolean)
			.join('\n\n');
		existing.heading = heading;
	} else {
		document.sections.unshift({
			key,
			heading,
			body: body.trim(),
		});
	}
	return serializeChangelogDocument(document, { keepUnreleased: false });
}

/**
 * Strip leftover ## Unreleased after a fold run (first CI pass).
 *
 * @param {string} content
 * @return {string} Return value.
 */
function stripUnreleasedSection(content) {
	const document = parseChangelogDocument(content);
	if (
		!document.sections.some((section) => section.key === '__unreleased__')
	) {
		return String(content || '');
	}
	return serializeChangelogDocument(document, { keepUnreleased: false });
}

/**
 * @param {{
 *   cwd?: string,
 *   semver?: 'major'|'minor'|'patch',
 *   publishDate?: string,
 *   from?: string,
 *   to?: string,
 *   eventName?: string,
 * }} [options]
 * @return {Promise<{ skipped: boolean, updated: string[] }>} Packages that were bumped.
 */
async function updatePackageChangelogsOnMaster(options = {}) {
	const cwd = options.cwd || process.cwd();
	const minimumVersionBump = options.semver || 'major';
	const publishDate =
		options.publishDate || new Date().toISOString().split('T')[0];

	const range = resolveMasterMergeRange({
		cwd,
		from: options.from,
		to: options.to,
		eventName: options.eventName,
	});

	if (!range) {
		log(
			'>> Skip package changelog update: HEAD is not a merge commit (follow-up push).'
		);
		return { skipped: true, updated: [] };
	}

	log(
		`>> Updating package changelogs for ${range.from}...${range.to} (minimum bump: ${minimumVersionBump}).`
	);

	const changelogFiles = await glob(
		path.resolve(cwd, 'packages/(*|**/*)/CHANGELOG.md')
	);
	/** @type {string[]} */
	const updated = [];

	for (const changelogPath of changelogFiles) {
		const relDir = packageRelDir(changelogPath, cwd);
		const changedFiles = listChangedFiles(range.from, range.to, relDir, {
			cwd,
		});
		const changelogRel = path
			.relative(cwd, changelogPath)
			.replace(/\\/g, '/');
		const changelogChanged = changedFiles.includes(changelogRel);
		const packageFilesChanged = changedFiles.some(
			(file) => file !== changelogRel
		);

		const previous = fs.readFileSync(changelogPath, 'utf8');
		const lines = previous.split('\n');
		const unreleasedBump = calculateVersionBumpFromChangelog(
			lines,
			minimumVersionBump
		);
		const hasUnreleasedEntries = unreleasedBodyHasEntries(
			parseChangelogDocument(previous).sections.find(
				(section) => section.key === '__unreleased__'
			)?.body || ''
		);

		if (
			!shouldUpdatePackage({
				hasUnreleasedEntries,
				changelogChanged,
				packageFilesChanged,
			})
		) {
			const stripped = stripUnreleasedSection(previous);
			if (stripped !== previous) {
				fs.writeFileSync(changelogPath, stripped);
				log(
					`   - ${relDir}: stripped empty ## Unreleased (no package changes).`
				);
			}
			continue;
		}

		const packageJSONPath = path.join(
			path.dirname(changelogPath),
			'package.json'
		);
		const composerJSONPath = path.join(
			path.dirname(changelogPath),
			'composer.json'
		);

		let jsonData = {};
		if (fs.existsSync(packageJSONPath)) {
			jsonData = readJSONFile(packageJSONPath);
		} else if (fs.existsSync(composerJSONPath)) {
			jsonData = readJSONFile(composerJSONPath);
		}

		const version = jsonData.version;
		if (!version) {
			log(`   - ${relDir}: skip (no package/composer version).`);
			continue;
		}

		let versionBump = unreleasedBump;
		if (!versionBump) {
			versionBump = minimumVersionBump;
		}

		let nextVersion;
		if ('0' === version[0] || '9' === String(version.split('.')[1])) {
			nextVersion = semverInc(version, 'major');
		} else {
			nextVersion = semverInc(version, versionBump);
		}

		if (!nextVersion) {
			log(`   - ${relDir}: skip (could not bump ${version}).`);
			continue;
		}

		const heading = `## [${nextVersion}] - ${publishDate}`;
		let nextContent;

		if (hasUnreleasedEntries) {
			nextContent = foldUnreleasedContent(previous, {
				heading,
				dropUnreleased: true,
			}).content;
		} else {
			const body = changelogBodyFromGitLog(range.from, range.to, relDir, {
				cwd,
			});
			nextContent = insertVersionSection(previous, heading, body);
		}

		fs.writeFileSync(changelogPath, nextContent);

		if (fs.existsSync(packageJSONPath)) {
			fs.writeFileSync(
				packageJSONPath,
				JSON.stringify(
					{ ...jsonData, version: nextVersion },
					null,
					'\t'
				) + '\n'
			);
		}

		if (fs.existsSync(composerJSONPath)) {
			const composerJson = readJSONFile(composerJSONPath);
			fs.writeFileSync(
				composerJSONPath,
				JSON.stringify(
					{ ...composerJson, version: nextVersion },
					null,
					'\t'
				) + '\n'
			);
		}

		const packageName =
			jsonData.name || `@blockera/${path.basename(relDir)}`;
		log(`   - ${packageName}: ${version} -> ${nextVersion}`);
		updated.push(packageName);
	}

	if (updated.length === 0) {
		log('>> No packages needed a version bump.');
	}

	return { skipped: false, updated };
}

module.exports = {
	git,
	isMergeCommit,
	resolveMasterMergeRange,
	packageRelDir,
	shouldUpdatePackage,
	sectionForCommitSubject,
	changelogBodyFromCommitSubjects,
	insertVersionSection,
	stripUnreleasedSection,
	updatePackageChangelogsOnMaster,
};
