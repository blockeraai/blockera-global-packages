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

function getCommentAttributes(content, blockName = 'core/paragraph') {
	const needle = `<!-- wp:${blockName}`;
	const start = content.indexOf(needle);

	if (start === -1) {
		return {};
	}

	const commentEnd = content.indexOf('-->', start);

	if (commentEnd === -1) {
		return {};
	}

	const jsonStart = content.indexOf('{', start);

	if (jsonStart === -1 || jsonStart > commentEnd) {
		return {};
	}

	return JSON.parse(content.slice(jsonStart, commentEnd).trim());
}

function getSerializedBlockeraKeys(content) {
	return Object.keys(getCommentAttributes(content)).filter((key) =>
		key.startsWith('blockera')
	);
}

function assertNoEmptyWpStyle(content) {
	const serialized = getCommentAttributes(content);

	expect(serialized.style).to.equal(undefined);
	expect(content).to.not.include('"typography":{}');
	expect(content).to.not.include('"color":{}');
	expect(content).to.not.include('"style":{');
}

describe('BlockBase testing ...', () => {
	beforeEach(() => {
		createPost();

		appendBlocks(
			`<!-- wp:paragraph -->
<p>test</p>
<!-- /wp:paragraph -->`
		);

		cy.getBlock('core/paragraph').click();
	});

	it('should not exists any value of blockera attributes on selected block when not changed anything', () => {
		assertBlockData((data) => {
			expect(
				`<!-- wp:paragraph -->
<p>test</p>
<!-- /wp:paragraph -->`.trim()
			).to.be.equal(getEditorContent(data).trim());
		});
	});

	it('should exists blockeraId, blockeraFontColor, and blockera classnames values on selected block when changed text-color control', () => {
		cy.switchBlockTab('styles');

		// Set value.
		cy.setColorControlValue('Text Color', 'aaaaaa');

		assertBlockData((data) => {
			const blockAttributes = getSelectedBlock(data)?.attributes;
			const content = getEditorContent(data);
			const serializedBlockeraKeys = getSerializedBlockeraKeys(content);

			expect(true).to.be.equal(
				Boolean(blockAttributes?.blockeraId) &&
					'#aaaaaa' === blockAttributes?.blockeraFontColor?.value &&
					-1 !== blockAttributes?.className?.indexOf('blockera-block')
			);

			expect(content).to.include('blockeraFontColor');
			expect(serializedBlockeraKeys).to.not.include(
				'blockeraBackgroundColor'
			);
			expect(serializedBlockeraKeys).to.not.include(
				'blockeraBackgroundClip'
			);
			expect(content).to.not.include('"blockeraBackgroundClip":"none"');
		});
	});

	it('clears unused Blockera attributes after variable remove then custom color reset', () => {
		cy.window().then((win) => {
			cy.spy(win.console, 'error').as('consoleError');
		});

		cy.switchBlockTab('styles');

		cy.getParentContainer('Text Color').within(() => {
			cy.openValueAddon();
		});
		cy.selectValueAddonItem('contrast');

		assertBlockData((data) => {
			expect(getSelectedBlock(data, 'blockeraFontColor')).to.include({
				isValueAddon: true,
				valueType: 'variable',
			});
		});

		cy.getParentContainer('Text Color').within(() => {
			cy.removeValueAddon();
		});

		cy.setColorControlValue('Text Color', '666666');

		assertBlockData((data) => {
			expect(getSelectedBlock(data, 'blockeraFontColor')).to.equal(
				'#666666'
			);
			expect(getEditorContent(data)).to.not.include(
				'"blockeraBackgroundClip":"none"'
			);
		});

		cy.resetBlockeraAttribute('Typography', 'Text Color', 'reset');

		cy.getBlock('core/paragraph').should(
			'not.have.class',
			'blockera-block'
		);

		assertBlockData((data) => {
			const content = getEditorContent(data);
			const serialized = getCommentAttributes(content);

			expect(getSerializedBlockeraKeys(content)).to.deep.equal([]);
			expect(serialized.blockeraFontColor).to.equal(undefined);
			expect(serialized.blockeraBackgroundClip).to.equal(undefined);
			expect(serialized.blockeraCustomCSS).to.equal(undefined);
			expect(serialized.blockeraInnerBlocks).to.equal(undefined);
			expect(serialized.blockeraBackground).to.equal(undefined);
			expect(serialized.blockeraBoxShadow).to.equal(undefined);
			expect(serialized.blockeraAttributes).to.equal(undefined);
			assertNoEmptyWpStyle(content);
			expect(content).to.not.include('"blockeraBackgroundClip":"none"');
			expect(content).to.not.include('"blockeraFontColor":""');
			expect(content).to.not.include('"value":[]');
			expect(content).to.not.include('"blockeraBackground"');
			expect(getSelectedBlock(data, 'blockeraId') || '').to.equal('');
		});

		cy.get('@consoleError').should((spy) => {
			const messages = spy
				.getCalls()
				.map((call) =>
					call.args
						.map((arg) =>
							arg instanceof Error ? arg.message : String(arg)
						)
						.join(' ')
				)
				.join('\n');

			expect(messages).to.not.include(
				'Cannot convert undefined or null to object'
			);
		});
	});
});

