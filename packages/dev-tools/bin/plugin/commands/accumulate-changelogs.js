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
 *   BLOCKERA_CHANGELOG_REQUIRE_FOLDED_GP    default: unset (set to 1 to fail if GP Unreleased still has bullets)
 *
 * GP package CHANGELOG.md files use `## [x.y.z] - date` after the GP master
 * fold. Zip only reads packages whose package.json / composer.json version
 * changed since the previous product release. Previous versions come from the
 * GP gitlink when present, otherwise from inlined `packages/<name>` at the
 * last product ref (pre-submodule layout). ### bodies are taken from that
 * previous package version (exclusive) through the current version, including
 * remaining ## Unreleased bullets. Products may have no consumer
 * packages CHANGELOG.md files (GP-only). Consumer packages may still use
 * ## Unreleased until zip fold.
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
	parseManifestVersion,
	extractChangedSections,
	prependRootChangelog,
	isPackageChangelogMdPath,
	collectPackageChangelogPaths,
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
	const fromGit = rev
		? git(['ls-tree', '-r', '--name-only', rev], { cwd: gpCwd })
				.split('\n')
				.map((line) => line.trim())
				.filter((filePath) => isPackageChangelogMdPath(filePath))
		: [];
	const fromWorktree = collectPackageChangelogPaths(gpCwd, {
		skipGlobalPackages: true,
	}).map((filePath) =>
		path.relative(gpCwd, filePath).replace(/\\/g, '/')
	);

	return [...new Set([...fromGit, ...fromWorktree])].sort();
}

/**
 * @param {string} changelogRelPath
 * @return {string} Return value.
 */
function packageDirFromChangelog(changelogRelPath) {
	return String(changelogRelPath || '')
		.replace(/\\/g, '/')
		.replace(/\/CHANGELOG\.md$/i, '');
}

/**
 * @param {string} gpCwd
 * @param {string} rev
 * @param {string} changelogRelPath
 * @return {string} Return value.
 */
function resolveGpPackageVersion(gpCwd, rev, changelogRelPath) {
	return readManifestVersionAt(gpCwd, rev, changelogRelPath);
}

/**
 * @param {string} repoCwd
 * @param {string} rev
 * @param {string} changelogRelPath
 * @return {string} Return value.
 */
function readManifestVersionAt(repoCwd, rev, changelogRelPath) {
	if (!rev) {
		return '';
	}
	const dir = packageDirFromChangelog(changelogRelPath);
	const fromPackage = parseManifestVersion(
		gitShowFile(repoCwd, rev, `${dir}/package.json`)
	);
	if (fromPackage) {
		return fromPackage;
	}
	return parseManifestVersion(
		gitShowFile(repoCwd, rev, `${dir}/composer.json`)
	);
}

/**
 * @param {string} gpCwd
 * @param {string} changelogRelPath
 * @return {string} Return value.
 */
function readWorktreeManifestVersion(gpCwd, changelogRelPath) {
	const dir = path.join(gpCwd, packageDirFromChangelog(changelogRelPath));
	for (const name of ['package.json', 'composer.json']) {
		const filePath = path.join(dir, name);
		if (!fs.existsSync(filePath)) {
			continue;
		}
		const version = parseManifestVersion(
			fs.readFileSync(filePath, 'utf8')
		);
		if (version) {
			return version;
		}
	}
	return '';
}

/**
 * Previous pin may be a GP gitlink, or inlined product `packages/<name>`
 * (layout before the global-packages submodule).
 *
 * @param {{ cwd: string, fromRef: string, gpAbs: string, gpFrom: string, changelogRelPath: string }} options
 * @return {string} Return value.
 */
function resolvePreviousPackageVersion({
	cwd,
	fromRef,
	gpAbs,
	gpFrom,
	changelogRelPath,
}) {
	if (gpFrom) {
		return readManifestVersionAt(gpAbs, gpFrom, changelogRelPath);
	}
	if (fromRef) {
		return readManifestVersionAt(cwd, fromRef, changelogRelPath);
	}
	return '';
}

/**
 * @param {{ cwd: string, fromRef: string, gpAbs: string, gpFrom: string, changelogRelPath: string }} options
 * @return {string} Return value.
 */
function resolvePreviousChangelog({
	cwd,
	fromRef,
	gpAbs,
	gpFrom,
	changelogRelPath,
}) {
	if (gpFrom) {
		return gitShowFile(gpAbs, gpFrom, changelogRelPath);
	}
	if (fromRef) {
		return gitShowFile(cwd, fromRef, changelogRelPath);
	}
	return '';
}

/**
 * @param {string} gpCwd
 * @param {string} gpTo
 * @param {string} changelogRelPath
 * @return {string} Return value.
 */
function resolveCurrentChangelog(gpCwd, gpTo, changelogRelPath) {
	const abs = path.join(gpCwd, changelogRelPath);
	if (fs.existsSync(abs)) {
		return fs.readFileSync(abs, 'utf8');
	}
	return gitShowFile(gpCwd, gpTo, changelogRelPath);
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
		process.env.BLOCKERA_CHANGELOG_REQUIRE_FOLDED_GP === '1';

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
	const canReadPrevious = Boolean(gpFrom || fromRef);

	if (fs.existsSync(gpAbs)) {
		const files = listGpChangelogFiles(gpAbs, gpTo);
		if (!canReadPrevious) {
			log(
				'>> Skipping GP changelog accumulation (no previous product ref or GP pin)'
			);
		} else if (!gpFrom && fromRef) {
			log(
				`>> No GP gitlink at ${fromRef}; comparing package versions from inlined ${fromRef}:packages/*`
			);
		}
		for (const filePath of files) {
			const newContent = resolveCurrentChangelog(
				gpAbs,
				gpTo,
				filePath
			);
			if (requireFoldedGp) {
				assertUnreleasedEmpty(newContent, `${gpPath}/${filePath}`);
			}
			if (!canReadPrevious) {
				continue;
			}

			const currentVersion =
				readWorktreeManifestVersion(gpAbs, filePath) ||
				readManifestVersionAt(gpAbs, gpTo, filePath);
			const previousVersion = resolvePreviousPackageVersion({
				cwd,
				fromRef,
				gpAbs,
				gpFrom,
				changelogRelPath: filePath,
			});

			if (!currentVersion) {
				log(
					`   - skip ${packageDirFromChangelog(filePath)} (no package/composer version)`
				);
				continue;
			}

			if (previousVersion && previousVersion === currentVersion) {
				continue;
			}

			const oldContent = resolvePreviousChangelog({
				cwd,
				fromRef,
				gpAbs,
				gpFrom,
				changelogRelPath: filePath,
			});
			const changed = extractChangedSections(oldContent, newContent, {
				previousVersion,
				currentVersion,
			});
			if (changed) {
				log(
					`   - ${packageDirFromChangelog(filePath)}: ${previousVersion || '<new>'} → ${currentVersion}`
				);
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
	parseManifestVersion,
	extractChangedSections,
	isPackageChangelogMdPath,
	prependRootChangelog,
	listConsumerChangelogFiles,
	resolveGpPackageVersion,
	resolvePreviousPackageVersion,
	accumulateProductChangelogs,
	writeChangelogTxt,
};
