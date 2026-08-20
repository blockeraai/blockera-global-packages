#!/usr/bin/env node

/**
 * Host-repo bootstrap: prepare workspace, then configure project files
 * (source-codes symlink, `.cursor` templates, and root-configs/).
 *
 * Run from the consuming project root:
 *   node packages/global-packages/packages/dev-tools/js/bootstrap/bootstrap-project.js --project=<id>
 *   node .../bootstrap-project.js --project=<id> --watch -- wp-scripts start --mode development
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { writeRootConfigs } = require('../root-configs/write-root-configs');
const {
	DEFAULT_LOGO_WIDTH,
	formatHeadingRight,
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
const WATCH_DEBOUNCE_MS = 200;
const DEV_TOOLS_ROOT = path.join(__dirname, '..', '..');
const WATCH_DIRS = [
	path.join(DEV_TOOLS_ROOT, 'root-configs'),
	path.join(DEV_TOOLS_ROOT, 'cursor'),
];

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

const displayLines = [];
let watchMode = false;
let syncCount = 1;
let quietStdout = false;
let keepProcessAlive = false;

function printOut(message) {
	// @debug-ignore — CLI stdout for project bootstrap
	if (quietStdout) {
		return;
	}

	// @debug-ignore
	console.log(message);
	writeBootstrapLog(message);
	displayLines.push(message);
}

function logDetail(message) {
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
			formatIndentedSectionHeading(
				'Bootstrap',
				logoWidth,
				bootstrapHeadingOptions({ done: false })
			)
		)
	);
	printOut('');
}

function isBootstrapHeadingLine(line) {
	const plain = String(line).replace(ANSI_PATTERN, '');

	return /Bootstrap/.test(plain) && /[─━]/.test(plain);
}

function bootstrapHeadingOptions({ done }) {
	const options = {
		weight: done ? 'light' : 'heavy',
		right: formatHeadingRight(
			done
				? watchMode && syncCount > 1
					? 'watching'
					: 'booted'
				: 'booting'
		),
	};

	if (watchMode) {
		options.meta = `#${syncCount}`;
	}

	return options;
}

function replaceDisplayLine(test, message) {
	const index = displayLines.findIndex((line) => test(line));

	if (index >= 0) {
		displayLines[index] = message;
		return;
	}

	displayLines.push(message);
}

function persistBootstrapLog() {
	const heading = color.ok(
		formatIndentedSectionHeading(
			'Bootstrap',
			logoWidth,
			bootstrapHeadingOptions({ done: true })
		)
	);

	const headingIndexes = displayLines
		.map((line, index) => (isBootstrapHeadingLine(line) ? index : -1))
		.filter((index) => index >= 0);

	if (headingIndexes.length) {
		displayLines[headingIndexes[0]] = heading;

		for (let i = headingIndexes.length - 1; i >= 1; i--) {
			displayLines.splice(headingIndexes[i], 1);
		}
	} else {
		displayLines.push(heading);
	}

	while (
		displayLines.length &&
		displayLines[displayLines.length - 1] === ''
	) {
		displayLines.pop();
	}

	const display = displayLines.join('\n');
	const text = display.endsWith('\n') ? display : `${display}\n`;

	if (bootstrapLogPath) {
		fs.writeFileSync(bootstrapLogPath, text);
	}

	return text;
}

function finishBootstrap({ clearScreen = true } = {}) {
	const text = persistBootstrapLog();

	if (!clearScreen) {
		return;
	}

	process.stdout.write('\x1b[2J\x1b[3J\x1b[H');
	process.stdout.write(text);

	if (!watchMode) {
		printOut('');
	}
}

function stepLabel(index) {
	return color.dim(`[${index}/${STEP_COUNT}]`);
}

const ANSI_PATTERN = /\u001b\[[0-9;]*m/g;
const DETAIL_INDENT = '           ';

function visibleLength(text) {
	return String(text).replace(ANSI_PATTERN, '').length;
}

function countLabel(count, singular, plural) {
	return `${count} ${count === 1 ? singular : plural}`;
}

/**
 * One stdout line per step (`15 paths · 37ms`). Item names go to the log only.
 *
 * @param {number} index Step number.
 * @param {string} name Step title.
 * @param {number} durationMs Step duration.
 * @param {{ name: string, detail?: string }[]} inners Completed items.
 * @param {{ singular: string, plural: string }} unit Count noun.
 */
function logStepWithCounts(index, name, durationMs, inners, unit) {
	const left = `  ${stepLabel(index)}  ${color.ok('✔')}  ${color.bold(name)}`;
	const right = color.dim(
		`${countLabel(inners.length, unit.singular, unit.plural)} · ${formatDuration(durationMs)}`
	);
	const width = logoWidth || DEFAULT_LOGO_WIDTH;
	const pad = Math.max(
		1,
		width - visibleLength(left) - visibleLength(right)
	);
	const line = `${left}${' '.repeat(pad)}${right}`;

	if (quietStdout) {
		replaceDisplayLine((item) => {
			const plain = String(item).replace(ANSI_PATTERN, '');

			return plain.includes(`[${index}/${STEP_COUNT}]`);
		}, line);
		return;
	}

	printOut(line);

	inners.forEach((inner) => {
		const extra = inner.detail ? `  ${inner.detail}` : '';

		logDetail(`${DETAIL_INDENT}${inner.name}${extra}`);
	});
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

	if (keepProcessAlive) {
		throw new Error(message);
	}

	process.exit(1);
}

