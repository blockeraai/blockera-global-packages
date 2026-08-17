/**
 * Discover CI matrix categories from test filenames.
 *
 * Filename convention: `name.{category}.{suffix}` (uncategorized `name.{suffix}`
 * maps to a synthetic general category). This script has no product styles;
 * consumers pass scan roots, package filters, and patterns via args or env.
 *
 * Usage:
 *   node list-test-categories.js --suffix e2e.cy.js
 *   node list-test-categories.js --suffix ply.js --env-prefix BLOCKERA_PLAYWRIGHT
 *
 * Env (BLOCKERA_TEST_*, plus --env-prefix e.g. BLOCKERA_E2E_):
 *   SUFFIX                 filename suffix (required unless --suffix)
 *   SCAN_ROOTS             comma-separated dirs (default: packages,tests)
 *   PACKAGE_SUFFIX         e.g. -pro / -one
 *   PACKAGE_PREFIX         e.g. blockera-pro-
 *   GENERAL_PACKAGES       extra package names included in the general scan
 *   GENERAL_CATEGORY       synthetic category (empty / none disables)
 *   EXCLUDE_CATEGORIES     comma list; `*` is a glob
 *   EXCLUDE_FILES          comma-separated cwd-relative paths
 *   FILE_PATTERN           regex; when set, only matching files are scanned
 *   CATEGORY_MODE          dot-prefix (default) | last-segment
 */
const path = require('path');
const { walkFiles } = require('./walk-files');
const { isMatchingPackage } = require('./package-match');

function envValue(...names) {
	for (const name of names) {
		if (!name) {
			continue;
		}
		const value = process.env[name];
		if (value !== undefined && value !== '') {
			return value;
		}
	}
	return undefined;
}

function readPrefixed(envPrefix, key, fallback) {
	const value = envValue(
		envPrefix ? `${envPrefix}${key}` : '',
		`BLOCKERA_TEST_${key}`
	);
	return value === undefined ? fallback : value;
}

function splitList(raw) {
	if (!raw) {
		return [];
	}
	return String(raw)
		.split(',')
		.map((item) => item.trim())
		.filter(Boolean);
}

function toPosix(filePath) {
	return filePath.split(path.sep).join('/');
}

function escapeRegExp(value) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function globToRegExp(pattern) {
	return new RegExp(`^${escapeRegExp(pattern).replace(/\\\*/g, '.*')}$`);
}

