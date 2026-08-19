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
 * Optional `pluginDownloadUrl` pins a companion plugin. Mode is consumer-set:
 *   BLOCKERA_WP_ENV_PLUGIN_URL_MODE=append   (default) concat onto `plugins`
 *   BLOCKERA_WP_ENV_PLUGIN_URL_MODE=replace  drop other companion sources first
 *
 * Companion identity (replace mode) is derived from consumer env, never hardcoded
 * product slugs: COMPANION_OWNER/REPO, else DEFAULT_PLUGIN, else the URL itself.
 *
 * Env (no product styles — consumers set these):
 *   BLOCKERA_E2E_WP_ENV_CONFIG_DIR          default: .github/wp-env-configs
 *   BLOCKERA_WP_ENV_FALLBACK_CONFIG         default: base
 *   BLOCKERA_WP_ENV_PR_ENV_FILE             default: .pr-env.json
 *   BLOCKERA_WP_ENV_PR_PLUGIN_CATEGORIES    comma list or * (default: *)
 *   BLOCKERA_WP_ENV_FREE_EXTRACT_DIR        default: .github/cache/blockera-free
 *   BLOCKERA_WP_ENV_DEFAULT_PLUGIN          tree/artifact/branch added when plugins are empty
 *   BLOCKERA_WP_ENV_DEFAULT_PLUGIN_CATEGORIES  comma list or * (default: *)
 *   BLOCKERA_WP_ENV_STRIP_DOT_PLUGINS       true = drop `.` plugin entries
 *   BLOCKERA_WP_ENV_DEFAULT_THEME           e.g. `.` when themes is missing
 *   BLOCKERA_WP_ENV_PLUGIN_URL_MODE         append | replace (default: append)
 *   BLOCKERA_WP_ENV_COMPANION_OWNER         GitHub owner for companion sources
 *   BLOCKERA_WP_ENV_COMPANION_REPO          GitHub repo for companion sources
 *   BLOCKERA_WP_ENV_COMPANION_BRANCH        default branch when source is a bare name
 *   BLOCKERA_WP_ENV_COMPANION_WP_SLUG       wordpress.org slug (default: companion repo)
 *   GITHUB_TOKEN                            required for GitHub tree/artifact downloads
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

const configDir =
	process.env.BLOCKERA_E2E_WP_ENV_CONFIG_DIR || '.github/wp-env-configs';

const fallbackName = process.env.BLOCKERA_WP_ENV_FALLBACK_CONFIG || 'base';

const prEnvFile = process.env.BLOCKERA_WP_ENV_PR_ENV_FILE || '.pr-env.json';

const prPluginCategories = (
	process.env.BLOCKERA_WP_ENV_PR_PLUGIN_CATEGORIES || '*'
)
	.split(',')
	.map((item) => item.trim())
	.filter(Boolean);

const defaultPlugin = process.env.BLOCKERA_WP_ENV_DEFAULT_PLUGIN || '';

const defaultPluginCategories = (
	process.env.BLOCKERA_WP_ENV_DEFAULT_PLUGIN_CATEGORIES || '*'
)
	.split(',')
	.map((item) => item.trim())
	.filter(Boolean);

const stripDotPlugins =
	process.env.BLOCKERA_WP_ENV_STRIP_DOT_PLUGINS === 'true';

const defaultTheme = process.env.BLOCKERA_WP_ENV_DEFAULT_THEME || '';

const pluginUrlMode = (
	process.env.BLOCKERA_WP_ENV_PLUGIN_URL_MODE || 'append'
).toLowerCase();

const ARTIFACT_URL_PATTERN =
	/^https:\/\/github\.com\/[^/]+\/[^/]+\/actions\/runs\/\d+\/artifacts\/\d+\/?$/;

const GITHUB_TREE_URL_PATTERN =
	/^https:\/\/github\.com\/([^/]+)\/([^/]+)\/tree\/(.+?)\/?$/;

const GITHUB_REPO_URL_PATTERN =
	/^https:\/\/github\.com\/([^/]+)\/([^/]+)(?:\/|$)/;

const DEFAULT_FREE_REPO = {
	owner: process.env.BLOCKERA_WP_ENV_COMPANION_OWNER || 'blockeraai',
	repo: process.env.BLOCKERA_WP_ENV_COMPANION_REPO || 'blockera',
	branch: process.env.BLOCKERA_WP_ENV_COMPANION_BRANCH || 'master',
};

const DEFAULT_CONFIG = {
	WP_DEBUG: false,
	SCRIPT_DEBUG: false,
	BLOCKERA_TELEMETRY_OPT_IN_OFF: true,
};

// wp-env uses the last path segment as the plugin directory name.
const FREE_EXTRACT_DIR =
	process.env.BLOCKERA_WP_ENV_FREE_EXTRACT_DIR ||
	'.github/cache/blockera-free';
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

