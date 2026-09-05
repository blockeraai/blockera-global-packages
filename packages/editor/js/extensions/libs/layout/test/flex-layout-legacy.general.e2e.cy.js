/**
 * Blockera dependencies
 */
import {
	createPost,
	appendBlocks,
	assertBlockData,
	getSelectedBlock,
} from '@blockera/dev-cypress/js/helpers';

const LEGACY_COLUMN_GROUP = `<!-- wp:group {"blockeraPropsId":"731125253101","blockeraCompatId":"731125235542","blockeraDisplay":{"value":"flex"},"blockeraFlexLayout":{"value":{"direction":"column","alignItems":"center","justifyContent":"flex-start"}},"blockeraFlexWrap":{"value":{"val":"nowrap","reverse":false}},"blockeraMinHeight":{"value":"220px"},"className":"blockera-block blockera-block-legacy-flex-col","layout":{"type":"flex","orientation":"vertical"}} -->
<div class="wp-block-group blockera-block blockera-block-legacy-flex-col"><!-- wp:paragraph -->
<p>A</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>B</p>
<!-- /wp:paragraph --></div>
<!-- /wp:group -->`;

const LEGACY_COLUMN_ATTR =
	'"blockeraFlexLayout":{"value":{"direction":"column","alignItems":"center","justifyContent":"flex-start"}}';

const LEGACY_COLUMN_STRETCH_GROUP = `<!-- wp:group {"blockeraPropsId":"731125253102","blockeraCompatId":"731125235543","blockeraDisplay":{"value":"flex"},"blockeraFlexLayout":{"value":{"direction":"column","alignItems":"stretch","justifyContent":"flex-start"}},"blockeraMinHeight":{"value":"220px"},"className":"blockera-block blockera-block-legacy-flex-col-stretch","layout":{"type":"flex","orientation":"vertical"}} -->
<div class="wp-block-group blockera-block blockera-block-legacy-flex-col-stretch"><!-- wp:paragraph -->
<p>A</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>B</p>
<!-- /wp:paragraph --></div>
<!-- /wp:group -->`;

const LEGACY_COLUMN_STRETCH_ATTR =
	'"blockeraFlexLayout":{"value":{"direction":"column","alignItems":"stretch","justifyContent":"flex-start"}}';

const LEGACY_COLUMN_SPACE_BETWEEN_GROUP = `<!-- wp:group {"blockeraPropsId":"731125253103","blockeraCompatId":"731125235544","blockeraDisplay":{"value":"flex"},"blockeraFlexLayout":{"value":{"direction":"column","alignItems":"center","justifyContent":"space-between"}},"blockeraMinHeight":{"value":"220px"},"className":"blockera-block blockera-block-legacy-flex-col-space-between","layout":{"type":"flex","orientation":"vertical"}} -->
<div class="wp-block-group blockera-block blockera-block-legacy-flex-col-space-between"><!-- wp:paragraph -->
<p>A</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>B</p>
<!-- /wp:paragraph --></div>
<!-- /wp:group -->`;

const LEGACY_COLUMN_SPACE_BETWEEN_ATTR =
	'"blockeraFlexLayout":{"value":{"direction":"column","alignItems":"center","justifyContent":"space-between"}}';

/**
 * Publish via REST so the editor never hydrates (and never rewrites) markup.
 *
 * @param {string} content Serialized block markup.
 * @param {string} title Post title.
 * @return {Cypress.Chainable<object>} REST post (edit context, includes `link`).
 */
function createPublishedPostWithLegacyMarkup(content, title) {
	return cy.window().then((win) => {
		const apiFetch = win.wp?.apiFetch;

		if (!apiFetch) {
			throw new Error(
				'wp.apiFetch is required (block editor must be open).'
			);
		}

		return apiFetch({
			path: '/wp/v2/posts',
			method: 'POST',
			data: {
				title,
				status: 'publish',
				content,
			},
		}).then((post) =>
			apiFetch({
				path: `/wp/v2/posts/${post.id}?context=edit`,
			})
		);
	});
}

function getPostRawContent(post) {
	if (typeof post.content === 'string') {
		return post.content;
	}

	return post.content?.raw || '';
}

function assertDocumentCssIncludes(snippet) {
	cy.get('style').should(($styles) => {
		const css = [...$styles].map((node) => node.textContent).join('');
		expect(css).to.include(snippet);
	});
}

