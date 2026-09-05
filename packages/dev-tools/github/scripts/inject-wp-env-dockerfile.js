/**
 * Rewrite wp-env WordPress Dockerfiles so every `apt-get install` wipes
 * lists and refreshes indexes in the same RUN (avoids Hit: on stale
 * debian-security indexes from cached WordPress image layers).
 *
 * Flags come from this package's `root-configs/.docker/Dockerfile.wordpress`
 * unless BLOCKERA_WP_ENV_DOCKERFILE is set. Host `.docker/` is the bootstrap
 * copy for local docker builds, not the inject source (it can lag the pin).
 *
 * Env:
 *   BLOCKERA_WP_ENV_DOCKERFILE        optional path to Dockerfile.wordpress
 *   BLOCKERA_WP_ENV_SKIP_DOCKER_PATCH true = leave generated Dockerfiles as-is
 */
const fs = require('fs');
const path = require('path');

const WORDPRESS_DOCKERFILE_NAMES = new Set([
	'WordPress.Dockerfile',
	'Tests-WordPress.Dockerfile',
]);

function bundledWordpressDockerfilePath() {
	return path.join(
		__dirname,
		'..',
		'..',
		'root-configs',
		'.docker',
		'Dockerfile.wordpress'
	);
}

function resolveWordpressDockerfilePath() {
	if (process.env.BLOCKERA_WP_ENV_DOCKERFILE) {
		return process.env.BLOCKERA_WP_ENV_DOCKERFILE;
	}

	return bundledWordpressDockerfilePath();
}

function collapseDockerfileContinuations(contents) {
	return contents.replace(/\\\r?\n/g, ' ').replace(/[ \t]+/g, ' ');
}

function getAptInstallPrefix(dockerfileContents) {
	const collapsed = collapseDockerfileContinuations(dockerfileContents);
	const runMatch = collapsed.match(
		/RUN ((?:rm -rf \/var\/lib\/apt\/lists\/\* && )?apt-get update\b(?: [^&]+)? && apt-get(?: -[^\s]+)* install(?:(?: -o \S+)|(?: --[^\s]+)|(?: -[^\s]+))*)/
	);

	if (!runMatch) {
		throw new Error(
			'inject-wp-env-dockerfile: Dockerfile.wordpress needs a RUN that wipes apt lists, apt-get update, and apt-get install'
		);
	}

	return runMatch[1].trim();
}

function isWordpressDockerfilePath(filePath) {
	return WORDPRESS_DOCKERFILE_NAMES.has(path.basename(String(filePath)));
}

function patchAptGetInstallRun(line, prefix) {
	if (!/^\s*RUN\s+/.test(line)) {
		return line;
	}

	if (!/\bapt-get\b/.test(line) || !/\binstall\b/.test(line)) {
		return line;
	}

	if (/\bapt-get\s+update\b/.test(line) && /&&/.test(line)) {
		return line;
	}

	return line.replace(
		/apt-get(?:\s+\S+)*\s+install(?:\s+(?:-o\s+\S+|--\S+|-\S+))*/,
		prefix
	);
}

function patchWordPressDockerfile(contents, prefix) {
	return contents
		.split('\n')
		.map((line) => patchAptGetInstallRun(line, prefix))
		.join('\n');
}

function injectWordpressDockerfileWrite(contents) {
	const dockerfilePath = resolveWordpressDockerfilePath();

	if (!fs.existsSync(dockerfilePath)) {
		throw new Error(
			`inject-wp-env-dockerfile: missing ${dockerfilePath}`
		);
	}

	const prefix = getAptInstallPrefix(fs.readFileSync(dockerfilePath, 'utf8'));

	return patchWordPressDockerfile(contents, prefix);
}

module.exports = {
	WORDPRESS_DOCKERFILE_NAMES,
	bundledWordpressDockerfilePath,
	getAptInstallPrefix,
	injectWordpressDockerfileWrite,
	isWordpressDockerfilePath,
	patchWordPressDockerfile,
	resolveWordpressDockerfilePath,
};
