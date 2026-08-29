/**
 * Group Block → Link Inner Block → WP Data Compatibility (Global Styles)
 */
import {
	openSiteEditor,
	closeWelcomeGuide,
	getEditedGlobalStylesRecord,
	assertBlockData,
	activateMuPlugin,
	deactivateMuPlugin,
	resetGlobalStylesEntityRecord,
} from '@blockera/dev-cypress/js/helpers';

const GLOBAL_STYLES_STYLE_UI_CONTEXT = 'global-styles-style';

const FIXTURE_ROOT =
	'packages/blocks-core/js/libs/wordpress/group/test/global-styles/fixtures';

const NAVIGATOR_SCREEN_SELECTOR =
	'.edit-site-global-styles-sidebar__navigator-screen, .global-styles-ui-sidebar__navigator-screen';

const muPluginByTestTitle = {
	'Simple color for inner block (normal + hover)': {
		path: `${FIXTURE_ROOT}/link-inner-blocks-simple-color.php`,
		target: 'blockera-test-link-inner-blocks-gs-simple-color.php',
	},
	'Variable color value for inner block (normal + hover)': {
		path: `${FIXTURE_ROOT}/link-inner-blocks-variable-color.php`,
		target: 'blockera-test-link-inner-blocks-gs-variable-color.php',
	},
};

const activeMuPlugins = new Map();

/**
 * Select an inner block in the Site Editor global-styles panel without clicking
 * the repeater header (that click toggles an inspector popover and can freeze
 * Chrome).
 *
 * @param {string} blockType
 */
const selectInnerBlockInGlobalStyles = (blockType) => {
	cy.window().then((win) => {
		win.wp.data
			.dispatch('blockera/extensions')
			.changeExtensionCurrentBlock(
				blockType,
				GLOBAL_STYLES_STYLE_UI_CONTEXT
			);
	});
	cy.getByDataTest('blockera-inner-block-card', { timeout: 20000 }).should(
		'exist'
	);
};

const setInnerBlockStateInGlobalStyles = (state) => {
	cy.window().then((win) => {
		win.wp.data
			.dispatch('blockera/extensions')
			.changeExtensionInnerBlockState(state);
	});
	cy.window().should((win) => {
		expect(
			win.wp.data
				.select('blockera/extensions')
				.getExtensionInnerBlockState()
		).to.equal(state);
	});
};

const getGroupGlobalStyles = (data) => {
	const group =
		getEditedGlobalStylesRecord(data, 'styles', 'blocks')?.['core/group'];

	if (!group || typeof group !== 'object') {
		return group;
	}

	return JSON.parse(JSON.stringify(group));
};

const openGroupGlobalStyles = () => {
	cy.openGlobalStylesPanel();
	closeWelcomeGuide();
	cy.get(NAVIGATOR_SCREEN_SELECTOR, { timeout: 20000 }).should('exist');
	cy.getByDataTest('block-style-variations').eq(0).click({ force: true });
	cy.get('button[id="/blocks/core%2Fgroup"]', { timeout: 20000 })
		.should('exist')
		.click({ force: true });
	cy.getByDataTest('style-default', { timeout: 20000 })
		.should('exist')
		.click({ force: true });
	// Any Blockera attribute write hydrates `blockeraInnerBlocks` from
	// theme.json. `addNewTransition()` leaves a remounting inspector popover
	// that freezes Chrome before the next test can run.
	cy.getParentContainer('Opacity').within(() => {
		cy.get('input').first().then(($input) => {
			cy.wrap($input).setControlledInputValue('99');
		});
	});
};

