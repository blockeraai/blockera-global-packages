// Pro / dependency-aware wp-env builder: merges category config with free
// Blockera from .pr-env.json (or optional CLI download URL), downloading
// Actions artifacts via download-artifact.sh when needed.
// create-wp-env.js
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const [category] = process.argv.slice(2);
const [blockeraDownloadUrl] = process.argv.slice(3);

const ARTIFACT_URL_PATTERN =
	/^https:\/\/github\.com\/[^/]+\/[^/]+\/actions\/runs\/\d+\/artifacts\/\d+\/?$/;

// https://github.com/blockeraai/blockera/tree/feat/minor-improvements
const GITHUB_TREE_URL_PATTERN =
	/^https:\/\/github\.com\/([^/]+)\/([^/]+)\/tree\/(.+?)\/?$/;

const DEFAULT_FREE_REPO = {
	owner: 'blockeraai',
	repo: 'blockera',
	branch: 'master',
};

const FREE_EXTRACT_DIR = '.github/cache/blockera-free';
const DOWNLOAD_SCRIPT = path.join(__dirname, 'download-artifact.sh');

function requireGitHubToken() {
	if (!process.env.GITHUB_TOKEN) {
		throw new Error(
			'GITHUB_TOKEN is required to download GitHub Actions artifacts for wp-env. ' +
				'Set secrets.BLOCKERABOT_PAT on the workflow step that runs create-wp-env-pro.js.'
		);
	}
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
		throw new Error(`Failed to download Blockera free artifact: ${label}`);
	}

	console.log(
		`Resolved Blockera free (${label}) to local wp-env source: ${resolvedPath}`
	);
	return resolvedPath;
}

function downloadFreeBranch({ owner, repo, branch }, label) {
	return downloadFreeArtifact(
		['--owner', owner, '--repo', repo, '--branch', branch],
		label
	);
}

// GitHub Actions artifact page URLs / free branch refs are not valid wp-env
// sources. Download + extract them to a local path that wp-env can mount.
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

function resolvePlugins(plugins) {
	return plugins.map(resolvePluginSource);
}

function getPrEnvPlugins(prEnv) {
	const plugins = Array.isArray(prEnv?.plugins) ? [...prEnv.plugins] : [];
	const hasFreeSource = plugins.some((plugin) => plugin !== '.');

	if (!hasFreeSource) {
		const defaultTreeUrl = `https://github.com/${DEFAULT_FREE_REPO.owner}/${DEFAULT_FREE_REPO.repo}/tree/${DEFAULT_FREE_REPO.branch}`;
		console.log(
			`No free plugin in .pr-env.json; defaulting to ${defaultTreeUrl}`
		);
		plugins.push(defaultTreeUrl);
	}

	return plugins;
}

// Read the .pr-env.json file when present (PR-specific free plugin source).
let prEnv = { plugins: [] };
if (fs.existsSync('.pr-env.json')) {
	prEnv = JSON.parse(fs.readFileSync('.pr-env.json', 'utf-8'));
}

let wpEnvFilePath = '.github/wp-env-configs/' + category + '.json';

// While env file not exists we should use of general env file.
if (!fs.existsSync(wpEnvFilePath)) {
	wpEnvFilePath = '.github/wp-env-configs/general.json';
}

// Read the config from wp-env-configs files.
const wpEnvConfig = JSON.parse(fs.readFileSync(wpEnvFilePath, 'utf-8'));

const extraPlugins = blockeraDownloadUrl
	? [blockeraDownloadUrl]
	: getPrEnvPlugins(prEnv);

// Create the .wp-env.json content.
const wpEnvContent = {
	...(wpEnvConfig.hasOwnProperty('themes')
		? { themes: wpEnvConfig.themes }
		: {}),
	plugins: [
		...new Set(
			resolvePlugins([...(wpEnvConfig?.plugins || []), ...extraPlugins])
		),
	],
	config: {
		WP_DEBUG: false,
		SCRIPT_DEBUG: false,
		BLOCKERA_TELEMETRY_OPT_IN_OFF: true,
	},
	...(wpEnvConfig.hasOwnProperty('lifecycleScripts')
		? { lifecycleScripts: wpEnvConfig.lifecycleScripts }
		: {}),
};

// Write to .wp-env.json
fs.writeFileSync(
	'.wp-env.json',
	JSON.stringify(wpEnvContent, null, 2),
	'utf-8'
);
