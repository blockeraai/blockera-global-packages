/**
 * Internal dependencies
 */
const fs = require('fs');
const path = require('path');
const {
	bundledWordpressDockerfilePath,
	getAptInstallPrefix,
	getAptUpdatePrefix,
	isWordpressDockerfilePath,
	patchWordPressDockerfile,
	resolveWordpressDockerfilePath,
} = require('../inject-wp-env-dockerfile');

describe('inject-wp-env-dockerfile', () => {
	const template = fs.readFileSync(bundledWordpressDockerfilePath(), 'utf8');
	const prefix = getAptInstallPrefix(template);

	it('parses wipe-lists, mirror rewrite, update, and install flags from the template', () => {
		expect(prefix).toContain('security.debian.org');
		expect(prefix).toContain('ftp.debian.org');
		expect(prefix).toContain('archive.debian.org');
		expect(prefix).toContain('VERSION_CODENAME');
		expect(prefix).toContain('bullseye');
		expect(prefix).toContain('rm -rf /var/lib/apt/lists/*');
		expect(prefix).toContain('Acquire::Check-Valid-Until=false');
		expect(prefix).toContain('--allow-releaseinfo-change');
		expect(prefix).toContain('Apt::Get::AllowUnauthenticated=true');
		expect(prefix).toContain('Acquire::Retries=5');
		expect(prefix).not.toContain('--fix-missing');
		expect(prefix).not.toContain('$PHPIZE_DEPS');
		expect(getAptUpdatePrefix(prefix)).toContain(
			'Acquire::Check-Valid-Until=false'
		);
		expect(getAptUpdatePrefix(prefix)).not.toContain('apt-get -qy install');
	});

	it('wipes lists and refreshes indexes in the same RUN as each apt-get install', () => {
		const generated = `FROM wordpress:php7.4

RUN apt-get clean
RUN apt-get -qy update
RUN apt-get -qy install $PHPIZE_DEPS && touch /usr/local/etc/php/php.ini
RUN apt-get -qy install git
RUN apt-get -qy install sudo
RUN apt-get install -qy zlib1g-dev
`;

		const patched = patchWordPressDockerfile(generated, prefix);

		expect(patched).toContain(
			`RUN ${prefix} $PHPIZE_DEPS && touch /usr/local/etc/php/php.ini`
		);
		expect(patched).toContain(`RUN ${prefix} git`);
		expect(patched).toContain(`RUN ${prefix} sudo`);
		expect(patched).toContain(`RUN ${prefix} zlib1g-dev`);
		expect(patched).toContain(
			"grep -Eq '^(stretch|buster|bullseye)$'"
		);
		expect(patched).toContain('${VERSION_CODENAME}');
		expect(patched).not.toContain('RUN apt-get -qy update');
		expect(patched).toContain(`RUN ${getAptUpdatePrefix(prefix)}`);
		expect(patched).toMatch(/RUN .*security\.debian\.org.* sudo/);
	});

	it('replaces update&&install RUNs that are missing the mirror rewrite', () => {
		const generated = `RUN apt-get update --allow-releaseinfo-change && apt-get -qy install sudo`;
		const patched = patchWordPressDockerfile(generated, prefix);

		expect(patched).toBe(`RUN ${prefix} sudo`);
		expect(patched).toContain('security.debian.org');
	});

	it('does not double-prefix a RUN that already rewrote mirrors and wiped lists', () => {
		const line = `RUN ${prefix} sudo`;

		expect(patchWordPressDockerfile(line, prefix)).toBe(line);
	});

	it('replaces a stale ftp/security inject prefix with the current template', () => {
		const stale =
			"RUN find /etc/apt -type f \\( -name '*.list' -o -name '*.sources' \\) -exec sed -i -e 's|https\\?://deb.debian.org/debian-security|http://security.debian.org/debian-security|g' -e 's|https\\?://deb.debian.org/debian|http://ftp.debian.org/debian|g' {} + && rm -rf /var/lib/apt/lists/* && apt-get -o Acquire::Check-Valid-Until=false update --allow-releaseinfo-change && apt-get -qy install -o Apt::Get::AllowUnauthenticated=true -o Acquire::Retries=5 $PHPIZE_DEPS && touch /usr/local/etc/php/php.ini";
		const patched = patchWordPressDockerfile(stale, prefix);

		expect(patched).toContain(`RUN ${prefix} $PHPIZE_DEPS`);
		expect(patched).toContain('VERSION_CODENAME');
	});

	it('inserts bullseye archive.debian.org seds after wp-env buster archive RUNs', () => {
		const generated = `FROM wordpress:php7.4
RUN sed -i 's|deb.debian.org/debian buster|archive.debian.org/debian buster|g' /etc/apt/sources.list
RUN sed -i '/buster-updates/d' /etc/apt/sources.list
RUN apt-get -qy install sudo
`;
		const patched = patchWordPressDockerfile(generated, prefix);

		expect(patched).toContain(
			"RUN sed -i '/buster-updates/d' /etc/apt/sources.list"
		);
		expect(patched).not.toMatch(/^RUN sed -i '\/buster-updates\/d'$/m);
		expect(patched).toContain(
			"s|deb.debian.org/debian bullseye|archive.debian.org/debian bullseye|g' /etc/apt/sources.list"
		);
		expect(patched).toContain(
			"s|security.debian.org/debian-security bullseye-security|archive.debian.org/debian-security bullseye-security|g' /etc/apt/sources.list"
		);
		expect(patched.indexOf('/buster-updates/d')).toBeLessThan(
			patched.indexOf('archive.debian.org/debian bullseye')
		);
	});

	it('restores /etc/apt/sources.list when wp-env omitted it on buster-updates', () => {
		const generated = `RUN sed -i '/buster-updates/d'
RUN apt-get -qy install sudo
`;
		const patched = patchWordPressDockerfile(generated, prefix);

		expect(patched).toContain(
			"RUN sed -i '/buster-updates/d' /etc/apt/sources.list"
		);
		expect(patched).not.toMatch(/^RUN sed -i '\/buster-updates\/d'$/m);
	});

	it('does not insert bullseye archive seds twice', () => {
		const generated = `RUN sed -i '/buster-updates/d' /etc/apt/sources.list
RUN sed -i 's|deb.debian.org/debian bullseye|archive.debian.org/debian bullseye|g' /etc/apt/sources.list
`;
		expect(patchWordPressDockerfile(generated, prefix)).toBe(generated);
	});

	it('retargets a standalone apt-get update so expired InRelease files do not fail the build', () => {
		const generated = `RUN apt-get clean
RUN apt-get -qy update
RUN apt-get -qy install sudo
`;
		const patched = patchWordPressDockerfile(generated, prefix);
		const updatePrefix = getAptUpdatePrefix(prefix);

		expect(patched).toContain('RUN apt-get clean');
		expect(patched).toContain(`RUN ${updatePrefix}`);
		expect(patched).toContain(`RUN ${prefix} sudo`);
		expect(patched).not.toMatch(/^RUN apt-get -qy update$/m);
	});

	it('only matches wp-env WordPress Dockerfiles', () => {
		expect(isWordpressDockerfilePath('/tmp/WordPress.Dockerfile')).toBe(
			true
		);
		expect(
			isWordpressDockerfilePath('/tmp/Tests-WordPress.Dockerfile')
		).toBe(true);
		expect(isWordpressDockerfilePath('/tmp/CLI.Dockerfile')).toBe(false);
	});

	it('keeps ARG PHP_VERSION and wordpress:php in the synced template', () => {
		expect(template).toMatch(/ARG PHP_VERSION=8\.2/);
		expect(template).toMatch(/FROM wordpress:php\$\{PHP_VERSION\}/);
		expect(template).toContain('rm -rf /var/lib/apt/lists/*');
		expect(template).toContain('archive.debian.org');
		expect(template).toContain('security.debian.org');
		expect(template).toContain('ftp.debian.org');
		expect(template).toContain('Acquire::Check-Valid-Until=false');
	});
});

