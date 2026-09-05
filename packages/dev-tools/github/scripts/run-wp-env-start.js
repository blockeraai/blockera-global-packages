#!/usr/bin/env node
/**
 * `wp-env start` with the WordPress Dockerfile apt-get patch preloaded.
 *
 * Extra argv is forwarded to `wp-env start` (`--spx`, `--xdebug=profile`, …).
 * Puts `node_modules/.bin` and `@wordpress/env/bin` on PATH so afterStart
 * hooks that shell out to `wp-env run cli` resolve (not only `node bin/wp-env`).
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

function wpEnvStartChildEnv(wpEnvBin, fromDir = process.cwd()) {
	const preload = path.join(__dirname, 'preload-wp-env-docker-patch.js');
	const requireFlag = `--require=${preload}`;
	const nodeOptions = process.env.NODE_OPTIONS
		? `${process.env.NODE_OPTIONS} ${requireFlag}`
		: requireFlag;
	const npmBin = path.join(fromDir, 'node_modules', '.bin');
	const pkgBin = path.dirname(wpEnvBin);
	const pathParts = [npmBin, pkgBin];
	const existingPath = process.env.PATH || '';

	if (existingPath) {
		pathParts.push(existingPath);
	}

	return {
		...process.env,
		NODE_OPTIONS: nodeOptions,
		PATH: pathParts.join(path.delimiter),
	};
}

function startWpEnv(args = process.argv.slice(2)) {
	let wpEnv;

	try {
		wpEnv = resolveWpEnvBin();
	} catch (error) {
		console.error(error.message);
		process.exit(1);
	}

	const child = spawn(process.execPath, [wpEnv, 'start', ...args], {
		stdio: 'inherit',
		env: wpEnvStartChildEnv(wpEnv),
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
	wpEnvStartChildEnv,
};
