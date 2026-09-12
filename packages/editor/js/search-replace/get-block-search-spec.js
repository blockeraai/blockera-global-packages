/**
 * Resolve searchable paths for a block name.
 *
 * @package
 */

import { CORE_BLOCK_SEARCH_ATTRIBUTES } from './maps/core-block-search-attributes';
import { classifyBlockType } from './classify';

/**
 * @param {string} blockName
 * @param {Object} [blockType]
 * @return {{ skip?: boolean, reason?: string, visible: string[], attributes: string[] }}
 */
export function getBlockSearchSpec(blockName, blockType) {
	if (CORE_BLOCK_SEARCH_ATTRIBUTES[blockName]) {
		const spec = CORE_BLOCK_SEARCH_ATTRIBUTES[blockName];
		if (spec.skip) {
			return {
				skip: true,
				reason: spec.reason,
				visible: [],
				attributes: [],
			};
		}
		return {
			visible: spec.visible || [],
			attributes: spec.attributes || [],
		};
	}

	if (blockType) {
		return classifyBlockType(blockType);
	}

	return { visible: [], attributes: [] };
}

/**
 * @param {{ visible: string[], attributes: string[] }} spec
 * @param {'visible'|'attributes'|'all'} scope
 * @return {Array<{ path: string, kind: 'visible'|'attribute' }>}
 */
export function getPathsForScope(spec, scope) {
	const paths = [];

	if (scope === 'visible' || scope === 'all') {
		for (const path of spec.visible || []) {
			paths.push({ path, kind: 'visible' });
		}
	}

	if (scope === 'attributes' || scope === 'all') {
		for (const path of spec.attributes || []) {
			paths.push({ path, kind: 'attribute' });
		}
	}

	return paths;
}
