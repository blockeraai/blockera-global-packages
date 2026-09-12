/**
 * Search a block tree for matches.
 *
 * @package
 */

import { buildMatcher, findMatchesInText } from './matcher';
import { collectLeaves, pathIdentifier } from './paths';
import { getBlockSearchSpec, getPathsForScope } from './get-block-search-spec';
import { toPlainText } from './text';

export const MAX_DOCUMENT_MATCHES = 2000;

function walkBlocks(blocks, visit) {
	if (!Array.isArray(blocks)) {
		return;
	}

	for (const block of blocks) {
		if (!block) {
			continue;
		}
		visit(block);
		if (block.innerBlocks?.length) {
			walkBlocks(block.innerBlocks, visit);
		}
	}
}

/**
 * @param {Array<Object>} blocks
 * @param {{ query: string, matchCase?: boolean, wholeWord?: boolean, useRegex?: boolean, scope?: string, getBlockType?: Function }} options
 * @return {Array<Object>}
 */
export function searchBlocks(blocks, options) {
	const matcher = buildMatcher(options);
	if (!matcher) {
		return [];
	}

	const scope = options.scope || 'visible';
	const results = [];

	walkBlocks(blocks, (block) => {
		if (results.length >= MAX_DOCUMENT_MATCHES) {
			return;
		}

		const spec = getBlockSearchSpec(
			block.name,
			options.getBlockType?.(block.name)
		);

		if (spec.skip) {
			return;
		}

		for (const { path, kind } of getPathsForScope(spec, scope)) {
			if (path.toLowerCase().includes('annotation')) {
				continue;
			}

			const leaves = collectLeaves(block.attributes || {}, path);

			for (const leaf of leaves) {
				const text = toPlainText(leaf.value);
				const hits = findMatchesInText(text, matcher);

				for (const hit of hits) {
					results.push({
						clientId: block.clientId,
						blockName: block.name,
						kind,
						path,
						loc: leaf.loc,
						start: hit.start,
						end: hit.end,
						matchText: hit.text,
						identifier: pathIdentifier(path),
					});

					if (results.length >= MAX_DOCUMENT_MATCHES) {
						return;
					}
				}
			}
		}
	});

	return results;
}