function escapeRegExp(value) {
	return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Parse owner/repo from a GitHub tree, actions, or releases URL.
 *
 * @param {string} source Plugin source URL.
 * @return {{owner: string, repo: string}|null}
 */
function parseGitHubRepo(source) {
	if (!source || typeof source !== 'string') {
		return null;
	}

	const treeRef = parseGitHubTreeUrl(source);
	if (treeRef) {
		return { owner: treeRef.owner, repo: treeRef.repo };
	}

	const match = source.match(GITHUB_REPO_URL_PATTERN);
	if (!match) {
		return null;
	}

	return { owner: match[1], repo: match[2] };
}

/**
 * Companion GitHub identity from consumer env, then DEFAULT_PLUGIN, then URL.
 *
 * @return {{owner: string, repo: string}}
 */
function getCompanionRepo() {
	const envOwner = process.env.BLOCKERA_WP_ENV_COMPANION_OWNER;
	const envRepo = process.env.BLOCKERA_WP_ENV_COMPANION_REPO;

	if (envOwner && envRepo) {
		return { owner: envOwner, repo: envRepo };
	}

	const fromDefault = parseGitHubRepo(defaultPlugin);
	if (fromDefault) {
		return fromDefault;
	}

	const fromUrl = parseGitHubRepo(pluginDownloadUrl);
	if (fromUrl) {
		return fromUrl;
	}

	return { owner: DEFAULT_FREE_REPO.owner, repo: DEFAULT_FREE_REPO.repo };
}

/**
 * Whether a wp-env plugin source is the consumer's companion plugin.
 *
 * Bare branch names resolve to COMPANION_OWNER/REPO via download-artifact.sh.
 *
 * @param {string} pluginSource Plugin source from wp-env `plugins`.
 * @return {boolean}
 */
function isCompanionPluginSource(pluginSource) {
	if (!pluginSource || pluginSource === '.') {
		return false;
	}

	const companion = getCompanionRepo();
	const sourceRepo = parseGitHubRepo(pluginSource);

	if (
		sourceRepo &&
		sourceRepo.owner === companion.owner &&
		sourceRepo.repo === companion.repo
	) {
		return true;
	}

	if (isBranchName(pluginSource)) {
		return true;
	}

	const wpSlug =
		process.env.BLOCKERA_WP_ENV_COMPANION_WP_SLUG || companion.repo;
	const wpOrgPattern = new RegExp(
		'downloads\\.wordpress\\.org/plugin/' + escapeRegExp(wpSlug) + '\\.'
	);

	if (wpOrgPattern.test(pluginSource)) {
		return true;
	}

	const normalized = String(pluginSource).replace(/\\/g, '/');
	const extractBase = path.basename(FREE_EXTRACT_DIR);

	if (
		normalized === FREE_EXTRACT_DIR ||
		normalized === `./${FREE_EXTRACT_DIR}` ||
		normalized.endsWith(`/${extractBase}`)
	) {
		return true;
	}

	return false;
}

/**
 * Pin `pluginDownloadUrl` as the companion and drop other companion sources.
 *
 * @param {string[]} plugins Plugin sources.
 * @param {string} downloadUrl Companion zip / artifact / tree URL.
 * @return {string[]}
 */
function replaceCompanionPluginSources(plugins, downloadUrl) {
	return uniqueList([
		...(plugins || []).filter((src) => !isCompanionPluginSource(src)),
		downloadUrl,
	]);
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
		throw new Error(
			`Failed to download companion plugin artifact: ${label}`
		);
	}

	console.log(`create-wp-env: resolved plugin (${label}) to ${resolvedPath}`);
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
			`${DEFAULT_FREE_REPO.owner}/${DEFAULT_FREE_REPO.repo}@${pluginSource}`
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
	const overlayPlugins = Array.isArray(overlay.plugins)
		? overlay.plugins
		: [];

	result.plugins = uniqueList([
		...basePlugins,
		...(shouldApplyPrPlugins() ? overlayPlugins : []),
	]);

	return result;
}

function hasNonDotPlugin(plugins) {
	return plugins.some((pluginSource) => pluginSource && pluginSource !== '.');
}

function shouldApplyDefaultPlugin() {
	return (
		defaultPluginCategories.includes('*') ||
		defaultPluginCategories.includes('all') ||
		defaultPluginCategories.includes(category)
	);
}

function ensureDependencyPlugin(plugins) {
	if (
		!defaultPlugin ||
		hasNonDotPlugin(plugins) ||
		!shouldApplyDefaultPlugin()
	) {
		return plugins;
	}

	console.log(
		`create-wp-env: no companion plugin source; defaulting to ${defaultPlugin}`
	);
	return uniqueList([...plugins, defaultPlugin]);
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

console.log(`create-wp-env: base config ${wpEnvFilePath}`);
const categoryConfig = JSON.parse(fs.readFileSync(wpEnvFilePath, 'utf-8'));

const merged = mergeWpEnv(categoryConfig, prEnv);

if (pluginDownloadUrl) {
	if (pluginUrlMode === 'replace') {
		console.log(
			`create-wp-env: PLUGIN_URL_MODE=replace; pinning companion to ${pluginDownloadUrl}`
		);
		merged.plugins = replaceCompanionPluginSources(
			merged.plugins || [],
			pluginDownloadUrl
		);
	} else {
		merged.plugins = uniqueList([
			...(merged.plugins || []),
			pluginDownloadUrl,
		]);
	}
}

merged.plugins = ensureDependencyPlugin(merged.plugins || []);

if (stripDotPlugins) {
	merged.plugins = merged.plugins.filter(
		(pluginSource) => pluginSource && pluginSource !== '.'
	);
}

merged.config = {
	...DEFAULT_CONFIG,
	...(merged.config || {}),
};

merged.plugins = uniqueList(merged.plugins.map(resolvePluginSource));

if (defaultTheme && !Array.isArray(merged.themes)) {
	merged.themes = [defaultTheme];
}

if (Array.isArray(merged.plugins) && merged.plugins.length === 0) {
	delete merged.plugins;
}

fs.writeFileSync('.wp-env.json', JSON.stringify(merged, null, 2), 'utf-8');
