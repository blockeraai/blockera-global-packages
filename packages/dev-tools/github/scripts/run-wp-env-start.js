#!/usr/bin/env node
/**
 * `wp-env start` with the WordPress Dockerfile apt-get patch preloaded.
 *
 * Extra argv is forwarded to `wp-env start` (`--spx`, `--xdebug=profile`, …).
 *
 * Env:
 *   BLOCKERA_WP_ENV_DOCKERFILE
 *   BLOCKERA_WP_ENV_SKIP_DOCKER_PATCH
 */
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

function resolveWpEnvBin(fromDir = process.cwd()) {
	let pkgJson;

	try {
		pkgJson = require.resolve('@wordpress/env/package.json', {
			paths: [fromDir],
		});
	} catch (error) {
		throw new Error(
			'run-wp-env-start: @wordpress/env not found from cwd (resolve package.json)'
		);
	}

	const bin = path.join(path.dirname(pkgJson), 'bin', 'wp-env');

	if (!fs.existsSync(bin)) {
		throw new Error(`run-wp-env-start: missing ${bin}`);
	}

	return bin;
}

function startWpEnv(args = process.argv.slice(2)) {
	const preload = path.join(__dirname, 'preload-wp-env-docker-patch.js');
	const requireFlag = `--require=${preload}`;
	const nodeOptions = process.env.NODE_OPTIONS
		? `${process.env.NODE_OPTIONS} ${requireFlag}`
		: requireFlag;

	let wpEnv;

	try {
		wpEnv = resolveWpEnvBin();
	} catch (error) {
		console.error(error.message);
		process.exit(1);
	}

	const child = spawn(process.execPath, [wpEnv, 'start', ...args], {
		stdio: 'inherit',
		env: {
			...process.env,
			NODE_OPTIONS: nodeOptions,
		},
	});

	child.on('exit', (code, signal) => {
		if (signal) {
			process.kill(process.pid, signal);
			return;
		}

		process.exit(code ?? 1);
	});
}

if (require.main === module) {
	startWpEnv();
}

module.exports = {
	resolveWpEnvBin,
};
