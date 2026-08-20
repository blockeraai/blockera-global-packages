/**
 * Blockera dependencies
 */
import {
	appendBlocks,
	setInnerBlock,
	setParentBlock,
	createPost,
	activateMuPlugin,
	deactivateMuPlugin,
} from '@blockera/dev-cypress/js/helpers';

const PATTERN_INSPECTOR_MU_PLUGIN =
	'packages/global-packages/packages/blocks-core/test/fixtures/inspector-styles-visibility.inner-blocks.mu-plugin.php';

/**
 * Regression: Gutenberg inspector vs Blockera style extensions.
 *
 * Blockera replaces core Styles-tab UI (Color, Typography, Layout, Dimensions,
 * Border, variation transforms) with its own extensions. Gutenberg inspector
 * markup moved in WP 6.8–7.1 (inspector tabs, SlotFill, emotion `css-*`
 * tools-panels). Those changes can show core panels again while Blockera still
 * renders — or hide Blockera extensions when they stay inside `__tabs`.
 *
 * What broke (WP 7.1) and what this spec guards:
 *
 * 1. Parent, Styles tab
 *    Core `.components-tools-panel` nodes sit in the styles tabpanel. A Slot
 *    wrapper may also `:has(.blockera-state-colors-container)`, so hiding only
 *    direct children that lack Blockera UI is not enough. Nested core
 *    tools-panels and non-Blockera `.components-panel__body` must stay hidden.
 *    Variation transforms are inspector siblings, not tabpanel children.
 *
 * 2. Inner block (virtual Blockera inner block, not canvas selection)
 *    Blockera controls are an inspector sibling (`display: contents` wrapper).
 *    `.block-editor-block-inspector__tabs` must be hidden. After that, WP 7.1
 *    can hoist core tools-panels to inspector children with emotion `css-*`
 *    classes. A `:not([class^="css-"])` hide rule misses them; hide
 *    `> .components-tools-panel` on `.blockera-inner-block-inspector`.
 *
 * 3. Return to parent
 *    Switching inner → parent must restore the parent Styles hide rules
 *    (classes `blockera-inspector-on-styles-tab` /
 *    `blockera-inner-block-inspector`).
 *
 * 4. Pattern edit inner block
 *    In inline "Edit pattern" mode, InspectorControls can stay inside `__tabs`.
 *    Hiding that node then hides Blockera extensions. Keep `__tabs` visible
 *    when it `:has(.blockera-extension)`.
 *
 * CSS: packages/editor/js/extensions/components/style.scss
 * (`.blockera-inspector-on-styles-tab`, `.blockera-inner-block-inspector`).
 *
 * Fixture: Group + Button inner block in the post editor. PHP mu-plugin pattern
 * (Query Loop → linked Post Title) for pattern edit.
 *
 * If this fails after a Gutenberg bump: inspect
 * `.block-editor-block-inspector` children, check whether core panels / Blockera
 * extensions live in `__tabs` or as inspector siblings, and update the SCSS
 * selectors above. Do not treat visible core Color/Typography/Layout
 * tools-panels as expected.
 */
const assertCoreStyleExtensionsHidden = () => {
	cy.get('.blockera-state-colors-container').should('be.visible');

	cy.get('.block-editor-block-inspector').should(($inspector) => {
		const visibleTools = $inspector.find(
			'.components-tools-panel:not(.block-editor-bindings__panel):visible'
		);
		expect(
			visibleTools.length,
			'core tools-panels should be hidden on Styles'
		).to.equal(0);

		const visibleCoreBodies = $inspector
			.find('.components-panel__body:visible')
			.filter((_, el) => !String(el.className).includes('blockera'));
		expect(
			visibleCoreBodies.length,
			'core panel bodies should be hidden on Styles'
		).to.equal(0);

		expect(
			$inspector.find(
				'.block-editor-block-variation-transforms:visible'
			).length,
			'core variation transforms should be hidden on Styles'
		).to.equal(0);
	});
};

const assertBlockeraStyleExtensionsVisible = () => {
	cy.get('.blockera-state-colors-container').should('be.visible');
	cy.get('.block-editor-block-inspector').should(($inspector) => {
		const $tabs = $inspector.find('.block-editor-block-inspector__tabs');
		const tabsAreHidden =
			$tabs.length > 0 && $tabs.css('display') === 'none';
		const trappedInHiddenTabs = tabsAreHidden
			? $tabs.find('.blockera-extension').length
			: 0;

		expect(
			trappedInHiddenTabs,
			'Blockera extensions must not sit inside hidden inspector tabs'
		).to.equal(0);

		expect(
			$inspector.find('.blockera-extension:visible').length,
			'Blockera style extensions should be visible'
		).to.be.at.least(1);
	});
};

describe('Inspector → Styles Visibility (Inner Blocks)', () => {
	describe('Post editor', () => {
		beforeEach(() => {
			createPost();
		});

		it('hides core style extensions on the parent Styles tab, the inner block, and again after returning to the parent', () => {
		appendBlocks(`<!-- wp:group {"layout":{"type":"constrained"}} -->
<div class="wp-block-group"><!-- wp:paragraph -->
<p>test paragraph</p>
<!-- /wp:paragraph -->

<!-- wp:buttons -->
<div class="wp-block-buttons"><!-- wp:button -->
<div class="wp-block-button"><a class="wp-block-button__link wp-element-button">test button</a></div>
<!-- /wp:button --></div>
<!-- /wp:buttons --></div>
<!-- /wp:group -->`);

		cy.getBlock('core/paragraph').first().click();
		cy.getByAriaLabel('Select Group').click();

		cy.getByAriaControls('styles-view').click();
		assertCoreStyleExtensionsHidden();

		setInnerBlock('core/button');
		assertCoreStyleExtensionsHidden();

		setParentBlock();
		cy.getByAriaControls('styles-view').click();
		assertCoreStyleExtensionsHidden();
		});
	});

	describe('Synced pattern edit', () => {
		beforeEach(() => {
			activateMuPlugin({
				pluginPath: PATTERN_INSPECTOR_MU_PLUGIN,
			});
			createPost();
		});

		afterEach(() => {
			deactivateMuPlugin({
				pluginPath: PATTERN_INSPECTOR_MU_PLUGIN,
			});
		});

		it('shows Blockera extensions when editing an inner block inside pattern edit', () => {
			cy.window().then((win) => {
				return win.wp.data
					.resolveSelect('core')
					.getBlockPatterns()
					.then((patterns) => {
						const pattern = (patterns || []).find(
							(item) =>
								item.name ===
								'blockera/e2e-pattern-inspector'
						);

						expect(
							pattern && pattern.content,
							'PHP-registered pattern fixture'
						).to.be.ok;

						appendBlocks(pattern.content);
					});
			});

			cy.getBlock('core/group').first().click();
			cy.contains('button', 'Edit pattern').click();
			cy.contains('button', 'Exit pattern').should('be.visible');

			cy.getBlock('core/post-title').first().click();
			setInnerBlock('elements/link');

			assertBlockeraStyleExtensionsVisible();
			assertCoreStyleExtensionsHidden();
		});
	});
});
