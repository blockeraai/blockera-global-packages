/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { useLayoutEffect } from '@wordpress/element';
import type { CSSProperties, ReactNode } from 'react';

/**
 * Internal dependencies
 */
import type { SidebarSectionId } from './types';
import { applyFloatingPaneFromDrag } from './drag-session';
import SidebarPaneDragHandle from './SidebarPaneDragHandle';

const TITLES: Record<Exclude<SidebarSectionId, 'complementary'>, string> = {
	inserter: __('Move blocks panel', 'blockera'),
	listView: __('Move list view panel', 'blockera'),
};

type SectionPaneProps = {
	sectionId: Exclude<SidebarSectionId, 'complementary'>;
	height: string;
	canDrag: boolean;
	isFloating?: boolean;
	floatingStyle?: CSSProperties;
	onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => void;
	children: ReactNode;
};

/**
 * Stacked sidebar pane with a drag handle over the existing section header.
 */
export default function SectionPane({
	sectionId,
	height,
	canDrag,
	isFloating,
	floatingStyle,
	onPointerDown,
	children,
}: SectionPaneProps) {
	const className =
		sectionId === 'inserter'
			? 'blockera-combined-sidebar__inserter'
			: 'blockera-combined-sidebar__list-view';

	useLayoutEffect(() => {
		if (isFloating) {
			applyFloatingPaneFromDrag();
		}
	}, [isFloating, floatingStyle]);

	return (
		<div
			className={`blockera-sidebar-pane ${className}${
				isFloating ? ' is-floating' : ''
			}`}
			data-test={`blockera-sidebar-pane-${sectionId}`}
			style={
				{
					'--blockera-pane-height': height,
					...floatingStyle,
				} as CSSProperties
			}
		>
			<SidebarPaneDragHandle
				className="blockera-sidebar-pane__drag-handle is-overlay"
				data-test={`blockera-sidebar-pane-drag-${sectionId}`}
				onPointerDown={canDrag ? onPointerDown : undefined}
				aria-label={TITLES[sectionId]}
			/>
			{children}
		</div>
	);
}
