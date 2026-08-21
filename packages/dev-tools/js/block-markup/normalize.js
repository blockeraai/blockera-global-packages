/**
 * Normalize Gutenberg serialized markup (pattern PHP + template HTML):
 * - prettier
 * - sanitize (copied metadata, block-role attrs)
 * - localize (i18n + image URLs) when the source step list includes it
 */

const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');
const fg = require('fast-glob');
const RewritingStream = require('parse5-html-rewriting-stream');

const { baseConfig } = require('./base-config');
const { escapeText } = require('./escape-text');
const {
	escapeImagePath,
	hasStaticImagePaths,
	escapeRegExp,
} = require('./escape-image-path');
const { escapeBlockAttrs } = require('./escape-block-attrs');
const { hasUnsanitizedPatternMetadata } = require('./sanitize-block-metadata');
const { hasUnsanitizedBlockRoleAttrs } = require('./sanitize-block-roles');
const {
	hasPhpInMarkup,
	prettifyMarkup,
} = require('./prettify-markup');
const { DEFAULT_IMAGE_PATH_ROOTS } = require('./load-config');

/**
 * @param {string[]} steps Source steps.
 * @param {string} name Step name.
 * @return {boolean} True when present.
 */
function hasStep(steps, name) {
	return Array.isArray(steps) && steps.indexOf(name) !== -1;
}

/**
 * Normalize patternsDir / patternsDirs / templatesDirs into an absolute path array.
 *
 * @param {Object} options Normalize options.
 * @param {string} plural Key for the array form.
 * @param {string} singular Legacy singular key.
 * @return {string[]} Absolute directory paths.
 */
function normalizeDirList(options = {}, plural, singular) {
	const raw = options[plural] ?? options[singular];

	if (!raw) {
		return [];
	}

	if (Array.isArray(raw)) {
		return raw.filter(Boolean);
	}

	return [raw];
}

/**
 * @param {Object} [options] Normalize options.
 * @return {string[]} Absolute pattern directory paths.
 */
function normalizePatternsDirs(options = {}) {
	return normalizeDirList(options, 'patternsDirs', 'patternsDir');
}

/**
 * @param {string|string[]} dirs Directory or list.
 * @param {string} [glob] File glob (defaults to PHP files).
 * @return {boolean} True when matching files exist.
 */
function hasSourceFiles(dirs, glob = '**/*.php') {
	const list = Array.isArray(dirs) ? dirs : [dirs];

	for (const dir of list) {
		if (!dir || !fs.existsSync(dir)) {
			continue;
		}

		const matches = fg.sync(glob, {
			cwd: dir,
			onlyFiles: true,
			absolute: false,
		});

		if (matches.length > 0) {
			return true;
		}
	}

	return false;
}

/**
 * @param {string|string[]} patternsDir Absolute patterns directory or list.
 * @return {boolean} True when PHP pattern files exist.
 */
function hasPatternPhpFiles(patternsDir) {
	return hasSourceFiles(patternsDir, '**/*.php');
}

/**
 * @param {string} content File contents.
 * @param {string} textDomain Text domain.
 * @return {boolean} True when i18n wrappers are needed.
 */
function needsTranslation(content, textDomain) {
	return !content.includes('<?php') || !content.includes(`'${textDomain}'`);
}

/**
 * @param {Object} localize Resolved localize config.
 * @param {string} group html | images | text | blockAttrs
 * @param {string} [token] Nested token (html.imgAlt).
 * @return {boolean} True when enabled.
 */
function isLocalizeTokenEnabled(localize, group, token) {
	if (!localize || localize.enabled === false) {
		return false;
	}

	const section = localize[group];
	if (!section || section.enabled === false) {
		return false;
	}

	if (!token) {
		return true;
	}

	const rule = section[token];
	return Boolean(rule) && rule.enabled !== false;
}

/**
 * @param {Object} options Normalize options.
 * @return {import('stream').Transform} Configured rewriter.
 */
