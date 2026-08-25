// @flow

/**
 * External dependencies
 */
import { select } from '@wordpress/data';

/**
 * Blockera dependencies
 */
import { isBlockeraBlockModeBasic } from '@blockera/utils';

/**
 * True when this block or an ancestor is in Basic Mode.
 *
 * @param {string} clientId Block client id.
 * @param {Object} attributes This block's attributes.
 * @return {boolean} Whether Blockera engine should skip.
 */
export function isBlockeraEngineSkippedForClient(
	clientId: string,
	attributes: Object
): boolean {
	if (isBlockeraBlockModeBasic(attributes)) {
		return true;
	}

	const blockEditor = select('core/block-editor');
	if (!blockEditor?.getBlockParents) {
		return false;
	}

	const parents = blockEditor.getBlockParents(clientId) || [];
	for (let i = 0; i < parents.length; i++) {
		const parentAttrs = blockEditor.getBlockAttributes(parents[i]);
		if (isBlockeraBlockModeBasic(parentAttrs)) {
			return true;
		}
	}

	return false;
}
