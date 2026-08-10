#!/usr/bin/env node
/**
 * Load consumer `.github/blockera-ci.json` merged over shared defaults.
 *
 * Usage:
 *   node load-ci-config.js [config-path]              # print merged JSON
 *   node load-ci-config.js [config-path] --get a.b.c  # print one value
 *
 * Env:
 *   CONFIG_PATH — default consumer config path when argv omits it
 */
const fs = require('fs');
const path = require('path');

const DEFAULTS_PATH = path.join(__dirname, '../config/defaults.json');

function deepMerge(base, override) {
	if (override === undefined) {
		return base;
	}
	if (
		override === null ||
		Array.isArray(override) ||
		typeof override !== 'object'
	) {
		return override;
	}
	if (base === null || typeof base !== 'object' || Array.isArray(base)) {
		return { ...override };
	}

	const out = { ...base };
	for (const [key, value] of Object.entries(override)) {
		out[key] = key in base ? deepMerge(base[key], value) : value;
	}
	return out;
}

function getByPath(obj, dotted) {
	return dotted.split('.').reduce((acc, key) => {
		if (acc === undefined || acc === null) {
			return undefined;
		}
		return acc[key];
	}, obj);
}

function load(consumerPath = '.github/blockera-ci.json') {
	if (!fs.existsSync(DEFAULTS_PATH)) {
		throw new Error(`Missing shared defaults: ${DEFAULTS_PATH}`);
	}
	if (!fs.existsSync(consumerPath)) {
		throw new Error(`Missing consumer config: ${consumerPath}`);
	}

	const defaults = JSON.parse(fs.readFileSync(DEFAULTS_PATH, 'utf8'));
	const consumer = JSON.parse(fs.readFileSync(consumerPath, 'utf8'));
	return deepMerge(defaults, consumer);
}

function main(argv) {
	let configPath = process.env.CONFIG_PATH || '.github/blockera-ci.json';
	let getPath = null;

	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === '--get') {
			getPath = argv[++i];
			continue;
		}
		if (arg.startsWith('-')) {
			throw new Error(`Unknown flag: ${arg}`);
		}
		configPath = arg;
	}

	const cfg = load(configPath);

	if (getPath) {
		const value = getByPath(cfg, getPath);
		if (value === undefined) {
			process.stderr.write(
				`Missing config path '${getPath}' after merging defaults + ${configPath}\n`
			);
			process.exit(1);
		}
		if (typeof value === 'object') {
			process.stdout.write(JSON.stringify(value));
		} else {
			process.stdout.write(String(value));
		}
		return;
	}

	process.stdout.write(JSON.stringify(cfg));
}

if (require.main === module) {
	try {
		main(process.argv.slice(2));
	} catch (error) {
		process.stderr.write(`${error.message || error}\n`);
		process.exit(1);
	}
}

module.exports = { load, deepMerge, getByPath, DEFAULTS_PATH };
