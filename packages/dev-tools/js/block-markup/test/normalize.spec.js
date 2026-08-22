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
	normalizePatternContent,
	normalizeMarkupContent,
	normalizePatterns,
	normalizeBlockMarkup,
	checkPatterns,
	hasPatternPhpFiles,
	hasSourceFiles,
	needsTranslation,
	normalizePatternsDirs,
} = require('../normalize');
const { baseConfig } = require('../base-config');

const baseOptions = {
	textDomain: 'blockera-one',
	uriPhpExpression: 'get_template_directory_uri()',
	imagePathRoots: ['assets', 'patterns/images'],
	sanitize: baseConfig.sanitize,
	localize: baseConfig.localize,
	prettier: baseConfig.prettier,
};

describe('normalizeMarkupContent', () => {
	it('normalizes heading text, alt, aria-label, and image src', async () => {
		const input = `<?php
/**
 * Title: Sample
 */
?>
<!-- wp:group -->
<div class="wp-block-group" aria-label="Post navigation">
	<h2 class="wp-block-heading">The Stories Book</h2>
	<img src="https://site.test/wp-content/themes/blockera-one/assets/images/book.webp" alt="Book cover"/>
</div>
<!-- /wp:group -->
`;

		const output = await normalizePatternContent(input, baseOptions);

		expect(output).toContain(
			"<?php esc_html_e( 'The Stories Book', 'blockera-one' ); ?>"
		);
		expect(output).toContain(
			"<?php esc_attr_e( 'Post navigation', 'blockera-one' ); ?>"
		);
		expect(output).toContain(
			"<?php esc_attr_e( 'Book cover', 'blockera-one' ); ?>"
		);
		expect(output).toContain(
			'<?php echo esc_url( get_template_directory_uri() ); ?>/assets/images/book.webp'
		);
	});

	it('does not localize template markup when localize is not a step', async () => {
		const input =
			'<!-- wp:group --><div class="wp-block-group"><p>Hello</p></div><!-- /wp:group -->\n';

		const output = await normalizeMarkupContent(input, {
			...baseOptions,
			steps: ['prettier', 'sanitize'],
		});

		expect(output).not.toContain('esc_html_e');
		expect(output).toContain('Hello');
	});

	it('skips text wrapping when html.textNodes is disabled', async () => {
		const { config } = require('../merge-config').mergeBlockMarkupConfig({
			localize: {
				html: { textNodes: { enabled: false } },
			},
		});

		const output = await normalizeMarkupContent(
			'<!-- wp:heading --><h2 class="wp-block-heading">Hello</h2><!-- /wp:heading -->\n',
			{
				...baseOptions,
				localize: config.localize,
				steps: ['sanitize', 'localize'],
			}
		);

		expect(output).toContain('Hello');
		expect(output).not.toContain('esc_html_e');
	});

	it('strips core/query queryId from already-normalized content', async () => {
		const input = `<?php
/**
 * Title: Listing
 */
?>
<!-- wp:query {"queryId":4,"query":{"perPage":9,"inherit":true},"align":"full"} -->
<div class="wp-block-query alignfull">
	<h2 class="wp-block-heading"><?php esc_html_e( 'Hello', 'blockera-one' ); ?></h2>
</div>
<!-- /wp:query -->
`;

		const output = await normalizePatternContent(input, baseOptions);

		expect(output).not.toContain('"queryId"');
		expect(output).toContain('"query":{"perPage":9,"inherit":true}');
	});

	it('does not rewrite images when localize.images is disabled', async () => {
		const { config } = require('../merge-config').mergeBlockMarkupConfig({
			localize: { images: { enabled: false } },
		});
		const src =
			'https://site.test/wp-content/themes/blockera-one/assets/images/book.webp';

		const output = await normalizeMarkupContent(
			`<!-- wp:image --><figure><img src="${src}" alt=""/></figure><!-- /wp:image -->\n`,
			{
				...baseOptions,
				localize: config.localize,
				steps: ['sanitize', 'localize'],
			}
		);

		expect(output).toContain(src);
		expect(output).not.toContain('esc_url');
	});
});