function createRewriter(options) {
	const {
		textDomain,
		uriPhpExpression = 'get_template_directory_uri()',
		imagePathRoots = DEFAULT_IMAGE_PATH_ROOTS,
		debug = false,
		sanitize = baseConfig.sanitize,
		localize = baseConfig.localize,
		steps = ['prettier', 'sanitize', 'localize'],
	} = options;

	const rewriter = new RewritingStream();
	const imageOptions = { uriPhpExpression, imagePathRoots, debug };
	const doLocalize = hasStep(steps, 'localize');
	const doSanitize = hasStep(steps, 'sanitize');
	const textConfig = (localize && localize.text) || {};
	const wrapText =
		doLocalize && isLocalizeTokenEnabled(localize, 'html', 'textNodes');
	const wrapAlt =
		doLocalize && isLocalizeTokenEnabled(localize, 'html', 'imgAlt');
	const wrapAria =
		doLocalize && isLocalizeTokenEnabled(localize, 'html', 'ariaLabel');
	const wrapImages = doLocalize && isLocalizeTokenEnabled(localize, 'images');

	rewriter.on('text', (_, raw) => {
		rewriter.emitRaw(
			wrapText ? escapeText(raw, textDomain, false, textConfig) : raw
		);
	});

	rewriter.on('startTag', (startTag) => {
		if (startTag.tagName === 'img') {
			const srcAttr = startTag.attrs.find((attr) => attr.name === 'src');
			if (srcAttr && wrapImages) {
				const originalSrc = srcAttr.value;
				const newSrc = escapeImagePath(originalSrc, imageOptions);

				if (debug) {
					// @debug-ignore — CLI debug output for block-markup --debug
					// eslint-disable-next-line no-console
					console.log('Processing image src:', {
						originalSrc,
						newSrc,
						changed: originalSrc !== newSrc,
					});
				}

				srcAttr.value = newSrc;
			}

			const altAttr = startTag.attrs.find((attr) => attr.name === 'alt');
			if (altAttr && wrapAlt) {
				altAttr.value = escapeText(
					altAttr.value,
					textDomain,
					true,
					textConfig
				);
			}
		}

		const ariaLabel = startTag.attrs.find(
			(attr) => attr.name === 'aria-label'
		);
		if (ariaLabel && wrapAria) {
			ariaLabel.value = escapeText(
				ariaLabel.value,
				textDomain,
				true,
				textConfig
			);
		}

		rewriter.emitStartTag(startTag);
	});

	rewriter.on('comment', (comment, rawHtml) => {
		if (comment.text.startsWith('?php')) {
			rewriter.emitRaw(rawHtml);
			return;
		}

		let processedComment = comment.text;

		if (wrapImages) {
			const rootsAlternation = imagePathRoots
				.map((root) => escapeRegExp(root))
				.join('|');

			const urlRegex = new RegExp(
				`("url"\\s*:\\s*")https?:\\/\\/[^"]+(\\/(?:${rootsAlternation})\\/[^"]+)(")`,
				'g'
			);

			processedComment = processedComment.replace(
				urlRegex,
				(match, prefix, imagePath, suffix) =>
					`${prefix}<?php echo esc_url( ${uriPhpExpression} ); ?>${imagePath}${suffix}`
			);
		}

		if (doSanitize || doLocalize) {
			processedComment = escapeBlockAttrs(processedComment, textDomain, {
				sanitize,
				localize: doLocalize ? localize : { enabled: false },
			});
		}

		rewriter.emitComment({ ...comment, text: processedComment });
	});

	return rewriter;
}

/**
 * @param {string} content File contents.
 * @param {Object} options Normalize options.
 * @return {Promise<string>} Transformed contents.
 */
function rewriteMarkup(content, options) {
	return new Promise((resolve, reject) => {
		const rewriter = createRewriter(options);
		const chunks = [];

		rewriter.on('data', (chunk) => {
			chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
		});
		rewriter.on('end', () => {
			resolve(Buffer.concat(chunks).toString('utf8'));
		});
		rewriter.on('error', reject);

		Readable.from([content]).pipe(rewriter);
	});
}

/**
 * @param {string} content Original file contents.
 * @param {Object} options Normalize options (includes `steps`).
 * @return {Promise<string>} Transformed contents.
 */
async function normalizeMarkupContent(content, options = {}) {
	const steps = options.steps || ['prettier', 'sanitize', 'localize'];
	let next = content;

	if (hasStep(steps, 'prettier')) {
		next = await prettifyMarkup(next, options);
	}

	if (hasStep(steps, 'sanitize') || hasStep(steps, 'localize')) {
		next = await rewriteMarkup(next, { ...options, steps });
	}

	return next;
}