function packageNameFromPath(filePath) {
	const match = toPosix(filePath).match(/(?:^|\/)packages\/([^/]+)\//);
	return match ? match[1] : null;
}

function toExcludePattern(item) {
	if (item instanceof RegExp) {
		return item;
	}

	const value = String(item);
	if (value.includes('*')) {
		return globToRegExp(value);
	}

	return value;
}

function parseExcludePatterns(raw) {
	if (raw === undefined || raw === '') {
		return [];
	}
	const list = Array.isArray(raw) ? raw : splitList(raw);
	return list.map(toExcludePattern);
}

function matchesExclude(category, patterns) {
	return patterns.some((pattern) => {
		if (pattern instanceof RegExp) {
			return pattern.test(category);
		}
		return pattern === category;
	});
}

function makePackageFilter(match) {
	if (
		!match ||
		(!match.suffix && !match.prefix && !match.extraNames?.length)
	) {
		return null;
	}
	return (name) => isMatchingPackage(name, match);
}

/**
 * @param {Object} [overrides]
 * @return {Object} Resolved scan options.
 */
function resolveOptions(overrides = {}) {
	const envPrefix = overrides.envPrefix || 'BLOCKERA_TEST_';

	const suffix =
		overrides.suffix || readPrefixed(envPrefix, 'SUFFIX', undefined);
	if (!suffix) {
		throw new Error(
			'list-test-categories: --suffix or SUFFIX env is required (e.g. e2e.cy.js, ply.js).'
		);
	}

	const packageSuffix =
		overrides.packageSuffix ||
		readPrefixed(envPrefix, 'PACKAGE_SUFFIX', undefined);
	const packagePrefix =
		overrides.packagePrefix ||
		readPrefixed(envPrefix, 'PACKAGE_PREFIX', undefined);
	const extraGeneral =
		overrides.generalPackages ||
		splitList(readPrefixed(envPrefix, 'GENERAL_PACKAGES', ''));

	const packageMatch = {
		suffix: packageSuffix,
		prefix: packagePrefix,
		extraNames: extraGeneral,
	};

	const generalCategoryRaw =
		overrides.generalCategory !== undefined
			? overrides.generalCategory
			: readPrefixed(envPrefix, 'GENERAL_CATEGORY', 'general-1');
	const generalCategory =
		generalCategoryRaw === '' ||
		generalCategoryRaw === 'none' ||
		generalCategoryRaw === null
			? null
			: generalCategoryRaw;

	const scanRoots =
		overrides.scanRoots ||
		splitList(readPrefixed(envPrefix, 'SCAN_ROOTS', 'packages,tests'));

	const filePatternRaw = readPrefixed(envPrefix, 'FILE_PATTERN', undefined);
	let filePattern = overrides.filePattern || null;
	if (!filePattern && filePatternRaw) {
		filePattern = new RegExp(filePatternRaw, 'i');
	}

	const categoryMode = (
		overrides.categoryMode ||
		readPrefixed(envPrefix, 'CATEGORY_MODE', 'dot-prefix') ||
		'dot-prefix'
	).toLowerCase();

	const excludeFilesRaw =
		overrides.excludeFiles || readPrefixed(envPrefix, 'EXCLUDE_FILES', '');

	return {
		root: overrides.root || process.cwd(),
		envPrefix,
		suffix,
		scanRoots,
		packageFilter: makePackageFilter({
			suffix: packageSuffix,
			prefix: packagePrefix,
		}),
		generalPackageFilter: makePackageFilter(packageMatch),
		excludeCategories: parseExcludePatterns(
			overrides.excludeCategories !== undefined
				? overrides.excludeCategories
				: readPrefixed(envPrefix, 'EXCLUDE_CATEGORIES', '')
		),
		excludeFiles: (Array.isArray(excludeFilesRaw)
			? excludeFilesRaw
			: splitList(excludeFilesRaw)
		).map((file) => path.normalize(file)),
		filePattern,
		categoryMode,
		generalCategory,
	};
}

function isExcludedFile(filePath, options) {
	const relative = path.normalize(path.relative(options.root, filePath));
	return options.excludeFiles.some(
		(excluded) =>
			relative === excluded || toPosix(relative) === toPosix(excluded)
	);
}

function packageName(filePath, root) {
	return (
		packageNameFromPath(toPosix(path.relative(root, filePath))) ||
		packageNameFromPath(toPosix(filePath))
	);
}

function isAllowedByFilter(filePath, root, filter) {
	if (!filter) {
		return true;
	}
	const name = packageName(filePath, root);
	if (!name) {
		return true;
	}
	return filter(name);
}

function categorizedFrom(filePath, suffix, mode) {
	const escaped = escapeRegExp(suffix);
	if (mode === 'last-segment') {
		const match = filePath.match(new RegExp(`\\.([^.]+)\\.${escaped}$`));
		return match && match[1] ? match[1] : null;
	}
	const match = filePath.match(new RegExp(`\\.(.*?)\\.${escaped}`));
	return match && match[1] ? match[1] : null;
}

function isGeneralSpec(filePath, suffix) {
	const base = path.basename(filePath);
	return new RegExp(`^[\\w-]+\\.${escapeRegExp(suffix)}$`).test(base);
}

function collectFiles(options, filter) {
	const files = [];

	for (const scanRoot of options.scanRoots) {
		const dir = path.isAbsolute(scanRoot)
			? scanRoot
			: path.join(options.root, scanRoot);
		files.push(
			...walkFiles(dir, {
				fileFilter: (filePath) => {
					if (isExcludedFile(filePath, options)) {
						return false;
					}
					if (
						options.filePattern &&
						!options.filePattern.test(filePath)
					) {
						return false;
					}
					if (!isAllowedByFilter(filePath, options.root, filter)) {
						return false;
					}
					return filePath.endsWith(`.${options.suffix}`);
				},
			})
		);
	}

	return files;
}

function sortCategories(categories) {
	const sorted = [...categories].sort();
	const general = sorted.filter(
		(category) => category === 'general' || category.startsWith('general-')
	);

	if (general.length === 0) {
		return sorted;
	}

	general.sort();
	return [
		...general,
		...sorted.filter((category) => !category.startsWith('general')),
	];
}

/**
 * @param {Object} [overrides]
 * @return {string[]} Sorted category names.
 */
function listCategories(overrides = {}) {
	const options = resolveOptions(overrides);
	const categories = new Set();

	for (const file of collectFiles(options, options.packageFilter)) {
		const category = categorizedFrom(
			file,
			options.suffix,
			options.categoryMode
		);
		if (category && !matchesExclude(category, options.excludeCategories)) {
			categories.add(category);
		}
	}

	if (options.generalCategory) {
		const generalFilter =
			options.generalPackageFilter || options.packageFilter;
		const hasGeneral = collectFiles(options, generalFilter).some((file) =>
			isGeneralSpec(file, options.suffix)
		);
		if (hasGeneral) {
			categories.add(options.generalCategory);
		}
	}

	return sortCategories(Array.from(categories));
}

function parseArgs(argv) {
	const args = { help: false, envPrefix: null };

	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		const next = () => argv[++i];

		if (arg === '--help' || arg === '-h') {
			args.help = true;
		} else if (arg === '--suffix') {
			args.suffix = next();
		} else if (arg.startsWith('--suffix=')) {
			args.suffix = arg.slice('--suffix='.length);
		} else if (arg === '--scan-roots') {
			args.scanRoots = splitList(next());
		} else if (arg.startsWith('--scan-roots=')) {
			args.scanRoots = splitList(arg.slice('--scan-roots='.length));
		} else if (arg === '--package-suffix') {
			args.packageSuffix = next();
		} else if (arg.startsWith('--package-suffix=')) {
			args.packageSuffix = arg.slice('--package-suffix='.length);
		} else if (arg === '--package-prefix') {
			args.packagePrefix = next();
		} else if (arg.startsWith('--package-prefix=')) {
			args.packagePrefix = arg.slice('--package-prefix='.length);
		} else if (arg === '--general-packages') {
			args.generalPackages = splitList(next());
		} else if (arg.startsWith('--general-packages=')) {
			args.generalPackages = splitList(
				arg.slice('--general-packages='.length)
			);
		} else if (arg === '--general-category') {
			args.generalCategory = next();
		} else if (arg.startsWith('--general-category=')) {
			args.generalCategory = arg.slice('--general-category='.length);
		} else if (arg === '--exclude-categories') {
			args.excludeCategories = splitList(next());
		} else if (arg.startsWith('--exclude-categories=')) {
			args.excludeCategories = splitList(
				arg.slice('--exclude-categories='.length)
			);
		} else if (arg === '--exclude-files') {
			args.excludeFiles = splitList(next());
		} else if (arg.startsWith('--exclude-files=')) {
			args.excludeFiles = splitList(arg.slice('--exclude-files='.length));
		} else if (arg === '--file-pattern') {
			args.filePattern = new RegExp(next(), 'i');
		} else if (arg.startsWith('--file-pattern=')) {
			args.filePattern = new RegExp(
				arg.slice('--file-pattern='.length),
				'i'
			);
		} else if (arg === '--category-mode') {
			args.categoryMode = next();
		} else if (arg.startsWith('--category-mode=')) {
			args.categoryMode = arg.slice('--category-mode='.length);
		} else if (arg === '--env-prefix') {
			args.envPrefix = next();
		} else if (arg.startsWith('--env-prefix=')) {
			args.envPrefix = arg.slice('--env-prefix='.length);
		} else {
			throw new Error(`Unknown argument: ${arg}`);
		}
	}

	if (args.envPrefix && !args.envPrefix.endsWith('_')) {
		args.envPrefix += '_';
	}

	return args;
}

