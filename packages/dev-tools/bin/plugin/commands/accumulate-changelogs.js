/**
 * Accumulate package CHANGELOG.md version sections between git refs / GP pins
 * into the consumer root changelog markdown and changelog.txt.
 *
 * Optional env (BLOCKERA_ prefix):
 *   BLOCKERA_CHANGELOG_GP_PATH              default: packages/global-packages
 *   BLOCKERA_CHANGELOG_GP_FROM              GP commit SHA (overrides gitlink at FROM_REF)
 *   BLOCKERA_CHANGELOG_GP_TO                GP commit SHA (overrides gitlink at HEAD)
 *   BLOCKERA_CHANGELOG_FROM_REF             parent git ref for last product release
 *   BLOCKERA_CHANGELOG_TO_REF               parent git ref (default: HEAD)
 *   BLOCKERA_CHANGELOG_PREVIOUS_VERSION     last product version (tag vX / X); zip job sets from OLD_VERSION
 *   BLOCKERA_CHANGELOG_CONSUMER_GLOBS       default: packages/<pkg>/CHANGELOG.md
 *                                           (optional; GP-only products may match none)
 *   BLOCKERA_CHANGELOG_ROOT_MD              default: root CHANGELOG markdown
 *   BLOCKERA_CHANGELOG_FILE                 default: changelog.txt
 *   BLOCKERA_CHANGELOG_REQUIRE_FOLDED_GP    default: 1 (fail if GP Unreleased still has bullets)
 *
 * GP package CHANGELOG.md files use `## [x.y.z] - date` (no Unreleased after
 * the GP master fold). Zip accumulates ### bodies from the previous pin's top
 * version heading (exclusive) through the current pin's newest heading.
 * Consumer packages may still use ## Unreleased until zip fold.
 */

/**
 * External dependencies
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const glob = require('fast-glob');

/**
 * Internal dependencies
 */
const {
	combineChangelogSections,
	getCommitCountSinceLastRelease,
} = require('./changelog');
const {
	normalizeVersionKey,
	parseVersionSections,
	extractChangedSections,
	prependRootChangelog,
	isPackageChangelogMdPath,
	foldUnreleasedTree,
	assertUnreleasedEmpty,
	dedupeChangelogMarkdown,
} = require('./changelog-md');
const { getPluginConfig } = require('../config-store');
const { log } = require('../lib/logger');

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
 * @param {string} cwd
 * @return {string} Return value.
 */
function resolveLastReleaseRef(cwd) {
	const fromEnv = process.env.BLOCKERA_CHANGELOG_FROM_REF;
	if (fromEnv) {
		return fromEnv;
	}

	const previousVersion = process.env.BLOCKERA_CHANGELOG_PREVIOUS_VERSION;
	if (previousVersion) {
		const tag = git(['rev-parse', '--verify', `v${previousVersion}`], {
			cwd,
		});
		if (tag) {
			return `v${previousVersion}`;
		}
		const plain = git(['rev-parse', '--verify', previousVersion], { cwd });
		if (plain) {
			return previousVersion;
		}
	}

	const releaseBranch = git(
		[
			'for-each-ref',
			'--sort=-committerdate',
			'--format=%(refname:short)',
			'refs/remotes/origin/release/',
		],
		{ cwd }
	)
		.split('\n')
		.map((line) => line.trim())
		.filter(Boolean)[0];

	if (releaseBranch) {
		return releaseBranch;
	}

	return git(['describe', '--tags', '--abbrev=0'], { cwd });
}

/**
 * @param {string} cwd
 * @param {string} ref
 * @param {string} gitlinkPath
 * @return {string} Return value.
 */
function resolveGitlink(cwd, ref, gitlinkPath) {
	if (!ref) {
		return '';
	}
	return git(['rev-parse', `${ref}:${gitlinkPath}`], { cwd });
}

/**
 * @param {string} repoCwd
 * @param {string} rev
 * @param {string} filePath
 * @return {string} Return value.
 */
function gitShowFile(repoCwd, rev, filePath) {
	if (!rev || !filePath) {
		return '';
	}
	return git(['show', `${rev}:${filePath}`], { cwd: repoCwd });
}

/**
 * @param {string} gpCwd
 * @param {string} rev
 * @return {string[]} Return value.
 */
function listGpChangelogFiles(gpCwd, rev) {
	if (!rev) {
		return [];
	}
	return git(['ls-tree', '-r', '--name-only', rev], { cwd: gpCwd })
		.split('\n')
		.map((line) => line.trim())
		.filter((filePath) => isPackageChangelogMdPath(filePath));
}

/**
 * @param {string} cwd
 * @return {Promise<string[]>} Return value.
 */
async function listConsumerChangelogFiles(cwd) {
	const raw =
		process.env.BLOCKERA_CHANGELOG_CONSUMER_GLOBS ||
		'packages/*/CHANGELOG.md';
	const patterns = String(raw)
		.split(/[,:\n]+/)
		.map((entry) => entry.trim())
		.filter(Boolean);

	return glob(patterns, {
		cwd,
		absolute: true,
		onlyFiles: true,
		ignore: ['**/packages/global-packages/**'],
	});
}

/**
 * @param {string} cwd
 * @param {string} fromRef
 * @param {string} toRef
 * @param {string} filePath
 * @return {string} Return value.
 */