describe('normalizePatterns / checkPatterns', () => {
	let tempDir;

	beforeEach(() => {
		tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'block-markup-'));
	});

	afterEach(() => {
		fs.rmSync(tempDir, { recursive: true, force: true });
	});

	function writePattern(name, content) {
		const filePath = path.join(tempDir, name);
		fs.writeFileSync(filePath, content, 'utf8');
		return filePath;
	}

	it('hasPatternPhpFiles / hasSourceFiles detect matching files', () => {
		expect(hasPatternPhpFiles(tempDir)).toBe(false);
		expect(hasSourceFiles(tempDir, '**/*.html')).toBe(false);
		writePattern('a.php', '<?php\n?>\n<p>Hi</p>\n');
		expect(hasPatternPhpFiles(tempDir)).toBe(true);
	});

	it('needsTranslation is true when text domain is missing', () => {
		expect(needsTranslation('<?php\n?>\n<p>Hi</p>', 'blockera-one')).toBe(
			true
		);
		expect(
			needsTranslation(
				"<?php esc_html_e( 'Hi', 'blockera-one' ); ?>",
				'blockera-one'
			)
		).toBe(false);
	});

	it('writes normalized files and is then clean under checkPatterns', async () => {
		writePattern(
			'hero.php',
			`<?php
/**
 * Title: Hero
 */
?>
<!-- wp:heading -->
<h2 class="wp-block-heading">The Stories Book</h2>
<!-- /wp:heading -->
`
		);

		const writeResult = await normalizePatterns({
			patternsDir: tempDir,
			textDomain: 'blockera-one',
			uriPhpExpression: 'get_template_directory_uri()',
			quiet: true,
		});

		expect(writeResult.ok).toBe(true);
		expect(writeResult.changedFiles).toHaveLength(1);

		const checkResult = await checkPatterns({
			patternsDir: tempDir,
			textDomain: 'blockera-one',
			uriPhpExpression: 'get_template_directory_uri()',
			quiet: true,
		});

		expect(checkResult.ok).toBe(true);
		expect(checkResult.changedFiles).toHaveLength(0);
	});

	it('reports dirty files under check without writing', async () => {
		const filePath = writePattern(
			'hero.php',
			`<?php
/**
 * Title: Hero
 */
?>
<!-- wp:heading -->
<h2 class="wp-block-heading">Dirty</h2>
<!-- /wp:heading -->
`
		);

		const result = await checkPatterns({
			patternsDir: tempDir,
			textDomain: 'blockera-one',
			uriPhpExpression: 'get_template_directory_uri()',
			quiet: true,
		});

		expect(result.ok).toBe(false);
		expect(fs.readFileSync(filePath, 'utf8')).toContain('>Dirty<');
	});

	it('normalizes a template HTML file without injecting i18n', async () => {
		const templatesDir = path.join(tempDir, 'templates');
		fs.mkdirSync(templatesDir);
		fs.writeFileSync(
			path.join(templatesDir, 'archive.html'),
			'<!-- wp:group --><div class="wp-block-group"><p>Archive</p></div><!-- /wp:group -->\n',
			'utf8'
		);

		const result = await normalizePatterns({
			templatesDirs: [templatesDir],
			textDomain: 'blockera-one',
			uriPhpExpression: 'get_template_directory_uri()',
			quiet: true,
		});

		expect(result.ok).toBe(true);
		const written = fs.readFileSync(
			path.join(templatesDir, 'archive.html'),
			'utf8'
		);
		expect(written).not.toContain('esc_html_e');
		expect(written).toContain('Archive');
	});

	it('prettier-only does not localize or sanitize', async () => {
		writePattern(
			'hero.php',
			`<?php
/**
 * Title: Hero
 */
?>
<!-- wp:query {"queryId":4,"query":{"inherit":true}} --><div class="wp-block-query"><h2>Hello</h2></div><!-- /wp:query -->
`
		);

		await normalizeBlockMarkup({
			patternsDir: tempDir,
			textDomain: 'blockera-one',
			uriPhpExpression: 'get_template_directory_uri()',
			prettierOnly: true,
			quiet: true,
		});

		const written = fs.readFileSync(path.join(tempDir, 'hero.php'), 'utf8');
		expect(written).toContain('"queryId"');
		expect(written).not.toContain('esc_html_e');
	});

	it('is a no-op when no source dirs exist', async () => {
		const result = await normalizeBlockMarkup({
			textDomain: 'blockera-one',
			quiet: true,
		});

		expect(result.ok).toBe(true);
		expect(result.changedFiles).toHaveLength(0);
	});

	it('throws when textDomain is missing', async () => {
		await expect(
			normalizeBlockMarkup({ patternsDir: tempDir, quiet: true })
		).rejects.toThrow('textDomain');
	});

	it('normalizePatternsDirs accepts legacy patternsDir string', () => {
		expect(normalizePatternsDirs({ patternsDir: '/a/patterns' })).toEqual([
			'/a/patterns',
		]);
		expect(
			normalizePatternsDirs({ patternsDirs: ['/a', '/b'] })
		).toEqual(['/a', '/b']);
		expect(normalizePatternsDirs({})).toEqual([]);
	});
});
