/**
 * Flatten a nested block tree.
 *
 * @param {Array<Object>} blocks
 * @return {Array<Object>}
 */
export function flattenBlocks(blocks) {
	const list = [];

	const walk = (items) => {
		if (!Array.isArray(items)) {
			return;
		}
		for (const block of items) {
			if (!block) {
				continue;
			}
			list.push(block);
			walk(block.innerBlocks);
		}
	};

	walk(blocks);
	return list;
}
