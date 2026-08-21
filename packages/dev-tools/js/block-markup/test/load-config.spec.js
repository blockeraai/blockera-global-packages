/**
 * External dependencies
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

/**
 * Internal dependencies
 */
const {
	normalizeDirsRelative,
	resolveDirs,
	sourceHasStep,
	loadBlockMarkupConfig,
	CONFIG_FILE_NAME,
} = require('../load-config');

describe('normalizeDirsRelative', () => {
	it('does not fall back to patterns/ or templates/ when unset', () => {
		expect(normalizeDirsRelative(undefined, undefined)).toEqual([]);
		expect(normalizeDirsRelative(null, '')).toEqual([]);
	});

	it('normalizes an explicit singular dir', () => {
		expect(normalizeDirsRelative(undefined, 'templates')).toEqual([
			'templates',
		]);
	});

	it('filters empty array entries and ignores unknown types', () => {
		expect(normalizeDirsRelative(['patterns', ''], undefined)).toEqual([
			'patterns',
		]);
		expect(normalizeDirsRelative(12, undefined)).toEqual([]);
	});
});

describe('resolveDirs / sourceHasStep', () => {
	it('joins relative dirs onto the product root', () => {
		expect(resolveDirs(['templates'], '/theme')).toEqual([
			path.join('/theme', 'templates'),
		]);
	});

	it('keeps already-absolute dirs', () => {
		expect(resolveDirs(['/abs/templates'], '/theme')).toEqual([
			'/abs/templates',
		]);
	});

	it('detects a named pipeline step', () => {
		expect(sourceHasStep(['prettier', 'sanitize'], 'prettier')).toBe(true);
		expect(sourceHasStep(['prettier'], 'localize')).toBe(false);
		expect(sourceHasStep(undefined, 'prettier')).toBe(false);
	});
});

describe('loadBlockMarkupConfig', () => {
	it('loads dirs from the product file', () => {
		const productRoot = path.resolve(__dirname, '../../../../../../..');
		const loaded = loadBlockMarkupConfig({ quiet: true }, productRoot);

		expect(loaded.patternsDirs).toEqual([]);
		expect(
			loaded.templatesDirs.some((dir) => dir.endsWith('tests/fixtures'))
		).toBe(true);
		expect(loaded.sources).toHaveLength(1);
		expect(loaded.sources[0].kind).toBe('templates');
		expect(loaded.sources[0].steps).toEqual(['prettier']);
	});

	it('disables webpack when the product sets webpack: false', () => {
		const root = fs.mkdtempSync(
			path.join(os.tmpdir(), 'block-markup-nowp-')
		);
		fs.writeFileSync(
			path.join(root, CONFIG_FILE_NAME),
			`module.exports = {
				textDomain: 'x',
				uriPhpExpression: 'get_template_directory_uri()',
				templatesDirs: ['templates'],
				webpack: false,
			};\n`,
			'utf8'
		);

		const loaded = loadBlockMarkupConfig({ quiet: true }, root);
		expect(loaded.webpack).toBe(false);

		fs.rmSync(root, { recursive: true, force: true });
	});

	it('forces prettier-only steps on every source', () => {
		const themeRoot = path.resolve(__dirname, '../../../../../../..');
		const loaded = loadBlockMarkupConfig(
			{ quiet: true, prettierOnly: true },
			themeRoot
		);

		expect(loaded.prettierOnly).toBe(true);
		for (const source of loaded.sources) {
			expect(source.steps).toEqual(['prettier']);
		}
	});

	it('throws when the product config file is missing', () => {
		const missingRoot = fs.mkdtempSync(
			path.join(os.tmpdir(), 'block-markup-missing-')
		);

		expect(() =>
			loadBlockMarkupConfig({ quiet: true }, missingRoot)
		).toThrow(CONFIG_FILE_NAME);

		fs.rmSync(missingRoot, { recursive: true, force: true });
	});

	it('throws when textDomain is missing', () => {
		const root = fs.mkdtempSync(
			path.join(os.tmpdir(), 'block-markup-ntd-')
		);
		fs.writeFileSync(
			path.join(root, CONFIG_FILE_NAME),
			`module.exports = { uriPhpExpression: "get_template_directory_uri()" };\n`,
			'utf8'
		);

		expect(() => loadBlockMarkupConfig({ quiet: true }, root)).toThrow(
			'textDomain'
		);

		fs.rmSync(root, { recursive: true, force: true });
	});

	it('throws when uriPhpExpression is missing', () => {
		const root = fs.mkdtempSync(
			path.join(os.tmpdir(), 'block-markup-nuri-')
		);
		fs.writeFileSync(
			path.join(root, CONFIG_FILE_NAME),
			`module.exports = { textDomain: 'x' };\n`,
			'utf8'
		);

		expect(() => loadBlockMarkupConfig({ quiet: true }, root)).toThrow(
			'uriPhpExpression'
		);

		fs.rmSync(root, { recursive: true, force: true });
	});
});
