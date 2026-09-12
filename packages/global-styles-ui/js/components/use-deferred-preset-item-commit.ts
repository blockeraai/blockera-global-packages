/**
 * External dependencies
 */
import { useCallback, useEffect, useRef } from '@wordpress/element';

type ChangeRepeaterItemArgs = {
	onChange: (newValue: unknown) => void;
	valueCleanup: (value: unknown) => unknown;
	controlId: unknown;
	repeaterId: string | null | undefined;
	itemId: string | number;
	value: Object;
};

type ChangeRepeaterItem = (args: ChangeRepeaterItemArgs) => void;

/**
 * Blockera dependencies
 */
import {
	isRepeaterActionTarget,
	POPOVER_CLOSE_CONTROL_SELECTOR,
} from '@blockera/controls';

/**
 * Internal dependencies
 */
import { usePresetItemHeaderDraftStore } from './preset-item-header-draft-context';
import {
	coalesceDeferredPresetItemValue,
	coalesceEndingCreateValue,
	shouldPersistEndingCreate,
} from './coalesce-deferred-preset-item-value';

/**
 * Stage outer preset-row updates locally and persist through `changeRepeaterItem`
 * on blur, nested close, add/clone/delete, or unmount — not every keystroke.
 */
export function useDeferredPresetItemCommit({
	changeRepeaterItem,
	onChange,
	valueCleanup,
	controlId,
	repeaterId,
	itemId,
	getItem,
}: {
	changeRepeaterItem: ChangeRepeaterItem;
	onChange: (newValue: unknown) => void;
	valueCleanup: (value: unknown) => unknown;
	controlId: unknown;
	repeaterId: string | null | undefined;
	itemId: string | number;
	getItem: () => Object;
}) {
	const headerDraftStore = usePresetItemHeaderDraftStore();
	const pendingRef = useRef<Object | null>(null);
	const suppressPersistRef = useRef(false);
	const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const argsRef = useRef({
		changeRepeaterItem,
		onChange,
		valueCleanup,
		controlId,
		repeaterId,
		itemId,
		getItem,
		headerDraftStore,
	});

	argsRef.current = {
		changeRepeaterItem,
		onChange,
		valueCleanup,
		controlId,
		repeaterId,
		itemId,
		getItem,
		headerDraftStore,
	};

	const persist = useCallback((value: Object) => {
		if (suppressPersistRef.current) {
			return;
		}

		const args = argsRef.current;
		pendingRef.current = null;
		args.changeRepeaterItem({
			onChange: args.onChange,
			valueCleanup: args.valueCleanup,
			controlId: args.controlId,
			repeaterId: args.repeaterId,
			itemId: args.itemId,
			value,
		});
	}, []);

	const persistEndingCreate = useCallback(() => {
		if (suppressPersistRef.current) {
			return;
		}

		const args = argsRef.current;
		const current = args.getItem();

		if (!shouldPersistEndingCreate(pendingRef.current, current)) {
			return;
		}

		const headerDraft = args.headerDraftStore?.get(String(args.itemId));

		persist(
			coalesceEndingCreateValue(
				current,
				pendingRef.current,
				headerDraft
			)
		);
	}, [persist]);

	const stagePatch = useCallback((
		patch: Object,
		headerPatch: Object = patch
	) => {
		const current = argsRef.current.getItem();
		pendingRef.current = coalesceDeferredPresetItemValue(
			current,
			pendingRef.current,
			patch
		);
		argsRef.current.headerDraftStore?.patch(
			String(argsRef.current.itemId),
			headerPatch as Record<string, unknown>
		);
	}, []);

	const commitPatch = useCallback(
		(patch: Object) => {
			if (suppressPersistRef.current) {
				stagePatch(patch);
				return;
			}

			const current = argsRef.current.getItem();
			const next = coalesceDeferredPresetItemValue(
				current,
				pendingRef.current,
				patch
			);
			argsRef.current.headerDraftStore?.patch(
				String(argsRef.current.itemId),
				patch as Record<string, unknown>
			);
			persist(next);
		},
		[persist, stagePatch]
	);

	const flushNow = useCallback(() => {
		if (suppressPersistRef.current || !pendingRef.current) {
			return;
		}

		persist(pendingRef.current);
	}, [persist]);

	const flush = useCallback(() => {
		if (flushTimerRef.current !== null) {
			return;
		}

		flushTimerRef.current = setTimeout(() => {
			flushTimerRef.current = null;
			flushNow();
		}, 0);
	}, [flushNow]);

	useEffect(() => {
		return () => {
			if (flushTimerRef.current !== null) {
				clearTimeout(flushTimerRef.current);
				flushTimerRef.current = null;
			}

			const pending = pendingRef.current;

			if (!pending || suppressPersistRef.current) {
				return;
			}

			pendingRef.current = null;
			const args = argsRef.current;
			const headerDraft = args.headerDraftStore?.get(
				String(args.itemId)
			);
			args.changeRepeaterItem({
				onChange: args.onChange,
				valueCleanup: args.valueCleanup,
				controlId: args.controlId,
				repeaterId: args.repeaterId,
				itemId: args.itemId,
				value: coalesceEndingCreateValue(
					args.getItem(),
					pending,
					headerDraft
				),
			});
		};
	}, []);

	useEffect(() => {
		const onPointerDownCapture = (event: Event) => {
			const target = event.target;

			if (isRepeaterActionTarget(target)) {
				suppressPersistRef.current = true;
				return;
			}

			if (
				target instanceof Element &&
				target.closest(POPOVER_CLOSE_CONTROL_SELECTOR)
			) {
				persistEndingCreate();
			}
		};

		const onPointerUp = () => {
			window.setTimeout(() => {
				suppressPersistRef.current = false;
			}, 0);
		};

		const onKeyDownCapture = (event: KeyboardEvent) => {
			if (event.key !== 'Escape') {
				return;
			}

			// Capture before Gutenberg preventDefault / popover dismiss so the
			// row leaves creatingStep even when the editor stays mounted.
			persistEndingCreate();
		};

		document.addEventListener('mousedown', onPointerDownCapture, true);
		document.addEventListener('mouseup', onPointerUp, true);
		document.addEventListener('keydown', onKeyDownCapture, true);

		return () => {
			document.removeEventListener(
				'mousedown',
				onPointerDownCapture,
				true
			);
			document.removeEventListener('mouseup', onPointerUp, true);
			document.removeEventListener(
				'keydown',
				onKeyDownCapture,
				true
			);
		};
	}, [persistEndingCreate]);

	const clearPending = useCallback(() => {
		pendingRef.current = null;
	}, []);

	return { stagePatch, commitPatch, flush, clearPending };
}