/**
 * @param {string} content Original file contents.
 * @param {Object} options Normalize options.
 * @return {Promise<string>} Transformed contents.
 */
function normalizePatternContent(content, options) {
	return normalizeMarkupContent(content, options);
}

/**
 * @param {string} dir Absolute directory.
 * @param {string} glob Glob.
 * @return {Promise<string[]>} Absolute file paths.
 */
async function listSourceFiles(dir, glob) {
	const files = await fg(glob, {
		cwd: dir,
		onlyFiles: true,
		absolute: true,
	});

	return files.sort();
}

/**
 * @param {Object} options Normalize options.
 * @return {Object[]} Source descriptors.
 */
function buildSources(options) {
	if (Array.isArray(options.sources) && options.sources.length > 0) {
		return options.sources;
	}

	const patternDirs = normalizePatternsDirs(options);
	const templateDirs = normalizeDirList(
		options,
		'templatesDirs',
		'templatesDir'
	);
	const patternSteps = options.prettierOnly
		? ['prettier']
		: (options.steps && options.steps.patterns) ||
			baseConfig.steps.patterns;
	const templateSteps = options.prettierOnly
		? ['prettier']
		: (options.steps && options.steps.templates) ||
			baseConfig.steps.templates;
	const globs = options.globs || baseConfig.globs;
	const sources = [];

	if (patternDirs.length > 0) {
		sources.push({
			kind: 'patterns',
			dirs: patternDirs,
			glob: globs.patterns,
			steps: patternSteps,
		});
	}

	if (templateDirs.length > 0) {
		sources.push({
			kind: 'templates',
			dirs: templateDirs,
			glob: globs.templates,
			steps: templateSteps,
		});
	}

	return sources;
}

/**
 * @param {string} dir Absolute directory.
 * @param {Object} source Source descriptor.
 * @param {Object} shared Shared options.
 * @return {Promise<string[]>} Changed absolute file paths.
 */
async function normalizeDirectory(dir, source, shared) {
	const {
		textDomain,
		uriPhpExpression = 'get_template_directory_uri()',
		imagePathRoots = DEFAULT_IMAGE_PATH_ROOTS,
		force = false,
		quiet = false,
		debug = false,
		check = false,
		productRoot,
		sanitize = baseConfig.sanitize,
		localize = baseConfig.localize,
		prettier = baseConfig.prettier,
	} = shared;

	const { glob, steps, kind } = source;

	if (!hasSourceFiles(dir, glob)) {
		if (!quiet) {
			// @debug-ignore — CLI status output for block-markup
			// eslint-disable-next-line no-console
			console.log(`No ${glob} files found in ${dir}; skipping.`);
		}

		return [];
	}

	const files = await listSourceFiles(dir, glob);
	const changedFiles = [];
	const runtimeOptions = {
		textDomain,
		uriPhpExpression,
		imagePathRoots,
		force,
		quiet,
		debug,
		productRoot,
		sanitize,
		localize,
		prettier,
		steps,
	};

	if (!quiet) {
		// @debug-ignore — CLI status output for block-markup
		// eslint-disable-next-line no-console
		console.log(
			`Processing ${files.length} ${kind} file(s) in ${dir}...`
		);
	}

	for (const file of files) {
		const relative = path.relative(dir, file);

		if (!quiet) {
			// @debug-ignore — CLI status output for block-markup
			// eslint-disable-next-line no-console
			console.log(`  - ${relative}`);
		}

		const originalContent = await fs.promises.readFile(file, 'utf8');

		const doLocalize = hasStep(steps, 'localize');
		const doSanitize = hasStep(steps, 'sanitize');
		const doPrettier = hasStep(steps, 'prettier');

		const needsI18n =
			doLocalize &&
			localize.enabled !== false &&
			needsTranslation(originalContent, textDomain);
		const hasStaticImages =
			doLocalize &&
			isLocalizeTokenEnabled(localize, 'images') &&
			hasStaticImagePaths(originalContent, imagePathRoots);
		const needsMetadataSanitize =
			doSanitize &&
			hasUnsanitizedPatternMetadata(originalContent, sanitize);
		const needsBlockRoleSanitize =
			doSanitize && hasUnsanitizedBlockRoleAttrs(originalContent, sanitize);
		const canPrettify =
			doPrettier &&
			prettier.enabled !== false &&
			!(prettier.skipWhenMarkupHasPhp !== false && hasPhpInMarkup(originalContent));

		if (
			!needsI18n &&
			!hasStaticImages &&
			!needsMetadataSanitize &&
			!needsBlockRoleSanitize &&
			!canPrettify &&
			!force
		) {
			if (!quiet) {
				// @debug-ignore — CLI status output for block-markup
				// eslint-disable-next-line no-console
				console.log('    - Already normalized, skipping');
			}
			continue;
		}

		const nextContent = await normalizeMarkupContent(
			originalContent,
			runtimeOptions
		);

		if (nextContent === originalContent) {
			if (!quiet) {
				// @debug-ignore — CLI status output for block-markup
				// eslint-disable-next-line no-console
				console.log('    - No content changes after transform');
			}
			continue;
		}

		changedFiles.push(file);

		if (!check) {
			await fs.promises.writeFile(file, nextContent, 'utf8');
		}
	}

	return changedFiles;
}

