/**
 * Internal dependencies
 */
const {
	createPluginCliConfig,
} = require('../../packages/dev-tools/bin/plugin/create-config');

const gitRepoOwner = 'blockeraai';

module.exports = createPluginCliConfig({
	slug: 'blockera-global-packages',
	name: 'Blockera Global Packages',
	team: 'Blockeraai',
	versionMilestoneFormat: '%(name)s %(major)s.%(minor)s',
	githubRepositoryOwner: gitRepoOwner,
	githubRepositoryName: 'blockera-global-packages',
	githubRepositoryURL:
		'https://github.com/' + gitRepoOwner + '/blockera-global-packages/',
	gitRepositoryURL:
		'https://github.com/' + gitRepoOwner + '/blockera-global-packages.git',
	changelog: {
		archiveUrl:
			'https://github.com/' +
			gitRepoOwner +
			'/blockera-global-packages/releases',
		archiveLabel: 'Blockera Global Packages',
		includeCommitCount: true,
	},
});
