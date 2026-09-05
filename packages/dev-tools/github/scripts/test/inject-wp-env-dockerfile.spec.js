/**
 * Internal dependencies
 */
const fs = require('fs');
const path = require('path');
const {
	bundledWordpressDockerfilePath,
	getAptInstallPrefix,
	isWordpressDockerfilePath,
	patchWordPressDockerfile,
	resolveWordpressDockerfilePath,
} = require('../inject-wp-env-dockerfile');

describe('inject-wp-env-dockerfile', () => {
	const template = fs.readFileSync(bundledWordpressDockerfilePath(), 'utf8');
	const prefix = getAptInstallPrefix(template);

	it('parses wipe-lists, update, and install flags from the template', () => {
		expect(prefix).toContain('rm -rf /var/lib/apt/lists/*');
		expect(prefix).toContain('apt-get update --allow-releaseinfo-change');
		expect(prefix).toContain('Apt::Get::AllowUnauthenticated=true');
		expect(prefix).toContain('Acquire::Retries=5');
		expect(prefix).not.toContain('--fix-missing');
		expect(prefix).not.toContain('$PHPIZE_DEPS');
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
		expect(patched).toContain('RUN apt-get -qy update');
		expect(patched).toMatch(
			/RUN rm -rf \/var\/lib\/apt\/lists\/\* && apt-get update/
		);
	});

	it('does not double-prefix a RUN that already updates then installs', () => {
		const line = `RUN ${prefix} sudo`;

		expect(patchWordPressDockerfile(line, prefix)).toBe(line);
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
	});
});
