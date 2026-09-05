/**
 * Blockera dependencies
 */
import {
	appendBlocks,
	getSelectedBlock,
	assertBlockData,
	createPost,
} from '@blockera/dev-cypress/js/helpers';

describe('Width → WP Compatibility', () => {
	beforeEach(() => {
		createPost();
	});

	describe('core/search Block', () => {
		it('Simple Value', () => {
			appendBlocks(
				'<!-- wp:search {"label":"Search","width":500,"widthUnit":"px","buttonText":"Search"} /-->'
			);

			// Select target block
			cy.getBlock('core/search').click();

			// add alias to the feature container
			cy.getParentContainer('Width').as('widthContainer');

			cy.addNewTransition();

			//
			// Test 1: WP data to Blockera
			//

			// WP data should come to Blockera
			assertBlockData((data) => {
				expect('500px').to.be.equal(
					getSelectedBlock(data, 'blockeraWidth')
				);
			});

			//
			// Test 2: Blockera value to WP data
			//

			// change value
			cy.get('@widthContainer').within(() => {
				cy.get('input').as('widthInput');
				cy.get('@widthInput').clear();
				cy.get('@widthInput').type('100', { force: true });
			});

			// Blockera value should be moved to WP data
			assertBlockData((data) => {
				expect(100).to.be.equal(getSelectedBlock(data, 'width'));

				expect('px').to.be.equal(getSelectedBlock(data, 'widthUnit'));
			});

			//
			// Test 3: Clear Blockera value and check WP data
			//

			// clear
			cy.get('@widthContainer').within(() => {
				cy.get('input').clear({ force: true });
			});

			// WP data should be removed too
			assertBlockData((data) => {
				expect(undefined).to.be.equal(getSelectedBlock(data, 'width'));

				expect(undefined).to.be.equal(
					getSelectedBlock(data, 'widthUnit')
				);
			});
		});

		it('Use WP not supported value', () => {
			appendBlocks(
				'<!-- wp:search {"label":"Search","width":500,"widthUnit":"px","buttonText":"Search"} /-->'
			);

			// Select target block
			cy.getBlock('core/search').click();

			// add alias to the feature container
			cy.getParentContainer('Width').as('widthContainer');

			cy.addNewTransition();

			//
			// Test 1: WP data to Blockera
			//

			// WP data should come to Blockera
			assertBlockData((data) => {
				expect('500px').to.be.equal(
					getSelectedBlock(data, 'blockeraWidth')
				);
			});

			//
			// Test 2: Blockera invalid value -> do not move to WP
			//

			cy.get('@widthContainer').within(() => {
				cy.get('select').select('auto', {
					force: true,
				});
			});

			// Blockera value should NOT be moved to WP data
			assertBlockData((data) => {
				expect(undefined).to.be.equal(getSelectedBlock(data, 'width'));

				expect(undefined).to.be.equal(
					getSelectedBlock(data, 'widthUnit')
				);
			});

			//
			// Test 3: Switch back to valid data (%)
			//

			cy.get('@widthContainer').within(() => {
				cy.get('select').select('%');

				cy.get('input').as('widthInput');
				cy.get('@widthInput').clear();
				cy.get('@widthInput').type('100', { force: true });
			});

			// WP data should be
			assertBlockData((data) => {
				expect(100).to.be.equal(getSelectedBlock(data, 'width'));

				expect('%').to.be.equal(getSelectedBlock(data, 'widthUnit'));
			});
		});
	});

	describe('core/site-logo Block', () => {
		it('Simple Value', () => {
			appendBlocks(
				'<!-- wp:site-logo {"width":100,"shouldSyncIcon":false} /-->'
			);

			// Select target block
			cy.getBlock('core/site-logo').click();

			// add alias to the feature container
			cy.getParentContainer('Width').as('widthContainer');

			cy.addNewTransition();

			//
			// Test 1: WP data to Blockera
			//

			// WP data should come to Blockera
			assertBlockData((data) => {
				expect('100px').to.be.equal(
					getSelectedBlock(data, 'blockeraWidth')
				);
			});

			//
			// Test 2: Blockera value to WP data
			//

			// change value
			cy.get('@widthContainer').within(() => {
				cy.get('input').as('widthInput');
				cy.get('@widthInput').clear();
				cy.get('@widthInput').type('200', { force: true });
			});

			// Blockera value should be moved to WP data
			assertBlockData((data) => {
				expect(200).to.be.equal(getSelectedBlock(data, 'width'));
			});

			//
			// Test 3: Clear Blockera value and check WP data
			//

			// clear
			cy.get('@widthContainer').within(() => {
				cy.get('input').clear({ force: true });
			});

			// WP data should be removed too
			assertBlockData((data) => {
				expect(undefined).to.be.equal(getSelectedBlock(data, 'width'));
			});
		});

		it('Use WP not supported value', () => {
			appendBlocks(
				'<!-- wp:site-logo {"width":100,"shouldSyncIcon":false} /-->'
			);

			// Select target block
			cy.getBlock('core/site-logo').click();

			// add alias to the feature container
			cy.getParentContainer('Width').as('widthContainer');

			cy.addNewTransition();

			//
			// Test 1: WP data to Blockera
			//

			// WP data should come to Blockera
			assertBlockData((data) => {
				expect('100px').to.be.equal(
					getSelectedBlock(data, 'blockeraWidth')
				);
			});

			//
			// Test 2: Blockera value to WP data
			//

			// change value
			cy.get('@widthContainer').within(() => {
				cy.get('input').as('widthInput');
				cy.get('@widthInput').clear();
				cy.get('@widthInput').type('200', { force: true });
				cy.get('select').select('%');
			});

			// Blockera value should be moved to WP data
			assertBlockData((data) => {
				expect(undefined).to.be.equal(getSelectedBlock(data, 'width'));
			});

			//
			// Test 3: Clear Blockera value and check WP data
			//

			// clear
			cy.get('@widthContainer').within(() => {
				cy.get('input').clear({ force: true });
			});

			// WP data should be removed too
			assertBlockData((data) => {
				expect(undefined).to.be.equal(getSelectedBlock(data, 'width'));
			});
		});
	});

	describe('core/avatar Block', () => {
		it('Simple Value', () => {
			appendBlocks('<!-- wp:avatar {"size":100} /-->');

			// Select target block
			cy.getBlock('core/avatar').click();

			// add alias to the feature container
			cy.getParentContainer('Width').as('widthContainer');

			cy.addNewTransition();

			//
			// Test 1: WP data to Blockera
			//

			// WP data should come to Blockera
			assertBlockData((data) => {
				expect(100).to.be.equal(getSelectedBlock(data, 'size'));
				expect('100px').to.be.equal(
					getSelectedBlock(data, 'blockeraWidth')
				);
			});

			//
			// Test 2: Blockera value to WP data
			//

			// change value
			cy.get('@widthContainer').within(() => {
				cy.get('input').as('widthInput');
				cy.get('@widthInput').clear();
				cy.get('@widthInput').type('200', { force: true });
			});

			// Blockera value should be moved to WP data
			assertBlockData((data) => {
				expect(200).to.be.equal(getSelectedBlock(data, 'size'));
			});

			//
			// Test 3: Clear Blockera value and check WP data
			//

			// clear
			cy.get('@widthContainer').within(() => {
				cy.get('input').clear({ force: true });
			});

			// WP data should be removed too
			assertBlockData((data) => {
				expect(undefined).to.be.equal(getSelectedBlock(data, 'size'));
			});
		});

		it('Use WP not supported value', () => {
			appendBlocks('<!-- wp:avatar {"size":100} /-->');

			// Select target block
			cy.getBlock('core/avatar').click();

			// add alias to the feature container
			cy.getParentContainer('Width').as('widthContainer');

			cy.addNewTransition();

			//
			// Test 1: WP data to Blockera
			//

			// WP data should come to Blockera
			assertBlockData((data) => {
				expect('100px').to.be.equal(
					getSelectedBlock(data, 'blockeraWidth')
				);
			});

			//
			// Test 2: Blockera value to WP data
			//

			// change value
			cy.get('@widthContainer').within(() => {
				cy.get('input').as('widthInput');
				cy.get('@widthInput').clear();
				cy.get('@widthInput').type('200', { force: true });
				cy.get('select').select('%');
			});

			// Blockera value should be moved to WP data
			assertBlockData((data) => {
				expect(undefined).to.be.equal(getSelectedBlock(data, 'size'));
			});

			//
			// Test 3: Clear Blockera value and check WP data
			//

			// clear
			cy.get('@widthContainer').within(() => {
				cy.get('input').clear({ force: true });
			});

			// WP data should be removed too
			assertBlockData((data) => {
				expect(undefined).to.be.equal(getSelectedBlock(data, 'size'));
			});
		});
	});

	describe('core/button Block', () => {
		it('Simple Value', () => {
			appendBlocks(
				`<!-- wp:buttons -->
					<div class="wp-block-buttons"><!-- wp:button {"width":25} -->
					<div class="wp-block-button has-custom-width wp-block-button__width-25"><a class="wp-block-button__link wp-element-button">button</a></div>
					<!-- /wp:button --></div>
					<!-- /wp:buttons -->`
			);

			// Select target block
			cy.getBlock('core/button').click();

			// add alias to the feature container
			cy.getParentContainer('Width').as('widthContainer');

			cy.addNewTransition();

			//
			// Test 1: WP data to Blockera
			//

			// WP data should come to Blockera
			assertBlockData((data) => {
				expect(
					getSelectedBlock(data, 'blockeraWidth'),
					JSON.stringify({
						width: getSelectedBlock(data, 'width'),
						style: getSelectedBlock(data, 'style'),
						className: getSelectedBlock(data, 'className'),
						blockeraWidth: getSelectedBlock(data, 'blockeraWidth'),
					})
				).to.equal('25%');
			});

			//
			// Test 2: Blockera value to WP data
			//

			// change value
			cy.get('@widthContainer').within(() => {
				cy.get('input').as('widthInput');
				cy.get('@widthInput').clear();
				cy.get('@widthInput').type('50', { force: true });
			});

			// Blockera value should be moved to WP data
			assertBlockData((data) => {
				expect(undefined).to.be.equal(getSelectedBlock(data, 'width'));
				expect('50%').to.be.equal(
					getSelectedBlock(data, 'style')?.dimensions?.width
				);
			});

			//
			// Test 3: Clear Blockera value and check WP data
			//

			// clear
			cy.get('@widthContainer').within(() => {
				cy.get('input').clear({ force: true });
			});

			// WP data should be removed too
			assertBlockData((data) => {
				expect(undefined).to.be.equal(getSelectedBlock(data, 'width'));
				expect(undefined).to.be.equal(
					getSelectedBlock(data, 'style')?.dimensions?.width
				);
			});
		});

		it('Use WP not supported value', () => {
			appendBlocks(
				`<!-- wp:buttons -->
<div class="wp-block-buttons"><!-- wp:button {"width":25} -->
<div class="wp-block-button has-custom-width wp-block-button__width-25"><a class="wp-block-button__link wp-element-button">button</a></div>
<!-- /wp:button --></div>
<!-- /wp:buttons -->`
			);

			// Select target block
			cy.getBlock('core/button').click();

			// add alias to the feature container
			cy.getParentContainer('Width').as('widthContainer');

			cy.addNewTransition();

			//
			// Test 1: WP data to Blockera
			//

			// WP data should come to Blockera
			assertBlockData((data) => {
				expect(
					getSelectedBlock(data, 'blockeraWidth'),
					JSON.stringify({
						width: getSelectedBlock(data, 'width'),
						style: getSelectedBlock(data, 'style'),
						className: getSelectedBlock(data, 'className'),
						blockeraWidth: getSelectedBlock(data, 'blockeraWidth'),
					})
				).to.equal('25%');
			});

			//
			// Test 2: Blockera value to WP data
			//

			// Special units (auto) are not written to WP dimensions.width
			cy.get('@widthContainer').within(() => {
				cy.get('select').select('auto', {
					force: true,
				});
			});

			assertBlockData((data) => {
				expect(undefined).to.be.equal(getSelectedBlock(data, 'width'));
				expect(undefined).to.be.equal(
					getSelectedBlock(data, 'style')?.dimensions?.width
				);
			});

			//
			// Test 3: Clear Blockera value and check WP data
			//

			cy.get('@widthContainer').within(() => {
				cy.get('select').select('px', {
					force: true,
				});
				cy.get('input').clear({ force: true });
			});

			assertBlockData((data) => {
				expect(undefined).to.be.equal(getSelectedBlock(data, 'width'));
				expect(undefined).to.be.equal(
					getSelectedBlock(data, 'style')?.dimensions?.width
				);
			});
		});
	});

	describe('core/image Block', () => {
		it('Simple Value', () => {
			appendBlocks(
				`<!-- wp:image {"width":"500px","sizeSlug":"full","linkDestination":"none"} -->
<figure class="wp-block-image size-full is-resized"><img src="https://placehold.co/600x400" alt="" style="width:500px;height:auto"/></figure>
<!-- /wp:image -->`
			);

			// Select target block
			cy.getBlock('core/image').click();

			cy.switchBlockTab('styles');

			// add alias to the feature container
			cy.getParentContainer('Width').as('widthContainer');

			cy.addNewTransition();

			//
			// Test 1: WP data to Blockera
			//

			// WP data should come to Blockera
			assertBlockData((data) => {
				expect('500px').to.be.equal(
					getSelectedBlock(data, 'blockeraWidth')
				);
			});

			//
			// Test 2: Blockera value to WP data
			//

			// change value
			cy.get('@widthContainer').within(() => {
				cy.get('input').as('widthInput');
				cy.get('@widthInput').clear();
				cy.get('@widthInput').type('200', { force: true });
			});

			// Blockera value should be moved to WP data
			assertBlockData((data) => {
				expect('200px').to.be.equal(getSelectedBlock(data, 'width'));
			});

			//
			// Test 3: Clear Blockera value and check WP data
			//

			// clear
			cy.get('@widthContainer').within(() => {
				cy.get('input').clear({ force: true });
			});

			// WP data should be removed too
			assertBlockData((data) => {
				expect(undefined).to.be.equal(getSelectedBlock(data, 'width'));
			});
		});

		it('Spacing preset variable (WP → Blockera)', () => {
			appendBlocks(
				`<!-- wp:image {"width":"var(\u002d\u002dwp\u002d\u002dpreset\u002d\u002dspacing\u002d\u002d30, 20px)","sizeSlug":"full","linkDestination":"none"} -->
<figure class="wp-block-image size-full is-resized"><img src="https://placehold.co/600x400" alt="" style="width:var(--wp--preset--spacing--30, 20px);height:auto"/></figure>
<!-- /wp:image -->`
			);

			cy.getBlock('core/image').click();

			cy.switchBlockTab('styles');

			cy.getParentContainer('Width');

			cy.addNewTransition();

			assertBlockData((data) => {
				const widthVA = getSelectedBlock(data, 'blockeraWidth');

				expect(widthVA).to.deep.include({
					isValueAddon: true,
					valueType: 'variable',
				});
				expect(widthVA.settings).to.deep.include({
					id: '30',
					type: 'spacing',
					var: '--wp--preset--spacing--30',
					value: '20px',
				});
			});

			assertBlockData((data) => {
				const wpWidth = getSelectedBlock(data, 'width');

				expect(wpWidth).to.be.a('string');
				expect(String(wpWidth)).to.include('--wp--preset--spacing--30');
			});
		});

		it('Use WP not supported value', () => {
			appendBlocks(
				`<!-- wp:image {"id":60,"sizeSlug":"full","linkDestination":"none","className":"is-resized"} -->
<figure class="wp-block-image size-full is-resized"><img src="https://placehold.co/600x400" alt="" class="wp-image-60"/></figure>
<!-- /wp:image --> `
			);

			// Select target block
			cy.getBlock('core/image').click();

			cy.switchBlockTab('styles');

			// add alias to the feature container
			cy.getParentContainer('Width').as('widthContainer');

			//
			// Test 1: Blockera dat to WP
			//

			// change value
			// only % is valid for WP
			cy.get('@widthContainer').within(() => {
				cy.get('input').as('widthInput');
				cy.get('@widthInput').type('300', { force: true });
				cy.get('select').select('px');
			});

			// WP data should come to Blockera
			assertBlockData((data) => {
				expect('300px').to.be.equal(
					getSelectedBlock(data, 'blockeraWidth')
				);
			});

			//
			// Test 2: Blockera value to WP data
			//

			// change value
			// only % is valid for WP
			cy.get('@widthContainer').within(() => {
				cy.get('input').as('widthInput');
				cy.get('@widthInput').clear();
				cy.get('@widthInput').type('200', { force: true });
				cy.get('select').select('%');
			});

			// Blockera value should be moved to WP data
			assertBlockData((data) => {
				expect(undefined).to.be.equal(getSelectedBlock(data, 'width'));
			});

			//
			// Test 3: Clear Blockera value and check WP data
			//

			// clear
			cy.get('@widthContainer').within(() => {
				cy.get('input').clear({ force: true });
			});

			// WP data should be removed too
			assertBlockData((data) => {
				expect(undefined).to.be.equal(getSelectedBlock(data, 'width'));
			});
		});
	});

	describe('core/column Block', () => {
		it('Simple Value', () => {
			appendBlocks(
				`<!-- wp:columns -->
<div class="wp-block-columns"><!-- wp:column {"width":"200px","style":{"color":{"background":"#d8d8d8"}}} -->
<div class="wp-block-column has-background" style="background-color:#d8d8d8;flex-basis:200px"><!-- wp:paragraph -->
<p>Paragraph inside column</p>
<!-- /wp:paragraph --></div>
<!-- /wp:column --></div>
<!-- /wp:columns -->`
			);

			// Select target block
			cy.getBlock('core/column').click();

			// switch to column block
			cy.get(
				'[aria-label="Select Column"], [aria-label="Select parent block: Column"]'
			).click();

			// add alias to the feature container
			cy.getParentContainer('Width').as('widthContainer');

			cy.addNewTransition();

			//
			// Test 1: WP data to Blockera
			//

			// WP data should come to Blockera
			assertBlockData((data) => {
				expect('200px').to.be.equal(
					getSelectedBlock(data, 'blockeraWidth')
				);
			});

			//
			// Test 2: Blockera value to WP data
			//

			// change value
			cy.get('@widthContainer').within(() => {
				cy.get('input').as('widthInput');
				cy.get('@widthInput').clear();
				cy.get('@widthInput').type('300', { force: true });
			});

			// Blockera value should be moved to WP data
			assertBlockData((data) => {
				expect('300px').to.be.equal(getSelectedBlock(data, 'width'));
			});

			//
			// Test 3: Clear Blockera value and check WP data
			//

			// clear
			cy.get('@widthContainer').within(() => {
				cy.get('input').clear({ force: true });
			});

			// WP data should be removed too
			assertBlockData((data) => {
				expect(undefined).to.be.equal(getSelectedBlock(data, 'width'));
			});
		});

		it('Use WP not supported value', () => {
			appendBlocks(
				`<!-- wp:columns -->
<div class="wp-block-columns"><!-- wp:column {"width":"20%","style":{"color":{"background":"#d8d8d8"}}} -->
<div class="wp-block-column has-background" style="background-color:#d8d8d8;flex-basis:20%"><!-- wp:paragraph -->
<p>Paragraph inside column</p>
<!-- /wp:paragraph --></div>
<!-- /wp:column --></div>
<!-- /wp:columns -->`
			);

			// Select target block
			cy.getBlock('core/column').click();

			// switch to column block
			cy.get(
				'[aria-label="Select Column"], [aria-label="Select parent block: Column"]'
			).click();

			cy.addNewTransition();

			// add alias to the feature container
			cy.getParentContainer('Width').as('widthContainer');

			//
			// Test 1: Blockera dat to WP
			//

			// WP data should come to Blockera
			assertBlockData((data) => {
				expect('20%').to.be.equal(
					getSelectedBlock(data, 'blockeraWidth')
				);
			});

			//
			// Test 2: Blockera value to WP data
			//

			// change value
			cy.get('@widthContainer').within(() => {
				cy.get('select').select('auto');
			});

			// Blockera value should be moved to WP data
			assertBlockData((data) => {
				expect(undefined).to.be.equal(getSelectedBlock(data, 'width'));
			});
		});
	});

	describe('core/post-featured-image Block', () => {
		it('Simple Value', () => {
			appendBlocks(
				'<!-- wp:post-featured-image {"aspectRatio":"auto","width":"200px"} /--> '
			);

			// Select target block
			cy.getBlock('core/post-featured-image').click();

			// add alias to the feature container
			cy.getParentContainer('Width').as('widthContainer');

			cy.addNewTransition();

			//
			// Test 1: WP data to Blockera
			//

			// WP data should come to Blockera
			assertBlockData((data) => {
				expect('200px').to.be.equal(
					getSelectedBlock(data, 'blockeraWidth')
				);
			});

			//
			// Test 2: Blockera value to WP data
			//

			// change value
			cy.get('@widthContainer').within(() => {
				cy.get('input').as('widthInput');
				cy.get('@widthInput').clear();
				cy.get('@widthInput').type('300', { force: true });
			});

			// Blockera value should be moved to WP data
			assertBlockData((data) => {
				expect('300px').to.be.equal(getSelectedBlock(data, 'width'));
			});

			//
			// Test 3: Clear Blockera value and check WP data
			//

			// clear
			cy.get('@widthContainer').within(() => {
				cy.get('input').clear({ force: true });
			});

			// WP data should be removed too
			assertBlockData((data) => {
				expect(undefined).to.be.equal(getSelectedBlock(data, 'width'));
			});
		});

		it('Use WP not supported value', () => {
			appendBlocks(
				'<!-- wp:post-featured-image {"aspectRatio":"auto","width":"30%"} /--> '
			);

			// Select target block
			cy.getBlock('core/post-featured-image').click();

			cy.addNewTransition();

			// add alias to the feature container
			cy.getParentContainer('Width').as('widthContainer');

			//
			// Test 1: Blockera dat to WP
			//

			// WP data should come to Blockera
			assertBlockData((data) => {
				expect('30%').to.be.equal(
					getSelectedBlock(data, 'blockeraWidth')
				);
			});

			//
			// Test 2: Blockera value to WP data
			//

			// change value
			cy.get('@widthContainer').within(() => {
				cy.get('select').select('auto');
			});

			// Blockera value should be moved to WP data
			assertBlockData((data) => {
				expect(undefined).to.be.equal(getSelectedBlock(data, 'width'));
			});
		});
	});
});
