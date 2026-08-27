/**
 * Blockera dependencies
 */
import {
	appendBlocks,
	getSelectedBlock,
	assertBlockData,
	createPost,
	getEditorContent,
	savePage,
	redirectToFrontPage,
} from '@blockera/dev-cypress/js/helpers';

function openStylesPanel() {
	cy.getByAriaControls('styles-view').click();
}

function openBlockModeMenu() {
	cy.getByAriaLabel('Block Settings').click();
}

function switchBlockMode(mode) {
	openBlockModeMenu();
	cy.get('.components-popover')
		.last()
		.within(() => {
			cy.getByDataTest(`${mode}-mode-block`).click();
		});
}

describe('blockeraBlockMode + WP→Blockera timing', () => {
	beforeEach(() => {
		createPost();
	});

	it('shows WP→Blockera in controls without changing markup until the first edit', () => {
		const originalMarkup =
			`<!-- wp:paragraph {"style":{"typography":{"fontSize":"16px"}}} -->
<p style="font-size:16px">The font size is set</p>
<!-- /wp:paragraph -->`;

		appendBlocks(originalMarkup);

		cy.getBlock('core/paragraph').click();
		openStylesPanel();

		cy.getParentContainer('Font Size').within(() => {
			cy.get('input[type="text"]').should('have.value', '16');
		});

		cy.getBlock('core/paragraph').should(
			'not.have.class',
			'blockera-block'
		);

		assertBlockData((data) => {
			const content = getEditorContent(data).trim();
			expect(content).to.not.include('blockeraId');
			expect(content).to.not.include('blockeraFontSize');
			expect(content).to.not.include('blockera-block');
			expect(content).to.include('"fontSize":"16px"');
			expect(getSelectedBlock(data, 'blockeraId') || '').to.equal('');
		});

		cy.getParentContainer('Font Size').within(() => {
			cy.get('input[type="text"]').clear({ force: true });
			cy.get('input[type="text"]').type('18', { force: true });
		});

		assertBlockData((data) => {
			expect(getSelectedBlock(data, 'blockeraFontSize')).to.equal('18px');
			expect(getSelectedBlock(data, 'blockeraId')).to.be.ok;
			expect(getSelectedBlock(data, 'className') || '').to.include(
				'blockera-block'
			);
			expect(
				getSelectedBlock(data, 'style')?.typography?.fontSize
			).to.equal('18px');
			expect(getEditorContent(data)).to.include('blockeraId');
			expect(getEditorContent(data)).to.include('blockera-block');
		});
	});

	it('keeps Blockera attrs and strips classes when switching to Basic Mode', () => {
		appendBlocks(
			`<!-- wp:paragraph {"blockeraId":"keep1","blockeraFontSize":{"value":"20px"},"className":"blockera-block blockera-block-keep1","style":{"typography":{"fontSize":"20px"}}} --><p class="blockera-block blockera-block-keep1" style="font-size:20px">Test paragraph</p><!-- /wp:paragraph -->`
		);

		cy.getBlock('core/paragraph').click();
		openStylesPanel();

		switchBlockMode('basic');

		assertBlockData((data) => {
			expect(getSelectedBlock(data, 'blockeraFontSize')).to.equal('20px');
			expect(getSelectedBlock(data, 'blockeraId')).to.be.ok;
			expect(getSelectedBlock(data, 'blockeraBlockMode')).to.equal(
				'basic'
			);
			expect(getSelectedBlock(data, 'className') || '').to.not.include(
				'blockera-block'
			);
			expect(getEditorContent(data)).to.include('"blockeraBlockMode"');
		});
	});

	it('does not mint blockeraId while the block is saved as basic', () => {
		appendBlocks(
			`<!-- wp:paragraph {"blockeraBlockMode":"basic"} --><p>Basic only</p><!-- /wp:paragraph -->`
		);

		cy.getBlock('core/paragraph').click();

		assertBlockData((data) => {
			expect(getSelectedBlock(data, 'blockeraId') || '').to.equal('');
			expect(getSelectedBlock(data, 'blockeraBlockMode')).to.equal(
				'basic'
			);
			expect(getSelectedBlock(data, 'className') || '').to.not.include(
				'blockera-block'
			);
		});
	});

	it('mints id and runs first-time compatibility when returning to Advanced Mode', () => {
		appendBlocks(
			`<!-- wp:paragraph {"blockeraBlockMode":"basic","style":{"typography":{"fontSize":"18px"}}} --><p style="font-size:18px">Back to advanced</p><!-- /wp:paragraph -->`
		);

		cy.getBlock('core/paragraph').click();
		switchBlockMode('advanced');

		assertBlockData((data) => {
			expect(getSelectedBlock(data, 'blockeraFontSize')).to.equal('18px');
			expect(getSelectedBlock(data, 'blockeraId')).to.be.ok;
			expect(getSelectedBlock(data, 'blockeraBlockMode')).to.not.equal(
				'basic'
			);
			expect(getSelectedBlock(data, 'className') || '').to.include(
				'blockera-block'
			);
			expect(getEditorContent(data)).to.not.include(
				'"blockeraBlockMode":"basic"'
			);
		});
	});

	it('on return to advanced, keeps filled Blockera values and fills empty ones from core', () => {
		appendBlocks(
			`<!-- wp:paragraph {"blockeraId":"abc123","blockeraFontSize":{"value":"20px"},"blockeraBlockMode":"basic","style":{"typography":{"fontSize":"99px","letterSpacing":"3px"}},"className":""} --><p style="font-size:99px;letter-spacing:3px">Priority</p><!-- /wp:paragraph -->`
		);

		cy.getBlock('core/paragraph').click();
		switchBlockMode('advanced');

		assertBlockData((data) => {
			expect(getSelectedBlock(data, 'blockeraFontSize')).to.equal('20px');
			expect(getSelectedBlock(data, 'blockeraLetterSpacing')).to.equal(
				'3px'
			);
			expect(getSelectedBlock(data, 'className') || '').to.include(
				'blockera-block-abc123'
			);
		});
	});

	it('disables Blockera classes on a parent Group in Basic Mode without dropping inner attrs', () => {
		appendBlocks(
			`<!-- wp:group {"blockeraId":"grp1","blockeraDisplay":{"value":"flex"},"className":"blockera-block blockera-block-grp1","layout":{"type":"flex"}} --><div class="wp-block-group"><!-- wp:paragraph {"blockeraId":"p1","blockeraFontSize":{"value":"16px"},"className":"blockera-block blockera-block-p1"} --><p>Inner</p><!-- /wp:paragraph --></div><!-- /wp:group -->`
		);

		cy.getBlock('core/group').click();
		switchBlockMode('basic');

		assertBlockData((data) => {
			const group = getSelectedBlock(data);
			expect(group?.attributes?.blockeraDisplay?.value).to.equal('flex');
			expect(group?.attributes?.blockeraBlockMode).to.equal('basic');
			expect(group?.attributes?.className || '').to.not.include(
				'blockera-block'
			);
		});

		cy.getBlock('core/paragraph').click();

		assertBlockData((data) => {
			expect(getSelectedBlock(data, 'blockeraFontSize')).to.equal('16px');
		});
	});

	it('does not generate Blockera styles on the front end in Basic Mode', () => {
		// Custom sizes at/above the fluid threshold become clamp() on the front
		// end; 12px stays a literal so we can assert core vs Blockera (30px).
		appendBlocks(
			`<!-- wp:paragraph {"blockeraId":"fe1","blockeraFontSize":{"value":"30px"},"style":{"typography":{"fontSize":"12px"}},"className":"blockera-block blockera-block-fe1"} --><p class="blockera-block blockera-block-fe1" style="font-size:12px">Core 12 Blockera 30</p><!-- /wp:paragraph -->`
		);

		cy.getBlock('core/paragraph').click();
		openStylesPanel();

		cy.getBlock('core/paragraph').should('have.css', 'font-size', '30px');

		switchBlockMode('basic');

		assertBlockData((data) => {
			expect(getSelectedBlock(data, 'blockeraFontSize')).to.equal('30px');
			expect(
				getSelectedBlock(data, 'style')?.typography?.fontSize
			).to.equal('12px');
			expect(getSelectedBlock(data, 'blockeraBlockMode')).to.equal(
				'basic'
			);
		});

		cy.getBlock('core/paragraph').should(
			'not.have.class',
			'blockera-block'
		);

		savePage();
		redirectToFrontPage();

		cy.contains(
			'.wp-block-post-content p, .entry-content p',
			'Core 12 Blockera 30'
		)
			.should('have.css', 'font-size', '12px')
			.and('not.have.class', 'blockera-block');

		cy.get('body').then(($body) => {
			const css = $body.find('style#blockera-inline-css').text();
			expect(css).to.not.include('.blockera-block-fe1');
			expect(css).to.not.include('font-size: 30px');
		});
	});

	it('still maps Blockera font size to core in Advanced Mode', () => {
		appendBlocks(
			`<!-- wp:paragraph {"style":{"typography":{"fontSize":"20px"}}} --><p style="font-size:20px">To WP</p><!-- /wp:paragraph -->`
		);

		cy.getBlock('core/paragraph').click();
		cy.getParentContainer('Font Size').as('container');
		cy.get('@container').within(() => {
			cy.get('input').clear({ force: true });
			cy.get('input').type('15', { force: true });
		});

		assertBlockData((data) => {
			expect(getSelectedBlock(data, 'blockeraFontSize')).to.equal('15px');
			expect(
				getSelectedBlock(data, 'style')?.typography?.fontSize
			).to.equal('15px');
		});
	});
});
