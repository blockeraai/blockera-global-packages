/**
 * Quiet webpack watch status for `npm start` (`--mode development`).
 * Not applied to `npm run build` or `npm run start:debug`.
 *
 * After a failed compile succeeds, reprints bootstrap from
 * `.cache/watch-bootstrap.log` so the error dump is gone and scrollback stays usable.
 */

const fs = require('fs');
const { createRequire } = require('module');
const { basename, isAbsolute, join, relative, resolve } = require('path');

/**
 * Resolve webpack from the consumer project. A plain require('webpack') from
 * this submodule can load a second copy and break DefinePlugin.
 */
const consumerRequire = createRequire(join(process.cwd(), 'package.json'));
const webpack = consumerRequire('webpack');
const {
	formatIndentedSectionHeading,
	readSectionHeadingWidth,
	SECTION_HEADING_INDENT,
} = require('../cli/section-heading');
const { formatDuration } = require('../cli/format-duration');

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
const ANSI = {
	reset: '\x1b[0m',
	green: '\x1b[32m',
	red: '\x1b[31m',
	cyan: '\x1b[36m',
	dim: '\x1b[2m',
	clearLine: '\r\x1b[2K',
	hideCursor: '\x1b[?25l',
	showCursor: '\x1b[?25h',
	restoreScroll: '\x1b[?1l\x1b[?1007l\x1b[?1000l\x1b[?1002l\x1b[?1003l\x1b[?1006l',
};
const ANSI_PATTERN = /\u001b\[[0-9;]*m/g;
const STATUS_INDENT = SECTION_HEADING_INDENT;
const BOOTSTRAP_LOG = join(process.cwd(), '.cache/watch-bootstrap.log');
const PROJECT_ROOT = process.cwd();
const LOGO_WIDTH = readSectionHeadingWidth();
const STATS_ISSUES = {
	all: false,
	errors: true,
	warnings: true,
	errorDetails: true,
	colors: true,
	logging: false,
};
/**
 * @param {number} startedAt Session start timestamp.
 * @return {string} Compact elapsed clock (`12s`, `12m`, `1h 12m`).
 */
function formatSessionClock(startedAt) {
	const seconds = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));

	if (seconds < 60) {
		return `${seconds}s`;
	}

	const minutes = Math.floor(seconds / 60);

	if (minutes < 60) {
		return `${minutes}m`;
	}

	return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

/**
 * @param {number} startedAt Session start timestamp.
 * @return {string} Dim watching footer with session clock.
 */
function formatReadyFooter(startedAt) {
	return `${STATUS_INDENT}${ANSI.dim}watching  ·  ${formatSessionClock(
		startedAt
	)}  ·  Ctrl+C to stop${ANSI.reset}`;
}

/**
 * @param {Object} argv Webpack CLI argv.
 * @return {boolean} Whether quiet watch status should wrap the config.
 */
function shouldUseQuietWatchLogging(argv) {
	return argv?.mode === 'development' && process.env.DEBUG_MODE !== 'on';
}

/**
 * @param {string} text Text that may include ANSI.
 * @return {number} Visible length.
 */
function visibleLength(text) {
	return String(text).replace(ANSI_PATTERN, '').length;
}

/**
 * @param {string} color ANSI color.
 * @param {string} text Plain text.
 * @return {string} Colored text.
 */
function paint(color, text) {
	return `${color}${text}${ANSI.reset}`;
}

/**
 * @param {string} color Heading color.
 * @param {number} rebuildCount 1-based compile count.
 * @return {string} Colored Build heading.
 */
function formatBuildHeading(color, rebuildCount) {
	return paint(
		color,
		formatIndentedSectionHeading('Build', LOGO_WIDTH, {
			meta: `#${rebuildCount}`,
			weight: color === ANSI.green ? 'light' : 'heavy',
		})
	);
}

/**
 * @param {number} percent Compile progress 0–100.
 * @param {number} width Bar width in characters.
 * @return {string} Fixed-width bar.
 */
function formatBar(percent, width) {
	const filled = Math.min(
		width,
		Math.max(0, Math.round((percent / 100) * width))
	);

	return `${'█'.repeat(filled)}${'░'.repeat(width - filled)}`;
}

/**
 * @param {string} label Trailing status word(s).
 * @return {number} Bar width so the line matches the section heading.
 */
function barWidthFor(label) {
	const prefix = STATUS_INDENT.length + 1 + 1 + 4 + 1;
	const suffix = 1 + label.length;

	return Math.max(10, LOGO_WIDTH - prefix - suffix);
}