describe('Flex layout → legacy keys migrate on input', () => {
	beforeEach(() => {
		createPost();
	});

	it('migrates column alignItems/justifyContent to flexAlign/flexJustify and matches CSS', () => {
		appendBlocks(LEGACY_COLUMN_GROUP);

		cy.getBlock('core/group').click();
		cy.switchBlockTab('styles');
		cy.getParentContainer('Flex Layout').should('exist');

		assertBlockData((data) => {
			const flexLayout = getSelectedBlock(data, 'blockeraFlexLayout');

			expect(flexLayout).to.deep.include({
				direction: 'column',
				flexAlign: 'flex-start',
				flexJustify: 'center',
			});
			expect(flexLayout).to.not.have.property('alignItems');
			expect(flexLayout).to.not.have.property('justifyContent');
		});

		cy.getBlock('core/group').should(
			'have.css',
			'align-items',
			'flex-start'
		);
		cy.getBlock('core/group').should(
			'have.css',
			'justify-content',
			'center'
		);

		cy.getBlockeraStylesWrapper().should(($wrapper) => {
			const css = $wrapper.text();
			expect(css).to.include('align-items: flex-start');
			expect(css).to.include('justify-content: center');
		});
	});

	it('generates swapped column CSS on the front end from REST-published legacy markup', () => {
		createPublishedPostWithLegacyMarkup(
			LEGACY_COLUMN_GROUP,
			`e2e-legacy-flex-layout-${Date.now()}`
		).then((post) => {
			expect(getPostRawContent(post)).to.include(LEGACY_COLUMN_ATTR);
			expect(getPostRawContent(post)).to.not.include('flexAlign');

			cy.visit(post.link);
		});

		cy.get('.blockera-block-legacy-flex-col').should(
			'have.css',
			'align-items',
			'flex-start'
		);
		cy.get('.blockera-block-legacy-flex-col').should(
			'have.css',
			'justify-content',
			'center'
		);

		assertDocumentCssIncludes('align-items: flex-start');
		assertDocumentCssIncludes('justify-content: center');
	});

	it('migrates column stretch without swapping axes', () => {
		appendBlocks(LEGACY_COLUMN_STRETCH_GROUP);

		cy.getBlock('core/group').click();
		cy.switchBlockTab('styles');
		cy.getParentContainer('Flex Layout').should('exist');

		assertBlockData((data) => {
			const flexLayout = getSelectedBlock(data, 'blockeraFlexLayout');

			expect(flexLayout).to.deep.include({
				direction: 'column',
				flexAlign: 'stretch',
				flexJustify: 'flex-start',
			});
			expect(flexLayout).to.not.have.property('alignItems');
			expect(flexLayout).to.not.have.property('justifyContent');
		});

		cy.getBlock('core/group').should('have.css', 'align-items', 'stretch');
		cy.getBlock('core/group').should(
			'have.css',
			'justify-content',
			'flex-start'
		);

		cy.getBlockeraStylesWrapper().should(($wrapper) => {
			const css = $wrapper.text();
			expect(css).to.include('align-items: stretch');
			expect(css).to.include('justify-content: flex-start');
		});
	});

	it('keeps stretch on align-items on the front end from REST-published legacy markup', () => {
		createPublishedPostWithLegacyMarkup(
			LEGACY_COLUMN_STRETCH_GROUP,
			`e2e-legacy-flex-layout-stretch-${Date.now()}`
		).then((post) => {
			expect(getPostRawContent(post)).to.include(
				LEGACY_COLUMN_STRETCH_ATTR
			);
			expect(getPostRawContent(post)).to.not.include('flexAlign');

			cy.visit(post.link);
		});

		cy.get('.blockera-block-legacy-flex-col-stretch').should(
			'have.css',
			'align-items',
			'stretch'
		);
		cy.get('.blockera-block-legacy-flex-col-stretch').should(
			'have.css',
			'justify-content',
			'flex-start'
		);

		assertDocumentCssIncludes('align-items: stretch');
		assertDocumentCssIncludes('justify-content: flex-start');
	});

	it('migrates column space-between without swapping axes', () => {
		appendBlocks(LEGACY_COLUMN_SPACE_BETWEEN_GROUP);

		cy.getBlock('core/group').click();
		cy.switchBlockTab('styles');
		cy.getParentContainer('Flex Layout').should('exist');

		assertBlockData((data) => {
			const flexLayout = getSelectedBlock(data, 'blockeraFlexLayout');

			expect(flexLayout).to.deep.include({
				direction: 'column',
				flexAlign: 'center',
				flexJustify: 'space-between',
			});
			expect(flexLayout).to.not.have.property('alignItems');
			expect(flexLayout).to.not.have.property('justifyContent');
		});

		cy.getBlock('core/group').should('have.css', 'align-items', 'center');
		cy.getBlock('core/group').should(
			'have.css',
			'justify-content',
			'space-between'
		);

		cy.getBlockeraStylesWrapper().should(($wrapper) => {
			const css = $wrapper.text();
			expect(css).to.include('align-items: center');
			expect(css).to.include('justify-content: space-between');
		});
	});

	it('keeps space-between on justify-content on the front end from REST-published legacy markup', () => {
		createPublishedPostWithLegacyMarkup(
			LEGACY_COLUMN_SPACE_BETWEEN_GROUP,
			`e2e-legacy-flex-layout-space-between-${Date.now()}`
		).then((post) => {
			expect(getPostRawContent(post)).to.include(
				LEGACY_COLUMN_SPACE_BETWEEN_ATTR
			);
			expect(getPostRawContent(post)).to.not.include('flexAlign');

			cy.visit(post.link);
		});

		cy.get('.blockera-block-legacy-flex-col-space-between').should(
			'have.css',
			'align-items',
			'center'
		);
		cy.get('.blockera-block-legacy-flex-col-space-between').should(
			'have.css',
			'justify-content',
			'space-between'
		);

		assertDocumentCssIncludes('align-items: center');
		assertDocumentCssIncludes('justify-content: space-between');
	});
});
