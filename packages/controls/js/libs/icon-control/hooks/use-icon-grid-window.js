/**
 * WordPress dependencies
 */
import {
	useRef,
	useState,
	useEffect,
	useLayoutEffect,
	useCallback,
	useTransition,
} from '@wordpress/element';

/**
 * Internal dependencies
 */
import { getIntersectionRoot } from '../components/icon-picker/get-intersection-root';
import {
	ALL_PREVIEW_SIZE,
	ICON_CHUNK_SIZE,
	ICON_GRID_GAP,
	ICON_GRID_WINDOW_BUFFER_ROWS,
	getIconGridResetEndIndex,
} from '../components/icon-picker/constants';

function measureGridMetrics(grid) {
	const cell = grid.querySelector('.blockera-control-icon-control-icon');

	if (!cell) {
		return null;
	}

	const width = cell.getBoundingClientRect().width;
	const height = cell.getBoundingClientRect().height;

	if (width < 4 || height < 4) {
		return null;
	}

	const columns = Math.max(
		1,
		Math.floor((grid.clientWidth + ICON_GRID_GAP) / (width + ICON_GRID_GAP))
	);

	return {
		columns,
		rowHeight: height + ICON_GRID_GAP,
	};
}

function rowCountForItems(itemCount, columns) {
	if (itemCount <= 0) {
		return 0;
	}

	return Math.ceil(itemCount / columns);
}

function commitRange(setRange, startIndex, endIndex) {
	setRange((current) =>
		current.startIndex === startIndex && current.endIndex === endIndex
			? current
			: { startIndex, endIndex }
	);
}

/**
 * Window a wrapping icon grid: expand in chunks, drop off-screen cells, keep spacers.
 *
 * @param {Object}  options
 * @param {Object}  options.gridRef         Ref to the grid element.
 * @param {number}  options.total           Total records.
 * @param {boolean} options.limitToPreview  Cap to All-tab preview size.
 * @param {boolean} options.windowEnabled   Recycle cells outside the viewport.
 * @param {*}       options.resetKey        Reset window when this changes.
 * @return {Object} Window state and more-hint ref.
 */
export function useIconGridWindow({
	gridRef,
	total,
	limitToPreview = false,
	windowEnabled = true,
	resetKey = null,
}) {
	const moreHintRef = useRef(null);
	const metricsRef = useRef(null);
	const [, startTransition] = useTransition();
	const baselineCount = Math.min(
		limitToPreview ? ALL_PREVIEW_SIZE : ICON_CHUNK_SIZE,
		total
	);
	const [extraLoaded, setExtraLoaded] = useState(0);
	const loadedCount = limitToPreview
		? baselineCount
		: Math.min(total, Math.max(baselineCount, extraLoaded));
	const resetEndIndex = getIconGridResetEndIndex(baselineCount, {
		windowEnabled,
		limitToPreview,
	});
	const [range, setRange] = useState({
		startIndex: 0,
		endIndex: resetEndIndex,
	});

	useLayoutEffect(() => {
		setExtraLoaded((count) => (count === 0 ? count : 0));
		commitRange(setRange, 0, resetEndIndex);
		metricsRef.current = null;
	}, [resetKey, limitToPreview, resetEndIndex]);

	const updateWindow = useCallback(() => {
		const grid = gridRef?.current;
		const cap = limitToPreview
			? Math.min(ALL_PREVIEW_SIZE, total)
			: loadedCount;

		if (!grid || cap <= 0) {
			return;
		}

		if (!windowEnabled || limitToPreview) {
			commitRange(setRange, 0, cap);
			return;
		}

		const metrics = measureGridMetrics(grid) || metricsRef.current;

		if (!metrics) {
			commitRange(
				setRange,
				0,
				getIconGridResetEndIndex(cap, { windowEnabled, limitToPreview })
			);
			return;
		}

		metricsRef.current = metrics;

		const root = getIntersectionRoot(grid);

		if (!root) {
			commitRange(
				setRange,
				0,
				getIconGridResetEndIndex(cap, { windowEnabled, limitToPreview })
			);
			return;
		}

		const gridRect = grid.getBoundingClientRect();
		const rootRect = root.getBoundingClientRect();
		const scrolledPastGridTop = rootRect.top - gridRect.top;
		const firstRow = Math.max(
			0,
			Math.floor(scrolledPastGridTop / metrics.rowHeight) -
				ICON_GRID_WINDOW_BUFFER_ROWS
		);
		const visibleRows =
			Math.ceil(root.clientHeight / metrics.rowHeight) +
			ICON_GRID_WINDOW_BUFFER_ROWS * 2;
		const startIndex = Math.min(cap, firstRow * metrics.columns);
		const endIndex = Math.min(
			cap,
			startIndex + visibleRows * metrics.columns
		);

		commitRange(setRange, startIndex, endIndex);
	}, [gridRef, loadedCount, limitToPreview, total, windowEnabled]);

	useEffect(() => {
		updateWindow();
	}, [updateWindow, loadedCount, total]);

	useEffect(() => {
		const grid = gridRef?.current;

		if (!grid || !windowEnabled || limitToPreview) {
			return;
		}

		const root = getIntersectionRoot(grid);

		if (!root) {
			return;
		}

		const onScroll = () => {
			startTransition(() => {
				updateWindow();
			});
		};

		root.addEventListener('scroll', onScroll, { passive: true });
		window.addEventListener('resize', onScroll);

		return () => {
			root.removeEventListener('scroll', onScroll);
			window.removeEventListener('resize', onScroll);
		};
	}, [gridRef, windowEnabled, limitToPreview, startTransition, updateWindow]);

	useEffect(() => {
		if (limitToPreview || loadedCount >= total) {
			return;
		}

		const node = moreHintRef.current;

		if (!node) {
			return;
		}

		const root = getIntersectionRoot(node);

		if (!root) {
			return;
		}

		const observer = new IntersectionObserver(
			([entry]) => {
				if (!entry.isIntersecting) {
					return;
				}

				observer.disconnect();
				startTransition(() => {
					setExtraLoaded((count) =>
						Math.min(
							(count || baselineCount) + ICON_CHUNK_SIZE,
							total
						)
					);
				});
			},
			{
				root,
				rootMargin: '0px',
				threshold: 0,
			}
		);

		observer.observe(node);

		return () => observer.disconnect();
	}, [limitToPreview, loadedCount, total, startTransition, baselineCount]);

	const metrics = metricsRef.current;
	const columns = metrics?.columns || 1;
	const rowHeight = metrics?.rowHeight || 0;
	const spacerBeforePx = rowHeight
		? rowCountForItems(range.startIndex, columns) * rowHeight
		: 0;
	const spacerAfterPx = rowHeight
		? rowCountForItems(loadedCount - range.endIndex, columns) * rowHeight
		: 0;
	const remainingCount = Math.max(
		0,
		total -
			(limitToPreview ? Math.min(ALL_PREVIEW_SIZE, total) : loadedCount)
	);

	return {
		startIndex: range.startIndex,
		endIndex: range.endIndex,
		loadedCount,
		remainingCount,
		moreHintRef,
		spacerBeforePx,
		spacerAfterPx,
	};
}