describe('Group Block → Link Inner Block → WP Data Compatibility (Global Styles)', () => {
	beforeEach(function () {
		this.timeout(180000);

		const muPlugin = muPluginByTestTitle[this.currentTest.title];

		if (muPlugin) {
			activateMuPlugin({
				pluginPath: muPlugin.path,
				pluginName: muPlugin.target,
			});
			activeMuPlugins.set(this.currentTest.title, muPlugin);
		}

		openSiteEditor();
		resetGlobalStylesEntityRecord();
		openGroupGlobalStyles();
	});

	afterEach(function () {
		const muPlugin = activeMuPlugins.get(this.currentTest.title);

		if (muPlugin) {
			deactivateMuPlugin({
				pluginPath: muPlugin.path,
				pluginName: muPlugin.target,
			});
			activeMuPlugins.delete(this.currentTest.title);
		}
	});

	it('Simple color for inner block (normal + hover)', () => {
		//
		// Test 1: WP data to Blockera
		//
		assertBlockData((data) => {
			const root = getGroupGlobalStyles(data);
			const linkElement = root?.elements?.link;
			const linkInnerBlock =
				root?.blockeraInnerBlocks?.value?.['elements/link'];

			expect('#ffbaba').to.equal(linkElement?.color?.text);
			expect('#ff1d1d').to.equal(linkElement?.[':hover']?.color?.text);
			expect({
				blockeraFontColor: '#ffbaba',
				blockeraBlockStates: {
					hover: {
						isVisible: true,
						breakpoints: {
							desktop: {
								attributes: {
									blockeraFontColor: '#ff1d1d',
								},
							},
						},
					},
				},
			}).to.deep.equal(linkInnerBlock?.attributes);
		});

		//
		// Test 2: Blockera value to WP data
		//
		selectInnerBlockInGlobalStyles('elements/link');

		setInnerBlockStateInGlobalStyles('normal');
		cy.setColorControlValue('Text Color', '666666');

		setInnerBlockStateInGlobalStyles('hover');
		cy.setColorControlValue('Text Color', '888888');

		assertBlockData((data) => {
			const root = getGroupGlobalStyles(data);
			const linkElement = root?.elements?.link;
			const linkInnerBlock =
				root?.blockeraInnerBlocks?.value?.['elements/link'];

			expect({
				blockeraFontColor: '#666666',
				blockeraBlockStates: {
					hover: {
						isVisible: true,
						breakpoints: {
							desktop: {
								attributes: {
									blockeraFontColor: '#888888',
								},
							},
						},
					},
				},
			}).to.deep.equal(linkInnerBlock?.attributes);
			expect('#666666').to.equal(linkElement?.color?.text);
			expect('#888888').to.equal(linkElement?.[':hover']?.color?.text);
		});

		//
		// Test 3: Clear Blockera value and check WP data
		//
		setInnerBlockStateInGlobalStyles('normal');
		cy.clearColorControlValue('Text Color');

		setInnerBlockStateInGlobalStyles('hover');
		cy.clearColorControlValue('Text Color');

		assertBlockData((data) => {
			const root = getGroupGlobalStyles(data);
			const linkElement = root?.elements?.link;
			const linkInnerBlock =
				root?.blockeraInnerBlocks?.value?.['elements/link'];

			expect(undefined).to.equal(linkInnerBlock?.attributes);
			expect(undefined).to.equal(linkElement?.color?.text);
			expect(undefined).to.equal(linkElement?.[':hover']?.color?.text);
		});
	});

	it('Variable color value for inner block (normal + hover)', () => {
		//
		// Test 1: WP data to Blockera
		//
		assertBlockData((data) => {
			const root = getGroupGlobalStyles(data);
			const linkElement = root?.elements?.link;
			const linkInnerBlock =
				root?.blockeraInnerBlocks?.value?.['elements/link'];

			expect('var(--wp--preset--color--accent-3)').to.equal(
				linkElement?.color?.text
			);
			expect('var(--wp--preset--color--accent-4)').to.equal(
				linkElement?.[':hover']?.color?.text
			);
			expect({
				blockeraFontColor: {
					settings: {
						name: 'Accent 3',
						id: 'accent-3',
						value: '#503AA8',
						reference: {
							type: 'theme',
							theme: 'Twenty Twenty-Five',
						},
						type: 'color',
						var: '--wp--preset--color--accent-3',
					},
					name: 'Accent 3',
					isValueAddon: true,
					valueType: 'variable',
				},
				blockeraBlockStates: {
					hover: {
						isVisible: true,
						breakpoints: {
							desktop: {
								attributes: {
									blockeraFontColor: {
										settings: {
											name: 'Accent 4',
											id: 'accent-4',
											value: '#686868',
											reference: {
												type: 'theme',
												theme: 'Twenty Twenty-Five',
											},
											type: 'color',
											var: '--wp--preset--color--accent-4',
										},
										name: 'Accent 4',
										isValueAddon: true,
										valueType: 'variable',
									},
								},
							},
						},
					},
				},
			}).to.deep.equal(linkInnerBlock?.attributes);
		});

		//
		// Test 2: Blockera value to WP data
		//
		selectInnerBlockInGlobalStyles('elements/link');

		setInnerBlockStateInGlobalStyles('normal');
		cy.getParentContainer('Text Color').last().within(() => {
			cy.clickValueAddonButton();
		});
		cy.selectValueAddonItem('contrast');

		setInnerBlockStateInGlobalStyles('hover');
		cy.getParentContainer('Text Color').last().within(() => {
			cy.clickValueAddonButton();
		});
		cy.selectValueAddonItem('accent-1');

		assertBlockData((data) => {
			const root = getGroupGlobalStyles(data);
			const linkElement = root?.elements?.link;
			const linkInnerBlock =
				root?.blockeraInnerBlocks?.value?.['elements/link'];

			expect({
				blockeraFontColor: {
					settings: {
						name: 'Contrast',
						id: 'contrast',
						value: '#111111',
						reference: {
							type: 'theme',
							theme: 'Twenty Twenty-Five',
						},
						type: 'color',
						var: '--wp--preset--color--contrast',
					},
					name: 'Contrast',
					isValueAddon: true,
					valueType: 'variable',
				},
				blockeraBlockStates: {
					hover: {
						isVisible: true,
						breakpoints: {
							desktop: {
								attributes: {
									blockeraFontColor: {
										settings: {
											name: 'Accent 1',
											id: 'accent-1',
											value: '#FFEE58',
											reference: {
												type: 'theme',
												theme: 'Twenty Twenty-Five',
											},
											type: 'color',
											var: '--wp--preset--color--accent-1',
										},
										name: 'Accent 1',
										isValueAddon: true,
										valueType: 'variable',
									},
								},
							},
						},
					},
				},
			}).to.deep.equal(linkInnerBlock?.attributes);
			expect('var:preset|color|contrast').to.equal(
				linkElement?.color?.text
			);
			expect('var:preset|color|accent-1').to.equal(
				linkElement?.[':hover']?.color?.text
			);
		});

		//
		// Test 3: Clear Blockera value and check WP data
		//
		setInnerBlockStateInGlobalStyles('normal');
		cy.getParentContainer('Text Color').last().within(() => {
			cy.removeValueAddon();
		});

		setInnerBlockStateInGlobalStyles('hover');
		cy.getParentContainer('Text Color').last().within(() => {
			cy.removeValueAddon();
		});

		assertBlockData((data) => {
			const root = getGroupGlobalStyles(data);
			const linkElement = root?.elements?.link;
			const linkInnerBlock =
				root?.blockeraInnerBlocks?.value?.['elements/link'];

			expect(undefined).to.equal(linkInnerBlock?.attributes);
			expect(undefined).to.equal(linkElement?.color?.text);
			expect(undefined).to.equal(linkElement?.[':hover']?.color?.text);
		});
	});
});
