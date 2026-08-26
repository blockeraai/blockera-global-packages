import { getSelectedBlock } from './editor';
import { openInserter } from './block-states';

export function setParentBlock() {
	cy.get('.blockera-extension-block-card__close').should('be.visible');
	cy.get('.blockera-extension-block-card__close').click();
}

export function setInnerBlock(blockType) {
	const itemSelector = `.blockera-control-inner-blocks-repeater [data-id="${blockType}"], .blockera-control-repeater div[data-id="${blockType}"]`;
	const isNamedInnerBlock =
		typeof blockType === 'string' &&
		(blockType.startsWith('elements/') || blockType.startsWith('core/'));

	const clickInnerBlockItem = () => {
		cy.get(`${itemSelector} [data-cy="group-control-header"]`)
			.first()
			.click({ force: true });

		cy.getByDataTest('blockera-inner-block-card', { timeout: 20000 }).should(
			'exist'
		);
	};

	cy.get('body').then(($body) => {
		if ($body.find(itemSelector).length > 0) {
			clickInnerBlockItem();
			return;
		}

		// Virtual inner blocks (elements/link, core/post-date, …) appear in the
		// repeater after WP→Blockera hydrate. The inner-blocks control has no add
		// button; falling through to the block-state inserter waits forever for an
		// aria-label that never exists (CI job timeout).
		if (isNamedInnerBlock) {
			cy.get(itemSelector, { timeout: 20000 }).should('exist');
			clickInnerBlockItem();
			return;
		}

		openInserter();

		cy.get('.blockera-component-popover')
			.last()
			.within(() => {
				cy.getByAriaLabel(blockType).click({ force: true });
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
