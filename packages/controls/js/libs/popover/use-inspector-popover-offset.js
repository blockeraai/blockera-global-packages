// @flow

/**
 * External dependencies
 */
import { useState, useLayoutEffect } from '@wordpress/element';

/**
 * Internal dependencies
 */
import {
	computeInspectorPopoverOffset,
	getInspectorSidebarElement,
	resolvePopoverAnchorElement,
} from './utils';

type UseInspectorPopoverOffsetArgs = {
	explicitAnchor: ?HTMLElement,
	fallbackAnchor: ?HTMLElement,
	placement: string,
	inspectorGap: number,
};

export function useInspectorPopoverOffset({
	explicitAnchor,
	fallbackAnchor,
	placement,
	inspectorGap,
}: UseInspectorPopoverOffsetArgs): number {
	const resolveAnchor = () =>
		resolvePopoverAnchorElement(explicitAnchor, fallbackAnchor);

	const [offset, setOffset] = useState(() =>
		computeInspectorPopoverOffset(resolveAnchor(), placement, inspectorGap)
	);

	useLayoutEffect(() => {
		const updateOffset = () => {
			const nextOffset = computeInspectorPopoverOffset(
				resolveAnchor(),
				placement,
				inspectorGap
			);

			setOffset((currentOffset) =>
				currentOffset === nextOffset ? currentOffset : nextOffset
			);
		};

		let frameId = 0;
		const scheduleUpdateOffset = () => {
			if (frameId) {
				return;
			}

			frameId = window.requestAnimationFrame(() => {
				frameId = 0;
				updateOffset();
			});
		};

		updateOffset();

		const resolvedAnchor = resolveAnchor();

		if (!resolvedAnchor) {
			return;
		}

		const sidebar = getInspectorSidebarElement(resolvedAnchor);
		const resizeObserver = new ResizeObserver(scheduleUpdateOffset);

		if (sidebar) {
			resizeObserver.observe(sidebar);
		}

		window.addEventListener('resize', scheduleUpdateOffset);

		const scrollTarget =
			resolvedAnchor.closest('.interface-complementary-area') ||
			sidebar?.querySelector('.components-panel') ||
			sidebar;

		if (scrollTarget) {
			scrollTarget.addEventListener('scroll', scheduleUpdateOffset, {
				passive: true,
			});
		}

		return () => {
			if (frameId) {
				window.cancelAnimationFrame(frameId);
			}
			resizeObserver.disconnect();
			window.removeEventListener('resize', scheduleUpdateOffset);

			if (scrollTarget) {
				scrollTarget.removeEventListener(
					'scroll',
					scheduleUpdateOffset
				);
			}
		};
	}, [explicitAnchor, fallbackAnchor, placement, inspectorGap]);

	return offset;
}
