/**
 * Runtime config store for the shared plugin CLI.
 * Consumers call setPluginConfig() before running commands.
 */

/** @type {import('./create-config').WPPluginCLIConfig|null} */
let pluginConfig = null;

/**
 * @param {import('./create-config').WPPluginCLIConfig} config
 */
function setPluginConfig(config) {
	pluginConfig = config;
}

/**
 * @return {import('./create-config').WPPluginCLIConfig} Active plugin CLI config.
 */
function getPluginConfig() {
	if (!pluginConfig) {
		throw new Error(
			'Plugin CLI config is not set. Call createPluginCli()/setPluginConfig() first.'
		);
	}
	return pluginConfig;
}

module.exports = {
	setPluginConfig,
	getPluginConfig,
};
