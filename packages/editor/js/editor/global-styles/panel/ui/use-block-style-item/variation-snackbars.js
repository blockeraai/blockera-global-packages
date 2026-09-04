// @flow

/**
 * External dependencies
 */
import { __, sprintf } from '@wordpress/i18n';
import { getBlockType } from '@wordpress/blocks';

/**
 * Blockera dependencies
 */
import { createSnackbarNotice } from '@blockera/controls';

export function notifyVariationDeleted(
	label: string,
	isSizeVariation: boolean
): void {
	createSnackbarNotice({
		id: 'blockera-variation-delete',
		content: isSizeVariation
			? sprintf(
					/* translators: %s: Size variation name. */
					__('Deleted "%s" size variation.', 'blockera'),
					label
				)
			: sprintf(
					/* translators: %s: Style variation name. */
					__('Deleted "%s" style variation.', 'blockera'),
					label
				),
	});
}

export function notifyVariationShared(
	label: string,
	enabledIn: Array<string>
): void {
	const count = enabledIn.length;
	let content = '';

	if (0 === count) {
		content = sprintf(
			/* translators: %s: Style variation name. */
			__('"%s" is no longer used on any blocks.', 'blockera'),
			label
		);
	} else if (1 === count) {
		const blockType = getBlockType(enabledIn[0]);
		const blockTitle = blockType?.title || enabledIn[0];

		content = sprintf(
			/* translators: 1: Style variation name. 2: Block type title. */
			__('"%s" is now used only on %s.', 'blockera'),
			label,
			blockTitle
		);
	} else {
		content = sprintf(
			/* translators: 1: Style variation name. 2: Number of blocks. */
			__('"%s" is now used on %d blocks.', 'blockera'),
			label,
			count
		);
	}

	createSnackbarNotice({
		id: 'blockera-variation-share',
		content,
	});
}
