#!/usr/bin/env node

/**
 * External dependencies
 */
const program = require('commander');

/**
 * Internal dependencies
 */
const { createPluginCliConfig } = require('./create-config');
const { setPluginConfig } = require('./config-store');

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

/**
 * Create and optionally parse the shared plugin CLI.
 *
 * @param {Parameters<typeof createPluginCliConfig>[0]} configInput Consumer product config.
 * @param {Object} [options]
 * @param {(program: import('commander').Command, catchException: Function) => void} [options.extraCommands]
 *        Register consumer-only commands (e.g. test:snapshots:import).
 * @param {boolean} [options.parse=true] Whether to parse process.argv immediately.
 * @return {import('commander').Command} Commander program instance.
 */
function createPluginCli(configInput, options = {}) {
	const { extraCommands, parse = true } = options;
	const config = createPluginCliConfig(configInput);
	setPluginConfig(config);

	const releaseType = ['--releaseType <releaseType>', 'Release Type'];

	program
		.command('update-packages-changelog')
		.option('-v, --version <version>', 'Version')
		.option(...releaseType)
		.description(
			'Accumulate package CHANGELOG.md diffs into the product changelog.'
		)
		.action(
			catchException(async (...args) => {
				const {
					updatePackagesChangelog,
				} = require('./commands/packages');
				return updatePackagesChangelog(...args);
			})
		);

	program
		.command('fold-unreleased')
		.option('--cwd <cwd>', 'Repo root that contains packages/')
		.option('--date <date>', 'Dated cut YYYY-MM-DD (GP default)')
		.option('--suffix <suffix>', 'Disambiguate same-day cuts')
		.option(
			'--heading <heading>',
			'Full ## heading (consumer zip uses product version)'
		)
		.description(
			'Fold package CHANGELOG.md ## Unreleased into a dated or version heading.'
		)
		.action(
			catchException(async (cmd) => {
				const { foldUnreleasedTree } = require('./commands/changelog-md');
				const result = foldUnreleasedTree(cmd.cwd || process.cwd(), {
					date: cmd.date,
					suffix: cmd.suffix,
					heading: cmd.heading,
				});
				if (result.changed) {
					console.log(
						`Folded Unreleased in ${result.files.length} file(s).`
					);
				} else {
					console.log('No Unreleased entries to fold.');
				}
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
		.action(
			catchException(async (...args) => {
				const { getReleaseChangelog } = require('./commands/changelog');
				return getReleaseChangelog(...args);
			})
		);

	if (typeof extraCommands === 'function') {
		extraCommands(program, catchException);
	}

	if (parse) {
		program.parse(process.argv);
	}

	return program;
}

module.exports = {
	createPluginCli,
	createPluginCliConfig,
};

// Allow direct execution when a consumer sets BLOCKERA_PLUGIN_CLI_CONFIG via require-then-run pattern.
if (require.main === module) {
	throw new Error(
		'Run via a consumer bin/plugin/cli.js that calls createPluginCli(config).'
	);
}