describe('resolveWordpressDockerfilePath', () => {
	afterEach(() => {
		delete process.env.BLOCKERA_WP_ENV_DOCKERFILE;
	});

	it('uses this package root-configs template, not a lagging host .docker copy', () => {
		delete process.env.BLOCKERA_WP_ENV_DOCKERFILE;

		expect(resolveWordpressDockerfilePath()).toBe(
			bundledWordpressDockerfilePath()
		);
	});

	it('honors BLOCKERA_WP_ENV_DOCKERFILE', () => {
		process.env.BLOCKERA_WP_ENV_DOCKERFILE = '/tmp/custom.Dockerfile';

		expect(resolveWordpressDockerfilePath()).toBe('/tmp/custom.Dockerfile');
	});
});

describe('resolveWpEnvBin', () => {
	it('resolves bin/wp-env via package.json (exports block bin/)', () => {
		const { resolveWpEnvBin } = require('../run-wp-env-start');
		const bin = resolveWpEnvBin(process.cwd());

		expect(bin.replace(/\\/g, '/')).toMatch(
			/node_modules\/@wordpress\/env\/bin\/wp-env$/
		);
		expect(fs.existsSync(bin)).toBe(true);
	});
});

describe('wpEnvStartChildEnv', () => {
	it('puts wp-env on PATH for afterStart shell hooks', () => {
		const {
			resolveWpEnvBin,
			wpEnvStartChildEnv,
		} = require('../run-wp-env-start');
		const bin = resolveWpEnvBin(process.cwd());
		const env = wpEnvStartChildEnv(bin, process.cwd());
		const pathEntries = env.PATH.split(path.delimiter);

		expect(pathEntries[0].replace(/\\/g, '/')).toMatch(
			/node_modules\/\.bin$/
		);
		expect(pathEntries[1].replace(/\\/g, '/')).toBe(
			path.dirname(bin).replace(/\\/g, '/')
		);
		expect(env.NODE_OPTIONS).toContain('preload-wp-env-docker-patch.js');
	});
});

describe('prepare-build-env wp-env start staging', () => {
	it('copies run-wp-env-start.js and its preload/inject next to retry-wp-env-start.sh', () => {
		const prepare = fs.readFileSync(
			path.join(
				__dirname,
				'../jobs/build-plugin-zip-tests/prepare-build-env.sh'
			),
			'utf8'
		);

		expect(prepare).toContain('run-wp-env-start.js');
		expect(prepare).toContain('preload-wp-env-docker-patch.js');
		expect(prepare).toContain('inject-wp-env-dockerfile.js');
		expect(prepare).toContain('retry-wp-env-start.sh');
		expect(prepare).toContain('root-configs/.docker/Dockerfile.wordpress');
	});
});
