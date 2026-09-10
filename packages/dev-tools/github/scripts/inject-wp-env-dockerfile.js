/**
 * Rewrite wp-env WordPress Dockerfiles so every `apt-get update` and
 * `apt-get install` retargets apt off deb.debian.org (Fastly POPs 404
 * debian-security pool files). EOL Debian suites (stretch, buster,
 * bullseye) use archive.debian.org; current suites use ftp.debian.org /
 * security.debian.org. Also inserts bullseye archive.debian.org source
 * RUNs next to wp-env's stretch/buster archive layers. Wipes lists,
 * ignores expired InRelease files, and refreshes indexes in the same
 * RUN as each install.
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
	const runMatch = collapsed.match(/RUN (.+)\s+\$PHPIZE_DEPS\b/);

	if (!runMatch) {
		throw new Error(
			'inject-wp-env-dockerfile: Dockerfile.wordpress needs a RUN … $PHPIZE_DEPS layer'
		);
	}

	return runMatch[1].trim();
}

function getAptUpdatePrefix(installPrefix) {
	const installIdx = installPrefix.lastIndexOf('apt-get -qy install');

	if (installIdx === -1) {
		throw new Error(
			'inject-wp-env-dockerfile: install prefix needs apt-get -qy install'
		);
	}

	return installPrefix.slice(0, installIdx).replace(/&&\s*$/, '').trim();
}

function isWordpressDockerfilePath(filePath) {
	return WORDPRESS_DOCKERFILE_NAMES.has(path.basename(String(filePath)));
}

function alreadyPatchedAptRun(line) {
	return (
		/VERSION_CODENAME/.test(line) && /\/var\/lib\/apt\/lists/.test(line)
	);
}

/**
 * wp-env archives stretch/buster sources but not bullseye. After bullseye
 * LTS (2026-08-31), security.debian.org 404s pool files. Insert matching
 * archive.debian.org RUNs so apt still works even if an older inject
 * prefix rewrites remaining deb.debian.org URLs to ftp/security.
 */
const APT_SOURCES_LIST = '/etc/apt/sources.list';

const BULLSEYE_ARCHIVE_RUNS = [
	`RUN sed -i 's|deb.debian.org/debian bullseye|archive.debian.org/debian bullseye|g' ${APT_SOURCES_LIST}`,
	`RUN sed -i 's|deb.debian.org/debian-security bullseye-security|archive.debian.org/debian-security bullseye-security|g' ${APT_SOURCES_LIST}`,
	`RUN sed -i 's|security.debian.org/debian-security bullseye-security|archive.debian.org/debian-security bullseye-security|g' ${APT_SOURCES_LIST}`,
	`RUN sed -i 's|ftp.debian.org/debian bullseye|archive.debian.org/debian bullseye|g' ${APT_SOURCES_LIST}`,
	`RUN sed -i '/bullseye-updates/d' ${APT_SOURCES_LIST}`,
].join('\n');

function insertBullseyeArchiveRuns(contents) {
	if (contents.includes('archive.debian.org/debian bullseye')) {
		return contents;
	}

	const busterUpdatesLine =
		/^RUN sed -i '\/buster-updates\/d'(?: \/etc\/apt\/sources\.list)?$/m;
	const match = contents.match(busterUpdatesLine);

	if (!match) {
		return contents;
	}

	const originalLine = match[0].includes(APT_SOURCES_LIST)
		? match[0]
		: `${match[0]} ${APT_SOURCES_LIST}`;

	return contents.replace(match[0], `${originalLine}\n${BULLSEYE_ARCHIVE_RUNS}`);
}

function escapeReplaceReplacement(str) {
	return String(str).replace(/\$/g, '$$$$');
}

function patchAptGetInstallRun(line, prefix) {
	if (!/^\s*RUN\s+/.test(line)) {
		return line;
	}

	if (!/\bapt-get\b/.test(line) || !/\binstall\b/.test(line)) {
		return line;
	}

	if (alreadyPatchedAptRun(line)) {
		return line;
	}

	return line.replace(
		/^(\s*RUN\s+).*?\bapt-get(?:\s+\S+)*\s+install(?:\s+(?:-o\s+\S+|--\S+|-\S+))*/,
		`$1${escapeReplaceReplacement(prefix)}`
	);
}

function patchAptGetUpdateRun(line, updatePrefix) {
	if (!/^\s*RUN\s+/.test(line)) {
		return line;
	}

	if (!/\bapt-get\b/.test(line) || !/\bupdate\b/.test(line)) {
		return line;
	}

	if (/\binstall\b/.test(line)) {
		return line;
	}

	if (alreadyPatchedAptRun(line)) {
		return line;
	}

	return line.replace(
		/^(\s*RUN\s+).*/,
		`$1${escapeReplaceReplacement(updatePrefix)}`
	);
}

function patchWordPressDockerfile(contents, prefix) {
	const updatePrefix = getAptUpdatePrefix(prefix);

	return insertBullseyeArchiveRuns(
		contents
			.split('\n')
			.map((line) => patchAptGetInstallRun(line, prefix))
			.map((line) => patchAptGetUpdateRun(line, updatePrefix))
			.join('\n')
	);
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
	getAptUpdatePrefix,
	injectWordpressDockerfileWrite,
	insertBullseyeArchiveRuns,
	isWordpressDockerfilePath,
	patchWordPressDockerfile,
	resolveWordpressDockerfilePath,
};
