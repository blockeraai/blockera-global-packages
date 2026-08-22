/**
 * Normalize and validate consumer plugin CLI config.
 *
 * @typedef {Object} WPPluginChangelogConfig
 * @property {string}  archiveUrl           URL for older releases archive.
 * @property {string}  [archiveLabel]       Label used in the archive sentence.
 * @property {boolean} [includeCommitCount] Whether to mention commit count in footer.
 */

/**
 * @typedef {Object} WPPluginCLIConfig
 * @property {string}                  slug                     Product slug.
 * @property {string}                  name                     Product display name.
 * @property {string}                  [team]                   GitHub team name.
 * @property {string}                  [versionMilestoneFormat] printf template for milestone titles.
 * @property {string}                  githubRepositoryOwner    GitHub org/user.
 * @property {string}                  githubRepositoryName     GitHub repository name.
 * @property {string}                  [pluginEntryPoint]       Main plugin/theme entry file.
 * @property {string}                  [buildZipCommand]        Shell command used to build a zip.
 * @property {string}                  githubRepositoryURL      HTTPS GitHub repository URL.
 * @property {string}                  [wpRepositoryReleasesURL] Releases URL.
 * @property {string}                  gitRepositoryURL         Git clone URL.
 * @property {string}                  [svnRepositoryURL]       WordPress.org SVN URL.
 * @property {WPPluginChangelogConfig} changelog                Changelog footer/settings.
 */

/**
 * @param {Partial<WPPluginCLIConfig> & Pick<WPPluginCLIConfig, 'slug'|'name'|'githubRepositoryOwner'|'githubRepositoryName'|'githubRepositoryURL'|'gitRepositoryURL'|'changelog'>} input
 *        Consumer-provided config fields.
 * @return {WPPluginCLIConfig} Normalized plugin CLI config.
 */
function createPluginCliConfig(input) {
	const required = [
		'slug',
		'name',
		'githubRepositoryOwner',
		'githubRepositoryName',
		'githubRepositoryURL',
		'gitRepositoryURL',
	];

	for (const key of required) {
		if (!input?.[key]) {
			throw new Error(
				`createPluginCliConfig: missing required config "${key}"`
			);
		}
	}

	if (!input.changelog?.archiveUrl) {
		throw new Error(
			'createPluginCliConfig: missing required config "changelog.archiveUrl"'
		);
	}

	return {
		team: 'Blockeraai',
		versionMilestoneFormat: '%(name)s %(major)s.%(minor)s',
		pluginEntryPoint: '',
		buildZipCommand: '',
		wpRepositoryReleasesURL: '',
		svnRepositoryURL: '',
		...input,
		changelog: {
			includeCommitCount: true,
			archiveLabel: input.name,
			...input.changelog,
		},
	};
}

module.exports = {
	createPluginCliConfig,
};
