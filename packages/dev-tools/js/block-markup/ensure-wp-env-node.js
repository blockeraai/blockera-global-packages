#!/usr/bin/env node
/**
 * Download a Linux Node binary into the product `.cache/wp-env-node`
 * so PHPUnit inside wp-env `tests-wordpress` can run block-markup prettier.
 *
 * Usage: node ensure-wp-env-node.js [productRoot]
 */

const fs = require('fs');
const https = require('https');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');

const NODE_VERSION = '20.19.0';

const productRoot = path.resolve(process.argv[2] || process.cwd());
const destDir = path.join(productRoot, '.cache', 'wp-env-node');
const destBin = path.join(destDir, 'bin', 'node');

/**
 * @return {string} nodejs.org arch (linux-x64 | linux-arm64).
 */
function linuxArch() {
	let machine = '';

	try {
		machine = execSync('npx --no-install wp-env run tests-wordpress uname -m', {
			encoding: 'utf8',
			stdio: ['ignore', 'pipe', 'ignore'],
		});
		const lines = String(machine).trim().split('\n');
		machine = lines[lines.length - 1];
	} catch (error) {
		machine = os.arch();
	}

	const normalized = String(machine).toLowerCase();

	if (
		normalized.indexOf('arm64') !== -1 ||
		normalized.indexOf('aarch64') !== -1
	) {
		return 'linux-arm64';
	}

	return 'linux-x64';
}

/**
 * @param {string} url File URL.
 * @param {string} dest Path to write.
 * @return {Promise<void>}
 */
function download(url, dest) {
	return new Promise((resolve, reject) => {
		const file = fs.createWriteStream(dest);
		https
			.get(url, (response) => {
				if (response.statusCode === 302 || response.statusCode === 301) {
					file.close();
					fs.unlinkSync(dest);
					download(response.headers.location, dest).then(resolve, reject);
					return;
				}

				if (response.statusCode !== 200) {
					file.close();
					reject(new Error(`Download failed: ${response.statusCode} ${url}`));
					return;
				}

				response.pipe(file);
				file.on('finish', () => {
					file.close(resolve);
				});
			})
			.on('error', reject);
	});
}

(async () => {
	if (fs.existsSync(destBin)) {
		process.stdout.write(`wp-env node already present: ${destBin}\n`);
		return;
	}

	const arch = linuxArch();
	const tarballName = `node-v${NODE_VERSION}-${arch}.tar.gz`;
	const url = `https://nodejs.org/dist/v${NODE_VERSION}/${tarballName}`;
	const tmp = path.join(os.tmpdir(), tarballName);

	process.stdout.write(`Downloading ${url}\n`);
	await download(url, tmp);

	fs.mkdirSync(destDir, { recursive: true });
	execSync(`tar -xzf ${JSON.stringify(tmp)} -C ${JSON.stringify(destDir)} --strip-components=1`, {
		stdio: 'inherit',
		shell: true,
	});
	fs.unlinkSync(tmp);

	if (!fs.existsSync(destBin)) {
		throw new Error(`Node binary missing after extract: ${destBin}`);
	}

	fs.chmodSync(destBin, 0o755);
	process.stdout.write(`Installed wp-env node at ${destBin}\n`);
})().catch((error) => {
	process.stderr.write(String(error && error.stack ? error.stack : error) + '\n');
	process.exit(1);
});
