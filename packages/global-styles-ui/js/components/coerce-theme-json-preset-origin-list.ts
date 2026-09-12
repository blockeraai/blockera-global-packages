/**
 * Theme.json MU fixtures append with `presets[]`, which is a list (or numeric
 * keys on an origin map). The editor reads `presets.theme`.
 */
function numericPresetRows(group: unknown): unknown[] {
	if (!group || typeof group !== 'object' || Array.isArray(group)) {
		return [];
	}

	return Object.keys(group as Record<string, unknown>)
		.filter((key) => /^\d+$/.test(key))
		.sort((a, b) => Number(a) - Number(b))
		.map((key) => (group as Record<string, unknown>)[key]);
}

/**
 * @param {unknown} originSlice `presets.theme` (or default/custom) slice.
 * @param {unknown} presetsGroup Parent `presets` node.
 * @return {unknown} Array to sanitize as that origin, or the original slice.
 */
export function coerceThemeJsonPresetOriginList(
	originSlice: unknown,
	presetsGroup: unknown
): unknown {
	const numeric = numericPresetRows(presetsGroup);

	if (Array.isArray(originSlice) && originSlice.length > 0) {
		return numeric.length ? [...originSlice, ...numeric] : originSlice;
	}

	if (Array.isArray(presetsGroup)) {
		return presetsGroup;
	}

	if (numeric.length) {
		return numeric;
	}

	return originSlice;
}
