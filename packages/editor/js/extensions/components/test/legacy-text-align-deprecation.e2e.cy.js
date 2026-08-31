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

/**
 * core/post-author-name ships a textAlign deprecation (`isEligible` + migrate).
 * That path used to re-parse without Blockera schemas and drop before/after.
 */
const POST_AUTHOR_NAME_TEXT_ALIGN_BEFORE_AFTER = `<!-- wp:post-author-name {"textAlign":"center","isLink":true,"blockeraPropsId":"cd1d95df-c02c-4113-8eed-75336a32a61d","blockeraCompatId":"1018195845253","blockeraBackgroundColor":{"value":"#d7c8a0"},"blockeraBlockStates":{"value":{"hover":{"breakpoints":{"desktop":{"attributes":{"blockeraBackgroundColor":"#b7a269"}}},"isVisible":true},"before":{"content":"Before","breakpoints":{"desktop":{"attributes":{"blockeraBackgroundColor":"#00000030","blockeraFontColor":"#ffffff"}}},"isVisible":true},"after":{"content":"After","breakpoints":{"desktop":{"attributes":{"blockeraBackgroundColor":"#00000054","blockeraFontColor":"#ffffff"}}},"isVisible":true}}},"blockeraInnerBlocks":{"value":{"elements/link":{"attributes":{"blockeraFontColor":"#f8f4f4","blockeraBlockStates":{"before":{"content":"Before","breakpoints":{"desktop":{"attributes":{"blockeraFontSize":"14px"}}},"isVisible":true},"after":{"content":"After","breakpoints":{"desktop":{"attributes":{"blockeraFontSize":"14px"}}},"isVisible":true}}}}}},"blockeraFontColor":{"value":"#ce7e06"},"blockeraTextAlign":{"value":"center"},"className":"blockera-block blockera-block-2","style":{"color":{"background":"#d7c8a0","text":"#ce7e06"},"elements":{"link":{"color":{"text":"#f8f4f4"}}},"typography":{"fontSize":"18px"}}} /-->`;

describe('Legacy textAlign deprecation preserves Blockera states', () => {
	beforeEach(() => {
		createPost();
	});

	it('keeps before/after on post-author-name after id migrate and cleanup', () => {
		appendBlocks(POST_AUTHOR_NAME_TEXT_ALIGN_BEFORE_AFTER);

		cy.getBlock('core/post-author-name').click();

		assertBlockData((data) => {
			const content = getEditorContent(data);
			const blockStates = getSelectedBlock(data, 'blockeraBlockStates');
			const innerBlocks = getSelectedBlock(data, 'blockeraInnerBlocks');
			const linkStates =
				innerBlocks?.['elements/link']?.attributes?.blockeraBlockStates;

			expect(content).to.not.include('blockeraPropsId');
			expect(content).to.not.include('blockeraCompatId');
			expect(content).to.include('"content":"Before"');
			expect(content).to.include('"content":"After"');
			expect(content).to.include('blockeraBlockStates');
			expect(content).to.include('blockeraInnerBlocks');
			expect(getSelectedBlock(data, 'blockeraId') || '').to.match(
				/^[0-9a-z]{6}$/
			);
			expect(getSelectedBlock(data, 'blockeraBackgroundColor')).to.equal(
				'#d7c8a0'
			);
			expect(blockStates?.before?.content).to.equal('Before');
			expect(blockStates?.after?.content).to.equal('After');
			expect(
				blockStates?.hover?.breakpoints?.desktop?.attributes
					?.blockeraBackgroundColor
			).to.equal('#b7a269');
			expect(linkStates?.before?.content).to.equal('Before');
			expect(linkStates?.after?.content).to.equal('After');
		});
	});
});
