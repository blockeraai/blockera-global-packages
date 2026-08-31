/**
 * Load serialized blocks from the PHP nowdoc fixture (theme-independent tall HTML).
 *
 * Cypress `readFile` is relative to the consumer plugin root (e.g. blockera/).
 */
const FIXTURE_PATH =
	'packages/global-packages/packages/editor/js/test/fixtures/e2e-tall-scroll-content.php';

/**
 * @return {Cypress.Chainable<string>} Serialized Gutenberg block markup.
 */
export function loadE2ETallScrollBlocks() {
	return cy.readFile(FIXTURE_PATH).then((php) => {
		const match = String(php).match(/<<<'HTML'\r?\n([\s\S]*?)\r?\nHTML;/);

		expect(match, 'PHP nowdoc HTML body in e2e-tall-scroll-content.php').to
			.exist;

		const markup = match[1].trim();

		expect(markup).to.include('blockera-e2e-tall-scroll-fixture');
		expect(markup).to.include('8000px');

		return markup;
	});
}
