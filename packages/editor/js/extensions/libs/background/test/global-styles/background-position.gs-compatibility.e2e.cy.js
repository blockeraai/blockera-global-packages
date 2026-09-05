/**
 * Background Position → WP Compatibility (Global Styles)
 */
import {
	openSiteEditor,
	closeWelcomeGuide,
	getEditedGlobalStylesRecord,
	assertBlockData,
	assertClearedGlobalStylesStayCleared,
	activateMuPlugin,
	deactivateMuPlugin,
	resetGlobalStylesEntityRecord,
} from '@blockera/dev-cypress/js/helpers';

const MU_PLUGIN_PATH =
	'packages/editor/js/extensions/libs/background/test/global-styles/fixtures/background-position-setup-1.php';
const MU_PLUGIN_TARGET = 'blockera-test-bg-position-global-styles-custom.php';

const getGroupGlobalStyles = (data) =>
	getEditedGlobalStylesRecord(data, 'styles', 'blocks')?.['core/group'];

const openGroupGlobalStyles = () => {
	cy.openGlobalStylesPanel();
	closeWelcomeGuide();
	cy.getByDataTest('block-style-variations').eq(0).click();
	cy.get('button[id="/blocks/core%2Fgroup"]').click();
	cy.getByDataTest('style-default').click();
	cy.addNewTransition();
};

describe('Background Position → WP Compatibility (Global Styles)', () => {
	beforeEach(() => {
		activateMuPlugin({
			pluginPath: MU_PLUGIN_PATH,
			pluginName: MU_PLUGIN_TARGET,
		});
		openSiteEditor();
		resetGlobalStylesEntityRecord();
		openGroupGlobalStyles();
	});

	afterEach(() => {
		deactivateMuPlugin({
			pluginPath: MU_PLUGIN_PATH,
			pluginName: MU_PLUGIN_TARGET,
		});
	});

	describe('Group Block', () => {
		describe('Background Position', () => {
			it('Custom Value', () => {
				cy.getParentContainer('Image & Gradient').as('bgContainer');

				//
				// Test 1: WP data to Blockera
				//

				assertBlockData((data) => {
					const blockeraBackground =
						getGroupGlobalStyles(data)?.blockeraBackground;

					expect({
						value: {
							'image-0': {
								isVisible: true,
								type: 'image',
								image: 'https://placehold.co/600x400',
								'image-size': 'custom',
								'image-size-width': 'auto',
								'image-size-height': 'auto',
								'image-position': {
									top: '20%',
									left: '30%',
								},
								'image-repeat': 'repeat',
								'image-attachment': 'scroll',
								order: 0,
							},
						},
					}).to.deep.equal(blockeraBackground);
				});

				//
				// Test 2: Blockera value to WP data
				//

				cy.get('@bgContainer').within(() => {
					cy.get('[data-id="image-0"]').click();
				});

				cy.get('.components-popover')
					.last()
					.within(() => {
						cy.getByDataTest('position-button').click();
					});

				cy.get('.components-popover')
					.last()
					.within(() => {
						cy.getParentContainer('Top').within(() => {
							cy.get('input').clear({ force: true });
							cy.get('input').type('40', { force: true });
						});

						cy.getParentContainer('Left').within(() => {
							cy.get('input').clear({ force: true });
							cy.get('input').type('60', { force: true });
						});
					});

				assertBlockData((data) => {
					const backgroundPosition =
						getGroupGlobalStyles(data)?.background
							?.backgroundPosition;

					expect('40% 60%').to.equal(backgroundPosition);
				});

				//
				// Test 3: Clear Blockera value and check WP data
				//

				cy.get('body').type('{esc}', { force: true });
				cy.get('body').type('{esc}', { force: true });

				cy.get('@bgContainer').within(() => {
					cy.getByAriaLabel('Delete image 0').click({ force: true });
				});

				const assertClearedBackground = (data) => {
					const root = getGroupGlobalStyles(data);
					const background = root?.background;

					// User-origin reset must be `null` (not omitted). Omitting
					// lets merged GS fall back to theme.json and hydrate the
					// image back into the Blockera control after ~5s.
					expect(background?.backgroundImage).to.equal(null);
					expect(background?.backgroundPosition).to.equal(null);
					expect(root?.blockeraBackground).to.equal(undefined);
				};

				assertClearedGlobalStylesStayCleared(assertClearedBackground);

				cy.get('@bgContainer').within(() => {
					cy.get('[data-id="image-0"]').should('not.exist');
					cy.get('[data-id^="image-"]').should('not.exist');
				});
			});
		});
	});
});
