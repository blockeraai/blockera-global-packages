/**
 * Internal dependencies
 */
const { escapeText, unwrapLocalizedPhp } = require('../escape-text');

describe('escapeText', () => {
	it('wraps plain text with esc_html_e and the given text domain', () => {
		expect(escapeText('Tell your story', 'blockera-one')).toBe(
			"<?php esc_html_e( 'Tell your story', 'blockera-one' ); ?>"
		);
	});

	it('uses esc_attr_e for attributes', () => {
		expect(escapeText('Picture of a flower', 'blockera-pro', true)).toBe(
			"<?php esc_attr_e( 'Picture of a flower', 'blockera-pro' ); ?>"
		);
	});

	it('uses custom htmlFn / attrFn from localize.text', () => {
		expect(
			escapeText('Hello', 'blockera-one', false, { htmlFn: 'esc_html__' })
		).toBe("<?php esc_html__( 'Hello', 'blockera-one' ); ?>");
		expect(
			escapeText('Alt', 'blockera-one', true, { attrFn: 'esc_attr__' })
		).toBe("<?php esc_attr__( 'Alt', 'blockera-one' ); ?>");
	});

	it('preserves leading space as &nbsp; and escapes single quotes', () => {
		expect(escapeText(" It's here", 'blockera-one')).toBe(
			"&nbsp;<?php esc_html_e( 'It\\'s here', 'blockera-one' ); ?>"
		);
	});

	it('leaves already-localized PHP untouched', () => {
		const php = "<?php esc_html_e( 'Hi', 'blockera-one' ); ?>";
		expect(escapeText(php, 'blockera-one')).toBe(php);
	});

	it('returns the original value when text or textDomain is empty', () => {
		expect(escapeText('Hello', '')).toBe('Hello');
		expect(escapeText('   ', 'blockera-one')).toBe('   ');
		expect(escapeText('', 'blockera-one')).toBe('');
	});

	it('wraps a single character when it is not a skipped stamp', () => {
		expect(escapeText('•', 'blockera-one')).toBe(
			"<?php esc_html_e( '•', 'blockera-one' ); ?>"
		);
	});
});

describe('unwrapLocalizedPhp', () => {
	it('returns the i18n string argument', () => {
		expect(
			unwrapLocalizedPhp("<?php esc_html_e( '•', 'blockera-one' ); ?>")
		).toBe('•');
		expect(
			unwrapLocalizedPhp(
				"<?php esc_html_e( 'Custom sep', 'blockera-one' ); ?>"
			)
		).toBe('Custom sep');
	});

	it('returns null when the snippet is not an i18n echo', () => {
		expect(unwrapLocalizedPhp('•')).toBeNull();
		expect(unwrapLocalizedPhp("<?php echo 'x'; ?>")).toBeNull();
	});
});
