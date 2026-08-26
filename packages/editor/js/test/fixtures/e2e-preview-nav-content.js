/**
 * Load serialized blocks from the PHP nowdoc fixture (preview click-navigation).
 *
 * Cypress `readFile` is relative to the consumer plugin root (e.g. blockera/).
 */
const FIXTURE_PATH =
	'packages/global-packages/packages/editor/js/test/fixtures/e2e-preview-nav-content.php';

/**
 * @return {Cypress.Chainable<string>} Serialized Gutenberg block markup.
 */
export function loadE2EPreviewNavBlocks() {
	return cy.readFile(FIXTURE_PATH).then((php) => {
		const match = String(php).match(/<<<'HTML'\r?\n([\s\S]*?)\r?\nHTML;/);

		expect(match, 'PHP nowdoc HTML body in e2e-preview-nav-content.php').to
			.exist;

		const markup = match[1].trim();

		expect(markup).to.include('blockera-e2e-preview-nav-fixture');
		expect(markup).to.include('blockera-e2e-preview-paragraph-link');
		expect(markup).to.include('blockera-e2e-preview-linked-image');
		expect(markup).to.include('blockera-e2e-preview-button-link');
		expect(markup).to.include('blockera-e2e-preview-featured-image');
		expect(markup).to.include('example.com/blockera-e2e-preview-paragraph');
		expect(markup).to.include('"isLink":true');
		expect(markup).to.include('"useFirstImageFromPost":true');

		return markup;
	});
}
