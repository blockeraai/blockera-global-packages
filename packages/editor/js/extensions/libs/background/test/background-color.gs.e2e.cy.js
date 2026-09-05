import {
	openSiteEditor,
	assertBlockData,
	closeWelcomeGuide,
	redirectToFrontPage,
	getSelectedBlockStyle,
	saveSiteEditorDirtyEntities,
	resetGlobalStylesEntityRecord,
} from '@blockera/dev-cypress/js/helpers';

/**
 * Clears `blockera/editor` userStyles so save-compatibility cannot merge stale
 * local blocks back into a just-reset `root/globalStyles` entity.
 */
const clearBlockeraGlobalStylesStore = () => {
	cy.window().then((win) => {
		const dispatch = win.wp?.data?.dispatch?.('blockera/editor');

		if (typeof dispatch?.setGlobalStyles === 'function') {
			dispatch.setGlobalStyles({});
		}
	});
};

describe('Background Color Inside Style Variations → Functionality', () => {
	beforeEach(() => {
		openSiteEditor();

		// Specs persist global styles to the DB. Without a reset, a prior run leaves
		// a value-addon chip on BG Color (no `color-btn`) and the suite flakes.
		clearBlockeraGlobalStylesStore();
		resetGlobalStylesEntityRecord();

		cy.openGlobalStylesPanel();

		closeWelcomeGuide();

		cy.getByDataTest('block-style-variations', { timeout: 20000 })
			.eq(0)
			.should('be.visible')
			.click();

		cy.get(`button[id="/blocks/core%2Fparagraph"]`, { timeout: 20000 })
			.should('be.visible')
			.click();

		// Wait for style cards after the paragraph block screen loads (CI flake).
		cy.getByDataTest('style-default', { timeout: 20000 })
			.should('be.visible')
			.click();

		// Wait until the BG Color control is interactive (plain color button, not a
		// leftover value-addon chip from a previous persisted run).
		cy.getParentContainer('BG Color')
			.last()
			.find('[data-cy="color-btn"]', { timeout: 20000 })
			.should('exist');
	});

	afterEach(() => {
		// Persist empty styles so the next Cypress run hydrates a clean entity.
		// Clear the Blockera store first — saveSiteEditorDirtyEntities merges
		// blockera/editor userStyles into the entity before save.
		openSiteEditor();
		clearBlockeraGlobalStylesStore();
		resetGlobalStylesEntityRecord();
		saveSiteEditorDirtyEntities();
	});

	it('should be set background color for Default style variation', () => {
		// Uses last Popover + data-cy hex field (avoids multi-match .components-popover input)
		cy.setColorControlValue('BG Color', '666666');

		//assert data
		assertBlockData((data) => {
			expect(
				getSelectedBlockStyle(data, 'core/paragraph', 'default')
					?.blockeraBackgroundColor?.value
			).to.be.equal('#666666');
		});

		// assert editor
		cy.getBlock('core/paragraph').should(
			'have.css',
			'backgroundColor',
			'rgb(102, 102, 102)'
		);

		//assert frontend
		saveSiteEditorDirtyEntities();
		redirectToFrontPage();
		cy.get('.entry-content p:first-child').should(
			'have.css',
			'background-color',
			'rgb(102, 102, 102)'
		);
	});

	it('should be set background color with variable for Default style variation', () => {
		// add alias to the feature container
		cy.getParentContainer('BG Color').as('bgColorContainer');

		// act: clicking on color button
		cy.get('@bgColorContainer').within(() => {
			cy.openValueAddon();
		});

		// select variable
		cy.selectValueAddonItem('accent-4');

		//assert data
		assertBlockData((data) => {
			expect({
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
			}).to.be.deep.equal(
				getSelectedBlockStyle(data, 'core/paragraph', 'default')
					?.blockeraBackgroundColor?.value
			);
		});

		// Editor canvas: Accent 4 resolves to #686868. Avoid `.within()` on the
		// iframe body — a failed query there leaves Cypress scoped inside the
		// canvas, so afterEach `cy.get('body')` times out.
		cy.getBlock('core/paragraph').should(
			'have.css',
			'backgroundColor',
			'rgb(104, 104, 104)'
		);

		cy.getIframeBody()
			.find('#blockera-global-styles-wrapper', { timeout: 20000 })
			.invoke('text')
			.should((css) => {
				const text = String(css);
				expect(
					text.includes('var(--wp--preset--color--accent-4') ||
						text.includes('#686868')
				).to.eq(true);
			});

		//assert frontend
		saveSiteEditorDirtyEntities();
		redirectToFrontPage();

		cy.get('.entry-content p:first-child').should(
			'have.css',
			'background-color',
			'rgb(104, 104, 104)'
		);
	});
});
