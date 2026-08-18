#!/usr/bin/env node

/**
 * Host-repo bootstrap: clean up generated state, then sync-config
 * (source-codes symlink, `.cursor` templates, and root-configs/).
 *
 * Run from the consuming project root:
 *   node packages/global-packages/packages/dev-tools/js/bootstrap/bootstrap-project.js --project=<id>
 */

const fs = require('fs');
const path = require('path');
const { writeRootConfigs } = require('../root-configs/write-root-configs');
const {
	DEFAULT_LOGO_WIDTH,
	formatIndentedSectionHeading,
	measureArtWidth,
	writeSectionHeadingWidth,
} = require('../cli/section-heading');
const { formatDuration } = require('../cli/format-duration');

const PROJECT_IDS = [
	'blockera',
	'blockera-pro',
	'blockera-one',
	'blockera-site-toolkit',
];
const FALLBACK_PROJECT_ID = 'blockera';
const LOGO_ARTS_DIR = 'logo-arts';
const SHARED_TEMPLATES = 'shared';

const ENV_SOURCE_CODES = 'BLOCKERA_EXTERNAL_SOURCE_CODES_PATH';
const ENV_SOURCE_CODES_PLACEHOLDER = '/absolute/path/to/shared/source-codes';
const STEP_COUNT = 2;

const useColor =
	process.env.NO_COLOR === undefined &&
	(Boolean(process.stdout.isTTY) || Boolean(process.env.FORCE_COLOR));

const ansi = {
	reset: 0,
	bold: 1,
	dim: 2,
	red: 31,
	green: 32,
	cyan: 36,
};

function paint(codes, text) {
	if (!useColor) {
		return text;
	}

	const seq = (Array.isArray(codes) ? codes : [codes])
		.map((code) => `\u001b[${code}m`)
		.join('');

	return `${seq}${text}\u001b[${ansi.reset}m`;
}

const color = {
	bold: (text) => paint(ansi.bold, text),
	dim: (text) => paint(ansi.dim, text),
	red: (text) => paint(ansi.red, text),
	cyan: (text) => paint(ansi.cyan, text),
	title: (text) => paint([ansi.bold, ansi.cyan], text),
	ok: (text) => paint([ansi.bold, ansi.green], text),
	err: (text) => paint([ansi.bold, ansi.red], text),
	star: (text) => paint(ansi.green, text),
};

const pendingBootstrapLog = [];
let bootstrapLogPath = null;

function writeBootstrapLog(message) {
	const line = `${message}\n`;

	if (bootstrapLogPath) {
		fs.appendFileSync(bootstrapLogPath, line);
		return;
	}

	pendingBootstrapLog.push(line);
}

function openBootstrapLog(logPath) {
	bootstrapLogPath = logPath;
	fs.writeFileSync(logPath, pendingBootstrapLog.join(''));
	pendingBootstrapLog.length = 0;
}

function printOut(message) {
	// @debug-ignore — CLI stdout for project bootstrap
	console.log(message);
	writeBootstrapLog(message);
}

function printErr(message) {
	// @debug-ignore — CLI stderr for project bootstrap
	console.error(message);
	writeBootstrapLog(message);
}

function readLogoLines(projectId) {
	const filePath = path.join(__dirname, LOGO_ARTS_DIR, `${projectId}.txt`);

	if (!fs.existsSync(filePath)) {
		return null;
	}

	const lines = fs
		.readFileSync(filePath, 'utf8')
		.replace(/\r\n/g, '\n')
		.replace(/\r/g, '\n')
		.split('\n');

	while (lines.length && lines[lines.length - 1] === '') {
		lines.pop();
	}

	return lines.length ? lines : null;
}

function loadLogoArt(projectId) {
	return readLogoLines(projectId) || readLogoLines(FALLBACK_PROJECT_ID) || [];
}

let logoWidth = 0;

function printLogo(projectId) {
	const art = loadLogoArt(projectId);

	if (!art.length) {
		return;
	}

	logoWidth = measureArtWidth(art);

	printOut('');
	art.forEach((line) => {
		printOut(line.replace(/\*/g, () => color.star('*')));
	});
	printOut('');
}

function banner() {
	printOut('');
	printOut(
		color.cyan(
			formatIndentedSectionHeading('Bootstrap', logoWidth, {
				weight: 'heavy',
			})
		)
	);
	printOut('');
}

