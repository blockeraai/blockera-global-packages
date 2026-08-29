/**
 * Blockera dependencies
 */
import {
	createPost,
	appendBlocks,
	assertBlockData,
	getSelectedBlock,
} from '@blockera/dev-cypress/js/helpers';

const LEGACY_SELF_ORIGIN_MARKUP = `<!-- wp:paragraph {"blockeraId":"lgcslf","blockeraTransform":{"value":{"move-0":{"isVisible":true,"type":"move","move-x":"10px","move-y":"0px","move-z":"0px","order":0}}},"blockeraTransformSelfOrigin":{"top":"0%","left":"100%"},"className":"blockera-block blockera-block-lgcslf blockera-block-legacy-self-origin"} -->
<p class="blockera-block blockera-block-lgcslf blockera-block-legacy-self-origin">Legacy self origin CSS</p>
<!-- /wp:paragraph -->`;

const LEGACY_CHILD_ORIGIN_MARKUP = `<!-- wp:paragraph {"blockeraId":"lgcchd","blockeraTransformChildPerspective":{"value":"800px"},"blockeraTransformChildOrigin":{"top":"50%","left":"25%"},"className":"blockera-block blockera-block-lgcchd blockera-block-legacy-child-origin"} -->
<p class="blockera-block blockera-block-lgcchd blockera-block-legacy-child-origin">Legacy child origin CSS</p>
<!-- /wp:paragraph -->`;

const LEGACY_SELF_ORIGIN_ATTR =
	'"blockeraTransformSelfOrigin":{"top":"0%","left":"100%"}';
const LEGACY_CHILD_ORIGIN_ATTR =
	'"blockeraTransformChildOrigin":{"top":"50%","left":"25%"}';

/**
 * Publish a post via REST so the editor never hydrates (and never rewrites)
 * the stored block markup.
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

describe('Transform origin → legacy unwrapped value', () => {
	beforeEach(() => {
		createPost();
	});

	it('generates transform-origin from legacy blockeraTransformSelfOrigin in the editor', () => {
		appendBlocks(LEGACY_SELF_ORIGIN_MARKUP);

		cy.getBlock('core/paragraph').click();

		assertBlockData((data) => {
			expect(
				getSelectedBlock(data, 'blockeraTransformSelfOrigin')
			).to.deep.equal({
				top: '0%',
				left: '100%',
			});
		});

		cy.getBlockeraStylesWrapper().should(($wrapper) => {
			expect($wrapper.text()).to.include('transform-origin: 0% 100%');
		});
	});

	it('generates transform-origin on the front end from REST-published legacy markup', () => {
		createPublishedPostWithLegacyMarkup(
			LEGACY_SELF_ORIGIN_MARKUP,
			`e2e-legacy-self-origin-${Date.now()}`
		).then((post) => {
			expect(getPostRawContent(post)).to.include(LEGACY_SELF_ORIGIN_ATTR);
			expect(getPostRawContent(post)).to.not.include(
				'"blockeraTransformSelfOrigin":{"value"'
			);

			cy.visit(post.link);
		});

		cy.contains(
			'.wp-block-post-content p, .entry-content p',
			'Legacy self origin CSS'
		).should('have.class', 'blockera-block-legacy-self-origin');

		assertDocumentCssIncludes('transform-origin: 0% 100%');
	});

	it('generates perspective-origin from legacy blockeraTransformChildOrigin in the editor', () => {
		appendBlocks(LEGACY_CHILD_ORIGIN_MARKUP);

		cy.getBlock('core/paragraph').click();

		assertBlockData((data) => {
			expect(
				getSelectedBlock(data, 'blockeraTransformChildOrigin')
			).to.deep.equal({
				top: '50%',
				left: '25%',
			});
		});

		cy.getBlockeraStylesWrapper().should(($wrapper) => {
			expect($wrapper.text()).to.include('perspective-origin: 50% 25%');
		});
	});

	it('generates perspective-origin on the front end from REST-published legacy markup', () => {
		createPublishedPostWithLegacyMarkup(
			LEGACY_CHILD_ORIGIN_MARKUP,
			`e2e-legacy-child-origin-${Date.now()}`
		).then((post) => {
			expect(getPostRawContent(post)).to.include(LEGACY_CHILD_ORIGIN_ATTR);
			expect(getPostRawContent(post)).to.not.include(
				'"blockeraTransformChildOrigin":{"value"'
			);

			cy.visit(post.link);
		});

		cy.contains(
			'.wp-block-post-content p, .entry-content p',
			'Legacy child origin CSS'
		).should('have.class', 'blockera-block-legacy-child-origin');

		assertDocumentCssIncludes('perspective-origin: 50% 25%');
	});
});
