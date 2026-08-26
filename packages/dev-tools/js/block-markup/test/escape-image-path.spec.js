/**
 * Internal dependencies
 */
const {
	escapeImagePath,
	hasStaticImagePaths,
	escapeRegExp,
} = require('../escape-image-path');

describe('escapeRegExp', () => {
	it('escapes regex metacharacters', () => {
		expect(escapeRegExp('a.b*c')).toBe('a\\.b\\*c');
		expect(escapeRegExp('foo(bar)')).toBe('foo\\(bar\\)');
	});
});

describe('escapeImagePath', () => {
	it('rewrites absolute assets URLs with a custom URI expression', () => {
		const src =
			'https://site-blockera.test/wp-content/themes/blockera-one/assets/images/book.webp';

		expect(
			escapeImagePath(src, {
				uriPhpExpression: 'get_template_directory_uri()',
				imagePathRoots: ['assets', 'patterns/images'],
			})
		).toBe(
			'<?php echo esc_url( get_template_directory_uri() ); ?>/assets/images/book.webp'
		);
	});

	it('rewrites patterns/images URLs with a plugin URI expression', () => {
		const src =
			'https://example.test/wp-content/plugins/blockera-pro/patterns/images/avatar.webp';

		expect(
			escapeImagePath(src, {
				uriPhpExpression: "plugins_url( '/', BLOCKERA_PRO_FILE )",
				imagePathRoots: ['assets', 'patterns/images'],
			})
		).toBe(
			"<?php echo esc_url( plugins_url( '/', BLOCKERA_PRO_FILE ) ); ?>/patterns/images/avatar.webp"
		);
	});

	it('rewrites a relative path that contains an image root', () => {
		expect(
			escapeImagePath('/wp-content/themes/x/assets/images/book.webp')
		).toBe(
			'<?php echo esc_url( get_template_directory_uri() ); ?>/assets/images/book.webp'
		);
	});

	it('leaves already-dynamic src untouched', () => {
		const src =
			'<?php echo esc_url( get_template_directory_uri() ); ?>/assets/images/book.webp';
		expect(
			escapeImagePath(src, {
				uriPhpExpression: 'get_template_directory_uri()',
			})
		).toBe(src);
	});

	it('leaves unrelated URLs untouched', () => {
		expect(escapeImagePath('https://cdn.example/logo.webp')).toBe(
			'https://cdn.example/logo.webp'
		);
		expect(escapeImagePath('')).toBe('');
	});
});

describe('hasStaticImagePaths', () => {
	it('detects absolute src and block comment url fields', () => {
		expect(
			hasStaticImagePaths(
				'<img src="https://site.test/assets/images/a.webp" />'
			)
		).toBe(true);
		expect(
			hasStaticImagePaths(
				'<!-- wp:cover {"url":"https://site.test/assets/images/c.webp"} -->'
			)
		).toBe(true);
		expect(
			hasStaticImagePaths(
				'<img src="<?php echo esc_url( get_template_directory_uri() ); ?>/assets/images/a.webp" />'
			)
		).toBe(false);
	});
});
