/**
 * WordPress dependencies
 */
import {
	createPortal,
	useLayoutEffect,
	useRef,
	useState,
} from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import type { CSSProperties } from 'react';

/**
 * Internal dependencies
 */
import {
	findComplementaryHandleHost,
	findSidebar,
	useComplementaryOverlay,
} from './useComplementaryOverlay';
import { applyFloatingPaneFromDrag } from './drag-session';
import SidebarPaneDragHandle from './SidebarPaneDragHandle';

type ComplementaryAnchorProps = {
	isActive: boolean;
	canDrag: boolean;
	height: string;
	isFloating?: boolean;
	floatingStyle?: CSSProperties;
	onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => void;
};

/**
 * Placeholder pane that Gutenberg's complementary area is positioned over.
 */
export default function ComplementaryAnchor({
	isActive,
	canDrag,
	height,
	isFloating,
	floatingStyle,
	onPointerDown,
}: ComplementaryAnchorProps) {
	const paneRef = useRef<HTMLDivElement | null>(null);
	const [handleHost, setHandleHost] = useState<HTMLElement | null>(null);
	useComplementaryOverlay(paneRef, isActive);
	useLayoutEffect(() => {
		if (isFloating) {
			applyFloatingPaneFromDrag();
		}
	}, [isFloating, floatingStyle]);

	useLayoutEffect(() => {
		if (!isActive) {
			setHandleHost(null);
			return;
		}

		const syncHost = () => {
			const next = findComplementaryHandleHost();
			setHandleHost((current) => (current === next ? current : next));
		};

		syncHost();
		const observer = new MutationObserver(syncHost);
		const sidebar = findSidebar();
		if (sidebar) {
			observer.observe(sidebar, { childList: true, subtree: true });
		}

		return () => observer.disconnect();
	}, [isActive]);

	const handle = (
		<SidebarPaneDragHandle
			className="blockera-sidebar-pane__drag-handle is-overlay is-complementary"
			data-test="blockera-sidebar-pane-drag-complementary"
			onPointerDown={canDrag ? onPointerDown : undefined}
			aria-label={__('Move settings panel', 'blockera')}
		/>
	);

	return (
		<div
			ref={paneRef}
			className={`blockera-sidebar-pane blockera-sidebar-pane--complementary${
				isFloating ? ' is-floating' : ''
			}`}
			data-test="blockera-sidebar-pane-complementary"
			style={
				{
					'--blockera-pane-height': height,
					...floatingStyle,
				} as CSSProperties
			}
		>
			{isActive && handleHost && createPortal(handle, handleHost)}
		</div>
	);
}
