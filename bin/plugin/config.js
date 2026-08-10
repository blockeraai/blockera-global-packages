const gitRepoOwner = 'blockeraai';

/**
 * @typedef WPPluginCLIConfig
 *
 * @property {string} slug                  Slug.
 * @property {string} name                  Name.
 * @property {string} githubRepositoryOwner GitHub Repository Owner.
 * @property {string} githubRepositoryName  GitHub Repository Name.
 * @property {string} githubRepositoryURL   GitHub Repository URL.
 * @property {string} gitRepositoryURL      Git Repository URL.
 */

/**
 * @type {WPPluginCLIConfig}
 */
const config = {
	slug: 'blockera-global-packages',
	name: 'Blockera Global Packages',
	versionMilestoneFormat: '%(name)s %(major)s.%(minor)s',
	githubRepositoryOwner: gitRepoOwner,
	githubRepositoryName: 'blockera-global-packages',
	githubRepositoryURL:
		'https://github.com/' + gitRepoOwner + '/blockera-global-packages/',
	gitRepositoryURL:
		'https://github.com/' + gitRepoOwner + '/blockera-global-packages.git',
};

module.exports = config;
