/**
 * Find the nearest scrollable ancestor used as IntersectionObserver root.
 * Ignore tiny or barely overflowing nodes so nested flex wrappers do not win.
 *
 * @param {Element|null} node Starting node.
 * @return {Element|null} Scroll root or modal frame.
 */
export function getIntersectionRoot(node) {
	let current = node?.parentElement;

	while (current && current !== document.body) {
		const { overflowY } = window.getComputedStyle(current);
		const canScroll =
			overflowY === 'auto' ||
			overflowY === 'scroll' ||
			overflowY === 'overlay';

		if (
			canScroll &&
			current.clientHeight > 32 &&
			current.scrollHeight > current.clientHeight + 8
		) {
			return current;
		}

		current = current.parentElement;
	}

	return (
		node?.closest('.blockera-control-icon-picker-modal') ||
		node?.closest('.components-modal__frame') ||
		null
	);
}
