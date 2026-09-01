/**
 * WordPress dependencies
 */
import { useLayoutEffect } from '@wordpress/element';
import type { RefObject } from 'react';

/**
 * Internal dependencies
 */
import { subscribeSidebarDrag } from './drag-session';
import { countSidebarPerf } from './sidebar-perf';

const SIDEBAR_SELECTOR = '.interface-interface-skeleton__sidebar';
const OVERLAY_CLASS = 'blockera-complementary-overlay';

export function findSidebar(): HTMLElement | null {
	return document.querySelector(SIDEBAR_SELECTOR) as HTMLElement | null;
}

function clearOverlay(sidebar: HTMLElement | null): void {
	if (!sidebar) {
		return;
	}

	sidebar.classList.remove(OVERLAY_CLASS);
	sidebar.style.removeProperty('top');
	sidebar.style.removeProperty('left');
	sidebar.style.removeProperty('width');
	sidebar.style.removeProperty('height');
	sidebar.style.removeProperty('--sidebar-width');
	sidebar.style.removeProperty('--sidebar-width-raw');
}

export function findComplementaryHandleHost(): HTMLElement | null {
	const sidebar = findSidebar();
	if (!sidebar) {
		return null;
	}

	// ComplementaryArea remounts when the active tab identifier changes.
	// The tab bar is the stable host so the handle survives Page/Block switches.
	return (
		(sidebar.querySelector(
			'.editor-sidebar__panel-tabs'
		) as HTMLElement | null) ??
		(sidebar.querySelector(
			'.edit-widgets-sidebar__panel-tabs'
		) as HTMLElement | null)
	);
}

/**
 * Positions Gutenberg's complementary area over a Blockera pane placeholder
 * without re-parenting React-owned nodes.
 */
export function useComplementaryOverlay(
	anchorRef: RefObject<HTMLElement | null>,
	enabled: boolean
): void {
	useLayoutEffect(() => {
		const sidebar = findSidebar();

		if (!enabled) {
			clearOverlay(sidebar);
			document.body.classList.remove(
				'has-blockera-complementary-overlay'
			);
			return;
		}

		document.body.classList.add('has-blockera-complementary-overlay');

		let frame = 0;
		let lastTop = Number.NaN;
		let lastLeft = Number.NaN;
		let lastWidth = Number.NaN;
		let lastHeight = Number.NaN;

		const sync = () => {
			const anchor = anchorRef.current;
			const node = findSidebar();
			if (!anchor || !node) {
				return;
			}

			const rect = anchor.getBoundingClientRect();
			if (
				rect.top === lastTop &&
				rect.left === lastLeft &&
				rect.width === lastWidth &&
				rect.height === lastHeight
			) {
				return;
			}

			lastTop = rect.top;
			lastLeft = rect.left;
			lastWidth = rect.width;
			lastHeight = rect.height;

			countSidebarPerf('overlaySyncs');
			node.classList.add(OVERLAY_CLASS);
			node.style.setProperty('top', `${rect.top}px`, 'important');
			node.style.setProperty('left', `${rect.left}px`, 'important');
			node.style.setProperty('width', `${rect.width}px`, 'important');
			node.style.setProperty('height', `${rect.height}px`, 'important');
			node.style.setProperty('--sidebar-width', `${rect.width}px`);
			node.style.setProperty('--sidebar-width-raw', `${rect.width}px`);
		};

		const syncOnFrame = () => {
			if (frame) {
				return;
			}
			frame = window.requestAnimationFrame(() => {
				frame = 0;
				sync();
			});
		};

		sync();

		const observer = new ResizeObserver(syncOnFrame);
		if (anchorRef.current) {
			observer.observe(anchorRef.current);
		}
		window.addEventListener('resize', syncOnFrame);
		window.addEventListener('scroll', syncOnFrame, true);
		const unsubscribePosition = subscribeSidebarDrag(
			syncOnFrame,
			'position'
		);
		const unsubscribeLayout = subscribeSidebarDrag(sync, 'layout');

		return () => {
			if (frame) {
				window.cancelAnimationFrame(frame);
			}
			observer.disconnect();
			window.removeEventListener('resize', syncOnFrame);
			window.removeEventListener('scroll', syncOnFrame, true);
			unsubscribePosition();
			unsubscribeLayout();
			clearOverlay(findSidebar());
			document.body.classList.remove(
				'has-blockera-complementary-overlay'
			);
		};
	}, [anchorRef, enabled]);
}
