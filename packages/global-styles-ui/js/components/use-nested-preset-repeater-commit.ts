/**
 * External dependencies
 */
import { useCallback, useEffect, useRef, useState } from '@wordpress/element';

/**
 * Internal dependencies
 */
import { useDeferredPresetItemCommit } from './use-deferred-preset-item-commit';
import { shouldCommitNestedRepeaterChange } from './should-commit-nested-repeater-change';

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
		nestedRepeaterRef.current = initialRecord;
		setLiveRecord(initialRecord);
		// Reset only when persisted contents change, not on a new object identity.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [signatureKey]);

	const commitNestedChange = useCallback(
		(
			newValue: Record<string, Record<string, unknown>>,
			patch: Object
		) => {
			const commitNow = shouldCommitNestedRepeaterChange(
				nestedRepeaterRef.current,
				newValue as Record<string, unknown>
			);
			nestedRepeaterRef.current = newValue as Record<string, unknown>;
			setLiveRecord(newValue as Record<string, unknown>);

			if (commitNow) {
				commitPatch(patch);
			} else {
				stagePatch(patch);
			}
		},
		[commitPatch, stagePatch]
	);

	return { commitNestedChange, liveRecord, stagePatch, commitPatch };
}
