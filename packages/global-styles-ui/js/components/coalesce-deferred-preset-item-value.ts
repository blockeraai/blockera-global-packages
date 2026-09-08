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