function parseArgs(argv) {
	const separator = argv.indexOf('--');
	const own = separator === -1 ? argv : argv.slice(0, separator);
	const followOn = separator === -1 ? [] : argv.slice(separator + 1);

	return {
		projectId: parseProjectId(own),
		watch: own.includes('--watch'),
		followOn,
	};
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

const CLEANUP_PATHS = [
	{ name: 'dist/', rel: 'dist' },
	{ name: '.cache/', rel: '.cache' },
	{ name: '.cursor/', rel: '.cursor' },
	{
		name: 'cypress-image-diff-html-report/',
		rel: 'cypress-image-diff-html-report',
	},
	{ name: 'visual-screenshots/diff/', rel: 'visual-screenshots/diff' },
	{
		name: 'visual-screenshots/comparison/',
		rel: 'visual-screenshots/comparison',
	},
	{ name: '.phpunit.result.cache', rel: '.phpunit.result.cache' },
	{ name: '.jest-test-results.json', rel: '.jest-test-results.json' },
	{ name: 'php-coverage/', rel: 'php-coverage' },
	{ name: 'artifacts/', rel: 'artifacts' },
	{ name: 'test-results/', rel: 'test-results' },
	{ name: 'playwright-report/', rel: 'playwright-report' },
	{ name: '.nyc_output/', rel: '.nyc_output' },
	{ name: 'html-report/', rel: 'html-report' },
	{ name: 'cypress/downloads/', rel: 'cypress/downloads' },
];

function cleanUp(root) {
	const started = Date.now();
	const cacheDir = path.join(root, '.cache');
	const logPath = path.join(cacheDir, 'watch-bootstrap.log');

	CLEANUP_PATHS.forEach((item) => {
		fs.rmSync(path.join(root, item.rel), { recursive: true, force: true });
	});

	fs.mkdirSync(cacheDir, { recursive: true });
	writeSectionHeadingWidth(root, logoWidth);
	openBootstrapLog(logPath);

	logStepWithCounts(
		1,
		'Prepare workspace',
		Date.now() - started,
		CLEANUP_PATHS.map((item) => ({ name: item.name })),
		{ singular: 'path', plural: 'paths' }
	);
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

	logStepWithCounts(2, 'Configure project files', Date.now() - started, inners, {
		singular: 'file',
		plural: 'files',
	});
}

function shouldIgnoreWatchPath(filename) {
	if (!filename) {
		return false;
	}

	const base = path.basename(filename);

	return (
		base === '.DS_Store' ||
		base.startsWith('.#') ||
		base.endsWith('~') ||
		base.endsWith('.swp') ||
		base.endsWith('.swo')
	);
}

function watchSyncSources(root, projectId, env) {
	let debounceTimer = null;
	let running = false;
	let queued = false;

	const rerun = () => {
		if (running) {
			queued = true;
			return;
		}

		running = true;
		quietStdout = true;

		try {
			bootstrapSyncConfig(root, projectId, env);
			syncCount += 1;
			persistBootstrapLog();
		} catch (error) {
			if (!error.message) {
				printErr(
					`  ${color.err('✖')}  ${color.bold('sync-config failed')}  ${color.red(String(error))}`
				);
			}
		} finally {
			quietStdout = false;
			running = false;

			if (queued) {
				queued = false;
				rerun();
			}
		}
	};

	WATCH_DIRS.forEach((dir) => {
		if (!fs.existsSync(dir)) {
			return;
		}

		fs.watch(dir, { recursive: true }, (event, filename) => {
			if (shouldIgnoreWatchPath(filename)) {
				return;
			}

			clearTimeout(debounceTimer);
			debounceTimer = setTimeout(rerun, WATCH_DEBOUNCE_MS);
		});
	});
}

function spawnFollowOn(args) {
	const child = spawn(args[0], args.slice(1), {
		stdio: 'inherit',
		env: process.env,
		cwd: process.cwd(),
	});

	let exiting = false;

	const exitWith = (code) => {
		if (exiting) {
			return;
		}

		exiting = true;
		process.exit(code);
	};

	const shutdown = (signal) => {
		if (exiting) {
			return;
		}

		if (child.exitCode === null && child.signalCode === null) {
			child.kill(signal);
		}

		const forceTimer = setTimeout(() => {
			child.kill('SIGKILL');
			exitWith(1);
		}, 2000);

		if (typeof forceTimer.unref === 'function') {
			forceTimer.unref();
		}
	};

	process.on('SIGINT', () => shutdown('SIGINT'));
	process.on('SIGTERM', () => shutdown('SIGTERM'));

	child.on('exit', (code, signal) => {
		if (signal === 'SIGINT') {
			exitWith(130);
			return;
		}

		if (signal === 'SIGTERM') {
			exitWith(143);
			return;
		}

		exitWith(code ?? 0);
	});
}

function main() {
	const { projectId, watch, followOn } = parseArgs(process.argv.slice(2));
	watchMode = watch;
	const root = process.cwd();
	const env = loadEnv(path.join(root, '.env'));

	printLogo(projectId);
	banner();

	cleanUp(root);
	bootstrapSyncConfig(root, projectId, env);
	finishBootstrap();

	if (!watchMode) {
		return;
	}

	keepProcessAlive = true;
	watchSyncSources(root, projectId, env);

	if (followOn.length) {
		spawnFollowOn(followOn);
	}
}

main();
