/**
 * Merge a staged preset-row patch onto the current item (and any pending draft).
 * Later keys win so coalesced persists keep the latest field values.
 */
export function coalesceDeferredPresetItemValue(
	current: Object,
	pending: Object | null,
	patch: Object
): Object {
	return {
		...current,
		...(pending || {}),
		...patch,
	};
}

/**
 * Escape/close persist from a deferred-commit hook. Skip when this hook has
 * nothing staged and the row is not in creatingStep — another field hook on
 * the same row may already have persisted (e.g. spacing size vs name).
 */
export function shouldPersistEndingCreate(
	pending: Object | null,
	item: Object
): boolean {
	if (pending) {
		return true;
	}

	return (item as { creatingStep?: boolean }).creatingStep === true;
}
