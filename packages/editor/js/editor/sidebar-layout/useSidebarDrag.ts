/**
 * WordPress dependencies
 */
import { useEffect, useState } from '@wordpress/element';

/**
 * Internal dependencies
 */
import { getSidebarDrag, subscribeSidebarDrag } from './drag-session';
import type { SidebarDragState } from './drag-session';

function layoutKey(next: SidebarDragState | null): string {
	if (!next) {
		return '';
	}

	return `${next.sectionId}:${next.hoverDock}:${next.hoverSlot}:${next.revealThirdDock}:${next.width}:${next.height}:${
		next.returning ? '1' : '0'
	}`;
}

/**
 * Layout-only drag subscription. Pointer position does not re-render.
 */
export function useSidebarDrag(): SidebarDragState | null {
	const [drag, setDrag] = useState<SidebarDragState | null>(getSidebarDrag);

	useEffect(() => {
		let lastKey = layoutKey(getSidebarDrag());

		return subscribeSidebarDrag(() => {
			const next = getSidebarDrag();
			const nextKey = layoutKey(next);
			if (nextKey === lastKey) {
				return;
			}
			lastKey = nextKey;
			setDrag(next ? { ...next } : null);
		}, 'layout');
	}, []);

	return drag;
}
