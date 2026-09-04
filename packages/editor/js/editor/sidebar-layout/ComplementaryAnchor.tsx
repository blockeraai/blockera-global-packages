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
	useComplementaryOverlay,
} from './useComplementaryOverlay';
import { applyFloatingPaneFromDrag } from './drag-session';
import SidebarPaneDragHandle from './SidebarPaneDragHandle';

type ComplementaryAnchorProps = {
	isActive: boolean;
	complementaryAreaId?: string | null;
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
	complementaryAreaId,
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

		let cancelled = false;
		let frame = 0;
		let attempts = 0;

		const syncHost = () => {
			if (cancelled) {
				return;
			}

			const next = findComplementaryHandleHost();
			if (next) {
				setHandleHost((current) => (current === next ? current : next));
				return;
			}

			attempts += 1;
			if (attempts < 60) {
				frame = window.requestAnimationFrame(syncHost);
			}
		};

		syncHost();

		return () => {
			cancelled = true;
			if (frame) {
				window.cancelAnimationFrame(frame);
			}
		};
	}, [isActive, complementaryAreaId]);

	// Gutenberg paints the Settings tab underline from tablist CSS vars
	// `--selected-width` and `--selected-left` (scaleX on ::before). Core
	// sizes those from getComputedStyle width, which can omit the extra
	// start padding we add for the dock drag handle. Copy offsetWidth /
	// offsetLeft onto the vars so the line spans the full selected tab.
	useLayoutEffect(() => {
		if (!isActive || !handleHost) {
			return;
		}

		const syncCoreTablistIndicator = () => {
			const tablist = handleHost.querySelector(
				'[role="tablist"][aria-orientation="horizontal"]'
			) as HTMLElement | null;
			const selected = tablist?.querySelector<HTMLElement>(
				'[role="tab"][aria-selected="true"]'
			);
			if (!tablist || !selected) {
				return;
			}

			tablist.style.setProperty(
				'--selected-width',
				String(selected.offsetWidth)
			);
			tablist.style.setProperty(
				'--selected-left',
				String(selected.offsetLeft)
			);
		};

		syncCoreTablistIndicator();
		const afterCore = window.requestAnimationFrame(syncCoreTablistIndicator);
		const resizeObserver = new ResizeObserver(syncCoreTablistIndicator);
		resizeObserver.observe(handleHost);
		const selected = handleHost.querySelector(
			'[role="tab"][aria-selected="true"]'
		);
		if (selected) {
			resizeObserver.observe(selected);
		}

		const onTabListClick = () => {
			window.requestAnimationFrame(syncCoreTablistIndicator);
		};
		handleHost.addEventListener('click', onTabListClick);

		return () => {
			window.cancelAnimationFrame(afterCore);
			resizeObserver.disconnect();
			handleHost.removeEventListener('click', onTabListClick);
		};
	}, [isActive, handleHost, complementaryAreaId]);

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
