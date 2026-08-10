/**
 * External dependencies
 */
const path = require('path');
const glob = require('fast-glob');
const fs = require('fs');
const { inc: semverInc } = require('semver');
const readline = require('readline');

/**
 * Internal dependencies
 */
const { log } = require('../lib/logger');
const { readJSONFile } = require('../lib/utils');
const { calculateVersionBumpFromChangelog } = require('./common');
const { updateChangelog } = require('./changelog');

/**
 * Update CHANGELOG files with the new version number for those packages that
 * contain new entries. Also refreshes root changelog.txt.
 *
 * @param {Object} config Command options from commander.
 */
async function updatePackages(config) {
	const { minimumVersionBump = 'patch', releaseType, version } = config;

	const changelogFiles = await glob(
		path.resolve(process.cwd(), 'packages/(*|**/*)/CHANGELOG.md')
	);

	// e.g. "2022-11-01T00:13:26.102Z" -> "2022-11-01"
	const publishDate = new Date().toISOString().split('T')[0];

	await updateChangelog(changelogFiles, version, publishDate);

	const processedPackages = await Promise.all(
		changelogFiles.map(async (changelogPath) => {
			const fileStream = fs.createReadStream(changelogPath);

			const rl = readline.createInterface({
				input: fileStream,
			});
			const lines = [];
			for await (const line of rl) {
				lines.push(line);
			}

			let versionBump = calculateVersionBumpFromChangelog(
				lines,
				minimumVersionBump
			);
			const packageName = `@blockera/${
				changelogPath.split('/').reverse()[1]
			}`;
			// Enforce version bump for all packages when
			// the stable minor or major version bump requested.
			if (
				!versionBump &&
				releaseType !== 'next' &&
				minimumVersionBump !== 'patch'
			) {
				versionBump = minimumVersionBump;
			}
			const packageJSONPath = changelogPath.replace(
				'CHANGELOG.md',
				'package.json'
			);
			const composerJSONPath = changelogPath.replace(
				'CHANGELOG.md',
				'composer.json'
			);

			let jsonData;

			if (fs.existsSync(packageJSONPath)) {
				jsonData = readJSONFile(packageJSONPath);
			} else {
				jsonData = readJSONFile(composerJSONPath);
			}

			let nextVersion = null;
			const { version: packageVersion } = jsonData;

			if (
				'0' === packageVersion[0] ||
				'9' === packageVersion.split('.')[1]
			) {
				nextVersion = semverInc(packageVersion, 'major');
			} else if (versionBump !== null) {
				nextVersion = semverInc(packageVersion, versionBump);
			}

			return {
				version: packageVersion,
				nextVersion,
				packageName,
				changelogPath,
				packageJSONPath,
				composerJSONPath,
			};
		})
	);

	const packagesToUpdate = processedPackages.filter(
		({ nextVersion }) => nextVersion
	);

	if (packagesToUpdate.length === 0) {
		log('>> No changes in CHANGELOG files detected.');
		return;
	}

	log(
		'>> Recommended version bumps based on the changes detected in CHANGELOG files:'
	);

	await Promise.all(
		packagesToUpdate.map(
			async ({
				version: packageVersion,
				nextVersion,
				packageName,
				changelogPath,
				packageJSONPath,
				composerJSONPath,
			}) => {
				const content = fs.readFileSync(changelogPath, 'utf8');
				fs.writeFileSync(
					changelogPath,
					content.replace(
						'## Unreleased',
						`## Unreleased\n\n## ${
							releaseType === 'next'
								? nextVersion + '-next.0'
								: nextVersion
						} (${publishDate})`
					)
				);

				if (fs.existsSync(packageJSONPath)) {
					const packageJson = readJSONFile(packageJSONPath);
					fs.writeFileSync(
						packageJSONPath,
						JSON.stringify(
							{ ...packageJson, version: nextVersion },
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

				log(
					`   - ${packageName}: ${packageVersion} -> ${
						releaseType === 'next'
							? nextVersion + '-next.0'
							: nextVersion
					}`
				);
			}
		)
	);
}

async function updatePackagesChangelog(config) {
	await updatePackages(config);
}

module.exports = {
	updatePackagesChangelog,
};