function finishBootstrap() {
	const greenHeading = color.ok(
		formatIndentedSectionHeading('Bootstrap', logoWidth)
	);

	if (bootstrapLogPath && fs.existsSync(bootstrapLogPath)) {
		const text = fs
			.readFileSync(bootstrapLogPath, 'utf8')
			.replace(/^.*[─━]{2} Bootstrap[^\n]*/m, greenHeading);

		fs.writeFileSync(bootstrapLogPath, text);
		process.stdout.write('\x1b[2J\x1b[3J\x1b[H');
		process.stdout.write(text.endsWith('\n') ? text : `${text}\n`);
	}

	printOut('');
}

function stepLabel(index) {
	return color.dim(`[${index}/${STEP_COUNT}]`);
}

const ANSI_PATTERN = /\u001b\[[0-9;]*m/g;
const COMPACT_INNER_COLUMNS = 3;
const INNER_INDENT = '           ';

function visibleLength(text) {
	return String(text).replace(ANSI_PATTERN, '').length;
}

function padVisible(text, width) {
	const extra = width - visibleLength(text);

	return extra > 0 ? `${text}${' '.repeat(extra)}` : text;
}

/**
 * Compact inner names into a 3-column table that stays within the logo width.
 * Names wider than one column print on their own line.
 *
 * @param {number} index Step number.
 * @param {string} name Step title.
 * @param {number} durationMs Step duration.
 * @param {{ name: string }[]} inners Completed items.
 */
function logStepWithCompactInners(index, name, durationMs, inners) {
	const left = `  ${stepLabel(index)}  ${color.ok('✔')}  ${color.bold(name)}`;
	const right = color.dim(formatDuration(durationMs));
	const width = logoWidth || DEFAULT_LOGO_WIDTH;
	const pad = Math.max(
		1,
		width - visibleLength(left) - visibleLength(right)
	);

	printOut(`${left}${' '.repeat(pad)}${right}`);

	const available = Math.max(8, width - INNER_INDENT.length);
	const columnWidth = Math.max(
		1,
		Math.floor(available / COMPACT_INNER_COLUMNS)
	);
	const short = [];
	const long = [];

	inners.forEach((inner) => {
		const cell = `${color.ok('✔')} ${color.bold(inner.name)}`;

		if (visibleLength(cell) > columnWidth) {
			long.push(cell);
			return;
		}

		short.push(cell);
	});

	for (let i = 0; i < short.length; i += COMPACT_INNER_COLUMNS) {
		const row = short
			.slice(i, i + COMPACT_INNER_COLUMNS)
			.map((cell, offset, cells) =>
				offset === cells.length - 1
					? cell
					: padVisible(cell, columnWidth)
			)
			.join('');

		printOut(`${INNER_INDENT}${row}`);
	}

	long.forEach((cell) => {
		printOut(`${INNER_INDENT}${cell}`);
	});

	printOut('');
}

function fail(message, guide) {
	printErr('');
	printErr(`  ${color.err('✖')}  ${color.bold('bootstrap failed')}`);
	printErr(`           ${color.red(message)}`);

	if (guide && guide.length) {
		printErr('');
		printErr(`  ${color.bold('How to fix')}`);

		guide.forEach((line, index) => {
			const parts = String(line).split('\n');

			printErr(`           ${color.dim(`${index + 1}.`)} ${parts[0]}`);

			parts.slice(1).forEach((extra) => {
				printErr(`              ${color.dim(extra)}`);
			});
		});
	}

	printErr('');
	process.exit(1);
}

function parseProjectId(argv) {
	const prefix = '--project=';
	const arg = argv.find((item) => item.startsWith(prefix));

	if (!arg) {
		fail(`missing --project=<id> (one of: ${PROJECT_IDS.join(', ')})`);
	}

	const id = arg.slice(prefix.length).trim();

	if (!PROJECT_IDS.includes(id)) {
		fail(`unknown --project=${id} (one of: ${PROJECT_IDS.join(', ')})`);
	}

	return id;
}

function loadEnv(envPath) {
	const parsed = {};

	if (!fs.existsSync(envPath)) {
		return parsed;
	}

	const text = fs.readFileSync(envPath, 'utf8');

	for (const rawLine of text.split(/\r?\n/)) {
		const line = rawLine.trim();

		if (!line || line.startsWith('#')) {
			continue;
		}

		const eq = line.indexOf('=');

		if (eq === -1) {
			continue;
		}

		const key = line.slice(0, eq).trim();
		let value = line.slice(eq + 1).trim();

		if (
			(value.startsWith('"') && value.endsWith('"')) ||
			(value.startsWith("'") && value.endsWith("'"))
		) {
			value = value.slice(1, -1);
		}

		parsed[key] = value;
	}

	return parsed;
}

function skipGitkeep(src) {
	return path.basename(src) !== '.gitkeep';
}

function copyTemplateTree(fromDir, toDir) {
	if (!fs.existsSync(fromDir)) {
		fail(`template folder missing: ${fromDir}`);
	}

	fs.cpSync(fromDir, toDir, {
		recursive: true,
		filter: skipGitkeep,
	});
}

function cleanUp(root) {
	const started = Date.now();
	const dist = path.join(root, 'dist');
	const cacheDir = path.join(root, '.cache');
	const cursorDir = path.join(root, '.cursor');
	const logPath = path.join(cacheDir, 'watch-bootstrap.log');

	fs.rmSync(dist, { recursive: true, force: true });
	fs.rmSync(cacheDir, { recursive: true, force: true });
	fs.rmSync(cursorDir, { recursive: true, force: true });
	fs.mkdirSync(cacheDir, { recursive: true });
	writeSectionHeadingWidth(root, logoWidth);
	openBootstrapLog(logPath);

	logStepWithCompactInners(1, 'clean up', Date.now() - started, [
		{ name: 'dist/' },
		{ name: '.cache/' },
		{ name: '.cursor/' },
	]);
}

function syncCursor(root, projectId) {
	const templatesRoot = path.join(__dirname, '..', '..', 'cursor');
	const sharedDir = path.join(templatesRoot, SHARED_TEMPLATES);
	const overlayDir = path.join(templatesRoot, projectId);
	const cursorDir = path.join(root, '.cursor');

	fs.rmSync(cursorDir, { recursive: true, force: true });
	fs.mkdirSync(cursorDir, { recursive: true });

	copyTemplateTree(sharedDir, cursorDir);

	if (fs.existsSync(overlayDir)) {
		copyTemplateTree(overlayDir, cursorDir);

		return {
			name: '.cursor/',
			detail: `copied shared templates + ${projectId} overlay`,
		};
	}

	return {
		name: '.cursor/',
		detail: 'copied shared templates',
	};
}

function sourceCodesGuide() {
	return [
		`Copy .env.example to .env if this project has no .env yet.`,
		`Add this line to .env (absolute path, not the placeholder):\n${ENV_SOURCE_CODES}=${ENV_SOURCE_CODES_PLACEHOLDER}`,
		`Point it at the shared clones folder (block-editor, wordpress, woocommerce, …).`,
		`Run npm run project:bootstrap again (or npm run start).`,
	];
}

function syncSourceCodes(root, env) {
	const raw = (env[ENV_SOURCE_CODES] || '').trim();

	if (!raw || raw === ENV_SOURCE_CODES_PLACEHOLDER) {
		fail(`${ENV_SOURCE_CODES} is not set in .env`, sourceCodesGuide());
	}

	const target = path.resolve(raw);

	if (!fs.existsSync(target)) {
		fail(`${ENV_SOURCE_CODES} does not exist: ${target}`, [
			`Open .env in the project root.`,
			`Set ${ENV_SOURCE_CODES} to a folder that exists on this machine.`,
			`That folder should contain the shared clones (block-editor, wordpress, woocommerce, …).`,
			`Run npm run project:bootstrap again (or npm run start).`,
		]);
	}

	const linkPath = path.join(root, 'source-codes');

	fs.rmSync(linkPath, { recursive: true, force: true });
	fs.symlinkSync(target, linkPath, 'dir');

	return {
		name: 'source-codes',
		detail: `linked → ${target}`,
	};
}

function bootstrapSyncConfig(root, projectId, env) {
	const started = Date.now();
	const inners = [];

	try {
		inners.push(syncSourceCodes(root, env));
		inners.push(syncCursor(root, projectId));
		inners.push(...writeRootConfigs({ root, projectId }));
	} catch (error) {
		fail(error.message || String(error));
	}

	logStepWithCompactInners(2, 'sync-config', Date.now() - started, inners);
}

function main() {
	const projectId = parseProjectId(process.argv.slice(2));
	const root = process.cwd();
	const env = loadEnv(path.join(root, '.env'));

	printLogo(projectId);
	banner();

	cleanUp(root);
	bootstrapSyncConfig(root, projectId, env);
	finishBootstrap();
}

main();