function printHelp() {
	process.stdout.write(`Usage:
  node list-test-categories.js --suffix e2e.cy.js
  node list-test-categories.js --suffix ply.js --env-prefix BLOCKERA_PLAYWRIGHT

Options / env (BLOCKERA_TEST_* or --env-prefix):
  --suffix / SUFFIX
  --scan-roots / SCAN_ROOTS
  --package-suffix / PACKAGE_SUFFIX
  --package-prefix / PACKAGE_PREFIX
  --general-packages / GENERAL_PACKAGES
  --general-category / GENERAL_CATEGORY   (empty or none disables)
  --exclude-categories / EXCLUDE_CATEGORIES
  --exclude-files / EXCLUDE_FILES
  --file-pattern / FILE_PATTERN
  --category-mode / CATEGORY_MODE         dot-prefix | last-segment
  --env-prefix                            e.g. BLOCKERA_E2E
`);
}

function runCli() {
	try {
		const args = parseArgs(process.argv.slice(2));

		if (args.help) {
			printHelp();
			return;
		}

		const categories = listCategories(args);
		process.stdout.write(JSON.stringify(categories));
	} catch (error) {
		console.error(error.message || error);
		process.exit(1);
	}
}

module.exports = {
	listCategories,
	parseArgs,
	resolveOptions,
	runCli,
	sortCategories,
};
