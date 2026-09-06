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
	shouldUpdateInspectorPopoverOffset,
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
		let lastSidebarWidth = Number.NaN;

		const updateOffset = ({
			force = false,
		}: { force?: boolean } = {}): void => {
			const resolvedAnchor = resolveAnchor();
			const sidebar = getInspectorSidebarElement(resolvedAnchor);
			const nextWidth =
				sidebar?.getBoundingClientRect().width ?? Number.NaN;

			if (
				!force &&
				!shouldUpdateInspectorPopoverOffset(
					lastSidebarWidth,
					nextWidth
				)
			) {
				return;
			}

			lastSidebarWidth = nextWidth;

			const nextOffset = computeInspectorPopoverOffset(
				resolvedAnchor,
				placement,
				inspectorGap
			);

			setOffset((currentOffset) =>
				currentOffset === nextOffset ? currentOffset : nextOffset
			);
		};

		let frameId = 0;
		const scheduleUpdateOffset = (force: boolean = false): void => {
			if (frameId) {
				return;
			}

			frameId = window.requestAnimationFrame(() => {
				frameId = 0;
				updateOffset({ force });
			});
		};

		updateOffset({ force: true });

		const resolvedAnchor = resolveAnchor();

		if (!resolvedAnchor) {
			return;
		}

		const sidebar = getInspectorSidebarElement(resolvedAnchor);
		const resizeObserver = new ResizeObserver((entries) => {
			const entry = entries[0];
			const nextWidth = entry?.contentRect?.width ?? Number.NaN;

			if (
				!shouldUpdateInspectorPopoverOffset(
					lastSidebarWidth,
					nextWidth
				)
			) {
				return;
			}

			scheduleUpdateOffset();
		});

		if (sidebar) {
			resizeObserver.observe(sidebar);
		}

		const onWindowResize = () => scheduleUpdateOffset(true);
		window.addEventListener('resize', onWindowResize);

		return () => {
			if (frameId) {
				window.cancelAnimationFrame(frameId);
			}
			resizeObserver.disconnect();
			window.removeEventListener('resize', onWindowResize);
		};
	}, [explicitAnchor, fallbackAnchor, placement, inspectorGap]);

	return offset;
}
