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

	it('rewrites legacy ids and strips unused defaults and empty breakpoints', () => {
		appendBlocks(
			`<!-- wp:group {"blockeraPropsId":"f1ad0645-de45-4744-af1e-889e4e220c1c","blockeraCompatId":"-i6sg03","blockeraBackgroundColor":{"value":"#eff4ff"},"blockeraBlockStates":{"value":{"normal":{"breakpoints":{"mobile":{"attributes":{"blockeraMinHeight":"50vh"}}},"isVisible":true}}},"blockeraTransformSelfOrigin":{"value":{"top":"","left":""}},"blockeraTransformChildOrigin":{"value":{"top":"","left":""}},"blockeraDisplay":{"value":"flex"},"blockeraFlexLayout":{"value":{"direction":"column","alignItems":"center","justifyContent":"center"}},"blockeraPosition":{"value":{"type":"relative","position":{"top":"","right":"","bottom":"","left":""}}},"align":"full","className":"blockera-block blockera-block-cnb5hp"} -->
<div class="wp-block-group alignfull blockera-block blockera-block-cnb5hp"><!-- wp:image {"id":40,"sizeSlug":"large","linkDestination":"none","blockeraPropsId":"c4faf0f3-b223-40d9-808a-fea47145f3f6","blockeraCompatId":"chm7qi","blockeraBlockStates":{"value":{"normal":{"breakpoints":{"tablet":{"attributes":[]},"mobile":{"attributes":[]}},"isVisible":true}}},"blockeraOpacity":{"value":"8%"},"blockeraTransformSelfOrigin":{"value":{"top":"","left":""}},"blockeraTransformChildOrigin":{"value":{"top":"","left":""}},"className":"blockera-block blockera-block-kqhrw5"} -->
<figure class="wp-block-image size-large blockera-block blockera-block-kqhrw5"><img src="https://blockera.ai/wp-content/uploads/2024/09/blockera-logo-1.svg" alt="" class="wp-image-40"/></figure>
<!-- /wp:image --></div>
<!-- /wp:group -->`
		);

		cy.getBlock('core/group').first().click();

		assertBlockData((data) => {
			const content = getEditorContent(data);

			expect(content).to.not.include('blockeraPropsId');
			expect(content).to.not.include('blockeraCompatId');
			expect(content).to.not.include('blockeraTransformSelfOrigin');
			expect(content).to.not.include('blockeraTransformChildOrigin');
			expect(content).to.not.include('"attributes":[]');
			expect(content).to.include('blockeraDisplay');
			expect(content).to.include('blockeraFlexLayout');
			expect(content).to.include('blockeraMinHeight');
			expect(content).to.include('blockeraOpacity');
			expect(content).to.include('"type":"relative"');
			expect(getSelectedBlock(data, 'blockeraId') || '').to.match(
				/^[0-9a-z]{6}$/
			);
		});
	});

	it('strips PHP empty-array WordPress style trees while keeping inner-block link color', () => {
		appendBlocks(
			`<!-- wp:paragraph {"blockeraPropsId":"c185ee03-bc04-4238-856b-6ee116cea8e3","blockeraCompatId":"bj4axu","blockeraTransformSelfOrigin":{"value":{"top":"","left":""}},"blockeraTransformChildOrigin":{"value":{"top":"","left":""}},"blockeraInnerBlocks":{"value":{"elements/link":{"attributes":{"blockeraFontColor":"#1e2731"}}}},"className":"blockera-block blockera-block-zedgiu","style":{"color":[],"elements":{"link":{"color":[]}}}} -->
<p class="blockera-block blockera-block-zedgiu has-link-color">By transforming the core block editor into a <strong>powerful</strong>, <strong>unified tool</strong>, we <strong>enhance core blocks with advanced features</strong>—making web design <em>accessible</em>, <em>efficient</em>, and <em>collaborative</em>.</p>
<!-- /wp:paragraph -->`
		);

		cy.getBlock('core/paragraph').click();

		assertBlockData((data) => {
			const content = getEditorContent(data);

			expect(content).to.not.include('blockeraPropsId');
			expect(content).to.not.include('blockeraCompatId');
			expect(content).to.not.include('blockeraTransformSelfOrigin');
			expect(content).to.not.include('blockeraTransformChildOrigin');
			expect(content).to.not.include('"color":[]');
			expect(content).to.not.include('"style":{');
			expect(content).to.include('blockeraInnerBlocks');
			expect(content).to.include('#1e2731');
			expect(getSelectedBlock(data, 'blockeraId') || '').to.match(
				/^[0-9a-z]{6}$/
			);
		});
	});
});
