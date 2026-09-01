/**
 * WordPress dependencies
 */
import { useCallback, useEffect, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { MIN_PANE_PERCENT } from './constants';
import { splitHeightsAtBoundary } from './layout';

type PaneSplitHandleProps = {
	dockRef: React.RefObject<HTMLElement | null>;
	heights: string[];
	boundaryIndex: number;
	isVisible: boolean;
	onResize: (heights: string[]) => void;
};

/**
 * Vertical split handle between two stacked sidebar panes.
 */
export default function PaneSplitHandle({
	dockRef,
	heights,
	boundaryIndex,
	isVisible,
	onResize,
}: PaneSplitHandleProps) {
	const [showHandle, setShowHandle] = useState(false);
	const [isDragging, setIsDragging] = useState(false);
	const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const handleMouseEnter = useCallback(() => {
		if (!isVisible || isDragging) {
			return;
		}
		if (hoverTimeoutRef.current) {
			clearTimeout(hoverTimeoutRef.current);
		}
		hoverTimeoutRef.current = setTimeout(() => {
			if (!isDragging) {
				setShowHandle(true);
			}
		}, 300);
	}, [isVisible, isDragging]);

	const handleMouseLeave = useCallback(() => {
		if (hoverTimeoutRef.current) {
			clearTimeout(hoverTimeoutRef.current);
			hoverTimeoutRef.current = null;
		}
		if (!isDragging) {
			setShowHandle(false);
		}
	}, [isDragging]);

	const handleMouseDown = useCallback(
		(event: React.MouseEvent<HTMLDivElement>) => {
			if (!isVisible || !dockRef.current) {
				return;
			}

			event.preventDefault();
			event.stopPropagation();
			document.body.style.userSelect = 'none';
			document.body.style.cursor = 'row-resize';
			setIsDragging(true);
			setShowHandle(true);
			dockRef.current.classList.add('is-resizing');

			const handleMouseMove = (moveEvent: MouseEvent) => {
				const dock = dockRef.current;
				if (!dock) {
					return;
				}
				const rect = dock.getBoundingClientRect();
				if (rect.height <= 0) {
					return;
				}
				const fromTop = ((moveEvent.clientY - rect.top) / rect.height) * 100;
				onResize(
					splitHeightsAtBoundary(heights, boundaryIndex, fromTop)
				);
			};

			const handleMouseUp = () => {
				document.body.style.userSelect = '';
				document.body.style.cursor = '';
				dockRef.current?.classList.remove('is-resizing');
				setIsDragging(false);
				setShowHandle(false);
				document.removeEventListener('mousemove', handleMouseMove);
				document.removeEventListener('mouseup', handleMouseUp);
			};

			document.addEventListener('mousemove', handleMouseMove);
			document.addEventListener('mouseup', handleMouseUp);
		},
		[isVisible, dockRef, heights, boundaryIndex, onResize]
	);

	useEffect(() => {
		return () => {
			if (hoverTimeoutRef.current) {
				clearTimeout(hoverTimeoutRef.current);
			}
			document.body.style.userSelect = '';
			document.body.style.cursor = '';
			dockRef.current?.classList.remove('is-resizing');
		};
	}, [dockRef]);

	if (!isVisible) {
		return null;
	}

	return (
		<div
			className={`blockera-sidebar-resize-handle blockera-sidebar-resize-handle--top blockera-sidebar-pane-split ${
				showHandle || isDragging ? 'is-visible' : ''
			}`}
			data-test={`blockera-sidebar-pane-split-${boundaryIndex}`}
			onMouseEnter={handleMouseEnter}
			onMouseLeave={handleMouseLeave}
			onMouseDown={handleMouseDown}
			aria-label={__('Resize sidebar panels', 'blockera')}
			role="separator"
			aria-orientation="horizontal"
			aria-valuemin={MIN_PANE_PERCENT}
			tabIndex={0}
		/>
	);
}
