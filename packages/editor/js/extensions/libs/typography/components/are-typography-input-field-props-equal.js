// @flow

/**
 * Skip re-render of a typography InputControl field when its value and
 * identity props are unchanged (parent TypographyExtension still re-renders
 * when any typography slice changes).
 *
 * @param {Object} prev
 * @param {Object} next
 * @return {boolean} True when React.memo should skip.
 */
export function areTypographyInputFieldPropsEqual(
	prev: Object,
	next: Object
): boolean {
	return (
		prev.value === next.value &&
		prev.defaultValue === next.defaultValue &&
		prev.size === next.size &&
		prev.onChange === next.onChange &&
		prev.handleOnChangeAttributes === next.handleOnChangeAttributes &&
		prev.activeSearchMode === next.activeSearchMode &&
		prev.columns === next.columns &&
		prev.className === next.className &&
		prev.block?.clientId === next.block?.clientId &&
		prev.block?.blockName === next.block?.blockName
	);
}