/**
 * @param {Object} options Normalize options.
 * @return {Promise<{ changedFiles: string[], ok: boolean, reason?: string }>} Result.
 */
async function normalizeBlockMarkup(options = {}) {
	const sources = buildSources(options);

	if (!options.textDomain) {
		throw new Error('normalizeBlockMarkup: textDomain is required.');
	}

	const {
		textDomain,
		uriPhpExpression = 'get_template_directory_uri()',
		imagePathRoots = DEFAULT_IMAGE_PATH_ROOTS,
		force = false,
		quiet = false,
		debug = false,
		check = false,
		productRoot,
		sanitize = baseConfig.sanitize,
		localize = baseConfig.localize,
		prettier = baseConfig.prettier,
	} = options;

	const shared = {
		textDomain,
		uriPhpExpression,
		imagePathRoots,
		force,
		quiet,
		debug,
		check,
		productRoot,
		sanitize,
		localize,
		prettier,
	};

	const changedFiles = [];

	for (const source of sources) {
		for (const dir of source.dirs) {
			const changed = await normalizeDirectory(dir, source, shared);
			for (const file of changed) {
				changedFiles.push(file);
			}
		}
	}

	if (check && changedFiles.length > 0) {
		return {
			changedFiles,
			ok: false,
			reason: `${changedFiles.length} file(s) need normalization.`,
		};
	}

	return { changedFiles, ok: true };
}

/**
 * @param {Object} options Normalize options.
 * @return {Promise<{ changedFiles: string[], ok: boolean, reason?: string }>} Result.
 */
function normalizePatterns(options = {}) {
	return normalizeBlockMarkup(options);
}

/**
 * @param {Object} options Normalize options.
 * @return {Promise<{ changedFiles: string[], ok: boolean, reason?: string }>} Result.
 */
function checkBlockMarkup(options = {}) {
	return normalizeBlockMarkup({ ...options, check: true });
}

/**
 * @param {Object} options Normalize options.
 * @return {Promise<{ changedFiles: string[], ok: boolean, reason?: string }>} Result.
 */
function checkPatterns(options = {}) {
	return checkBlockMarkup(options);
}

module.exports = {
	DEFAULT_IMAGE_PATH_ROOTS,
	normalizePatternsDirs,
	hasSourceFiles,
	hasPatternPhpFiles,
	needsTranslation,
	normalizeMarkupContent,
	normalizePatternContent,
	normalizeBlockMarkup,
	normalizePatterns,
	checkBlockMarkup,
	checkPatterns,
	escapeText,
	escapeImagePath,
	escapeBlockAttrs,
	hasStaticImagePaths,
	hasUnsanitizedPatternMetadata,
	hasUnsanitizedBlockRoleAttrs,
	hasPhpInMarkup,
	hasPhpInPatternMarkup: hasPhpInMarkup,
	prettifyMarkup,
	prettifyPatternMarkup: prettifyMarkup,
};
