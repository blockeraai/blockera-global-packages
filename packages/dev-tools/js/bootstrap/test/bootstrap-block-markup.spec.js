/**
 * External dependencies
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

/**
 * Internal dependencies
 */
const { CONFIG_FILE_NAME } = require('../../block-markup/load-config');
const {
	isBlockMarkupBootstrapActive,
	collectBlockMarkupBootstrapSteps,
	collectPatternsStep,
	collectTemplatesStep,
} = require('../bootstrap-block-markup');

/**
 * @param {string} root Temp product root.
 * @param {Object} config `.block-markup.config.js` export.
 */
function writeConfig(root, config) {
	fs.writeFileSync(
		path.join(root, CONFIG_FILE_NAME),
		`module.exports = ${JSON.stringify(config, null, 2)};\n`,
		'utf8'
	);
}

describe('bootstrap-block-markup', () => {
	let tempRoot;

	beforeEach(() => {
		tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'bootstrap-bm-'));
	});

	afterEach(() => {
		fs.rmSync(tempRoot, { recursive: true, force: true });
	});

	it('is inactive when the config file is missing', () => {
		expect(isBlockMarkupBootstrapActive(tempRoot)).toBe(false);
	});

	it('is inactive when webpack is disabled', () => {
		writeConfig(tempRoot, {
			textDomain: 'x',
			uriPhpExpression: 'get_template_directory_uri()',
			templatesDirs: ['templates'],
			webpack: false,
		});
		fs.mkdirSync(path.join(tempRoot, 'templates'), { recursive: true });
		fs.writeFileSync(
			path.join(tempRoot, 'templates', 'index.html'),
			'<!-- wp:paragraph --><p>Hi</p><!-- /wp:paragraph -->',
			'utf8'
		);

		expect(isBlockMarkupBootstrapActive(tempRoot)).toBe(false);
	});

	it('is inactive when configured dirs have no matching source files', () => {
		writeConfig(tempRoot, {
			textDomain: 'x',
			uriPhpExpression: 'get_template_directory_uri()',
			patternsDirs: ['patterns'],
			templatesDirs: ['templates'],
			webpack: true,
		});
		fs.mkdirSync(path.join(tempRoot, 'patterns'), { recursive: true });
		fs.mkdirSync(path.join(tempRoot, 'templates'), { recursive: true });

		expect(isBlockMarkupBootstrapActive(tempRoot)).toBe(false);
	});

	it('collects patterns and templates steps when both have source files', () => {
		writeConfig(tempRoot, {
			textDomain: 'x',
			uriPhpExpression: 'get_template_directory_uri()',
			patternsDirs: ['patterns', 'patterns-extra'],
			templatesDirs: ['templates'],
			webpack: true,
		});

		fs.mkdirSync(path.join(tempRoot, 'patterns'), { recursive: true });
		fs.writeFileSync(
			path.join(tempRoot, 'patterns', 'hero.php'),
			'<!-- wp:paragraph --><p>Hero</p><!-- /wp:paragraph -->',
			'utf8'
		);
		fs.mkdirSync(path.join(tempRoot, 'patterns-extra'), { recursive: true });
		fs.writeFileSync(
			path.join(tempRoot, 'patterns-extra', 'cta.php'),
			'<!-- wp:paragraph --><p>CTA</p><!-- /wp:paragraph -->',
			'utf8'
		);
		fs.mkdirSync(path.join(tempRoot, 'templates'), { recursive: true });
		fs.writeFileSync(
			path.join(tempRoot, 'templates', 'index.html'),
			'<!-- wp:paragraph --><p>Index</p><!-- /wp:paragraph -->',
			'utf8'
		);

		expect(isBlockMarkupBootstrapActive(tempRoot)).toBe(true);

		const { steps } = collectBlockMarkupBootstrapSteps(tempRoot);

		expect(steps).toHaveLength(2);
		expect(steps[0].name).toBe('Track patterns');
		expect(steps[0].inners.map((inner) => inner.name)).toEqual([
			'patterns/',
			'patterns-extra/',
		]);
		expect(steps[1].name).toBe('Track templates');
		expect(steps[1].inners.map((inner) => inner.name)).toEqual([
			'templates/',
		]);
	});

	it('returns a single templates step for templates-only configs', () => {
		writeConfig(tempRoot, {
			textDomain: 'x',
			uriPhpExpression: 'get_template_directory_uri()',
			templatesDirs: ['tests/fixtures'],
			webpack: true,
		});
		fs.mkdirSync(path.join(tempRoot, 'tests', 'fixtures'), {
			recursive: true,
		});
		fs.writeFileSync(
			path.join(tempRoot, 'tests', 'fixtures', 'input.html'),
			'<!-- wp:paragraph --><p>Fixture</p><!-- /wp:paragraph -->',
			'utf8'
		);

		const { steps } = collectBlockMarkupBootstrapSteps(tempRoot);

		expect(steps).toHaveLength(1);
		expect(steps[0].name).toBe('Track templates');
		expect(steps[0].inners).toEqual([{ name: 'tests/fixtures/' }]);
	});

	it('skips empty pattern dirs when collecting the patterns step', () => {
		const { loadBlockMarkupConfig } = require('../../block-markup/load-config');

		writeConfig(tempRoot, {
			textDomain: 'x',
			uriPhpExpression: 'get_template_directory_uri()',
			patternsDirs: ['patterns', 'patterns-empty'],
			webpack: true,
		});
		fs.mkdirSync(path.join(tempRoot, 'patterns'), { recursive: true });
		fs.writeFileSync(
			path.join(tempRoot, 'patterns', 'hero.php'),
			'<!-- wp:paragraph --><p>Hero</p><!-- /wp:paragraph -->',
			'utf8'
		);
		fs.mkdirSync(path.join(tempRoot, 'patterns-empty'), { recursive: true });

		const config = loadBlockMarkupConfig({ quiet: true }, tempRoot);
		const patterns = collectPatternsStep(config);

		expect(patterns).not.toBeNull();
		expect(patterns.inners).toEqual([{ name: 'patterns/' }]);
		expect(collectTemplatesStep(config)).toBeNull();
	});
});
