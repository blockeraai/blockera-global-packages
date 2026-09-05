/**
 * Blockera dependencies
 */
import {
	createPost,
	appendBlocks,
	getWPDataObject,
	getSelectedBlock,
} from '@blockera/dev-cypress/js/helpers';

describe('icon-control → custom SVG upload', () => {
	beforeEach(() => {
		createPost();
		appendBlocks(`<!-- wp:buttons -->
<div class="wp-block-buttons"><!-- wp:button -->
<div class="wp-block-button"><a class="wp-block-button__link wp-element-button">Test btn 1</a></div>
<!-- /wp:button --></div>
<!-- /wp:buttons -->`);

		cy.getBlock('core/button').click();

		cy.getByAriaControls('settings-view').click();
	});

	it('should be able to upload custom svg when there is selected icon', () => {
		cy.getByAriaLabel('Choose Icon…').first().click();
		cy.selectIconByName('add-card');

		cy.getByDataCy('upload-svg-btn').click({ force: true });

		cy.contains('button', /Browse WordPress Media Library/i).click({
			force: true,
		});

		// Match free media-image e2e: open Upload files, then selectFile.
		cy.get('.media-modal').should('be.visible');
		cy.get('.media-modal').within(() => {
			cy.contains('button', 'Upload files').click();

			cy.get('input[type="file"]').selectFile(
				'packages/global-packages/packages/dev-cypress/js/fixtures/home.svg',
				{
					force: true,
				}
			);

			cy.get('.media-toolbar-primary > .button')
				.should('not.be.disabled')
				.click();
		});

		// Wait for async media fetch + SVG sanitize before inserting.
		cy.get('.blockera-control-icon-picker-modal').within(() => {
			cy.contains(
				'.blockera-control-icon-picker-custom-icon-footer-status-valid-label',
				/Valid SVG/i
			).should('be.visible');
			cy.contains('button', /^Use icon$/i)
				.should('not.be.disabled')
				.click();
		});

		getWPDataObject().then((data) => {
			const uploadSVG = getSelectedBlock(data, 'blockeraIcon')?.uploadSVG;
			expect(uploadSVG, 'uploadSVG object').to.be.an('object');
			expect(uploadSVG.filename).to.match(/home(-\d+)?\.svg/);
		});
	});
});
