import { getSelectedBlock } from './editor';
import { openInserter } from './block-states';

export function setParentBlock() {
	cy.get('.blockera-extension-block-card__close').should('be.visible');
	cy.get('.blockera-extension-block-card__close').click();
}

export function setInnerBlock(blockType) {
	const itemSelector = `.blockera-control-inner-blocks-repeater [data-cy="repeater-item"][data-id="${blockType}"]`;
	const pickerItemSelector = `[aria-label="${blockType}"]`;

	const waitForInnerBlockCard = () => {
		cy.getByDataTest('blockera-inner-block-card', { timeout: 20000 }).should(
			'exist'
		);
	};

	const activateInnerBlock = () => {
		cy.window().then((win) => {
			win.wp.data
				.dispatch('blockera/extensions')
				.changeExtensionCurrentBlock(blockType);
		});
		waitForInnerBlockCard();
	};

	const clickInnerBlockItem = () => {
		cy.get(itemSelector)
			.filter(':visible')
			.first()
			.within(() => {
				cy.get('.blockera-inner-block-label, span')
					.first()
					.click({ force: true });
			});
		activateInnerBlock();
	};

	cy.get('body').then(($body) => {
		if ($body.find(itemSelector).length > 0) {
			clickInnerBlockItem();
			return;
		}

		// force:false virtual inner blocks (elements/link, …) are added from the
		// shared states/inner-blocks inserter. WP→Blockera hydrate can also put
		// them in the repeater; only wait for that when the picker has no match.
		openInserter();

		cy.get('.blockera-component-popover')
			.last()
			.then(($popover) => {
				if ($popover.find(pickerItemSelector).length > 0) {
					cy.wrap($popover).within(() => {
						cy.getByAriaLabel(blockType).click({ force: true });
					});
					waitForInnerBlockCard();
					return;
				}

				cy.get('body').type('{esc}', { force: true });
				cy.get(itemSelector, { timeout: 20000 }).should('exist');
				clickInnerBlockItem();
			});
	});
}

export function getAllowedBlocks() {
	return cy
		.window()
		.its('wp.data')
		.then((data) => {
			return data
				.select('core/block-editor')
				.getAllowedBlocks(getSelectedBlock(data).clientId);
		});
}

export function getBlockTypeInnerBlocksStore(data) {
	return data
		.select('blockera/extensions')
		.getBlockInners(getSelectedBlock(data).clientId);
}

export function search(term) {
	cy.getByDataId('search bar').type(term, { delay: 0 });
}

export function checkSelectedInnerBlock(blockTitle, exist = true) {
	if (exist) {
		cy.getByDataTest('blockera-inner-block-card')
			.contains(blockTitle)
			.should('exist');
	} else {
		cy.getByDataTest('blockera-inner-block-card').should('not.exist');
	}
}