function extractFileRange(cwd, fromRef, toRef, filePath) {
	const relative = path.relative(cwd, filePath).replace(/\\/g, '/');
	const oldContent = fromRef ? gitShowFile(cwd, fromRef, relative) : '';
	let newContent = '';
	if (toRef && toRef !== 'WORKTREE') {
		newContent = gitShowFile(cwd, toRef, relative);
	}
	if (!newContent && fs.existsSync(filePath)) {
		newContent = fs.readFileSync(filePath, 'utf8');
	}
	return extractChangedSections(oldContent, newContent);
}

/**
 * @param {{ version: string, publishDate?: string, cwd?: string }} options
 */
async function accumulateProductChangelogs(options) {
	const version = options.version;
	if (!version) {
		throw new Error('accumulate-changelogs: version is required');
	}

	const cwd = options.cwd || process.cwd();
	const publishDate =
		options.publishDate || new Date().toISOString().split('T')[0];
	const gpPath =
		process.env.BLOCKERA_CHANGELOG_GP_PATH || 'packages/global-packages';
	const toRef = process.env.BLOCKERA_CHANGELOG_TO_REF || 'HEAD';
	const fromRef = resolveLastReleaseRef(cwd);
	const gpAbs = path.resolve(cwd, gpPath);
	const requireFoldedGp =
		process.env.BLOCKERA_CHANGELOG_REQUIRE_FOLDED_GP !== '0';

	const gpFrom =
		process.env.BLOCKERA_CHANGELOG_GP_FROM ||
		resolveGitlink(cwd, fromRef, gpPath);
	const gpTo =
		process.env.BLOCKERA_CHANGELOG_GP_TO ||
		resolveGitlink(cwd, toRef, gpPath) ||
		git(['rev-parse', 'HEAD'], { cwd: gpAbs });

	log(
		`>> Accumulating changelogs from package CHANGELOG.md (from=${fromRef || '<none>'} to=${toRef} gp=${gpFrom || '<none>'}..${gpTo || '<none>'})`
	);

	const chunks = [];

	if (fs.existsSync(gpAbs) && gpTo) {
		const files = listGpChangelogFiles(gpAbs, gpTo);
		for (const filePath of files) {
			const newContent = gitShowFile(gpAbs, gpTo, filePath);
			if (requireFoldedGp) {
				assertUnreleasedEmpty(newContent, `${gpPath}/${filePath}`);
			}
			const oldContent = gpFrom
				? gitShowFile(gpAbs, gpFrom, filePath)
				: '';
			const changed = extractChangedSections(oldContent, newContent);
			if (changed) {
				chunks.push(changed);
			}
		}
	}

	const consumerFiles = await listConsumerChangelogFiles(cwd);
	const explicitConsumerGlobs = String(
		process.env.BLOCKERA_CHANGELOG_CONSUMER_GLOBS || ''
	).trim();

	if (!consumerFiles.length && explicitConsumerGlobs) {
		throw new Error(
			'accumulate-changelogs: no consumer package CHANGELOG.md files matched BLOCKERA_CHANGELOG_CONSUMER_GLOBS'
		);
	}

	if (!consumerFiles.length) {
		log(
			'>> No consumer package CHANGELOG.md files; accumulating global-packages notes only'
		);
	}

	for (const filePath of consumerFiles) {
		const changed = extractFileRange(cwd, fromRef, toRef, filePath);
		if (changed) {
			chunks.push(changed);
		}
	}

	const rootMdRel = process.env.BLOCKERA_CHANGELOG_ROOT_MD || 'CHANGELOG.md';
	const rootMdPath = path.resolve(cwd, rootMdRel);
	const existingRoot = fs.existsSync(rootMdPath)
		? fs.readFileSync(rootMdPath, 'utf8')
		: '';

	const merged = dedupeChangelogMarkdown(
		combineChangelogSections(chunks.join('\n\n')),
		existingRoot
	);

	fs.writeFileSync(
		rootMdPath,
		prependRootChangelog(existingRoot, version, publishDate, merged)
	);

	foldUnreleasedTree(cwd, {
		heading: `## [${version}] - ${publishDate}`,
		skipGlobalPackages: true,
	});

	await writeChangelogTxt({
		cwd,
		version,
		publishDate,
		mergedBody: merged,
	});

	log(`>> Wrote ${rootMdRel} and changelog.txt for ${version}`);
}

/**
 * @param {{ cwd: string, version: string, publishDate: string, mergedBody: string }} options
 */
async function writeChangelogTxt({ cwd, version, publishDate, mergedBody }) {
	const config = getPluginConfig();
	const changelogFile =
		process.env.BLOCKERA_CHANGELOG_FILE ||
		process.env.BLOCKERA_BUILD_ZIP_CHANGELOG_FILE ||
		'changelog.txt';
	const start =
		'== Changelog ==\n\n### Version ' +
		version.trim() +
		' - ' +
		publishDate +
		'\n\n';

	let end = '\n\n### More\n\n';
	if (config.changelog.includeCommitCount !== false) {
		const commitCount = await getCommitCountSinceLastRelease();
		end += `This release includes ${commitCount} commits since the last release.\n\n`;
	}
	const archiveLabel = config.changelog.archiveLabel || config.name;
	end += `To read the changelog for older ${archiveLabel} releases, please navigate to the [releases page](${config.changelog.archiveUrl}).\n`;

	fs.writeFileSync(
		path.resolve(cwd, changelogFile),
		start + (mergedBody ? mergedBody + '\n' : '') + end
	);
}

module.exports = {
	normalizeVersionKey,
	parseVersionSections,
	extractChangedSections,
	isPackageChangelogMdPath,
	prependRootChangelog,
	listConsumerChangelogFiles,
	accumulateProductChangelogs,
	writeChangelogTxt,
};
