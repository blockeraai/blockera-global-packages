#!/usr/bin/env node
/**
 * Merge `.github/wp-env-configs/{category}.json` with optional `.pr-env.json`
 * and write `.wp-env.json`.
 *
 * `.pr-env.json` overlays the category file: scalars replace, `config` /
 * `env` / `mappings` / `lifecycleScripts` shallow-merge (PR wins), arrays
 * (`plugins`, `themes`) concatenate uniquely. GitHub tree / Actions artifact
 * / branch plugin sources are downloaded via download-artifact.sh.
 *
 * Usage: node create-wp-env.js <category> [pluginDownloadUrl]
 *
 * Env:
 *   BLOCKERA_E2E_PRODUCT_STYLE / BLOCKERA_WP_ENV_PRODUCT_STYLE
 *     plugin | theme | pro (default: plugin)
 *   BLOCKERA_E2E_WP_ENV_CONFIG_DIR
 *     default: .github/wp-env-configs
 *   BLOCKERA_WP_ENV_FALLBACK_CONFIG
 *     default: general (pro) or base (plugin/theme)
 *   BLOCKERA_WP_ENV_PR_ENV_FILE
 *     default: .pr-env.json
 *   BLOCKERA_WP_ENV_PR_PLUGIN_CATEGORIES
 *     comma-separated categories that receive `.pr-env.json` plugins, or *
 *     default: * (pro/plugin), companion-plugin (theme)
 *   GITHUB_TOKEN
 *     required to download GitHub tree/artifact/branch plugin sources
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const [category] = process.argv.slice(2);
const [pluginDownloadUrl] = process.argv.slice(3);

if (!category) {
	console.error('create-wp-env: category argument is required');
	process.exit(1);
}

const productStyle = (
	process.env.BLOCKERA_WP_ENV_PRODUCT_STYLE ||
	process.env.BLOCKERA_E2E_PRODUCT_STYLE ||
	'plugin'
).toLowerCase();

const configDir =
	process.env.BLOCKERA_E2E_WP_ENV_CONFIG_DIR || '.github/wp-env-configs';

const fallbackName =
	process.env.BLOCKERA_WP_ENV_FALLBACK_CONFIG ||
	(productStyle === 'pro' ? 'general' : 'base');

const prEnvFile = process.env.BLOCKERA_WP_ENV_PR_ENV_FILE || '.pr-env.json';

const prPluginCategories = (
	process.env.BLOCKERA_WP_ENV_PR_PLUGIN_CATEGORIES ||
	(productStyle === 'theme' ? 'companion-plugin' : '*')
)
	.split(',')
	.map((item) => item.trim())
	.filter(Boolean);

const ARTIFACT_URL_PATTERN =
	/^https:\/\/github\.com\/[^/]+\/[^/]+\/actions\/runs\/\d+\/artifacts\/\d+\/?$/;

const GITHUB_TREE_URL_PATTERN =
	/^https:\/\/github\.com\/([^/]+)\/([^/]+)\/tree\/(.+?)\/?$/;

const DEFAULT_FREE_REPO = {
	owner: 'blockeraai',
	repo: 'blockera',
	branch: 'master',
};

const DEFAULT_CONFIG = {
	WP_DEBUG: false,
	SCRIPT_DEBUG: false,
	BLOCKERA_TELEMETRY_OPT_IN_OFF: true,
};

// wp-env uses the last path segment as the plugin directory name.
// Theme CI runs `wp plugin activate blockera`, so the extract dir must
// be `blockera`. Pro keeps `blockera-free` to avoid colliding with `blockera-pro`.
const FREE_EXTRACT_DIR =
	productStyle === 'theme'
		? '.github/cache/blockera'
		: '.github/cache/blockera-free';
const DOWNLOAD_SCRIPT = path.join(__dirname, 'download-artifact.sh');

function requireGitHubToken() {
	if (!process.env.GITHUB_TOKEN) {
		throw new Error(
			'GITHUB_TOKEN is required to download GitHub Actions artifacts for wp-env. ' +
				'Set secrets.BLOCKERABOT_PAT on the workflow step that runs create-wp-env.js.'
		);
	}
}

function isPlainObject(value) {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function uniqueList(items) {
	return [...new Set((items || []).filter(Boolean))];
}

function isLocalOrDotSource(pluginSource) {
	return (
		pluginSource === '.' ||
		pluginSource.startsWith('./') ||
		pluginSource.startsWith('../') ||
		pluginSource.startsWith('/')
	);
}

function isHttpUrl(pluginSource) {
	return /^https?:\/\//.test(pluginSource);
}

function isBranchName(pluginSource) {
	return !isLocalOrDotSource(pluginSource) && !isHttpUrl(pluginSource);
}

function parseGitHubTreeUrl(pluginSource) {
	const match = pluginSource.match(GITHUB_TREE_URL_PATTERN);
	if (!match) {
		return null;
	}

	return {
		owner: match[1],
		repo: match[2],
		branch: decodeURIComponent(match[3]),
	};
}

function downloadFreeArtifact(args, label) {
	requireGitHubToken();

	const resolvedPath = execFileSync(
		'bash',
		[DOWNLOAD_SCRIPT, ...args, '--extract-dir', FREE_EXTRACT_DIR],
		{
			encoding: 'utf8',
			env: process.env,
			stdio: ['ignore', 'pipe', 'inherit'],
		}
	).trim();

	if (!resolvedPath) {
		throw new Error(`Failed to download Blockera plugin artifact: ${label}`);
	}

	console.log(
		`create-wp-env: resolved plugin (${label}) to ${resolvedPath}`
	);
	return resolvedPath;
}

function downloadFreeBranch({ owner, repo, branch }, label) {
	return downloadFreeArtifact(
		['--owner', owner, '--repo', repo, '--branch', branch],
		label
	);
}

function resolvePluginSource(pluginSource) {
	if (ARTIFACT_URL_PATTERN.test(pluginSource)) {
		return downloadFreeArtifact(['--url', pluginSource], pluginSource);
	}

	const treeRef = parseGitHubTreeUrl(pluginSource);
	if (treeRef) {
		return downloadFreeBranch(
			treeRef,
			`${treeRef.owner}/${treeRef.repo}@${treeRef.branch}`
		);
	}

	if (isBranchName(pluginSource)) {
		return downloadFreeBranch(
			{ ...DEFAULT_FREE_REPO, branch: pluginSource },
			`blockeraai/blockera@${pluginSource}`
		);
	}

	return pluginSource;
}

function shouldApplyPrPlugins() {
	return (
		prPluginCategories.includes('*') ||
		prPluginCategories.includes('all') ||
		prPluginCategories.includes(category)
	);
}

function mergeWpEnv(base, overlay) {
	const result = { ...base };

	for (const [key, value] of Object.entries(overlay || {})) {
		if (key === 'plugins' || value === undefined || value === null) {
			continue;
		}

		if (isPlainObject(value) && isPlainObject(base[key])) {
			result[key] = { ...base[key], ...value };
			continue;
		}

		if (Array.isArray(value) && Array.isArray(base[key])) {
			result[key] = uniqueList([...base[key], ...value]);
			continue;
		}

		result[key] = value;
	}

	const basePlugins = Array.isArray(base.plugins) ? base.plugins : [];
	const overlayPlugins = Array.isArray(overlay.plugins) ? overlay.plugins : [];

	result.plugins = uniqueList([
		...basePlugins,
		...(shouldApplyPrPlugins() ? overlayPlugins : []),
	]);

	return result;
}

function hasNonDotPlugin(plugins) {
	return plugins.some((pluginSource) => pluginSource && pluginSource !== '.');
}

function ensureDependencyPlugin(plugins) {
	if (hasNonDotPlugin(plugins)) {
		return plugins;
	}

	const shouldDefault =
		productStyle === 'pro' ||
		(productStyle === 'theme' && category === 'companion-plugin');

	if (!shouldDefault) {
		return plugins;
	}

	const defaultTreeUrl = `https://github.com/${DEFAULT_FREE_REPO.owner}/${DEFAULT_FREE_REPO.repo}/tree/${DEFAULT_FREE_REPO.branch}`;
	console.log(
		`create-wp-env: no companion plugin source; defaulting to ${defaultTreeUrl}`
	);
	return uniqueList([...plugins, defaultTreeUrl]);
}

let prEnv = {};
if (fs.existsSync(prEnvFile)) {
	prEnv = JSON.parse(fs.readFileSync(prEnvFile, 'utf-8'));
	console.log(`create-wp-env: overlay ${prEnvFile}`);
}

let wpEnvFilePath = path.join(configDir, `${category}.json`);
if (!fs.existsSync(wpEnvFilePath)) {
	wpEnvFilePath = path.join(configDir, `${fallbackName}.json`);
}

if (!fs.existsSync(wpEnvFilePath)) {
	console.error(`create-wp-env: missing category config ${wpEnvFilePath}`);
	process.exit(1);
}

console.log(`create-wp-env: base config ${wpEnvFilePath} (${productStyle})`);
const categoryConfig = JSON.parse(fs.readFileSync(wpEnvFilePath, 'utf-8'));

const merged = mergeWpEnv(categoryConfig, prEnv);

if (pluginDownloadUrl) {
	merged.plugins = uniqueList([...(merged.plugins || []), pluginDownloadUrl]);
}

merged.plugins = ensureDependencyPlugin(merged.plugins || []);

if (productStyle === 'theme') {
	merged.plugins = merged.plugins.filter(
		(pluginSource) => pluginSource && pluginSource !== '.'
	);
}

merged.config = {
	...DEFAULT_CONFIG,
	...(merged.config || {}),
};

merged.plugins = uniqueList(merged.plugins.map(resolvePluginSource));

if (productStyle === 'theme' && !Array.isArray(merged.themes)) {
	merged.themes = ['.'];
}

if (Array.isArray(merged.plugins) && merged.plugins.length === 0) {
	delete merged.plugins;
}

fs.writeFileSync('.wp-env.json', JSON.stringify(merged, null, 2), 'utf-8');
