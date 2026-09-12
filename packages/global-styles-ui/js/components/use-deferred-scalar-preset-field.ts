/**
 * External dependencies
 */
import { useCallback, useEffect, useState } from '@wordpress/element';

/**
 * Blockera dependencies
 */
import { isFocusLeavingElement } from '@blockera/controls';

/**
 * Stable compare key so object fields (border) do not reset the draft when
 * the parent passes a new object with the same contents.
 */
export function getDeferredPresetFieldSignature(value: unknown): string {
	if (value === null || value === undefined) {
		return '';
	}

	const valueType = typeof value;

	if (
		valueType === 'string' ||
		valueType === 'number' ||
		valueType === 'boolean'
	) {
		return String(value);
	}

	try {
		return JSON.stringify(value);
	} catch {
		return '';
	}
}

/**
 * Local draft for a scalar (or object) preset field. Stages the outer row and
 * flushes when focus leaves the field wrapper.
 */
export function useDeferredScalarPresetField<T>({
	persistedValue,
	fieldKey,
	stagePatch,
	flush,
}: {
	persistedValue: T;
	fieldKey: string;
	stagePatch: (patch: Object) => void;
	flush: () => void;
}) {
	const [draft, setDraft] = useState(persistedValue);
	const persistedSignature = getDeferredPresetFieldSignature(persistedValue);

	useEffect(() => {
		setDraft(persistedValue);
		// Identity-only object updates must not rewind in-progress edits.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [persistedSignature]);

	const onChange = useCallback(
		(value: T) => {
			setDraft(value);
			stagePatch({ [fieldKey]: value });
		},
		[fieldKey, stagePatch]
	);

	const onFieldsBlur = useCallback(
		(event: {
			currentTarget: EventTarget;
			relatedTarget: EventTarget | null;
		}) => {
			if (!isFocusLeavingElement(event)) {
				return;
			}

			flush();
		},
		[flush]
	);

	return { draft, onChange, onFieldsBlur };
}
