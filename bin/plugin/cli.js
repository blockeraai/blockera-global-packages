#!/usr/bin/env node

/**
 * External dependencies
 */
const program = require('commander');

const catchException = (command) => {
	return async (...args) => {
		try {
			await command(...args);
		} catch (error) {
			console.error(error);
			process.exitCode = 1;
		}
	};
};

const releaseType = ['--releaseType <releaseType>', 'Release Type'];

const { getReleaseChangelog } = require('./commands/changelog');
const { updatePackagesChangelog } = require('./commands/packages');

program
	.command('update-packages-changelog')
	.option('-v, --version <version>', 'Version')
	.option(...releaseType)
	.option(
		'--semver <semver>',
		'Minimum version bump for packages (patch|minor|major)',
		'patch'
	)
	.description(
		'Publish Unreleased package changelogs into dated sections and bump package versions.'
	)
	.action(
		catchException(async (options) => {
			await updatePackagesChangelog({
				...options,
				minimumVersionBump: options.semver || 'patch',
			});
		})
	);

program
	.command('release-plugin-changelog')
	.alias('changelog')
	.option('-f, --file <file>', 'File')
	.option('-v, --version <version>', 'Version')
	.option('-m, --milestone <milestone>', 'Milestone')
	.option('-t, --token <token>', 'GitHub token')
	.option(
		'-u, --unreleased',
		"Only include PRs that haven't been included in a release yet"
	)
	.description('Generates a changelog from merged Pull Requests')
	.action(catchException(getReleaseChangelog));

program.parse(process.argv);
