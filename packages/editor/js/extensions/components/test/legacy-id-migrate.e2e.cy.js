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

describe('Legacy blockeraPropsId / blockeraCompatId migrate', () => {
	beforeEach(() => {
		createPost();
	});

	it('rewrites legacy ids to blockeraId and matches canvas CSS', () => {
		appendBlocks(
			`<!-- wp:paragraph {"blockeraPropsId":"d03e38bb-a490-42dc-8a2c-9016a8e40f6c","blockeraCompatId":"rdnm2t","blockeraFontColor":{"value":"#e82121"},"blockeraFontSize":{"value":"22px"},"className":"blockera-block blockera-block--ohw5i7","style":{"typography":{"fontSize":"22px"},"color":{"text":"#e82121"}}} -->
<p class="blockera-block blockera-block--ohw5i7 has-text-color" style="color:#e82121;font-size:22px">Our vision is to make Block Editor the ultimate no-code platform.</p>
<!-- /wp:paragraph -->`
		);

		cy.getBlock('core/paragraph').click();

		assertBlockData((data) => {
			const content = getEditorContent(data);
			const blockeraId = getSelectedBlock(data, 'blockeraId') || '';
			const className = getSelectedBlock(data, 'className') || '';

			expect(content).to.not.include('blockeraPropsId');
			expect(content).to.not.include('blockeraCompatId');
			expect(content).to.not.include('blockera-block--ohw5i7');
			expect(blockeraId).to.match(/^[0-9a-z]{6}$/);
			expect(className).to.include('blockera-block');
			expect(className).to.include(`blockera-block-${blockeraId}`);
			expect(className).to.not.include('blockera-block--ohw5i7');
			expect(getSelectedBlock(data, 'blockeraFontColor')).to.equal(
				'#e82121'
			);
			expect(getSelectedBlock(data, 'blockeraFontSize')).to.equal('22px');
		});

		cy.getBlock('core/paragraph').should(($block) => {
			const className = $block.attr('class') || '';
			const match = className.match(/\bblockera-block-([0-9a-z]{6})\b/);

			expect(className).to.include('blockera-block');
			expect(className).to.not.include('blockera-block--ohw5i7');
			expect(match).to.not.equal(null);
		});

		cy.getBlock('core/paragraph').then(($block) => {
			const match = ($block.attr('class') || '').match(
				/\bblockera-block-([0-9a-z]{6})\b/
			);
			const blockeraId = match ? match[1] : '';

			cy.wrap($block)
				.should('have.css', 'font-size', '22px')
				.and('have.css', 'color', 'rgb(232, 33, 33)');

			cy.getBlockeraStylesWrapper().should(($wrapper) => {
				expect($wrapper.text()).to.include(
					`.blockera-block-${blockeraId}`
				);
			});
		});
	});
});