/**
 * @param {string} icon Spinner or ✓/✕.
 * @param {number} percent Compile progress 0–100.
 * @return {string} Indent + icon + padded percent.
 */
function formatMeterPrefix(icon, percent) {
	return `${STATUS_INDENT}${icon} ${String(percent).padStart(3)}% `;
}

/**
 * @param {number} count Item count.
 * @param {string} singular Noun.
 * @return {string} Count + noun.
 */
function pluralize(count, singular) {
	return `${count} ${singular}${count === 1 ? '' : 's'}`;
}

/**
 * @param {Set<string>|undefined} files Webpack file set.
 * @return {string[]} Paths relative to the project root.
 */
function toRelativeFiles(files) {
	if (!files || !files.size) {
		return [];
	}

	return [...files].map((file) => {
		const rel = relative(PROJECT_ROOT, String(file));

		return rel && !rel.startsWith('..') ? rel : String(file);
	});
}

/**
 * @param {Object} compiler Webpack compiler from watchRun.
 * @return {string} Dim cause line, or empty on the first compile.
 */
function formatChangedFile(compiler) {
	const files = [
		...toRelativeFiles(compiler.modifiedFiles),
		...toRelativeFiles(compiler.removedFiles),
	];

	if (!files.length) {
		return '';
	}

	const extra = files.length > 1 ? `  +${files.length - 1}` : '';
	const prefix = `${STATUS_INDENT}↻  `;
	const max = Math.max(8, LOGO_WIDTH - visibleLength(prefix) - extra.length);
	let pathLabel = files[0];

	if (pathLabel.length > max) {
		pathLabel = `…${pathLabel.slice(-(max - 1))}`;
	}

	return paint(ANSI.dim, `${prefix}${pathLabel}${extra}`);
}

/**
 * OSC 8 hyperlink so `gateway-card.tsx:49` opens the file in the editor.
 *
 * @param {string} absolutePath Absolute file path.
 * @param {number} [line] 1-based line.
 * @param {string} label Visible text.
 * @return {string} Clickable terminal text.
 */
function formatClickableLocation(absolutePath, line, label) {
	const href = line
		? `vscode://file${absolutePath}:${line}`
		: `vscode://file${absolutePath}`;

	return `\x1b]8;;${href}\x1b\\${label}\x1b]8;;\x1b\\`;
}

/**
 * @param {Object} [stats] Webpack stats.
 * @param {Error} [fallbackError] Compiler failed() error.
 * @return {{ label: string, link: string }|null} Punchline, or null.
 */
