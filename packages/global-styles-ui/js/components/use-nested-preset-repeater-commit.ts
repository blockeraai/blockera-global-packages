/**
 * External dependencies
 */
import { useCallback, useEffect, useRef, useState } from '@wordpress/element';

/**
 * Internal dependencies
 */
import { useDeferredPresetItemCommit } from './use-deferred-preset-item-commit';
import { preserveNestedRepeaterOpenState } from './preserve-nested-repeater-open-state';
import {
	didNestedRepeaterLayerClose,
	shouldCommitNestedRepeaterChange,
} from './should-commit-nested-repeater-change';

type ChangeRepeaterItem = (args: {
	onChange: (newValue: unknown) => void;
	valueCleanup: (value: unknown) => unknown;
	controlId: unknown;
	repeaterId: string | null | undefined;
	itemId: string | number;
	value: Object;
}) => void;

/**
 * Persist nested repeater layers (shadow, filter, transform, …) only on
 * structural changes or close; field keystrokes stay staged.
 */
export function useNestedPresetRepeaterCommit({
	changeRepeaterItem,
	onChange,
	valueCleanup,
	controlId,
	repeaterId,
	itemId,
	getItem,
	initialRecord,
	persistedSignature,
	buildPersistPatch,
}: {
	changeRepeaterItem: ChangeRepeaterItem;
	onChange: (newValue: unknown) => void;
	valueCleanup: (value: unknown) => unknown;
	controlId: unknown;
	repeaterId: string | null | undefined;
	itemId: string | number;
	getItem: () => Object;
	initialRecord: Record<string, unknown>;
	persistedSignature: unknown;
	buildPersistPatch?: (record: Record<string, unknown>) => Object;
}) {
	const { stagePatch, commitPatch } = useDeferredPresetItemCommit({
		changeRepeaterItem,
		onChange,
		valueCleanup,
		controlId,
		repeaterId,
		itemId,
		getItem,
	});

	const nestedRepeaterRef = useRef(initialRecord);
	const [liveRecord, setLiveRecord] = useState(initialRecord);
	const signatureKey =
		typeof persistedSignature === 'string' ||
		typeof persistedSignature === 'number'
			? String(persistedSignature)
			: JSON.stringify(persistedSignature ?? null);

	useEffect(() => {
		const next = preserveNestedRepeaterOpenState(
			initialRecord,
			nestedRepeaterRef.current
		);
		nestedRepeaterRef.current = next;
		setLiveRecord(next);
		// Reset only when persisted contents change, not on a new object identity.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [signatureKey]);

	const commitNestedChange = useCallback(
		(
			newValue: Record<string, Record<string, unknown>>,
			patch: Object
		) => {
			const previousRecord = nestedRepeaterRef.current;
			const nextRecord = newValue as Record<string, unknown>;
			const commitNow = shouldCommitNestedRepeaterChange(
				previousRecord,
				nextRecord
			);
			const layerClosed = didNestedRepeaterLayerClose(
				previousRecord,
				nextRecord
			);
			// Repeater onChange is cleaned (`isOpen` stripped). A type-key
			// rename mounts a new row; keep the editor open on the new key.
			const next =
				layerClosed
					? nextRecord
					: preserveNestedRepeaterOpenState(
							nextRecord,
							previousRecord
					  );
			nestedRepeaterRef.current = next;
			setLiveRecord(next);

			if (commitNow || layerClosed) {
				// Persist after liveRecord commits so a type-key remount sees
				// the open editor instead of a cleaned persist echo.
				queueMicrotask(() => {
					commitPatch(patch);
				});
			} else {
				stagePatch(patch);
			}
		},
		[commitPatch, stagePatch]
	);

	useEffect(() => {
		if (!buildPersistPatch) {
			return;
		}

		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key !== 'Escape') {
				return;
			}

			commitPatch(
				buildPersistPatch(nestedRepeaterRef.current)
			);
		};

		document.addEventListener('keydown', onKeyDown);

		return () => {
			document.removeEventListener('keydown', onKeyDown);
		};
	}, [buildPersistPatch, commitPatch]);

	return { commitNestedChange, liveRecord, stagePatch, commitPatch };
}