describe('WordPress style empty-object cleanup', () => {
	beforeEach(() => {
		createPost();

		appendBlocks(
			`<!-- wp:paragraph {"style":{"typography":{}}} -->
<p>sadasdadasdasd</p>
<!-- /wp:paragraph -->`
		);

		cy.getBlock('core/paragraph').click();
	});

	it('does not save leftover empty style.typography after font-size set and reset', () => {
		cy.switchBlockTab('styles');

		cy.getParentContainer('Font Size').within(() => {
			cy.get('input[type="text"]').clear({ force: true });
			cy.get('input[type="text"]').type('18', { force: true });
		});

		assertBlockData((data) => {
			expect(getSelectedBlock(data, 'blockeraFontSize')).to.equal('18px');
			expect(getEditorContent(data)).to.include('blockeraFontSize');
		});

		cy.resetBlockeraAttribute('Typography', 'Font Size', 'reset');

		cy.getBlock('core/paragraph').should(
			'not.have.class',
			'blockera-block'
		);

		assertBlockData((data) => {
			const content = getEditorContent(data);
			const serialized = getCommentAttributes(content);

			assertNoEmptyWpStyle(content);
			expect(serialized.blockeraFontSize).to.equal(undefined);
			expect(getSelectedBlock(data, 'style')).to.equal(undefined);
			expect(content).to.not.include('blockeraFontSize');
			expect(content.trim()).to.equal(
				`<!-- wp:paragraph -->
<p>sadasdadasdasd</p>
<!-- /wp:paragraph -->`
			);
		});
	});

	it('does not save leftover empty style.typography after text-color set and reset', () => {
		cy.switchBlockTab('styles');

		cy.setColorControlValue('Text Color', '666666');

		assertBlockData((data) => {
			expect(getSelectedBlock(data, 'blockeraFontColor')).to.equal(
				'#666666'
			);
		});

		cy.resetBlockeraAttribute('Typography', 'Text Color', 'reset');

		cy.getBlock('core/paragraph').should(
			'not.have.class',
			'blockera-block'
		);

		assertBlockData((data) => {
			const content = getEditorContent(data);

			assertNoEmptyWpStyle(content);
			expect(getSelectedBlock(data, 'style')).to.equal(undefined);
			expect(content.trim()).to.equal(
				`<!-- wp:paragraph -->
<p>sadasdadasdasd</p>
<!-- /wp:paragraph -->`
			);
		});
	});
});

describe('Load-from-content unused Blockera attributes', () => {
	beforeEach(() => {
		createPost();
	});

	it('strips wrapped defaults and empty breakpoints when a feature is edited', () => {
		appendBlocks(
			`<!-- wp:paragraph {"blockeraId":"p7a15o","blockeraTransformSelfOrigin":{"value":{"top":"","left":""}},"blockeraTransformChildOrigin":{"value":{"top":"","left":""}},"blockeraBlockStates":{"value":{"normal":{"breakpoints":{"tablet":{"attributes":[]},"mobile":{"attributes":[]}},"isVisible":true}}},"blockeraFontColor":{"value":"#75879a"},"className":"blockera-block blockera-block-p7a15o"} -->
<p class="blockera-block blockera-block-p7a15o">About our vision, story and team</p>
<!-- /wp:paragraph -->`
		);

		cy.getBlock('core/paragraph').click();

		cy.switchBlockTab('styles');

		cy.getParentContainer('Font Size').within(() => {
			cy.get('input[type="text"]').clear({ force: true });
			cy.get('input[type="text"]').type('18', { force: true });
		});

		assertBlockData((data) => {
			const content = getEditorContent(data);

			expect(getSelectedBlock(data, 'blockeraFontSize')).to.equal('18px');
			expect(getSelectedBlock(data, 'blockeraFontColor')).to.equal(
				'#75879a'
			);
			expect(content).to.include('blockeraFontSize');
			expect(content).to.include('blockeraFontColor');
			expect(content).to.not.include('blockeraTransformSelfOrigin');
			expect(content).to.not.include('blockeraTransformChildOrigin');
			expect(content).to.not.include('blockeraBlockStates');
			expect(content).to.not.include('"attributes":[]');
			expect(getSelectedBlock(data, 'blockeraId') || '').to.match(
				/^[0-9a-z]{6}$/
			);
		});
	});

	it('strips PHP empty-array style.color when a feature is edited', () => {
		appendBlocks(
			`<!-- wp:paragraph {"blockeraId":"b83u76","blockeraInnerBlocks":{"value":{"elements/link":{"attributes":{"blockeraFontColor":"#1e2731"}}}},"className":"blockera-block blockera-block-b83u76","style":{"color":[],"elements":{"link":{"color":[]}}}} -->
<p class="blockera-block blockera-block-b83u76 has-link-color">By transforming the core block editor into a powerful unified tool.</p>
<!-- /wp:paragraph -->`
		);

		cy.getBlock('core/paragraph').click();

		cy.switchBlockTab('styles');

		cy.getParentContainer('Font Size').within(() => {
			cy.get('input[type="text"]').clear({ force: true });
			cy.get('input[type="text"]').type('18', { force: true });
		});

		assertBlockData((data) => {
			const content = getEditorContent(data);

			expect(getSelectedBlock(data, 'blockeraFontSize')).to.equal('18px');
			expect(content).to.include('blockeraFontSize');
			expect(content).to.include('blockeraInnerBlocks');
			expect(content).to.include('#1e2731');
			expect(content).to.not.include('"color":[]');
			expect(content).to.not.include('"elements"');
			expect(content).to.include('"fontSize":"18px"');
		});
	});
});