function firstErrorPunchline(stats, fallbackError) {
	const error = stats?.compilation?.errors?.[0] || fallbackError;

	if (!error) {
		return null;
	}

	const loc =
		error.loc?.start || error.loc || error.error?.loc?.start || error.error?.loc;
	let line = loc?.line;
	let file = '';
	const resource = error.module?.resource || error.file || '';

	if (resource) {
		file = String(resource).split('?')[0];
	}

	const msg = error.message || error.stack || String(error);

	if (!file) {
		const errorIn = msg.match(/ERROR in ((?:\.\/)?[^\s:]+)/);
		const pathAt = msg.match(
			/((?:\.\/)?[\w@./-]+\.[A-Za-z0-9]+):(\d+)/
		);

		if (errorIn) {
			file = errorIn[1].replace(/^\.\//, '');
		} else if (pathAt) {
			file = pathAt[1].replace(/^\.\//, '');
			line = line || Number(pathAt[2]);
		}
	}

	if (!line) {
		const fromMsg = msg.match(/(?:\s|:|\()(\d+):\d+/);

		if (fromMsg) {
			line = Number(fromMsg[1]);
		}
	}

	if (!file) {
		return null;
	}

	const absolutePath = isAbsolute(file)
		? file
		: resolve(PROJECT_ROOT, file);
	const label = line ? `${basename(file)}:${line}` : basename(file);

	return {
		label,
		link: formatClickableLocation(absolutePath, line, label),
	};
}

/**
 * Quiet watch status: progress while compiling, then ✓/✕ Build.
 *
 * @return {Object} Webpack plugin.
 */
function createBuildStatusPlugin() {
	return {
		apply(compiler) {
			let frame = 0;
			let percent = 0;
			let timer = null;
			let lastHadErrors = false;
			let printedMarker = false;
			let hasCauseLine = false;
			let hasFooter = false;
			let rebuildCount = 0;
			let compileStartedAt = 0;
			let causeLine = '';
			const sessionStartedAt = Date.now();
			let footerTimer = null;

			const stopSpinner = () => {
				if (timer) {
					clearInterval(timer);
					timer = null;
				}
			};

			const writeStatus = (text) => {
				process.stdout.write(`${ANSI.clearLine}${text}`);
			};

			const writeBuilding = () => {
				const spinner = SPINNER_FRAMES[frame % SPINNER_FRAMES.length];
				const label = 'Building';
				writeStatus(
					paint(
						ANSI.cyan,
						`${formatMeterPrefix(spinner, percent)}${formatBar(
							percent,
							barWidthFor(label)
						)} ${label}`
					)
				);
			};

			const writeFailed = (punchline) => {
				const visible = punchline
					? `Build failed  ·  ${punchline.label}`
					: 'Build failed';
				const label = punchline
					? `Build failed  ·  ${punchline.link}`
					: 'Build failed';
				writeStatus(
					`${paint(
						ANSI.red,
						`${formatMeterPrefix('✕', percent)}${formatBar(
							percent,
							barWidthFor(visible)
						)} ${label}`
					)}\n`
				);
			};

			const writeFailedPunchline = (punchline) => {
				if (!punchline) {
					return;
				}

				process.stdout.write(
					`\n${paint(
						ANSI.red,
						`${STATUS_INDENT}✕  Build failed  ·  ${punchline.link}`
					)}\n`
				);
			};

			const stopFooterClock = () => {
				if (footerTimer) {
					clearInterval(footerTimer);
					footerTimer = null;
				}
			};

			const refreshFooter = () => {
				if (!hasFooter) {
					return;
				}

				process.stdout.write(
					`\x1b[2A${ANSI.clearLine}${formatReadyFooter(
						sessionStartedAt
					)}\n\n`
				);
			};

			const startFooterClock = () => {
				stopFooterClock();
				footerTimer = setInterval(refreshFooter, 1000);

				if (typeof footerTimer.unref === 'function') {
					footerTimer.unref();
				}
			};

			const writeReady = (durationMs, recovered) => {
				const left = `${formatMeterPrefix('✓', 100)}Build ready`;
				const extras = [formatDuration(durationMs)];

				if (recovered) {
					extras.push('fixed');
				}

				const right = extras.join('  ·  ');
				const pad = Math.max(
					1,
					LOGO_WIDTH - visibleLength(left) - visibleLength(right)
				);

				writeStatus(
					`${paint(ANSI.green, `${left}${' '.repeat(pad)}${right}`)}\n`
				);
				process.stdout.write(
					`\n${formatReadyFooter(sessionStartedAt)}\n\n`
				);
				hasFooter = true;
				startFooterClock();
			};

			const writeIssueSummary = (stats) => {
				const errors = stats.compilation?.errors?.length || 0;
				const warnings = stats.compilation?.warnings?.length || 0;
				const parts = [];

				if (errors) {
					parts.push(paint(ANSI.red, pluralize(errors, 'error')));
				}

				if (warnings) {
					parts.push(paint(ANSI.dim, pluralize(warnings, 'warning')));
				}

				if (!parts.length) {
					return;
				}

				process.stdout.write(`${STATUS_INDENT}${parts.join('  ·  ')}\n`);
			};

			const indentDump = (text) =>
				text
					.split('\n')
					.map((line) => (line ? `${STATUS_INDENT}${line}` : line))
					.join('\n');

			const writeIssueDetails = (stats) => {
				const details = stats.toString(STATS_ISSUES);

				if (!details) {
					return;
				}

				const text = details.endsWith('\n') ? details : `${details}\n`;
				process.stdout.write(indentDump(text));
			};

			const writeHeading = (color) => {
				process.stdout.write(
					`${ANSI.clearLine}${formatBuildHeading(color, rebuildCount)}\n\n`
				);
			};

			const writeCause = () => {
				if (!causeLine) {
					hasCauseLine = false;
					return;
				}

				process.stdout.write(`${ANSI.clearLine}${causeLine}\n\n`);
				hasCauseLine = true;
			};

			const moveToHeading = () => {
				const causeLines = hasCauseLine ? 2 : 0;
				const up = hasFooter
					? 2 + causeLines + 1 + 3
					: 2 + causeLines;

				process.stdout.write(`\x1b[${up}A`);
			};

			const clearLeftoverLines = () => {
				process.stdout.write(ANSI.clearLine);

				if (hasFooter) {
					stopFooterClock();
					process.stdout.write(
						`\n${ANSI.clearLine}\n${ANSI.clearLine}\n${ANSI.clearLine}\x1b[3A`
					);
					hasFooter = false;
				}
			};

			const paintBuildChrome = (color) => {
				if (printedMarker && !lastHadErrors) {
					moveToHeading();
				}

				writeHeading(color);
				writeCause();
				clearLeftoverLines();
				printedMarker = true;
			};

			const restoreScroll = () => {
				process.stdout.write(ANSI.restoreScroll);
			};

			const reprintAfterErrors = () => {
				let prefix = '';

				try {
					prefix = fs.readFileSync(BOOTSTRAP_LOG, 'utf8');
				} catch (error) {
					prefix = '';
				}

				process.stdout.write('\x1b[2J\x1b[3J\x1b[H');

				if (prefix) {
					process.stdout.write(
						prefix.endsWith('\n') ? prefix : `${prefix}\n`
					);
				}

				stopFooterClock();
				hasCauseLine = false;
				hasFooter = false;
				causeLine = '';
				writeHeading(ANSI.green);
				printedMarker = true;
			};

			new webpack.ProgressPlugin((ratio) => {
				percent = Math.round(ratio * 100);
			}).apply(compiler);

			compiler.hooks.watchRun.tap('BuildStatus', (watchingCompiler) => {
				stopSpinner();
				stopFooterClock();
				frame = 0;
				percent = 0;
				rebuildCount += 1;
				compileStartedAt = Date.now();
				causeLine =
					rebuildCount > 1 ? formatChangedFile(watchingCompiler) : '';
				restoreScroll();

				if (lastHadErrors) {
					process.stdout.write('\n');
					hasCauseLine = false;
					hasFooter = false;
					printedMarker = false;
				}

				paintBuildChrome(ANSI.cyan);
				process.stdout.write(ANSI.hideCursor);
				writeBuilding();
				timer = setInterval(() => {
					frame += 1;
					writeBuilding();
				}, 80);
			});

			compiler.hooks.done.tap('BuildStatus', (stats) => {
				stopSpinner();
				process.stdout.write(ANSI.showCursor);

				const durationMs =
					stats.endTime && stats.startTime
						? stats.endTime - stats.startTime
						: Date.now() - compileStartedAt;

				if (stats.hasErrors()) {
					const punchline = firstErrorPunchline(stats);
					restoreScroll();
					paintBuildChrome(ANSI.red);
					writeFailed(punchline);
					writeIssueSummary(stats);
					writeIssueDetails(stats);
					writeFailedPunchline(punchline);
					hasFooter = false;
					lastHadErrors = true;
					return;
				}

				restoreScroll();

				const recovered = lastHadErrors;

				if (lastHadErrors) {
					reprintAfterErrors();
				} else {
					paintBuildChrome(ANSI.green);
				}

				lastHadErrors = false;
				writeReady(durationMs, recovered);

				if (stats.hasWarnings()) {
					writeIssueSummary(stats);
					writeIssueDetails(stats);
					hasFooter = false;
					lastHadErrors = true;
				}
			});

			compiler.hooks.failed.tap('BuildStatus', (error) => {
				stopSpinner();
				process.stdout.write(ANSI.showCursor);
				restoreScroll();
				const punchline = firstErrorPunchline(null, error);
				paintBuildChrome(ANSI.red);
				writeFailed(punchline);
				hasFooter = false;
				lastHadErrors = true;

				if (error?.stack || error?.message) {
					const dump = `${error.stack || error.message}\n`;
					process.stdout.write(indentDump(dump));
				}

				writeFailedPunchline(punchline);
			});

			compiler.hooks.shutdown.tap('BuildStatus', () => {
				stopSpinner();
				stopFooterClock();
				process.stdout.write(ANSI.showCursor);
				restoreScroll();
			});
		},
	};
}

/**
 * Quiet watch: spinner + check, no "compiled in" dump.
 *
 * @param {Object} config Webpack config from packagesConfig.
 * @return {Object} Config with quieter development stats.
 */
function withQuietWatchLogging(config) {
	return {
		...config,
		stats: false,
		infrastructureLogging: {
			level: 'error',
		},
		plugins: [...(config.plugins || []), createBuildStatusPlugin()],
	};
}

module.exports = {
	shouldUseQuietWatchLogging,
	withQuietWatchLogging,
};
