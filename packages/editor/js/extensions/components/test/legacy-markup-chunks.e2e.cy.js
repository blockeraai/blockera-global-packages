/**
 * Blockera dependencies
 */
import {
	createPost,
	assertBlockData,
	getEditorContent,
} from '@blockera/dev-cypress/js/helpers';

/**
 * Internal dependencies
 */
import {
	LEGACY_MARKUP_CHUNKS,
	appendLegacyMarkupChunks,
	assertCleanedBlockeraSavedMarkup,
} from './fixtures/legacy-markup/chunks';

describe('Legacy markup chunks migrate and cleanup', () => {
	beforeEach(() => {
		createPost();
	});

	LEGACY_MARKUP_CHUNKS.forEach((chunk) => {
		it(`cleans unused defaults and empty style trees for ${chunk.id}`, () => {
			appendLegacyMarkupChunks([chunk]);

			cy.getBlock('core/group').first().click();

			assertBlockData(
				(data) => {
					assertCleanedBlockeraSavedMarkup(
						getEditorContent(data),
						chunk
					);
				},
				{ timeout: 60000 }
			);
		});
	});
});
