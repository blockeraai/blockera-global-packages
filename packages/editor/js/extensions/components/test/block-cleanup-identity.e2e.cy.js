/**
 * Blockera dependencies
 */
import {
	createPost,
	appendBlocks,
	assertBlockData,
	getEditorContent,
	getSelectedBlock,
} from '@blockera/dev-cypress/js/helpers';

function openStylesPanel() {
	cy.switchBlockTab('styles');
}

function setFontSize(value) {
	cy.getParentContainer('Font Size').within(() => {
		cy.get('input[type="text"]').clear({ force: true });
		cy.get('input[type="text"]').type(String(value), { force: true });
	});
}

describe('Blockera identity cleanup', () => {
	beforeEach(() => {
		createPost();
	});

	it('drops blockeraId and blockera-block when the last feature is cleared', () => {
		appendBlocks(
			`<!-- wp:paragraph -->
<p>test</p>
<!-- /wp:paragraph -->`
		);

		cy.getBlock('core/paragraph').click();
		openStylesPanel();
		setFontSize(18);

		assertBlockData((data) => {
			expect(getSelectedBlock(data, 'blockeraFontSize')).to.equal('18px');
			expect(getSelectedBlock(data, 'blockeraId')).to.be.ok;
			expect(getSelectedBlock(data, 'className') || '').to.include(
				'blockera-block'
			);
			expect(getEditorContent(data)).to.include('blockeraId');
			expect(getEditorContent(data)).to.include('blockera-block');
		});

		cy.resetBlockeraAttribute('Typography', 'Font Size', 'reset');

		cy.getBlock('core/paragraph').should(
			'not.have.class',
			'blockera-block'
		);

		assertBlockData((data) => {
			const content = getEditorContent(data);

			expect(content).to.not.include('blockeraId');
			expect(content).to.not.include('blockera-block');
			expect(content).to.not.include('blockeraFontSize');
			expect(content).to.not.include('"typography":{}');
			expect(content).to.not.include('"style":{');
			expect(getSelectedBlock(data, 'style')).to.equal(undefined);
			expect(getSelectedBlock(data, 'blockeraId') || '').to.equal('');
		});
	});

	it('keeps non-Blockera class names when identity is stripped', () => {
		appendBlocks(
			`<!-- wp:paragraph {"className":"is-style-text-subtitle"} -->
<p class="is-style-text-subtitle">Fleurs is a flower delivery business.</p>
<!-- /wp:paragraph -->`
		);

		cy.getBlock('core/paragraph').click();
		openStylesPanel();
		setFontSize(18);

		assertBlockData((data) => {
			expect(getSelectedBlock(data, 'blockeraId')).to.be.ok;
			expect(getSelectedBlock(data, 'className') || '').to.include(
				'is-style-text-subtitle'
			);
			expect(getSelectedBlock(data, 'className') || '').to.include(
				'blockera-block'
			);
		});

		cy.resetBlockeraAttribute('Typography', 'Font Size', 'reset');

		cy.getBlock('core/paragraph')
			.should('have.class', 'is-style-text-subtitle')
			.and('not.have.class', 'blockera-block');

		assertBlockData((data) => {
			const content = getEditorContent(data);
			const className = getSelectedBlock(data, 'className') || '';

			expect(content).to.not.include('blockeraId');
			expect(content).to.not.include('blockera-block');
			expect(content).to.include('is-style-text-subtitle');
			expect(className).to.include('is-style-text-subtitle');
			expect(className).to.not.include('blockera-block');
			expect(getSelectedBlock(data, 'blockeraId') || '').to.equal('');
		});
	});
});
