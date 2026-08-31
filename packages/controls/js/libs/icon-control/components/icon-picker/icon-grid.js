/**
 * WordPress dependencies
 */
import { memo, useCallback } from '@wordpress/element';

/**
 * Blockera dependencies
 */
import { controlInnerClassNames } from '@blockera/classnames';

/**
 * Internal dependencies
 */
import { LIBRARY_ICON_CELL_SELECTOR } from './constants';
import IconGridCell from './icon-grid-cell';

function getActionFromEvent(event) {
	const cell = event.target?.closest?.(LIBRARY_ICON_CELL_SELECTOR);

	if (!cell) {
		return null;
	}

	const icon = cell.getAttribute('data-blockera-icon');
	const library = cell.getAttribute('data-blockera-library');

	if (!icon || !library) {
		return null;
	}

	return {
		type: 'UPDATE_ICON',
		icon,
		library,
	};
}

function IconGrid({
	records = [],
	startIndex = 0,
	endIndex,
	spacerBeforePx = 0,
	spacerAfterPx = 0,
	onSelect,
	onDoubleSelect,
	className = '',
	gridRef,
	children = null,
}) {
	const last = endIndex ?? records.length;
	const slice = records.slice(startIndex, last);

	const handleClick = useCallback(
		(event) => {
			if (event.target?.closest?.('[data-blockera-recent-remove]')) {
				return;
			}

			const action = getActionFromEvent(event);

			if (!action) {
				return;
			}

			onSelect?.(event, action);
		},
		[onSelect]
	);

	const handleDoubleClick = useCallback(
		(event) => {
			if (event.target?.closest?.('[data-blockera-recent-remove]')) {
				return;
			}

			const action = getActionFromEvent(event);

			if (!action) {
				return;
			}

			onDoubleSelect?.(event, action);
		},
		[onDoubleSelect]
	);

	return (
		<div
			ref={gridRef}
			className={controlInnerClassNames('library-grid', className)}
			onClick={handleClick}
			onDoubleClick={handleDoubleClick}
		>
			{spacerBeforePx > 0 && (
				<div
					className={controlInnerClassNames('library-grid-spacer')}
					style={{ height: spacerBeforePx }}
					aria-hidden="true"
				/>
			)}
			{slice.map((record) => (
				<IconGridCell
					key={record.key}
					icon={record.icon}
					iconName={record.iconName}
					library={record.library}
					sourceMeta={record.sourceMeta}
					className={record.className}
				>
					{record.children}
				</IconGridCell>
			))}
			{children}
			{spacerAfterPx > 0 && (
				<div
					className={controlInnerClassNames('library-grid-spacer')}
					style={{ height: spacerAfterPx }}
					aria-hidden="true"
				/>
			)}
		</div>
	);
}

export default memo(IconGrid);
