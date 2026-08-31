/**
 * Apply content height to the canvas iframe so the visual editor is the
 * scrollport (avoids nested iframe + parent scrollbars).
 */

import {
	DEFAULT_ZOOM,
	IN_BREAKPOINT_CLASS,
	MAX_REASONABLE_HEIGHT,
	MIN_IFRAME_HEIGHT,
	ZOOMED_OUT_CLASS,
} from './constants';
import { getEditorCanvasIframe, getIframeDocument } from './iframeUtils';

/**
 * Whether the canvas should use the outer visual-editor scrollport.
 */
export function iframeUsesOuterScrollport(
	iframe: HTMLIFrameElement
): boolean {
	return (
		iframe.classList.contains(ZOOMED_OUT_CLASS) ||
		iframe.classList.contains(IN_BREAKPOINT_CLASS)
	);
}

/**
 * Apply height to iframe based on content height, zoom, and breakpoint preview.
 * Prevents double scrollbars by sizing the iframe to content and hiding inner overflow.
 */
export function applyIframeHeight(
	height: number,
	zoomPercent: number,
	initialHeight?: number | null
): void {
	const iframe = getEditorCanvasIframe();
	if (!iframe) {
		return;
	}

	const effectiveHeight =
		initialHeight !== null &&
		initialHeight !== undefined &&
		initialHeight > height
			? initialHeight
			: height;

	const useOuterScrollport = iframeUsesOuterScrollport(iframe);

	// At 100% zoom on the base breakpoint, let WordPress size the iframe.
	if (zoomPercent === DEFAULT_ZOOM && !useOuterScrollport) {
		iframe.style.removeProperty('height');
		iframe.style.removeProperty('overflow');
		iframe.removeAttribute('scrolling');

		requestAnimationFrame(() => {
			if (!iframeUsesOuterScrollport(iframe)) {
				iframe.style.setProperty('overflow', 'auto', 'important');
			}
		});

		return;
	}

	if (
		effectiveHeight > 0 &&
		effectiveHeight <= MAX_REASONABLE_HEIGHT &&
		(zoomPercent !== DEFAULT_ZOOM || useOuterScrollport)
	) {
		const finalHeight = Math.max(MIN_IFRAME_HEIGHT, effectiveHeight);

		const iframeDoc = getIframeDocument(iframe);
		if (iframeDoc?.defaultView) {
			iframeDoc.defaultView.postMessage(
				{ type: 'BLOCKERA_ZOOM_PAUSE_UPDATES', pause: true },
				'*'
			);
		}

		iframe.style.setProperty('height', `${finalHeight}px`, 'important');
		iframe.setAttribute('scrolling', 'no');
		iframe.style.setProperty('overflow', 'hidden', 'important');

		setTimeout(() => {
			if (iframeDoc?.defaultView) {
				iframeDoc.defaultView.postMessage(
					{
						type: 'BLOCKERA_ZOOM_PAUSE_UPDATES',
						pause: false,
					},
					'*'
				);
			}
		}, 1000);
	}
}
