/**
 * Blockera dependencies
 */
import {
	appendBlocks,
	assertBlockData,
	createPost,
	getSelectedBlock,
	redirectToFrontPage,
	savePage,
} from '@blockera/dev-cypress/js/helpers';

describe('core/icon → width sets height auto', () => {
	beforeEach(() => {
		createPost();
	});

	it('sets height auto from icon size in the editor and on the frontend', () => {
		appendBlocks(`<!-- wp:icon {"icon":"core/image"} /-->`);

		cy.getBlock('core/icon').first().click();

		cy.getByAriaControls('settings-view').click();

		cy.get('.blockera-extension-icon').should('be.visible');

		cy.get('.blockera-extension-icon').within(() => {
			cy.getParentContainer('Size').within(() => {
				cy.get('input').clear({ force: true });
				cy.get('input').type(48, { force: true });
			});
		});

		assertBlockData((data) => {
			expect(getSelectedBlock(data, 'blockeraWidth')).to.equal('48px');
			expect(getSelectedBlock(data, 'blockeraHeight')).to.equal('auto');
		});

		cy.getBlockeraStylesWrapper()
			.invoke('text')
			.should('include', 'width: 48px')
			.and('include', 'height: auto');

		savePage();
		redirectToFrontPage();

		cy.get('.wp-block-icon svg').should('exist');

		cy.get('style#blockera-inline-css')
			.invoke('text')
			.should('include', 'width: 48px')
			.and('include', 'height: auto');
	});

	it('keeps a custom height when size or width changes in the editor and on the frontend', () => {
		appendBlocks(`<!-- wp:icon {"icon":"core/image"} /-->`);

		cy.getBlock('core/icon').first().click();

		cy.getByAriaControls('styles-view').click();

		cy.getParentContainer('Height').within(() => {
			cy.get('select').select('px', { force: true });
			cy.get('input').clear({ force: true });
			cy.get('input').type(32, { force: true });
		});

		assertBlockData((data) => {
			expect(getSelectedBlock(data, 'blockeraHeight')).to.equal('32px');
		});

		cy.getParentContainer('Width').within(() => {
			cy.get('input').clear({ force: true });
			cy.get('input').type(64, { force: true });
		});

		assertBlockData((data) => {
			expect(getSelectedBlock(data, 'blockeraWidth')).to.equal('64px');
			expect(getSelectedBlock(data, 'blockeraHeight')).to.equal('32px');
		});

		cy.getByAriaControls('settings-view').click();

		cy.get('.blockera-extension-icon').should('be.visible');

		cy.get('.blockera-extension-icon').within(() => {
			cy.getParentContainer('Size').within(() => {
				cy.get('input').clear({ force: true });
				cy.get('input').type(80, { force: true });
			});
		});

		assertBlockData((data) => {
			expect(getSelectedBlock(data, 'blockeraWidth')).to.equal('80px');
			expect(getSelectedBlock(data, 'blockeraHeight')).to.equal('32px');
		});

		cy.getBlockeraStylesWrapper()
			.invoke('text')
			.should('include', 'width: 80px')
			.and('include', 'height: 32px');

		savePage();
		redirectToFrontPage();

		cy.get('.wp-block-icon svg').should('exist');

		cy.get('style#blockera-inline-css')
			.invoke('text')
			.should('include', 'width: 80px')
			.and('include', 'height: 32px');
	});
});
